// 捕获流程：选区/当前块 → 新条目表单（类型推断 + 元数据一步完成）。
// 剪贴板读取失败（权限/平台）诚实回执，保留手动输入。
import {Dialog, confirm} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {ItemType, isSafeHttpUrl} from "../model/item";
import {toErrorMessage} from "../model/errors";
import {NewItemInput} from "../service/library";
import {buildVariableBar} from "./variable-form";
import {bodyWriteRestriction} from "../model/kramdown";
import {LIMITS} from "../constants";
import type {SearchEntry} from "../model/search";
import {deriveOmniItemMetadata} from "../service/omni-search";

/** 块引用目标校验（官方 data-id 属性值） */
export function isBlockRefTarget(blockId: string): boolean {
    return /^\d{14}-[0-9a-z]{7}$/.test(blockId);
}

/** 回执 toast 的标题展示截断（标题最长 512 字；原文不受影响） */
const TOAST_TITLE_MAX = 48;
const shortTitle = (title: string): string => (title.length > TOAST_TITLE_MAX ? `${title.slice(0, TOAST_TITLE_MAX)}…` : title);
/** 每次提交生成短期幂等 key，服务层据此抵御重复双击和重试。 */
const newWriteKey = (scope: string): string => `xlc-${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`.slice(0, 120);

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
    createItem(input: NewItemInput, options?: {idempotencyKey?: string}): Promise<{ok: boolean; message: string; itemId?: string}>;
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
    findDuplicate(content: string, options?: {excludeId?: string}): Promise<{id: string; title: string} | null>;
    /** 落点库名（异步可缺；null/失败则提示行保持缺省，不阻塞表单） */
    getLibraryName?: () => Promise<string | null>;
    isConfigured?: () => boolean;
    onNotConfigured?: () => void;
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
    /** 命令面板入口没有可禁用的按钮，用操作锁防止重复读取和重复落库。 */
    private readonly activeCaptures = new Set<string>();
    private formOpen = false;

    constructor(private readonly deps: CaptureDeps) {}

    /** 保存前的共同前置条件：没有内容库时直接回到首次设置，避免先访问宿主再报错。 */
    private ensureConfigured(): boolean {
        if (!this.deps.isConfigured || this.deps.isConfigured()) return true;
        this.deps.onNotConfigured?.();
        return false;
    }

    private async withCaptureLock(key: string, action: () => Promise<void>): Promise<void> {
        if (this.activeCaptures.has(key)) {
            this.deps.notify("info", this.deps.t("captureBusy"));
            return;
        }
        this.activeCaptures.add(key);
        try {
            await action();
        } catch (err) {
            this.deps.notify("error", this.deps.t("kernelError", toErrorMessage(err)));
        } finally {
            this.activeCaptures.delete(key);
        }
    }

    private checkCaptureSize(text: string): boolean {
        if (text.length <= LIMITS.contentChars) return true;
        this.deps.notify("error", this.deps.t("aiContentTooLong", String(LIMITS.contentChars)));
        return false;
    }

    /** 保存当前选中内容（命令面板/正文右键入口） */
    async saveSelection(): Promise<void> {
        if (!this.ensureConfigured()) return;
        let sel: {text: string; blockId: string | null};
        try {
            sel = this.deps.getSelectionText();
        } catch (err) {
            this.deps.notify("error", this.deps.t("kernelError", toErrorMessage(err)));
            return;
        }
        const text = sel.text.trim();
        if (!text) {
            this.deps.notify("error", this.deps.t("captureSelectionEmpty"));
            return;
        }
        const content = text;
        if (!this.checkCaptureSize(content)) return;
        this.openForm(content, inferTypeFromText(content), sel.blockId, {
            docId: this.deps.currentDocId() ?? undefined,
            sourceType: "selection",
        });
    }

    /** 从剪贴板捕获（失败诚实回执） */
    async captureFromClipboard(): Promise<void> {
        if (!this.ensureConfigured()) return;
        await this.withCaptureLock("clipboard", async () => {
            try {
                const text = (await this.deps.readClipboardText()).trim();
                if (!text) {
                    this.deps.notify("error", this.deps.t("clipboardEmpty"));
                    this.openForm("", "text", null, {
                        sourceType: "clipboard",
                    });
                    return;
                }
                const content = text;
                if (!this.checkCaptureSize(content)) return;
                this.openForm(content, inferTypeFromText(content), null, {
                    sourceType: "clipboard",
                });
            } catch {
                this.deps.notify("error", this.deps.t("clipboardReadFailed"));
                this.openForm("", "text", null, {
                    sourceType: "clipboard",
                });
            }
        });
    }

    /** 快速捕获剪贴板（F8）：无表单一步入库——类型推断 + 首行作标题；
     *  同文已存在则诚实提示不重复写入（不打断）；⌥⇧V 连按防重入。 */
    async quickCaptureFromClipboard(): Promise<void> {
        if (this.deps.isConfigured && !this.deps.isConfigured()) {
            this.deps.onNotConfigured?.();
            return;
        }
        await this.withCaptureLock("clipboard", () => this.doQuickCapture());
    }

    private async doQuickCapture(): Promise<void> {
        let text = "";
        let readFailed = false;
        try {
            text = (await this.deps.readClipboardText()).trim();
        } catch {
            readFailed = true;
        }
        if (!text) {
            this.deps.notify("error", this.deps.t(readFailed ? "clipboardReadFailed" : "clipboardEmpty"));
            return;
        }
        const content = text;
        if (!this.checkCaptureSize(content)) return;
        if (bodyWriteRestriction(content)) {
            this.deps.notify("error", this.deps.t("multiBlockPendingHint"));
            return;
        }
        let dup: {id: string; title: string} | null;
        try {
            dup = await this.deps.findDuplicate(content);
        } catch (err) {
            this.deps.notify("error", this.deps.t("kernelError", toErrorMessage(err)));
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
                source: {sourceType: "clipboard"},
            }, {idempotencyKey: newWriteKey("clipboard")});
        } catch (err) {
            this.deps.notify("error", this.deps.t("kernelError", toErrorMessage(err)));
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
        if (!this.ensureConfigured()) return;
        this.openForm("", "text", null, {
            ...(titleCandidate ? {title: titleCandidate} : {}),
            docId: this.deps.currentDocId() ?? undefined,
            sourceType: "manual",
        });
    }

    /** 从外部文本创建草稿（拖拽放置 / 面板快捷粘贴入口，ADR 0034 / T-0061） */
    newWithContent(content: string, options?: {title?: string; sourceType?: "selection" | "block" | "doc-fragment" | "clipboard" | "manual" | "resource"}): void {
        if (!this.ensureConfigured()) return;
        const text = (content ?? "").trim();
        if (!text) {
            this.newManual(options?.title);
            return;
        }
        if (!this.checkCaptureSize(text)) return;
        const safeText = text;
        const inferredType = inferTypeFromText(safeText);
        const derived = inferredType === "url"
            ? safeText
            : (safeText.split("\n")[0] || "").slice(0, 60).trim();
        const title = options?.title || derived || this.deps.t("unknownType");
        this.openForm(safeText, inferredType, null, {
            title,
            docId: this.deps.currentDocId() ?? undefined,
            sourceType: options?.sourceType ?? "manual",
        });
    }

    /** 右键块引用捕获：把被引用块存为 blockref 条目（目标块=引用目标） */
    captureBlockRef(blockId: string, refText: string): void {
        if (!this.ensureConfigured()) return;
        if (!isBlockRefTarget(blockId)) {
            this.deps.notify("error", this.deps.t("invalidItem"));
            return;
        }
        this.openForm(`((${blockId}))`, "blockref", null, {
            title: (refText || blockId).slice(0, 120),
            targetBlockId: blockId,
            docId: this.deps.currentDocId() ?? undefined,
            sourceType: "block",
        });
    }

    /** 右键图片捕获：assets/ 图片存为图片条目（非 assets 图诚实拒绝） */
    captureImage(assetPath: string, altText: string): void {
        if (!this.ensureConfigured()) return;
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
        if (!this.ensureConfigured()) return;
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

    /** 保存当前块：光标所在块整体作为条目，独立于选区保存语义。 */
    async captureCurrentBlock(): Promise<void> {
        if (!this.ensureConfigured()) return;
        const sourceDocId = this.deps.currentDocId() ?? undefined;
        await this.withCaptureLock("block", async () => {
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
            const content = kramdown;
            if (!this.checkCaptureSize(content)) return;
            this.openForm(content, inferTypeFromText(content), blockId, {
                docId: sourceDocId,
                sourceType: "block",
            });
        });
    }

    /** 保存整篇文档为单个 Markdown 条目；不等同于发现文档中的多个候选。 */
    async captureCurrentDoc(): Promise<void> {
        if (!this.ensureConfigured()) return;
        await this.withCaptureLock("document", async () => {
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
            if (!doc.content.trim()) {
                this.deps.notify("error", this.deps.t("captureDocEmpty"));
                return;
            }
            const title = doc.hPath.split("/").filter(Boolean).pop() ?? doc.hPath;
            const content = doc.content;
            if (!this.checkCaptureSize(content)) return;
            this.openForm(content, "markdown", null, {title, docId, sourceType: "doc-fragment"});
        });
    }

    /** 全域条目编辑并收录：携带条目正文、类型、来源文档与全域收录标签打开收录表单 */
    captureOmniWithForm(entry: SearchEntry): void {
        if (!this.ensureConfigured()) return;
        const text = (entry.content || entry.summary || "").trim();
        const title = entry.title || this.deps.t("unknownType");
        const meta = deriveOmniItemMetadata(entry);
        this.openForm(text, entry.itemType, null, {
            title,
            alias: meta.recommendedAlias || undefined,
            tags: meta.tags,
            category: meta.category,
            docId: entry.sourceDocId,
            targetBlockId: entry.targetBlockId,
            sourceType: "block",
        });
    }

    openForm(defaultText: string, defaultType: ItemType, sourceBlockId: string | null, overrides?: {title?: string; alias?: string; docId?: string; targetBlockId?: string; tags?: string[]; category?: string; sourceType?: "selection" | "block" | "doc-fragment" | "clipboard" | "manual" | "resource"}): void {
        if (this.deps.isConfigured && !this.deps.isConfigured()) {
            this.deps.onNotConfigured?.();
            return;
        }
        if (this.formOpen) {
            this.deps.notify("info", this.deps.t("captureBusy"));
            return;
        }
        this.formOpen = true;
        const t = this.deps.t;
        let closed = false;
        let saving = false;
        const formWriteKey = newWriteKey("form");
        let tidySeq = 0;
        let draftSeq = 0;
        const dialog = new Dialog({
            title: t("newItem"),
            content: "",
            width: "min(620px, 92vw)",
            height: "min(860px, 92vh)",
            destroyCallback: () => {
                closed = true;
                this.formOpen = false;
                ++tidySeq;
                ++draftSeq;
            },
        });
        dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-form-host");
        const body = getDialogBody(dialog.element);
        if (!body) {
            this.formOpen = false;
            dialog.destroy();
            return;
        }
        body.innerHTML = "";
        const form = document.createElement("div");
        form.className = "xlc-form xlc-capture";
        const intro = document.createElement("p");
        intro.className = "xlc-page-intro";
        intro.textContent = t("captureIntro");
        form.appendChild(intro);

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
        typeSelect.dataset.xlcControl = "capture.type";
        for (const it of ["text", "markdown", "url", "code", "image", "asset", "blockref", "structure"] as ItemType[]) {
            const opt = document.createElement("option");
            opt.value = it;
            opt.textContent = t(`type.${it}`);
            if (it === defaultType) opt.selected = true;
            typeSelect.appendChild(opt);
        }
        let userExplicitlySetType = Boolean(defaultType && defaultType !== "text");
        typeSelect.addEventListener("change", () => {
            userExplicitlySetType = true;
        });
        metaRow.appendChild(typeWrap);

        const contentEl = field(t("contentLabel"), defaultText, true, "xlc-form-content");
        contentEl.dataset.xlcControl = "capture.content";
        const contentWrap = contentEl.parentElement as HTMLElement;
        const contentError = document.createElement("span");
        contentError.className = "xlc-form-error";
        contentError.id = "xlc-capture-content-error";
        contentError.setAttribute("role", "alert");
        contentError.hidden = true;
        contentWrap.appendChild(contentError);
        const multiBlockHint = document.createElement("span");
        multiBlockHint.className = "xlc-form-hint";
        multiBlockHint.dataset.xlcControl = "capture.body-restriction";
        multiBlockHint.setAttribute("role", "note");
        multiBlockHint.textContent = t("multiBlockPendingHint");
        contentWrap.appendChild(multiBlockHint);
        // 变量快捷插入条（F1 捕获侧，原型屏 3）：点选在内容光标处插入变量语法
        const varbar = buildVariableBar(t, () => contentEl as HTMLTextAreaElement);
        (contentEl.parentElement as HTMLElement).after(varbar);
        const titleEl = field(t("title"), overrides?.title ?? "", false, "xlc-form-title");
        titleEl.dataset.xlcControl = "capture.title";
        // 原型顺序：标题下方挂 别名|类型 双栏
        form.appendChild(metaRow);
        const aliasEl = field(t("alias"), overrides?.alias ?? "", false, "xlc-form-alias", metaRow);
        aliasEl.dataset.xlcControl = "capture.alias";
        metaRow.insertBefore(aliasEl.parentElement as HTMLElement, typeWrap);
        // 标签 + 分类（原型：双栏行）
        const tagRow = document.createElement("div");
        tagRow.className = "xlc-form-row";
        const initialTags = overrides?.tags ? overrides.tags.join("; ") : "";
        const tagsEl = field(t("tags"), initialTags, false, "xlc-form-tags", tagRow);
        tagsEl.dataset.xlcControl = "capture.tags";
        const tagsHint = document.createElement("span");
        tagsHint.className = "xlc-form-hint";
        tagsHint.textContent = t("tagsHint");
        (tagsEl.parentElement as HTMLElement).appendChild(tagsHint);
        const categoryEl = field(t("category"), overrides?.category ?? "", false, "xlc-form-category", tagRow);
        categoryEl.dataset.xlcControl = "capture.category";
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

        // 行内必填反馈：定位正文并关联具体错误，输入后清除错误状态。
        const flagContentError = (message: string): void => {
            contentEl.classList.add("xlc-input--error");
            contentEl.setAttribute("aria-invalid", "true");
            contentEl.setAttribute("aria-describedby", contentError.id);
            contentError.textContent = message;
            contentError.hidden = false;
            (contentEl as HTMLTextAreaElement).focus();
        };
        contentEl.addEventListener("input", () => {
            contentEl.classList.remove("xlc-input--error");
            contentEl.removeAttribute("aria-invalid");
            contentEl.removeAttribute("aria-describedby");
            contentError.hidden = true;
            contentError.textContent = "";

            // 智能正文类型与标题实时感知（G45）
            const val = (contentEl as HTMLTextAreaElement).value.trim();
            if (val && !userExplicitlySetType) {
                const detected = inferTypeFromText(val);
                if (detected !== typeSelect.value) {
                    typeSelect.value = detected;
                }
            }
            if (!(titleEl as HTMLInputElement).value.trim() && val) {
                const firstLine = val.replace(/^#+\s*/, "").split("\n")[0]?.trim() || "";
                if (firstLine) {
                    (titleEl as HTMLInputElement).placeholder = `推荐标题: ${firstLine.slice(0, 30)}`;
                }
            }
        });

        // AI 草稿行（启用 AI 时展示）：描述 → 生成草稿填入内容
        // AI 建议行（AI 整理后展示，全部采纳）
        const sugrow = document.createElement("div");
        sugrow.className = "xlc-sugrow";
        sugrow.style.display = "none";
        const sugText = document.createElement("span");
        sugrow.appendChild(sugText);
        const adoptBtn = document.createElement("button");
        adoptBtn.className = "xlc-sugrow-adopt";
        adoptBtn.dataset.xlcControl = "capture.ai.suggestion.adopt";
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
                tidyBtn.dataset.xlcControl = "capture.ai.tidy";
                tidyBtn.textContent = "✦ " + t("aiTidy");
                const tidyFailure = document.createElement("div");
                tidyFailure.className = "xlc-ai-failure";
                tidyFailure.hidden = true;
                const tidyFailureMessage = document.createElement("span");
                tidyFailureMessage.className = "xlc-form-error";
                tidyFailureMessage.dataset.xlcControl = "capture.ai.tidy.error";
                tidyFailureMessage.setAttribute("role", "alert");
                tidyFailureMessage.setAttribute("aria-live", "assertive");
                tidyFailure.appendChild(tidyFailureMessage);
                const tidyRetryBtn = document.createElement("button");
                tidyRetryBtn.type = "button";
                tidyRetryBtn.className = "xlc-form-ai xlc-ai-retry";
                tidyRetryBtn.dataset.xlcControl = "capture.ai.tidy.retry";
                tidyRetryBtn.textContent = t("retry");
                tidyFailure.appendChild(tidyRetryBtn);
                (contentEl.parentElement as HTMLElement).appendChild(tidyFailure);
                let tidyBusy = false;
                const syncTidyButton = (): void => { tidyBtn.disabled = tidyBusy || !(contentEl as HTMLTextAreaElement).value.trim(); };
                contentEl.addEventListener("input", syncTidyButton);
                syncTidyButton();
                const clearTidyFailure = (): void => {
                    tidyFailure.hidden = true;
                    tidyFailureMessage.textContent = "";
                };
                const showTidyFailure = (message: string): void => {
                    tidyFailureMessage.textContent = message || t("aiTransport");
                    tidyFailure.hidden = false;
                };
                const runTidy = (): void => {
                    if (closed || tidyBusy) return;
                    const value = (contentEl as HTMLTextAreaElement).value.trim();
                    if (!value) {
                        this.deps.notify("error", t("invalidItem"));
                        return;
                    }
                    clearTidyFailure();
                    // A new request invalidates prior suggestions: never offer stale metadata after a failure.
                    suggestions = {};
                    sugText.textContent = "";
                    sugrow.style.display = "none";
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
                            showTidyFailure(result.message);
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
                            result.alias ? `${t("alias")}：${result.alias}` : "",
                            result.tags?.length ? `${t("tags")}：${result.tags.join("/")}` : "",
                            result.category ? `${t("category")}：${result.category}` : "",
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
                        showTidyFailure(toErrorMessage(err, t("aiTransport")));
                    });
                };
                tidyBtn.addEventListener("click", runTidy);
                tidyRetryBtn.addEventListener("click", runTidy);
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
            draftBtn.dataset.xlcControl = "capture.ai.draft.generate";
            draftBtn.textContent = "✦ " + t("aiDraftDesc");
            draftLabel.appendChild(draftBtn);
            const draftInput = document.createElement("input");
            draftInput.className = "b3-text-field";
            draftInput.dataset.xlcControl = "capture.ai.draft.description";
            draftInput.placeholder = t("aiDraftDesc");
            draftWrap.appendChild(draftInput);
            const draftFailure = document.createElement("div");
            draftFailure.className = "xlc-ai-failure";
            draftFailure.hidden = true;
            const draftFailureMessage = document.createElement("span");
            draftFailureMessage.className = "xlc-form-error";
            draftFailureMessage.dataset.xlcControl = "capture.ai.draft.error";
            draftFailureMessage.setAttribute("role", "alert");
            draftFailureMessage.setAttribute("aria-live", "assertive");
            draftFailure.appendChild(draftFailureMessage);
            const draftRetryBtn = document.createElement("button");
            draftRetryBtn.type = "button";
            draftRetryBtn.className = "xlc-form-ai xlc-ai-retry";
            draftRetryBtn.dataset.xlcControl = "capture.ai.draft.retry";
            draftRetryBtn.textContent = t("retry");
            draftFailure.appendChild(draftRetryBtn);
            draftWrap.appendChild(draftFailure);
            let draftBusy = false;
            draftBtn.disabled = true;
            const syncDraftButton = (): void => { draftBtn.disabled = draftBusy || !draftInput.value.trim(); };
            draftInput.addEventListener("input", syncDraftButton);
            const clearDraftFailure = (): void => {
                draftFailure.hidden = true;
                draftFailureMessage.textContent = "";
            };
            const showDraftFailure = (message: string): void => {
                draftFailureMessage.textContent = message || t("aiTransport");
                draftFailure.hidden = false;
            };
            const runDraft = (): void => {
                if (closed || draftBusy) return;
                const desc = draftInput.value.trim();
                if (!desc) {
                    this.deps.notify("error", t("aiDraftNeedDescription"));
                    draftInput.focus();
                    return;
                }
                // 防重入 + 代次守卫：连点/慢响应不得并发覆盖（对齐 AI 整理按钮，R138）
                if (draftBtn.disabled) return;
                clearDraftFailure();
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
                        showDraftFailure(result.message);
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
                    showDraftFailure(toErrorMessage(err, t("aiTransport")));
                });
            };
            draftBtn.addEventListener("click", runDraft);
            draftRetryBtn.addEventListener("click", runDraft);
            form.insertBefore(draftWrap, form.firstChild);
        }

        const actions = document.createElement("div");
        actions.className = "xlc-form-actions";
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "b3-button";
        cancelBtn.dataset.xlcControl = "capture.cancel";
        cancelBtn.textContent = t("cancel");
        cancelBtn.addEventListener("click", () => {
            closed = true;
            ++tidySeq;
            ++draftSeq;
            dialog.destroy();
        });
        const saveBtn = document.createElement("button");
        saveBtn.className = "b3-button xlc-btn-primary";
        saveBtn.dataset.xlcControl = "capture.save";
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
            // A reference with a known target is stored as a real, single-line reference marker.
            if (!contentValue.trim() && !(typeSelect.value === "blockref" && overrides?.targetBlockId)) {
                flagContentError(t("captureContentRequired"));
                this.deps.notify("error", t("captureContentRequired"));
                return;
            }
            const type = typeSelect.value as ItemType;
            // blockref 条目必须有目标块——手动表单无法提供，引导用右键块引用捕获
            if (type === "blockref" && !overrides?.targetBlockId) {
                this.deps.notify("error", t("blockrefNeedsTarget"));
                return;
            }
            let markdown = type === "blockref" && !contentValue.trim() && overrides?.targetBlockId
                ? `((${overrides.targetBlockId}))` : contentValue;
            if (type === "code" && !/^```/.test(contentValue.trim())) {
                markdown = "```\n" + contentValue + "\n```";
            } else if (type === "url") {
                markdown = contentValue.trim();
                if (!isSafeHttpUrl(markdown)) {
                    flagContentError(t("captureUrlInvalid"));
                    this.deps.notify("error", t("captureUrlInvalid"));
                    return;
                }
            }
            if (bodyWriteRestriction(markdown)) {
                const message = markdown.length > LIMITS.contentChars
                    ? t("aiContentTooLong", String(LIMITS.contentChars)) : t("multiBlockPendingHint");
                flagContentError(message);
                this.deps.notify("error", message);
                return;
            }
            // 查重同样是保存流程的一部分：先锁住动作，避免内核查询期间连点落入重复条目。
            saving = true;
            saveBtn.disabled = true;
            saveBtn.textContent = t("checkingDuplicate");
            cancelBtn.disabled = true;
            const doSave = (): void => {
                if (closed) return;
                saving = true;
                saveBtn.disabled = true;
                saveBtn.textContent = t("saving");
                cancelBtn.disabled = true;
                // Presence of overrides.docId means the capture source was frozen at entry time;
                // preserve an explicit undefined so switching tabs cannot attach another document.
                const docId = overrides && "docId" in overrides
                    ? overrides.docId
                    : overrides?.sourceType === "clipboard" ? undefined : this.deps.currentDocId();
                void this.deps.createItem({
                    itemType: type,
                    markdown,
                    title: (titleEl as HTMLInputElement).value || undefined,
                    alias: (aliasEl as HTMLInputElement).value || undefined,
                    tags: (tagsEl as HTMLInputElement).value ? (tagsEl as HTMLInputElement).value.split(/[,,]/).map((s) => s.trim()).filter(Boolean) : undefined,
                    category: (categoryEl as HTMLInputElement).value || undefined,
                    url: type === "url" ? markdown : undefined,
                    targetBlockId: overrides?.targetBlockId,
                    source: (docId || sourceBlockId || overrides?.sourceType)
                        ? {
                            sourceDocId: docId ?? "",
                            sourceBlockId: sourceBlockId ?? "",
                            sourceType: overrides?.sourceType ?? (sourceBlockId ? "selection" : "manual"),
                        }
                        : undefined,
                }, {idempotencyKey: formWriteKey}).then((result) => {
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
                    this.deps.notify("error", t("kernelError", toErrorMessage(err)));
                });
            };
            // 去重防护：同文条目已存在 → 明确确认（不静默重复入库）
            void this.deps.findDuplicate(contentValue).then((dup) => {
                if (closed) return;
                if (!dup) {
                    saving = false;
                    doSave();
                    return;
                }
                saving = false;
                saveBtn.disabled = false;
                saveBtn.textContent = t("save");
                cancelBtn.disabled = false;
                confirm("⚠️ " + t("duplicateTitle"), t("duplicateConfirm", dup.title), () => {
                    if (!closed) doSave();
                });
            }).catch((err: unknown) => {
                if (closed) return;
                saving = false;
                saveBtn.disabled = false;
                saveBtn.textContent = t("save");
                cancelBtn.disabled = false;
                this.deps.notify("error", t("kernelError", toErrorMessage(err)));
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
