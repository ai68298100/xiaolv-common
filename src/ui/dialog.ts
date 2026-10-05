// 搜索弹窗（生产版，质感基准：docs/design/prototype.html）：
// 桌面双栏（左列表右预览，窄容器单列降级）/ 移动端底部 sheet（同一 DOM，CSS 形态切换）。
// 安全：所有内容字符串只走 textContent，绝不 innerHTML 注入外部文本。
// 键盘：↑↓ 选择（预览跟随）、Enter 插入、Ctrl+Enter 复制、Esc 关闭；搜索框首焦点。
// 触控：44px 命中区、长按 550ms（移动 <10px 判定）弹动作菜单；不依赖 hover、不做坐标猜测。
// AI：? 前缀语义找条目（默认仅元数据出域）；动作菜单 AI 变换（预览后选插入，原文永不被改写）。
import {Dialog} from "siyuan";
import {ITEM_TYPES, ItemType} from "../model/item";
import {SearchEntry, SearchQuery, SearchContext} from "../model/search";
import {CommonItem} from "../model/item";
import {InsertMode} from "../model/actions";
import {TransformKind} from "../service/ai";
import {ProviderRow} from "../model/provider-section";

export interface DialogDeps {
    t: (key: string, ...args: string[]) => string;
    search: (query: SearchQuery) => Promise<{entries: SearchEntry[]; truncated: boolean; total: number; loading?: boolean}>;
    /** 文档搜索（插入到指定文档的选择器） */
    searchDocs: (k: string) => Promise<Array<{id: string; hPath: string; name: string}>>;
    insertToDoc: (itemId: string, docId: string, hPath: string) => Promise<boolean>;
    duplicateItem: (itemId: string) => Promise<void>;
    /** AI 变换结果存为新条目（来源=原条目；原条目不被修改） */
    saveTransformed: (itemId: string, kind: TransformKind, text: string) => Promise<void>;
    getTags: () => Promise<string[]>;
    preview: (itemId: string) => Promise<string>;
    runAction: (itemId: string, mode: InsertMode) => Promise<{ok: boolean; message: string}>;
    openSource: (itemId: string) => Promise<{ok: boolean; message: string}>;
    editItem: (itemId: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    toggleFavorite: (itemId: string) => boolean;
    isFavorite: (itemId: string) => boolean;
    insertRaw: (markdown: string) => Promise<boolean>;
    getSort: () => "manual" | "recent" | "title";
    cycleSort: () => void;
    openSetup: () => void;
    /** 提供方候选（pv: 虚拟条目；绝不进入块执行器） */
    providerSearch: (query: string) => Promise<ProviderRow[]>;
    insertProviderPayload: (payload: string) => Promise<boolean>;
    copyProviderPayload: (payload: string) => Promise<boolean>;
    /** AI 语义找（? 前缀触发；仅元数据出域） */
    aiSemantic: (desc: string) => Promise<{ok: true; entries: SearchEntry[]} | {ok: false; message: string}>;
    /** AI 变换（需正文出域权限） */
    aiTransform: (itemId: string, kind: TransformKind) => Promise<{ok: true; text: string} | {ok: false; message: string}>;
    aiEnabled: () => boolean;
    isSourceMissing: (entry: SearchEntry) => boolean;
    close: () => void;
    isMobile: () => boolean;
}

const TYPE_BADGES: Record<ItemType, string> = {
    text: "TXT", markdown: "MD", url: "URL", code: "CODE",
    image: "IMG", asset: "FILE", blockref: "REF", structure: "BLK",
};

const TRANSFORM_KINDS: TransformKind[] = ["polish", "shorten", "formal", "translate-en", "bulletize"];

export class CommonSearchDialog {
    private dialog: Dialog | null = null;
    private results: SearchEntry[] = [];
    private providerRows: ProviderRow[] = [];
    private aiResults = false;
    private activeIndex = 0;
    private searchSeq = 0;
    private previewSeq = 0;
    private ctx: SearchContext;
    private currentScope: "all" | "favorites" | "recent" = "all";
    private lastPreviewId: string | null = null;
    private inputDebounce: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly deps: DialogDeps, ctx: SearchContext) {
        this.ctx = ctx;
    }

