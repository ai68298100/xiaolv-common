// 动作计划：纯函数层。给定条目 + 已解析内容 + 动作意图 + 端侧上下文 → 输出InsertPlan。
// 不触碰宿主，全部可单测；宿主执行在 service/commands.ts。
import {LIMITS} from "../constants";
import {BLOCK_ID_RE, CommonItem, isSafeHttpUrl} from "./item";

export type InsertMode =
    | "insert"          // 插入到当前文档光标处
    | "copy"            // 复制（按类型给出正确载荷）
    | "copy-content"    // 块引用条目：复制目标块内容（而非引用语法）
    | "insert-ref"      // 块引用条目：插入 ((id 'text')) 引用
    | "insert-embed"    // 块引用条目：插入宿主原生嵌入块
    | "open";           // 打开（url/来源/资源）

export interface OpenTarget {
    kind: "doc" | "block" | "asset" | "url";
    docId?: string;
    blockId?: string;
    assetPath?: string;
    url?: string;
}

export interface InsertPlan {
    mode: InsertMode;
    /** insert / copy-content：要写入文档的 markdown（isBlock=true 语义） */
    markdown?: string;
    /** copy：剪贴板载荷 */
    clipboardText?: string;
    clipboardKind: "text" | "url" | "code" | "markdown" | "markdown-link";
    open?: OpenTarget;
    /** 计划是否为降级路径（如移动端无验证插入 → 复制） */
    downgraded: boolean;
    downgradeReason?: "no-active-editor" | "mobile-insert-unverified" | "source-missing" | "asset-missing" | "type-unsupported";
    /** 需要在回执中如实展示的待验证声明 */
    pendingVerification: string[];
    warnings: string[];
}

export interface ActionContext {
    surface: "desktop" | "mobile";
    hasActiveEditor: boolean;
    /** 内容解析结果（由服务层现场从内核取，禁止用缓存正文） */
    content: {
        kramdown: string;
        sourceMissing: boolean;
        assetMissing: boolean;
    };
}

// assets/ 单段或多级子路径均可（R35：子目录资源此前被误拒）；禁 .. 穿越；禁止空白
const ASSET_PATH_RE = /^(assets\/[^\s/][^\s]*|assets\/[^\s/])$/;

export function isValidAssetPath(path: string): boolean {
    return ASSET_PATH_RE.test(path) && !path.includes("..");
}

export function extractAssetPath(kramdown: string): string | null {
    const m = kramdown.match(/\]\((assets\/[^)\s]+)[^)]*\)/);
    const path = m?.[1];
    if (!path) return null;
    return isValidAssetPath(path) ? path : null;
}

export function extractCodeFence(kramdown: string): {language: string; code: string} | null {
    const m = kramdown.match(/^```([\w+#.-]*)\s*\n([\s\S]*?)\n?```\s*$/);
    if (!m) return null;
    return {language: m[1] ?? "", code: m[2] ?? ""};
}

