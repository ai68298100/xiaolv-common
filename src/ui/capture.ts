// 捕获流程：选区/当前块 → 新条目表单（类型推断 + 元数据一步完成）。
// 剪贴板读取失败（权限/平台）诚实回执，保留手动输入。
import {Dialog, confirm} from "siyuan";
import {ItemType} from "../model/item";
import {NewItemInput} from "../service/library";

export interface CaptureDeps {
    t: (key: string, ...args: string[]) => string;
    /** 当前选区纯文本（官方选区 API + data-node-id 块定位，见 ADR 0003 DOM 边界） */
    getSelectionText(): {text: string; blockId: string | null};
    currentDocId(): string | null;
    readClipboardText(): Promise<string>;
    createItem(input: NewItemInput): Promise<{ok: boolean; message: string; itemId?: string}>;
    notify(kind: "info" | "error", message: string): void;
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
    constructor(private readonly deps: CaptureDeps) {}

    /** 保存当前选区（命令/顶栏入口） */
    async saveSelection(): Promise<void> {
        const sel = this.deps.getSelectionText();
        const text = sel.text.trim();
        if (!text) {
            void this.captureFromClipboard();
            return;
        }
        this.openForm(text, inferTypeFromText(text), sel.blockId);
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

    /** 手动新建（空表单） */
    newManual(): void {
        this.openForm("", "text", null);
    }

    openForm(defaultText: string, defaultType: ItemType, sourceBlockId: string | null): void {
        const t = this.deps.t;
        const dialog = new Dialog({
            title: t("newItem"),
            content: "",
            width: "min(520px, 92vw)",
            height: "auto",
        });
        const body = dialog.element.querySelector(".b3-dialog__content");
        if (!body) return;
        body.innerHTML = "";
        const form = document.createElement("div");
        form.className = "xlc-form";

        const field = (label: string, value: string, isArea: boolean, cls: string): HTMLInputElement | HTMLTextAreaElement => {
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
            form.appendChild(wrap);
            return inputEl as HTMLInputElement;
        };

        const typeWrap = document.createElement("label");
        typeWrap.className = "xlc-form-field";
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
        form.appendChild(typeWrap);

        const contentEl = field(t("type.text"), defaultText, true, "xlc-form-content");
        const titleEl = field(t("title"), "", false, "xlc-form-title");
        const aliasEl = field(t("alias"), "", false, "xlc-form-alias");
        const tagsEl = field(t("tags"), "", false, "xlc-form-tags");
        const tagsHint = document.createElement("span");
        tagsHint.className = "xlc-form-hint";
        tagsHint.textContent = t("tagsHint");
        (tagsEl.parentElement as HTMLElement).appendChild(tagsHint);
        const categoryEl = field(t("category"), "", false, "xlc-form-category");

        const actions = document.createElement("div");
        actions.className = "xlc-form-actions";
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "b3-button b3-button--cancel";
        cancelBtn.textContent = t("cancel");
        cancelBtn.addEventListener("click", () => dialog.destroy());
        const saveBtn = document.createElement("button");
        saveBtn.className = "b3-button b3-button--text";
        saveBtn.textContent = t("save");
        saveBtn.addEventListener("click", () => {
            const contentValue = (contentEl as HTMLTextAreaElement).value;
            if (!contentValue.trim()) {
                this.deps.notify("error", t("invalidItem"));
                return;
            }
            const type = typeSelect.value as ItemType;
            let markdown = contentValue;
            if (type === "code" && !/^```/.test(contentValue.trim())) {
                markdown = "```\n" + contentValue + "\n```";
            } else if (type === "url") {
                markdown = contentValue.trim();
            }
            const docId = this.deps.currentDocId();
            void this.deps.createItem({
                itemType: type,
                markdown,
                title: (titleEl as HTMLInputElement).value || undefined,
                alias: (aliasEl as HTMLInputElement).value || undefined,
                tags: (tagsEl as HTMLInputElement).value ? (tagsEl as HTMLInputElement).value.split(/[,,]/).map((s) => s.trim()).filter(Boolean) : undefined,
                category: (categoryEl as HTMLInputElement).value || undefined,
                source: docId ? {sourceDocId: docId, sourceBlockId: sourceBlockId ?? undefined, sourceType: sourceBlockId ? "selection" : "manual"} : undefined,
            }).then((result) => {
                if (result.ok) {
                    this.deps.notify("info", t("saved", result.message));
                    dialog.destroy();
                } else {
                    this.deps.notify("error", result.message);
                }
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