    open(): void {
        const isMobile = this.deps.isMobile();
        const content = this.buildDom(isMobile);
        this.dialog = new Dialog({
            title: this.deps.t("pluginName"),
            content: "",
            width: isMobile ? "100vw" : "min(760px, 94vw)",
            height: isMobile ? "100vh" : "min(600px, 84vh)",
            destroyCallback: () => {
                this.dialog = null;
                this.deps.close();
            },
        });
        const body = this.dialog.element.querySelector(".b3-dialog__content");
        if (body) {
            body.innerHTML = "";
            body.appendChild(content);
        }
        const container = this.dialog.element.querySelector(".b3-dialog__container");
        if (container && isMobile) container.classList.add("xlc-sheet");
        this.dialog.element.querySelector<HTMLInputElement>(".xlc-search-input")?.focus();
        void this.refresh();
    }

    updateContext(ctx: SearchContext): void {
        this.ctx = ctx;
    }

    private buildDom(isMobile: boolean): HTMLElement {
        const root = document.createElement("div");
        root.className = "xlc-dialog" + (isMobile ? " xlc-dialog--mobile" : "");

        // 顶部：搜索框（? 前缀 = AI 语义找）
        const top = document.createElement("div");
        top.className = "xlc-top";
        const search = document.createElement("div");
        search.className = "xlc-search";
        const qMark = document.createElement("span");
        qMark.className = "xlc-search-q";
        qMark.textContent = "?";
        qMark.title = this.deps.t("aiSemanticHint");
        const input = document.createElement("input");
        input.className = "b3-text-field xlc-search-input";
        input.placeholder = this.deps.t("searchPlaceholder");
        input.setAttribute("aria-label", this.deps.t("searchPlaceholder"));
        input.addEventListener("input", () => {
            this.currentScope = "all";
            // 200ms 输入防抖（雷切同款预算）：本地过滤本身便宜，但 ? 语义找/provider 请求每键一次不可接受
            if (this.inputDebounce) clearTimeout(this.inputDebounce);
            this.inputDebounce = setTimeout(() => void this.refresh(), 200);
        });
        input.addEventListener("keydown", (e) => void this.onKeydown(e));
        search.appendChild(qMark);
        search.appendChild(input);
        top.appendChild(search);
        root.appendChild(top);

        // 筛选 chips 行
        const filters = document.createElement("div");
        filters.className = "xlc-filters";
        const typeSelect = document.createElement("select");
        typeSelect.className = "b3-select xlc-type-select";
        typeSelect.setAttribute("aria-label", this.deps.t("type"));
        const allOpt = document.createElement("option");
        allOpt.value = "";
        allOpt.textContent = this.deps.t("filterAll");
        typeSelect.appendChild(allOpt);
        for (const t of ITEM_TYPES) {
            const opt = document.createElement("option");
            opt.value = t;
            opt.textContent = this.deps.t(`type.${t}`);
            typeSelect.appendChild(opt);
        }
        typeSelect.addEventListener("change", () => void this.refresh());
        filters.appendChild(typeSelect);

        const tagSelect = document.createElement("select");
        tagSelect.className = "b3-select xlc-tag-select";
        tagSelect.setAttribute("aria-label", this.deps.t("tags"));
        void this.deps.getTags().then((tags) => {
            const first = document.createElement("option");
            first.value = "";
            first.textContent = this.deps.t("tags");
            tagSelect.appendChild(first);
            for (const tag of tags) {
                const opt = document.createElement("option");
                opt.value = tag;
                opt.textContent = tag;
                tagSelect.appendChild(opt);
            }
        });
        tagSelect.addEventListener("change", () => void this.refresh());
        filters.appendChild(tagSelect);

        for (const scope of ["favorites", "recent"] as const) {
            const chip = document.createElement("button");
            chip.className = "xlc-chip xlc-scope-chip";
            chip.dataset.scope = scope;
            chip.textContent = (scope === "favorites" ? "★ " : "🕐 ") + this.deps.t(`filter${scope === "favorites" ? "Favorites" : "Recent"}`);
            chip.addEventListener("click", () => {
                this.currentScope = this.currentScope === scope ? "all" : scope;
                this.syncScopeChips();
                void this.refresh();
            });
            filters.appendChild(chip);
        }
        // AI 语义结果横幅（? 查询命中时显示）
        const aiBanner = document.createElement("span");
        aiBanner.className = "xlc-chip xlc-ai-banner";
        aiBanner.style.display = "none";
        filters.appendChild(aiBanner);
        // 排序切换 chip（手动/置顶 → 最近 → 标题）
        const sortChip = document.createElement("button");
        sortChip.className = "xlc-chip xlc-sort-chip";
        const paintSort = (): void => {
            const sort = this.deps.getSort();
            sortChip.textContent = "⇅ " + this.deps.t(`sort.${sort}`);
        };
        paintSort();
        sortChip.addEventListener("click", () => {
            this.deps.cycleSort();
            paintSort();
            void this.refresh();
        });
        filters.appendChild(sortChip);
        root.appendChild(filters);

        // 状态行（aria-live）
        const status = document.createElement("div");
        status.className = "xlc-status";
        status.setAttribute("aria-live", "polite");
        root.appendChild(status);

        // 双栏主体：列表 + 预览（桌面）
        const bodyWrap = document.createElement("div");
        bodyWrap.className = "xlc-body";
        const list = document.createElement("div");
        list.className = "xlc-list";
        list.setAttribute("role", "listbox");
        list.setAttribute("aria-label", this.deps.t("pluginName"));
        list.addEventListener("click", (e) => {
            if ((e.target as HTMLElement).closest(".xlc-row-action")) return;
            const row = (e.target as HTMLElement).closest<HTMLElement>("[data-xlc-index]");
            if (!row) return;
            const entry = this.results[Number(row.dataset.xlcIndex)];
            if (entry) void this.runPrimary(entry);
        });
        // 悬停更新预览（触屏设备无 hover 不受影响）
        list.addEventListener("mouseover", (e) => {
            if (isMobile) return;
            const row = (e.target as HTMLElement).closest<HTMLElement>("[data-xlc-index]");
            if (!row) return;
            const entry = this.results[Number(row.dataset.xlcIndex)];
            if (entry && this.activeIndex !== Number(row.dataset.xlcIndex)) {
                this.activeIndex = Number(row.dataset.xlcIndex);
                this.paintActive();
                this.schedulePreview(entry);
            }
        });
        this.attachLongPress(list, isMobile);
        bodyWrap.appendChild(list);

        if (!isMobile) {
            const pane = document.createElement("div");
            pane.className = "xlc-pane";
            pane.appendChild(this.buildPaneHead());
            const warn = document.createElement("div");
            warn.className = "xlc-pane-warn";
            warn.style.display = "none";
            pane.appendChild(warn);
            const paneBody = document.createElement("div");
            paneBody.className = "xlc-pane-body";
            paneBody.textContent = this.deps.t("previewUnavailable");
            pane.appendChild(paneBody);
            pane.appendChild(this.buildPaneFoot());
            bodyWrap.appendChild(pane);
        }
        root.appendChild(bodyWrap);

        const footer = document.createElement("div");
        footer.className = "xlc-footer";
        const hintText = document.createElement("span");
        hintText.textContent = isMobile ? this.deps.t("usageHintMobile") : this.deps.t("usageHint");
        footer.appendChild(hintText);
        if (!isMobile) {
            const gear = document.createElement("button");
            gear.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-gear";
            gear.textContent = "⚙ " + this.deps.t("openSettings");
            gear.addEventListener("click", () => {
                this.destroy();
                this.deps.openSetup();
            });
            footer.appendChild(gear);
        }
        root.appendChild(footer);
        return root;
    }

