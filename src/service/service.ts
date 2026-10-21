// XiaolvCommonService：xiaolv-common/v1 对外服务接口（跨插件协议面）。
// 不抛异常：全部返回 ActionResult；内部组装 library/executor/registry/sidecar。
import {CAPABILITIES, ActionResult, CapabilityDescriptor, CommonItemRef, ProviderDescriptor, envelope, failureEnvelope, negotiateProtocol, normalizeSaveInput, successEnvelope} from "../model/protocol";
import {SearchQuery, SearchContext, SearchEntry, searchEntries, listByScope} from "../model/search";
import {InsertMode} from "../model/actions";
import {CommonItem, isItemType} from "../model/item";
import {toErrorMessage} from "../model/errors";
import {PluginState} from "../model/storage";
import {EVENTS, PROTOCOL_VERSION} from "../constants";
import {listAskFields} from "../model/variables";
import {ActionExecutor, type EditorInsertTargetSnapshot} from "./commands";
import {AiAssistant} from "./ai";
import {LibraryService, NewItemInput} from "./library";
import {ProviderRegistry} from "./providers";

export interface ServiceDeps {
    library: LibraryService;
    executor: ActionExecutor;
    registry: ProviderRegistry;
    ai: AiAssistant;
    /** 侧车读写（由插件入口提供 saveData 节流） */
    state: PluginState;
    onStateChange: () => void;
    /** 库块发生外部写入时通知当前 UI；可选以兼容独立协议测试/宿主。 */
    onLibraryChange?: () => void;
}

export interface ResolvedItemData {
    id: string;
    title: string;
    itemType: string;
    resolvedText: string;
    rawKramdown: string;
    hasVariables: boolean;
    variables: Array<{
        name: string;
        kind: string;
        options?: string[];
        defaultValue?: string;
    }>;
}

export type RecallMatchMode = "exact" | "multiple" | "none";

export interface RecallResult {
    matched: RecallMatchMode;
    item?: ResolvedItemData;
    candidates?: CommonItemRef[];
}

function toRef(item: Partial<CommonItem> & Pick<CommonItem, "id">): CommonItemRef {
    const ref: CommonItemRef = {
        id: item.id,
        itemType: item.itemType,
        title: item.title,
    };
    if (item.alias) ref.alias = item.alias;
    if (item.tags && item.tags.length > 0) ref.tags = item.tags;
    if (item.category) ref.category = item.category;
    if (typeof item.varCount === "number") ref.varCount = item.varCount;
    if (item.summary) ref.summary = item.summary;
    return ref;
}

export class XiaolvCommonService {
    /** 宿主插入是有副作用的；协议调用方重试时按幂等键复用成功回执。 */
    private readonly insertReceipts = new Map<string, ActionResult<{mode: string; downgraded: boolean}>>();
    private readonly insertLocks = new Map<string, Promise<void>>();

    constructor(private readonly deps: ServiceDeps) {}

    private withInsertLock<T>(key: string, action: () => Promise<T>): Promise<T> {
        const previous = this.insertLocks.get(key) ?? Promise.resolve();
        const current = previous.then(action);
        const tail = current.then(() => undefined, () => undefined);
        this.insertLocks.set(key, tail);
        return current.finally(() => {
            if (this.insertLocks.get(key) === tail) this.insertLocks.delete(key);
        });
    }

    /** 协议生命周期事件（README 承诺 item-created/updated/deleted/inserted 四件；R139 补齐前三件） */
    private emitEvent(eventName: string, itemId: string, itemType?: string): void {
        try {
            window.dispatchEvent(new CustomEvent(eventName, {
                detail: {protocolVersion: PROTOCOL_VERSION, itemId, ...(itemType ? {itemType} : {})},
            }));
        } catch {
            // 事件失败不影响主流程
        }
    }

    /** 侧车只读视图（测试/诊断用；写入必须走服务方法） */
    get state(): PluginState {
        return this.deps.state;
    }

