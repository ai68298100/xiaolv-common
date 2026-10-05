// 搜索弹窗：桌面居中弹窗 / 移动端底部 sheet（同一 DOM，CSS 形态切换）。
// 安全：所有内容字符串只走 textContent，绝不 innerHTML 注入外部文本。
// 键盘：↑↓ 选择、Enter 插入、Ctrl+Enter 复制、Esc 关闭；搜索框首焦点。
// 触控：44px 命中区、长按弹动作菜单（touchmove 判定，不阻断滚动、不做坐标猜测）。
import {Dialog} from "siyuan";
import {ITEM_TYPES, ItemType} from "../model/item";
import {SearchEntry, SearchQuery, SearchContext} from "../model/search";
import {CommonItem} from "../model/item";
import {InsertMode} from "../model/actions";

export interface DialogDeps {
    t: (key: string, ...args: string[]) => string;
    search: (query: SearchQuery) => Promise<{entries: SearchEntry[]; truncated: boolean}>;
    getTags: () => Promise<string[]>;
    preview: (itemId: string) => Promise<string>;
    runAction: (itemId: string, mode: InsertMode) => Promise<{ok: boolean; message: string}>;
    openSource: (itemId: string) => Promise<{ok: boolean; message: string}>;
    editItem: (itemId: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    toggleFavorite: (itemId: string) => boolean;
    isFavorite: (itemId: string) => boolean;
    close: () => void;
    isMobile: () => boolean;
}

const TYPE_ICONS: Record<ItemType, string> = {
    text: "#iconXlcCommon",
    markdown: "#iconXlcCommon",
    url: "#iconXlcLink",
    code: "#iconXlcCode",
    image: "#iconXlcImage",
    asset: "#iconXlcBox",
    blockref: "#iconXlcLink",
    structure: "#iconXlcCommon",
};

export class CommonSearchDialog {
    private dialog: Dialog | null = null;
    private results: SearchEntry[] = [];
    private activeIndex = 0;
    private searchSeq = 0;
    private ctx: SearchContext;
    private currentScope: "all" | "favorites" | "recent" = "all";

    constructor(private readonly deps: DialogDeps, ctx: SearchContext) {
        this.ctx = ctx;
    }