    private buildPaneHead(): HTMLElement {
        const head = document.createElement("div");
        head.className = "xlc-pane-head";
        const title = document.createElement("span");
        title.className = "xlc-pane-title";
        head.appendChild(title);
        const badge = document.createElement("span");
        badge.className = "xlc-badge xlc-badge--ai xlc-pane-ai";
        badge.style.display = "none";
        badge.textContent = "✦ " + this.deps.t("aiFound");
        head.appendChild(badge);
        return head;
    }

    private buildPaneFoot(): HTMLElement {
        const foot = document.createElement("div");
        foot.className = "xlc-pane-foot";
        const insert = document.createElement("button");
        insert.className = "b3-button xlc-btn-primary";
        insert.textContent = this.deps.t("insert");
        insert.addEventListener("click", () => {
            const entry = this.results[this.activeIndex];
            if (entry) void this.runPrimary(entry);
        });
        const copy = document.createElement("button");
        copy.className = "b3-button";
        copy.textContent = this.deps.t("copy");
        copy.addEventListener("click", () => {
            const entry = this.results[this.activeIndex];
            if (entry) void this.deps.runAction(entry.id, "copy");
        });
        const spacer = document.createElement("span");
        spacer.className = "xlc-foot-spacer";
        const source = document.createElement("button");
        source.className = "b3-button b3-button--text xlc-btn-ghost";
        source.textContent = this.deps.t("openSource");
        source.addEventListener("click", () => {
            const entry = this.results[this.activeIndex];
            if (entry) void this.deps.openSource(entry.id);
        });
        const edit = document.createElement("button");
        edit.className = "b3-button b3-button--text xlc-btn-ghost";
        edit.textContent = this.deps.t("edit");
        edit.addEventListener("click", () => {
            const entry = this.results[this.activeIndex];
            if (entry) void this.deps.editItem(entry.id);
        });
        foot.appendChild(insert);
        foot.appendChild(copy);
        foot.appendChild(spacer);
        foot.appendChild(source);
        foot.appendChild(edit);
        return foot;
    }