    getCapabilities(): CapabilityDescriptor[] {
        const ai = this.deps.ai;
        return CAPABILITIES.map((name) => {
            const base: CapabilityDescriptor = {
                name,
                supportedSurfaces: ["desktop", "mobile"],
                // 移动端插入未验证（B-002）；复制/打开来源为主路径
                mobileSafe: name !== "insert",
                itemTypes: ["text", "markdown", "url", "code", "image", "asset", "blockref", "structure"],
                insertModes: ["insert", "insert-content", "copy", "copy-content", "insert-ref", "insert-embed", "open"],
                limitations: name === "insert"
                    ? ["mobile-insert-unverified: 移动端直接插入待真机验证，当前自动降级为复制"]
                    : name === "copy"
                        ? ["bitmap-clipboard-unverified: 图片位图写系统剪贴板待真机验证，复制走 Markdown 链接"]
                        : [],
            };
            if (name === "ai") {
                base.mobileSafe = true;
                base.itemTypes = [];
                base.insertModes = [];
                base.ai = {
                    tidy: ai.getSettings().enabled && ai.getSettings().shareContent,
                    draft: ai.getSettings().enabled && ai.getSettings().shareContent,
                    transform: ai.getSettings().enabled && ai.getSettings().shareContent,
                    semanticSearch: ai.getSettings().enabled,
                };
                base.limitations = [
                    "host-ai-only: 使用思源 设置→人工智能 的模型，插件不保存密钥",
                    "metadata-only-semantic: 语义找条目仅发送元数据（标题/别名/标签/分类/摘要）",
                    "kernel-chat-cache: /api/ai/chatGPT 带内核级会话缓存，一次性任务以自包含 prompt 缓解",
                ];
            }
            return base;
        });
    }

    private searchCtx(): SearchContext {
        const sort = this.deps.state.sort;
        return {
            favorites: new Set(this.deps.state.favorites),
            recents: new Map(this.deps.state.recents.map((r) => [r.id, r.usedAt])),
            usage: new Map(Object.entries(this.deps.state.usage ?? {}).map(([id, usage]) => [id, usage.count])),
            manualOrder: sort === "manual" ? new Map(this.deps.state.favorites.map((id, index) => [id, index])) : undefined,
            sort,
            now: Date.now(),
        };
    }

    private async withIndex<T>(fn: (entries: Awaited<ReturnType<LibraryService["ensureIndex"]>>) => T): Promise<ActionResult<T>> {
        try {
            const idx = await this.deps.library.ensureIndex();
            return successEnvelope(fn(idx));
        } catch (err) {
            return failureEnvelope("kernel-error", toErrorMessage(err));
        }
    }

    async search(query: SearchQuery): Promise<ActionResult<CommonItemRef[]>> {
        return this.withIndex((idx) => {
            const results = searchEntries(idx.entries, normalizeQuery(query), this.searchCtx());
            return results.map((r) => toRef(r.entry));
        });
    }

    async get(itemId: string): Promise<ActionResult<CommonItem>> {
        const got = await this.deps.library.getItem(String(itemId ?? ""));
        return got.ok ? successEnvelope(got.data) : failureEnvelope(got.reason === "timeout" ? "timeout" : got.reason === "not-found" ? "not-found" : "kernel-error", got.message);
    }

    /**
     * Headless 纯求值接口（供外部 Quicker、兄弟插件或自动化脚本无 UI 展开条目与变量）：
     * 1. 自动递归展开嵌套片段（{{xlc:snippet:...}}）；
     * 2. 若传入 fills，用实际填入值替换 {{xlc:ask:...}}；若未传入，自动填入默认值；
     * 3. 动态计算日期、时间、UUID、范式转换、安全算术等所有动态占位符；
     * 4. 统计并输出条目中含有的 ask 变量元数据（变量名、类型、选项、默认值），方便外部界面收集用户输入。
     */
    async resolve(itemId: string, fills?: Record<string, string>): Promise<ActionResult<ResolvedItemData>> {
        const got = await this.get(itemId);
        if (!got.ok || !got.data) {
            return failureEnvelope(got.reason === "timeout" ? "timeout" : got.reason === "kernel-error" ? "kernel-error" : "not-found", got.message);
        }
        const item = got.data;
        const kdRes = await this.deps.library.getItemKramdown(item);
        if (!kdRes.ok) {
            return failureEnvelope(kdRes.reason === "timeout" ? "timeout" : "kernel-error", kdRes.message);
        }
        const rawKramdown = kdRes.data ?? "";

        // 提取变量字段（code 条目保留字面值，不解析变量）
        const expandedForVars = await this.deps.library.expandSnippetRefs(rawKramdown);
        const askFields = item.itemType === "code" ? [] : listAskFields(expandedForVars);

        // 展开与求值
        const resolvedText = typeof this.deps.executor.renderForInsert === "function"
            ? await this.deps.executor.renderForInsert(rawKramdown, item, fills)
            : rawKramdown;

        return successEnvelope({
            id: item.id,
            title: item.title,
            itemType: item.itemType,
            resolvedText,
            rawKramdown,
            hasVariables: askFields.length > 0,
            variables: askFields.map((f) => ({
                name: f.name,
                kind: f.kind,
                options: f.options,
                defaultValue: f.defaultValue,
            })),
        });
    }

