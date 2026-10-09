// 捕获流程：选区/当前块 → 新条目表单（类型推断 + 元数据一步完成）。
// 剪贴板读取失败（权限/平台）诚实回执，保留手动输入。
import {Dialog, confirm} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {ItemType, isSafeHttpUrl} from "../model/item";
import {NewItemInput} from "../service/library";
import {buildVariableBar} from "./variable-form";

/** 块引用目标校验（官方 data-id 属性值） */
export function isBlockRefTarget(blockId: string): boolean {
    return /^\d{14}-[0-9a-z]{7}$/.test(blockId);
}

/** 回执 toast 的标题展示截断（标题最长 512 字；原文不受影响） */
const TOAST_TITLE_MAX = 48;
const shortTitle = (title: string): string => (title.length > TOAST_TITLE_MAX ? `${title.slice(0, TOAST_TITLE_MAX)}…` : title);

/** 链接目标分类：仅接受 http(s) 外链与 assets/ 资源；其余（siyuan:// 等）返回 null */
export function classifyLinkTarget(href: string): {kind: "url" | "asset"; value: string} | null {
    const h = (href ?? "").trim();
    if (isSafeHttpUrl(h)) return {kind: "url", value: h};
    if (/^assets\/[^\s]+$/.test(h)) return {kind: "asset", value: h};
    return null;
}
export interface CaptureDeps {
    t: (key: string, ...args: string[]) => string;
    /** 当前选区纯文本（官方选区 API + data-node-id 块定位，见 ADR 0003 DOM 边界） */
    getSelectionText(): {text: string; blockId: string | null};
    currentDocId(): string | null;
    readClipboardText(): Promise<string>;
    createItem(input: NewItemInput): Promise<{ok: boolean; message: string; itemId?: string}>;
    notify(kind: "info" | "error", message: string): void;
    /** 任意块的 kramdown（捕获当前块用；失败返 null） */
    getBlockKramdown(blockId: string): Promise<string | null>;
    /** 整文档 Markdown（捕获当前文档用；失败返 null） */
    exportDocContent(docId: string): Promise<{hPath: string; content: string} | null>;
    /** AI（默认关；正文出域由服务层把关） */
    aiEnabled(): boolean;
    aiTidy(content: string): Promise<{ok: true; title?: string; alias?: string; tags?: string[]; category?: string} | {ok: false; message: string}>;
    aiDraft(description: string): Promise<{ok: true; text: string} | {ok: false; message: string}>;
    /** 捕获去重：与索引内容同文的既有条目（无则 null） */
    findDuplicate(content: string): Promise<{id: string; title: string} | null>;
    /** 落点库名（异步可缺；null/失败则提示行保持缺省，不阻塞表单） */
    getLibraryName?: () => Promise<string | null>;
}

/** 选区 → 条目类型推断 */
export function inferTypeFromText(text: string): ItemType {
    const trimmed = text.trim();
    if (/^https?:\/\/\S+$/i.test(trimmed)) return "url";
    if (/^```[\w+#.-]*\s*\n[\s\S]*\n```\s*$/.test(trimmed)) return "code";
    if (/^!\[[^\]]*\]\((assets\/[^)\s]+)[^)]*\)$/.test(trimmed)) return "image";
    if (/\]\((assets\/[^)\s]+)[^)]*\)/.test(trimmed)) return "asset";
    if (/^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|\*\*/.test(trimmed) || trimmed.includes("\n")) return "markdown";
    return "text";
}

export class CaptureDialog {
    /** 快速捕获并发锁（⌥⇧V 连按防重入） */
    private quickCapturing = false;

    constructor(private readonly deps: CaptureDeps) {}

    /** 保存当前选区（命令/顶栏入口） */
    async saveSelection(): Promise<void> {
        const sel = this.deps.getSelectionText();
        const text = sel.text.trim();
        if (!text) {
            void this.captureFromClipboard();
            return;
        }
        // 超大选区截断进表单（与剪贴板/当前块路径一致；落库另有 LIMITS.contentChars，R138）
        this.openForm(text.slice(0, 100_000), inferTypeFromText(text), sel.blockId);
    }

