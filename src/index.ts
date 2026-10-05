// 小驴常用插件入口：生命周期、命令注册、UI 装配、协议事件、首次引导。
import {
    App,
    Dialog,
    Plugin,
    showMessage,
    confirm,
} from "siyuan";
import type {IMenuItem} from "siyuan";
import {fetchSyncPost} from "siyuan";
import "@/styles/index.scss";
import {LIMITS, STORAGE_KEYS} from "./constants";
import {createKernelClient, parseExistingMap, type IKernelClient} from "./kernel/client";
import {CommonItem} from "./model/item";
import {ExportedItem, buildBundle, classifyConflict, validateImport, ConflictPolicy, ImportIssue, ImportReceipt} from "./model/transfer";
import {LibraryConfig, CONFIG_VERSION, migrateState, normalizeLibraryConfig, normalizeState, PluginState} from "./model/storage";
import {SearchContext} from "./model/search";
import {LruCache, PREVIEW_CACHE_CAPACITY} from "./model/lru";
import {setPinyinAdapter, createNoopPinyinAdapter} from "./model/pinyin";
import {createTinyPinyinAdapter} from "./model/pinyin-tiny";
import {buildProviderRows} from "./model/provider-section";
import {CapabilityDescriptor, ProviderDescriptor} from "./model/protocol";
import {LibraryService, NewItemInput, SourceHealth} from "./service/library";
import {ActionExecutor, HostBridge} from "./service/commands";
import {AiAssistant, AiUnavailableError, SearchMetaEntry} from "./service/ai";
import {ProviderRegistry} from "./service/providers";
import {XiaolvCommonService} from "./service/service";
import {CommonSearchDialog} from "./ui/dialog";
import {CaptureDialog, confirmDelete} from "./ui/capture";
import {ICONS} from "./ui/icons";
import {buildZip} from "./model/zip";
import {buildMarkdownExport} from "./service/export-markdown";
import type {TransformKind} from "./service/ai";

type TFn = (key: string, ...args: string[]) => string;

export default class XiaolvCommonPlugin extends Plugin {
    private kernelClient!: IKernelClient;
    private library!: LibraryService;
    private host!: HostBridge;
    private executor!: ActionExecutor;
    private registry!: ProviderRegistry;
    private ai!: AiAssistant;
    private service!: XiaolvCommonService;
    private capture!: CaptureDialog;
    private state!: PluginState;
    private config!: LibraryConfig | null;
    private searchDialog: CommonSearchDialog | null = null;
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    /** 右键菜单处理器引用（onunload 解绑） */
    private menuHandler: ((event: {detail: {menu: {addItem: (item: {icon: string; label: string; click: () => void}) => void}}}) => void) | null = null;
    /** 来源失效预检缓存（每次搜索刷新时批量重建；仅为列表徽标，打开来源仍实时校验） */
    private missingSources = new Set<string>();
    /** 协议命令 ID → 执行器（xiaolv.common.*，供雷切等按稳定 ID 调用） */
    public readonly protocolCommands: Record<string, (payload?: unknown) => Promise<unknown>> = {};

    async onload(): Promise<void> {
        this.addIcons(ICONS);
        // 数据加载与迁移
        const [rawConfig, rawState] = await Promise.all([
            this.loadData(STORAGE_KEYS.config).catch(() => null),
            this.loadData(STORAGE_KEYS.state).catch(() => null),
        ]);
        this.config = normalizeLibraryConfig(rawConfig);
        const migrated = migrateState(rawState);
        if ("rejected" in migrated) {
            // 未来版本数据：保留原样不降级改写，仅提示（诚实降级，不破坏）
            showMessage(this.i18nFn()("libInvalid"), 5000, "error");
            this.state = normalizeState(null);
        } else {
            this.state = migrated.state;
        }
        this.bootServices();
        this.registerCommands();
        this.registerEntries();
    }

    private bootServices(): void {
        const kernel = createKernelClient({syncPost: fetchSyncPost as never});
        this.kernelClient = kernel;
        // 拼音适配器装配（ADR 0004/R5：tiny-pinyin 本地注解，设置可关；关闭即 noop 零开销）
        this.applyPinyinAdapter();
        this.library = new LibraryService(kernel);
        if (this.config) this.library.setConfig(this.config);
        this.host = new HostBridge(this.app);
        this.registry = new ProviderRegistry();
        this.registry.restore(this.state.providers);
        this.ai = new AiAssistant({request: (endpoint, payload) => kernel.request(endpoint as never, payload ?? {})}, this.state.ai);
        this.executor = new ActionExecutor(this.library, this.host, this.notify, (item) => this.service.touchRecent(item.id), {
            enabled: () => this.state.search.placeholders,
            now: () => new Date(),
            currentDoc: async () => {
                const docId = this.host.currentDocId();
                if (!docId) return null;
                // 标题用内核权威 hPath 末段（不读内部 DOM，ADR 0003）
                const path = await this.library.getDocPath(docId);
                if (!path) return {title: "", path: ""};
                return {title: path.split("/").filter(Boolean).pop() ?? path, path};
            },
        });
        this.service = new XiaolvCommonService({
            library: this.library,
            executor: this.executor,
            registry: this.registry,
            ai: this.ai,
            state: this.state,
            onStateChange: () => this.persistSoon(),
        });
        try {
            // 思源智能体能力（3.8.x）：按关键词搜常用条目——只读 localRead，输出仅元数据
            this.addAgentCapability({
                name: "xiaolv_common_search",
                title: "搜索小驴常用条目",
                description: "按关键词搜索用户的常用内容条目（标题/类型/标签）。只读；不含条目正文。",
                inputSchema: {
                    type: "object",
                    properties: {query: {type: "string", description: "搜索关键词"}},
                    required: ["query"],
                },
                effects: {localRead: true},
                handler: async (args) => {
                    try {
                        return await this.service.searchForAgent(args?.query);
                    } catch (err) {
                        return {error: (err as Error).message};
                    }
                },
            });
        } catch {
            // 旧宿主无 addAgentCapability：智能体能力缺席，不影响插件本体
        }
        this.capture = new CaptureDialog({
            t: this.i18nFn(),
            getSelectionText: () => getSelectionInfo(),
            currentDocId: () => this.host.currentDocId(),
            readClipboardText: async () => {
                if (!navigator.clipboard?.readText) throw new Error("clipboard unavailable");
                return navigator.clipboard.readText();
            },
            createItem: async (input) => {
                const result = await this.library.createItem(input);
                if (!result.ok) return {ok: false, message: result.message};
                this.notify("info", this.i18nFn()("saved", result.data.item.title));
                return {ok: true, message: result.data.item.title, itemId: result.data.item.id};
            },
            notify: this.notify,
            getBlockKramdown: async (blockId) => {
                const kd = await this.library.getItemKramdown({
                    id: "xlc-proxy", blockId, libraryDocId: "", itemType: "text", title: "", alias: "",
                    tags: [], category: "", summary: "", source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
                    url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
                });
                return kd.ok ? kd.data : null;
            },
            exportDocContent: async (docId) => {
                const result = await this.library.exportDocContent(docId);
                return result.ok ? result.data : null;
            },
            aiEnabled: () => this.state.ai.enabled,
            aiTidy: async (content) => {
                try {
                    return {ok: true as const, ...await this.ai.tidy(content)};
                } catch (err) {
                    return {ok: false as const, message: this.aiErrorText(err)};
                }
            },
            aiDraft: async (description) => {
                try {
                    return {ok: true as const, text: await this.ai.draft(description)};
                } catch (err) {
                    return {ok: false as const, message: this.aiErrorText(err)};
                }
            },
            findDuplicate: async (content) => {
                try {
                    const idx = await this.library.ensureIndex();
                    const {findDuplicateByContent} = await import("./model/dedupe");
                    return findDuplicateByContent(content, idx.entries);
                } catch {
                    return null; // 去重检查失败不阻断保存
                }
            },
        });
        // 协议命令面（稳定 ID；雷切等通过 app.plugins 获取本插件后调用）
        this.protocolCommands["xiaolv.common.open"] = async () => {
            this.openSearch();
            return {ok: true};
        };
        this.protocolCommands["xiaolv.common.saveSelection"] = async () => {
            await this.capture.saveSelection();
            return {ok: true};
        };
        this.protocolCommands["xiaolv.common.insert"] = async (payload) => {
            const itemId = (payload as {itemId?: string})?.itemId ?? "";
            return this.service.insert(itemId, {mode: (payload as {mode?: string})?.mode ?? "insert"});
        };
        this.protocolCommands["xiaolv.common.copy"] = async (payload) => {
            const itemId = (payload as {itemId?: string})?.itemId ?? "";
            return this.service.copy(itemId);
        };
        this.protocolCommands["xiaolv.common.openSource"] = async (payload) => {
            const itemId = (payload as {itemId?: string})?.itemId ?? "";
            return this.service.openSource(itemId);
        };
    }