    /**
     * 别名闪电直达接口（Flash Recall by Alias · G41）：
     * 专为外部 Quicker 动作与全局热键设计，输入别名或拼音缩写一步到位取回展开文本。
     * - 若唯一匹配：直接计算并返回展开后的 ResolvedItemData；
     * - 若多条匹配：返回候选列表供外部选择；
     * - 若未命中：返回 not-found 错误信封。
     */
    async recall(aliasOrKeyword: string, fills?: Record<string, string>): Promise<ActionResult<RecallResult>> {
        const key = (aliasOrKeyword ?? "").trim().toLowerCase();
        if (!key) return failureEnvelope("invalid-input", "alias or keyword must not be empty");

        let idx;
        try {
            idx = await this.deps.library.ensureIndex();
        } catch (err) {
            return failureEnvelope("kernel-error", toErrorMessage(err));
        }

        // 1. 查找别名完全匹配项
        const exactAliasMatches: SearchEntry[] = [];
        for (const entry of idx.entries) {
            if (entry.alias && entry.alias.trim().toLowerCase() === key) {
                exactAliasMatches.push(entry);
            }
        }

        if (exactAliasMatches.length === 1) {
            const target = exactAliasMatches[0];
            if (target) {
                const resolved = await this.resolve(target.id, fills);
                if (resolved.ok && resolved.data) {
                    return successEnvelope({ matched: "exact" as const, item: resolved.data });
                }
            }
        } else if (exactAliasMatches.length > 1) {
            return successEnvelope({ matched: "multiple" as const, candidates: exactAliasMatches.map(toRef) });
        }

        // 2. 查找标题拼音首字母缩写完全匹配项（如 qjsp 对应 财务报销审批流）
        const acronymMatches: SearchEntry[] = [];
        for (const entry of idx.entries) {
            if (entry.pyi && entry.pyi.toLowerCase() === key) {
                acronymMatches.push(entry);
            }
        }

        if (acronymMatches.length === 1) {
            const target = acronymMatches[0];
            if (target) {
                const resolved = await this.resolve(target.id, fills);
                if (resolved.ok && resolved.data) {
                    return successEnvelope({ matched: "exact" as const, item: resolved.data });
                }
            }
        } else if (acronymMatches.length > 1) {
            return successEnvelope({ matched: "multiple" as const, candidates: acronymMatches.map(toRef) });
        }

        // 3. 降级走普通搜索前缀召回
        const searchResults = searchEntries(idx.entries, { text: key, scope: "all" }, this.searchCtx(), 5);
        if (searchResults.length === 1) {
            const target = searchResults[0]?.entry;
            if (target) {
                const resolved = await this.resolve(target.id, fills);
                if (resolved.ok && resolved.data) {
                    return successEnvelope({ matched: "exact" as const, item: resolved.data });
                }
            }
        } else if (searchResults.length > 1) {
            return successEnvelope({ matched: "multiple" as const, candidates: searchResults.map((r) => toRef(r.entry)) });
        }

        return failureEnvelope("not-found", `no matching item found for alias or keyword: "${key}"`);
    }

    async save(input: unknown): Promise<ActionResult<CommonItemRef>> {
        const parsed = normalizeSaveInput(input);
        if (!parsed.ok) return failureEnvelope("invalid-input", parsed.reason);
        const idempotencyKey = parsed.input.idempotencyKey;
        const created = await this.deps.library.createItem({
            itemType: parsed.input.itemType,
            markdown: parsed.input.markdown,
            logicalId: parsed.input.logicalId,
            title: parsed.input.title,
            alias: parsed.input.alias,
            tags: parsed.input.tags,
            category: parsed.input.category,
            url: parsed.input.url,
            targetBlockId: parsed.input.targetBlockId,
            source: {
                sourceDocId: parsed.input.source?.sourceDocId ?? "",
                sourceBlockId: parsed.input.source?.sourceBlockId ?? "",
                // 调用方声明的来源类型透传（此前硬编码 external 静默篡改语义，R139）
                sourceType: parsed.input.source?.sourceType ?? "external",
            } as NewItemInput["source"],
        }, undefined, {idempotencyKey});
        if (!created.ok) return failureEnvelope(created.reason === "timeout" ? "timeout" : created.reason === "invalid-input" ? "invalid-input" : "kernel-error", created.message);
        this.deps.onLibraryChange?.();
        this.emitEvent(EVENTS.itemCreated, created.data.item.id, created.data.item.itemType);
        return successEnvelope(toRef(created.data.item));
    }

