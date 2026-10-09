// 搜索弹窗（生产版，质感基准：docs/design/prototype.html）：
// 桌面双栏（左列表右预览，窄容器单列降级）/ 移动端底部 sheet（同一 DOM，CSS 形态切换）。
// 安全：所有内容字符串只走 textContent，绝不 innerHTML 注入外部文本。
// 键盘：↑↓ 选择（预览跟随）、Enter 插入、Ctrl+Enter 复制、Esc 关闭；搜索框首焦点。
// 触控：44px 命中区、长按 550ms（移动 <10px 判定）弹动作菜单；不依赖 hover、不做坐标猜测。
// AI：? 前缀语义找条目（默认仅元数据出域）；动作菜单 AI 变换（预览后选插入，原文永不被改写）。
import {Dialog} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {ITEM_TYPES, ItemType} from "../model/item";
import {SearchEntry, SearchQuery} from "../model/search";
import {InsertMode} from "../model/actions";
import {TransformKind} from "../service/ai";
import {ProviderRow} from "../model/provider-section";
import {AskField, askFieldTag, hasCursorToken, listAskFields} from "../model/variables";
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
    /** 排序直选（R108：排序应可枚举而非循环切换——Raycast 动作可枚举惯例） */
    setSort: (sort: "manual" | "recent" | "frequent" | "title") => void;
    openSetup: () => void;
    /** 提供方候选（pv: 虚拟条目；绝不进入块执行器） */
    providerSearch: (query: string) => Promise<ProviderRow[]>;
    insertProviderPayload: (payload: string, target?: {docId: string; hPath: string}) => Promise<boolean>;
    copyProviderPayload: (payload: string) => Promise<boolean>;
    /** 使用计数（F3 展示：行 meta 与预览徽标；侧车只读） */
    getUsage: () => Record<string, {count: number; lastAt: number}>;
    /** 手动新建条目（移动端「＋ 新建」入口） */
    newItem: (titleCandidate?: string) => void;
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
    private currentScope: "all" | "favorites" | "recent" = "all";
    private lastPreviewId: string | null = null;
    /** 空状态文案（refresh 计算后交 renderList 渲染大空态；瞬态/错误仍走 status 行） */
    private emptyMessage = "";
    /** 使用计数快照（refresh 时取自侧车；行 meta 与预览徽标展示用） */
    private usageCounts = new Map<string, number>();
    /** 最近一次查询词（行标题命中高亮用；空串=不高亮） */
    private lastQueryText = "";
    /** 动作菜单 document 监听兜底清理（destroy 时调用；防键盘关弹窗残留监听） */
    private menuDismiss: (() => void) | null = null;
    private inputDebounce: ReturnType<typeof setTimeout> | null = null;
    private longPressCancel: (() => void) | null = null;
    /** IME 组合输入中（中文输入法组词期间跳过刷新，compositionend 后统一刷新） */
    private isComposing = false;

    constructor(private readonly deps: DialogDeps) {}

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
        const body = getDialogBody(this.dialog.element);
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
        // 移动端软键盘细节：回车=搜索、关拉丁自动更正；关自动填充（自定义候选弹层之上不叠浏览器浮层）
        input.setAttribute("enterkeyhint", "search");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("autocapitalize", "off");
        input.setAttribute("autocorrect", "off");
        input.setAttribute("spellcheck", "false");
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-expanded", "true");
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
            this.syncScopeChips(); // 输入即重置范围，chip 选中态必须同步（R138）
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
            this.syncScopeChips();
            if (this.inputDebounce) clearTimeout(this.inputDebounce);
            this.inputDebounce = setTimeout(() => void this.refresh(), 50);
        });
        input.addEventListener("keydown", (e) => void this.onKeydown(e));
        search.appendChild(qMark);
        search.appendChild(input);
        search.appendChild(clearBtn);
        top.appendChild(search);
        // 头部快捷键提示（桌面；原型头部右侧 kbd chips；⌃/⌘ 随平台）
        if (!isMobile) {
            const isApple = /Mac|iPhone|iPad/i.test(navigator.platform || "");
            const kbdRow = document.createElement("div");
            kbdRow.className = "xlc-kbdrow";
            for (const hint of [
                "↑↓",
                this.deps.t("kbdEnter"),
                this.deps.t("kbdCopy", isApple ? "⌘" : "⌃"),
                this.deps.t("kbdAltDirect"),
                "Esc",
            ]) {
                const kbd = document.createElement("span");
                kbd.className = "xlc-kbd";
                kbd.textContent = hint;
                kbdRow.appendChild(kbd);
            }
            top.appendChild(kbdRow);

            // 常驻新建入口（截图②）：搜索时无需先清空或离开弹窗即可添加条目。
            // 移动端在底栏保留同一动作，避免窄屏顶栏拥挤。
            const topActions = document.createElement("div");
            topActions.className = "xlc-top-actions";
            const topNew = document.createElement("button");
            topNew.type = "button";
            topNew.className = "b3-button xlc-btn-primary xlc-top-new";
            topNew.textContent = this.deps.t("quickNew");
            topNew.setAttribute("aria-label", this.deps.t("newItem"));
            topNew.addEventListener("click", () => this.deps.newItem());
            topActions.appendChild(topNew);
            top.appendChild(topActions);
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
            if (savedFilters.tag && tags.includes(savedFilters.tag)) {
                // 跨会话回填：选项异步补齐后才挂得上值，此时首查已按未筛选发出——
                // 回填后重查一次，消除「筛选框已选、结果未筛」的状态错位（R118）
                tagSelect.value = savedFilters.tag;
                void this.refresh();
            } else if (savedFilters.tag) {
                // 持久化的标签已失效（改名/删除）：清理筛选而不是留着假选中态（R139）
                this.deps.setFilters({type: typeSelect.value, tag: "", category: categorySelect?.value ?? ""});
                void this.refresh();
            }
        }).catch(() => undefined); // 辅助筛选数据失败静默降级（下拉保留默认项，R123）
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
            // 默认「全部分类」选项无条件挂载：分类为空时下拉也不能是空白小框（R138）
            const first = document.createElement("option");
            first.value = "";
            first.textContent = this.deps.t("category");
            categorySelect.appendChild(first);
            if (categories.length === 0) return;
            for (const category of categories) {
                const opt = document.createElement("option");
                opt.value = category;
                opt.textContent = category;
                categorySelect.appendChild(opt);
            }
            if (savedFilters.category && categories.includes(savedFilters.category)) {
                // 同标签筛选：异步回填后重查（R118）
                categorySelect.value = savedFilters.category;
                void this.refresh();
            } else if (savedFilters.category) {
                // 失效分类同标签：清理假选中态（R139）
                this.deps.setFilters({type: typeSelect.value, tag: tagSelect?.value ?? "", category: ""});
                void this.refresh();
            }
        }).catch(() => undefined); // 辅助筛选数据失败静默降级（R123）
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
        // 排序 chip：点击弹直选菜单（4 档可枚举，当前档 ✓；替代不可见的循环切换）
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
            // 菜单开着时点 chip：pointerdown 先关、click 再到——间隔内不重开，保证「再点即关」（R138）
            if (Date.now() - this.sortMenuClosedAt < 300) return;
            this.showSortMenu(paintSort);
        });
        filters.appendChild(sortChip);
        // 定向插入模式横幅（R116）：文档树入口进入时明示落点，防止误以为插入当前编辑器
        if (this.insertTarget) {
            const targetBanner = document.createElement("span");
            targetBanner.className = "xlc-chip xlc-target-banner";
            targetBanner.textContent = "⤓ " + this.deps.t("insertTargetBanner", this.insertTarget.hPath || this.insertTarget.docId);
            filters.insertBefore(targetBanner, filters.firstChild);
        }
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
        list.id = "xlc-search-results";
        list.tabIndex = 0;
        list.setAttribute("role", "listbox");
        list.setAttribute("aria-label", this.deps.t("pluginName"));
        input.setAttribute("aria-controls", list.id);
        list.addEventListener("keydown", (e) => void this.onKeydown(e));
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
                this.activeProvider = -1; // 回到库行必须退出提供方激活态，否则预览/高亮与悬停行脱节（R138）
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
            // 元数据行（R108，Raycast Detail.Metadata 惯例：结构化信息进详情面板，行保持克制）
            const paneMeta = document.createElement("div");
            paneMeta.className = "xlc-pane-meta";
            paneMeta.style.display = "none";
            pane.appendChild(paneMeta);
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
            paneBody.className = "xlc-pane-body xlc-pane-body--muted";
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
        // 使用说明双端可达：把常见的捕获、搜索、插入与整理路径放在弹窗内，降低首次上手成本。
        const guide = document.createElement("button");
        guide.type = "button";
        guide.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-guide";
        guide.textContent = "ⓘ " + this.deps.t("usageGuideBtn");
        guide.addEventListener("click", () => this.openUsageGuide());
        footer.appendChild(guide);
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

    /** 打开一页内置使用说明（不离开搜索弹窗，适合首次使用与移动端）。 */
    private openUsageGuide(): void {
        const guideDialog = new Dialog({
            title: this.deps.t("usageGuideTitle"),
            content: "",
            width: "min(520px, 92vw)",
            height: "auto",
        });
        const body = getDialogBody(guideDialog.element);
        if (!body) return;
        body.innerHTML = "";
        const root = document.createElement("div");
        root.className = "xlc-form xlc-guide";
        const intro = document.createElement("p");
        intro.className = "xlc-form-hint xlc-guide-intro";
        intro.textContent = this.deps.t("usageGuideIntro");
        root.appendChild(intro);
        const steps = document.createElement("ol");
        steps.className = "xlc-guide-list";
        const guideKeys = ["usageGuideAdd", "usageGuideSearch", this.deps.isMobile() ? "usageGuideInsertMobile" : "usageGuideInsert", "usageGuideOrganize"];
        for (const key of guideKeys) {
            const item = document.createElement("li");
            item.textContent = this.deps.t(key);
            steps.appendChild(item);
        }
        root.appendChild(steps);
        const variables = document.createElement("p");
        variables.className = "xlc-form-hint xlc-guide-vars";
        variables.textContent = this.deps.t("usageGuideVariables");
        root.appendChild(variables);
        const actions = document.createElement("div");
        actions.className = "xlc-form-actions";
        const close = document.createElement("button");
        close.type = "button";
        close.className = "b3-button xlc-btn-primary";
        close.textContent = this.deps.t("close");
        close.addEventListener("click", () => guideDialog.destroy());
        actions.appendChild(close);
        root.appendChild(actions);
        body.appendChild(root);
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
        insert.dataset.xlcPaneAct = "insert";
        insert.addEventListener("click", () => {
            // 提供方行激活：插入的是 payload（与 Enter 键路径一致），不是库条目（R138 错位修复）
            if (this.activeProvider >= 0) {
                const row = this.providerRows[this.activeProvider];
                if (row) void this.deps.insertProviderPayload(row.payload, this.insertTarget ?? undefined);
                return;
            }
            const entry = this.results[this.activeIndex];
            if (entry) void this.runPrimary(entry);
        });
        const copy = document.createElement("button");
        copy.className = "b3-button";
        copy.textContent = this.deps.t("copy");
        copy.dataset.xlcPaneAct = "copy";
        copy.addEventListener("click", () => {
            if (this.activeProvider >= 0) {
                const row = this.providerRows[this.activeProvider];
                if (row) void this.deps.copyProviderPayload(row.payload);
                return;
            }
            const entry = this.results[this.activeIndex];
            if (entry) void this.deps.runAction(entry.id, "copy");
        });
        // AI 变换：打开动作菜单（含 AI 变换分区；原型窗格底部第三按钮）
        const aiBtn = document.createElement("button");
        aiBtn.className = "b3-button xlc-btn-ai";
        aiBtn.textContent = "✦ " + this.deps.t("aiTransform");
        aiBtn.dataset.xlcPaneAct = "ai";
        aiBtn.addEventListener("click", () => {
            const entry = this.results[this.activeIndex];
            if (entry) void this.showActionMenu(entry);
        });
        const spacer = document.createElement("span");
        spacer.className = "xlc-foot-spacer";
        const source = document.createElement("button");
        source.className = "b3-button b3-button--text xlc-btn-ghost";
        source.textContent = this.deps.t("openSource");
        source.dataset.xlcPaneAct = "source";
        source.addEventListener("click", () => {
            const entry = this.results[this.activeIndex];
            if (entry) void this.deps.openSource(entry.id);
        });
        const edit = document.createElement("button");
        edit.className = "b3-button b3-button--text xlc-btn-ghost";
        edit.textContent = this.deps.t("edit");
        edit.dataset.xlcPaneAct = "edit";
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
        let startX = 0;
        const cancel = (): void => {
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = undefined;
        };
        this.longPressCancel = cancel;
        // 桌面 contextmenu 与长按定时器会先后各开一次菜单——先到者取消后者（R138）
        list.addEventListener("contextmenu", cancel);
        list.addEventListener("touchstart", (e) => {
            startY = e.touches[0]?.clientY ?? 0;
            startX = e.touches[0]?.clientX ?? 0;
            const row = (e.target as HTMLElement).closest<HTMLElement>("[data-xlc-index]");
            if (!row) return;
            const entry = this.results[Number(row.dataset.xlcIndex)];
            if (!entry) return;
            cancel();
            pressTimer = setTimeout(() => void this.showActionMenu(entry), 550);
        }, {passive: true});
        list.addEventListener("touchmove", (e) => {
            const dy = Math.abs((e.touches[0]?.clientY ?? 0) - startY);
            const dx = Math.abs((e.touches[0]?.clientX ?? 0) - startX);
            if (Math.max(dx, dy) > 10) cancel();
        }, {passive: true});
        list.addEventListener("touchend", cancel, {passive: true});
        list.addEventListener("touchcancel", cancel, {passive: true});
        list.addEventListener("pointercancel", cancel, {passive: true});
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
        // 命中高亮快照（renderList 用；AI 语义找结果不高亮——匹配依据是语义而非字面）
        this.lastQueryText = query.text.trim();
        // 使用计数快照（F3 展示；侧车只读，不入索引）
        this.usageCounts = new Map(Object.entries(this.deps.getUsage()).map(([id, u]) => [id, u.count]));
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        const status = this.dialog?.element.querySelector<HTMLElement>(".xlc-status");
        const footer = this.dialog?.element.querySelector<HTMLElement>(".xlc-footer");
        const aiBanner = this.dialog?.element.querySelector<HTMLElement>(".xlc-ai-banner");
        if (!list) return;
        this.lastPreviewId = null;
        // 搜索刷新中的轻量反馈：列表半透明 + aria-busy（R106）
        list.classList.add("xlc-list--loading");
        list.setAttribute("aria-busy", "true");
        let total = 0;
        let truncated = false;
        let loading = false;
        let loadError: string | undefined;
        let directError = "";
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
                    // 保留服务层的诚实失败原因；后面的空态计算不应覆盖它。
                    directError = aiResult.message;
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
            this.providerRows = [];
            this.activeIndex = 0;
            this.activeProvider = -1;
            this.aiResults = false;
            this.emptyMessage = "";
            if (aiBanner) aiBanner.style.display = "none";
            if (status) {
                status.textContent = this.deps.t("kernelError", (err as Error).message);
                status.classList.add("xlc-status--error");
            }
            if (footer) {
                const count = footer.querySelector<HTMLElement>(".xlc-footer-count");
                // 错误态不留「共 0 条」——会被误读成空库（R138）
                if (count && !this.deps.isMobile()) count.textContent = "";
            }
            this.finishSearchLoad(list);
            this.renderList(list);
            return;
        }
        if (seq !== this.searchSeq) return;
        this.activeIndex = 0;
        this.activeProvider = -1;
        if (status) {
            this.emptyMessage = "";
            const isError = Boolean(directError || loadError);
            status.classList.toggle("xlc-status--error", isError);
            if (directError) {
                status.textContent = directError;
            } else if (this.results.length) {
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
                } else if (!query.text.trim() && this.currentScope === "all"
                    && Boolean(query.itemType || query.tag || query.category)) {
                    this.emptyMessage = this.deps.t("emptyFiltered");
                } else if (query.text.trim() && !query.text.trim().startsWith("?") && this.deps.aiEnabled()) {
                    this.emptyMessage = this.deps.t("semanticSuggestion");
                } else if (total === 0 && !query.text.trim()) {
                    // 空库（F4 总量与筛选无关）：给「去哪加内容」的下一步，而非误导性的「没有匹配」
                    this.emptyMessage = this.deps.t("emptyLibrary");
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
                // 截断标记带可读说明（悬停可见），不再是裸 ⚠（R138）
                count.textContent = this.deps.t("totalItems", String(total)) + sortSuffix + (truncated ? " ⚠" : "");
                count.title = truncated ? this.deps.t("truncatedHint") : "";
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
        this.finishSearchLoad(list);
        this.renderList(list);
        this.updatePreview();
    }

    /** 收尾一次搜索刷新：解除列表加载反馈（成功与失败路径共用）。 */
    private finishSearchLoad(list: HTMLElement): void {
        list.classList.remove("xlc-list--loading");
        list.removeAttribute("aria-busy");
    }

    /** 菜单关闭后把焦点还给搜索框（键盘连续性；弹窗已销毁则静默忽略）。 */
    private restoreFocusToSearch(): void {
        this.dialog?.element.querySelector<HTMLElement>(".xlc-search-input")?.focus();
    }

    /** 命中高亮：按字面子串（大小写不敏感）切分并注入 mark span；文本一律 textContent，绝不 innerHTML。 */
    private appendHighlighted(parent: HTMLElement, text: string, query: string): void {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let cursor = 0;
        while (cursor <= text.length - lowerQuery.length) {
            const at = lowerText.indexOf(lowerQuery, cursor);
            if (at < 0) break;
            if (at > cursor) parent.appendChild(document.createTextNode(text.slice(cursor, at)));
            const mark = document.createElement("mark");
            mark.className = "xlc-hit";
            mark.textContent = text.slice(at, at + query.length);
            parent.appendChild(mark);
            cursor = at + query.length;
        }
        if (cursor < text.length) parent.appendChild(document.createTextNode(text.slice(cursor)));
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
            } else if (this.emptyMessage === this.deps.t("emptyLibrary")) {
                // 空库：声明去哪捕获 + 就地新建（首跑引导完成后的第一个落点）
                const hint = document.createElement("div");
                hint.className = "xlc-empty-hint";
                hint.textContent = this.deps.t("emptyLibrarySub");
                empty.appendChild(hint);
            }
            if (this.emptyMessage === this.deps.t("emptyFiltered")) {
                const clear = document.createElement("button");
                clear.type = "button";
                clear.className = "b3-button xlc-btn-ghost xlc-empty-action";
                clear.textContent = this.deps.t("clearFilters");
                clear.addEventListener("click", () => {
                    this.deps.setFilters({type: "", tag: "", category: ""});
                    this.dialog?.element.querySelectorAll<HTMLSelectElement>(".xlc-type-select, .xlc-tag-select, .xlc-category-select")
                        .forEach((select) => { select.value = ""; });
                    void this.refresh();
                });
                empty.appendChild(clear);
            }
            // 搜索无命中时同样提供下一步，避免用户只能返回其他入口再新建。
            // 空库分支沿用既有按钮；收藏/最近空态不显示，防止动作与当前范围语义冲突。
            if (this.emptyMessage === this.deps.t("emptyLibrary")
                || this.emptyMessage === this.deps.t("emptyFiltered")
                || this.lastQueryText.trim()) {
                const create = document.createElement("button");
                create.type = "button";
                create.className = "b3-button xlc-btn-primary xlc-empty-action";
                create.textContent = this.deps.t("newItemAction");
                create.addEventListener("click", () => {
                    const query = this.lastQueryText.trim();
                    const titleCandidate = query && !query.startsWith("?") ? query.slice(0, 120) : undefined;
                    this.deps.newItem(titleCandidate);
                });
                empty.appendChild(create);
            }
            list.appendChild(empty);
        }
        // 分组头（F4 完整形态，原型屏 1）：浏览态（全部范围 + 非标题排序）按
        // 「置顶(manual) → 分类(α) → 无分类」分区展示；搜索结果同样分组（原型屏 1 同款）。
        // 分组 = 对 this.results 重排到展示序（仅展示副本，不动索引/真源），键盘/Alt+N 线性导航不变。
        const grouping = this.currentScope === "all" && this.deps.getSort() !== "title";
        const groupLabels: Array<{label: string; count: number}> = [];
        if (grouping && this.results.length > 0) {
            const isManual = this.deps.getSort() === "manual";
            const favs: SearchEntry[] = [];
            const rest: SearchEntry[] = [];
            for (const e of this.results) {
                // 只有手动排序才把收藏单独置顶；其他排序仍把收藏放回分类桶。
                if (isManual && e && this.deps.isFavorite(e.id)) favs.push(e);
                else rest.push(e);
            }
            const byCat = new Map<string, SearchEntry[]>();
            const uncategorized: SearchEntry[] = [];
            for (const e of rest) {
                const cat = e?.category ?? "";
                if (!cat) {
                    uncategorized.push(e);
                    continue;
                }
                const bucket = byCat.get(cat) ?? [];
                bucket.push(e);
                byCat.set(cat, bucket);
            }
            const catKeys = Array.from(byCat.keys()).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
            const ordered: SearchEntry[] = [];
            if (isManual && favs.length > 0) {
                groupLabels.push({label: "📌 " + this.deps.t("groupPinned"), count: favs.length});
                ordered.push(...favs);
            }
            for (const key of catKeys) {
                const bucket = byCat.get(key) ?? [];
                groupLabels.push({label: key, count: bucket.length});
                ordered.push(...bucket);
            }
            if (uncategorized.length > 0) {
                groupLabels.push({label: this.deps.t("groupUncategorized"), count: uncategorized.length});
                ordered.push(...uncategorized);
            }
            if (groupLabels.length > 1) {
                this.results = ordered;
            } else {
                groupLabels.length = 0;
            }
        }
        let headCursor = -1;
        const headStarts: number[] = [];
        let groupAcc = 0;
        for (const g of groupLabels) {
            headStarts.push(groupAcc);
            groupAcc += g.count;
        }
        const placeGroupHead = (label: string, count: number): void => {
            const head = document.createElement("div");
            head.className = "xlc-group-head";
            head.dataset.xlcHead = "1";
            head.setAttribute("aria-hidden", "true");
            head.textContent = `${label} · ${count}`;
            list.appendChild(head);
        };
        for (let i = 0; i < this.results.length; i++) {
            while (headCursor + 1 < groupLabels.length && i === headStarts[headCursor + 1]) {
                headCursor++;
                const head = groupLabels[headCursor];
                if (head) placeGroupHead(head.label, head.count);
            }
            const entry = this.results[i];
            if (!entry) continue;
            const fav = this.deps.isFavorite(entry.id);
            const row = document.createElement("div");
            row.className = "xlc-row"
                + (i === this.activeIndex ? " xlc-row--active" : "")
                + (fav ? " xlc-row--fav" : "");
            row.dataset.xlcIndex = String(i);
            row.id = `xlc-result-${i}`;
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
            const highlight = this.lastQueryText.length > 0
                && !this.lastQueryText.startsWith("?")
                && !this.aiResults;
            if (highlight) {
                // 命中高亮：让「为什么出这条」一眼可见（AI 语义找不高亮——匹配依据非字面）
                this.appendHighlighted(titleText, entry.title || this.deps.t("unknownType"), this.lastQueryText);
            } else {
                titleText.textContent = entry.title || this.deps.t("unknownType");
            }
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
            const joined = [entry.tags.join(" / "), entry.summary].filter(Boolean).join(" · ");
            const metaBase = joined.length > 140 ? joined.slice(0, 140) + "…" : joined; // 截断留省略号（R139）
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
                // 重渲染会移除焦点所在按钮：焦点显式回归搜索框，避免键盘导航断线（R138）
                void this.refreshPreservingPosition().then(() => this.restoreFocusToSearch());
            });
            row.appendChild(star);
            list.appendChild(row);
        }
        // 提供方分区（pv: 虚拟行；点击弹小菜单=插入/复制 payload；不进键盘导航）
        if (this.providerRows.length > 0) {
            const header = document.createElement("div");
            header.className = "xlc-provider-header";
            header.dataset.xlcHead = "1";
            header.setAttribute("aria-hidden", "true");
            header.textContent = "✦ " + this.deps.t("providerSection") + " · " + this.providerRows.length;
            list.appendChild(header);
            for (const row of this.providerRows) {
                const el = document.createElement("div");
                el.className = "xlc-row xlc-row--provider";
                el.dataset.xlcVirtualId = row.virtualId;
                el.id = `xlc-provider-${this.providerRows.indexOf(row)}`;
                el.setAttribute("role", "option");
                el.setAttribute("aria-selected", "false");
                const main = document.createElement("div");
                main.className = "xlc-row-main";
                const title = document.createElement("div");
                title.className = "xlc-row-title";
                const badge = document.createElement("span");
                badge.className = "xlc-badge xlc-badge--ai";
                // 长提供方名截断留省略号 + 悬停全名（R139）
                badge.textContent = row.providerName.length > 12 ? row.providerName.slice(0, 12) + "…" : row.providerName;
                badge.title = row.providerName;
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
        // 空结果时动作钮全部禁用：按钮不再「看起来能点、点了没反应」（R106）；
        // 提供方行激活时仅插入/复制可用（对 payload 生效），库条目专属动作禁用（R138）
        const actionable = this.results.length > 0;
        const scope = this.dialog?.element ?? document;
        scope.querySelectorAll<HTMLButtonElement>(".xlc-pane-foot .b3-button")
            .forEach((btn) => {
                if (this.activeProvider >= 0) {
                    const act = btn.dataset.xlcPaneAct ?? "";
                    btn.disabled = !(act === "insert" || act === "copy");
                } else {
                    btn.disabled = !actionable;
                }
            });
        const mobileInsert = scope.querySelector<HTMLButtonElement>(".xlc-mobile-foot .xlc-btn-primary");
        if (mobileInsert) mobileInsert.disabled = !actionable;
    }

    private async showProviderMenu(row: ProviderRow, anchor: HTMLElement): Promise<void> {
        this.menuDismiss?.();
        this.menuDismiss = null;
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
                if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
                document.removeEventListener("pointerdown", dismiss, true);
                this.restoreFocusToSearch();
            }
        };
        const dismissMenu = (): void => {
            menu.remove();
            document.removeEventListener("pointerdown", dismiss, true);
        };
        this.menuDismiss = dismissMenu;
        document.addEventListener("pointerdown", dismiss, true);
        // Esc 关闭提供方菜单（隔离宿主全局 Esc，防整弹窗连带关闭；R112）
        menu.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                menu.remove();
                if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
                document.removeEventListener("pointerdown", dismiss, true);
                this.restoreFocusToSearch();
            }
        });
        menu.querySelector<HTMLElement>(".xlc-menu-item")?.focus();
    }

    /** 外部变更（动作菜单内删除/建副本等）后的列表同步入口（R138）。 */
    public refreshAfterExternalChange(): void {
        void this.refreshPreservingPosition();
    }

    private async refreshPreservingPosition(): Promise<void> {        const seq = ++this.searchSeq;
        const query = this.buildQuery();
        this.lastQueryText = query.text.trim();
        try {
            const {entries} = await this.deps.search(query);
            if (seq !== this.searchSeq) return;
            this.results = entries;
            this.activeProvider = -1;
            this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.results.length - 1));
        } catch (err) {
            // 静默失败会让「星标已翻转、列表却没变」无解释——状态行诚实报错（R138）
            const status = this.dialog?.element.querySelector<HTMLElement>(".xlc-status");
            if (status) {
                status.textContent = this.deps.t("kernelError", (err as Error)?.message ?? "unknown");
                status.classList.add("xlc-status--error");
            }
            return;
        }
        const list = this.dialog?.element.querySelector<HTMLElement>(".xlc-list");
        if (list) this.renderList(list);
        this.updatePreview();
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
            child.setAttribute("aria-selected", active ? "true" : "false");
        });
        const active = rows[this.navPosition()] as HTMLElement | undefined;
        const input = this.dialog?.element.querySelector<HTMLInputElement>(".xlc-search-input");
        if (active?.id) input?.setAttribute("aria-activedescendant", active.id);
        else input?.removeAttribute("aria-activedescendant");
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
            chip.textContent = askFieldTag(field);
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

    /** 排序直选菜单（R108）：4 档可枚举、当前档 ✓，替代不可见的循环切换。 */
    private showSortMenu(paintSort: () => void): void {
        this.menuDismiss?.();
        this.menuDismiss = null;
        const modes = ["manual", "recent", "frequent", "title"] as const;
        const current = this.deps.getSort();
        const menu = document.createElement("div");
        menu.className = "xlc-menu xlc-menu--compact";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", this.deps.t("sort"));
        const lbl = document.createElement("div");
        lbl.className = "xlc-menu-lbl";
        lbl.textContent = this.deps.t("sort");
        menu.appendChild(lbl);
        const sec = document.createElement("div");
        sec.className = "xlc-menu-sec";
        for (const mode of modes) {
            sec.appendChild(this.menuButton(mode === current ? "✓" : " ", this.deps.t(`sort.${mode}`), "xlc-menu-item" + (mode === current ? " xlc-menu-item--on" : ""), async () => {
                this.sortMenuClosedAt = Date.now();
                this.menuDismiss?.();
                this.menuDismiss = null;
                this.deps.setSort(mode);
                paintSort();
                this.restoreFocusToSearch();
                void this.refresh();
            }));
        }
        menu.appendChild(sec);
        const host = (this.dialog?.element.querySelector(".xlc-dialog")) ?? this.dialog?.element ?? document.body;
        host.appendChild(menu);
        const dismiss = (e: Event) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                this.sortMenuClosedAt = Date.now();
                if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
                document.removeEventListener("pointerdown", dismiss, true);
                this.restoreFocusToSearch();
            }
        };
        const dismissMenu = (): void => {
            menu.remove();
            document.removeEventListener("pointerdown", dismiss, true);
        };
        this.menuDismiss = dismissMenu;
        document.addEventListener("pointerdown", dismiss, true);
        // Esc 关闭排序菜单（隔离宿主全局 Esc，防整弹窗连带关闭；R112）
        menu.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                menu.remove();
                this.sortMenuClosedAt = Date.now();
                if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
                document.removeEventListener("pointerdown", dismiss, true);
                this.restoreFocusToSearch();
            }
        });
        menu.querySelector<HTMLElement>(".xlc-menu-item")?.focus();
    }

    /** 预览窗格元数据行（R108，Raycast Detail.Metadata 惯例）：类型徽标 + 分类/标签可点筛选 + 更新日期。 */
    private paintPaneMeta(entry: SearchEntry | undefined): void {
        const meta = this.dialog?.element.querySelector<HTMLElement>(".xlc-pane-meta");
        if (!meta) return;
        meta.textContent = "";
        if (!entry) {
            meta.style.display = "none";
            return;
        }
        const typeBadge = document.createElement("span");
        typeBadge.className = `xlc-badge xlc-badge--${entry.itemType}`;
        typeBadge.textContent = TYPE_BADGES[entry.itemType] ?? "TXT";
        meta.appendChild(typeBadge);
        const setFilter = (patch: {tag?: string; category?: string}): void => {
            const current = this.deps.getFilters();
            const next = {
                type: current.type,
                tag: patch.tag ?? current.tag,
                category: patch.category ?? current.category,
            };
            this.deps.setFilters(next);
            const tagSelect = this.dialog?.element.querySelector<HTMLSelectElement>(".xlc-tag-select");
            const categorySelect = this.dialog?.element.querySelector<HTMLSelectElement>(".xlc-category-select");
            if (tagSelect) tagSelect.value = next.tag;
            if (categorySelect) categorySelect.value = next.category;
            void this.refresh();
        };
        const toggleChip = (value: string, active: string | undefined): string => (active === value ? "" : value);
        const currentFilters = this.deps.getFilters();
        if (entry.category) {
            const cat = document.createElement("button");
            cat.type = "button";
            cat.className = "xlc-meta-chip" + (currentFilters.category === entry.category ? " xlc-meta-chip--on" : "");
            cat.textContent = entry.category;
            cat.title = this.deps.t("category");
            cat.setAttribute("aria-pressed", String(currentFilters.category === entry.category));
            cat.addEventListener("click", () => setFilter({category: toggleChip(entry.category, this.deps.getFilters().category)}));
            meta.appendChild(cat);
        }
        // 空字符串标签防御（索引切分可能产生空段，R118）
        const cleanTags = entry.tags.filter(Boolean);
        const shownTags = cleanTags.slice(0, 3);
        for (const tag of shownTags) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "xlc-meta-chip" + (currentFilters.tag === tag ? " xlc-meta-chip--on" : "");
            chip.textContent = tag;
            chip.title = this.deps.t("tags");
            chip.setAttribute("aria-pressed", String(currentFilters.tag === tag));
            chip.addEventListener("click", () => setFilter({tag: toggleChip(tag, this.deps.getFilters().tag)}));
            meta.appendChild(chip);
        }
        if (cleanTags.length > shownTags.length) {
            const more = document.createElement("span");
            more.className = "xlc-meta-chip xlc-meta-chip--static";
            more.textContent = `+${cleanTags.length - shownTags.length}`;
            meta.appendChild(more);
        }
        // 更新日期（Raycast accessory date 惯例的详情面板版；1970 级脏值不显示）
        if (Number.isFinite(entry.updatedAt) && entry.updatedAt > 946684800000) {
            const date = document.createElement("span");
            date.className = "xlc-pane-meta-date";
            date.textContent = this.deps.t("updatedAtLabel", new Date(entry.updatedAt).toLocaleDateString());
            meta.appendChild(date);
        }
        meta.style.display = "flex";
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
            if (row) {
                this.lastPreviewId = row.virtualId;
                paneTitle.textContent = row.title || row.providerName;
                paneAi.style.display = "none";
                paneUsage.style.display = "none";
                paneWarn.style.display = "none";
                this.paintPaneMeta(undefined);
                paneBody.classList.remove("xlc-pane-body--muted", "xlc-pane-body--code");
                this.paintPaneVars(null, "provider");
                paneBody.textContent = row.payload;
                return;
            }
            this.activeProvider = -1;
        }
        const entry = this.results[this.activeIndex];
        const id = forceId ?? entry?.id ?? null;
        // 元数据行跟活动条目走（含清空态隐藏），先于预览缓存的早退执行
        this.paintPaneMeta(entry);
        if (!id) {
            ++this.previewSeq;
            this.lastPreviewId = "";
            paneTitle.textContent = "";
            paneAi.style.display = "none";
            paneWarn.style.display = "none";
            paneUsage.style.display = "none";
            paneBody.classList.add("xlc-pane-body--muted");
            paneBody.classList.remove("xlc-pane-body--code");
            paneBody.textContent = this.deps.t("previewNoResult");
            paneBody.scrollTop = 0;
            this.paintPaneVars(null, undefined);
            return;
        }
        if (!id || id === this.lastPreviewId) return;
        const seq = ++this.previewSeq;
        this.lastPreviewId = id;
        if (paneTitle) paneTitle.textContent = entry?.title ?? "";
        if (paneAi) paneAi.style.display = this.aiResults ? "" : "none";
        paintUsageBadge(entry);
        if (paneWarn) {
            const missing = Boolean(entry && this.deps.isSourceMissing(entry));
            paneWarn.style.display = missing ? "" : "none";
            if (missing) paneWarn.textContent = "⚠ " + this.deps.t("sourceGone");
        }
        this.paintPaneVars(null, entry?.itemType);
            paneBody.classList.add("xlc-pane-body--muted");
            paneBody.textContent = this.deps.t("loading"); // 本地内核预览不用「AI 处理中」文案，避免误导（R138）
        void this.deps.preview(id).then((text) => {
            if (seq !== this.previewSeq) return;
            const finalText = text || this.deps.t("previewUnavailable");
            // 占位（暂无预览）保持降调；真内容恢复主文字色
            paneBody.classList.toggle("xlc-pane-body--muted", finalText === this.deps.t("previewUnavailable"));
            paneBody.textContent = finalText;
            // 切换条目后回到顶部（长内容滚动位置不残留）
            paneBody.scrollTop = 0;
            // 代码条目预览用等宽字体（纯文本渲染不变，仅观感）
            paneBody.classList.toggle("xlc-pane-body--code", entry?.itemType === "code");
            this.paintPaneVars(text, entry?.itemType);
        }).catch(() => {
            if (seq !== this.previewSeq) return;
            paneBody.classList.add("xlc-pane-body--muted");
            paneBody.textContent = this.deps.t("kernelError", "preview");
            paneBody.classList.remove("xlc-pane-body--code");
            this.paintPaneVars(null, entry?.itemType);
        });
    }

    /** 普通点击 = 主动作（insert；blockref = 插入引用）。含变量时先弹填充卡片（F1）。
     *  执行期防重入（R138）：双击行/按住 Enter 不得重复插入同一块。 */
    private primaryBusy = false;
    private varFormOpen = false;
    /** AI 变换代次：连点两个变换时丢弃慢的旧结果（R138） */
    private transformSeq = 0;
    /** 排序菜单关闭时刻：chip 的 click 在 pointerdown 关闭之后到达，不得立刻重开（R138 toggle） */
    private sortMenuClosedAt = 0;
    private async runPrimary(entry: SearchEntry): Promise<void> {
        if (this.primaryBusy || this.varFormOpen) return;
        this.primaryBusy = true;
        try {
            await this.insertEntryWithVars(entry, (fills) => this.runActionFor(entry, fills));
        } finally {
            this.primaryBusy = false;
        }
    }

    private runActionFor(entry: SearchEntry, fills?: Record<string, string>): Promise<unknown> {
        // 定向插入模式（文档树入口）：插入到指定文档而非活动编辑器
        if (this.deps.insertTarget) {
            const target = this.deps.insertTarget;
            return this.deps.insertToDoc(entry.id, target.docId, target.hPath, fills);
        }
        const mode: InsertMode = entry.itemType === "blockref" ? "insert-ref" : "insert";
        return fills
            ? this.deps.runActionWithFills(entry.id, mode, fills)
            : this.deps.runAction(entry.id, mode);
    }

    /** F1：插入前询问变量（设置可关；无 ask 字段零打扰；code 条目不询问）。
     *  perform 收到 fills（undefined=未触发询问，走原路径）。 */
    private async insertEntryWithVars(entry: SearchEntry, perform: (fills?: Record<string, string>) => Promise<unknown>): Promise<void> {
        if (!this.deps.promptVariables()) {
            await perform();
            return;
        }
        let fields: AskField[] = [];
        let previewFailed = false;
        try {
            const content = await this.deps.preview(entry.id);
            fields = entry.itemType === "code" || !content ? [] : listAskFields(content);
        } catch {
            fields = [];
            previewFailed = true;
        }
        if (fields.length === 0) {
            // 预览失败但条目声明含变量：按原样插入前给出可见提示，不静默（R139）
            if (previewFailed && (entry.varCount ?? 0) > 0) {
                const status = this.dialog?.element.querySelector<HTMLElement>(".xlc-status");
                if (status) {
                    status.textContent = this.deps.t("varParseFailed");
                    status.classList.add("xlc-status--error");
                }
            }
            await perform();
            return;
        }
        // 填充卡已在屏上时不得叠开第二张（双击行会走到这里，R138）
        if (this.varFormOpen) return;
        this.varFormOpen = true;
        openVariableFillCard({
            t: this.deps.t,
            itemType: entry.itemType,
            title: entry.title,
            fields,
            onConfirm: (fills) => {
                this.varFormOpen = false;
                this.destroy();
                void perform(fills);
            },
            // 取消/关闭（Esc/scrim/取消钮）后焦点回搜索框，与浮层菜单一致（R128）
            onCancel: () => {
                this.varFormOpen = false;
                this.restoreFocusToSearch();
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
        this.menuDismiss?.();
        this.menuDismiss = null;
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
            // 预览盒（原文摘要）：原型屏 2 置于动作分区之后（先见动作，预览兜底）；占位降调
            const previewBox = document.createElement("pre");
            previewBox.className = "xlc-menu-preview xlc-menu-preview--muted";
            previewBox.textContent = this.deps.t("previewUnavailable");
            void this.deps.preview(entry.id).then((text) => {
                if (text) {
                    previewBox.textContent = text.slice(0, 500);
                    previewBox.classList.remove("xlc-menu-preview--muted");
                }
            }).catch(() => {
                previewBox.textContent = this.deps.t("kernelError", "preview");
            });

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
                    const gen = ++this.transformSeq; // 代次守卫：慢的旧变换不得覆盖新视图（R138）
                    rebuild(() => buildTransformView(entry.title + " · " + transformLabel, transformLabel));
                    void runTransformView(run, gen);
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
            const addSilent = (icon: string, label: string, run: () => Promise<unknown>, cls = "xlc-menu-item"): void => {
                sec2.appendChild(this.menuButton(icon, label, cls, async () => {
                    // 统一走 menuDismiss：document 监听必须摘除、账目不被错清（此前 menu.remove() 泄漏监听，
                    // 后续 pointerdown 会把焦点从编辑弹窗抢回搜索框，R138）
                    this.menuDismiss?.();
                    this.menuDismiss = null;
                    await run();
                }));
            };
            addSilent("↗", this.deps.t("openSource"), () => this.deps.openSource(entry.id));
            addSilent("✎", this.deps.t("edit"), () => this.deps.editItem(entry.id));
            addSilent("⧉", this.deps.t("duplicateItem"), () => this.deps.duplicateItem(entry.id));
            // 删除 = 危险动作，固定语义红（样式层区分；确认弹窗不变）
            addSilent("🗑", this.deps.t("delete"), () => this.deps.deleteItem(entry.id), "xlc-menu-item xlc-menu-item--danger");
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
                input.setAttribute("aria-label", this.deps.t("insertToDocPick"));
                input.setAttribute("autocomplete", "off");
                // Enter 选第一个命中；↑↓ 在输入框内移动光标不被菜单级 keydown 劫持（R138）
                input.addEventListener("keydown", (ev) => {
                    ev.stopPropagation();
                    if (ev.key === "Enter" && !ev.isComposing) {
                        ev.preventDefault();
                        const first = sec.querySelector<HTMLButtonElement>(".xlc-pickdoc-hit");
                        first?.click();
                    }
                });
                sec.appendChild(input);
                let seq = 0;
                input.addEventListener("input", () => {
                    const mySeq = ++seq;
                    const k = input.value.trim();
                    sec!.querySelectorAll(".xlc-pickdoc-hit").forEach((el) => el.remove());
                    sec!.querySelectorAll(".xlc-pickdoc-empty").forEach((el) => el.remove());
                    if (!k) return;
                    void this.deps.searchDocs(k).then((hits) => {
                        if (mySeq !== seq) return;
                        // 无匹配反馈（R120）：不再静默无反应
                        if (hits.length === 0) {
                            const empty = document.createElement("div");
                            empty.className = "xlc-pickdoc-empty";
                            empty.textContent = this.deps.t("docPickerEmpty");
                            sec!.appendChild(empty);
                            return;
                        }
                        for (const hit of hits.slice(0, 5)) {
                            sec!.appendChild(this.menuButton("⤓", hit.hPath || hit.name || hit.id, "xlc-menu-item xlc-pickdoc-hit", async () => {
                                this.menuDismiss?.();
                                this.menuDismiss = null;
                                await this.insertEntryWithVars(entry, (fills) => this.deps.insertToDoc(entry.id, hit.id, hit.hPath, fills));
                            }));
                        }
                        // 文档搜索失败静默降级（关键词保留可重试；Esc 由菜单层处理，R123）
                    }).catch((err) => {
                        if (mySeq !== seq) return;
                        const error = document.createElement("div");
                        error.className = "xlc-pickdoc-empty xlc-status--error";
                        error.textContent = this.deps.t("kernelError", err instanceof Error ? err.message : String(err));
                        sec!.appendChild(error);
                    });
                });
                const actions2 = menu.querySelectorAll(".xlc-menu-sec");
                actions2[actions2.length - 1]?.before(sec);
                input.focus();
            });
            sec2.appendChild(toDocBtn);
            menu.appendChild(sec2);
            // 预览盒挂在次级分区之后（原型屏 2 顺序：标题 → 动作 → AI → 次级 → 预览）
            menu.appendChild(previewBox);
        };

        const buildTransformView = (viewLabel: string, transformLabel: string): void => {
            // 变换态：预览盒显示结果 + 插变换/复制变换/插原文/存为新条目/返回
            const lbl = document.createElement("div");
            lbl.className = "xlc-menu-lbl";
            lbl.textContent = viewLabel;
            menu.appendChild(lbl);
            const box = document.createElement("pre");
            box.className = "xlc-menu-preview xlc-menu-preview--muted";
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
                // 与「插入变换结果」「存为新条目」一致：执行即关弹窗，防菜单残留导致重复插入（R137）
                this.destroy();
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
                box.classList.remove("xlc-menu-preview--muted");
                (menu as HTMLElement & {syncTransformReady?: () => void}).syncTransformReady?.();
            };
        };

        const runTransformView = async (run: () => Promise<{ok: true; text: string} | {ok: false; message: string}>, gen: number): Promise<void> => {
            const result = await run();
            if (gen !== this.transformSeq) return; // 连点两个变换：先返回的旧结果直接丢弃（R138）
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
        // Esc 关闭动作菜单（键盘可达性）；stopPropagation 隔离宿主 Dialog 的全局 Esc，
        // 防止「只想关菜单」时整个弹窗被连带关闭（R112）
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                this.menuDismiss?.();
                this.menuDismiss = null;
                this.restoreFocusToSearch();
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
                e.stopPropagation();
                focusMenuItem(1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                focusMenuItem(-1);
            } else if (e.key === "Tab") {
                // 菜单为模态浮层：Tab/Shift+Tab 在菜单项间循环（不逃逸到弹窗底层）
                e.preventDefault();
                e.stopPropagation();
                focusMenuItem(e.shiftKey ? -1 : 1);
            }
        });
        const dismiss = (e: Event) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                this.menuDismiss = null;
                document.removeEventListener("pointerdown", dismiss, true);
                this.restoreFocusToSearch();
            }
        };
        // destroy() 时兜底清理（弹窗经键盘关闭而菜单未点掉的场景）
        this.menuDismiss = () => {
            menu.remove();
            document.removeEventListener("pointerdown", dismiss, true);
        };
        document.addEventListener("pointerdown", dismiss, true);
        menu.querySelector<HTMLElement>(".xlc-menu-item")?.focus();
    }

    private async onKeydown(e: KeyboardEvent): Promise<void> {
        // IME 组合态（中文组词）：Enter/方向键属选词与候选导航，不得触发插入或移动选中（R138）
        if (e.isComposing || e.keyCode === 229) return;
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
            // 焦点在行内按钮（★ 收藏等）时交给原生激活，不劫持为插入（R138）
            if ((e.target as HTMLElement).closest?.(".xlc-row-action")) return;
            if (e.repeat) return; // 按住 Enter 不得连续插入（R138）
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
            if (e.repeat) return; // 按住 Alt+数字不得连续插入（R138）
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
        this.longPressCancel?.();
        this.longPressCancel = null;
        if (this.menuDismiss) {
            this.menuDismiss();
            this.menuDismiss = null;
        }
        this.dialog?.destroy();
        this.dialog = null;
    }
}