    private attachLongPress(list: HTMLElement, isMobile: boolean): void {
        let pressTimer: ReturnType<typeof setTimeout> | undefined;
        let startY = 0;
        list.addEventListener("touchstart", (e) => {
            startY = e.touches[0]?.clientY ?? 0;
            const row = (e.target as HTMLElement).closest<HTMLElement>("[data-xlc-index]");
            if (!row) return;
            const entry = this.results[Number(row.dataset.xlcIndex)];
            if (!entry) return;
            pressTimer = setTimeout(() => void this.showActionMenu(entry), 550);
        }, {passive: true});
        list.addEventListener("touchmove", (e) => {
            const dy = Math.abs((e.touches[0]?.clientY ?? 0) - startY);
            if (dy > 10 && pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = undefined;
            }
        }, {passive: true});
        list.addEventListener("touchend", () => {
            if (pressTimer) clearTimeout(pressTimer);
        });
        list.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const row = (e.target as HTMLElement).closest<HTMLElement>("[data-xlc-index]");
            const entry = row ? this.results[Number(row.dataset.xlcIndex)] : this.results[this.activeIndex];
            if (entry) void this.showActionMenu(entry);
        });
        void isMobile;
    }

    private syncScopeChips(): void {
        this.dialog?.element.querySelectorAll<HTMLElement>(".xlc-scope-chip").forEach((chip) => {
            chip.classList.toggle("xlc-chip--on", chip.dataset.scope === this.currentScope);
        });
    }

    private buildQuery(): SearchQuery {
        const el = this.dialog?.element;
        const text = el?.querySelector<HTMLInputElement>(".xlc-search-input")?.value ?? "";
        const itemType = (el?.querySelector<HTMLSelectElement>(".xlc-type-select")?.value ?? "") as "" | ItemType;
        const tag = el?.querySelector<HTMLSelectElement>(".xlc-tag-select")?.value ?? "";
        return {text, itemType, tag, scope: this.currentScope};
    }

    private async refresh(): Promise<void> {
        const seq = ++this.searchSeq;
        const query = this.buildQuery();
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        const status = this.dialog?.element.querySelector<HTMLElement>(".xlc-status");
        const footer = this.dialog?.element.querySelector<HTMLElement>(".xlc-footer");
        const aiBanner = this.dialog?.element.querySelector<HTMLElement>(".xlc-ai-banner");
        if (!list) return;
        this.lastPreviewId = null;
        let total = 0;
        let truncated = false;
        let loading = false;
        try {
            const text = query.text.trim();
            if (text.startsWith("?") && text.length > 1) {
                // AI 语义找（仅元数据出域；未启用/失败诚实提示）
                const aiResult = await this.deps.aiSemantic(text.slice(1));
                if (seq !== this.searchSeq) return;
                if (aiResult.ok) {
                    this.results = aiResult.entries;
                    this.aiResults = true;
                    total = aiResult.entries.length;
                } else {
                    this.results = [];
                    this.aiResults = false;
                    if (status) status.textContent = aiResult.message;
                }
                if (aiBanner) aiBanner.style.display = this.aiResults && this.results.length ? "" : "none";
                if (aiBanner && this.aiResults) aiBanner.textContent = `✦ ${this.deps.t("aiFound")} · ${this.results.length}`;
            } else {
                const result = await this.deps.search(query);
                if (seq !== this.searchSeq) return;
                this.results = result.entries;
                total = result.total;
                truncated = result.truncated;
                loading = result.loading === true;
                this.aiResults = false;
                if (aiBanner) aiBanner.style.display = "none";
            }
        } catch (err) {
            if (seq !== this.searchSeq) return;
            this.results = [];
            if (status) status.textContent = this.deps.t("kernelError", (err as Error).message);
            this.renderList(list);
            return;
        }
        if (seq !== this.searchSeq) return;
        this.activeIndex = 0;
        if (status) {
            if (this.results.length) {
                status.textContent = "";
            } else if (loading) {
                status.textContent = this.deps.t("indexing");
            } else if (query.text.trim() && !query.text.trim().startsWith("?") && this.deps.aiEnabled()) {
                status.textContent = this.deps.t("semanticSuggestion");
            } else {
                status.textContent = this.deps.t("empty");
            }
        }
        if (footer) {
            footer.textContent = (this.deps.isMobile() ? this.deps.t("usageHintMobile") : this.deps.t("usageHint"))
                + " ｜ " + this.deps.t("totalItems", String(total)) + (truncated ? " ⚠" : "");
            const gear = document.createElement("button");
            gear.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-gear";
            gear.textContent = "⚙ " + this.deps.t("openSettings");
            gear.addEventListener("click", () => {
                this.destroy();
                this.deps.openSetup();
            });
            footer.appendChild(gear);
        }
        // 提供方分区（有查询词且注册了可执行 provider 时；pv: 虚拟行不进键盘导航/执行器）
        this.providerRows = [];
        const q = query.text.trim();
        if (q && !q.startsWith("?")) {
            try {
                this.providerRows = await this.deps.providerSearch(q);
            } catch {
                this.providerRows = [];
            }
            if (seq !== this.searchSeq) return;
        }
        this.renderList(list);
        this.updatePreview();
    }

    private renderList(list: HTMLElement): void {
        list.innerHTML = "";
        for (let i = 0; i < this.results.length; i++) {
            const entry = this.results[i];
            const row = document.createElement("div");
            row.className = "xlc-row" + (i === this.activeIndex ? " xlc-row--active" : "");
            row.dataset.xlcIndex = String(i);
            row.setAttribute("role", "option");
            row.setAttribute("aria-selected", i === this.activeIndex ? "true" : "false");

            const main = document.createElement("div");
            main.className = "xlc-row-main";
            const title = document.createElement("div");
            title.className = "xlc-row-title";
            const badge = document.createElement("span");
            badge.className = `xlc-badge xlc-badge--${entry.itemType}`;
            badge.textContent = TYPE_BADGES[entry.itemType] ?? "TXT";
            title.appendChild(badge);
            const titleText = document.createElement("span");
            titleText.className = "xlc-row-titletext";
            titleText.textContent = entry.title || this.deps.t("unknownType");
            title.appendChild(titleText);
            if (this.deps.isFavorite(entry.id)) {
                const starMini = document.createElement("span");
                starMini.className = "xlc-row-favmark";
                starMini.textContent = "★";
                title.appendChild(starMini);
            }
            main.appendChild(title);
            const meta = document.createElement("div");
            meta.className = "xlc-row-meta";
            meta.textContent = [entry.tags.join(" / "), entry.summary]
                .filter(Boolean).join(" · ").slice(0, 160);
            main.appendChild(meta);
            row.appendChild(main);

            if (this.deps.isSourceMissing(entry)) {
                const warn = document.createElement("span");
                warn.className = "xlc-badge xlc-badge--warn";
                warn.textContent = "⚠ " + this.deps.t("sourceMissing");
                row.appendChild(warn);
            }

            const star = document.createElement("button");
            star.className = "b3-button b3-button--small xlc-row-action";
            star.textContent = this.deps.isFavorite(entry.id) ? "★" : "☆";
            star.setAttribute("aria-label", this.deps.isFavorite(entry.id) ? this.deps.t("unfavorite") : this.deps.t("favorite"));
            star.addEventListener("click", (e) => {
                e.stopPropagation();
                this.deps.toggleFavorite(entry.id);
                star.textContent = this.deps.isFavorite(entry.id) ? "★" : "☆";
                void this.refreshPreservingPosition();
            });
            row.appendChild(star);
            list.appendChild(row);
        }
        // 提供方分区（pv: 虚拟行；点击弹小菜单=插入/复制 payload；不进键盘导航）
        if (this.providerRows.length > 0) {
            const header = document.createElement("div");
            header.className = "xlc-provider-header";
            header.textContent = "✦ " + this.deps.t("providerSection") + " · " + this.providerRows.length;
            list.appendChild(header);
            for (const row of this.providerRows) {
                const el = document.createElement("div");
                el.className = "xlc-row xlc-row--provider";
                el.dataset.xlcVirtualId = row.virtualId;
                const main = document.createElement("div");
                main.className = "xlc-row-main";
                const title = document.createElement("div");
                title.className = "xlc-row-title";
                const badge = document.createElement("span");
                badge.className = "xlc-badge xlc-badge--ai";
                badge.textContent = row.providerName.slice(0, 12);
                title.appendChild(badge);
                const titleText = document.createElement("span");
                titleText.className = "xlc-row-titletext";
                titleText.textContent = row.title || row.payload.slice(0, 40);
                title.appendChild(titleText);
                main.appendChild(title);
                const meta = document.createElement("div");
                meta.className = "xlc-row-meta";
                meta.textContent = row.payload.slice(0, 120);
                main.appendChild(meta);
                el.appendChild(main);
                el.addEventListener("click", () => void this.showProviderMenu(row, el));
                el.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    void this.showProviderMenu(row, el);
                });
                list.appendChild(el);
            }
        }
        this.paintActive();
    }

    private async showProviderMenu(row: ProviderRow, anchor: HTMLElement): Promise<void> {
        const menu = document.createElement("div");
        menu.className = "xlc-menu";
        const lbl = document.createElement("div");
        lbl.className = "xlc-menu-lbl";
        lbl.textContent = row.providerName + " · " + this.deps.t("providerSection");
        menu.appendChild(lbl);
        const sec = document.createElement("div");
        sec.className = "xlc-menu-sec";
        const mk = (label: string, run: () => Promise<unknown>): void => {
            const btn = document.createElement("button");
            btn.className = "xlc-menu-item";
            btn.textContent = label;
            btn.addEventListener("click", async () => {
                this.destroy();
                await run();
            });
            sec.appendChild(btn);
        };
        mk(this.deps.t("providerInsert"), () => this.deps.insertProviderPayload(row.payload));
        mk(this.deps.t("providerCopy"), () => this.deps.copyProviderPayload(row.payload));
        menu.appendChild(sec);
        (this.dialog?.element ?? anchor).appendChild(menu);
        const dismiss = (e: Event) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener("pointerdown", dismiss, true);
            }
        };
        document.addEventListener("pointerdown", dismiss, true);
    }

    private async refreshPreservingPosition(): Promise<void> {
        const seq = ++this.searchSeq;
        const query = this.buildQuery();
        try {
            const {entries} = await this.deps.search(query);
            if (seq !== this.searchSeq) return;
            this.results = entries;
        } catch {
            return;
        }
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        if (list) this.renderList(list);
    }

    private paintActive(): void {
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        if (!list) return;
        Array.from(list.children).forEach((child, i) => {
            child.classList.toggle("xlc-row--active", i === this.activeIndex);
            child.setAttribute("aria-selected", i === this.activeIndex ? "true" : "false");
        });
        const active = list.children[this.activeIndex] as HTMLElement | undefined;
        active?.scrollIntoView({block: "nearest"});
    }

    private schedulePreview(entry: SearchEntry): void {
        this.updatePreview(entry.id);
    }

    private updatePreview(forceId?: string): void {
        const entry = this.results[this.activeIndex];
        const id = forceId ?? entry?.id ?? null;
        const paneBody = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-body");
        const paneTitle = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-title");
        const paneWarn = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-warn");
        const paneAi = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-ai");
        if (!paneBody || !id || id === this.lastPreviewId) return;
        this.lastPreviewId = id;
        const seq = ++this.previewSeq;
        if (paneTitle) paneTitle.textContent = entry?.title ?? "";
        if (paneAi) paneAi.style.display = this.aiResults ? "" : "none";
        if (paneWarn) {
            const missing = Boolean(entry && this.deps.isSourceMissing(entry));
            paneWarn.style.display = missing ? "" : "none";
            if (missing) paneWarn.textContent = "⚠ " + this.deps.t("sourceGone");
        }
        paneBody.textContent = this.deps.t("aiWorking");
        void this.deps.preview(id).then((text) => {
            if (seq !== this.previewSeq) return;
            paneBody.textContent = text || this.deps.t("previewUnavailable");
        }).catch(() => {
            if (seq !== this.previewSeq) return;
            paneBody.textContent = this.deps.t("kernelError", "preview");
        });
    }

    /** 普通点击 = 主动作（insert；blockref = 插入引用） */
    private async runPrimary(entry: SearchEntry): Promise<void> {
        const mode: InsertMode = entry.itemType === "blockref" ? "insert-ref" : "insert";
        await this.deps.runAction(entry.id, mode);
        this.destroy();
    }

    private async showActionMenu(entry: SearchEntry): Promise<void> {
        const menu = document.createElement("div");
        menu.className = "xlc-menu";
        const rebuild = (render: () => void): void => {
            menu.innerHTML = "";
            render();
        };

        const buildDefault = (): void => {
            // 预览盒（原文摘要）
            const previewBox = document.createElement("pre");
            previewBox.className = "xlc-menu-preview";
            previewBox.textContent = this.deps.t("previewUnavailable");
            void this.deps.preview(entry.id).then((text) => {
                if (text) previewBox.textContent = text.slice(0, 500);
            }).catch(() => {
                previewBox.textContent = this.deps.t("kernelError", "preview");
            });
            menu.appendChild(previewBox);

            const sec1 = document.createElement("div");
            sec1.className = "xlc-menu-sec";
            const addAction = (label: string, run: () => Promise<unknown>, cls = "xlc-menu-item"): void => {
                const btn = document.createElement("button");
                btn.className = cls;
                btn.textContent = label;
                btn.addEventListener("click", async () => {
                    this.destroy();
                    await run();
                });
                sec1.appendChild(btn);
            };
            if (entry.itemType === "blockref") {
                addAction(this.deps.t("insertRef"), () => this.deps.runAction(entry.id, "insert-ref"));
                addAction(this.deps.t("insertEmbed"), () => this.deps.runAction(entry.id, "insert-embed"));
                addAction(this.deps.t("insertCopy"), () => this.deps.runAction(entry.id, "copy-content"));
            } else {
                addAction(this.deps.t("insert"), () => this.deps.runAction(entry.id, "insert"));
                addAction(this.deps.t("copy"), () => this.deps.runAction(entry.id, "copy"));
            }
            menu.appendChild(sec1);

            // AI 变换（启用时展示；需要正文出域权限，失败在预览盒诚实提示）
            if (this.deps.aiEnabled()) {
                const secAi = document.createElement("div");
                secAi.className = "xlc-menu-sec xlc-menu-sec--ai";
                for (const kind of TRANSFORM_KINDS) {
                    const btn = document.createElement("button");
                    btn.className = "xlc-menu-item xlc-menu-item--ai";
                    btn.textContent = "✦ " + this.deps.t(`tf.${kind}`);
                    btn.addEventListener("click", () => {
                        rebuild(buildTransform.bind(this, kind));
                        void runTransform(kind);
                    });
                    secAi.appendChild(btn);
                }
                menu.appendChild(secAi);
            }

            const sec2 = document.createElement("div");
            sec2.className = "xlc-menu-sec";
            const addSilent = (label: string, run: () => Promise<unknown>): void => {
                const btn = document.createElement("button");
                btn.className = "xlc-menu-item";
                btn.textContent = label;
                btn.addEventListener("click", async () => {
                    menu.remove();
                    await run();
                });
                sec2.appendChild(btn);
            };
            addSilent(this.deps.t("openSource"), () => this.deps.openSource(entry.id));
            addSilent(this.deps.t("edit"), () => this.deps.editItem(entry.id));
            addSilent(this.deps.t("duplicateItem"), () => this.deps.duplicateItem(entry.id));
            // 插入到指定文档（菜单内联文档选择器；无活动编辑器场景的主路径）
            const toDocBtn = document.createElement("button");
            toDocBtn.className = "xlc-menu-item";
            toDocBtn.textContent = this.deps.t("insertToDoc");
            toDocBtn.addEventListener("click", () => {
                let sec = menu.querySelector<HTMLElement>(".xlc-menu-pickdoc");
                if (sec) {
                    sec.remove();
                    return;
                }
                sec = document.createElement("div");
                sec.className = "xlc-menu-sec xlc-menu-pickdoc";
                sec.style.flexDirection = "column";
                const input = document.createElement("input");
                input.className = "b3-text-field xlc-pickdoc-input";
                input.placeholder = this.deps.t("insertToDocPick");
                sec.appendChild(input);
                let seq = 0;
                input.addEventListener("input", () => {
                    const mySeq = ++seq;
                    const k = input.value.trim();
                    sec!.querySelectorAll(".xlc-pickdoc-hit").forEach((el) => el.remove());
                    if (!k) return;
                    void this.deps.searchDocs(k).then((hits) => {
                        if (mySeq !== seq) return;
                        for (const hit of hits.slice(0, 5)) {
                            const hitBtn = document.createElement("button");
                            hitBtn.className = "xlc-menu-item xlc-pickdoc-hit";
                            hitBtn.textContent = hit.hPath || hit.name || hit.id;
                            hitBtn.addEventListener("click", async () => {
                                this.destroy();
                                await this.deps.insertToDoc(entry.id, hit.id, hit.hPath);
                            });
                            sec!.appendChild(hitBtn);
                        }
                    });
                });
                const actions2 = menu.querySelectorAll(".xlc-menu-sec");
                actions2[actions2.length - 1]?.before(sec);
                input.focus();
            });
            sec2.appendChild(toDocBtn);
            addSilent(this.deps.t("delete"), () => this.deps.deleteItem(entry.id));
            menu.appendChild(sec2);
        };

        const buildTransform = (kind: TransformKind): void => {
            // 变换态：预览盒显示结果 + 三选（插变换/复制变换/插原文）
            const lbl = document.createElement("div");
            lbl.className = "xlc-menu-lbl";
            lbl.textContent = entry.title + " · " + this.deps.t(`tf.${kind}`);
            menu.appendChild(lbl);
            const box = document.createElement("pre");
            box.className = "xlc-menu-preview";
            box.textContent = this.deps.t("aiWorking");
            menu.appendChild(box);
            const sec = document.createElement("div");
            sec.className = "xlc-menu-sec";
            const mk = (label: string, run: () => Promise<void>): void => {
                const btn = document.createElement("button");
                btn.className = "xlc-menu-item";
                btn.textContent = label;
                btn.addEventListener("click", async () => {
                    this.destroy();
                    await run();
                });
                sec.appendChild(btn);
            };
            mk(this.deps.t("aiInsertTransformed"), async () => {
                await this.deps.insertRaw(box.dataset.transformed ?? "");
            });
            mk(this.deps.t("aiCopyTransformed"), async () => {
                await this.deps.runAction(entry.id, "copy");
            });
            mk(this.deps.t("aiInsertOriginal"), async () => {
                await this.deps.runAction(entry.id, entry.itemType === "blockref" ? "insert-ref" : "insert");
            });
            const saveNewBtn = document.createElement("button");
            saveNewBtn.className = "xlc-menu-item";
            saveNewBtn.textContent = this.deps.t("saveTransformed");
            saveNewBtn.addEventListener("click", async () => {
                const transformed = box.dataset.transformed ?? "";
                this.destroy();
                await this.deps.saveTransformed(entry.id, kind, transformed);
            });
            sec.appendChild(saveNewBtn);
            menu.appendChild(sec);
            const secBack = document.createElement("div");
            secBack.className = "xlc-menu-sec";
            const back = document.createElement("button");
            back.className = "xlc-menu-item";
            back.textContent = "← " + this.deps.t("more");
            back.addEventListener("click", () => rebuild(buildDefault));
            secBack.appendChild(back);
            menu.appendChild(secBack);
            // 把最终文本挂到 dataset 供按钮使用（runTransform 完成后填充）
            (menu as HTMLElement & {applyTransform?: (text: string) => void}).applyTransform = (text: string): void => {
                box.dataset.transformed = text;
                box.textContent = text.slice(0, 800);
            };
        };

        const runTransform = async (kind: TransformKind): Promise<void> => {
            const result = await this.deps.aiTransform(entry.id, kind);
            const apply = (menu as HTMLElement & {applyTransform?: (text: string) => void}).applyTransform;
            if (result.ok) {
                apply?.(result.text);
            } else {
                const box = menu.querySelector<HTMLElement>(".xlc-menu-preview");
                if (box) box.textContent = result.message;
            }
        };

        rebuild(buildDefault);
        (this.dialog?.element ?? document.body).appendChild(menu);
        const dismiss = (e: Event) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener("pointerdown", dismiss, true);
            }
        };
        document.addEventListener("pointerdown", dismiss, true);
    }

    private async onKeydown(e: KeyboardEvent): Promise<void> {
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        if (!list) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            this.activeIndex = Math.min(this.activeIndex + 1, Math.max(this.results.length - 1, 0));
            this.paintActive();
            this.updatePreview();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.activeIndex = Math.max(this.activeIndex - 1, 0);
            this.paintActive();
            this.updatePreview();
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const entry = this.results[this.activeIndex];
            if (entry) await this.runPrimary(entry);
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const entry = this.results[this.activeIndex];
            if (entry) await this.deps.runAction(entry.id, "copy");
        } else if (e.key === "Escape") {
            e.preventDefault();
            this.destroy();
        }
    }

    destroy(): void {
        if (this.inputDebounce) clearTimeout(this.inputDebounce);
        this.dialog?.destroy();
        this.dialog = null;
    }
}