    async update(itemId: string, input: unknown): Promise<ActionResult<CommonItemRef>> {
        if (!input || typeof input !== "object" || Array.isArray(input)) {
            return failureEnvelope("invalid-input", "update input must be object");
        }
        const obj = input as Record<string, unknown>;
        const idempotencyKey = typeof obj.idempotencyKey === "string" ? obj.idempotencyKey : undefined;
        const updated = await this.deps.library.updateItem(String(itemId ?? ""), {
            title: typeof obj.title === "string" ? obj.title : undefined,
            alias: typeof obj.alias === "string" ? obj.alias : undefined,
            tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : undefined,
            category: typeof obj.category === "string" ? obj.category : undefined,
        }, {idempotencyKey});
        if (!updated.ok) return failureEnvelope(updated.reason === "timeout" ? "timeout" : updated.reason === "not-found" ? "not-found" : "kernel-error", updated.message);
        this.deps.onLibraryChange?.();
        this.emitEvent(EVENTS.itemUpdated, updated.data.item.id, updated.data.item.itemType);
        return successEnvelope(toRef(updated.data.item));
    }

    async remove(itemId: string, options?: unknown): Promise<ActionResult<void>> {
        const id = String(itemId ?? "");
        const idempotencyKey = options && typeof options === "object" && !Array.isArray(options)
            && typeof (options as Record<string, unknown>).idempotencyKey === "string"
            ? (options as Record<string, unknown>).idempotencyKey as string : undefined;
        const removed = await this.deps.library.removeItem(id, {idempotencyKey});
        if (!removed.ok) return failureEnvelope(removed.reason === "timeout" ? "timeout" : removed.reason === "not-found" ? "not-found" : "kernel-error", removed.message);
        // 侧车清理用归一化后的 id（raw 非字符串时会残留幽灵收藏，R144）
        this.deps.state.favorites = this.deps.state.favorites.filter((x) => x !== id);
        this.deps.state.recents = this.deps.state.recents.filter((r) => r.id !== id);
        delete this.deps.state.usage[id];
        this.deps.onStateChange();
        this.deps.onLibraryChange?.();
        this.emitEvent(EVENTS.itemDeleted, id);
        return successEnvelope(undefined);
    }

    async insert(itemId: string, options?: unknown): Promise<ActionResult<{mode: string; downgraded: boolean}>> {
        // 未知 mode 显式拒绝而非静默降级为 insert（写文档的副作用不可猜，R139）
        const rawMode = typeof options === "object" && options !== null ? (options as {mode?: unknown}).mode : options;
        if (rawMode !== undefined && rawMode !== null) {
            const allowed: InsertMode[] = ["insert", "insert-content", "copy", "copy-content", "insert-ref", "insert-embed", "open"];
            if (typeof rawMode !== "string" || !(allowed as string[]).includes(rawMode)) {
                return failureEnvelope("invalid-input", "unknown mode");
            }
        }
        const rawKey = options && typeof options === "object" && !Array.isArray(options)
            ? (options as Record<string, unknown>).idempotencyKey : undefined;
        const idempotencyKey = typeof rawKey === "string" && rawKey.length >= 8 && rawKey.length <= 128 ? rawKey : "";
        const mode = normalizeInsertMode(options);
        const lockKey = idempotencyKey ? `insert:${itemId}:${idempotencyKey}` : "";
        const action = async (editorTarget?: EditorInsertTargetSnapshot | null): Promise<ActionResult<{mode: string; downgraded: boolean}>> => {
            if (idempotencyKey) {
                const previous = this.insertReceipts.get(lockKey);
                if (previous) return previous;
            }
            const got = await this.get(itemId);
            // 超时/内核错误透传真实原因，不折叠成 not-found（协议方可能据此误删本地引用，R139）
            if (!got.ok || !got.data) {
                return failureEnvelope(got.reason === "timeout" ? "timeout" : got.reason === "kernel-error" ? "kernel-error" : "not-found", got.message);
            }
            const receipt = await this.deps.executor.run(got.data, mode, editorTarget !== undefined ? {editorTarget} : undefined);
            if (!receipt.ok) {
                return failureEnvelope(executionFailureReason(receipt.message), receipt.message);
            }
            const result = successEnvelope({mode: receipt.mode, downgraded: receipt.downgraded});
            if (idempotencyKey) {
                this.insertReceipts.set(lockKey, result);
                while (this.insertReceipts.size > 256) {
                    const oldest = this.insertReceipts.keys().next().value as string | undefined;
                    if (!oldest) break;
                    this.insertReceipts.delete(oldest);
                }
            }
            return result;
        };
        const perform = (editorTarget?: EditorInsertTargetSnapshot | null) => {
            const execute = () => action(editorTarget);
            return lockKey ? this.withInsertLock(lockKey, execute) : execute();
        };
        // Freeze before both item lookup and idempotency-lock waits. Legacy executor
        // adapters without the optional scope keep their existing call contract.
        return typeof this.deps.executor.withInsertTargetScope === "function"
            ? this.deps.executor.withInsertTargetScope(mode, perform)
            : perform();
    }

