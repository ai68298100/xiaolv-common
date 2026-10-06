// 条目模型：CommonItem 归一化、类型推断、来源引用。
// 未知字段一律丢弃并计数（前向兼容：新版本字段在旧版本安全降级）。
import {ATTR, ATTR_PREFIX, LIMITS} from "../constants";

export type ItemType =
    | "text"
    | "markdown"
    | "url"
    | "code"
    | "image"
    | "asset"
    | "blockref"
    | "structure";

export const ITEM_TYPES: readonly ItemType[] = [
    "text", "markdown", "url", "code", "image", "asset", "blockref", "structure",
];

export function isItemType(v: unknown): v is ItemType {
    return typeof v === "string" && (ITEM_TYPES as readonly string[]).includes(v);
}

// 来源引用（条目必须携带；可缺失 = 用户手工新建无来源）
export interface ISourceRef {
    sourceDocId: string;
    sourceBlockId: string;
    sourceType: "" | "selection" | "block" | "doc-fragment" | "clipboard" | "manual" | "resource" | "external";
}

export interface CommonItem {
    /** 稳定逻辑 ID（xlc- 前缀），存于 custom-xlc-id，跨工作区/导出导入不变 */
    id: string;
    /** 库中锚定块的物理块 ID */
    blockId: string;
    /** 库文档 ID */
    libraryDocId: string;
    itemType: ItemType;
    title: string;
    alias: string;
    tags: string[];
    category: string;
    /** 有界摘要（索引缓存，可重建） */
    summary: string;
    /** ask 变量数（写入时落 custom-xlc-vars 属性；0=无。徽标提示用，行为以插入时现场内容为准） */
    varCount: number;
    source: ISourceRef;
    /** url 条目的目标网址；blockref 条目的目标块 ID 复用 target 字段名见 ATTR.url/ATTR.target */
    url: string;
    targetBlockId: string;
    createdAt: number;
    updatedAt: number;
    /** 归一化时被丢弃的未知字段名（诊断用，不持久化） */
    droppedFields: string[];
}

export interface CommonItemRef {
    id: string;
    itemType?: ItemType;
    title?: string;
}

const LOGICAL_ID_RE = /^xlc-[0-9a-z]{10,40}$/;
export const BLOCK_ID_RE = /^\d{14}-[0-9a-z]{7}$/;

export function isLogicalId(v: unknown): v is string {
    return typeof v === "string" && LOGICAL_ID_RE.test(v);
}

export function isBlockId(v: unknown): v is string {
    return typeof v === "string" && BLOCK_ID_RE.test(v);
}

export function newLogicalId(now = Date.now(), random = Math.random): string {
    const time = now.toString(36);
    const rand = Math.floor(random() * 0xffffffffffffffff).toString(36).slice(0, 10);
    return `xlc-${time}${rand}`.slice(0, 30);
}

function cleanString(v: unknown, max: number): string {
    return typeof v === "string" ? v.slice(0, max) : "";
}

export function cleanTagList(v: unknown): string[] {
    const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,,、]/) : [];
    const out: string[] = [];
    for (const item of raw) {
        if (typeof item !== "string") continue;
        const tag = item.trim().slice(0, LIMITS.tag);
        if (!tag) continue;
        if (!out.includes(tag)) out.push(tag);
        if (out.length >= LIMITS.tags) break;
    }
    return out;
}

const SOURCE_TYPES: readonly ISourceRef["sourceType"][] = [
    "", "selection", "block", "doc-fragment", "clipboard", "manual", "resource", "external",
];

function normalizeSource(v: unknown): ISourceRef {
    const raw = (v ?? {}) as Record<string, unknown>;
    const sourceType = typeof raw.sourceType === "string" && (SOURCE_TYPES as readonly string[]).includes(raw.sourceType)
        ? raw.sourceType as ISourceRef["sourceType"]
        : "";
    return {
        sourceDocId: isBlockId(raw.sourceDocId) ? raw.sourceDocId : "",
        sourceBlockId: isBlockId(raw.sourceBlockId) ? raw.sourceBlockId : "",
        sourceType,
    };
}

// SiYuan 块类型（getChildBlocks）：p 段落 / h 标题 / c 代码 / l 列表 / t 表格 /
// b 引用 / s 超级块 / i iframe / html / m 公式 / query_embed 嵌入
export function inferItemType(blockType: string, subtype: string, kramdown: string): ItemType {
    if (blockType === "c" || blockType === "code_block" || subtype === "code") return "code";
    if (blockType === "s" || blockType === "super") return "structure";
    if (blockType === "h") return "markdown";
    if (blockType === "i" || blockType === "html" || blockType === "m" || blockType === "query_embed" || blockType === "t") return "markdown";
    if (/^!\[.*\]\(assets\//.test(kramdown.trimStart())) return "image";
    if (/\]\(assets\/[^)]+\)/.test(kramdown)) return "asset";
    return "text";
}

/**
 * 从块属性 + 块事实构造条目。任何形状错误都安全降级，不抛异常。
 * unknown fields：非 ATTR 集合内的 xlc-* 属性视为未知字段，丢弃并记录。
 */
