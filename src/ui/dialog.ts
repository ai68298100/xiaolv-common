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
import {AskField, hasCursorToken, listAskFields} from "../model/variables";
import {openVariableFillCard} from "./variable-form";

export interface DialogDeps {
    t: (key: string, ...args: string[]) => string;
    search: (query: SearchQuery) => Promise<{entries: SearchEntry[]; truncated: boolean; total: number; loading?: boolean; error?: string}>;
    /** 文档搜索（插入到指定文档的选择器） */
    searchDocs: (k: string) => Promise<Array<{id: string; hPath: string; name: string}>>;
    insertToDoc: (itemId: string, docId: string, hPath: string, fills?: Record<string, string>) => Promise<boolean>;
    duplicateItem: (itemId: string) => Promise<void>;
    /** AI 变换结果存为新条目（来源=原条目；原条目不被修改） */
    saveTransformed: (itemId: string, transformLabel: string, text: string) => Promise<void>;
    getTags: () => Promise<string[]>;
    /** 分类面（F4 分类筛选下拉） */
    getCategories: () => Promise<string[]>;
    preview: (itemId: string) => Promise<string>;
    runAction: (itemId: string, mode: InsertMode) => Promise<{ok: boolean; message: string}>;
    /** 变量填充：填充值随动作进入执行层（F1） */
    runActionWithFills: (itemId: string, mode: InsertMode, fills?: Record<string, string>) => Promise<{ok: boolean; message: string}>;
    openSource: (itemId: string) => Promise<{ok: boolean; message: string}>;
    editItem: (itemId: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    /** 筛选状态持久化（类型/标签/分类跨会话记忆；state.uiPrefs 承载） */
    getFilters: () => {type: string; tag: string; category: string};
    setFilters: (f: {type: string; tag: string; category: string}) => void;
    /** 上次搜索词（跨会话保留；空串=无） */
    getLastQuery: () => string;
    setLastQuery: (q: string) => void;
    /** 定向插入目标（文档树入口；设置后 Enter/点按插入到该文档而非活动编辑器） */
    insertTarget?: {docId: string; hPath: string} | null;
    toggleFavorite: (itemId: string) => boolean;
    isFavorite: (itemId: string) => boolean;
    insertRaw: (markdown: string) => Promise<boolean>;
    /** 写剪贴板（复制变换结果用，区别于条目原始内容的 runAction copy） */
    copyText: (text: string) => Promise<boolean>;
    getSort: () => "manual" | "recent" | "frequent" | "title";
    cycleSort: () => void;
    openSetup: () => void;
    /** 提供方候选（pv: 虚拟条目；绝不进入块执行器） */
    providerSearch: (query: string) => Promise<ProviderRow[]>;
    insertProviderPayload: (payload: string, target?: {docId: string; hPath: string}) => Promise<boolean>;
    copyProviderPayload: (payload: string) => Promise<boolean>;
    /** 使用计数（F3 展示：行 meta 与预览徽标；侧车只读） */
    getUsage: () => Record<string, {count: number; lastAt: number}>;
    /** 手动新建条目（移动端「＋ 新建」入口） */
    newItem: () => void;
    /** AI 语义找（? 前缀触发；仅元数据出域；候选先按当前筛选过滤） */
    aiSemantic: (desc: string, filters: {itemType: string; tag: string; scope: "all" | "favorites" | "recent"}) => Promise<{ok: true; entries: SearchEntry[]} | {ok: false; message: string}>;
    /** AI 变换（需正文出域权限） */
    aiTransform: (itemId: string, kind: TransformKind) => Promise<{ok: true; text: string} | {ok: false; message: string}>;
    /** 自定义 AI 变换（F7）：与内置并列出现在菜单 ✦ 区 */
    listCustomTransforms: () => Array<{id: string; name: string}>;
    aiTransformCustom: (itemId: string, customId: string) => Promise<{ok: true; text: string} | {ok: false; message: string}>;
    aiEnabled: () => boolean;
    /** 插入前询问变量（F1；设置可关） */
    promptVariables: () => boolean;
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
    private activeProvider = -1;
    private aiResults = false;
    private activeIndex = 0;
    private searchSeq = 0;
    private previewSeq = 0;
    private ctx: SearchContext;
    private currentScope: "all" | "favorites" | "recent" = "all";
    private lastPreviewId: string | null = null;
    /** 空状态文案（refresh 计算后交 renderList 渲染大空态；瞬态/错误仍走 status 行） */
    private emptyMessage = "";
    /** 使用计数快照（refresh 时取自侧车；行 meta 与预览徽标展示用） */
    private usageCounts = new Map<string, number>();
    /** 动作菜单 document 监听兜底清理（destroy 时调用；防键盘关弹窗残留监听） */
    private menuDismiss: (() => void) | null = null;
    private inputDebounce: ReturnType<typeof setTimeout> | null = null;
    /** IME 组合输入中（中文输入法组词期间跳过刷新，compositionend 后统一刷新） */
    private isComposing = false;

    constructor(private readonly deps: DialogDeps, ctx: SearchContext) {
        this.ctx = ctx;
    }

    /** 定向插入目标（文档树入口；设置后 Enter/点按插入到该文档而非活动编辑器） */
    insertTarget?: {docId: string; hPath: string} | null;
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
        if (container) container.classList.add(isMobile ? "xlc-sheet" : "xlc-dialog-host");
        const input = this.dialog.element.querySelector<HTMLInputElement>(".xlc-search-input");
        if (input) {
            // 上次搜索词回填（跨会话保留）
            const last = this.deps.getLastQuery();
            if (last) {
                input.value = last;
                this.currentScope = "all";
            }
            input.focus();
        }
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
        // 输入以 ? 开头时隐藏装饰性 ? 提示（避免「??」双写；功能前缀仍在输入框内）
        const syncQMark = (): void => {
            qMark.classList.toggle("xlc-search-q--off", input.value.startsWith("?"));
            clearBtn.classList.toggle("xlc-search-clear--on", input.value.length > 0);
        };
        // 清空按钮（通用输入细节）：有输入时出现，一键清空并回焦
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "xlc-search-clear";
        clearBtn.textContent = "×";
        clearBtn.setAttribute("aria-label", this.deps.t("clearSearch"));
        clearBtn.addEventListener("click", () => {
            input.value = "";
            syncQMark();
            input.focus();
            input.dispatchEvent(new Event("input", {bubbles: true}));
        });
        input.addEventListener("input", () => {
            syncQMark();
            this.currentScope = "all";
            // 持久化剥离 ? 前缀：重开弹窗预填普通查询，绝不自动触发 AI 语义找
            this.deps.setLastQuery(input.value.replace(/^\?+/, ""));
            // IME 组合输入（中文输入法组词）期间跳过刷新——候选词未上屏不过滤；
            // compositionend 后统一刷新一次
            if (this.isComposing) return;
            // 200ms 输入防抖（雷切同款预算）：本地过滤本身便宜，但 ? 语义找/provider 请求每键一次不可接受
            if (this.inputDebounce) clearTimeout(this.inputDebounce);
            this.inputDebounce = setTimeout(() => void this.refresh(), 200);
        });
        input.addEventListener("compositionstart", () => {
            this.isComposing = true;
        });
        input.addEventListener("compositionend", () => {
            this.isComposing = false;
            syncQMark();
            this.currentScope = "all";
            if (this.inputDebounce) clearTimeout(this.inputDebounce);
            this.inputDebounce = setTimeout(() => void this.refresh(), 50);
        });
        input.addEventListener("keydown", (e) => void this.onKeydown(e));
        search.appendChild(qMark);
        search.appendChild(input);
        search.appendChild(clearBtn);
        top.appendChild(search);
        // 头部快捷键提示（桌面；原型头部右侧 kbd chips）
        if (!isMobile) {
            const kbdRow = document.createElement("div");
            kbdRow.className = "xlc-kbdrow";
            for (const hint of ["↑↓", "↩ 插入", "⌃↩ 复制", "⌥1-9 直达", "Esc"]) {
                const kbd = document.createElement("span");
                kbd.className = "xlc-kbd";
                kbd.textContent = hint;
                kbdRow.appendChild(kbd);
            }
            top.appendChild(kbdRow);
        }
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
        // 跨会话筛选记忆：预填上次选择
        const savedFilters = this.deps.getFilters();
        if (savedFilters.type) typeSelect.value = savedFilters.type;
        typeSelect.addEventListener("change", () => {
            this.deps.setFilters({
                type: typeSelect.value,
                tag: tagSelect?.value ?? "",
                category: categorySelect?.value ?? "",
            });
            void this.refresh();
        });
        filters.appendChild(typeSelect);

        const tagSelect = document.createElement("select");
        tagSelect.className = "b3-select xlc-tag-select";
        tagSelect.setAttribute("aria-label", this.deps.t("tags"));
        if (savedFilters.tag) tagSelect.value = savedFilters.tag;
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
            if (savedFilters.tag && tags.includes(savedFilters.tag)) tagSelect.value = savedFilters.tag;
        });
        tagSelect.addEventListener("change", () => {
            this.deps.setFilters({
                type: typeSelect.value,
                tag: tagSelect.value,
                category: categorySelect?.value ?? "",
            });
            void this.refresh();
        });
        filters.appendChild(tagSelect);

        // 分类筛选（F4，原型屏 1：类型/标签/分类三下拉）
        const categorySelect = document.createElement("select");
        categorySelect.className = "b3-select xlc-category-select";
        categorySelect.setAttribute("aria-label", this.deps.t("category"));
        if (savedFilters.category) categorySelect.value = savedFilters.category;
        void this.deps.getCategories().then((categories) => {
            if (categories.length === 0) return;
            const first = document.createElement("option");
            first.value = "";
            first.textContent = this.deps.t("category");
            categorySelect.appendChild(first);
            for (const category of categories) {
                const opt = document.createElement("option");
                opt.value = category;
                opt.textContent = category;
                categorySelect.appendChild(opt);
            }
            if (savedFilters.category && categories.includes(savedFilters.category)) categorySelect.value = savedFilters.category;
        });
        categorySelect.addEventListener("change", () => {
            this.deps.setFilters({type: typeSelect.value, tag: tagSelect.value, category: categorySelect.value});
            void this.refresh();
        });
        filters.appendChild(categorySelect);

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
        // AI 语义结果横幅（? 查询命中时显示；原型顺序=筛选行首位）
        const aiBanner = document.createElement("span");
        aiBanner.className = "xlc-chip xlc-ai-banner";
        aiBanner.style.display = "none";
        filters.insertBefore(aiBanner, filters.firstChild);
        // 排序切换 chip（手动/置顶 → 最近 → 标题）
        const sortChip = document.createElement("button");
        sortChip.className = "xlc-chip xlc-sort-chip";
        const paintSort = (): void => {
            const sort = this.deps.getSort();
            sortChip.textContent = "⇅ " + this.deps.t(`sort.${sort}`);
            // 非默认档高亮（原型屏 1：⇅常用 为选中态）
            sortChip.classList.toggle("xlc-chip--on", sort !== "manual");
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
            // 变量提示行（F1，原型屏 1）：「插入时将询问 N 个变量：{{…}}」
            const paneVars = document.createElement("div");
            paneVars.className = "xlc-pane-vars";
            paneVars.style.display = "none";
            pane.appendChild(paneVars);
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

        // 底栏（原型：左计数 / 右真源声明 + 设置入口；移动端=操作钮行 + 点按提示）
        const footer = document.createElement("div");
        footer.className = "xlc-footer";
        const count = document.createElement("span");
        count.className = "xlc-footer-count";
        if (isMobile) {
            // 操作钮行（原型屏 7：＋新建 / 插入选中；44px 命中）
            const footBtns = document.createElement("div");
            footBtns.className = "xlc-mobile-foot";
            const newBtn = document.createElement("button");
            newBtn.className = "b3-button";
            newBtn.textContent = this.deps.t("quickNew");
            newBtn.addEventListener("click", () => this.deps.newItem());
            footBtns.appendChild(newBtn);
            const insertBtn = document.createElement("button");
            insertBtn.className = "b3-button xlc-btn-primary";
            insertBtn.textContent = this.deps.t("quickInsertSelected");
            insertBtn.addEventListener("click", () => {
                const entry = this.results[this.activeIndex];
                if (entry) void this.runPrimary(entry);
            });
            footBtns.appendChild(insertBtn);
            footer.appendChild(footBtns);
            count.textContent = this.deps.t("usageHintMobile");
        } else {
            count.textContent = "";
        }
        footer.appendChild(count);
        if (!isMobile) {
            const claim = document.createElement("span");
            claim.className = "xlc-footer-claim";
            claim.textContent = this.deps.t("dataTruth");
            footer.appendChild(claim);
        }
        // 设置入口双端可达（移动端无顶栏/命令面板，此处是唯一设置路径）
        const gear = document.createElement("button");
        gear.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-gear";
        gear.textContent = "⚙ " + this.deps.t("openSettings");
        gear.addEventListener("click", () => {
            this.destroy();
            this.deps.openSetup();
        });
        footer.appendChild(gear);
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
        // 使用徽标（F3，原型屏 1：「✦ 常用 · N 次」；AI 徽标优先，二者不同时现）
        const usage = document.createElement("span");
        usage.className = "xlc-badge xlc-badge--ai xlc-pane-usage";
        usage.style.display = "none";
        head.appendChild(usage);
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
        // AI 变换：打开动作菜单（含 AI 变换分区；原型窗格底部第三按钮）
        const aiBtn = document.createElement("button");
        aiBtn.className = "b3-button xlc-btn-ai";
        aiBtn.textContent = "✦ " + this.deps.t("aiTransform");
        aiBtn.addEventListener("click", () => {
            const entry = this.results[this.activeIndex];
            if (entry) void this.showActionMenu(entry);
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
        foot.appendChild(aiBtn);
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
        const category = el?.querySelector<HTMLSelectElement>(".xlc-category-select")?.value ?? "";
        return {text, itemType, tag, category, scope: this.currentScope};
    }

    private async refresh(): Promise<void> {
        const seq = ++this.searchSeq;
        const query = this.buildQuery();
        // 使用计数快照（F3 展示；侧车只读，不入索引）
        this.usageCounts = new Map(Object.entries(this.deps.getUsage()).map(([id, u]) => [id, u.count]));
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        const status = this.dialog?.element.querySelector<HTMLElement>(".xlc-status");
        const footer = this.dialog?.element.querySelector<HTMLElement>(".xlc-footer");
        const aiBanner = this.dialog?.element.querySelector<HTMLElement>(".xlc-ai-banner");
        if (!list) return;
        this.lastPreviewId = null;
        let total = 0;
        let truncated = false;
        let loading = false;
        let loadError: string | undefined;
        try {
            const text = query.text.trim();
            if (text.startsWith("?") && text.length > 1) {
                // AI 语义找（仅元数据出域；未启用/失败诚实提示）
                const aiResult = await this.deps.aiSemantic(text.slice(1), {itemType: query.itemType ?? "", tag: query.tag ?? "", scope: this.currentScope});
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
                loadError = result.error;
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
        this.activeProvider = -1;
        if (status) {
            this.emptyMessage = "";
            if (this.results.length) {
                status.textContent = "";
            } else if (loadError) {
                status.textContent = this.deps.t("kernelError", loadError);
            } else if (loading) {
                status.textContent = this.deps.t("indexing");
            } else {
                // 空态文案移入列表大空态（图标 + 主文案 + 语义找提示）；status 保持安静；
                // 收藏/最近范围给分区专属文案（无 AI 建议提示）
                status.textContent = "";
                if (!query.text.trim() && this.currentScope === "favorites") {
                    this.emptyMessage = this.deps.t("emptyFavorites");
                } else if (!query.text.trim() && this.currentScope === "recent") {
                    this.emptyMessage = this.deps.t("emptyRecent");
                } else if (query.text.trim() && !query.text.trim().startsWith("?") && this.deps.aiEnabled()) {
                    this.emptyMessage = this.deps.t("semanticSuggestion");
                } else {
                    this.emptyMessage = this.deps.t("empty");
                }
            }
        }
        if (footer) {
            const count = footer.querySelector<HTMLElement>(".xlc-footer-count");
            if (count && !this.deps.isMobile()) {
                // 原型屏 1：常用排序时计数带排序名
                const sortSuffix = this.deps.getSort() === "frequent" ? ` · ${this.deps.t("sort.frequent")}` : "";
                count.textContent = this.deps.t("totalItems", String(total)) + sortSuffix + (truncated ? " ⚠" : "");
            }
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
        // 大空态（无结果且无提供方行；图标 + 主文案 + ? 语义找提示）
        if (this.results.length === 0 && this.providerRows.length === 0 && this.emptyMessage) {
            const empty = document.createElement("div");
            empty.className = "xlc-empty";
            const icon = document.createElement("div");
            icon.className = "xlc-empty-icon";
            icon.textContent = "✦";
            empty.appendChild(icon);
            const text = document.createElement("div");
            text.className = "xlc-empty-text";
            text.textContent = this.emptyMessage;
            empty.appendChild(text);
            if (this.emptyMessage === this.deps.t("semanticSuggestion")) {
                const hint = document.createElement("div");
                hint.className = "xlc-empty-hint";
                hint.textContent = this.deps.t("aiSemanticHint");
                empty.appendChild(hint);
            } else if (this.emptyMessage === this.deps.t("emptyFavorites")) {
                const hint = document.createElement("div");
                hint.className = "xlc-empty-hint";
                hint.textContent = this.deps.t("emptyFavoritesSub");
                empty.appendChild(hint);
            }
            list.appendChild(empty);
        }
        // 分组头（F4-lite，原型屏 1）：手动/置顶排序 + 全部范围时，收藏行前插「置顶」组，其余为「全部」
        const grouping = this.deps.getSort() === "manual" && this.currentScope === "all";
        const favoriteCount = grouping ? this.results.filter((e) => this.deps.isFavorite(e.id)).length : 0;
        const showPinnedHead = grouping && favoriteCount > 0;
        let pinnedPlaced = false;
        let restHeadPlaced = false;
        const placeGroupHead = (label: string, count: number): void => {
            const head = document.createElement("div");
            head.className = "xlc-group-head";
            head.dataset.xlcHead = "1";
            head.setAttribute("aria-hidden", "true");
            head.textContent = `${label} · ${count}`;
            list.appendChild(head);
        };
        for (let i = 0; i < this.results.length; i++) {
            const entry = this.results[i];
            const fav = this.deps.isFavorite(entry.id);
            if (showPinnedHead) {
                if (fav && !pinnedPlaced) {
                    placeGroupHead("📌 " + this.deps.t("groupPinned"), favoriteCount);
                    pinnedPlaced = true;
                }
                if (!fav && pinnedPlaced && !restHeadPlaced) {
                    placeGroupHead(this.deps.t("groupAll"), this.results.length - favoriteCount);
                    restHeadPlaced = true;
                }
            }
            const row = document.createElement("div");
            row.className = "xlc-row"
                + (i === this.activeIndex ? " xlc-row--active" : "")
                + (fav ? " xlc-row--fav" : "");
            row.dataset.xlcIndex = String(i);
            row.setAttribute("role", "option");
            row.setAttribute("aria-selected", i === this.activeIndex ? "true" : "false");

            const main = document.createElement("div");
            main.className = "xlc-row-main";
            const title = document.createElement("div");
            title.className = "xlc-row-title";
            if (i < 9) {
                const ordinal = document.createElement("span");
                ordinal.className = "xlc-row-ordinal";
                ordinal.textContent = String(i + 1);
                ordinal.title = this.deps.t("usageHint");
                title.appendChild(ordinal);
            }
            const badge = document.createElement("span");
            badge.className = `xlc-badge xlc-badge--${entry.itemType}`;
            badge.textContent = TYPE_BADGES[entry.itemType] ?? "TXT";
            title.appendChild(badge);
            const titleText = document.createElement("span");
            titleText.className = "xlc-row-titletext";
            titleText.textContent = entry.title || this.deps.t("unknownType");
            title.appendChild(titleText);
            // 变量徽标（F1；写入期快照，行为以插入时现场内容为准）
            if ((entry.varCount ?? 0) > 0) {
                const varBadge = document.createElement("span");
                varBadge.className = "xlc-badge xlc-badge--var";
                varBadge.textContent = this.deps.t("varCountBadge", String(entry.varCount));
                title.appendChild(varBadge);
            }
            // 收藏态由右侧星标按钮承载（原型同款：金色常驻），标题内不再重复 ★
            main.appendChild(title);
            const meta = document.createElement("div");
            meta.className = "xlc-row-meta";
            // 使用次数（F3 展示，原型屏 1：meta 尾部「· N 次」；先截断正文再拼计数，保证计数恒可见）
            const useCount = this.usageCounts.get(entry.id) ?? 0;
            const metaBase = [entry.tags.join(" / "), entry.summary]
                .filter(Boolean).join(" · ")
                .slice(0, 140);
            meta.textContent = metaBase + (useCount > 0 ? ` · ${this.deps.t("useCount", String(useCount))}` : "");
            main.appendChild(meta);
            row.appendChild(main);

            if (this.deps.isSourceMissing(entry)) {
                // 行内只留 ⚠ 图标徽标（完整说明在预览窗格横幅；tooltip 兜底）
                const warn = document.createElement("span");
                warn.className = "xlc-row-warn";
                warn.textContent = "⚠";
                warn.title = this.deps.t("sourceMissing") + " · " + this.deps.t("sourceGone");
                warn.setAttribute("aria-label", this.deps.t("sourceMissing"));
                title.appendChild(warn);
            }

            const star = document.createElement("button");
            star.className = "b3-button b3-button--small xlc-row-action";
            star.textContent = fav ? "★" : "☆";
            star.setAttribute("aria-label", fav ? this.deps.t("unfavorite") : this.deps.t("favorite"));
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
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", row.providerName + " · " + this.deps.t("providerSection"));
        const lbl = document.createElement("div");
        lbl.className = "xlc-menu-lbl";
        lbl.textContent = row.providerName + " · " + this.deps.t("providerSection");
        menu.appendChild(lbl);
        const sec = document.createElement("div");
        sec.className = "xlc-menu-sec";
        sec.appendChild(this.menuButton("＋", this.deps.t("providerInsert"), "xlc-menu-item", async () => {
            this.destroy();
            await this.deps.insertProviderPayload(row.payload, this.insertTarget ?? undefined);
        }));
        sec.appendChild(this.menuButton("⧉", this.deps.t("providerCopy"), "xlc-menu-item", async () => {
            this.destroy();
            await this.deps.copyProviderPayload(row.payload);
        }));
        menu.appendChild(sec);
        // 菜单挂在 .xlc-dialog 内（样式作用域 + 相对弹窗定位）；无弹窗时兜底 anchor
        const host = (this.dialog?.element.querySelector(".xlc-dialog")) ?? this.dialog?.element ?? anchor;
        host.appendChild(menu);
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

    /** 统一导航位：0..results.length-1 为库条目，之后为提供方行 */
    private setNav(pos: number): void {
        if (pos < this.results.length) {
            this.activeIndex = pos;
            this.activeProvider = -1;
        } else {
            this.activeIndex = Math.max(Math.min(pos, Math.max(this.results.length - 1, 0)), 0);
            this.activeProvider = pos - this.results.length;
        }
    }

    private navPosition(): number {
        return this.activeProvider >= 0 ? this.results.length + this.activeProvider : this.activeIndex;
    }

    private paintActive(): void {
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        if (!list) return;
        // 分组头不参与导航（F4-lite）：只遍历真实行
        const rows = Array.from(list.children).filter((el) => !(el as HTMLElement).dataset.xlcHead) as HTMLElement[];
        rows.forEach((child, i) => {
            const isReal = i < this.results.length;
            const active = isReal
                ? this.activeProvider < 0 && i === this.activeIndex
                : this.activeProvider >= 0 && i - this.results.length === this.activeProvider;
            child.classList.toggle("xlc-row--active", active);
            if (isReal) child.setAttribute("aria-selected", active ? "true" : "false");
        });
        const active = rows[this.navPosition()] as HTMLElement | undefined;
        active?.scrollIntoView({block: "nearest"});
    }

    private schedulePreview(entry: SearchEntry): void {
        this.updatePreview(entry.id);
    }

    /** 变量提示行：从预览文本解析 ask 字段与光标标记并列出语法 chip（code/提供方行不展示）。 */
    private paintPaneVars(text: string | null, itemType: ItemType | "provider" | undefined): void {
        const paneVars = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-vars");
        if (!paneVars) return;
        const hasCursor = Boolean(text && hasCursorToken(text));
        const fields = itemType && itemType !== "code" && itemType !== "provider" && text
            ? listAskFields(text)
            : [];
        paneVars.textContent = "";
        if (fields.length === 0 && !hasCursor) {
            paneVars.style.display = "none";
            return;
        }
        if (fields.length > 0) {
            const label = document.createElement("span");
            label.textContent = this.deps.t("paneVarsLabel", String(fields.length));
            paneVars.appendChild(label);
        }
        for (const field of fields) {
            const chip = document.createElement("code");
            chip.textContent = field.kind === "text"
                ? `{{xlc:ask:${field.name}}}`
                : `{{xlc:ask:${field.name}${field.kind === "date" ? "|date" : "|" + field.options.join(",")}}}`;
            paneVars.appendChild(chip);
        }
        // 光标落点提示（原型屏 1：内容含 {{xlc:cursor}} 时附带说明）
        if (hasCursor) {
            const sep = document.createElement("span");
            sep.textContent = (fields.length > 0 ? "· " : "") + this.deps.t("cursorHint");
            paneVars.appendChild(sep);
            const chip = document.createElement("code");
            chip.textContent = "{{xlc:cursor}}";
            paneVars.appendChild(chip);
        }
        // 样式表默认 display:none，显示需显式内联覆盖
        paneVars.style.display = "flex";
    }

    private updatePreview(forceId?: string): void {
        const paneBody = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-body");
        const paneTitle = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-title");
        const paneWarn = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-warn");
        const paneAi = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-ai");
        const paneUsage = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-usage");
        if (!paneBody || !paneTitle || !paneWarn || !paneAi || !paneUsage) return;
        const paintUsageBadge = (entry: SearchEntry | undefined): void => {
            const count = entry ? (this.usageCounts.get(entry.id) ?? 0) : 0;
            // AI 徽标优先（原型：AI 结果态只显示 AI 找到的）
            if (this.aiResults || count <= 0) {
                paneUsage.style.display = "none";
                return;
            }
            paneUsage.textContent = `✦ ${this.deps.t("sort.frequent")} · ${this.deps.t("useCount", String(count))}`;
            paneUsage.style.display = "inline-block";
        };
        // 提供方行：预览直接展示 payload（无内核取用、无来源语义、无变量询问）
        if (this.activeProvider >= 0) {
            const row = this.providerRows[this.activeProvider];
            if (!row) return;
            this.lastPreviewId = row.virtualId;
            paneTitle.textContent = row.title || row.providerName;
            paneAi.style.display = "none";
            paneUsage.style.display = "none";
            paneWarn.style.display = "none";
            this.paintPaneVars(null, "provider");
            paneBody.textContent = row.payload;
            return;
        }
        const entry = this.results[this.activeIndex];
        const id = forceId ?? entry?.id ?? null;
        if (!id || id === this.lastPreviewId) return;
        const seq = ++this.previewSeq;
        if (paneTitle) paneTitle.textContent = entry?.title ?? "";
        if (paneAi) paneAi.style.display = this.aiResults ? "" : "none";
        paintUsageBadge(entry);
        if (paneWarn) {
            const missing = Boolean(entry && this.deps.isSourceMissing(entry));
            paneWarn.style.display = missing ? "" : "none";
            if (missing) paneWarn.textContent = "⚠ " + this.deps.t("sourceGone");
        }
        this.paintPaneVars(null, entry?.itemType);
            paneBody.textContent = this.deps.t("aiWorking");
            void this.deps.preview(id).then((text) => {
                if (seq !== this.previewSeq) return;
                const finalText = text || this.deps.t("previewUnavailable");
                paneBody.textContent = finalText;
                // 切换条目后回到顶部（长内容滚动位置不残留）
                paneBody.scrollTop = 0;
                // 代码条目预览用等宽字体（纯文本渲染不变，仅观感）
                paneBody.classList.toggle("xlc-pane-body--code", entry?.itemType === "code");
                this.paintPaneVars(text, entry?.itemType);
            }).catch(() => {
                if (seq !== this.previewSeq) return;
                paneBody.textContent = this.deps.t("kernelError", "preview");
                paneBody.classList.remove("xlc-pane-body--code");
                this.paintPaneVars(null, entry?.itemType);
            });
    }

    /** 普通点击 = 主动作（insert；blockref = 插入引用）。含变量时先弹填充卡片（F1）。 */
    private async runPrimary(entry: SearchEntry): Promise<void> {
        // 定向插入模式（文档树入口）：插入到指定文档而非活动编辑器
        if (this.deps.insertTarget) {
            const target = this.deps.insertTarget;
            await this.insertEntryWithVars(entry, (fills) => this.deps.insertToDoc(entry.id, target.docId, target.hPath, fills));
            return;
        }
        const mode: InsertMode = entry.itemType === "blockref" ? "insert-ref" : "insert";
        await this.insertEntryWithVars(entry, (fills) => fills
            ? this.deps.runActionWithFills(entry.id, mode, fills)
            : this.deps.runAction(entry.id, mode));
    }

    /** F1：插入前询问变量（设置可关；无 ask 字段零打扰；code 条目不询问）。
     *  perform 收到 fills（undefined=未触发询问，走原路径）。 */
    private async insertEntryWithVars(entry: SearchEntry, perform: (fills?: Record<string, string>) => Promise<unknown>): Promise<void> {
        if (!this.deps.promptVariables()) {
            await perform();
            return;
        }
        let fields: AskField[] = [];
        try {
            const content = await this.deps.preview(entry.id);
            fields = entry.itemType === "code" || !content ? [] : listAskFields(content);
        } catch {
            fields = [];
        }
        if (fields.length === 0) {
            await perform();
            return;
        }
        openVariableFillCard({
            t: this.deps.t,
            itemType: entry.itemType,
            title: entry.title,
            fields,
            onConfirm: (fills) => {
                this.destroy();
                void perform(fills);
            },
        });
    }

    /** 菜单按钮统一构造：图标列 + 文本（createTextNode 注入，绝不 innerHTML） */
    private menuButton(icon: string, label: string, cls: string, run: () => void | Promise<unknown>): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = cls;
        btn.setAttribute("role", "menuitem");
        const ic = document.createElement("span");
        ic.className = "xlc-menu-ic";
        ic.textContent = icon;
        btn.appendChild(ic);
        btn.appendChild(document.createTextNode(label));
        btn.addEventListener("click", () => void run());
        return btn;
    }

    private async showActionMenu(entry: SearchEntry): Promise<void> {
        const menu = document.createElement("div");
        menu.className = "xlc-menu";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", entry.title || this.deps.t("unknownType"));
        const rebuild = (render: () => void): void => {
            menu.innerHTML = "";
            render();
        };

        const buildDefault = (): void => {
            // 标题行（原型：条目名 · 动作）
            const lbl = document.createElement("div");
            lbl.className = "xlc-menu-lbl";
            lbl.textContent = (entry.title || this.deps.t("unknownType")) + " · " + this.deps.t("actionsNoun");
            menu.appendChild(lbl);
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
            const addAction = (icon: string, label: string, run: () => Promise<unknown>, cls = "xlc-menu-item"): void => {
                sec1.appendChild(this.menuButton(icon, label, cls, async () => {
                    this.destroy();
                    await run();
                }));
            };
            if (entry.itemType === "blockref") {
                addAction("＋", this.deps.t("insertRef"), () => this.deps.runAction(entry.id, "insert-ref"));
                addAction("⊞", this.deps.t("insertEmbed"), () => this.deps.runAction(entry.id, "insert-embed"));
                addAction("⧉", this.deps.t("insertCopy"), () => this.deps.runAction(entry.id, "copy-content"));
            } else {
                // 插入含变量条目同样先弹填充卡（F1）；复制保持模板原样
                addAction("＋", this.deps.t("insert"), () => this.insertEntryWithVars(entry, (fills) => fills
                    ? this.deps.runActionWithFills(entry.id, "insert", fills)
                    : this.deps.runAction(entry.id, "insert")));
                addAction("⧉", this.deps.t("copy"), () => this.deps.runAction(entry.id, "copy"));
            }
            menu.appendChild(sec1);

            // AI 变换（启用时展示；需要正文出域权限，失败在预览盒诚实提示；
            // 内置五种 + 用户自定义变换（F7）并列）
            if (this.deps.aiEnabled()) {
                const secAi = document.createElement("div");
                secAi.className = "xlc-menu-sec xlc-menu-sec--ai";
                const openTransform = (transformLabel: string, run: () => Promise<{ok: true; text: string} | {ok: false; message: string}>): void => {
                    rebuild(() => buildTransformView(entry.title + " · " + transformLabel, transformLabel));
                    void runTransformView(run);
                };
                for (const kind of TRANSFORM_KINDS) {
                    secAi.appendChild(this.menuButton("✦", this.deps.t(`tf.${kind}`), "xlc-menu-item xlc-menu-item--ai", () => {
                        openTransform(this.deps.t(`tf.${kind}`), async () => this.deps.aiTransform(entry.id, kind));
                    }));
                }
                for (const ct of this.deps.listCustomTransforms()) {
                    secAi.appendChild(this.menuButton("✦", ct.name, "xlc-menu-item xlc-menu-item--ai", () => {
                        openTransform(ct.name, async () => this.deps.aiTransformCustom(entry.id, ct.id));
                    }));
                }
                menu.appendChild(secAi);
            }

            const sec2 = document.createElement("div");
            sec2.className = "xlc-menu-sec";
            const addSilent = (icon: string, label: string, run: () => Promise<unknown>): void => {
                sec2.appendChild(this.menuButton(icon, label, "xlc-menu-item", async () => {
                    menu.remove();
                    await run();
                }));
            };
            addSilent("↗", this.deps.t("openSource"), () => this.deps.openSource(entry.id));
            addSilent("✎", this.deps.t("edit"), () => this.deps.editItem(entry.id));
            addSilent("⧉", this.deps.t("duplicateItem"), () => this.deps.duplicateItem(entry.id));
            // 插入到指定文档（菜单内联文档选择器；无活动编辑器场景的主路径）
            const toDocBtn = this.menuButton("⤓", this.deps.t("insertToDoc"), "xlc-menu-item", () => {
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
                            sec!.appendChild(this.menuButton("⤓", hit.hPath || hit.name || hit.id, "xlc-menu-item xlc-pickdoc-hit", async () => {
                                this.menuDismiss?.();
                                this.menuDismiss = null;
                                await this.insertEntryWithVars(entry, (fills) => this.deps.insertToDoc(entry.id, hit.id, hit.hPath, fills));
                            }));
                        }
                    });
                });
                const actions2 = menu.querySelectorAll(".xlc-menu-sec");
                actions2[actions2.length - 1]?.before(sec);
                input.focus();
            });
            sec2.appendChild(toDocBtn);
            addSilent("🗑", this.deps.t("delete"), () => this.deps.deleteItem(entry.id));
            menu.appendChild(sec2);
        };

        const buildTransformView = (viewLabel: string, transformLabel: string): void => {
            // 变换态：预览盒显示结果 + 插变换/复制变换/插原文/存为新条目/返回
            const lbl = document.createElement("div");
            lbl.className = "xlc-menu-lbl";
            lbl.textContent = viewLabel;
            menu.appendChild(lbl);
            const box = document.createElement("pre");
            box.className = "xlc-menu-preview";
            box.textContent = this.deps.t("aiWorking");
            menu.appendChild(box);
            const sec = document.createElement("div");
            sec.className = "xlc-menu-sec";
            // 结果未就绪（AI 处理中）时结果类操作禁用——防止插入空块
            const resultButtons: HTMLButtonElement[] = [];
            const syncReady = (): void => {
                const ready = Boolean(box.dataset.transformed);
                for (const b of resultButtons) b.disabled = !ready;
            };
            const insertBtn = this.menuButton("＋", this.deps.t("aiInsertTransformed"), "xlc-menu-item", async () => {
                const transformed = box.dataset.transformed ?? "";
                if (!transformed) return;
                this.destroy();
                await this.deps.insertRaw(transformed);
            });
            const copyBtn = this.menuButton("⧉", this.deps.t("aiCopyTransformed"), "xlc-menu-item", async () => {
                // 复制的是「变换结果」本体（此前误复制条目原文，R77 修正）
                const transformed = box.dataset.transformed ?? "";
                if (!transformed) return;
                await this.deps.copyText(transformed);
            });
            resultButtons.push(insertBtn, copyBtn);
            sec.appendChild(insertBtn);
            sec.appendChild(copyBtn);
            syncReady();
            (menu as HTMLElement & {syncTransformReady?: () => void}).syncTransformReady = syncReady;
            sec.appendChild(this.menuButton("↩", this.deps.t("aiInsertOriginal"), "xlc-menu-item", async () => {
                await this.deps.runAction(entry.id, entry.itemType === "blockref" ? "insert-ref" : "insert");
            }));
            const saveBtn = this.menuButton("🗎", this.deps.t("saveTransformed"), "xlc-menu-item", async () => {
                const transformed = box.dataset.transformed ?? "";
                if (!transformed) return;
                this.destroy();
                await this.deps.saveTransformed(entry.id, transformLabel, transformed);
            });
            resultButtons.push(saveBtn);
            sec.appendChild(saveBtn);
            syncReady();
            menu.appendChild(sec);
            const secBack = document.createElement("div");
            secBack.className = "xlc-menu-sec";
            secBack.appendChild(this.menuButton("←", this.deps.t("more"), "xlc-menu-item", () => {
                rebuild(buildDefault);
            }));
            menu.appendChild(secBack);
            // 把最终文本挂到 dataset 供按钮使用（runTransformView 完成后填充并解除结果按钮禁用）
            (menu as HTMLElement & {applyTransform?: (text: string) => void}).applyTransform = (text: string): void => {
                box.dataset.transformed = text;
                box.textContent = text.slice(0, 800);
                (menu as HTMLElement & {syncTransformReady?: () => void}).syncTransformReady?.();
            };
        };

        const runTransformView = async (run: () => Promise<{ok: true; text: string} | {ok: false; message: string}>): Promise<void> => {
            const result = await run();
            const apply = (menu as HTMLElement & {applyTransform?: (text: string) => void}).applyTransform;
            if (result.ok) {
                apply?.(result.text);
            } else {
                const box = menu.querySelector<HTMLElement>(".xlc-menu-preview");
                if (box) box.textContent = result.message;
            }
        };

        rebuild(buildDefault);
        // 菜单挂在 .xlc-dialog 内（样式作用域 + 相对弹窗定位）
        const host = (this.dialog?.element.querySelector(".xlc-dialog")) ?? this.dialog?.element ?? document.body;
        host.appendChild(menu);
        // Esc 关闭动作菜单（键盘可达性；焦点仍在菜单内按钮上时同样生效）
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                this.menuDismiss?.();
                this.menuDismiss = null;
            }
        };
        menu.addEventListener("keydown", escHandler);
        // ↑↓ 在菜单项间移动焦点（键盘全链路；Enter 由焦点按钮原生触发，循环滚动）
        const focusMenuItem = (offset: number): void => {
            const items = Array.from(menu.querySelectorAll<HTMLElement>(".xlc-menu-item"));
            if (items.length === 0) return;
            const current = items.indexOf(document.activeElement as HTMLElement);
            const next = items[((current + offset) % items.length + items.length) % items.length];
            next?.focus();
        };
        menu.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                focusMenuItem(1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                focusMenuItem(-1);
            } else if (e.key === "Tab") {
                // 菜单为模态浮层：Tab/Shift+Tab 在菜单项间循环（不逃逸到弹窗底层）
                e.preventDefault();
                focusMenuItem(e.shiftKey ? -1 : 1);
            }
        });
        const dismiss = (e: Event) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                this.menuDismiss = null;
                document.removeEventListener("pointerdown", dismiss, true);
            }
        };
        // destroy() 时兜底清理（弹窗经键盘关闭而菜单未点掉的场景）
        this.menuDismiss = () => {
            menu.remove();
            document.removeEventListener("pointerdown", dismiss, true);
        };
        document.addEventListener("pointerdown", dismiss, true);
    }

    private async onKeydown(e: KeyboardEvent): Promise<void> {
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        if (!list) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const total = this.results.length + this.providerRows.length;
            if (total > 0) this.setNav(Math.min(this.navPosition() + 1, total - 1));
            this.paintActive();
            this.updatePreview();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.setNav(Math.max(this.navPosition() - 1, 0));
            this.paintActive();
            this.updatePreview();
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (this.activeProvider >= 0) {
                const row = this.providerRows[this.activeProvider];
                if (row) {
                    this.destroy();
                    // 定向模式一致性（R50）：provider payload 同样插入目标文档
                    await this.deps.insertProviderPayload(row.payload, this.insertTarget ?? undefined);
                }
                return;
            }
            const entry = this.results[this.activeIndex];
            if (entry) await this.runPrimary(entry);
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (this.activeProvider >= 0) {
                const row = this.providerRows[this.activeProvider];
                if (row) await this.deps.copyProviderPayload(row.payload);
                return;
            }
            const entry = this.results[this.activeIndex];
            if (entry) await this.deps.runAction(entry.id, "copy");
        } else if (e.key === "Escape") {
            e.preventDefault();
            this.destroy();
        } else if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
            // Alt+1~9 数字直达插入（Quicker/雷切同款；1 对应列表首行）
            e.preventDefault();
            const idx = Number(e.key) - 1;
            const entry = this.results[idx];
            if (entry) {
                await this.runPrimary(entry);
            }
        }
    }

    destroy(): void {
        if (this.inputDebounce) clearTimeout(this.inputDebounce);
        if (this.menuDismiss) {
            this.menuDismiss();
            this.menuDismiss = null;
        }
        this.dialog?.destroy();
        this.dialog = null;
    }
}