    /** 从剪贴板捕获（失败诚实回执） */
    async captureFromClipboard(): Promise<void> {
        try {
            const text = (await this.deps.readClipboardText()).trim();
            if (!text) {
                this.deps.notify("error", this.deps.t("clipboardReadFailed"));
                this.openForm("", "text", null);
                return;
            }
            this.openForm(text.slice(0, 100_000), inferTypeFromText(text), null);
        } catch {
            this.deps.notify("error", this.deps.t("clipboardReadFailed"));
            this.openForm("", "text", null);
        }
    }

    /** 快速捕获剪贴板（F8）：无表单一步入库——类型推断 + 首行作标题；
     *  同文已存在则诚实提示不重复写入（不打断）；⌥⇧V 连按防重入。 */
    async quickCaptureFromClipboard(): Promise<void> {
        if (this.quickCapturing) return;
        this.quickCapturing = true;
        try {
            await this.doQuickCapture();
        } finally {
            this.quickCapturing = false;
        }
    }

    private async doQuickCapture(): Promise<void> {
        let text = "";
        try {
            text = (await this.deps.readClipboardText()).trim();
        } catch {
            text = "";
        }
        if (!text) {
            this.deps.notify("error", this.deps.t("clipboardReadFailed"));
            return;
        }
        const content = text.slice(0, 100_000);
        let dup: {id: string; title: string} | null;
        try {
            dup = await this.deps.findDuplicate(content);
        } catch (err) {
            this.deps.notify("error", this.deps.t("kernelError", err instanceof Error ? err.message : String(err)));
            return;
        }
        if (dup) {
            this.deps.notify("info", this.deps.t("quickCaptureDuplicate", shortTitle(dup.title)));
            return;
        }
        const firstLine = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? content;
        let created: {ok: boolean; message: string; itemId?: string};
        try {
            created = await this.deps.createItem({
                itemType: inferTypeFromText(content),
                markdown: content,
                title: firstLine.slice(0, 512),
            });
        } catch (err) {
            this.deps.notify("error", this.deps.t("kernelError", err instanceof Error ? err.message : String(err)));
            return;
        }
        if (created.ok) {
            // 回执由 index.ts 的 createItem 包装统一给出，不再重复弹「已保存」（R138）
        } else {
            this.deps.notify("error", created.message);
        }
    }

    /** 手动新建（空表单） */
    newManual(titleCandidate?: string): void {
        this.openForm("", "text", null, titleCandidate ? {title: titleCandidate} : undefined);
    }

    /** 右键块引用捕获：把被引用块存为 blockref 条目（目标块=引用目标） */
    captureBlockRef(blockId: string, refText: string): void {
        if (!isBlockRefTarget(blockId)) {
            this.deps.notify("error", this.deps.t("invalidItem"));
            return;
        }
        this.openForm("", "blockref", null, {
            title: (refText || blockId).slice(0, 120),
            targetBlockId: blockId,
            docId: this.deps.currentDocId() ?? undefined,
            sourceType: "block",
        });
    }

    /** 右键图片捕获：assets/ 图片存为图片条目（非 assets 图诚实拒绝） */
    captureImage(assetPath: string, altText: string): void {
        const target = classifyLinkTarget(assetPath);
        if (!target || target.kind !== "asset") {
            this.deps.notify("error", this.deps.t("invalidItem"));
            return;
        }
        const title = (altText || target.value.split("/").pop() || target.value).slice(0, 120);
        this.openForm(`![](${target.value})`, "image", null, {title, docId: this.deps.currentDocId() ?? undefined, sourceType: "resource"});
    }

    /** 右键链接捕获：http(s) 外链 → url 条目；assets/ → asset 条目；其余诚实拒绝 */
    captureLink(href: string, text: string): void {
        const target = classifyLinkTarget(href);
        if (!target) {
            this.deps.notify("error", this.deps.t("invalidItem"));
            return;
        }
        if (target.kind === "url") {
            this.openForm(target.value, "url", null, {title: (text || target.value).slice(0, 120), docId: this.deps.currentDocId() ?? undefined, sourceType: "resource"});
        } else {
            this.openForm(`[${text || this.deps.t("resourceFallback")}](${target.value})`, "asset", null, {title: (text || target.value).slice(0, 120), docId: this.deps.currentDocId() ?? undefined, sourceType: "resource"});
        }
    }