    open(): void {
        const isMobile = this.deps.isMobile();
        const content = this.buildDom(isMobile);
        this.dialog = new Dialog({
            title: this.deps.t("pluginName"),
            content: "",
            width: isMobile ? "100vw" : "min(720px, 92vw)",
            height: isMobile ? "100vh" : "min(560px, 80vh)",
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
        const input = this.dialog.element.querySelector<HTMLInputElement>(".xlc-search-input");
        input?.focus();
        void this.refresh();
    }

    updateContext(ctx: SearchContext): void {
        this.ctx = ctx;
    }

    private buildDom(isMobile: boolean): HTMLElement {
        const root = document.createElement("div");
        root.className = "xlc-dialog" + (isMobile ? " xlc-dialog--mobile" : "");

        const top = document.createElement("div");
        top.className = "xlc-top";
        const input = document.createElement("input");
        input.className = "b3-text-field xlc-search-input";
        input.placeholder = this.deps.t("searchPlaceholder");
        input.setAttribute("aria-label", this.deps.t("searchPlaceholder"));
        input.addEventListener("input", () => {
            this.currentScope = "all";
            void this.refresh();
        });
        input.addEventListener("keydown", (e) => void this.onKeydown(e));
        top.appendChild(input);
        root.appendChild(top);

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
            chip.className = "b3-button b3-button--small xlc-scope-chip";
            chip.dataset.scope = scope;
            chip.textContent = this.deps.t(`filter${scope === "favorites" ? "Favorites" : "Recent"}`);
            chip.addEventListener("click", () => {
                this.currentScope = this.currentScope === scope ? "all" : scope;
                void this.refresh();
            });
            filters.appendChild(chip);
        }
        root.appendChild(filters);

        const status = document.createElement("div");
        status.className = "xlc-status";
        status.setAttribute("aria-live", "polite");
        root.appendChild(status);

        const list = document.createElement("div");
        list.className = "xlc-list fn__flex-1";
        list.setAttribute("role", "listbox");
        list.setAttribute("aria-label", this.deps.t("pluginName"));
        list.addEventListener("click", (e) => {
            if ((e.target as HTMLElement).closest(".xlc-row-action")) return;
            const row = (e.target as HTMLElement).closest<HTMLElement>("[data-xlc-index]");
            if (!row) return;
            const entry = this.results[Number(row.dataset.xlcIndex)];
            if (entry) void this.runPrimary(entry);
        });
        root.appendChild(list);

        const footer = document.createElement("div");
        footer.className = "xlc-footer";
        footer.textContent = isMobile ? this.deps.t("usageHintMobile") : this.deps.t("usageHint");
        root.appendChild(footer);
        return root;
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
        if (!list) return;
        try {
            const {entries} = await this.deps.search(query);
            if (seq !== this.searchSeq) return;
            this.results = entries;
        } catch (err) {
            if (seq !== this.searchSeq) return;
            this.results = [];
            if (status) status.textContent = this.deps.t("kernelError", (err as Error).message);
            this.renderList(list);
            return;
        }
        if (seq !== this.searchSeq) return;
        this.activeIndex = 0;
        if (status) status.textContent = this.results.length ? "" : this.deps.t("empty");
        this.renderList(list);
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

            const icon = document.createElement("span");
            icon.className = "xlc-row-icon";
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.setAttribute("href", TYPE_ICONS[entry.itemType] ?? "#iconXlcCommon");
            svg.appendChild(use);
            icon.appendChild(svg);
            row.appendChild(icon);

            const main = document.createElement("div");
            main.className = "xlc-row-main";
            const title = document.createElement("div");
            title.className = "xlc-row-title";
            title.textContent = entry.title || this.deps.t("unknownType");
            main.appendChild(title);
            const meta = document.createElement("div");
            meta.className = "xlc-row-meta";
            meta.textContent = [this.deps.t(`type.${entry.itemType}`), entry.tags.join(" / "), entry.summary]
                .filter(Boolean).join(" · ").slice(0, 160);
            main.appendChild(meta);
            row.appendChild(main);

            const star = document.createElement("button");
            star.className = "b3-button b3-button--small xlc-row-action";
            star.textContent = this.deps.isFavorite(entry.id) ? "★" : "☆";
            star.setAttribute("aria-label", this.deps.isFavorite(entry.id) ? this.deps.t("unfavorite") : this.deps.t("favorite"));
            star.addEventListener("click", (e) => {
                e.stopPropagation();
                this.deps.toggleFavorite(entry.id);
                star.textContent = this.deps.isFavorite(entry.id) ? "★" : "☆";
            });
            row.appendChild(star);

            // 长按（550ms，移动 <10px 判定为长按而非滚动）→ 动作菜单；右键同菜单
            let pressTimer: ReturnType<typeof setTimeout> | undefined;
            let startY = 0;
            row.addEventListener("touchstart", (e) => {
                startY = e.touches[0]?.clientY ?? 0;
                pressTimer = setTimeout(() => void this.showActionMenu(entry), 550);
            }, {passive: true});
            row.addEventListener("touchmove", (e) => {
                const dy = Math.abs((e.touches[0]?.clientY ?? 0) - startY);
                if (dy > 10 && pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = undefined;
                }
            }, {passive: true});
            row.addEventListener("touchend", () => {
                if (pressTimer) clearTimeout(pressTimer);
            });
            row.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                void this.showActionMenu(entry);
            });

            list.appendChild(row);
        }
        const active = list.children[this.activeIndex] as HTMLElement | undefined;
        active?.scrollIntoView({block: "nearest"});
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

        const previewBox = document.createElement("pre");
        previewBox.className = "xlc-menu-preview";
        previewBox.textContent = this.deps.t("previewUnavailable");
        void this.deps.preview(entry.id).then((text) => {
            if (text) previewBox.textContent = text.slice(0, 800);
        }).catch(() => {
            previewBox.textContent = this.deps.t("kernelError", "preview");
        });
        menu.appendChild(previewBox);

        const addAction = (label: string, run: () => Promise<unknown>, closeAfter = true): void => {
            const btn = document.createElement("button");
            btn.className = "b3-menu__item xlc-menu-item";
            btn.textContent = label;
            btn.addEventListener("click", async () => {
                if (closeAfter) this.destroy();
                await run();
            });
            menu.appendChild(btn);
        };

        if (entry.itemType === "blockref") {
            addAction(this.deps.t("insertRef"), () => this.deps.runAction(entry.id, "insert-ref"));
            addAction(this.deps.t("insertEmbed"), () => this.deps.runAction(entry.id, "insert-embed"));
            addAction(this.deps.t("insertCopy"), () => this.deps.runAction(entry.id, "copy-content"));
        } else {
            addAction(this.deps.t("insert"), () => this.deps.runAction(entry.id, "insert"));
            addAction(this.deps.t("copy"), () => this.deps.runAction(entry.id, "copy"));
        }
        addAction(this.deps.t("openSource"), () => this.deps.openSource(entry.id), false);
        addAction(this.deps.t("edit"), () => this.deps.editItem(entry.id));
        addAction(this.deps.t("delete"), () => this.deps.deleteItem(entry.id));

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
            this.renderList(list);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.activeIndex = Math.max(this.activeIndex - 1, 0);
            this.renderList(list);
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const entry = this.results[this.activeIndex];
            if (entry) {
                await this.runPrimary(entry);
            }
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
        this.dialog?.destroy();
        this.dialog = null;
    }
}