export function normalizeCommonItem(input: {
    blockId: unknown;
    libraryDocId: unknown;
    attrs: unknown;
    blockType?: unknown;
    subtype?: unknown;
    kramdown?: unknown;
}): CommonItem | null {
    const blockId = typeof input.blockId === "string" && isBlockId(input.blockId) ? input.blockId : "";
    const libraryDocId = typeof input.libraryDocId === "string" && isBlockId(input.libraryDocId) ? input.libraryDocId : "";
    if (!blockId || !libraryDocId) return null;
    const attrs = (input.attrs ?? {}) as Record<string, unknown>;
    const droppedFields: string[] = [];
    for (const key of Object.keys(attrs)) {
        if (!key.startsWith(ATTR_PREFIX)) continue;
        if (!Object.values(ATTR).includes(key as (typeof ATTR)[keyof typeof ATTR])) droppedFields.push(key);
    }
    const logicalIdRaw = typeof attrs[ATTR.id] === "string" ? (attrs[ATTR.id] as string) : "";
    if (!isLogicalId(logicalIdRaw)) return null;

    const kramdown = typeof input.kramdown === "string" ? input.kramdown.slice(0, LIMITS.contentChars) : "";
    const blockType = typeof input.blockType === "string" ? input.blockType : "";
    const subtype = typeof input.subtype === "string" ? input.subtype : "";
    const declaredType = isItemType(attrs[ATTR.type]) ? (attrs[ATTR.type] as ItemType) : null;
    const itemType = declaredType ?? inferItemType(blockType, subtype, kramdown);

    const tags = cleanTagList(attrs[ATTR.tags]);
    const title = cleanString(attrs[ATTR.title], LIMITS.title) || deriveTitle(kramdown, itemType, attrs);
    const created = Number(attrs[ATTR.created]);
    const updated = Number(attrs[ATTR.updated]);
    const srcDoc = typeof attrs[ATTR.srcDoc] === "string" ? (attrs[ATTR.srcDoc] as string) : "";
    const srcBlock = typeof attrs[ATTR.srcBlock] === "string" ? (attrs[ATTR.srcBlock] as string) : "";
    const varCountRaw = Number(attrs[ATTR.vars]);
    const varCount = Number.isInteger(varCountRaw) && varCountRaw > 0 ? Math.min(varCountRaw, LIMITS.maxAskFields) : 0;
    const source: ISourceRef = {
        sourceDocId: isBlockId(srcDoc) ? srcDoc : "",
        sourceBlockId: isBlockId(srcBlock) ? srcBlock : "",
        sourceType: srcDoc || srcBlock ? "block" : "manual",
    };
    return {
        id: logicalIdRaw,
        blockId,
        libraryDocId,
        itemType,
        title,
        alias: cleanString(attrs[ATTR.alias], LIMITS.alias),
        tags,
        category: cleanString(attrs[ATTR.category], LIMITS.category),
        summary: deriveSummary(kramdown),
        varCount,
        source,
        url: cleanString(attrs[ATTR.url], 2048),
        targetBlockId: isBlockId(attrs[ATTR.target]) ? (attrs[ATTR.target] as string) : "",
        createdAt: Number.isFinite(created) && created > 0 ? created : 0,
        updatedAt: Number.isFinite(updated) && updated > 0 ? updated : 0,
        droppedFields,
    };
}

// 标题派生：title 属性 > 别名 > 首行文本 > 类型标签
export function deriveTitle(kramdown: string, itemType: ItemType, attrs: Record<string, unknown>): string {
    const alias = cleanString(attrs[ATTR.alias], LIMITS.alias);
    if (alias) return alias;
    const text = kramdownToPlainText(kramdown);
    const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
    if (firstLine) return firstLine.slice(0, LIMITS.title);
    if (itemType === "url") return cleanString(attrs[ATTR.url], LIMITS.title) || "URL";
    if (itemType === "code") return "Code";
    return itemType;
}

// kramdown → 纯文本（搜索/摘要用；不追求完整，够索引即可）
export function kramdownToPlainText(kramdown: string): string {
    return kramdown
        .replace(/^```.*$/gm, "")
        .replace(/\{\{.*?\}\}/g, "")
        .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, "$1 $2")
        .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, "$1 $2")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\{\:(\s[^}]*)?\}/g, "")
        .replace(/^%%[\s\S]*?%%$/gm, "")
        .trim();
}

export function deriveSummary(kramdown: string): string {
    const text = kramdownToPlainText(kramdown).replace(/\s+/g, " ").trim();
    return text.slice(0, LIMITS.summary);
}

// 协议/导入等外部输入的宽松归一化：形状不可信时返回 null
export function normalizeUnknownItem(raw: unknown): CommonItem | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const candidate = {
        blockId: obj.blockId,
        libraryDocId: obj.libraryDocId ?? obj.sourceDocId,
        attrs: {
            [ATTR.id]: obj.id,
            [ATTR.type]: obj.itemType,
            [ATTR.title]: obj.title,
            [ATTR.alias]: obj.alias,
            [ATTR.tags]: obj.tags,
            [ATTR.category]: obj.category,
            [ATTR.srcDoc]: (obj.source as {sourceDocId?: unknown})?.sourceDocId,
            [ATTR.srcBlock]: (obj.source as {sourceBlockId?: unknown})?.sourceBlockId,
            [ATTR.vars]: obj.varCount,
            [ATTR.url]: obj.url,
            [ATTR.target]: obj.targetBlockId,
            [ATTR.created]: obj.createdAt,
            [ATTR.updated]: obj.updatedAt,
        },
    };
    const item = normalizeCommonItem(candidate);
    if (!item) return null;
    if (typeof obj.summary === "string") item.summary = obj.summary.slice(0, LIMITS.summary);
    return item;
}
