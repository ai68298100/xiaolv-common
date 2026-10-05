// 内容库服务：库配置、有界索引构建（getChildBlocks 有序遍历，无 SQL）、条目 CRUD、失效检测。
// 所有写操作返回回执；失败不产生部分写入（先读后写、逐项确认）。
import {ATTR, LIMITS} from "../constants";
import {
    IKernelClient,
    parseAttrs,
    parseBatchAttrs,
    parseChildBlocks,
    parseDocId,
    parseExistingMap,
    parseKramdown,
    parseString,
} from "../kernel/client";
import {
    CommonItem,
    ISourceRef,
    ItemType,
    isBlockId,
    isItemType,
    newLogicalId,
    normalizeCommonItem,
} from "../model/item";
import {LibraryConfig} from "../model/storage";
import {SearchEntry} from "../model/search";

export interface IndexBuildResult {
    entries: SearchEntry[];
    /** 逻辑 ID → 条目完整视图（含 blockId 等执行所需字段） */
    items: Map<string, CommonItem>;
    truncated: boolean;
    docsScanned: number;
    errors: string[];
}

export type ReceiptReason = "kernel-error" | "timeout" | "invalid-input" | "not-found" | "conflict";

export type Receipt<T = undefined> =
    | {ok: true; data: T}
    | {ok: false; reason: ReceiptReason; message: string};

function fail<T>(reason: ReceiptReason, message: string): Receipt<T> {
    return {ok: false, reason, message};
}

function ok<T>(data: T): Receipt<T> {
    return {ok: true, data};
}

function toFailureReceipt(err: unknown): Receipt<never> {
    const name = (err as {name?: string})?.name;
    if (name === "KernelTimeoutError") return fail("timeout", (err as Error).message);
    return fail("kernel-error", (err as Error).message);
}

