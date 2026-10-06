// Markdown 包解析（R31）：把 buildMarkdownExport 的 items.md 解析回可导入条目。
// 与导出格式严格互逆：条目以 <!-- xlc-item ... --> 元数据注释为界（正文含 ## 标题不误切）；
// 无元数据注释的段落不识别（外来 Markdown 请走思源原生导入）。
import {ExportedItem, ConflictPolicy, ImportReceipt, ParsedImport} from "../model/transfer";
import {LIMITS} from "../constants";
import {LibraryService} from "./library";
import {importBundle as importJsonBundleCore} from "./importer";
const ITEM_COMMENT_START = "<!-- xlc-item";
const ITEM_COMMENT_END = "-->";
const PACK_COMMENT_START = "<!-- xlc-pack";
const TITLE_RE = /^##\s+(.+)$/;

function parseMetadata(lines: string[]): {fields: Map<string, string>; titleHint: string} {
    const fields = new Map<string, string>();
    let titleHint = "";
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ITEM_COMMENT_START || trimmed === ITEM_COMMENT_END) continue;
        const idx = trimmed.indexOf(":");
        if (idx <= 0) continue;
        fields.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim());
    }
    return {fields, titleHint};
}

export interface MarkdownPackParseResult {
    items: ExportedItem[];
    issues: Array<{index: number; reason: string}>;
    /** 包清单（F6）：xlc-pack 注释中的包名与变量清单；旧包/外来 MD 无此信息 */
    pack?: {name: string; vars: string[]};
}

/** 解析首部 xlc-pack 清单（存在且位于首个条目之前才有效；字段缺失容忍）。 */
function parsePackManifest(md: string, firstItemAt: number): {name: string; vars: string[]} | undefined {
    const start = md.indexOf(PACK_COMMENT_START);
    if (start === -1 || start > firstItemAt) return undefined;
    const end = md.indexOf(ITEM_COMMENT_END, start);
    if (end === -1) return undefined;
    const fields = parseMetadata(md.slice(start + PACK_COMMENT_START.length, end).split("\n")).fields;
    const name = (fields.get("name") ?? "").slice(0, LIMITS.title);
    const vars = (fields.get("vars") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, LIMITS.maxAskFields);
    if (!name) return undefined;
    return {name, vars};
}

