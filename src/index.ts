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
import {CommonItem, isItemType} from "./model/item";
import {ExportedItem, buildBundle, validateImport, ConflictPolicy, ImportReceipt} from "./model/transfer";
import {importBundle as importBundleCore} from "./service/importer";
import {parseMarkdownPack} from "./service/import-markdown";
import {LibraryConfig, CONFIG_VERSION, migrateState, normalizeLibraryConfig, normalizeState, PluginState} from "./model/storage";
import {SearchContext} from "./model/search";
import {LruCache, PREVIEW_CACHE_CAPACITY, PREVIEW_CACHE_TTL_MS} from "./model/lru";
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
import {CaptureDialog, confirmDelete, classifyLinkTarget} from "./ui/capture";
import {ICONS} from "./ui/icons";
import {openSetupDialog, openSettingsDialog, type SettingsUiContext} from "./ui/settings-dialog";
import {buildVariableBar} from "./ui/variable-form";
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
    private blockRefMenuHandler: ((event: {detail: {menu: {addItem: (item: {icon: string; label: string; click: () => void}) => void}; element?: Element}}) => void) | null = null;
    private linkMenuHandler: ((event: {detail: {menu: {addItem: (item: {icon: string; label: string; click: () => void}) => void}; element?: Element}}) => void) | null = null;
    private imageMenuHandler: ((event: {detail: {menu: {addItem: (item: {icon: string; label: string; click: () => void}) => void}; element?: Element}}) => void) | null = null;
    private docTreeMenuHandler: ((event: {detail: {menu: {addItem: (item: {icon: string; label: string; click: () => void}) => void}; elements?: Array<Element | null>; type?: string}}) => void) | null = null;
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
        this.executor = new ActionExecutor(this.library, this.host, this.notify, (item) => {
            this.service.touchRecent(item.id);
            this.recordUsage(item.id);
        }, {
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
            clipboard: async () => {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        return await navigator.clipboard.readText();
                    }
                } catch {
                    // 权限/平台限制：诚实降级为空串（占位符语义与无文档一致）
                }
                return "";
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
                    tags: [], category: "", summary: "", varCount: 0, source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
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
    /** 提供方失败通知记忆（每提供方每会话一次；成功即清除） */
    private providerFailureSeen = new Set<string>();

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
            langKey: "saveClipboard",
            callback: () => void this.capture.captureFromClipboard(),
        });
        this.addCommand({
            langKey: "quickCapture",
            hotkey: "⌥⇧V",
            callback: () => void this.capture.quickCaptureFromClipboard(),
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
            // 块引用右键：把被引用块存为 blockref 条目（官方 detail.element data-id）
            this.blockRefMenuHandler = (event) => {
                const {menu, element} = event.detail;
                const blockId = element?.getAttribute?.("data-id") ?? "";
                if (!blockId || !element) return;
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("captureBlockRefMenu"),
                    click: () => this.capture.captureBlockRef(blockId, element.textContent ?? ""),
                });
            };
            this.eventBus.on("open-menu-blockref", this.blockRefMenuHandler);
            // 链接右键：http(s)/assets 存为 URL/资源条目（其余协议诚实拒绝）
            this.linkMenuHandler = (event) => {
                const {menu, element} = event.detail;
                const href = element?.getAttribute?.("href") ?? "";
                if (!href || !element) return;
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("captureLinkMenu"),
                    click: () => this.capture.captureLink(href, element.textContent ?? ""),
                });
            };
            this.eventBus.on("open-menu-link", this.linkMenuHandler);
            // 图片右键：把图片存为图片条目（官方 detail.element = assetElement，src 即 assets/ 路径）
            this.imageMenuHandler = (event) => {
                const {menu, element} = event.detail;
                const src = element?.getAttribute?.("src") ?? "";
                const target = classifyLinkTarget(src.startsWith("assets/") ? src : "");
                if (!target) return;
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("captureImageMenu"),
                    click: () => this.capture.captureImage(target.value, element?.getAttribute?.("title") ?? ""),
                });
            };
            this.eventBus.on("open-menu-image", this.imageMenuHandler);
            // 文档树右键：把选中文档一键设为常用库文档（doc 模式；多选取前 64 个）
            this.docTreeMenuHandler = (event) => {
                const {menu, elements, type} = event.detail;
                if (type !== "items" && type !== "docs" && type !== undefined) return;
                const ids: string[] = [];
                for (const el of elements ?? []) {
                    const id = el?.getAttribute?.("data-node-id") ?? "";
                    if (id && ids.length < 64) ids.push(id);
                }
                if (ids.length === 0) return;
                // 插入定向入口：打开搜索弹窗（定向模式，Enter 插入到首个选中文档）
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("insertToDocMenu"),
                    click: () => {
                        void this.library.getDocPath(ids[0]).then((path) => {
                            this.openSearch({docId: ids[0], hPath: path});
                        });
                    },
                });
                menu.addItem({
                    icon: "iconXlcCommon",
                    label: this.i18nFn()("setAsLibraryMenu"),
                    click: () => {
                        confirm("⚠️ " + this.i18nFn()("setupTitle"), this.i18nFn()("setAsLibraryConfirm", String(ids.length)), () => {
                            this.applyConfig({
                                configVersion: CONFIG_VERSION,
                                mode: "doc",
                                notebookIds: [],
                                containerDocIds: ids,
                                createdDocIds: [],
                                configuredAt: Date.now(),
                            });
                            this.notify("info", this.i18nFn()("libDocCreated", `${ids.length} doc(s)`));
                        });
                    },
                });
            };
            this.eventBus.on("open-menu-doctree", this.docTreeMenuHandler);
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
            // 常用排序（F3）：使用计数（侧车，可重建）
            usage: new Map(Object.entries(this.state.usage).map(([id, u]) => [id, u.count])),
            // 手动/置顶 = 收藏序（收藏顺序即置顶顺序）
            manualOrder: sort === "manual" ? new Map(this.state.favorites.map((id, i) => [id, i])) : undefined,
            sort,
            now: Date.now(),
        };
    }

    /** 使用计数（F3）：插入/复制成功 +1；侧车上限由 normalize 兜底 */
    private recordUsage(itemId: string): void {
        if (!this.state.insert.recordUsage) return;
        const current = this.state.usage[itemId];
        this.state.usage[itemId] = {
            count: Math.min((current?.count ?? 0) + 1, 1_000_000),
            lastAt: Date.now(),
        };
        this.persistSoon();
    }

    /** 预览文本的有界可丢弃缓存（60s TTL：同步变更后预览最多陈旧一分钟；插入/复制仍现场取正文） */
    private previewCache = new LruCache<string>(PREVIEW_CACHE_CAPACITY, PREVIEW_CACHE_TTL_MS);

    /** 打开搜索弹窗；insertTarget 提供时进入定向插入模式（插入到指定文档） */
    openSearch(insertTarget?: {docId: string; hPath: string}): void {
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
            insertToDoc: async (itemId, docId, hPath, fills) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) {
                    this.notify("error", got.message);
                    return false;
                }
                const item = got.data;
                // blockref 条目：插引用语法（而非条目块自身的空 kramdown）
                let markdown: string;
                if (item.itemType === "blockref" && item.targetBlockId) {
                    markdown = `((${item.targetBlockId} '${(item.title || "ref").replace(/'/g, "\\'")}'))`;
                } else {
                    const kd = await this.library.getItemKramdown(item);
                    if (!kd.ok) {
                        this.notify("error", kd.message);
                        return false;
                    }
                    // 占位符语义与活动编辑器路径一致（R51/R67：定向插入同样渲染 {{xlc:…}} 与变量填充）
                    markdown = await this.executor.renderForInsert(kd.data, item, fills);
                }
                try {
                    const inserted = await this.library.appendToDoc(markdown, docId);
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
            saveTransformed: async (itemId, transformLabel, text) => {
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
                    title: `${got.data.title} · ${transformLabel}`,
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
                        // 成功一次即清除失败通知记忆（恢复后正常提示）
                        this.providerFailureSeen.delete(provider.record.pluginId);
                        for (const hit of hits ?? []) {
                            rows.push({
                                providerId: provider.record.pluginId,
                                providerName: provider.record.displayName,
                                title: String(hit?.title ?? ""),
                                payload: String(hit?.payload ?? ""),
                            });
                        }
                    } catch (err) {
                        // 提供方失败不阻断主搜索；通知每提供方每会话仅一次（防刷新通知轰炸），恢复成功后清记忆
                        if (!this.providerFailureSeen.has(provider.record.pluginId)) {
                            this.providerFailureSeen.add(provider.record.pluginId);
                            this.notify("error", this.i18nFn()("providerUnavailable", provider.record.displayName) + ` (${(err as Error).message})`);
                        }
                    }
                }
                return buildProviderRows(rows);
            },
            insertProviderPayload: async (payload, target) => {
                const trimmed = (payload ?? "").trim();
                if (!trimmed) return false;
                // 与库条目一致的占位符语义（R24 定案）：插入前渲染 {{xlc:…}}
                const rendered = (await this.executor.renderProviderOutput(trimmed)) ?? trimmed;
                // 定向模式（文档树入口）：appendBlock 到目标文档
                if (target?.docId) {
                    try {
                        const inserted = await this.library.appendToDoc(rendered, target.docId);
                        if (inserted) this.notify("info", this.i18nFn()("insertToDocDone", target.hPath || target.docId));
                        return inserted;
                    } catch (err) {
                        this.notify("error", (err as Error).message);
                        return false;
                    }
                }
                if (this.host.hasActiveEditor()) {
                    const inserted = this.host.insertMarkdown(rendered);
                    if (inserted) this.notify("info", this.i18nFn()("inserted", "provider"));
                    return inserted;
                }
                const copied = await this.host.writeClipboard(rendered);
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
            getCategories: async () => {
                const {collectCategories} = await import("./model/search");
                const idx = await this.library.ensureIndex();
                return collectCategories(idx.entries);
            },
            getFilters: () => ({
                type: this.state.uiPrefs.lastTypeFilter,
                tag: this.state.uiPrefs.lastTagFilter,
                category: this.state.uiPrefs.lastCategoryFilter,
            }),
            setFilters: (f) => {
                this.state.uiPrefs.lastTypeFilter = (f.type === "" || isItemType(f.type) ? f.type : "") as typeof this.state.uiPrefs.lastTypeFilter;
                this.state.uiPrefs.lastTagFilter = f.tag.slice(0, 64);
                this.state.uiPrefs.lastCategoryFilter = f.category.slice(0, 64);
                this.persistSoon();
            },
            getLastQuery: () => this.state.search.lastQuery,
            setLastQuery: (q) => {
                this.state.search.lastQuery = q.slice(0, 200);
                this.persistSoon();
            },
            preview: async (itemId) => {
                const cached = this.previewCache.get(itemId);
                if (cached !== undefined) return cached;
                const got = await this.library.getItem(itemId);
                if (!got.ok) return "";
                const kd = await this.library.getItemKramdown(got.data);
                // 片段引用展开后预览（F5）：预览/填充卡所见 = 插入所得；变量仍保留给填充卡
                const text = kd.ok ? await this.library.expandSnippetRefs(kd.data) : "";
                if (text) this.previewCache.set(itemId, text);
                return text;
            },
            getSort: () => this.state.sort,
            cycleSort: () => {
                // 手动/置顶 → 最近 → 常用（F3）→ 标题
                const order = ["manual", "recent", "frequent", "title"] as const;
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
            runActionWithFills: async (itemId, mode, fills) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) {
                    this.notify("error", got.message);
                    return {ok: false, message: got.message};
                }
                const receipt = await this.executor.run(got.data, mode, {fills});
                const msg = receipt.ok
                    ? this.receiptText(receipt.message, got.data.title, receipt.pendingVerification)
                    : this.i18nFn()("kernelError", receipt.message);
                this.notify(receipt.ok ? "info" : "error", msg);
                return {ok: receipt.ok, message: msg};
            },
            promptVariables: () => this.state.insert.promptVariables,
            getUsage: () => this.state.usage,
            newItem: () => this.capture.newManual(),
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
            copyText: async (text) => this.host.writeClipboard(text),
            aiEnabled: () => this.state.ai.enabled,
            aiSemantic: async (desc, filters) => {
                try {
                    const idx = await this.library.ensureIndex();
                    const {applyBasicFilters} = await import("./model/search");
                    // 语义找候选先按类型/标签/收藏范围过滤（与普通搜索的筛选语义一致）
                    const safeItemType = filters.itemType && isItemType(filters.itemType) ? filters.itemType : "";
                    const scoped = applyBasicFilters(idx.entries, {itemType: safeItemType, tag: filters.tag, scope: filters.scope}, this.searchContext());
                    const meta: SearchMetaEntry[] = scoped.map((e) => ({
                        id: e.id,
                        title: e.title,
                        alias: e.alias,
                        tags: e.tags,
                        category: e.category,
                        summary: e.summary,
                        itemType: e.itemType,
                    }));
                    const picked = await this.ai.semanticPick(desc, meta);
                    const entryMap = new Map(scoped.map((e) => [e.id, e]));
                    return {ok: true as const, entries: picked.map((p) => entryMap.get(p.id)).filter((e): e is NonNullable<typeof e> => !!e)};
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
            listCustomTransforms: () => this.state.ai.customTransforms.map((ct) => ({id: ct.id, name: ct.name})),
            aiTransformCustom: async (itemId, customId) => {
                try {
                    const ct = this.state.ai.customTransforms.find((c) => c.id === customId);
                    if (!ct) return {ok: false as const, message: "custom-transform-not-found"};
                    const got = await this.library.getItem(itemId);
                    if (!got.ok) return {ok: false as const, message: got.message};
                    const kd = await this.library.getItemKramdown(got.data);
                    if (!kd.ok) return {ok: false as const, message: kd.message};
                    return {ok: true as const, text: await this.ai.transformCustom(ct.prompt, kd.data)};
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
        this.searchDialog.insertTarget = insertTarget ? {docId: insertTarget.docId, hPath: insertTarget.hPath} : null;
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
        // 变量快捷插入条（F1 编辑侧：与捕获表单同款，点选在光标处插入）
        contentWrap.after(buildVariableBar(t, () => contentEl));
        // 来源状态与重新指定（文本单独 span：异步回填路径不得抹掉行内按钮）
        const srcRow = document.createElement("div");
        srcRow.className = "xlc-form-sourcerow";
        const srcText = document.createElement("span");
        srcText.textContent = item.source.sourceDocId
            ? `src: ${item.source.sourceDocId}${item.source.sourceBlockId ? ` / ${item.source.sourceBlockId}` : ""}`
            : t("sourceMissing");
        srcRow.appendChild(srcText);
        // 异步补全为可读路径（内核权威 hPath；失败保持 ID 显示）
        if (item.source.sourceDocId) {
            void this.library.getDocPath(item.source.sourceDocId).then((path) => {
                if (path) srcText.textContent = `来源：${path}${item.source.sourceBlockId ? ` / 块 ${item.source.sourceBlockId}` : ""}`;
            });
        }
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
                    void this.library.getDocPath(docId).then((path) => {
                        srcText.textContent = path ? `来源：${path}` : `src: ${docId}`;
                    });
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
                        srcText.textContent = t("sourceMissing");
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
        cancel.className = "b3-button";
        cancel.textContent = t("cancel");
        cancel.addEventListener("click", () => dialog.destroy());
        const save = document.createElement("button");
        save.className = "b3-button xlc-btn-primary";
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

    private settingsContext(): SettingsUiContext {
        return {
            t: this.i18nFn(),
            state: this.state,
            getConfig: () => this.config,
            library: this.library,
            ai: this.ai,
            registry: this.registry,
            notify: this.notify,
            applyConfig: (config) => this.applyConfig(config),
            persistSoon: () => this.persistSoon(),
            exportBundle: () => this.exportBundle(),
            importBundleText: (text, policy) => this.importBundleText(text, policy),
            importMarkdownItems: (items, policy) => this.importMarkdownItems(items, policy),
            fetchAssetBytes: (path) => this.fetchAssetBytes(path),
            aiErrorText: (err) => this.aiErrorText(err),
            applyPinyinAdapter: () => this.applyPinyinAdapter(),
        };
    }

    /** 首次引导（仅库选择；完整设置见 openSettings） */
    openSetup(): void {
        openSetupDialog(this.settingsContext());
    }

    /** 完整设置：库管理（含更改库）+ AI + 搜索 + 数据 */
    openSettings(): void {
        openSettingsDialog(this.settingsContext());
    }

    /** 资源字节获取：/api/file/getFile 为二进制端点，fetchSyncPost 信封不适用，
     *  使用同源 fetch（思源前端鉴权走 cookie，随同源请求自动携带）。失败返回 null。
     *  路径校验：assets/ 单段名（禁止 .. 与子目录穿越），文件名字符不限（编码后传输）。 */
    private async fetchAssetBytes(assetPath: string): Promise<Uint8Array | null> {
        const safe = assetPath.startsWith("assets/") && !assetPath.includes("..") && !assetPath.slice("assets/".length).includes("/");
        if (!safe) return null;
        try {
            const res = await fetch(`/api/file/getFile?path=${encodeURIComponent(assetPath)}`);
            if (!res.ok) return null;
            return new Uint8Array(await res.arrayBuffer());
        } catch {
            return null;
        }
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
        // 逐条应用与 overwrite 更新语义在 service/importer.ts（可独立单测）
        return importBundleCore(this.library, validation.parsed, policy);
    }

    async importMarkdownItems(items: ReadonlyArray<ExportedItem>, policy: ConflictPolicy): Promise<ImportReceipt> {
        const {importMarkdownBundle} = await import("./service/import-markdown");
        return importMarkdownBundle(this.library, items, policy);
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
        for (const [evt, handler] of [
            ["open-menu-blockref", this.blockRefMenuHandler],
            ["open-menu-link", this.linkMenuHandler],
            ["open-menu-image", this.imageMenuHandler],
            ["open-menu-doctree", this.docTreeMenuHandler],
        ] as const) {
            if (handler) {
                try {
                    this.eventBus.off(evt, handler as never);
                } catch {
                    // 忽略
                }
            }
        }
        this.blockRefMenuHandler = null;
        this.linkMenuHandler = null;
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