    /** 捕获当前块：光标所在块整体作为条目（选区文本优先级低于整块语义） */
    async captureCurrentBlock(): Promise<void> {
        const blockId = this.deps.getSelectionText().blockId;
        if (!blockId) {
            this.deps.notify("error", this.deps.t("captureBlockNone"));
            return;
        }
        const kramdown = await this.deps.getBlockKramdown(blockId);
        if (kramdown === null || !kramdown.trim()) {
            this.deps.notify("error", this.deps.t("captureBlockFailed"));
            return;
        }
        this.openForm(kramdown.slice(0, 100_000), inferTypeFromText(kramdown), blockId);
    }

    /** 捕获当前文档：整文档 Markdown 作为结构条目（来源 = 该文档） */
    async captureCurrentDoc(): Promise<void> {
        const docId = this.deps.currentDocId();
        if (!docId) {
            this.deps.notify("error", this.deps.t("relinkNoDoc"));
            return;
        }
        const doc = await this.deps.exportDocContent(docId);
        if (!doc) {
            this.deps.notify("error", this.deps.t("captureDocFailed"));
            return;
        }
        const title = doc.hPath.split("/").filter(Boolean).pop() ?? doc.hPath;
        this.openForm(doc.content.slice(0, 100_000), "markdown", null, {title, docId, sourceType: "doc-fragment"});
    }

