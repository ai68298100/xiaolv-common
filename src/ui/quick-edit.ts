// 全域块就地快编弹窗（Omni Block Quick Edit · G14）：
// 在搜索全域结果时，支持快捷就地微调思源块内容；
// 写入前严格遵循 B-006 单行正文或完整代码围栏边界约束，杜绝破坏排版层级。

import {Dialog} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {validateOmniBlockUpdate} from "../service/omni-search";

export interface QuickEditDeps {
    t: (key: string, ...args: string[]) => string;
    updateBlock: (blockId: string, content: string) => Promise<{success: boolean; error?: string}>;
    notify: (type: "info" | "error", message: string) => void;
    onUpdated?: (blockId: string, newContent: string) => void;
}

export function openQuickEditDialog(
    deps: QuickEditDeps,
    blockId: string,
    initialContent: string,
): Dialog {
    let closed = false;
    let saving = false;
    const dialog = new Dialog({
        title: `${deps.t("quickEditBlock")} (${blockId})`,
        content: "",
        width: "min(620px, 92vw)",
        destroyCallback: () => {
            closed = true;
        },
    });

    const body = getDialogBody(dialog);
    const container = document.createElement("div");
    container.className = "xlc-quick-edit-container";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "12px";
    container.style.padding = "16px";

    const textarea = document.createElement("textarea");
    textarea.className = "b3-text-field fn__block";
    textarea.style.height = "180px";
    textarea.style.resize = "vertical";
    textarea.style.fontFamily = "var(--b3-font-family-code)";
    textarea.style.fontSize = "13px";
    textarea.style.lineHeight = "1.5";
    textarea.value = initialContent;
    textarea.dataset.xlcControl = "quick-edit.textarea";

    const errHint = document.createElement("div");
    errHint.className = "xlc-form-error";
    errHint.style.color = "var(--b3-theme-error)";
    errHint.style.fontSize = "12px";
    errHint.style.minHeight = "18px";
    errHint.style.display = "none";
    errHint.dataset.xlcControl = "quick-edit.error";

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";
    btnRow.style.gap = "8px";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button b3-button--cancel";
    cancelBtn.textContent = deps.t("cancel");
    cancelBtn.dataset.xlcControl = "quick-edit.cancel";
    cancelBtn.addEventListener("click", () => dialog.destroy());

    const saveBtn = document.createElement("button");
    saveBtn.className = "b3-button b3-button--text";
    saveBtn.textContent = deps.t("saveChanges");
    saveBtn.dataset.xlcControl = "quick-edit.save";

    const doSave = async () => {
        if (saving || closed) return;
        const val = textarea.value.trim();
        if (!val) {
            errHint.textContent = deps.t("captureContentRequired");
            errHint.style.display = "";
            return;
        }

        // B-006 写前校验
        const check = validateOmniBlockUpdate(val);
        if (!check.valid) {
            errHint.textContent = check.error || "B-006 validation error";
            errHint.style.display = "";
            deps.notify("error", check.error || "B-006 validation error");
            return;
        }

        saving = true;
        saveBtn.disabled = true;
        saveBtn.textContent = deps.t("loading");
        errHint.style.display = "none";

        const res = await deps.updateBlock(blockId, val);
        if (closed) return;
        saving = false;
        saveBtn.disabled = false;
        saveBtn.textContent = deps.t("saveChanges");

        if (res.success) {
            deps.notify("info", deps.t("blockUpdated"));
            deps.onUpdated?.(blockId, val);
            dialog.destroy();
        } else {
            const msg = res.error || deps.t("kernelError", "failed to update");
            errHint.textContent = msg;
            errHint.style.display = "";
            deps.notify("error", msg);
        }
    };

    saveBtn.addEventListener("click", () => void doSave());
    textarea.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            void doSave();
        } else if (e.key === "Escape") {
            dialog.destroy();
        }
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);

    container.appendChild(textarea);
    container.appendChild(errHint);
    container.appendChild(btnRow);

    body.appendChild(container);
    setTimeout(() => textarea.focus(), 50);

    return dialog;
}