    private i18nFn(): TFn {
        return (key: string, ...args: string[]) => {
            let text: string = (this.i18n as Record<string, string>)[key] ?? key;
            args.forEach((arg, i) => {
                text = text.replace(`%s`, arg); // 逐个替换首个占位（按顺序消费）
                void i;
            });
            return text;
        };
    }

    async onLayoutReady(): Promise<void> {
        // 后台预热索引：打开搜索时通常已就绪（零等待）；失败静默——打开时会重建并如实报错
        try {
            await this.library.ensureIndex();
        } catch {
            // 预热失败不打扰用户
        }
    }

    /** 拼音适配器装配：开关变化/启动时调用；切换后需 reindex 重建注解 */
    private applyPinyinAdapter(): void {
        setPinyinAdapter(this.state.search.pinyin ? createTinyPinyinAdapter() : createNoopPinyinAdapter());
    }

    private notify = (kind: "info" | "error", message: string): void => {
        showMessage(message, 4000, kind === "error" ? "error" : "info");
    };

    /** AI 错误 → 诚实文案（区分未启用/未配置/权限/超时/解析失败） */
    private aiErrorText(err: unknown): string {
        const t = this.i18nFn();
        if (err instanceof AiUnavailableError) {
            switch (err.reason) {
                case "disabled": return t("aiDisabled");
                case "not-configured": return t("aiNotConfigured");
                case "empty-response": return t("aiEmpty");
                case "timeout": return t("aiTimeout");
                case "content-not-allowed": return t("aiContentNotAllowed");
                default: return t("aiTransport");
            }
        }
        return t("kernelError", (err as Error)?.message ?? String(err));
    }

    /** 来源失效预检节流（30s 内至多一次批量 checkBlocksExist；打开来源仍实时校验兜底） */
    private lastHealthPrefetch = 0;

    /** 列表来源失效预检（批量一次 checkBlocksExist；不阻塞渲染，仅喂徽标） */
    private async prefetchSourceHealth(entries: Array<{sourceDocId?: string; sourceBlockId?: string}>): Promise<void> {
        const now = Date.now();
        if (now - this.lastHealthPrefetch < 30_000) return;
        this.lastHealthPrefetch = now;
        const ids = new Set<string>();
        for (const e of entries.slice(0, 100)) {
            if (e.sourceBlockId) ids.add(e.sourceBlockId);
            if (e.sourceDocId) ids.add(e.sourceDocId);
        }
        if (ids.size === 0) return;
        try {
            const map = parseExistingMap(await this.kernelClient.request("checkBlocksExist", {ids: Array.from(ids)}));
            this.missingSources = new Set(Object.entries(map).filter(([, ok]) => !ok).map(([id]) => id));
        } catch {
            // 预检失败不打扰用户：徽标缺席，打开来源时仍有实时校验兜底
        }
    }