    async copy(itemId: string): Promise<ActionResult<{kind: string; pendingVerification?: string[]}>> {
        const got = await this.get(itemId);
        if (!got.ok || !got.data) {
            return failureEnvelope(got.reason === "timeout" ? "timeout" : got.reason === "kernel-error" ? "kernel-error" : "not-found", got.message);
        }
        const receipt = await this.deps.executor.run(got.data, "copy");
        if (!receipt.ok) return failureEnvelope(executionFailureReason(receipt.message), receipt.message);
        return successEnvelope({kind: "clipboard", pendingVerification: receipt.pendingVerification.length ? receipt.pendingVerification : undefined});
    }

    async openSource(itemId: string): Promise<ActionResult<{opened: "doc" | "block" | "asset" | "url"}>> {
        const got = await this.get(itemId);
        if (!got.ok || !got.data) {
            return failureEnvelope(got.reason === "timeout" ? "timeout" : got.reason === "kernel-error" ? "kernel-error" : "not-found", got.message);
        }
        const receipt = await this.deps.executor.openSource(got.data);
        if (!receipt.ok) return failureEnvelope(executionFailureReason(receipt.message), receipt.message);
        return successEnvelope({opened: receipt.opened ?? "doc"});
    }

    async reindex(): Promise<ActionResult<{count: number; truncated: boolean}>> {
        try {
            const idx = await this.deps.library.reindex();
            return successEnvelope({count: idx.entries.length, truncated: idx.truncated});
        } catch (err) {
            return failureEnvelope("kernel-error", toErrorMessage(err));
        }
    }

    async getRecent(limit = 20): Promise<ActionResult<CommonItemRef[]>> {
        return this.withIndex((idx) => {
            // NaN/非有限值兜底默认 20（Math.floor(NaN)=NaN 会 slice 成空表，R144）
            const n = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
            const list = listByScope(idx.entries, "recent", this.searchCtx(), n);
            return list.map((e) => toRef(e));
        });
    }

    async getFavorites(): Promise<ActionResult<CommonItemRef[]>> {
        return this.withIndex((idx) => {
            const list = listByScope(idx.entries, "favorites", this.searchCtx());
            return list.map((e) => toRef(e));
        });
    }

    async getBatch(itemIds: unknown): Promise<ActionResult<CommonItem[]>> {
        if (!Array.isArray(itemIds)) {
            return failureEnvelope("invalid-input", "itemIds must be an array");
        }
        // 限制批量上限不超过 50，防止过度占用内存
        const safeIds = itemIds
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
            .slice(0, 50);
        return this.withIndex((idx) => {
            const items: CommonItem[] = [];
            for (const id of safeIds) {
                const item = idx.items.get(id);
                if (item) items.push(item);
            }
            return items;
        });
    }

    async getCategories(): Promise<ActionResult<string[]>> {
        return this.withIndex((idx) => {
            const catSet = new Set<string>();
            for (const entry of idx.entries) {
                if (entry.category && typeof entry.category === "string") {
                    const trimmed = entry.category.trim();
                    if (trimmed) catSet.add(trimmed);
                }
            }
            return Array.from(catSet).sort();
        });
    }

    async getTags(): Promise<ActionResult<string[]>> {
        return this.withIndex((idx) => {
            const tagSet = new Set<string>();
            for (const entry of idx.entries) {
                if (Array.isArray(entry.tags)) {
                    for (const tag of entry.tags) {
                        if (typeof tag === "string") {
                            const trimmed = tag.trim();
                            if (trimmed) tagSet.add(trimmed);
                        }
                    }
                }
            }
            return Array.from(tagSet).sort();
        });
    }

