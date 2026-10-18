// 内容库服务：库配置、有界索引构建（getChildBlocks 有序遍历，无 SQL）、条目 CRUD、失效检测。
// 所有写操作返回回执；失败不产生部分写入（先读后写、逐项确认）。
import {ATTR, ATTR_PREFIX, LIMITS} from "../constants";
import {
    IKernelClient,
    parseAttrs,
    parseBatchAttrs,
    parseBatchKramdowns,
    parseChildBlocks,
    parseDocId,
    parseDocSearch,
    parseExistingMap,
    parseKramdown,
    parseNotebookId,
    parseString,
    parseVoid,
} from "../kernel/client";
import {
    CommonItem,
    deriveSummary,
    ISourceRef,
    ItemType,
    isBlockId,
    isLogicalId,
    isSafeHttpUrl,
    isSourceType,
    newLogicalId,
    normalizeCommonItem,
    resolveBlockRefTarget,
} from "../model/item";
import {LibraryConfig} from "../model/storage";
import {SearchEntry} from "../model/search";
import {bodyWriteRestriction, normalizeKramdownIal} from "../model/kramdown";
import {getPinyinAdapter} from "../model/pinyin";
import {countAskFields, SNIPPET_PATTERN} from "../model/variables";
import {getErrorProperty, toErrorMessage} from "../model/errors";

export interface IndexBuildResult {
    entries: SearchEntry[];
    /** 逻辑 ID → 条目完整视图（含 blockId 等执行所需字段） */
    items: Map<string, CommonItem>;
    truncated: boolean;
    /** true when an optional cooperative stop interrupted index construction */
    stopped?: boolean;
    docsScanned: number;
    errors: string[];
    /** 构建时间（新鲜度判定用；可丢弃缓存语义的一部分） */
    builtAt: number;
}

export interface IndexBuildOptions {
    /** Checked between kernel requests; in-flight requests are allowed to finish. */
    shouldStop?: () => boolean;
}

export type IndependentLibraryStep = "creating-notebook" | "creating-doc" | "rolling-back";

export interface IndependentLibraryOptions extends WriteOptions {
    onProgress?: (step: IndependentLibraryStep) => void;
}

export type ReceiptReason = "kernel-error" | "timeout" | "invalid-input" | "not-found" | "conflict";

export type Receipt<T = undefined> =
    | {ok: true; data: T}
    | {
        ok: false;
        reason: ReceiptReason;
        message: string;
        /** 失败发生在独立笔记本已创建之后时保留该 ID，供 UI/人工恢复。 */
        notebookId?: string;
        compensation?: "succeeded" | "failed";
    };

export interface ConditionalDeleteInput {
    item: CommonItem;
    markdown: string;
}

export type ConditionalDeleteOutcome =
    | {status: "deleted"; itemId: string; blockId: string}
    | {status: "skipped"; itemId: string; blockId: string; reason: "not-found" | "identity-changed" | "edited" | "library-unverified"}
    | {status: "failed"; itemId: string; blockId: string; message: string};

function fail<T>(reason: ReceiptReason, message: string): Receipt<T> {
    return {ok: false, reason, message};
}

function ok<T>(data: T): Receipt<T> {
    return {ok: true, data};
}

/** 为两步编排派生有界幂等键，避免给基础键追加后超过客户端 128 字符上限。 */
function scopedIdempotencyKey(base: string, suffix: string): string {
    const tail = `:${suffix}`;
    const room = Math.max(8, 128 - tail.length);
    return `${base.slice(0, room)}${tail}`;
}

function sameManagedItem(actual: CommonItem, expected: CommonItem): boolean {
    return actual.id === expected.id
        && actual.blockId === expected.blockId
        && actual.libraryDocId === expected.libraryDocId
        && actual.itemType === expected.itemType
        && actual.title === expected.title
        && actual.alias === expected.alias
        && actual.tags.length === expected.tags.length
        && actual.tags.every((tag, index) => tag === expected.tags[index])
        && actual.category === expected.category
        // blockref 的变量数来自源块实时正文，是可重建派生缓存；源块更新不等于用户编辑了库入口。
        && (actual.itemType === "blockref" && expected.itemType === "blockref"
            ? true
            : actual.varCount === expected.varCount)
        && actual.source.sourceDocId === expected.source.sourceDocId
        && actual.source.sourceBlockId === expected.source.sourceBlockId
        && actual.source.sourceType === expected.source.sourceType
        && actual.url === expected.url
        && actual.targetBlockId === expected.targetBlockId
        && actual.createdAt === expected.createdAt
        && actual.updatedAt === expected.updatedAt
        && Boolean(actual.partsCorrupt) === Boolean(expected.partsCorrupt)
        && (actual.partBlockIds ?? [actual.blockId]).length === (expected.partBlockIds ?? [expected.blockId]).length
        && (actual.partBlockIds ?? [actual.blockId]).every((id, index) => id === (expected.partBlockIds ?? [expected.blockId])[index])
        && actual.droppedFields.length === expected.droppedFields.length
        && actual.droppedFields.every((field, index) => field === expected.droppedFields[index]);
}

function normalizeConditionalMarkdown(markdown: string): string {
    return normalizeKramdownIal(markdown);
}

function sameCustomAttrs(actual: Record<string, string>, expected: Record<string, string>): boolean {
    const actualKeys = Object.keys(actual).filter((key) => key.startsWith(ATTR_PREFIX)).sort();
    const expectedKeys = Object.keys(expected).filter((key) => key.startsWith(ATTR_PREFIX)).sort();
    return actualKeys.length === expectedKeys.length
        && actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
}