    private persistSoon(): void {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            void this.saveData(STORAGE_KEYS.state, this.state);
        }, 400);
    }

    // ---- 命令与入口 ----

    private registerCommands(): void {
        const t = this.i18nFn();
        this.addCommand({
            langKey: "open",
            hotkey: "⌥⇧C",
            callback: () => this.openSearch(),
        });
        this.addCommand({
            langKey: "saveSelection",
            hotkey: "⌥⇧S",
            callback: () => void this.capture.saveSelection(),
        });
        this.addCommand({
            langKey: "captureBlock",
            hotkey: "⌥⇧B",
            callback: () => void this.capture.captureCurrentBlock(),
        });
        this.addCommand({
            langKey: "captureDoc",
            callback: () => void this.capture.captureCurrentDoc(),
        });
        this.addCommand({
            langKey: "insertCmd",
            callback: () => this.openSearch(),
        });
        this.addCommand({
            langKey: "copyCmd",
            callback: () => this.openSearch(),
        });
        this.addCommand({
            langKey: "openSourceCmd",
            callback: () => this.openSearch(),
        });
        void t;
    }

    /**
     * 编辑器工具栏入口（官方 Plugin.updateProtyleToolbar 覆写；宿主渲染工具栏时回调）。
     * 桌面/移动通用：给编辑器工具栏加「常用」按钮。
     */
    public updateProtyleToolbar(toolbar: Array<string | IMenuItem>): Array<string | IMenuItem> {
        try {
            return [...toolbar, {
                name: "xiaolv-common-toolbar",
                icon: "iconXlcCommon",
                tip: this.i18nFn()("openSearch"),
                click: () => this.openSearch(),
            }];
        } catch {
            return toolbar;
        }
    }

    private registerEntries(): void {        try {
            this.addTopBar({
                icon: "iconXlcCommon",
                title: this.i18nFn()("openSearch"),
                callback: () => this.openSearch(),
                position: "right",
            });
        } catch {
            // 旧宿主无此 API：命令面板仍可用
        }
        try {
            // 移动端编辑器工具栏入口（桌面端该调用无害；失败静默走命令）
            this.addToolbarItem?.({
                name: "xiaolv-common-open",
                icon: "iconXlcCommon",
                title: this.i18nFn()("openSearch"),
                callback: () => this.openSearch(),
            } as never);
        } catch {
            // 移动端工具栏 API 缺失：降级为命令触发
        }
        try {
            // 文档面包屑入口（官方 addBreadcrumbButton；callback 带该页签 protyle）：
            // 插入目标 = 当前活动编辑器，从面包屑点入时通常即该文档
            this.addBreadcrumbButton({
                id: "xiaolv-common-breadcrumb",
                icon: "iconXlcCommon",
                title: this.i18nFn()("openSearch"),
                callback: () => this.openSearch(),
            });
        } catch {
            // 旧宿主无此 API：顶栏/命令入口仍可用
        }
        try {
            // 编辑器右键菜单（官方 eventBus open-menu-content；plugin-sample 同款用法）：
            // 右键即「插入常用条目… / 保存为常用条目 / 捕获当前块」——最自然的捕获与调用路径
            this.menuHandler = (event) => {
                const {menu} = event.detail;
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("insertMenu"),
                    click: () => this.openSearch(),
                });
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("saveSelection"),
                    click: () => void this.capture.saveSelection(),
                });
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("captureBlock"),
                    click: () => void this.capture.captureCurrentBlock(),
                });
            };
            this.eventBus.on("open-menu-content", this.menuHandler);
        } catch {
            // 事件契约变化时降级：右键入口缺席，其余入口仍可用
        }
    }

    // ---- 搜索界面 ----

    private searchContext(): SearchContext {
        const sort = this.state.sort;
        return {
            favorites: new Set(this.state.favorites),
            recents: new Map(this.state.recents.map((r) => [r.id, r.usedAt])),
            // 手动/置顶 = 收藏序（收藏顺序即置顶顺序）
            manualOrder: sort === "manual" ? new Map(this.state.favorites.map((id, i) => [id, i])) : undefined,
            sort,
            now: Date.now(),
        };
    }

    /** 预览文本的有界可丢弃缓存（插入/复制仍现场取正文，不受缓存影响） */
    private previewCache = new LruCache<string>(PREVIEW_CACHE_CAPACITY);

    openSearch(): void {
        if (!this.config) {
            this.openSetup();
            return;
        }
        this.searchDialog?.destroy();
        this.searchDialog = new CommonSearchDialog({
            t: this.i18nFn(),
            search: async (query) => {
                const loading = !this.library.getIndex();
                // SWR：索引超过 5 分钟透明重建（重建期间弹窗状态行显示「正在构建索引…」）
                const idx = await this.library.ensureIndex(5 * 60_000);
                const {searchEntries} = await import("./model/search");
                const results = searchEntries(idx.entries, query, this.searchContext());
                const entries = results.map((r) => r.entry);
                void this.prefetchSourceHealth(entries);
                // 全库加载失败时透传首条错误（诚实失败优先于「无条目」）
                const error = entries.length === 0 && idx.errors.length > 0 ? idx.errors[0] : undefined;
                return {entries, truncated: idx.truncated, total: idx.entries.length, loading, error};
            },
            searchDocs: async (k) => {
                const result = await this.library.searchDocs(k);
                return result.ok ? result.data : [];
            },
            insertToDoc: async (itemId, docId, hPath) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) {
                    this.notify("error", got.message);
                    return false;
                }
                const kd = await this.library.getItemKramdown(got.data);
                if (!kd.ok) {
                    this.notify("error", kd.message);
                    return false;
                }
                try {
                    const inserted = await this.library.appendToDoc(kd.data, docId);
                    if (inserted) this.notify("info", this.i18nFn()("insertToDocDone", hPath || docId));
                    return inserted;
                } catch (err) {
                    this.notify("error", (err as Error).message);
                    return false;
                }
            },
            duplicateItem: async (itemId) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) return;
                const kd = await this.library.getItemKramdown(got.data);
                if (!kd.ok) {
                    this.notify("error", kd.message);
                    return;
                }
                const src = got.data;
                const created = await this.library.createItem({
                    itemType: src.itemType,
                    markdown: kd.data,
                    title: src.title ? `${src.title} 副本` : undefined,
                    alias: src.alias || undefined,
                    tags: src.tags,
                    category: src.category || undefined,
                    url: src.url || undefined,
                    targetBlockId: src.targetBlockId || undefined,
                    source: {...src.source},
                });
                if (created.ok) {
                    this.notify("info", this.i18nFn()("duplicated", created.data.item.title));
                } else {
                    this.notify("error", created.message);
                }
            },
            saveTransformed: async (itemId, kind, text) => {
                const trimmed = (text ?? "").trim();
                if (!trimmed) return;
                const got = await this.library.getItem(itemId);
                if (!got.ok) {
                    this.notify("error", got.message);
                    return;
                }
                const created = await this.library.createItem({
                    itemType: "markdown",
                    markdown: trimmed,
                    title: `${got.data.title} · ${this.i18nFn()(`tf.${kind}`)}`,
                    tags: got.data.tags,
                    category: got.data.category || undefined,
                    source: {sourceDocId: got.data.libraryDocId, sourceBlockId: got.data.blockId, sourceType: "external"},
                });
                if (created.ok) {
                    this.notify("info", this.i18nFn()("saved", created.data.item.title));
                } else {
                    this.notify("error", created.message);
                }
            },
            openSetup: () => (this.config ? this.openSettings() : this.openSetup()),
            providerSearch: async (query) => {
                const rows = [];
                for (const provider of this.registry.listExecutable()) {
                    if (!provider.runtime?.search) continue;
                    try {
                        // 3s 超时保护：挂起的提供方不得卡住弹窗
                        const hits = await Promise.race([
                            provider.runtime.search(query),
                            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("provider timeout")), 3000)),
                        ]);
                        for (const hit of hits ?? []) {
                            rows.push({
                                providerId: provider.record.pluginId,
                                providerName: provider.record.displayName,
                                title: String(hit?.title ?? ""),
                                payload: String(hit?.payload ?? ""),
                            });
                        }
                    } catch (err) {
                        // 提供方失败不阻断主搜索；回执如实提示
                        this.notify("error", this.i18nFn()("providerUnavailable", provider.record.displayName) + ` (${(err as Error).message})`);
                    }
                }
                return buildProviderRows(rows);
            },
            insertProviderPayload: async (payload) => {
                const trimmed = (payload ?? "").trim();
                if (!trimmed) return false;
                if (this.host.hasActiveEditor()) {
                    const inserted = this.host.insertMarkdown(trimmed);
                    if (inserted) this.notify("info", this.i18nFn()("inserted", "provider"));
                    return inserted;
                }
                const copied = await this.host.writeClipboard(trimmed);
                this.notify("info", this.i18nFn()("insertNoEditor"));
                return copied;
            },
            copyProviderPayload: async (payload) => {
                return this.host.writeClipboard((payload ?? "").trim());
            },
            getTags: async () => {
                const {collectTags} = await import("./model/search");
                const idx = await this.library.ensureIndex();
                return collectTags(idx.entries);
            },
            preview: async (itemId) => {
                const cached = this.previewCache.get(itemId);
                if (cached !== undefined) return cached;
                const got = await this.library.getItem(itemId);
                if (!got.ok) return "";
                const kd = await this.library.getItemKramdown(got.data);
                const text = kd.ok ? kd.data : "";
                if (text) this.previewCache.set(itemId, text);
                return text;
            },
            getSort: () => this.state.sort,
            cycleSort: () => {
                const order = ["manual", "recent", "title"] as const;
                const idx = order.indexOf(this.state.sort);
                this.state.sort = order[(idx + 1) % order.length];
                this.persistSoon();
            },
            runAction: async (itemId, mode) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) {
                    this.notify("error", got.message);
                    return {ok: false, message: got.message};
                }
                const receipt = await this.executor.run(got.data, mode);
                const msg = receipt.ok
                    ? this.receiptText(receipt.message, got.data.title, receipt.pendingVerification)
                    : this.i18nFn()("kernelError", receipt.message);
                this.notify(receipt.ok ? "info" : "error", msg);
                return {ok: receipt.ok, message: msg};
            },
            openSource: async (itemId) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) {
                    this.notify("error", got.message);
                    return {ok: false, message: got.message};
                }
                const receipt = await this.executor.openSource(got.data);
                if (!receipt.ok) {
                    const msg = receipt.message === "source-missing"
                        ? this.i18nFn()("sourceGone")
                        : receipt.message === "asset-missing"
                            ? this.i18nFn()("assetMissing")
                            : this.i18nFn()("kernelError", receipt.message);
                    this.notify("error", msg);
                    return {ok: false, message: msg};
                }
                this.notify("info", this.i18nFn()("sourceOpened"));
                return {ok: true, message: "opened"};
            },
            insertRaw: async (markdown) => {
                const trimmed = (markdown ?? "").trim();
                if (!trimmed) return false;
                if (this.host.hasActiveEditor()) {
                    const inserted = this.host.insertMarkdown(trimmed);
                    this.notify("info", this.i18nFn()("aiOriginalPreserved"));
                    return inserted;
                }
                const copied = await this.host.writeClipboard(trimmed);
                this.notify("info", this.i18nFn()("insertNoEditor"));
                return copied;
            },
            aiEnabled: () => this.state.ai.enabled,
            aiSemantic: async (desc) => {
                try {
                    const idx = await this.library.ensureIndex();
                    const meta: SearchMetaEntry[] = idx.entries.map((e) => ({
                        id: e.id,
                        title: e.title,
                        alias: e.alias,
                        tags: e.tags,
                        category: e.category,
                        summary: e.summary,
                        itemType: e.itemType,
                    }));
                    const picked = await this.ai.semanticPick(desc, meta);
                    const byId = new Map(idx.entries.map((e) => [e.id, e]));
                    return {ok: true as const, entries: picked.map((p) => byId.get(p.id)).filter((e): e is NonNullable<typeof e> => !!e)};
                } catch (err) {
                    return {ok: false as const, message: this.aiErrorText(err)};
                }
            },
            aiTransform: async (itemId, kind: TransformKind) => {
                try {
                    const got = await this.library.getItem(itemId);
                    if (!got.ok) return {ok: false as const, message: got.message};
                    const kd = await this.library.getItemKramdown(got.data);
                    if (!kd.ok) return {ok: false as const, message: kd.message};
                    return {ok: true as const, text: await this.ai.transform(kind, kd.data)};
                } catch (err) {
                    return {ok: false as const, message: this.aiErrorText(err)};
                }
            },
            isSourceMissing: (entry) => {
                const block = entry.sourceBlockId;
                const doc = entry.sourceDocId;
                return (!!block && this.missingSources.has(block)) || (!!doc && this.missingSources.has(doc) && !entry.sourceBlockId);
            },
            editItem: async (itemId) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) return;
                this.openEditDialog(got.data);
            },
            deleteItem: async (itemId) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) return;
                confirmDelete(this.i18nFn(), got.data.title, async () => {
                    const removed = await this.library.removeItem(itemId);
                    if (removed.ok) {
                        this.previewCache.clear();
                        this.state.favorites = this.state.favorites.filter((id) => id !== itemId);
                        this.state.recents = this.state.recents.filter((r) => r.id !== itemId);
                        this.persistSoon();
                        this.library.reindex().then((idx) => {
                            this.notify("info", this.i18nFn()("deleted", got.data.title));
                            void idx;
                        });
                    } else {
                        this.notify("error", removed.message);
                    }
                });
            },
            toggleFavorite: (itemId) => this.service.toggleFavorite(itemId),
            isFavorite: (itemId) => this.state.favorites.includes(itemId),
            close: () => {
                this.searchDialog = null;
            },
            isMobile: () => this.host.isMobile(),
        }, this.searchContext());
        this.searchDialog.open();
    }

    private receiptText(code: string, title: string, pending: string[]): string {
        const t = this.i18nFn();
        if (pending.includes("mobile-insert-unverified")) return t("insertPendingMobile");
        if (code === "no-editor-copied") return t("insertNoEditor");
        if (code === "copied") return t("copied", title);
        if (code === "inserted") return t("inserted", title);
        if (pending.includes("bitmap-clipboard-unverified")) return t("copiedRichPending");
        return code;
    }

    // ---- 编辑 ----

    private async openEditDialog(item: CommonItem): Promise<void> {
        const t = this.i18nFn();
        const kd = await this.library.getItemKramdown(item);
        const initialKramdown = kd.ok ? kd.data : "";
        const dialog = new Dialog({
            title: t("edit"),
            content: "",
            width: "min(520px, 92vw)",
            height: "auto",
        });
        const body = dialog.element.querySelector(".b3-dialog__content");
        if (!body) return;
        body.innerHTML = "";
        const form = document.createElement("div");
        form.className = "xlc-form";
        const mkField = (label: string, value: string): HTMLInputElement => {
            const wrap = document.createElement("label");
            wrap.className = "xlc-form-field";
            const cap = document.createElement("span");
            cap.className = "xlc-form-label";
            cap.textContent = label;
            wrap.appendChild(cap);
            const input = document.createElement("input");
            input.className = "b3-text-field";
            input.value = value;
            wrap.appendChild(input);
            form.appendChild(wrap);
            return input;
        };
        const titleEl = mkField(t("title"), item.title);
        const aliasEl = mkField(t("alias"), item.alias);
        const tagsEl = mkField(t("tags"), item.tags.join(","));
        const categoryEl = mkField(t("category"), item.category);
        // 内容编辑（kramdown；保存走 updateBlock，保留类型语义由内容本身决定）
        const contentWrap = document.createElement("label");
        contentWrap.className = "xlc-form-field";
        const contentCap = document.createElement("span");
        contentCap.className = "xlc-form-label";
        contentCap.textContent = t("editContentLabel");
        contentWrap.appendChild(contentCap);
        const contentEl = document.createElement("textarea");
        contentEl.className = "b3-text-field";
        contentEl.rows = 8;
        contentEl.value = initialKramdown;
        contentWrap.appendChild(contentEl);
        form.appendChild(contentWrap);
        // 来源状态与重新指定
        const srcRow = document.createElement("div");
        srcRow.className = "xlc-form-hint";
        srcRow.textContent = item.source.sourceDocId
            ? `src: ${item.source.sourceDocId}${item.source.sourceBlockId ? ` / ${item.source.sourceBlockId}` : ""}`
            : t("sourceMissing");
        const relinkBtn = document.createElement("button");
        relinkBtn.className = "b3-button b3-button--text xlc-form-ai";
        relinkBtn.textContent = t("relinkCurrent");
        relinkBtn.addEventListener("click", () => {
            const docId = this.host.currentDocId();
            if (!docId) {
                this.notify("error", t("relinkNoDoc"));
                return;
            }
            void this.library.relinkSource(item.id, {sourceDocId: docId}).then((result) => {
                if (result.ok) {
                    this.previewCache.clear();
                    this.notify("info", t("relinkDone"));
                    srcRow.textContent = `src: ${docId}`;
                } else {
                    this.notify("error", result.message);
                }
            });
        });
        srcRow.appendChild(relinkBtn);
        if (item.source.sourceDocId || item.source.sourceBlockId) {
            const clearBtn = document.createElement("button");
            clearBtn.className = "b3-button b3-button--text xlc-form-ai";
            clearBtn.textContent = t("clearSource");
            clearBtn.addEventListener("click", () => {
                void this.library.clearSource(item.id).then((result) => {
                    if (result.ok) {
                        this.previewCache.clear();
                        this.notify("info", t("clearSourceDone"));
                        srcRow.textContent = t("sourceMissing");
                    } else {
                        this.notify("error", result.message);
                    }
                });
            });
            srcRow.appendChild(clearBtn);
        }
        form.appendChild(srcRow);
        const actions = document.createElement("div");
        actions.className = "xlc-form-actions";
        const cancel = document.createElement("button");
        cancel.className = "b3-button b3-button--cancel";
        cancel.textContent = t("cancel");
        cancel.addEventListener("click", () => dialog.destroy());
        const save = document.createElement("button");
        save.className = "b3-button b3-button--text";
        save.textContent = t("save");
        save.addEventListener("click", () => {
            void this.library.updateItem(item.id, {
                title: titleEl.value,
                alias: aliasEl.value,
                tags: tagsEl.value.split(/[,,]/).map((s) => s.trim()).filter(Boolean),
                category: categoryEl.value,
                markdown: contentEl.value !== initialKramdown ? contentEl.value : undefined,
            }).then((result) => {
                if (result.ok) {
                    this.previewCache.clear();
                    this.notify("info", t("updated", result.data.item.title));
                    dialog.destroy();
                } else {
                    this.notify("error", result.message);
                }
            });
        });
        actions.appendChild(cancel);
        actions.appendChild(save);
        form.appendChild(actions);
        body.appendChild(form);
    }

    // ---- 首次引导 / 设置 ----

    /** 首次引导（仅库选择；完整设置见 openSettings） */
    openSetup(): void {
        const t = this.i18nFn();
        const dialog = new Dialog({
            title: t("setupTitle"),
            content: "",
            width: "min(520px, 92vw)",
            height: "auto",
        });
        const body = dialog.element.querySelector(".b3-dialog__content");
        if (!body) return;
        body.innerHTML = "";
        const root = document.createElement("div");
        root.className = "xlc-form";

        const hint = document.createElement("p");
        hint.className = "xlc-form-hint";
        hint.textContent = t("setupHint");
        root.appendChild(hint);
        this.buildLibraryPickerSection(root, () => dialog.destroy());
        body.appendChild(root);
    }

    /** 完整设置：库管理（含更改库）+ AI + 搜索 + 数据 */
    openSettings(): void {
        const t = this.i18nFn();
        const dialog = new Dialog({
            title: t("openSettings"),
            content: "",
            width: "min(560px, 92vw)",
            height: "auto",
        });
        const body = dialog.element.querySelector(".b3-dialog__content");
        if (!body) return;
        body.innerHTML = "";
        const root = document.createElement("div");
        root.className = "xlc-form";

        // 库管理：状态行 + 「更改内容库」展开选择器
        const libSec = document.createElement("div");
        libSec.className = "xlc-form-field";
        const libLabel = document.createElement("span");
        libLabel.className = "xlc-form-label";
        libLabel.textContent = t("librarySection");
        libSec.appendChild(libLabel);
        const libStatus = document.createElement("div");
        libStatus.className = "xlc-form-hint";
        const cfg = this.config;
        libStatus.textContent = cfg
            ? (cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} · ${cfg.containerDocIds.length} doc(s)`)
            : t("libraryNone");
        libSec.appendChild(libStatus);
        const changeBtn = document.createElement("button");
        changeBtn.className = "b3-button";
        changeBtn.textContent = t("openSettingsChangeLib");
        const pickerHost = document.createElement("div");
        pickerHost.style.display = "none";
        changeBtn.addEventListener("click", () => {
            const show = pickerHost.style.display === "none";
            pickerHost.style.display = show ? "" : "none";
            if (show && pickerHost.childElementCount === 0) {
                this.buildLibraryPickerSection(pickerHost, () => dialog.destroy());
            }
        });
        libSec.appendChild(changeBtn);
        libSec.appendChild(pickerHost);
        root.appendChild(libSec);

        this.buildAiSection(root);
        this.buildSearchSection(root);
        this.buildDataSection(root);
        body.appendChild(root);
    }

    /** 库选择器（首跑引导与「更改库」共用；onConfigured 在配置落地后回调） */
    private buildLibraryPickerSection(root: HTMLElement, onConfigured: () => void): void {
        const t = this.i18nFn();

        // 模式选择
        const modeWrap = document.createElement("div");
        modeWrap.className = "xlc-form-field";
        const modeLabel = document.createElement("span");
        modeLabel.className = "xlc-form-label";
        modeLabel.textContent = t("setupTitle");
        modeWrap.appendChild(modeLabel);
        const modeSelect = document.createElement("select");
        modeSelect.className = "b3-select";
        const modes: Array<{v: "doc" | "tree" | "notebook"; label: string}> = [
            {v: "doc", label: t("setupPickDoc")},
            {v: "tree", label: t("setupPickDoc") + " (+子文档)"},
            {v: "notebook", label: t("setupNotebook")},
        ];
        for (const m of modes) {
            const opt = document.createElement("option");
            opt.value = m.v;
            opt.textContent = m.label;
            modeSelect.appendChild(opt);
        }
        modeWrap.appendChild(modeSelect);
        root.appendChild(modeWrap);

        // 笔记本下拉
        const nbWrap = document.createElement("div");
        nbWrap.className = "xlc-form-field";
        const nbLabel = document.createElement("span");
        nbLabel.className = "xlc-form-label";
        nbLabel.textContent = t("setupNotebook");
        nbWrap.appendChild(nbLabel);
        const nbSelect = document.createElement("select");
        nbSelect.className = "b3-select";
        nbWrap.appendChild(nbSelect);
        root.appendChild(nbWrap);
        void this.library.listNotebooks().then((result) => {
            if (!result.ok) {
                this.notify("error", t("kernelError", result.message));
                return;
            }
            for (const nb of result.data) {
                const opt = document.createElement("option");
                opt.value = nb.id;
                opt.textContent = nb.name;
                nbSelect.appendChild(opt);
            }
        });

        // 新建文档名
        const nameWrap = document.createElement("div");
        nameWrap.className = "xlc-form-field";
        const nameLabel = document.createElement("span");
        nameLabel.className = "xlc-form-label";
        nameLabel.textContent = t("setupNewDoc");
        nameWrap.appendChild(nameLabel);
        const nameInput = document.createElement("input");
        nameInput.className = "b3-text-field";
        nameInput.value = t("setupNewDocName");
        nameWrap.appendChild(nameInput);
        root.appendChild(nameWrap);

        const actions = document.createElement("div");
        actions.className = "xlc-form-actions";
        const createBtn = document.createElement("button");
        createBtn.className = "b3-button b3-button--text";
        createBtn.textContent = t("setupNewDoc");
        createBtn.addEventListener("click", () => {
            const notebookId = nbSelect.value;
            const title = nameInput.value.trim();
            if (!notebookId || !title) {
                this.notify("error", t("invalidItem"));
                return;
            }
            // 创建前明确确认（不静默写入）
            confirm("⚠️ " + t("setupTitle"), t("setupConfirmCreate", title), () => {
                void this.library.createLibraryDoc(notebookId, title).then((result) => {
                    if (!result.ok) {
                        this.notify("error", t("kernelError", result.message));
                        return;
                    }
                    this.applyConfig({
                        configVersion: CONFIG_VERSION,
                        mode: "doc",
                        notebookIds: [],
                        containerDocIds: [result.data.docId],
                        createdDocIds: [result.data.docId],
                        configuredAt: Date.now(),
                    });
                    this.notify("info", t("libDocCreated", title));
                    onConfigured();
                });
            });
        });
        // doc/tree 模式：文档选择器（searchDocs 关键词搜索 → 点选使用）
        const pickerWrap = document.createElement("div");
        pickerWrap.className = "xlc-form-field";
        const pickerInput = document.createElement("input");
        pickerInput.className = "b3-text-field";
        pickerInput.placeholder = t("docPicker");
        pickerWrap.appendChild(pickerInput);
        const pickerList = document.createElement("div");
        pickerList.className = "xlc-doclist";
        pickerWrap.appendChild(pickerList);
        root.appendChild(pickerWrap);
        let pickedDoc: {id: string; hPath: string} | null = null;
        let pickerSeq = 0;
        pickerInput.addEventListener("input", () => {
            const seq = ++pickerSeq;
            const k = pickerInput.value.trim();
            pickerList.innerHTML = "";
            pickedDoc = null;
            if (!k) return;
            void this.library.searchDocs(k).then((result) => {
                if (seq !== pickerSeq) return;
                if (!result.ok || result.data.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "xlc-doclist-empty";
                    empty.textContent = result.ok ? t("docPickerEmpty") : t("kernelError", result.message);
                    pickerList.appendChild(empty);
                    return;
                }
                for (const hit of result.data.slice(0, 8)) {
                    const item = document.createElement("button");
                    item.type = "button";
                    item.className = "xlc-doclist-item";
                    item.textContent = hit.hPath || hit.name || hit.id;
                    item.addEventListener("click", () => {
                        pickedDoc = {id: hit.id, hPath: hit.hPath};
                        pickerList.querySelectorAll(".xlc-doclist-item").forEach((el) => el.classList.remove("xlc-doclist-item--on"));
                        item.classList.add("xlc-doclist-item--on");
                    });
                    pickerList.appendChild(item);
                }
            });
        });
        const useNotebookBtn = document.createElement("button");
        useNotebookBtn.className = "b3-button b3-button--text";
        useNotebookBtn.textContent = t("confirm");
        useNotebookBtn.addEventListener("click", () => {
            const mode = modeSelect.value as LibraryConfig["mode"];
            if (mode === "notebook") {
                const notebookId = nbSelect.value;
                if (!notebookId) {
                    this.notify("error", t("invalidItem"));
                    return;
                }
                this.applyConfig({
                    configVersion: CONFIG_VERSION,
                    mode: "notebook",
                    notebookIds: [notebookId],
                    containerDocIds: [],
                    createdDocIds: [],
                    configuredAt: Date.now(),
                });
                onConfigured();
                return;
            }
            if (!pickedDoc) {
                this.notify("error", t("docPickerEmpty"));
                return;
            }
            this.applyConfig({
                configVersion: CONFIG_VERSION,
                mode,
                notebookIds: [],
                containerDocIds: [pickedDoc.id],
                createdDocIds: [],
                configuredAt: Date.now(),
            });
            onConfigured();
        });
        actions.appendChild(createBtn);
        actions.appendChild(useNotebookBtn);
        root.appendChild(actions);
    }

    private buildAiSection(root: HTMLElement): void {
        const t = this.i18nFn();
        // AI 设置区（默认关；开启即视为同意元数据出域；正文出域单独开关）
        const aiSec = document.createElement("div");
        aiSec.className = "xlc-form-field";
        const aiLabel = document.createElement("span");
        aiLabel.className = "xlc-form-label";
        aiLabel.textContent = t("aiSection");
        aiSec.appendChild(aiLabel);
        const aiRow = (key: "enabled" | "shareContent", text: string): HTMLInputElement => {
            const row = document.createElement("label");
            row.className = "xlc-setting-row";
            const box = document.createElement("input");
            box.type = "checkbox";
            box.checked = this.state.ai[key];
            box.addEventListener("change", () => {
                this.state.ai[key] = box.checked;
                if (key === "enabled" && !box.checked) this.state.ai.shareContent = false;
                this.ai.updateSettings(this.state.ai);
                this.persistSoon();
            });
            const cap = document.createElement("span");
            cap.textContent = text;
            row.appendChild(box);
            row.appendChild(cap);
            aiSec.appendChild(row);
            return box;
        };
        const aiEnabledBox = aiRow("enabled", t("aiEnabled"));
        const aiShareBox = aiRow("shareContent", t("aiShareContent"));
        aiEnabledBox.addEventListener("change", () => {
            if (!aiEnabledBox.checked) aiShareBox.checked = false;
        });
        root.appendChild(aiSec);
    }

    private buildSearchSection(root: HTMLElement): void {
        const t = this.i18nFn();
        // 搜索设置区（拼音：本地注解，无出域）
        const searchSec = document.createElement("div");
        searchSec.className = "xlc-form-field";
        const searchLabel = document.createElement("span");
        searchLabel.className = "xlc-form-label";
        searchLabel.textContent = t("searchSection");
        searchSec.appendChild(searchLabel);
        const pinyinRow = document.createElement("label");
        pinyinRow.className = "xlc-setting-row";
        const pinyinBox = document.createElement("input");
        pinyinBox.type = "checkbox";
        pinyinBox.checked = this.state.search.pinyin;
        pinyinBox.addEventListener("change", () => {
            this.state.search.pinyin = pinyinBox.checked;
            this.applyPinyinAdapter();
            this.persistSoon();
            void this.library.reindex().then((idx) => {
                this.notify("info", t("reindexDone", String(idx.entries.length)));
            });
        });
        const pinyinCap = document.createElement("span");
        pinyinCap.textContent = t("pinyinToggle");
        pinyinRow.appendChild(pinyinBox);
        pinyinRow.appendChild(pinyinCap);
        searchSec.appendChild(pinyinRow);
        // 占位符开关
        const phRow = document.createElement("label");
        phRow.className = "xlc-setting-row";
        const phBox = document.createElement("input");
        phBox.type = "checkbox";
        phBox.checked = this.state.search.placeholders;
        phBox.addEventListener("change", () => {
            this.state.search.placeholders = phBox.checked;
            this.persistSoon();
        });
        const phCap = document.createElement("span");
        phCap.textContent = t("placeholdersToggle");
        phRow.appendChild(phBox);
        phRow.appendChild(phCap);
        searchSec.appendChild(phRow);
        const phHint = document.createElement("span");
        phHint.className = "xlc-form-hint";
        phHint.textContent = t("placeholdersHint");
        searchSec.appendChild(phHint);
        root.appendChild(searchSec);
    }

    private buildDataSection(root: HTMLElement): void {
        const t = this.i18nFn();
        // 数据区：当前库 + 重建索引 + 导出/导入
        const dataSec = document.createElement("div");
        dataSec.className = "xlc-form-field";
        const dataLabel = document.createElement("span");
        dataLabel.className = "xlc-form-label";
        dataLabel.textContent = t("dataSection");
        dataSec.appendChild(dataLabel);
        const libRow = document.createElement("div");
        libRow.className = "xlc-form-hint";
        const cfg = this.config;
        libRow.textContent = `${t("librarySection")}：${cfg
            ? (cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} · ${cfg.containerDocIds.length}`)
            : t("libraryNone")}`;
        dataSec.appendChild(libRow);
        const dataBtns = document.createElement("div");
        dataBtns.style.display = "flex";
        dataBtns.style.gap = "8px";
        dataBtns.style.flexWrap = "wrap";
        const mkBtn = (label: string, onClick: () => void): HTMLButtonElement => {
            const btn = document.createElement("button");
            btn.className = "b3-button";
            btn.textContent = label;
            btn.addEventListener("click", onClick);
            dataBtns.appendChild(btn);
            return btn;
        };
        mkBtn(t("reindexBtn"), () => {
            this.library.reindex().then((idx) => {
                this.notify("info", idx.truncated
                    ? t("reindexTruncated", String(LIMITS.maxItems))
                    : t("reindexDone", String(idx.entries.length)));
            });
        });
        mkBtn(t("clearRecents"), () => {
            confirm("⚠️ " + t("clearRecents"), t("clearRecentsConfirm"), () => {
                this.state.recents = [];
                this.persistSoon();
                this.notify("info", t("clearRecentsDone"));
            });
        });
        if (this.state.ai.enabled) {
            mkBtn("✦ " + t("tagAuditBtn"), () => void this.runTagAudit());
        }
        mkBtn(t("exportBtn"), () => {
            void this.exportBundle().then((json) => {
                const count = (JSON.parse(json) as {items: unknown[]}).items.length;
                const blob = new Blob([json], {type: "application/json"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `xiaolv-common-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                this.notify("info", t("exportDone", String(count)));
            });
        });
        mkBtn(t("exportMdBtn"), () => {
            void (async () => {
                const idx = await this.library.ensureIndex();
                const items: CommonItem[] = [];
                const kramdownById = new Map<string, string>();
                for (const item of idx.items.values()) {
                    const kd = await this.library.getItemKramdown(item);
                    if (kd.ok) {
                        items.push(item);
                        kramdownById.set(item.id, kd.data);
                    }
                }
                const result = await buildMarkdownExport(items, kramdownById, (assetPath) => this.fetchAssetBytes(assetPath));
                const zip = buildZip(result.entries);
                const blob = new Blob([zip as unknown as BlobPart], {type: "application/zip"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `xiaolv-common-md-${new Date().toISOString().slice(0, 10)}.zip`;
                a.click();
                URL.revokeObjectURL(a.href);
                this.notify("info", t("exportMdDone", String(result.itemCount), String(result.assetCount), String(result.skippedAssets.length)));
            })();
        });
        const importBtn = mkBtn(t("importBtn"), () => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".json,application/json";
            fileInput.addEventListener("change", () => {
                const file = fileInput.files?.[0];
                if (!file) return;
                if (file.size > LIMITS.maxImportBytes) {
                    this.notify("error", t("importFailed", "file too large"));
                    return;
                }
                void file.text().then((text) => {
                    const validation = validateImport(text);
                    if (!validation.ok || !validation.parsed) {
                        this.notify("error", t("importFailed", validation.reason ?? "unknown"));
                        return;
                    }
                    this.openImportPolicyDialog(validation.parsed, validation.issues, text);
                });
            });
            fileInput.click();
        });
        void importBtn;
        dataSec.appendChild(dataBtns);
        root.appendChild(dataSec);
    }

    /** 资源字节获取：/api/file/getFile 为二进制端点，fetchSyncPost 信封不适用，
     *  使用同源 fetch（思源前端鉴权走 cookie，随同源请求自动携带）。失败返回 null。 */
    private async fetchAssetBytes(assetPath: string): Promise<Uint8Array | null> {
        if (!/^assets\/[\w\-. @\u4e00-\u9fff]+$/.test(assetPath)) return null;
        try {
            const res = await fetch(`/api/file/getFile?path=${encodeURIComponent(assetPath)}`);
            if (!res.ok) return null;
            return new Uint8Array(await res.arrayBuffer());
        } catch {
            return null;
        }
    }

    /** AI 标签体检：仅标签清单出域；结果只展示，不自动修改任何条目 */
    private async runTagAudit(): Promise<void> {
        const t = this.i18nFn();
        const idx = await this.library.ensureIndex();
        const {collectTags} = await import("./model/search");
        const tags = collectTags(idx.entries);
        if (tags.length < 2) {
            this.notify("info", t("tagAuditTooFew"));
            return;
        }
        let suggestions;
        try {
            suggestions = await this.ai.tagAudit(tags);
        } catch (err) {
            this.notify("error", this.aiErrorText(err));
            return;
        }
        const dialog = new Dialog({
            title: t("tagAuditTitle"),
            content: "",
            width: "min(520px, 92vw)",
            height: "auto",
        });
        const body = dialog.element.querySelector(".b3-dialog__content");
        if (!body) return;
        body.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "xlc-form";
        if (suggestions.length === 0) {
            const empty = document.createElement("p");
            empty.className = "xlc-form-hint";
            empty.textContent = t("tagAuditEmpty");
            wrap.appendChild(empty);
        } else {
            for (const s of suggestions) {
                const row = document.createElement("div");
                row.className = "xlc-sugrow";
                const label = document.createElement("span");
                label.textContent = `✦ ${t(s.type === "merge" ? "tagAuditMerge" : "tagAuditRename")}：${s.tags.join(" + ")} → ${s.suggestion}${s.reason ? `（${s.reason}）` : ""}`;
                row.appendChild(label);
                wrap.appendChild(row);
            }
            const hint = document.createElement("span");
            hint.className = "xlc-form-hint";
            hint.textContent = t("aiOriginalPreserved");
            wrap.appendChild(hint);
        }
        const actions = document.createElement("div");
        actions.className = "xlc-form-actions";
        const close = document.createElement("button");
        close.className = "b3-button";
        close.textContent = t("close");
        close.addEventListener("click", () => dialog.destroy());
        actions.appendChild(close);
        wrap.appendChild(actions);
        body.appendChild(wrap);
    }

    /** 导入策略确认（导入前校验已过；策略三选 → importBundleText → 汇总回执） */
    private openImportPolicyDialog(
        parsed: {items: Array<{id: string; title: string}>; unknownTopFields?: unknown},
        issues: ImportIssue[],
        text: string,
    ): void {
        const t = this.i18nFn();
        const dialog = new Dialog({
            title: t("importPolicyTitle"),
            content: "",
            width: "min(440px, 92vw)",
            height: "auto",
        });
        const body = dialog.element.querySelector(".b3-dialog__content");
        if (!body) return;
        body.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "xlc-form";
        const preview = document.createElement("p");
        preview.className = "xlc-form-hint";
        preview.textContent = t("importPreview", String(parsed.items.length), String(issues.length));
        wrap.appendChild(preview);
        const run = (policy: ConflictPolicy): void => {
            dialog.destroy();
            void this.importBundleText(text, policy).then((receipt) => {
                this.notify(receipt.failed > 0 ? "error" : "info", t(
                    "importDone",
                    String(receipt.created),
                    String(receipt.skipped),
                    String(receipt.overwritten),
                    String(receipt.renamed),
                    String(receipt.failed),
                ));
            }).catch((err) => {
                this.notify("error", t("importFailed", (err as Error).message));
            });
        };
        const btns = document.createElement("div");
        btns.className = "xlc-form-actions";
        btns.style.flexDirection = "column";
        btns.style.alignItems = "stretch";
        for (const [policy, label] of [
            ["skip", t("importPolicySkip")],
            ["overwrite", t("importPolicyOverwrite")],
            ["rename", t("importPolicyRename")],
        ] as Array<[ConflictPolicy, string]>) {
            const btn = document.createElement("button");
            btn.className = "b3-button";
            btn.textContent = label;
            btn.addEventListener("click", () => run(policy));
            btns.appendChild(btn);
        }
        wrap.appendChild(btns);
        body.appendChild(wrap);
    }

    private applyConfig(config: LibraryConfig): void {
        this.config = config;
        this.library.setConfig(config);
        void this.saveData(STORAGE_KEYS.config, config);
        void this.library.reindex().then((idx) => {
            this.notify("info", idx.truncated
                ? this.i18nFn()("reindexTruncated", String(LIMITS.maxItems))
                : this.i18nFn()("reindexDone", String(idx.entries.length)));
        });
    }

    // ---- 导入导出 ----

    async exportBundle(): Promise<string> {
        const idx = await this.library.ensureIndex();
        const items: CommonItem[] = [];
        const kramdownById = new Map<string, string>();
        for (const item of idx.items.values()) {
            const kd = await this.library.getItemKramdown(item);
            if (kd.ok) {
                items.push(item);
                kramdownById.set(item.id, kd.data);
            }
        }
        return JSON.stringify(buildBundle(items, kramdownById, Date.now()), null, 2);
    }

    async importBundleText(jsonText: string, policy: ConflictPolicy): Promise<ImportReceipt> {
        const validation = validateImport(jsonText);
        if (!validation.ok || !validation.parsed) {
            throw new Error(validation.reason ?? "invalid");
        }
        const idx = await this.library.ensureIndex();
        const receipt: ImportReceipt = {total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: []};
        for (const incoming of validation.parsed.items) {
            receipt.total++;
            const decision = classifyConflict(incoming.id, idx.items.has(incoming.id), policy);
            try {
                if (decision.kind === "skip") {
                    receipt.skipped++;
                    receipt.lines.push({id: incoming.id, title: incoming.title, action: "skip", ok: true});
                    continue;
                }
                const targetId = decision.kind === "rename" ? decision.newId : incoming.id;
                const applied = await this.applyImportedItem(incoming, targetId);
                if (!applied) {
                    receipt.failed++;
                    continue;
                }
                if (decision.kind === "overwrite") receipt.overwritten++;
                else if (decision.kind === "rename") receipt.renamed++;
                else receipt.created++;
            } catch (err) {
                receipt.failed++;
                receipt.lines.push({id: incoming.id, title: incoming.title, action: decision.kind, ok: false, error: (err as Error).message});
            }
        }
        await this.library.reindex();
        return receipt;
    }

    /** 单条导入应用：正文写块 + 属性写回（含原逻辑 ID / 来源引用）。失败抛错由调用方计数。 */
    private async applyImportedItem(incoming: ExportedItem, logicalId: string | undefined): Promise<boolean> {
        const input: NewItemInput = {
            itemType: isKnownType(incoming.itemType) ? incoming.itemType : "text",
            markdown: incoming.kramdown,
            title: incoming.title || undefined,
            alias: incoming.alias || undefined,
            tags: incoming.tags,
            category: incoming.category || undefined,
            url: incoming.url || undefined,
            targetBlockId: incoming.targetBlockId || undefined,
            source: {
                sourceDocId: incoming.source.sourceDocId || "",
                sourceBlockId: incoming.source.sourceBlockId || "",
                sourceType: (incoming.source.sourceType as never) || "external",
            },
        };
        if (logicalId) input.logicalId = logicalId;
        const created = await this.library.createItem(input);
        return created.ok;
    }

    // ---- 协议能力（雷切等消费）----

    getCapabilities(): CapabilityDescriptor[] {
        return this.service.getCapabilities();
    }

    registerProvider(descriptor: ProviderDescriptor, runtime?: {search?(query: string): Promise<Array<{title: string; payload: string}>>}): void {
        const result = this.service.registerProvider(descriptor, runtime);
        this.notify(result.ok ? "info" : "error", result.ok
            ? this.i18nFn()("providerRegistered", descriptor.displayName)
            : (result.message ?? "rejected"));
    }

    onunload(): void {
        // 事件总线/监听全部随 dialog destroy 释放；侧车已节流持久化
        if (this.menuHandler) {
            try {
                this.eventBus.off("open-menu-content", this.menuHandler);
            } catch {
                // 宿主事件总线已销毁：忽略
            }
            this.menuHandler = null;
        }
        this.searchDialog?.destroy();
        if (this.saveTimer) clearTimeout(this.saveTimer);
        void this.saveData(STORAGE_KEYS.state, this.state);
    }

    uninstall(): Promise<void> {
        // 卸载不删用户库文档；侧车数据由宿主清理（data/storage/petal/）
        return Promise.resolve();
    }
}

/** 官方选区读取：纯文本 + 当前块 ID（仅依赖公开的 data-node-id，见 ADR 0003） */
function getSelectionInfo(): {text: string; blockId: string | null} {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return {text: "", blockId: null};
    const text = sel.toString();
    let node: Node | null = sel.anchorNode;
    while (node && node instanceof Element === false) node = node.parentNode;
    const el = node as Element | null;
    const block = el?.closest?.("[data-node-id]") as HTMLElement | null;
    return {text, blockId: block?.getAttribute("data-node-id") ?? null};
}

function isKnownType(v: string): v is NewItemInput["itemType"] {
    return ["text", "markdown", "url", "code", "image", "asset", "blockref", "structure"].includes(v);
}
