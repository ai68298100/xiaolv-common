// Markdown 包解析（R31）：把 buildMarkdownExport 的 items.md 解析回可导入条目。
// 与导出格式严格互逆：条目以 <!-- xlc-item ... --> 元数据注释为界（正文含 ## 标题不误切）；
// 无元数据注释的段落不识别（外来 Markdown 请走思源原生导入）。
import {ExportedItem, ConflictPolicy, ImportReceipt, classifyConflict} from "../model/transfer";
import {LIMITS} from "../constants";
import {LibraryService, NewItemInput} from "./library";
const ITEM_COMMENT_START = "<!-- xlc-item";
const ITEM_COMMENT_END = "-->";
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
}

/** 解析 items.md → 可导入条目。无 xlc-item 注释的内容一律忽略（不吞外来文本）。 */
export function parseMarkdownPack(md: string): MarkdownPackParseResult {
    const items: ExportedItem[] = [];
    const issues: Array<{index: number; reason: string}> = [];
    if (!md || !md.includes(ITEM_COMMENT_START)) return {items, issues};

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
    return {items, issues};
}

/** Markdown 包逐条应用（与 JSON 导入共用 classifyConflict/overwrite 语义），完成后重建索引。 */
export async function importMarkdownBundle(
    library: LibraryService,
    items: Array<{id: string; title: string; itemType: string; kramdown: string; tags?: string[]; category?: string; source?: {sourceDocId?: string; sourceBlockId?: string}}>,
    policy: "skip" | "overwrite" | "rename",
): Promise<ImportReceipt> {
    const receipt: ImportReceipt = {total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: []};
    for (const incoming of items) {
        receipt.total++;
        const decision = classifyConflict(incoming.id, library.getIndex()?.items.has(incoming.id) ?? false, policy);
        const applied = await applyMarkdownItem(library, incoming, decision.kind === "rename" ? undefined : incoming.id);
        if (applied) {
            if (decision.kind === "overwrite") receipt.overwritten++;
            else if (decision.kind === "rename") receipt.renamed++;
            else receipt.created++;
        } else {
            receipt.failed++;
        }
    }
    await library.reindex();
    return receipt;
}

async function applyMarkdownItem(library: LibraryService, incoming: {id: string; title: string; itemType: string; kramdown: string; tags?: string[]; category?: string; source?: {sourceDocId?: string; sourceBlockId?: string}}, logicalId: string | undefined): Promise<boolean> {
    const input: NewItemInput = {
        itemType: isKnownMdType(incoming.itemType) ? incoming.itemType : "text",
        markdown: incoming.kramdown,
        title: incoming.title || undefined,
        tags: incoming.tags,
        category: incoming.category || undefined,
        source: {
            sourceDocId: incoming.source?.sourceDocId ?? "",
            sourceBlockId: incoming.source?.sourceBlockId ?? "",
        },
    };
    if (logicalId) input.logicalId = logicalId;
    const created = await library.createItem(input);
    return created.ok;
}

function isKnownMdType(v: string): v is NewItemInput["itemType"] {
    return ["text", "markdown", "url", "code", "image", "asset", "blockref", "structure"].includes(v);
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