/** 解析 items.md → 可导入条目。无 xlc-item 注释的内容一律忽略（不吞外来文本）。 */
export function parseMarkdownPack(md: string): MarkdownPackParseResult {
    const items: ExportedItem[] = [];
    const issues: Array<{index: number; reason: string}> = [];
    if (!md || !md.includes(ITEM_COMMENT_START)) return {items, issues};
    const firstItemAt = md.indexOf(ITEM_COMMENT_START);
    const pack = parsePackManifest(md, firstItemAt);

    // 以元数据注释为界切块；每块起点回溯到紧邻注释前的 `## ` 标题行（标题在注释之前）
    const commentStarts: number[] = [];
    const commentEnds: number[] = [];
    let hasUnclosed = false;
    let scan = 0;
    while (true) {
        const start = md.indexOf(ITEM_COMMENT_START, scan);
        if (start === -1) break;
        const end = md.indexOf(ITEM_COMMENT_END, start);
        if (end === -1) {
            hasUnclosed = true;
            break;
        }
        commentStarts.push(start);
        commentEnds.push(end + ITEM_COMMENT_END.length);
        scan = start + ITEM_COMMENT_START.length;
        if (commentStarts.length > LIMITS.maxItems) break;
    }
    const chunks: string[] = [];
    for (let i = 0; i < commentStarts.length; i++) {
        const lowerBound = i > 0 ? commentEnds[i - 1] : 0;
        // 回溯：注释前最近的行首 `## `（标题行），但不越过上一条目的注释结束
        const titleLineStart = md.lastIndexOf("\n## ", commentStarts[i]) + 1;
        const chunkStart = Math.max(Math.min(titleLineStart, commentStarts[i]), lowerBound);
        const chunkEnd = i + 1 < commentStarts.length
            ? Math.max(md.lastIndexOf("\n## ", commentStarts[i + 1]) + 1, commentStarts[i + 1])
            : md.length;
        chunks.push(md.slice(chunkStart, chunkEnd));
    }

    chunks.forEach((chunk, index) => {
        const endIdx = chunk.indexOf(ITEM_COMMENT_END);
        if (endIdx === -1) {
            issues.push({index, reason: "metadata-comment-unclosed"});
            return;
        }
        const metaLines = chunk.slice(0, endIdx).split("\n");
        const {fields} = parseMetadata(metaLines);
        const id = fields.get("id") ?? "";
        if (!/^xlc-[0-9a-z]{10,40}$/.test(id)) {
            issues.push({index, reason: "invalid-id"});
            return;
        }
        const itemType = fields.get("type") ?? "text";
        // 标题：元数据注释前的最后一个 ## 行（导出格式为 `## {title}` 紧邻注释前）
        let title = "";
        const before = chunk.slice(0, chunk.indexOf(ITEM_COMMENT_START));
        for (const line of before.split("\n")) {
            const m = line.match(TITLE_RE);
            if (m) title = m[1].trim();
        }
        if (!title && fields.get("alias")) title = fields.get("alias") ?? "";
        // 正文：注释结束后去掉紧跟的空行
        const body = chunk.slice(endIdx + ITEM_COMMENT_END.length).replace(/^\s*\n/, "").replace(/\n\s*$/, "");
        items.push({
            id,
            itemType,
            title: title.slice(0, LIMITS.title),
            alias: (fields.get("alias") ?? "").slice(0, LIMITS.alias),
            tags: (fields.get("tags") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, LIMITS.tags),
            category: (fields.get("category") ?? "").slice(0, LIMITS.category),
            kramdown: body.slice(0, LIMITS.contentChars),
            source: {
                sourceDocId: fields.get("source-doc") ?? "",
                sourceBlockId: fields.get("source-block") ?? "",
                sourceType: fields.get("source-type") ?? "external",
            },
            url: fields.get("url") ?? "",
            targetBlockId: fields.get("target") ?? "",
            createdAt: 0,
            updatedAt: Date.now(),
        });
    });
    if (hasUnclosed) issues.push({index: commentStarts.length, reason: "metadata-comment-unclosed"});
    return {items, issues, pack};
}

/** Markdown 包逐条应用：复用 importer 的单一真源（含 R21 overwrite 更新语义与 conflict 防御），完成后重建索引。 */
export async function importMarkdownBundle(
    library: LibraryService,
    items: ReadonlyArray<ExportedItem>,
    policy: "skip" | "overwrite" | "rename",
): Promise<ImportReceipt> {
    // 委托 importer.importBundle：overwrite=更新既有块（类型变化删旧建新）、
    // createItem 侧 conflict 防御自动生效（绝不双块）；全字段保真与 JSON 导入一致
    const parsed: ParsedImport = {schemaVersion: 1, items: items as ExportedItem[], unknownTopFields: []};
    return importJsonBundleCore(library, parsed, policy);
}

interface ParsedImportLike {
    schemaVersion: number;
    items: ExportedItem[];
    unknownTopFields: string[];
}

/** 供 parseMarkdownPack 使用的元数据行渲染（与 buildMarkdownExport 格式一致） */
export function renderItemMetadata(item: ExportedItem): string {
    const lines = [
        ITEM_COMMENT_START,
        `id: ${item.id}`,
        `type: ${item.itemType}`,
    ];
    if (item.alias) lines.push(`alias: ${item.alias}`);
    if (item.tags.length) lines.push(`tags: ${item.tags.join(",")}`);
    if (item.category) lines.push(`category: ${item.category}`);
    if (item.source.sourceDocId) lines.push(`source-doc: ${item.source.sourceDocId}`);
    if (item.source.sourceBlockId) lines.push(`source-block: ${item.source.sourceBlockId}`);
    lines.push(ITEM_COMMENT_END);
    return lines.join("\n");
}