    // ---- provider 联动 ----

    registerProvider(descriptor: ProviderDescriptor, runtime?: {search?(query: string): Promise<Array<{title: string; payload: string}>>}): ActionResult<void> {
        const negotiation = negotiateProtocol(descriptor, ["protocol", "protocolVersion", "pluginId", "displayName", "provides"]);
        if (!negotiation.compatible) {
            return failureEnvelope("protocol-mismatch", negotiation.reason);
        }
        const result = this.deps.registry.register(descriptor, runtime);
        if (!result.ok) return failureEnvelope("invalid-input", result.reason);
        this.deps.state.providers = this.deps.registry.toRecords();
        this.deps.onStateChange();
        return successEnvelope(undefined);
    }

    unregisterProvider(pluginId: string): ActionResult<void> {
        this.deps.registry.unregister(String(pluginId ?? ""));
        this.deps.state.providers = this.deps.registry.toRecords();
        this.deps.onStateChange();
        return successEnvelope(undefined);
    }

    // ---- 侧车偏好 ----

    toggleFavorite(itemId: string): boolean {
        const id = String(itemId ?? "");
        if (!id) return false;
        const list = this.deps.state.favorites;
        const idx = list.indexOf(id);
        if (idx >= 0) list.splice(idx, 1);
        else list.unshift(id);
        this.deps.state.favorites = list.slice(0, 500);
        this.deps.onStateChange();
        return idx < 0;
    }

    touchRecent(itemId: string): void {
        const id = String(itemId ?? "");
        if (!id) return;
        const recents = this.deps.state.recents.filter((r) => r.id !== id);
        recents.unshift({id, usedAt: Date.now()});
        this.deps.state.recents = recents.slice(0, 200);
        this.deps.onStateChange();
    }

    envelope() {
        return envelope();
    }

    /**
     * Agent 能力处理器：思源智能体按关键词搜常用条目（只读、仅元数据出域）。
     * 输出绝不含 summary/正文（防止经 LLM 的数据外溢——门禁锁定）。
     */
    async searchForAgent(rawQuery: unknown): Promise<{result: string; structuredContent: unknown}> {
        const query = typeof rawQuery === "string" ? rawQuery.slice(0, 200) : "";
        // 头注承诺不抛异常：索引构建失败同样走空结果（R144）
        let idx;
        try {
            idx = await this.deps.library.ensureIndex();
        } catch {
            return {result: "没有匹配的条目", structuredContent: {items: []}};
        }
        const results = searchEntries(idx.entries, {text: query, scope: "all"}, this.searchCtx(), 10);
        const items = results.map((r) => ({
            id: r.entry.id,
            title: r.entry.title,
            itemType: r.entry.itemType,
            tags: [...r.entry.tags],
        }));
        return {
            result: items.length
                ? `${items.length} 条匹配：${items.map((i) => i.title).join("、")}`
                : "没有匹配的条目",
            structuredContent: {items},
        };
    }
}

function normalizeQuery(query: SearchQuery): SearchQuery {
    return {
        text: typeof query?.text === "string" ? query.text.slice(0, 200) : "",
        itemType: query?.itemType && isItemType(query.itemType) ? query.itemType : "",
        tag: typeof query?.tag === "string" ? query.tag.slice(0, 64) : "",
        category: typeof query?.category === "string" ? query.category.slice(0, 64) : "",
        scope: query?.scope === "favorites" || query?.scope === "recent" ? query.scope : "all",
    };
}

function normalizeInsertMode(options: unknown): InsertMode {
    const raw = typeof options === "object" && options !== null ? (options as {mode?: unknown}).mode : options;
    const allowed: InsertMode[] = ["insert", "insert-content", "copy", "copy-content", "insert-ref", "insert-embed", "open"];
    return typeof raw === "string" && (allowed as string[]).includes(raw) ? raw as InsertMode : "insert";
}

/** 将执行器的稳定回执映射到跨插件协议原因，保留可恢复语义。 */
function executionFailureReason(message: string): Extract<NonNullable<ActionResult<never>["reason"]>, string> {
    if (message === "source-missing") return "source-missing";
    if (message === "doc-missing") return "doc-missing";
    if (message === "asset-missing" || message === "asset-path-unresolvable") return "asset-missing";
    if (message === "unsupported" || message === "type-unsupported") return "unsupported";
    if (message.includes("timeout")) return "timeout";
    return "kernel-error";
}