// 首行文本 → 块引用锚文本（引用需要一段锚文字）
function refAnchorText(item: CommonItem): string {
    const base = item.alias || item.title || "ref";
    return base.replace(/[[\]()']/g, "").slice(0, 96) || "ref";
}

function asInlineText(text: string): string {
    // 插入为独立段落块：整段按文本处理，不解析内部结构（安全边界：外部文本不注入结构/HTML）
    return text.slice(0, LIMITS.contentChars);
}

/**
 * 块引用语法的锚文本转义：SiYuan 引用语法 ((id 'anchor'))，锚内单引号需转义为 \'。
 * ID 已由 BLOCK_ID_RE 校验，此处只处理锚文本。
 */
export function buildBlockRef(blockId: string, anchor: string): string {
    if (!BLOCK_ID_RE.test(blockId)) throw new Error("invalid block id");
    return `((${blockId} '${anchor.replace(/'/g, "\\'")}'))`;
}

/** 宿主原生嵌入块语法（ADR 0003：ID 严格校验，无用户文本拼接） */
export function buildEmbedBlock(blockId: string): string {
    if (!BLOCK_ID_RE.test(blockId)) throw new Error("invalid block id");
    return `{{select * from blocks where id='${blockId}'}}`;
}

export function planAction(item: CommonItem, mode: InsertMode, ctx: ActionContext): InsertPlan {
    const base: InsertPlan = {
        mode,
        clipboardKind: "text",
        downgraded: false,
        pendingVerification: [],
        warnings: [],
    };
    if (ctx.content.sourceMissing && mode !== "insert-ref" && mode !== "insert-embed" && mode !== "copy-content") {
        // 非块引用类条目，来源失效只影响 openSource，不影响插入（内容锚定在库中）
        if (mode === "open") {
            return {...base, open: undefined, downgraded: true, downgradeReason: "source-missing", warnings: ["source-missing"]};
        }
    }
    if (ctx.content.assetMissing) {
        base.pendingVerification.push("asset-missing");
    }

    switch (item.itemType) {
        case "text": {
            const text = asInlineText(ctx.content.kramdown);
            if (mode === "copy") return {...base, clipboardText: text, clipboardKind: "text"};
            return {...base, markdown: text};
        }
        case "markdown":
        case "structure": {
            const md = ctx.content.kramdown.slice(0, LIMITS.contentChars);
            if (mode === "copy") return {...base, clipboardText: md, clipboardKind: "markdown"};
            return {...base, markdown: md};
        }
        case "url": {
            const url = item.url || extractFirstUrl(ctx.content.kramdown);
            if (!url || !isSafeHttpUrl(url)) {
                return {...base, downgraded: true, downgradeReason: "type-unsupported", warnings: ["url-empty"]};
            }
            if (mode === "open") return {...base, open: {kind: "url", url}};
            if (mode === "copy") return {...base, clipboardText: url, clipboardKind: "url"};
            const title = item.title && item.title !== url ? item.title : url;
            return {...base, markdown: `[${title.replace(/[[\]]/g, "")}](${url})`};
        }
        case "code": {
            const fence = extractCodeFence(ctx.content.kramdown);
            const code = fence ? fence.code : ctx.content.kramdown;
            const language = fence ? fence.language : "";
            if (mode === "copy") return {...base, clipboardText: code, clipboardKind: "code"};
            return {...base, markdown: "```" + language + "\n" + code.slice(0, LIMITS.contentChars) + "\n```"};
        }
        case "image":
        case "asset": {
            const assetPath = extractAssetPath(ctx.content.kramdown);
            if (!assetPath) {
                return {...base, downgraded: true, downgradeReason: "asset-missing", warnings: ["asset-path-unresolvable"]};
            }
            if (ctx.content.assetMissing) {
                // 资源缺失：插入/打开诚实失败，复制链接仍可用
                if (mode === "copy") {
                    return {
                        ...base,
                        clipboardText: `[${item.title}](${assetPath})`,
                        clipboardKind: "markdown-link",
                        pendingVerification: ["asset-missing"],
                    };
                }
                return {...base, downgraded: true, downgradeReason: "asset-missing", warnings: ["asset-missing"]};
            }
            if (mode === "open") {
                return {...base, open: {kind: "asset", assetPath}};
            }
            if (mode === "copy") {
                return {
                    ...base,
                    clipboardText: `[${item.title}](${assetPath})`,
                    clipboardKind: "markdown-link",
                    pendingVerification: item.itemType === "image"
                        ? ["bitmap-clipboard-unverified"]
                        : [],
                };
            }
            return {
                ...base,
                markdown: item.itemType === "image" ? `![](${assetPath})` : `[${item.title}](${assetPath})`,
                pendingVerification: item.itemType === "image"
                    ? ["bitmap-clipboard-unverified"]
                    : [],
            };
        }
        case "blockref": {
            const target = item.targetBlockId;
            if (!BLOCK_ID_RE.test(target)) {
                return {...base, downgraded: true, downgradeReason: "source-missing", warnings: ["target-block-invalid"]};
            }
            if (mode === "copy" || mode === "copy-content") {
                return {...base, clipboardText: ctx.content.kramdown, clipboardKind: "markdown", mode: "copy-content"};
            }
            if (mode === "insert-ref") {
                return {...base, markdown: buildBlockRef(target, refAnchorText(item))};
            }
            if (mode === "insert-embed") {
                return {...base, markdown: buildEmbedBlock(target)};
            }
            // blockref 默认插入 = 引用语法（绝不能误克隆成普通文本）
            return {...base, markdown: buildBlockRef(target, refAnchorText(item))};
        }
        default: {
            return {...base, downgraded: true, downgradeReason: "type-unsupported", warnings: ["unknown-type"]};
        }
    }
}

function extractFirstUrl(text: string): string {
    const m = text.match(/https?:\/\/[^\s)）\]]+/);
    return m ? m[0].slice(0, 2048) : "";
}

/** openSource 的目标解析（纯函数）：URL > 资源 > 来源块 > 来源文档 > 库文档。
 * URL 仅接受 http/https（协议守卫在计划层，宿主侧另有防御）。 */
export function planOpenSource(
    item: CommonItem,
    resolved: {kramdown: string; sourceMissing: boolean; assetMissing: boolean},
): {target?: OpenTarget; failure?: "source-missing" | "doc-missing" | "asset-missing"} {
    if (item.itemType === "url") {
        const url = item.url || extractFirstUrl(resolved.kramdown);
        return url && isSafeHttpUrl(url) ? {target: {kind: "url", url}} : {failure: "source-missing"};
    }
    if (item.itemType === "image" || item.itemType === "asset") {
        const assetPath = extractAssetPath(resolved.kramdown);
        if (!assetPath || resolved.assetMissing) return {failure: "asset-missing"};
        return {target: {kind: "asset", assetPath}};
    }
    if (item.source.sourceBlockId) {
        if (resolved.sourceMissing) return {failure: "source-missing"};
        return {target: {kind: "block", docId: item.source.sourceDocId, blockId: item.source.sourceBlockId}};
    }
    if (item.source.sourceDocId) {
        if (resolved.sourceMissing) return {failure: "source-missing"};
        return {target: {kind: "doc", docId: item.source.sourceDocId}};
    }
    return {target: {kind: "doc", docId: item.libraryDocId}};
}
