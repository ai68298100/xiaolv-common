// XiaolvCommonService：xiaolv-common/v1 对外服务接口（跨插件协议面）。
// 不抛异常：全部返回 ActionResult；内部组装 library/executor/registry/sidecar。
import {CAPABILITIES, ActionResult, CapabilityAi, CapabilityDescriptor, CommonItemRef, ProviderDescriptor, envelope, failureEnvelope, negotiateProtocol, normalizeSaveInput, successEnvelope} from "../model/protocol";
import {SearchQuery, SearchContext, searchEntries, listByScope} from "../model/search";
import {InsertMode} from "../model/actions";
import {CommonItem, isItemType} from "../model/item";
import {PluginState} from "../model/storage";
import {ActionExecutor} from "./commands";
import {AiAssistant} from "./ai";
import {LibraryService} from "./library";
import {ProviderRegistry} from "./providers";

export interface ServiceDeps {
    library: LibraryService;
    executor: ActionExecutor;
    registry: ProviderRegistry;
    ai: AiAssistant;
    /** 侧车读写（由插件入口提供 saveData 节流） */
    state: PluginState;
    onStateChange: () => void;
}

function toRef(item: CommonItem): CommonItemRef {
    return {id: item.id, itemType: item.itemType, title: item.title};
}

export class XiaolvCommonService {
    constructor(private readonly deps: ServiceDeps) {}

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
                insertModes: ["insert", "copy", "copy-content", "insert-ref", "insert-embed", "open"],
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
        return {
            favorites: new Set(this.deps.state.favorites),
            recents: new Map(this.deps.state.recents.map((r) => [r.id, r.usedAt])),
            now: Date.now(),
        };
    }

    private async withIndex<T>(fn: (entries: Awaited<ReturnType<LibraryService["ensureIndex"]>>) => T): Promise<ActionResult<T>> {
        try {
            const idx = await this.deps.library.ensureIndex();
            return successEnvelope(fn(idx));
        } catch (err) {
            return failureEnvelope("kernel-error", (err as Error).message);
        }
    }

    async search(query: SearchQuery): Promise<ActionResult<CommonItemRef[]>> {
        return this.withIndex((idx) => {
            const results = searchEntries(idx.entries, normalizeQuery(query), this.searchCtx());
            return results.map((r) => toRef(r.entry as unknown as CommonItem));
        });
    }

    async get(itemId: string): Promise<ActionResult<CommonItem>> {
        const got = await this.deps.library.getItem(String(itemId ?? ""));
        return got.ok ? successEnvelope(got.data) : failureEnvelope(got.reason === "timeout" ? "timeout" : got.reason === "not-found" ? "not-found" : "kernel-error", got.message);
    }

    async save(input: unknown): Promise<ActionResult<CommonItemRef>> {
        const parsed = normalizeSaveInput(input);
        if (!parsed.ok) return failureEnvelope("invalid-input", parsed.reason);
        const created = await this.deps.library.createItem({
            itemType: parsed.input.itemType,
            markdown: parsed.input.markdown,
            title: parsed.input.title,
            alias: parsed.input.alias,
            tags: parsed.input.tags,
            category: parsed.input.category,
            url: parsed.input.url,
            targetBlockId: parsed.input.targetBlockId,
            source: {
                sourceDocId: parsed.input.source?.sourceDocId ?? "",
                sourceBlockId: parsed.input.source?.sourceBlockId ?? "",
                sourceType: "external",
            },
        });
        if (!created.ok) return failureEnvelope(created.reason === "timeout" ? "timeout" : created.reason === "invalid-input" ? "invalid-input" : "kernel-error", created.message);
        return successEnvelope(toRef(created.data.item));
    }

    async update(itemId: string, input: unknown): Promise<ActionResult<CommonItemRef>> {
        if (!input || typeof input !== "object" || Array.isArray(input)) {
            return failureEnvelope("invalid-input", "update input must be object");
        }
        const obj = input as Record<string, unknown>;
        const updated = await this.deps.library.updateItem(String(itemId ?? ""), {
            title: typeof obj.title === "string" ? obj.title : undefined,
            alias: typeof obj.alias === "string" ? obj.alias : undefined,
            tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : undefined,
            category: typeof obj.category === "string" ? obj.category : undefined,
        });
        if (!updated.ok) return failureEnvelope(updated.reason === "timeout" ? "timeout" : updated.reason === "not-found" ? "not-found" : "kernel-error", updated.message);
        return successEnvelope(toRef(updated.data.item));
    }

    async remove(itemId: string): Promise<ActionResult<void>> {
        const removed = await this.deps.library.removeItem(String(itemId ?? ""));
        if (!removed.ok) return failureEnvelope(removed.reason === "timeout" ? "timeout" : removed.reason === "not-found" ? "not-found" : "kernel-error", removed.message);
        this.deps.state.favorites = this.deps.state.favorites.filter((id) => id !== itemId);
        this.deps.state.recents = this.deps.state.recents.filter((r) => r.id !== itemId);
        this.deps.onStateChange();
        return successEnvelope(undefined);
    }

    async insert(itemId: string, options?: unknown): Promise<ActionResult<{mode: string; downgraded: boolean}>> {
        const mode = normalizeInsertMode(options);
        const got = await this.get(itemId);
        if (!got.ok || !got.data) return failureEnvelope("not-found", got.message);
        const receipt = await this.deps.executor.run(got.data, mode);
        if (!receipt.ok) {
            return failureEnvelope("kernel-error", receipt.message);
        }
        return successEnvelope({mode: receipt.mode, downgraded: receipt.downgraded});
    }

    async copy(itemId: string): Promise<ActionResult<{kind: string; pendingVerification?: string[]}>> {
        const got = await this.get(itemId);
        if (!got.ok || !got.data) return failureEnvelope("not-found", got.message);
        const receipt = await this.deps.executor.run(got.data, "copy");
        if (!receipt.ok) return failureEnvelope("kernel-error", receipt.message);
        return successEnvelope({kind: "clipboard", pendingVerification: receipt.pendingVerification.length ? receipt.pendingVerification : undefined});
    }

    async openSource(itemId: string): Promise<ActionResult<{opened: "doc" | "block" | "asset" | "url"}>> {
        const got = await this.get(itemId);
        if (!got.ok || !got.data) return failureEnvelope("not-found", got.message);
        const receipt = await this.deps.executor.openSource(got.data);
        if (!receipt.ok) return failureEnvelope(receipt.message === "source-missing" ? "source-missing" : "kernel-error", receipt.message);
        return successEnvelope({opened: "doc"});
    }

    async reindex(): Promise<ActionResult<{count: number; truncated: boolean}>> {
        try {
            const idx = await this.deps.library.reindex();
            return successEnvelope({count: idx.entries.length, truncated: idx.truncated});
        } catch (err) {
            return failureEnvelope("kernel-error", (err as Error).message);
        }
    }

    async getRecent(limit = 20): Promise<ActionResult<CommonItemRef[]>> {
        return this.withIndex((idx) => {
            const list = listByScope(idx.entries, "recent", this.searchCtx(), Math.max(1, Math.min(100, Math.floor(limit))));
            return list.map((e) => toRef(e as unknown as CommonItem));
        });
    }

    async getFavorites(): Promise<ActionResult<CommonItemRef[]>> {
        return this.withIndex((idx) => {
            const list = listByScope(idx.entries, "favorites", this.searchCtx());
            return list.map((e) => toRef(e as unknown as CommonItem));
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
    const allowed: InsertMode[] = ["insert", "copy", "copy-content", "insert-ref", "insert-embed", "open"];
    return typeof raw === "string" && (allowed as string[]).includes(raw) ? raw as InsertMode : "insert";
}