function toSearchEntry(item: CommonItem): SearchEntry {
    return {
        id: item.id,
        blockId: item.blockId,
        libraryDocId: item.libraryDocId,
        itemType: item.itemType,
        title: item.title,
        alias: item.alias,
        tags: item.tags,
        category: item.category,
        summary: item.summary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

export interface NewItemInput {
    itemType: ItemType;
    /** 块 markdown（将 appendBlock 到库文档）；code 条目传完整 fence */
    markdown: string;
    /** 导入/协议写入时指定的稳定逻辑 ID（缺省生成） */
    logicalId?: string;
    title?: string;
    alias?: string;
    tags?: string[];
    category?: string;
    url?: string;
    targetBlockId?: string;
    source?: Partial<ISourceRef>;
}

export interface SourceHealth {
    blockMissing: boolean;
    docMissing: boolean;
    assetMissing: boolean;
}

export class LibraryService {
    private config: LibraryConfig | null = null;
    private index: IndexBuildResult | null = null;

    constructor(private readonly kernel: IKernelClient) {}

    getConfig(): LibraryConfig | null {
        return this.config ? {...this.config} : null;
    }

    setConfig(config: LibraryConfig): void {
        this.config = {...config};
        this.index = null; // 库配置变化必须重建索引
    }

    /** 索引（可丢弃缓存）。为空时才请求内核；reindex() 强制重建。 */
    getIndex(): IndexBuildResult | null {
        return this.index;
    }

    async ensureIndex(): Promise<IndexBuildResult> {
        if (this.index) return this.index;
        this.index = await this.buildIndex();
        return this.index;
    }

    async reindex(): Promise<IndexBuildResult> {
        this.index = await this.buildIndex();
        return this.index;
    }

    // ---- 库发现与首次设置 ----

    async listNotebooks(): Promise<Receipt<Array<{id: string; name: string}>>> {
        try {
            const data = await this.kernel.request<Array<{id?: unknown; name?: unknown}>>("lsNotebooks", {});
            const list = (Array.isArray(data) ? data : [])
                .filter((n): n is {id: string; name: string} => typeof n?.id === "string" && typeof n?.name === "string" && !n.name.startsWith("&nbsp;"))
                .map((n) => ({id: n.id, name: n.name}));
            return ok(list);
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    /** 创建库文档（首次引导；UI 层负责先向用户确认）。返回新文档 ID。 */
    async createLibraryDoc(notebookId: string, title: string): Promise<Receipt<{docId: string}>> {
        if (!notebookId || !title.trim()) return fail("invalid-input", "notebook/title required");
        try {
            const docId = parseDocId(await this.kernel.request("createDocWithMd", {
                notebook: notebookId,
                path: "/" + title.trim().replace(/\//g, "-"),
                markdown: `# ${title.trim()}\n\n`,
            }));
            if (!docId) return fail("kernel-error", "createDocWithMd returned no id");
            return ok({docId});
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    // ---- 索引构建 ----

    private async resolveDocIds(): Promise<{docIds: string[]; errors: string[]}> {
        const config = this.config;
        if (!config) return {docIds: [], errors: ["no-library"]};
        if (config.mode === "notebook") {
            const docIds: string[] = [];
            const errors: string[] = [];
            for (const notebookId of config.notebookIds.slice(0, 16)) {
                try {
                    const data = await this.kernel.request<{files?: unknown}>("listDocsByPath", {notebook: notebookId, path: "/"});
                    const files = Array.isArray(data?.files) ? data.files : [];
                    for (const f of files) {
                        const id = (f as {id?: unknown}).id;
                        if (typeof id === "string" && isBlockId(id)) docIds.push(id);
                    }
                } catch (err) {
                    errors.push(`notebook ${notebookId}: ${(err as Error).message}`);
                }
            }
            return {docIds, errors};
        }
        if (config.mode === "doc") {
            return {docIds: config.containerDocIds.slice(0, LIMITS.maxDocs), errors: []};
        }
        // tree 模式：容器文档 + 一层子文档展开（有界；更深层暂不展开，如实计入 truncated 之外的限制）
        const docIds: string[] = [];
        const errors: string[] = [];
        for (const root of config.containerDocIds.slice(0, LIMITS.maxDocs)) {
            docIds.push(root);
            try {
                const info = await this.kernel.request<{box?: unknown; path?: unknown}>("getBlockInfo", {id: root});
                const box = typeof info?.box === "string" ? info.box : "";
                const path = typeof info?.path === "string" ? info.path : "";
                if (!box || !path) continue;
                const data = await this.kernel.request<{files?: unknown}>("listDocsByPath", {notebook: box, path});
                const files = Array.isArray(data?.files) ? data.files : [];
                for (const f of files) {
                    const id = (f as {id?: unknown}).id;
                    if (typeof id === "string" && isBlockId(id)) docIds.push(id);
                }
            } catch (err) {
                errors.push(`tree ${root}: ${(err as Error).message}`);
            }
        }
        return {docIds: Array.from(new Set(docIds)), errors};
    }

    async buildIndex(maxItems: number = LIMITS.maxItems): Promise<IndexBuildResult> {
        const {docIds, errors} = await this.resolveDocIds();
        const items = new Map<string, CommonItem>();
        const entries: SearchEntry[] = [];
        let truncated = false;
        let docsScanned = 0;

        for (const docId of docIds) {
            if (items.size >= maxItems) {
                truncated = true;
                break;
            }
            docsScanned++;
            let children;
            try {
                children = parseChildBlocks(await this.kernel.request("getChildBlocks", {id: docId}));
            } catch (err) {
                errors.push(`doc ${docId}: ${(err as Error).message}`);
                continue;
            }
            if (children.length === 0) continue;
            let attrsByBlock: Record<string, Record<string, string>> = {};
            try {
                attrsByBlock = parseBatchAttrs(await this.kernel.request("batchGetBlockAttrs", {
                    ids: children.map((c) => c.id),
                }));
            } catch (err) {
                errors.push(`attrs ${docId}: ${(err as Error).message}`);
                continue;
            }
            for (const child of children) {
                const item = normalizeCommonItem({
                    blockId: child.id,
                    libraryDocId: docId,
                    attrs: attrsByBlock[child.id] ?? {},
                    blockType: child.type,
                    subtype: child.subtype,
                    kramdown: "",
                });
                if (!item) continue; // 无 custom-xlc-id 的块不是条目（用户普通内容混排安全）
                if (items.size >= maxItems) {
                    truncated = true;
                    break;
                }
                items.set(item.id, item);
                entries.push(toSearchEntry(item));
            }
        }
        return {entries, items, truncated, docsScanned, errors};
    }

    // ---- 单条目读取 ----

    async getItem(itemId: string): Promise<Receipt<CommonItem>> {
        const idx = await this.ensureIndex();
        const known = idx.items.get(itemId);
        if (!known) return fail("not-found", `item ${itemId} not in index`);
        const refreshed = await this.loadItemByBlockId(known.blockId, known.libraryDocId);
        if (!refreshed) return fail("not-found", `block ${known.blockId} no longer carries item attrs`);
        return ok(refreshed);
    }

    async getItemByBlockId(blockId: string, libraryDocId: string): Promise<CommonItem | null> {
        return this.loadItemByBlockId(blockId, libraryDocId);
    }

    private async loadItemByBlockId(blockId: string, libraryDocId: string): Promise<CommonItem | null> {
        let attrs;
        try {
            attrs = parseAttrs(await this.kernel.request("getBlockAttrs", {id: blockId}));
        } catch {
            return null;
        }
        return normalizeCommonItem({blockId, libraryDocId, attrs});
    }

    /** 现场取条目内容（kramdown）。禁止用索引摘要充当正文。 */
    async getItemKramdown(item: CommonItem): Promise<Receipt<string>> {
        try {
            const data = parseKramdown(await this.kernel.request("getBlockKramdown", {id: item.blockId}));
            if (!data) return fail("not-found", `block ${item.blockId} kramdown unavailable`);
            return ok(data.kramdown);
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    // ---- 失效检测 ----

    /** 来源块 / 来源文档 / 资源三态检测。检查失败时如实返回 unknown=false 侧并附错误。 */
    async checkSourceHealth(item: CommonItem): Promise<Receipt<SourceHealth>> {
        const health: SourceHealth = {blockMissing: false, docMissing: false, assetMissing: false};
        try {
            const docCandidate = item.source.sourceDocId || "";
            const blockCandidate = item.source.sourceBlockId || "";
            const ids = [docCandidate, blockCandidate].filter((id) => isBlockId(id));
            if (ids.length > 0) {
                const existMap = parseExistingMap(await this.kernel.request("checkBlocksExist", {ids}));
                if (docCandidate && existMap[docCandidate] === false) health.docMissing = true;
                if (blockCandidate && existMap[blockCandidate] === false) health.blockMissing = true;
            }
            if (item.itemType === "image" || item.itemType === "asset") {
                const kramdown = await this.getItemKramdown(item);
                const path = kramdown.ok ? (kramdown.data.match(/\]\((assets\/[^)\s]+)[^)]*\)/)?.[1] ?? "") : "";
                if (path) {
                    try {
                        await this.kernel.request("getFile", {path});
                    } catch {
                        health.assetMissing = true;
                    }
                } else {
                    health.assetMissing = true;
                }
            }
            return ok(health);
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    // ---- CRUD ----

    async createItem(input: NewItemInput, libraryDocId?: string): Promise<Receipt<{item: CommonItem}>> {
        const targetDoc = libraryDocId ?? this.config?.containerDocIds[0];
        if (!targetDoc || !isBlockId(targetDoc)) return fail("invalid-input", "no library doc");
        const now = Date.now();
        let logicalId = input.logicalId ?? newLogicalId(now);
        if (!/^xlc-[0-9a-z]{10,40}$/.test(logicalId)) logicalId = newLogicalId(now);
        const attrs: Record<string, string> = {
            [ATTR.id]: logicalId,
            [ATTR.type]: input.itemType,
            [ATTR.created]: String(now),
            [ATTR.updated]: String(now),
        };
        if (input.title) attrs[ATTR.title] = input.title.slice(0, LIMITS.title);
        if (input.alias) attrs[ATTR.alias] = input.alias.slice(0, LIMITS.alias);
        if (input.tags?.length) attrs[ATTR.tags] = input.tags.slice(0, LIMITS.tags).join(",");
        if (input.category) attrs[ATTR.category] = input.category.slice(0, LIMITS.category);
        if (input.url) attrs[ATTR.url] = input.url.slice(0, 2048);
        if (input.targetBlockId && isBlockId(input.targetBlockId)) attrs[ATTR.target] = input.targetBlockId;
        if (input.source?.sourceDocId && isBlockId(input.source.sourceDocId)) attrs[ATTR.srcDoc] = input.source.sourceDocId;
        if (input.source?.sourceBlockId && isBlockId(input.source.sourceBlockId)) attrs[ATTR.srcBlock] = input.source.sourceBlockId;

        let insertResp;
        try {
            insertResp = await this.kernel.request<Array<unknown> | null>("appendBlock", {
                data: input.markdown.slice(0, LIMITS.contentChars),
                dataType: "markdown",
                parentID: targetDoc,
            });
        } catch (err) {
            return toFailureReceipt(err);
        }
        const ops = Array.isArray(insertResp) ? insertResp as Array<{doOperations?: Array<{id?: unknown}>}> : [];
        const newBlockId = ops[0]?.doOperations?.[0]?.id;
        if (typeof newBlockId !== "string" || !isBlockId(newBlockId)) {
            return fail("kernel-error", "appendBlock returned no block id");
        }
        try {
            await this.kernel.request("setBlockAttrs", {id: newBlockId, attrs});
        } catch (err) {
            // 属性写入失败：回滚块删除，保证"失败不落半条数据"
            try {
                await this.kernel.request("deleteBlock", {id: newBlockId});
            } catch {
                return fail("kernel-error", `attrs write failed AND rollback failed; orphan block ${newBlockId}`);
            }
            return toFailureReceipt(err);
        }
        const item = normalizeCommonItem({
            blockId: newBlockId,
            libraryDocId: targetDoc,
            attrs,
            blockType: input.itemType === "code" ? "c" : input.itemType === "structure" ? "super" : "p",
        });
        if (!item) return fail("kernel-error", "created item failed normalization");
        this.index = null;
        return ok({item});
    }

    async updateItem(itemId: string, patch: Partial<Pick<NewItemInput, "title" | "alias" | "tags" | "category" | "markdown" | "itemType">>): Promise<Receipt<{item: CommonItem}>> {
        const got = await this.getItem(itemId);
        if (!got.ok) return {ok: false, reason: got.reason, message: got.message};
        const item = got.data;
        const attrs: Record<string, string> = {
            [ATTR.updated]: String(Date.now()),
        };
        if (patch.title !== undefined) attrs[ATTR.title] = patch.title.slice(0, LIMITS.title);
        if (patch.alias !== undefined) attrs[ATTR.alias] = patch.alias.slice(0, LIMITS.alias);
        if (patch.tags !== undefined) attrs[ATTR.tags] = patch.tags.slice(0, LIMITS.tags).join(",");
        if (patch.category !== undefined) attrs[ATTR.category] = patch.category.slice(0, LIMITS.category);
        try {
            await this.kernel.request("setBlockAttrs", {id: item.blockId, attrs});
            if (typeof patch.markdown === "string" && patch.markdown) {
                await this.kernel.request("updateBlock", {
                    data: patch.markdown.slice(0, LIMITS.contentChars),
                    dataType: "markdown",
                    id: item.blockId,
                });
            }
        } catch (err) {
            return toFailureReceipt(err);
        }
        this.index = null;
        const refreshed = await this.getItem(itemId);
        return refreshed.ok ? ok({item: refreshed.data}) : {ok: false, reason: refreshed.reason, message: refreshed.message};
    }

    async removeItem(itemId: string): Promise<Receipt<{blockId: string}>> {
        const got = await this.getItem(itemId);
        if (!got.ok) return got;
        try {
            await this.kernel.request("deleteBlock", {id: got.data.blockId});
        } catch (err) {
            return toFailureReceipt(err);
        }
        this.index = null;
        return ok({blockId: got.data.blockId});
    }

    /** 恢复来源：把指定文档/块设为条目新来源（用户显式操作，非自动改写）。 */
    async relinkSource(itemId: string, source: {sourceDocId: string; sourceBlockId?: string}): Promise<Receipt<{item: CommonItem}>> {
        if (!isBlockId(source.sourceDocId)) return fail("invalid-input", "sourceDocId invalid");
        const got = await this.getItem(itemId);
        if (!got.ok) return {ok: false, reason: got.reason, message: got.message};
        const attrs: Record<string, string> = {
            [ATTR.srcDoc]: source.sourceDocId,
            [ATTR.updated]: String(Date.now()),
        };
        if (source.sourceBlockId && isBlockId(source.sourceBlockId)) attrs[ATTR.srcBlock] = source.sourceBlockId;
        try {
            await this.kernel.request("setBlockAttrs", {id: got.data.blockId, attrs});
        } catch (err) {
            return toFailureReceipt(err);
        }
        this.index = null;
        const refreshed = await this.getItem(itemId);
        return refreshed.ok ? ok({item: refreshed.data}) : {ok: false, reason: refreshed.reason, message: refreshed.message};
    }
}
