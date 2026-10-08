// 导入应用（自 index.ts 拆出，R21）：逐条应用 + overwrite 更新语义，可独立单测。
// overwrite = 更新既有块（内容+元数据+url/target）；类型变化时先删后建（保持逻辑 ID）。
// 绝不允许同逻辑 ID 双块（createItem 侧另有 conflict 防御）。
import {ExportedItem, ImportReceipt, ImportReceiptLine, ConflictKind, classifyConflict, ParsedImport} from "../model/transfer";
import {LibraryService, NewItemInput} from "./library";
import {isItemType} from "../model/item";

function isKnownType(v: string): v is NewItemInput["itemType"] {
    return isItemType(v);
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
        // 类型变化 = 先删后建。删除前备份旧正文：建新失败时尽力原样恢复旧条目，
        // 不允许「旧已删、新未建」成为终态（失败可恢复红线，R140）。
        const backupKd = await library.getItemKramdown(existing);
        const backup = backupKd.ok ? backupKd.data : "";
        const removed = await library.removeItem(logicalId);
        if (!removed.ok) return false;
        const created = await library.createItem({
            itemType: incomingType,
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
        });
        if (created.ok) return true;
        if (backup) {
            await library.createItem({
                itemType: existing.itemType,
                markdown: backup,
                logicalId,
                title: existing.title || undefined,
                alias: existing.alias || undefined,
                tags: existing.tags,
                category: existing.category || undefined,
                url: existing.url || undefined,
                targetBlockId: existing.targetBlockId || undefined,
                source: {...existing.source},
            });
        }
        return false;
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
    // 建立一次快照：createItem 成功后会使缓存失效，不能用会变化的 getIndex() 判冲突。
    const existingIds = new Set((await library.ensureIndex()).items.keys());
    for (const incoming of parsed.items) {
        receipt.total++;
        if (!isKnownType(incoming.itemType)) {
            receipt.failed++;
            receipt.lines.push({id: incoming.id, title: incoming.title, action: "new", ok: false, error: "unknown item type"});
            continue;
        }
        const decision = classifyConflict(incoming.id, existingIds.has(incoming.id), policy);
        try {
            if (decision.kind === "skip") {
                receipt.skipped++;
                receipt.lines.push({id: incoming.id, title: incoming.title, action: "skip", ok: true});
                continue;
            }
            let targetId = decision.kind === "rename" && decision.newId ? decision.newId : incoming.id;
            let renameAttempts = 0;
            while (decision.kind === "rename" && existingIds.has(targetId) && renameAttempts < 8) {
                targetId = classifyConflict(incoming.id, true, "rename").newId ?? targetId;
                renameAttempts++;
            }
            if (decision.kind === "rename" && existingIds.has(targetId)) {
                receipt.failed++;
                receipt.lines.push({id: incoming.id, title: incoming.title, action: "rename", ok: false, error: "unable to allocate unique id"});
                continue;
            }
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
            existingIds.add(targetId);
        } catch (err) {
            receipt.failed++;
            // 失败行记录真实决策类型（原硬编码 skip 导致回执失真，R144）
            receipt.lines.push({id: incoming.id, title: incoming.title, action: decision?.kind ?? "new", ok: false, error: (err as Error).message});
        }
    }
    await library.reindex();
    return receipt;
}

export type {ImportReceiptLine, ConflictKind};
