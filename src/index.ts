// 小驴常用插件入口：生命周期、命令注册、UI 装配、协议事件、首次引导。
import {
    App,
    Dialog,
    Plugin,
    showMessage,
    confirm,
} from "siyuan";
import {fetchSyncPost} from "siyuan";
import "@/styles/index.scss";
import {LIMITS, STORAGE_KEYS} from "./constants";
import {createKernelClient} from "./kernel/client";
import {CommonItem} from "./model/item";
import {ExportedItem, buildBundle, classifyConflict, validateImport, ConflictPolicy, ImportReceipt} from "./model/transfer";
import {LibraryConfig, migrateState, normalizeLibraryConfig, normalizeState, PluginState} from "./model/storage";
import {SearchContext} from "./model/search";
import {CapabilityDescriptor, ProviderDescriptor} from "./model/protocol";
import {LibraryService, NewItemInput} from "./service/library";
import {ActionExecutor, HostBridge} from "./service/commands";
import {ProviderRegistry} from "./service/providers";
import {XiaolvCommonService} from "./service/service";
import {CommonSearchDialog} from "./ui/dialog";
import {CaptureDialog, confirmDelete} from "./ui/capture";
import {ICONS} from "./ui/icons";

type TFn = (key: string, ...args: string[]) => string;

export default class XiaolvCommonPlugin extends Plugin {
    private library!: LibraryService;
    private host!: HostBridge;
    private executor!: ActionExecutor;
    private registry!: ProviderRegistry;
    private service!: XiaolvCommonService;
    private capture!: CaptureDialog;
    private state!: PluginState;
    private config!: LibraryConfig | null;
    private searchDialog: CommonSearchDialog | null = null;
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
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
        this.library = new LibraryService(kernel);
        if (this.config) this.library.setConfig(this.config);
        this.host = new HostBridge(this.app);
        this.registry = new ProviderRegistry();
        this.registry.restore(this.state.providers);
        this.executor = new ActionExecutor(this.library, this.host, this.notify, (item) => this.service.touchRecent(item.id));
        this.service = new XiaolvCommonService({
            library: this.library,
            executor: this.executor,
            registry: this.registry,
            state: this.state,
            onStateChange: () => this.persistSoon(),
        });
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

    private notify = (kind: "info" | "error", message: string): void => {
        showMessage(message, 4000, kind === "error" ? "error" : "info");
    };

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

    private registerEntries(): void {
        try {
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
    }

    // ---- 搜索界面 ----

    private searchContext(): SearchContext {
        return {
            favorites: new Set(this.state.favorites),
            recents: new Map(this.state.recents.map((r) => [r.id, r.usedAt])),
            now: Date.now(),
        };
    }

    openSearch(): void {
        if (!this.config) {
            this.openSetup();
            return;
        }
        this.searchDialog?.destroy();
        this.searchDialog = new CommonSearchDialog({
            t: this.i18nFn(),
            search: async (query) => {
                const idx = await this.library.ensureIndex();
                const {searchEntries} = await import("./model/search");
                const results = searchEntries(idx.entries, query, this.searchContext());
                return {entries: results.map((r) => r.entry), truncated: idx.truncated};
            },
            getTags: async () => {
                const {collectTags} = await import("./model/search");
                const idx = await this.library.ensureIndex();
                return collectTags(idx.entries);
            },
            preview: async (itemId) => {
                const got = await this.library.getItem(itemId);
                if (!got.ok) return "";
                const kd = await this.library.getItemKramdown(got.data);
                return kd.ok ? kd.data : "";
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

    private openEditDialog(item: CommonItem): void {
        const t = this.i18nFn();
        const dialog = new Dialog({
            title: t("edit"),
            content: "",
            width: "min(480px, 92vw)",
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
            }).then((result) => {
                if (result.ok) {
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
                        mode: "doc",
                        notebookIds: [],
                        containerDocIds: [result.data.docId],
                        createdDocIds: [result.data.docId],
                        configuredAt: Date.now(),
                    });
                    this.notify("info", t("libDocCreated", title));
                    dialog.destroy();
                });
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
                    mode: "notebook",
                    notebookIds: [notebookId],
                    containerDocIds: [],
                    createdDocIds: [],
                    configuredAt: Date.now(),
                });
                dialog.destroy();
                return;
            }
            // doc/tree 模式：手动输入库文档 ID（高级路径；后续版本接入文档选择器）
            const docId = window.prompt("Doc ID");
            if (!docId) return;
            this.applyConfig({
                mode,
                notebookIds: [],
                containerDocIds: [docId.trim()],
                createdDocIds: [],
                configuredAt: Date.now(),
            });
            dialog.destroy();
        });
        actions.appendChild(createBtn);
        actions.appendChild(useNotebookBtn);
        root.appendChild(actions);
        body.appendChild(root);
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