    openForm(defaultText: string, defaultType: ItemType, sourceBlockId: string | null, overrides?: {title?: string; docId?: string; targetBlockId?: string; sourceType?: "block" | "doc-fragment" | "resource"}): void {
        const t = this.deps.t;
        let closed = false;
        let saving = false;
        let tidySeq = 0;
        let draftSeq = 0;
        const dialog = new Dialog({
            title: t("newItem"),
            content: "",
            width: "min(460px, 92vw)",
            height: "auto",
            destroyCallback: () => {
                closed = true;
                ++tidySeq;
                ++draftSeq;
            },
        });
        const body = getDialogBody(dialog.element);
        if (!body) return;
        body.innerHTML = "";
        const form = document.createElement("div");
        form.className = "xlc-form";

        const field = (label: string, value: string, isArea: boolean, cls: string, parent?: HTMLElement): HTMLInputElement | HTMLTextAreaElement => {
            const wrap = document.createElement("label");
            wrap.className = "xlc-form-field";
            const cap = document.createElement("span");
            cap.className = "xlc-form-label";
            cap.textContent = label;
            wrap.appendChild(cap);
            const inputEl = isArea
                ? document.createElement("textarea")
                : document.createElement("input");
            if (isArea) {
                (inputEl as HTMLTextAreaElement).rows = 6;
            }
            inputEl.className = "b3-text-field " + cls;
            (inputEl as HTMLInputElement).value = value;
            wrap.appendChild(inputEl);
            (parent ?? form).appendChild(wrap);
            return inputEl as HTMLInputElement;
        };

        // 类型（别名同排；挂载点在标题之后，原型屏 3 顺序：AI 草稿→内容→建议→标题→别名|类型→标签|分类）
        const metaRow = document.createElement("div");
        metaRow.className = "xlc-form-row";
        const typeWrap = document.createElement("label");
        typeWrap.className = "xlc-form-field xlc-form-field--fixed";
        const typeLabel = document.createElement("span");
        typeLabel.className = "xlc-form-label";
        typeLabel.textContent = t("type");
        typeWrap.appendChild(typeLabel);
        const typeSelect = document.createElement("select");
        typeSelect.className = "b3-select xlc-form-type";
        for (const it of ["text", "markdown", "url", "code", "image", "asset", "blockref", "structure"] as ItemType[]) {
            const opt = document.createElement("option");
            opt.value = it;
            opt.textContent = t(`type.${it}`);
            if (it === defaultType) opt.selected = true;
            typeSelect.appendChild(opt);
        }
        typeWrap.appendChild(typeSelect);
        metaRow.appendChild(typeWrap);

        const contentEl = field(t("contentLabel"), defaultText, true, "xlc-form-content");
        // 变量快捷插入条（F1 捕获侧，原型屏 3）：点选在内容光标处插入变量语法
        const varbar = buildVariableBar(t, () => contentEl as HTMLTextAreaElement);
        (contentEl.parentElement as HTMLElement).after(varbar);
        const titleEl = field(t("title"), overrides?.title ?? "", false, "xlc-form-title");
        // 原型顺序：标题下方挂 别名|类型 双栏
        form.appendChild(metaRow);
        const aliasEl = field(t("alias"), "", false, "xlc-form-alias", metaRow);
        // 标签 + 分类（原型：双栏行）
        const tagRow = document.createElement("div");
        tagRow.className = "xlc-form-row";
        const tagsEl = field(t("tags"), "", false, "xlc-form-tags", tagRow);
        const tagsHint = document.createElement("span");
        tagsHint.className = "xlc-form-hint";
        tagsHint.textContent = t("tagsHint");
        (tagsEl.parentElement as HTMLElement).appendChild(tagsHint);
        const categoryEl = field(t("category"), "", false, "xlc-form-category", tagRow);
        (categoryEl.parentElement as HTMLElement).classList.add("xlc-form-field--fixed");
        form.appendChild(tagRow);

        // 底部提示行（原型屏 3）：真源声明，紧贴动作区；库名异步补全（回答「存到哪了」）
        const hint = document.createElement("div");
        hint.className = "xlc-form-hint";
        hint.textContent = t("captureHint");
        form.appendChild(hint);
        if (this.deps.getLibraryName) {
            void this.deps.getLibraryName().then((name) => {
                if (closed || !name) return;
                hint.textContent = `${t("captureHint")} · ${t("captureHintLib", name)}`;
            }).catch(() => undefined);
        }

        // 行内必填反馈：内容为空保存时红描边（R109），输入即清除
        const flagContentError = (): void => {
            contentEl.classList.add("xlc-input--error");
            (contentEl as HTMLTextAreaElement).focus();
        };
        contentEl.addEventListener("input", () => contentEl.classList.remove("xlc-input--error"));

        // AI 草稿行（启用 AI 时展示）：描述 → 生成草稿填入内容
        // AI 建议行（AI 整理后展示，全部采纳）
        const sugrow = document.createElement("div");
        sugrow.className = "xlc-sugrow";
        sugrow.style.display = "none";
        const sugText = document.createElement("span");
        sugrow.appendChild(sugText);
        const adoptBtn = document.createElement("button");
        adoptBtn.className = "xlc-sugrow-adopt";
        let suggestions: {title?: string; alias?: string; tags?: string[]; category?: string} = {};
        const applySuggestions = (): void => {
            if (closed || Object.keys(suggestions).length === 0) return;
            if (suggestions.title) (titleEl as HTMLInputElement).value = suggestions.title;
            if (suggestions.alias) (aliasEl as HTMLInputElement).value = suggestions.alias;
            if (suggestions.tags?.length) (tagsEl as HTMLInputElement).value = suggestions.tags.join(", ");
            if (suggestions.category) (categoryEl as HTMLInputElement).value = suggestions.category;
            this.deps.notify("info", t("aiApplied"));
        };
        adoptBtn.textContent = t("adoptAll");
        adoptBtn.addEventListener("click", applySuggestions);
        sugrow.appendChild(adoptBtn);
        form.insertBefore(sugrow, titleEl.parentElement as Node);

        if (this.deps.aiEnabled()) {
            // 内容标签行加「✦ AI 整理」
            const contentLabel = (contentEl.parentElement as HTMLElement).querySelector(".xlc-form-label");
            if (contentLabel) {
                const tidyBtn = document.createElement("button");
                tidyBtn.className = "xlc-form-ai";
                tidyBtn.type = "button";
                tidyBtn.textContent = "✦ " + t("aiTidy");
                let tidyBusy = false;
                const syncTidyButton = (): void => { tidyBtn.disabled = tidyBusy || !(contentEl as HTMLTextAreaElement).value.trim(); };
                contentEl.addEventListener("input", syncTidyButton);
                syncTidyButton();
                tidyBtn.addEventListener("click", () => {
                    if (closed || tidyBusy) return;
                    const value = (contentEl as HTMLTextAreaElement).value.trim();
                    if (!value) {
                        this.deps.notify("error", t("invalidItem"));
                        return;
                    }
                    const request = ++tidySeq;
                    tidyBusy = true;
                    syncTidyButton();
                    tidyBtn.textContent = t("aiWorking");
                    void this.deps.aiTidy(value).then((result) => {
                        if (closed || request !== tidySeq) return;
                        tidyBtn.textContent = "✦ " + t("aiTidy");
                        tidyBusy = false;
                        syncTidyButton();
                        if (!result.ok) {
                            this.deps.notify("error", result.message);
                            return;
                        }
                        suggestions = result;
                        // 原型屏 3：「✦ AI 建议：<b>标题</b> · 标签 … · 分类 …」（标题加粗；区别于搜索的「AI 找到的」）
                        sugText.textContent = "";
                        const lead = document.createElement("span");
                        lead.textContent = "✦ " + t("aiSuggestion") + "：";
                        sugText.appendChild(lead);
                        if (result.title) {
                            const titleEl = document.createElement("b");
                            titleEl.textContent = result.title;
                            sugText.appendChild(titleEl);
                        }
                        const parts = [
                            result.tags?.length ? result.tags.join("/") : "",
                            result.category ?? "",
                        ].filter(Boolean);
                        if (parts.length) {
                            const tail = document.createElement("span");
                            tail.textContent = (result.title ? " · " : "") + parts.join(" · ");
                            sugText.appendChild(tail);
                        }
                        sugrow.style.display = "";
                    }).catch((err: unknown) => {
                        if (closed || request !== tidySeq) return;
                        tidyBtn.textContent = "✦ " + t("aiTidy");
                        tidyBusy = false;
                        syncTidyButton();
                        this.deps.notify("error", err instanceof Error ? err.message : t("aiTransport"));
                    });
                });
                contentLabel.appendChild(tidyBtn);
            }

            // AI 草稿（原型：label=「AI 草稿」+ 主色触发链接；输入框整行）
            const draftWrap = document.createElement("div");
            draftWrap.className = "xlc-form-field";
            const draftLabel = document.createElement("span");
            draftLabel.className = "xlc-form-label";
            draftLabel.textContent = t("aiDraft");
            draftWrap.appendChild(draftLabel);
            const draftBtn = document.createElement("button");
            draftBtn.type = "button";
            draftBtn.className = "xlc-form-ai";
            draftBtn.textContent = "✦ " + t("aiDraftDesc");
            draftLabel.appendChild(draftBtn);
            const draftInput = document.createElement("input");
            draftInput.className = "b3-text-field";
            draftInput.placeholder = t("aiDraftDesc");
            draftWrap.appendChild(draftInput);
            let draftBusy = false;
            draftBtn.disabled = true;
            const syncDraftButton = (): void => { draftBtn.disabled = draftBusy || !draftInput.value.trim(); };
            draftInput.addEventListener("input", syncDraftButton);
            draftBtn.addEventListener("click", () => {
                if (closed || draftBusy) return;
                const desc = draftInput.value.trim();
                if (!desc) {
                    this.deps.notify("error", t("aiDraftNeedDescription"));
                    draftInput.focus();
                    return;
                }
                // 防重入 + 代次守卫：连点/慢响应不得并发覆盖（对齐 AI 整理按钮，R138）
                if (draftBtn.disabled) return;
                draftBusy = true;
                syncDraftButton();
                const request = ++draftSeq;
                draftBtn.textContent = t("aiWorking");
                void this.deps.aiDraft(desc).then((result) => {
                    if (closed || request !== draftSeq) return;
                    draftBtn.textContent = "✦ " + t("aiDraftDesc");
                    draftBusy = false;
                    syncDraftButton();
                    if (!result.ok) {
                        this.deps.notify("error", result.message);
                        return;
                    }
                    const contentBox = contentEl as HTMLTextAreaElement;
                    // 已有内容不静默覆盖：确认后再替换（R138）
                    if (contentBox.value.trim()) {
                        confirm(t("aiDraft"), t("aiDraftOverwrite"), () => {
                            contentBox.value = result.text;
                            contentBox.dispatchEvent(new Event("input", {bubbles: true}));
                        });
                        return;
                    }
                    contentBox.value = result.text;
                    contentBox.dispatchEvent(new Event("input", {bubbles: true}));
                }).catch((err: unknown) => {
                    if (closed || request !== draftSeq) return;
                    draftBtn.textContent = "✦ " + t("aiDraftDesc");
                    draftBusy = false;
                    syncDraftButton();
                    this.deps.notify("error", err instanceof Error ? err.message : t("aiTransport"));
                });
            });
            form.insertBefore(draftWrap, form.firstChild);
        }

        const actions = document.createElement("div");
        actions.className = "xlc-form-actions";
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "b3-button";
        cancelBtn.textContent = t("cancel");
        cancelBtn.addEventListener("click", () => {
            closed = true;
            ++tidySeq;
            ++draftSeq;
            dialog.destroy();
        });
        const saveBtn = document.createElement("button");
        saveBtn.className = "b3-button xlc-btn-primary";
        saveBtn.textContent = t("save");
        // 单行输入 Enter 提交（内容 textarea 换行合法，不绑）
        const submitOnEnter = (el: HTMLInputElement): void => {
            el.addEventListener("keydown", (ev) => {
                // IME 组合态：Enter 属选词确认，不得触发保存（对齐 dialog.ts 惯例，R138）
                if (ev.isComposing || ev.keyCode === 229) return;
                if (ev.key === "Enter" && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
                    ev.preventDefault();
                    saveBtn.click();
                }
            });
        };
        [titleEl, aliasEl, tagsEl, categoryEl].forEach((el) => submitOnEnter(el as HTMLInputElement));
        saveBtn.addEventListener("click", () => {
            if (closed || saving) return;
            const contentValue = (contentEl as HTMLTextAreaElement).value;
            // blockref 条目锚定目标块，允许无正文保存（右键引用捕获的正文本就为空，R138）
            if (!contentValue.trim() && !(typeSelect.value === "blockref" && overrides?.targetBlockId)) {
                flagContentError();
                this.deps.notify("error", t("invalidItem"));
                return;
            }
            const type = typeSelect.value as ItemType;
            // blockref 条目必须有目标块——手动表单无法提供，引导用右键块引用捕获
            if (type === "blockref" && !overrides?.targetBlockId) {
                this.deps.notify("error", t("blockrefNeedsTarget"));
                return;
            }
            let markdown = contentValue;
            if (type === "code" && !/^```/.test(contentValue.trim())) {
                markdown = "```\n" + contentValue + "\n```";
            } else if (type === "url") {
                markdown = contentValue.trim();
            }
            const doSave = (): void => {
                if (closed || saving) return;
                saving = true;
                saveBtn.disabled = true;
                saveBtn.textContent = t("saving");
                cancelBtn.disabled = true;
                const docId = this.deps.currentDocId();
                void this.deps.createItem({
                    itemType: type,
                    markdown,
                    title: (titleEl as HTMLInputElement).value || undefined,
                    alias: (aliasEl as HTMLInputElement).value || undefined,
                    tags: (tagsEl as HTMLInputElement).value ? (tagsEl as HTMLInputElement).value.split(/[,,]/).map((s) => s.trim()).filter(Boolean) : undefined,
                    category: (categoryEl as HTMLInputElement).value || undefined,
                    targetBlockId: overrides?.targetBlockId,
                    source: docId ? {sourceDocId: docId, sourceBlockId: sourceBlockId ?? undefined, sourceType: overrides?.sourceType ?? (sourceBlockId ? "selection" : "manual")} : undefined,
                }).then((result) => {
                    saving = false;
                    if (result.ok) {
                        // 回执由 index.ts 的 createItem 包装统一给出（此前双 toast，R138）
                        closed = true;
                        dialog.destroy();
                    } else {
                        saveBtn.disabled = false;
                        saveBtn.textContent = t("save");
                        cancelBtn.disabled = false;
                        this.deps.notify("error", result.message);
                    }
                }).catch((err: unknown) => {
                    saving = false;
                    if (closed) return;
                    saveBtn.disabled = false;
                    saveBtn.textContent = t("save");
                    cancelBtn.disabled = false;
                    this.deps.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
                });
            };
            // 去重防护：同文条目已存在 → 明确确认（不静默重复入库）
            void this.deps.findDuplicate(contentValue).then((dup) => {
                if (closed || saving) return;
                if (!dup) {
                    doSave();
                    return;
                }
                confirm("⚠️ " + t("duplicateTitle"), t("duplicateConfirm", dup.title), () => {
                    if (!closed) doSave();
                });
            }).catch((err: unknown) => {
                if (closed) return;
                this.deps.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
            });
        });
        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        form.appendChild(actions);
        body.appendChild(form);
        (contentEl as HTMLTextAreaElement).focus();
    }
}

/** 删除确认（明确回执，不静默） */
export function confirmDelete(t: (key: string, ...args: string[]) => string, title: string, onConfirm: () => void): void {
    confirm("⚠️ " + t("delete"), t("deleteConfirm", title), () => onConfirm(), undefined);
}