function toFailureReceipt(err: unknown): Receipt<never> {
    const name = getErrorProperty(err, "name");
    if (name === "KernelTimeoutError") return fail("timeout", toErrorMessage(err));
    return fail("kernel-error", toErrorMessage(err));
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
        sourceDocId: item.source.sourceDocId,
        sourceBlockId: item.source.sourceBlockId,
        varCount: item.varCount,
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

export interface LibraryServiceOptions {
    /** 二进制资源探针。/api/file/getFile 不是 fetchSyncPost 信封端点，生产环境必须注入同源 fetch 探针。 */
    probeAsset?: (path: string) => Promise<boolean>;
    /** 写操作成功后通知受影响的逻辑条目；用于精确失效 UI 侧可丢弃缓存。 */
    onItemsChanged?: (itemIds: readonly string[]) => void;
}

/** 写入操作选项：UI 锁按钮只是第一道防线，服务层用 key 把同一提交去重。 */
export interface WriteOptions {
    batchToken?: string;
    idempotencyKey?: string;
}

export class LibraryService {
    private config: LibraryConfig | null = null;
    private index: IndexBuildResult | null = null;
    /**
     * 写操作按条目/逻辑 ID 串行化。UI 已经锁按钮，但协议调用方、重复快捷键和
     * 两个弹窗仍可能同时写同一块；队列保证失败不会让后一个请求覆盖回滚状态。
     */
    private readonly writeLocks = new Map<string, Promise<void>>();
    /** IDs created during this service lifetime; survives cache invalidation until a config switch. */
    private readonly createdLogicalIds = new Set<string>();
    /** 已完成的幂等写回执；短期保留可防止网络重试/双击在锁释放后再次落块。 */
    private readonly idempotencyReceipts = new Map<string, Receipt<{item: CommonItem}>>();
    private readonly updateReceipts = new Map<string, Receipt<{item: CommonItem}>>();
    private readonly removeReceipts = new Map<string, Receipt<{blockId: string}>>();
    /** 成功的文档追加回执；仅调用方提供幂等键时启用。 */
    private readonly appendReceipts = new Map<string, boolean>();
    /** 首次设置创建文档的幂等回执，避免确认弹窗/宿主重试产生多个库文档。 */
    private readonly libraryDocReceipts = new Map<string, Receipt<{docId: string}>>();
    /** 独立笔记本创建/补偿删除回执；只保留本服务生命周期内的幂等结果。 */
    private readonly notebookReceipts = new Map<string, Receipt<{notebookId: string; name: string}>>();
    private readonly removeNotebookReceipts = new Map<string, Receipt<{notebookId: string}>>();
    private readonly options: LibraryServiceOptions;
    private readonly conditionalDeleteGrants = new WeakMap<CommonItem, {
        batchToken: string;
        item: CommonItem;
        attrs: Record<string, string>;
        markdown: string;
    }>();

    constructor(private readonly kernel: IKernelClient, options: LibraryServiceOptions = {}) {
        this.options = options;
    }

    private notifyItemsChanged(itemIds: readonly string[]): void {
        if (itemIds.length === 0 || !this.options.onItemsChanged) return;
        try {
            this.options.onItemsChanged([...new Set(itemIds)]);
        } catch {
            // 缓存通知是可丢弃的旁路，不得让已成功的宿主写入变成失败回执。
        }
    }

    private rememberReceipt<T>(cache: Map<string, T>, key: string, receipt: T): void {
        cache.set(key, receipt);
        while (cache.size > 256) {
            const oldest = cache.keys().next().value as string | undefined;
            if (!oldest) break;
            cache.delete(oldest);
        }
    }

    private withWriteLock<T>(key: string, action: () => Promise<T>): Promise<T> {
        const previous = this.writeLocks.get(key) ?? Promise.resolve();
        const current = previous.then(action);
        const tail = current.then(() => undefined, () => undefined);
        this.writeLocks.set(key, tail);
        return current.finally(() => {
            if (this.writeLocks.get(key) === tail) this.writeLocks.delete(key);
        });
    }

    getConfig(): LibraryConfig | null {
        return this.config ? {...this.config} : null;
    }

    setConfig(config: LibraryConfig): void {
        this.config = {...config};
        this.createdLogicalIds.clear();
        this.idempotencyReceipts.clear();
        this.updateReceipts.clear();
        this.removeReceipts.clear();
        this.appendReceipts.clear();
        this.libraryDocReceipts.clear();
        this.notebookReceipts.clear();
        this.removeNotebookReceipts.clear();
        this.invalidateIndex(); // 库配置变化必须重建索引
    }

    /** 索引（可丢弃缓存）。为空或超过 maxAgeMs 时重建（SWR：陈旧索引透明刷新）。 */
    /** 索引（可丢弃缓存）。为空或超过 maxAgeMs 时重建（SWR）。
     *  并发去重：重建进行中时共用同一 Promise（双开弹窗/预热竞争只建一次）。 */
    private buildingPromise: Promise<IndexBuildResult> | null = null;
    /** 索引代数：任一失效（index=null）自增；重建完成时代数已变则丢弃陈旧结果（R139） */
    private indexGen = 0;

    /** 使索引缓存失效（公开供宿主 onDataChanged 使用：外部同步/数据变更后下次打开重建，R148） */
    invalidateIndex(): void {
        this.indexGen++;
        this.index = null;
    }

    async ensureIndex(maxAgeMs?: number): Promise<IndexBuildResult> {
        const gen = this.indexGen;
        if (this.index) {
            const fresh = typeof maxAgeMs !== "number" || Date.now() - this.index.builtAt <= maxAgeMs;
            if (fresh) return this.index;
        }
        if (!this.buildingPromise) {
            this.buildingPromise = this.buildIndex().finally(() => {
                this.buildingPromise = null;
            });
        }
        const result = await this.buildingPromise;
        if (gen === this.indexGen) {
            this.index = result;
            return result;
        }
        // 重建期间发生写失效（gen 已变）：陈旧构建不得写入缓存，也**不得返回给调用者**——
        // 否则失效后第一个调用者（如去重检查）拿到的是不含新条目的旧数据（R148 根因修复）。
        // 按当前代数同步重建：期间若无再次失效，本次结果新鲜并写入缓存。
        return this.ensureIndex(maxAgeMs);
    }

    /** 当前缓存索引（可能为 null；调用方据此展示 loading 态） */
    getIndex(): IndexBuildResult | null {
        return this.index;
    }

    async reindex(options: IndexBuildOptions = {}): Promise<IndexBuildResult> {
        const gen = this.indexGen;
        const result = await this.buildIndex(LIMITS.maxItems, options);
        if (result.stopped) {
            this.index = null;
            return result;
        }
        if (gen === this.indexGen) {
            this.index = result;
            return result;
        }
        // 写入/换库发生在扫描期间时，丢弃陈旧快照并按当前代次重建。
        return this.ensureIndex();
    }

    // ---- 库发现与首次设置 ----

    async listNotebooks(): Promise<Receipt<Array<{id: string; name: string}>>> {
        try {
            // 信封形状（R164 真机实证）：data = {notebooks:[...]}（对象非裸数组）；
            // 此前按裸数组解析恒得空表 → 首跑/更改库的笔记本下拉恒空，「创建新库文档」被守卫拦死。
            const data = await this.kernel.request<{notebooks?: unknown} | Array<{id?: unknown; name?: unknown; closed?: unknown}>>("lsNotebooks", {});
            const raw: Array<{id?: unknown; name?: unknown; closed?: unknown}> = Array.isArray(data)
                ? data
                : Array.isArray((data as {notebooks?: unknown})?.notebooks)
                    ? (data as {notebooks: Array<{id?: unknown; name?: unknown; closed?: unknown}>}).notebooks
                    : [];
            const list = raw
                .filter((n): n is {id: string; name: string} => typeof n?.id === "string" && typeof n?.name === "string" && n.closed !== true && !n.name.startsWith("&nbsp;"))
                .map((n) => ({id: n.id, name: n.name}));
            return ok(list);
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    /** 创建库文档（首次引导；UI 层负责先向用户确认）。返回新文档 ID。 */
    async createLibraryDoc(notebookId: string, title: string, options: WriteOptions = {}): Promise<Receipt<{docId: string}>> {
        if (!notebookId || !title.trim()) return fail("invalid-input", "notebook/title required");
        const normalizedTitle = title.trim();
        const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8
            && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
        const receiptKey = idempotencyKey ? `${notebookId}:${idempotencyKey}` : "";
        const key = `library-doc:${notebookId}:${normalizedTitle}`;
        const action = async (): Promise<Receipt<{docId: string}>> => {
            if (receiptKey) {
                const previous = this.libraryDocReceipts.get(receiptKey);
                if (previous) return previous;
            }
            try {
                const docId = parseDocId(await this.kernel.request("createDocWithMd", {
                    notebook: notebookId,
                    path: "/" + normalizedTitle.replace(/\//g, "-"),
                    markdown: `# ${normalizedTitle}\n\n`,
                }, {idempotencyKey: idempotencyKey || undefined, maxRetries: 0}));
                if (!docId) return fail("kernel-error", "createDocWithMd returned no id");
                const receipt = ok({docId});
                if (receiptKey) this.libraryDocReceipts.set(receiptKey, receipt);
                return receipt;
            } catch (err) {
                return toFailureReceipt(err);
            }
        };
        return this.withWriteLock(key, action);
    }

    /** 创建独立笔记本；写请求不重试，重复提交由幂等键和服务锁保护。 */
    async createNotebook(name: string, options: WriteOptions = {}): Promise<Receipt<{notebookId: string; name: string}>> {
        const normalizedName = typeof name === "string" ? name.trim() : "";
        if (!normalizedName || normalizedName.length > LIMITS.title) return fail("invalid-input", "notebook name required");
        const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8
            && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
        const receiptKey = idempotencyKey ? idempotencyKey : normalizedName;
        const key = `create-notebook:${receiptKey}`;
        return this.withWriteLock(key, async () => {
            const previous = this.notebookReceipts.get(receiptKey);
            if (previous) return previous;
            try {
                const data = await this.kernel.request("createNotebook", {name: normalizedName}, {
                    idempotencyKey: idempotencyKey || undefined,
                    maxRetries: 0,
                });
                const notebookId = parseNotebookId(data);
                if (!notebookId) return fail("kernel-error", "createNotebook returned no valid notebook id");
                const receipt = ok({notebookId, name: normalizedName});
                this.rememberReceipt(this.notebookReceipts, receiptKey, receipt);
                return receipt;
            } catch (err) {
                return toFailureReceipt(err);
            }
        });
    }

    /** 删除笔记本只接受官方 null 回包；仅供本次创建失败的空笔记本补偿或明确管理动作使用。 */
    async removeNotebook(notebookId: string, options: WriteOptions = {}): Promise<Receipt<{notebookId: string}>> {
        if (typeof notebookId !== "string" || !/^\d{8,14}$/.test(notebookId)) {
            return fail("invalid-input", "valid notebook id required");
        }
        const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8
            && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
        const receiptKey = idempotencyKey ? idempotencyKey : notebookId;
        const key = `remove-notebook:${receiptKey}`;
        return this.withWriteLock(key, async () => {
            const previous = this.removeNotebookReceipts.get(receiptKey);
            if (previous) return previous;
            try {
                const data = await this.kernel.request("removeNotebook", {notebook: notebookId}, {
                    idempotencyKey: idempotencyKey || undefined,
                    maxRetries: 0,
                });
                if (!parseVoid(data)) return fail("kernel-error", "removeNotebook returned an invalid response");
                const receipt = ok({notebookId});
                this.rememberReceipt(this.removeNotebookReceipts, receiptKey, receipt);
                return receipt;
            } catch (err) {
                return toFailureReceipt(err);
            }
        });
    }

    /** 两步独立库编排：创建笔记本后创建库文档；文档失败时只补偿删除本次新建的笔记本。 */
    async createIndependentLibrary(notebookName: string, title: string, options: IndependentLibraryOptions = {}): Promise<Receipt<{notebookId: string; docId: string}>> {
        const normalizedName = typeof notebookName === "string" ? notebookName.trim() : "";
        const normalizedTitle = typeof title === "string" ? title.trim() : "";
        if (!normalizedName || normalizedName.length > LIMITS.title || !normalizedTitle || normalizedTitle.length > LIMITS.title) {
            return fail("invalid-input", "notebook/title required");
        }
        const baseKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8
            && options.idempotencyKey.length <= 128 ? options.idempotencyKey : `independent:${normalizedName}:${normalizedTitle}`;
        return this.withWriteLock(`independent-library:${baseKey}`, async () => {
            options.onProgress?.("creating-notebook");
            const notebook = await this.createNotebook(normalizedName, {idempotencyKey: scopedIdempotencyKey(baseKey, "nb")});
            if (!notebook.ok) return notebook;
            const createdNotebookId = notebook.data.notebookId;

            options.onProgress?.("creating-doc");
            const doc = await this.createLibraryDoc(createdNotebookId, normalizedTitle, {idempotencyKey: scopedIdempotencyKey(baseKey, "doc")});
            if (doc.ok) return ok({notebookId: createdNotebookId, docId: doc.data.docId});

            options.onProgress?.("rolling-back");
            const compensation = await this.removeNotebook(createdNotebookId, {idempotencyKey: scopedIdempotencyKey(baseKey, "rollback")});
            if (compensation.ok) {
                return {
                    ok: false,
                    reason: doc.reason,
                    message: `${doc.message}; empty notebook ${createdNotebookId} was removed`,
                    notebookId: createdNotebookId,
                    compensation: "succeeded",
                };
            }
            return {
                ok: false,
                reason: doc.reason,
                message: `${doc.message}; notebook ${createdNotebookId} could not be removed: ${compensation.message}`,
                notebookId: createdNotebookId,
                compensation: "failed",
            };
        });
    }

    /** 列出笔记本根下的一级文档，供首跑校验真实可写落点。 */
    async listNotebookDocs(notebookId: string): Promise<Receipt<Array<{id: string; name: string}>>> {
        if (!notebookId) return fail("invalid-input", "notebook required");
        try {
            const data = await this.kernel.request<{files?: unknown}>("listDocsByPath", {notebook: notebookId, path: "/"});
            const files = Array.isArray(data?.files) ? data.files : [];
            const docs = files
                .filter((f): f is {id: string; name?: unknown} => !!f && typeof (f as {id?: unknown}).id === "string" && isBlockId((f as {id: string}).id))
                .map((f) => ({id: f.id, name: typeof f.name === "string" ? f.name : f.id}));
            return ok(docs);
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    /** 按关键词搜文档（文档选择器用；ID 从 .sy path 解析，解析失败条目丢弃） */
    async searchDocs(keyword: string): Promise<Receipt<Array<{id: string; hPath: string; box: string; name: string}>>> {
        const k = keyword.trim().slice(0, 96);
        if (!k) return ok([]);
        try {
            return ok(parseDocSearch(await this.kernel.request("searchDocs", {k}, {
                latest: true,
                raceKey: "library.searchDocs",
            })));
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    /** 当前文档完整路径（{{xlc:path}} 占位符用） */
    async getDocPath(docId: string): Promise<string> {
        if (!isBlockId(docId)) return "";
        try {
            return parseString(await this.kernel.request("getFullHPathByID", {id: docId}));
        } catch {
            return "";
        }
    }

    /** 追加内容到指定文档（「插入到指定文档」用；官方 appendBlock）。
     * 默认允许用户有意重复插入；调用方可传稳定幂等键保护网络重试/双击。
     * 同一文档的写入串行，避免宿主并发追加时顺序和失败反馈不确定。
     */
    async appendToDoc(markdown: string, docId: string, options: WriteOptions = {}): Promise<boolean> {
        if (!markdown.trim()) return false;
        if (!isBlockId(docId)) return false;
        const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8
            && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
        const receiptKey = idempotencyKey ? `${docId}:${idempotencyKey}` : "";
        if (receiptKey && this.appendReceipts.has(receiptKey)) return true;
        const action = async (): Promise<boolean> => {
            if (receiptKey && this.appendReceipts.has(receiptKey)) return true;
            try {
                await this.kernel.request("appendBlock", {
                    data: markdown.slice(0, LIMITS.contentChars),
                    dataType: "markdown",
                    parentID: docId,
                }, {idempotencyKey: idempotencyKey || undefined, maxRetries: 0});
                if (idempotencyKey) {
                    this.appendReceipts.set(receiptKey, true);
                    while (this.appendReceipts.size > 256) {
                        const oldest = this.appendReceipts.keys().next().value as string | undefined;
                        if (!oldest) break;
                        this.appendReceipts.delete(oldest);
                    }
                }
                return true;
            } catch {
                // Boolean insertion callers render contextual failure states;
                // never leak a rejected host promise into the UI event loop.
                return false;
            }
        };
        return this.withWriteLock(`append:${docId}`, action);
    }

    /** 整文档导出为 Markdown（「捕获当前文档」用） */
    async exportDocContent(docId: string): Promise<Receipt<{hPath: string; content: string}>> {
        if (!isBlockId(docId)) return fail("invalid-input", "docId invalid");
        try {
            const data = await this.kernel.request<{hPath?: unknown; content?: unknown}>("exportMdContent", {id: docId});
            const content = typeof data?.content === "string" ? data.content : "";
            if (!content) return fail("not-found", "doc content unavailable");
            return ok({hPath: typeof data?.hPath === "string" ? data.hPath : "", content: content.slice(0, LIMITS.contentChars)});
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    // ---- 索引构建 ----

    private async resolveDocIds(options: IndexBuildOptions = {}): Promise<{docIds: string[]; errors: string[]; stopped: boolean}> {
        const config = this.config;
        if (!config) return {docIds: [], errors: ["no-library"], stopped: false};
        if (config.mode === "notebook") {
            const docIds: string[] = [];
            const errors: string[] = [];
            for (const notebookId of config.notebookIds.slice(0, 16)) {
                if (options.shouldStop?.()) return {docIds, errors, stopped: true};
                try {
                    const data = await this.kernel.request<{files?: unknown}>("listDocsByPath", {notebook: notebookId, path: "/"});
                    const files = Array.isArray(data?.files) ? data.files : [];
                    for (const f of files) {
                        const id = (f as {id?: unknown}).id;
                        if (typeof id === "string" && isBlockId(id)) docIds.push(id);
                    }
                } catch (err) {
                    errors.push(`notebook ${notebookId}: ${toErrorMessage(err)}`);
                }
            }
            return {docIds, errors, stopped: options.shouldStop?.() === true};
        }
        if (config.mode === "doc") {
            // 去重与 tree 模式口径一致：重复文档 ID 会产生重复条目与双份搜索结果（R139）
            return {docIds: Array.from(new Set(config.containerDocIds)).slice(0, LIMITS.maxDocs), errors: [], stopped: options.shouldStop?.() === true};
        }
        // tree 模式：容器文档 + BFS 展开至多 3 层子文档（有界：总文档数 ≤ maxDocs，超出如实报错）
        const docIds: string[] = [];
        const errors: string[] = [];
        const treeCap = LIMITS.maxDocs;
        const queue: Array<{box: string; path: string}> = [];
        for (const root of config.containerDocIds.slice(0, treeCap)) {
            if (options.shouldStop?.()) return {docIds: Array.from(new Set(docIds)), errors, stopped: true};
            docIds.push(root);
            try {
                const info = await this.kernel.request<{box?: unknown; path?: unknown}>("getBlockInfo", {id: root});
                const box = typeof info?.box === "string" ? info.box : "";
                const path = typeof info?.path === "string" ? info.path : "";
                if (box && path) queue.push({box, path});
            } catch (err) {
                errors.push(`tree ${root}: ${toErrorMessage(err)}`);
            }
        }
        const TREE_MAX_DEPTH = 3;
        let depth = 0;
        while (queue.length > 0 && depth < TREE_MAX_DEPTH && docIds.length < treeCap) {
            const level = queue.splice(0, queue.length);
            for (const node of level) {
                if (options.shouldStop?.()) return {docIds: Array.from(new Set(docIds)), errors, stopped: true};
                if (docIds.length >= treeCap) break;
                try {
                    const data = await this.kernel.request<{files?: unknown}>("listDocsByPath", {notebook: node.box, path: node.path});
                    const files = Array.isArray(data?.files) ? data.files : [];
                    for (const f of files) {
                        if (docIds.length >= treeCap) {
                            errors.push("tree truncated: document count reached cap");
                            break;
                        }
                        const id = (f as {id?: unknown}).id;
                        const childPath = (f as {path?: unknown}).path;
                        if (typeof id === "string" && isBlockId(id)) {
                            docIds.push(id);
                            if (typeof childPath === "string" && childPath) queue.push({box: node.box, path: childPath});
                        }
                    }
                } catch (err) {
                    errors.push(`tree ${node.path}: ${toErrorMessage(err)}`);
                }
            }
            depth++;
        }
        return {docIds: Array.from(new Set(docIds)), errors, stopped: options.shouldStop?.() === true};
    }

    async buildIndex(maxItems: number = LIMITS.maxItems, options: IndexBuildOptions = {}): Promise<IndexBuildResult> {
        const resolved = await this.resolveDocIds(options);
        const {docIds, errors} = resolved;
        const items = new Map<string, CommonItem>();
        const entries: SearchEntry[] = [];
        const searchEntryById = new Map<string, SearchEntry>();
        const referenceItems: CommonItem[] = [];
        let stopped = resolved.stopped;
        let truncated = stopped;
        let docsScanned = 0;

        // 有界并发扫文档（并发 4，缩短大库索引耗时）；结果按原 doc 顺序落位，保证索引顺序确定
        const perDoc: Array<Array<{child: {id: string; type: string; subtype?: string}; attrs: Record<string, string>}>> = docIds.map(() => []);
        let cursor = 0;
        const workerCount = Math.min(4, Math.max(1, docIds.length));
        const worker = async (): Promise<void> => {
            while (cursor < docIds.length) {
                if (options.shouldStop?.()) { stopped = true; truncated = true; return; }
                const index = cursor++;
                const docId = docIds[index];
                docsScanned++;
                let children;
                try {
                    children = parseChildBlocks(await this.kernel.request("getChildBlocks", {id: docId}));
                } catch (err) {
                    errors.push(`doc ${docId}: ${toErrorMessage(err)}`);
                    continue;
                }
                if (options.shouldStop?.()) { stopped = true; truncated = true; return; }
                if (children.length === 0) continue;
                let attrsByBlock: Record<string, Record<string, string>> = {};
                try {
                    attrsByBlock = parseBatchAttrs(await this.kernel.request("batchGetBlockAttrs", {
                        ids: children.map((c) => c.id),
                    }));
                } catch (err) {
                    errors.push(`attrs ${docId}: ${toErrorMessage(err)}`);
                    continue;
                }
                perDoc[index] = children.map((child) => ({child, attrs: attrsByBlock[child.id] ?? {}}));
            }
        };
        if (!stopped) await Promise.all(Array.from({length: workerCount}, () => worker()));

        // 单遍按原 doc 顺序落位；无 custom-xlc-id 的块不是条目（用户普通内容混排安全）
        outer: for (let d = 0; d < perDoc.length && !stopped; d++) {
            for (const {child, attrs} of perDoc[d] ?? []) {
                if (options.shouldStop?.()) { stopped = true; truncated = true; break outer; }
                if (items.size >= maxItems) {
                    truncated = true;
                    break outer;
                }
                // 无 custom-xlc-id 的块不是条目：混排内容不发起逐块 getBlockKramdown（N+1，R139）
                if (!attrs[ATTR.id]) continue;
                let kramdown = "";
                try {
                    const body = parseKramdown(await this.kernel.request("getBlockKramdown", {id: child.id}));
                    kramdown = body?.kramdown ?? "";
                } catch (err) {
                    // 属性仍可用于展示；正文失败要进入诊断，而不是伪造完整摘要。
                    errors.push(`block ${child.id}: ${toErrorMessage(err)}`);
                }
                if (options.shouldStop?.()) { stopped = true; truncated = true; break outer; }
                const item = normalizeCommonItem({
                    blockId: child.id,
                    libraryDocId: docIds[d],
                    attrs,
                    blockType: child.type,
                    subtype: child.subtype,
                    kramdown,
                });
                if (!item) continue;
                if (item.partsCorrupt) {
                    errors.push(`block ${child.id}: custom-xlc-parts is invalid`);
                } else if (item.partBlockIds && item.partBlockIds.length > 1) {
                    // 多块条目用锚块上的有序 ID 清单恢复完整摘要；旧条目没有清单，不能猜邻接块。
                    const full = await this.readManagedPartKramdown(item);
                    if (full.ok) item.summary = deriveSummary(full.data);
                    else errors.push(`block ${child.id}: ${full.message}`);
                }
                // 引用入口的库块只保存 marker；稍后批量读取源块，为摘要/变量徽标建立可重建缓存。
                const targetBlockId = resolveBlockRefTarget(item);
                if (item.itemType === "blockref") {
                    item.summary = "";
                    item.varCount = 0;
                    if (targetBlockId && targetBlockId !== child.id) referenceItems.push(item);
                }
                // 拼音注解（仅当适配器具备首字母能力；noop 适配器零开销零字段）
                const searchEntry = toSearchEntry(item);
                const adapter = getPinyinAdapter();
                if (adapter.capabilities.initials) {
                    const anno = adapter.annotate({title: item.title, alias: item.alias});
                    if (anno) {
                        searchEntry.py = anno.py;
                        searchEntry.pyi = anno.pyi;
                    }
                }
                items.set(item.id, item);
                entries.push(searchEntry);
                searchEntryById.set(item.id, searchEntry);
            }
        }

        // 批量读取引用目标，避免大批常用入口把索引构建变成逐条网络往返。
        const referenceTargetIds = Array.from(new Set(referenceItems.map(resolveBlockRefTarget).filter(Boolean)));
        if (referenceTargetIds.length) {
            try {
                const raw = await this.kernel.request("getBlockKramdowns", {ids: referenceTargetIds, mode: "md"});
                const bodies = parseBatchKramdowns(raw);
                let missing = 0;
                for (const item of referenceItems) {
                    const body = bodies[resolveBlockRefTarget(item)];
                    if (typeof body !== "string") { missing++; continue; }
                    item.summary = deriveSummary(body);
                    item.varCount = countAskFields(body);
                    const entry = searchEntryById.get(item.id);
                    if (entry) {
                        entry.summary = item.summary;
                        entry.varCount = item.varCount;
                    }
                }
                if (missing) errors.push(`blockref targets unavailable: ${missing}`);
            } catch (err) {
                // Keep reference records searchable by their title/tags while clearly
                // reporting that source-derived summary metadata could not be refreshed.
                errors.push(`blockref targets: ${toErrorMessage(err)}`);
            }
        }
        return {entries, items, truncated, ...(stopped ? {stopped: true} : {}), docsScanned, errors, builtAt: Date.now()};
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
    /** F5 片段嵌套：展开 {{xlc:snippet:标题}} 引用（插入语义；ask 变量保留给填充卡）。
     *  深度 ≤3；按条目标题精确匹配（重名取索引首个）；已见条目不重复展开（防环，兄弟引用允许）；
     *  标题缺失 / 成环 / 超深 → 替换为 __片段：标题__（可见可改，不静默丢）。 */
    /** F5 片段嵌套：展开 {{xlc:snippet:标题}} 引用（插入语义；ask 变量保留给填充卡）。
     *  maxDepth = 引用层数上限（默认 3）；按条目标题精确匹配（重名取索引首个）；
     *  已见条目不重复展开（防环，兄弟引用允许）；标题缺失 / 成环 / 超出层数 →
     *  替换为 __片段：标题__（可见可改，不静默丢）。 */
    async expandSnippetRefs(text: string, opts?: {maxDepth?: number}): Promise<string> {
        const maxDepth = opts?.maxDepth ?? 3;
        if (!text || !text.includes("{{xlc:snippet:")) return text;
        const idx = await this.ensureIndex();
        const byTitle = new Map<string, CommonItem>();
        for (const item of idx.items.values()) {
            if (item.title && !byTitle.has(item.title)) byTitle.set(item.title, item);
        }
        const expand = async (input: string, level: number, seen: Set<string>): Promise<string> => {
            if (!input || !input.includes("{{xlc:snippet:")) return input;
            let out = input;
            for (const match of input.matchAll(SNIPPET_PATTERN)) {
                const token = match[0];
                const title = (match[1] ?? "").trim().slice(0, LIMITS.title);
                const marker = `__片段：${title || "?"}__`;
                let replacement = marker;
                if (level <= maxDepth) {
                    const target = title ? byTitle.get(title) : undefined;
                    if (target && !seen.has(target.id)) {
                        seen.add(target.id);
                        try {
                            const kd = await this.getItemKramdown(target);
                            if (kd.ok) {
                                replacement = await expand(kd.data, level + 1, seen);
                            }
                        } finally {
                            seen.delete(target.id);
                        }
                    }
                }
                out = out.split(token).join(replacement);
            }
            return out;
        };
        return expand(text, 1, new Set());
    }

    /** 按锚块 custom-xlc-parts 清单读取完整正文；旧条目只读取锚块，绝不猜相邻块。 */
    private async readManagedPartKramdown(item: CommonItem): Promise<Receipt<string>> {
        if (item.partsCorrupt) return fail("conflict", `item ${item.id} has invalid custom-xlc-parts metadata`);
        const ids = item.partBlockIds ?? [item.blockId];
        if (ids.length < 1 || ids.length > LIMITS.maxItemParts || ids[0] !== item.blockId
            || new Set(ids).size !== ids.length || !ids.every(isBlockId)) {
            return fail("conflict", `item ${item.id} has invalid physical part list`);
        }
        const bodies: string[] = [];
        try {
            const children = parseChildBlocks(await this.kernel.request("getChildBlocks", {id: item.libraryDocId}));
            const start = children.findIndex((child) => child.id === item.blockId);
            if (start < 0 || !ids.every((id, index) => children[start + index]?.id === id)) {
                return fail("conflict", "physical parts are not consecutive top-level blocks in the item library document");
            }
            if (ids.length > 1) {
                // Attribute IDs are user-editable; never use them as authority to read other documents.
                const attrs = parseBatchAttrs(await this.kernel.request("batchGetBlockAttrs", {ids}));
                if (attrs[item.blockId]?.[ATTR.id] !== item.id
                    || attrs[item.blockId]?.[ATTR.parts] !== ids.join(",")
                    || ids.slice(1).some((id) => !attrs[id] || attrs[id]![ATTR.id] || attrs[id]![ATTR.parts])) {
                    return fail("conflict", "physical part ownership is unverified or overlaps another managed item");
                }
            }
            for (const id of ids) {
                const data = parseKramdown(await this.kernel.request("getBlockKramdown", {id}));
                if (!data || data.id !== id || typeof data.kramdown !== "string") {
                    return fail("not-found", `block ${id} kramdown unavailable`);
                }
                bodies.push(data.kramdown);
            }
            return ok(ids.length === 1 ? (bodies[0] ?? "") : bodies.join("\n\n"));
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    /** 读取条目在专用库中的物理正文（编辑、导出、撤销恢复使用）。 */
    async getStoredItemKramdown(item: CommonItem): Promise<Receipt<string>> {
        return this.readManagedPartKramdown(item);
    }

    /** 读取条目当前有效正文；引用入口永远跟随目标源块，不读取 marker。 */
    async getItemKramdown(item: CommonItem): Promise<Receipt<string>> {
        if (item.itemType !== "blockref") return this.getStoredItemKramdown(item);
        const target = resolveBlockRefTarget(item);
        if (!target) return fail("invalid-input", "blockref target is missing or invalid");
        try {
            const data = parseKramdown(await this.kernel.request("getBlockKramdown", {id: target}));
            if (!data) return fail("not-found", `target block ${target} kramdown unavailable`);
            return ok(normalizeKramdownIal(data.kramdown));
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
            const blockCandidate = item.itemType === "blockref"
                ? resolveBlockRefTarget(item)
                : (item.source.sourceBlockId || "");
            const ids = [docCandidate, blockCandidate].filter((id) => isBlockId(id));
            if (ids.length > 0) {
                const existMap = parseExistingMap(await this.kernel.request("checkBlocksExist", {ids}));
                if (docCandidate && existMap[docCandidate] === false) health.docMissing = true;
                if (blockCandidate && existMap[blockCandidate] === false) health.blockMissing = true;
            }
            if (item.itemType === "image" || item.itemType === "asset") {
                const kramdown = await this.getItemKramdown(item);
                // 内核读取失败 ≠ 资源缺失：不伪造三态，保持全 false 由打开来源实时探测兜底（R139）
                if (kramdown.ok) {
                    const path = kramdown.data.match(/\]\((assets\/[^)\s]+)[^)]*\)/)?.[1] ?? "";
                    if (!path) {
                        health.assetMissing = true;
                    } else if (this.options.probeAsset) {
                        try {
                            health.assetMissing = !(await this.options.probeAsset(path));
                        } catch {
                            health.assetMissing = true;
                        }
                    } else {
                        // 没有注入二进制探针时不能把信封请求当作资源存在性证据。
                        // 保留 unknown 为 false，调用方不会伪造“资源缺失”；生产装配应注入 probeAsset。
                        health.assetMissing = false;
                    }
                }
            }
            return ok(health);
        } catch (err) {
            return toFailureReceipt(err);
        }
    }

    // ---- CRUD ----

    async createItem(input: NewItemInput, libraryDocId?: string, options: WriteOptions = {}): Promise<Receipt<{item: CommonItem}>> {
        // logicalId 是导入/协议写入使用的幂等键；同一键的并发请求必须共享串行队列。
        // 缺省 logicalId 仍按原语义生成一次性条目，由调用方在重试时传回稳定 ID。
        const logicalKey = typeof input.logicalId === "string" && isLogicalId(input.logicalId)
            ? `item:${input.logicalId}`
            : "";
        const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8
            && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
        if (idempotencyKey) {
            const previous = this.idempotencyReceipts.get(idempotencyKey);
            if (previous) return previous;
        }
        const key = idempotencyKey ? `idempotency:${idempotencyKey}` : logicalKey;
        const action = async (): Promise<Receipt<{item: CommonItem}>> => {
            if (idempotencyKey) {
                const completed = this.idempotencyReceipts.get(idempotencyKey);
                if (completed) return completed;
            }
            const receipt = await this.createItemUnlocked(input, libraryDocId, options);
            if (idempotencyKey && receipt.ok) {
                // 有界保存 256 个最近回执；失败不缓存，用户可修正后重试。
                this.rememberReceipt(this.idempotencyReceipts, idempotencyKey, receipt);
            }
            return receipt;
        };
        return key ? this.withWriteLock(key, action) : action();
    }

    private async createItemUnlocked(input: NewItemInput, libraryDocId?: string, options: WriteOptions = {}): Promise<Receipt<{item: CommonItem}>> {
        const restriction = bodyWriteRestriction(input.markdown);
        if (restriction) return fail("conflict", restriction);
        const targetDoc = libraryDocId ?? await this.resolveWriteDoc();
        if (!targetDoc || !isBlockId(targetDoc)) return fail("invalid-input", "no library doc");
        const now = Date.now();
        let logicalId = input.logicalId ?? newLogicalId(now);
        if (!/^xlc-[0-9a-z]{10,40}$/.test(logicalId)) logicalId = newLogicalId(now);
        // 防御：同逻辑 ID 已存在 → 明确冲突（调用方应走 updateItem/先删后建），绝不静默双块
        // index 会在每次写入后失效；同时检查本实例刚创建过的 ID，避免导入重试
        // 因缓存失效而再次 append。外部已有条目仍由已构建索引的冲突检查覆盖。
        if (this.createdLogicalIds.has(logicalId) || this.index?.items.has(logicalId)) {
            return fail("conflict", `logical id already exists: ${logicalId}`);
        }
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
        if (input.url) {
            if (!isSafeHttpUrl(input.url)) return fail("invalid-input", "url must use http or https");
            attrs[ATTR.url] = input.url.trim().slice(0, 2048);
        }
        if (input.targetBlockId && isBlockId(input.targetBlockId)) attrs[ATTR.target] = input.targetBlockId;
        if (input.source?.sourceDocId && isBlockId(input.source.sourceDocId)) attrs[ATTR.srcDoc] = input.source.sourceDocId;
        if (input.source?.sourceBlockId && isBlockId(input.source.sourceBlockId)) attrs[ATTR.srcBlock] = input.source.sourceBlockId;
        if (input.source?.sourceType && isSourceType(input.source.sourceType)) attrs[ATTR.srcType] = input.source.sourceType;
        // ask 变量数徽标（写入期快照；code 条目不处理变量，恒 0）
        const varCount = input.itemType === "code" ? 0 : countAskFields(input.markdown);
        if (varCount > 0) attrs[ATTR.vars] = String(Math.min(varCount, LIMITS.maxAskFields));

        let insertResp;
        try {
            insertResp = await this.kernel.request<Array<unknown> | null>("appendBlock", {
                data: input.markdown.slice(0, LIMITS.contentChars),
                dataType: "markdown",
                parentID: targetDoc,
            }, {idempotencyKey: options.idempotencyKey, maxRetries: 0});
        } catch (err) {
            return toFailureReceipt(err);
        }
        const ops = Array.isArray(insertResp) ? insertResp as Array<{doOperations?: Array<{id?: unknown; action?: unknown; parentID?: unknown}>}> : [];
        const rawOperations = ops.flatMap((group) => Array.isArray(group?.doOperations) ? group.doOperations : []);
        // setAttrs and other transaction operations are not created blocks. Upstream may
        // return only the first inserted block, so this response is never a complete parts manifest.
        const inserts = rawOperations.filter((operation) => operation?.action === "insert");
        if (!inserts.length || inserts.some((operation) => !isBlockId(operation.id) || operation.parentID !== targetDoc)
            || rawOperations.some((operation) => operation?.action !== "insert" && operation?.action !== "setAttrs")) {
            return fail("conflict", `appendBlock outcome is unverified; inspect library document ${targetDoc} before retrying; no automatic deletion was attempted`);
        }
        const createdBlockIds = Array.from(new Set(inserts
            .map((operation) => operation?.id)
            .filter((id): id is string => typeof id === "string" && isBlockId(id))));
        const newBlockId = createdBlockIds[0];
        if (!newBlockId) {
            return fail("kernel-error", "appendBlock returned no block id");
        }
        if (createdBlockIds.length !== 1) {
            return fail("conflict", `appendBlock returned multiple insert operations for restricted input; inspect library document ${targetDoc} before retrying; no automatic deletion was attempted`);
        }
        try {
            await this.kernel.request("setBlockAttrs", {id: newBlockId, attrs});
        } catch (err) {
            // 属性写入失败：回滚块删除，保证"失败不落半条数据"
            let rollbackFailed = false;
            for (const id of [...createdBlockIds].reverse()) {
                try { await this.kernel.request("deleteBlock", {id}, {maxRetries: 0}); } catch { rollbackFailed = true; }
            }
            if (rollbackFailed) {
                return fail("kernel-error", `attrs write failed AND rollback failed; orphan blocks ${createdBlockIds.join(",")}`);
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
        this.createdLogicalIds.add(logicalId);
        if (typeof options.batchToken === "string" && options.batchToken.length >= 16 && options.batchToken.length <= 128) {
            this.conditionalDeleteGrants.set(item, {
                batchToken: options.batchToken,
                item: {...item, tags: [...item.tags], source: {...item.source}, droppedFields: [...item.droppedFields]},
                attrs: {...attrs},
                markdown: input.markdown.slice(0, LIMITS.contentChars),
            });
        }
        this.invalidateIndex();
        this.notifyItemsChanged([item.id]);
        return ok({item});
    }

    /** doc/tree 直接使用容器根；notebook 模式选择笔记本根下第一个文档作为写入父块。 */
    /** 写入文档解析缓存（按索引代数失效）：批量导入时不再每条一次 listDocsByPath 往返（R140） */
    private writeDocCache: {gen: number; docId: string | undefined} | null = null;

    private async resolveWriteDoc(): Promise<string | undefined> {
        const config = this.config;
        if (!config) return undefined;
        if (config.mode !== "notebook") return config.containerDocIds[0];
        if (this.writeDocCache && this.writeDocCache.gen === this.indexGen) return this.writeDocCache.docId;
        let resolved: string | undefined;
        for (const notebookId of config.notebookIds.slice(0, 16)) {
            try {
                const data = await this.kernel.request<{files?: unknown}>("listDocsByPath", {notebook: notebookId, path: "/"});
                const files = Array.isArray(data?.files) ? data.files : [];
                const first = files.find((f) => typeof (f as {id?: unknown})?.id === "string" && isBlockId((f as {id: string}).id));
                if (first && typeof (first as {id?: unknown}).id === "string") { resolved = (first as {id: string}).id; break; }
            } catch {
                // 尝试下一个配置的笔记本；最终返回明确 invalid-input 回执。
            }
        }
        this.writeDocCache = {gen: this.indexGen, docId: resolved};
        return resolved;
    }

    async updateItem(itemId: string, patch: Partial<Pick<NewItemInput, "title" | "alias" | "tags" | "category" | "markdown" | "url" | "targetBlockId">>, options: WriteOptions = {}): Promise<Receipt<{item: CommonItem}>> {
        const idempotencyKey = options.idempotencyKey && options.idempotencyKey.length >= 8 && options.idempotencyKey.length <= 128
            ? options.idempotencyKey : "";
        const receiptKey = idempotencyKey ? `${itemId}:${idempotencyKey}` : "";
        const key = receiptKey ? `idempotency:${receiptKey}` : `item:${itemId}`;
        const action = async (): Promise<Receipt<{item: CommonItem}>> => {
            if (receiptKey) {
                const previous = this.updateReceipts.get(receiptKey);
                if (previous) return previous;
            }
            const receipt = await this.updateItemUnlocked(itemId, patch, options);
            if (receiptKey && receipt.ok) this.rememberReceipt(this.updateReceipts, receiptKey, receipt);
            return receipt;
        };
        return this.withWriteLock(key, action);
    }

    private async updateItemUnlocked(itemId: string, patch: Partial<Pick<NewItemInput, "title" | "alias" | "tags" | "category" | "markdown" | "url" | "targetBlockId">>, options: WriteOptions = {}): Promise<Receipt<{item: CommonItem}>> {
        if (typeof patch.markdown === "string") {
            const restriction = bodyWriteRestriction(patch.markdown);
            if (restriction) return fail("conflict", restriction);
        }
        // 注：不含 itemType——类型变化需删旧建新（见 applyOverwriteImport），原地改类型会语义错位
        const got = await this.getItem(itemId);
        if (!got.ok) return {ok: false, reason: got.reason, message: got.message};
        const item = got.data;
        if (item.partsCorrupt) return fail("conflict", `item ${itemId} has invalid physical part metadata`);
        if (typeof patch.markdown === "string" && patch.markdown && (item.partBlockIds?.length ?? 1) > 1) {
            return fail("conflict", "multi-block item body editing is not available until real host update semantics are verified");
        }
        const attrs: Record<string, string> = {
            [ATTR.updated]: String(Date.now()),
        };
        if (patch.title !== undefined) attrs[ATTR.title] = patch.title.slice(0, LIMITS.title);
        if (patch.alias !== undefined) attrs[ATTR.alias] = patch.alias.slice(0, LIMITS.alias);
        if (patch.tags !== undefined) attrs[ATTR.tags] = patch.tags.slice(0, LIMITS.tags).join(",");
        if (patch.category !== undefined) attrs[ATTR.category] = patch.category.slice(0, LIMITS.category);
        if (patch.url !== undefined) {
            if (patch.url && !isSafeHttpUrl(patch.url)) return fail("invalid-input", "url must use http or https");
            attrs[ATTR.url] = patch.url.trim().slice(0, 2048);
        }
        if (patch.targetBlockId !== undefined) {
            if (patch.targetBlockId && !isBlockId(patch.targetBlockId)) return fail("invalid-input", "targetBlockId invalid");
            attrs[ATTR.target] = patch.targetBlockId;
        }
        // 内容变更时重算 ask 变量数徽标（code 恒 0；未改内容不写）
        if (typeof patch.markdown === "string" && patch.markdown) {
            const varCount = item.itemType === "code" ? 0 : countAskFields(patch.markdown);
            attrs[ATTR.vars] = varCount > 0 ? String(Math.min(varCount, LIMITS.maxAskFields)) : "";
        }
        let oldAttrs: Record<string, string> | null = null;
        let oldMarkdown: string | undefined;
        try {
            const children = parseChildBlocks(await this.kernel.request("getChildBlocks", {id: item.libraryDocId}));
            if (!children.some((child) => child.id === item.blockId)) return fail("conflict", "item has moved out of its indexed library document");
            oldAttrs = parseAttrs(await this.kernel.request("getBlockAttrs", {id: item.blockId}));
            if (typeof patch.markdown === "string" && patch.markdown) {
                oldMarkdown = parseKramdown(await this.kernel.request("getBlockKramdown", {id: item.blockId}))?.kramdown;
                if (oldMarkdown === undefined || bodyWriteRestriction(oldMarkdown)) {
                    return fail("conflict", "existing body cannot be safely restored under the current write restriction; inspect the library document before editing");
                }
            }
            await this.kernel.request("setBlockAttrs", {id: item.blockId, attrs}, {idempotencyKey: options.idempotencyKey, maxRetries: 0});
            if (typeof patch.markdown === "string" && patch.markdown) {
                await this.kernel.request("updateBlock", {
                    data: patch.markdown.slice(0, LIMITS.contentChars),
                    dataType: "markdown",
                    id: item.blockId,
                }, {idempotencyKey: options.idempotencyKey ? `${options.idempotencyKey}:body` : undefined, maxRetries: 0});
            }
        } catch (err) {
            // updateBlock 失败时恢复属性和正文，避免出现“新元数据 + 旧正文”的半更新状态。
            let rollbackFailed = false;
            if (oldAttrs) {
                try { await this.kernel.request("setBlockAttrs", {id: item.blockId, attrs: oldAttrs}, {maxRetries: 0}); } catch { rollbackFailed = true; }
            }
            if (oldMarkdown !== undefined) {
                try {
                    await this.kernel.request("updateBlock", {data: oldMarkdown, dataType: "markdown", id: item.blockId}, {maxRetries: 0});
                } catch { rollbackFailed = true; }
            }
            if (rollbackFailed) {
                return fail("kernel-error", `${toErrorMessage(err)}; rollback failed and item state may be partially updated`);
            }
            return toFailureReceipt(err);
        }
        this.invalidateIndex();
        this.notifyItemsChanged([itemId]);
        const refreshed = await this.getItem(itemId);
        return refreshed.ok ? ok({item: refreshed.data}) : {ok: false, reason: refreshed.reason, message: refreshed.message};
    }

    async removeItem(itemId: string, options: WriteOptions = {}): Promise<Receipt<{blockId: string}>> {
        const idempotencyKey = options.idempotencyKey && options.idempotencyKey.length >= 8 && options.idempotencyKey.length <= 128
            ? options.idempotencyKey : "";
        const receiptKey = idempotencyKey ? `${itemId}:${idempotencyKey}` : "";
        const key = receiptKey ? `idempotency:${receiptKey}` : `item:${itemId}`;
        const action = async (): Promise<Receipt<{blockId: string}>> => {
            if (receiptKey) {
                const previous = this.removeReceipts.get(receiptKey);
                if (previous) return previous;
            }
            const receipt = await this.removeItemUnlocked(itemId, options);
            if (receiptKey && receipt.ok) this.rememberReceipt(this.removeReceipts, receiptKey, receipt);
            return receipt;
        };
        return this.withWriteLock(key, action);
    }

    private async removeItemUnlocked(itemId: string, options: WriteOptions = {}): Promise<Receipt<{blockId: string}>> {
        const got = await this.getItem(itemId);
        if (!got.ok) return got;
        if (got.data.partsCorrupt) return fail("conflict", `item ${itemId} has invalid physical part metadata`);
        const partIds = got.data.partBlockIds ?? [got.data.blockId];
        if (partIds.length > 1) {
            return fail("conflict", "multi-block item deletion is unavailable until physical ownership is verified; open the library document to inspect it");
        }
        try {
            const children = parseChildBlocks(await this.kernel.request("getChildBlocks", {id: got.data.libraryDocId}));
            if (!children.some((child) => child.id === got.data.blockId)) return fail("conflict", "item has moved out of its indexed library document");
            for (const id of [...partIds].reverse()) {
                await this.kernel.request("deleteBlock", {id}, {idempotencyKey: options.idempotencyKey, maxRetries: 0});
            }
        } catch (err) {
            return toFailureReceipt(err);
        }
        this.createdLogicalIds.delete(got.data.id);
        this.invalidateIndex();
        this.notifyItemsChanged([got.data.id]);
        return ok({blockId: got.data.blockId});
    }

    /**
     * Undo only blocks that still match the exact item snapshot created by discovery.
     * The fresh index proves the block remains inside the configured library; live attributes
     * and body are read twice immediately before deletion to avoid removing later edits.
     */
    async removeItemsIfUnchanged(batchToken: string, inputs: ConditionalDeleteInput[]): Promise<Receipt<ConditionalDeleteOutcome[]>> {
        return this.withWriteLock(`batch:${batchToken}`, () => this.removeItemsIfUnchangedUnlocked(batchToken, inputs));
    }

    private async removeItemsIfUnchangedUnlocked(batchToken: string, inputs: ConditionalDeleteInput[]): Promise<Receipt<ConditionalDeleteOutcome[]>> {
        if (typeof batchToken !== "string" || batchToken.length < 16 || batchToken.length > 128
            || !Array.isArray(inputs) || inputs.length > LIMITS.maxItems) {
            return fail("invalid-input", "conditional delete batch exceeds the supported limit");
        }
        const unique = new Set<string>();
        for (const input of inputs) {
            if (!input || !input.item || !isLogicalId(input.item.id) || !isBlockId(input.item.blockId)
                || !isBlockId(input.item.libraryDocId) || typeof input.markdown !== "string") {
                return fail("invalid-input", "conditional delete batch contains an invalid item");
            }
            const grant = this.conditionalDeleteGrants.get(input.item);
            if (!grant || grant.batchToken !== batchToken || !sameManagedItem(input.item, grant.item)
                || normalizeConditionalMarkdown(input.markdown) !== normalizeConditionalMarkdown(grant.markdown)) {
                return fail("invalid-input", "conditional delete item was not created in this batch");
            }
            if (unique.has(input.item.id) || unique.has(input.item.blockId)) {
                return fail("invalid-input", "conditional delete batch contains duplicate item identities");
            }
            unique.add(input.item.id);
            unique.add(input.item.blockId);
        }
        if (inputs.length === 0) return ok([]);

        let index: IndexBuildResult;
        try {
            index = await this.reindex();
        } catch (err) {
            return toFailureReceipt(err);
        }
        if (index.truncated || index.errors.length > 0) {
            return ok(inputs.map(({item}) => ({
                status: "skipped" as const,
                itemId: item.id,
                blockId: item.blockId,
                reason: "library-unverified" as const,
            })));
        }

        const outcomes: ConditionalDeleteOutcome[] = [];
        let deletedAny = false;
        for (const input of inputs) {
            const {item, markdown} = input;
            const indexed = index.items.get(item.id);
            if (!indexed) {
                outcomes.push({status: "skipped", itemId: item.id, blockId: item.blockId, reason: "not-found"});
                continue;
            }
            if (indexed.blockId !== item.blockId || indexed.libraryDocId !== item.libraryDocId) {
                outcomes.push({status: "skipped", itemId: item.id, blockId: item.blockId, reason: "identity-changed"});
                continue;
            }

            try {
                const first = await this.readConditionalDeleteState(item);
                if (!first) {
                    outcomes.push({status: "skipped", itemId: item.id, blockId: item.blockId, reason: "identity-changed"});
                    continue;
                }
                if (!sameManagedItem(first.item, item) || !sameCustomAttrs(first.attrs, this.conditionalDeleteGrants.get(item)?.attrs ?? {})
                    || normalizeConditionalMarkdown(first.markdown)
                        !== normalizeConditionalMarkdown(markdown)) {
                    outcomes.push({status: "skipped", itemId: item.id, blockId: item.blockId, reason: "edited"});
                    continue;
                }

                const second = await this.readConditionalDeleteState(item);
                if (!second) {
                    outcomes.push({status: "skipped", itemId: item.id, blockId: item.blockId, reason: "identity-changed"});
                    continue;
                }
                if (!sameManagedItem(second.item, item) || !sameCustomAttrs(second.attrs, this.conditionalDeleteGrants.get(item)?.attrs ?? {})
                    || normalizeConditionalMarkdown(second.markdown)
                        !== normalizeConditionalMarkdown(markdown)) {
                    outcomes.push({status: "skipped", itemId: item.id, blockId: item.blockId, reason: "edited"});
                    continue;
                }
                const partIds = item.partBlockIds ?? [item.blockId];
                if (item.partsCorrupt || partIds.length !== 1 || partIds[0] !== item.blockId
                    || new Set(partIds).size !== partIds.length || !partIds.every(isBlockId)) {
                    outcomes.push({status: "skipped", itemId: item.id, blockId: item.blockId, reason: "identity-changed"});
                    continue;
                }
                for (const id of [...partIds].reverse()) await this.kernel.request("deleteBlock", {id});
                deletedAny = true;
                this.conditionalDeleteGrants.delete(item);
                outcomes.push({status: "deleted", itemId: item.id, blockId: item.blockId});
            } catch (err) {
                outcomes.push({
                    status: "failed",
                    itemId: item.id,
                    blockId: item.blockId,
                    message: toErrorMessage(err),
                });
            }
        }
        if (deletedAny) {
            this.invalidateIndex();
            this.notifyItemsChanged(outcomes.filter((outcome): outcome is Extract<ConditionalDeleteOutcome, {status: "deleted"}> => outcome.status === "deleted").map((outcome) => outcome.itemId));
        }
        return ok(outcomes);
    }

    private async readConditionalDeleteState(expected: CommonItem): Promise<{item: CommonItem; attrs: Record<string, string>; markdown: string} | null> {
        const attrs = parseAttrs(await this.kernel.request("getBlockAttrs", {id: expected.blockId}));
        const item = normalizeCommonItem({
            blockId: expected.blockId,
            libraryDocId: expected.libraryDocId,
            attrs,
        });
        if (!item) return null;
        const body = await this.readManagedPartKramdown(item);
        return body.ok ? {item, attrs, markdown: body.data} : null;
    }

    /** 清除来源引用（用户显式操作；空串删除自定义属性，条目本体不受影响） */
    async clearSource(itemId: string): Promise<Receipt<{item: CommonItem}>> {
        return this.withWriteLock(`item:${itemId}`, () => this.clearSourceUnlocked(itemId));
    }

    private async clearSourceUnlocked(itemId: string): Promise<Receipt<{item: CommonItem}>> {
        const got = await this.getItem(itemId);
        if (!got.ok) return {ok: false, reason: got.reason, message: got.message};
        try {
            await this.kernel.request("setBlockAttrs", {
                id: got.data.blockId,
                attrs: {[ATTR.srcDoc]: "", [ATTR.srcBlock]: ""},
            });
        } catch (err) {
            return toFailureReceipt(err);
        }
        this.invalidateIndex();
        this.notifyItemsChanged([itemId]);
        const refreshed = await this.getItem(itemId);
        return refreshed.ok ? ok({item: refreshed.data}) : {ok: false, reason: refreshed.reason, message: refreshed.message};
    }

    /** 恢复来源：把指定文档/块设为条目新来源（用户显式操作，非自动改写）。
     *  未提供 sourceBlockId 时显式清空旧块引用（防止残留指向旧位置的失效 src-block）。 */
    async relinkSource(itemId: string, source: {sourceDocId: string; sourceBlockId?: string}): Promise<Receipt<{item: CommonItem}>> {
        return this.withWriteLock(`item:${itemId}`, () => this.relinkSourceUnlocked(itemId, source));
    }

    private async relinkSourceUnlocked(itemId: string, source: {sourceDocId: string; sourceBlockId?: string}): Promise<Receipt<{item: CommonItem}>> {
        if (!isBlockId(source.sourceDocId)) return fail("invalid-input", "sourceDocId invalid");
        const got = await this.getItem(itemId);
        if (!got.ok) return {ok: false, reason: got.reason, message: got.message};
        const attrs: Record<string, string> = {
            [ATTR.srcDoc]: source.sourceDocId,
            // 显式置空：思源空串删属性语义；避免旧 src-block 残留指向错误位置
            [ATTR.srcBlock]: source.sourceBlockId && isBlockId(source.sourceBlockId) ? source.sourceBlockId : "",
            [ATTR.updated]: String(Date.now()),
        };
        try {
            await this.kernel.request("setBlockAttrs", {id: got.data.blockId, attrs});
        } catch (err) {
            return toFailureReceipt(err);
        }
        this.invalidateIndex();
        this.notifyItemsChanged([itemId]);
        const refreshed = await this.getItem(itemId);
        return refreshed.ok ? ok({item: refreshed.data}) : {ok: false, reason: refreshed.reason, message: refreshed.message};
    }
}
