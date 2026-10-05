// 导入应用（自 index.ts 拆出，R21）：逐条应用 + overwrite 更新语义，可独立单测。
// overwrite = 更新既有块（内容+元数据+url/target）；类型变化时先删后建（保持逻辑 ID）。
// 绝不允许同逻辑 ID 双块（createItem 侧另有 conflict 防御）。
import {ExportedItem, ImportReceipt, ImportReceiptLine, ConflictKind, classifyConflict, ParsedImport} from "../model/transfer";
import {LibraryService, NewItemInput} from "./library";

function isKnownType(v: string): v is NewItemInput["itemType"] {
    return ["text", "markdown", "url", "code", "image", "asset", "blockref", "structure"].includes(v);
}

export interface ImportSource {
    existingIds: ReadonlySet<string>;
    parsed: ParsedImport;
}

/** 单条导入应用：正文写块 + 属性写回（含原逻辑 ID / 来源引用）。失败返回 false。 */
export async function applyImportedItem(library: LibraryService, incoming: ExportedItem, logicalId: string | undefined): Promise<boolean> {
    const input: NewItemInput = {
        itemType: isKnownType(incoming.itemType) ? incoming.itemType : "text",
        markdown: incoming.kramdown,
        logicalId,
        title: incoming.title || undefined,
        alias: incoming.alias || undefined,
        tags: incoming.tags,
        category: incoming.category || undefined,
        url: incoming.url || undefined,
        targetBlockId: incoming.targetBlockId || undefined,
        source: {
            sourceDocId: incoming.source.sourceDocId || "",
            sourceBlockId: incoming.source.sourceBlockId || "",
            sourceType: ((incoming.source.sourceType || "external") as NonNullable<NewItemInput["source"]>["sourceType"]) || "external",
        },
    };
    const created = await library.createItem(input);
    return created.ok;
}

/** 覆盖导入：更新既有块；类型变化时删旧建新（保持逻辑 ID）。 */
export async function applyOverwriteImport(library: LibraryService, incoming: ExportedItem, logicalId: string): Promise<boolean> {
    const got = await library.getItem(logicalId);
    if (!got.ok) return false;
    const existing = got.data;
    const incomingType = isKnownType(incoming.itemType) ? incoming.itemType : "text";
    if (existing.itemType !== incomingType) {
        const removed = await library.removeItem(logicalId);
        if (!removed.ok) return false;
        return applyImportedItem(library, incoming, logicalId);
    }
    const updated = await library.updateItem(logicalId, {
        title: incoming.title || undefined,
        alias: incoming.alias || undefined,
        tags: incoming.tags,
        category: incoming.category || undefined,
        url: incoming.url || undefined,
        targetBlockId: incoming.targetBlockId || undefined,
        markdown: incoming.kramdown,
    });
    return updated.ok;
}

/** 逐条应用导入计划（冲突分类已含）；全部完成后由调用方重建索引。 */
export async function importBundle(library: LibraryService, parsed: ParsedImport, policy: "skip" | "overwrite" | "rename"): Promise<ImportReceipt> {
    const receipt: ImportReceipt = {total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: []};
    for (const incoming of parsed.items) {
        receipt.total++;
        const decision = classifyConflict(incoming.id, library.getIndex()?.items.has(incoming.id) ?? false, policy);
        try {
            if (decision.kind === "skip") {
                receipt.skipped++;
                receipt.lines.push({id: incoming.id, title: incoming.title, action: "skip", ok: true});
                continue;
            }
            const targetId = decision.kind === "rename" && decision.newId ? decision.newId : incoming.id;
            const applied = decision.kind === "overwrite"
                ? await applyOverwriteImport(library, incoming, targetId)
                : await applyImportedItem(library, incoming, targetId);
            if (!applied) {
                receipt.failed++;
                receipt.lines.push({id: incoming.id, title: incoming.title, action: decision.kind, ok: false, error: "apply failed"});
                continue;
            }
            if (decision.kind === "overwrite") receipt.overwritten++;
            else if (decision.kind === "rename") receipt.renamed++;
            else receipt.created++;
        } catch (err) {
            receipt.failed++;
            receipt.lines.push({id: incoming.id, title: incoming.title, action: "skip", ok: false, error: (err as Error).message});
        }
    }
    await library.reindex();
    return receipt;
}

export type {ImportReceiptLine, ConflictKind};
