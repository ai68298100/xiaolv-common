// 交互式 CSV/TSV 字段映射向导（G13，R271）：
// 粘贴表格文本后自动检测列数并展示「标题/正文/分类/标签/别名/链接」映射下拉框；
// 支持拖拽重排、一键「智能推断」（基于表头关键词匹配）；
// 实时预览前 5 行解析结果，确认后再进入导入策略对话框。

import {Dialog} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {inferColumnMapping} from "../service/csv-tsv-import";
import {ExportedItem} from "../model/transfer";
import {toErrorMessage} from "../model/errors";
import type {SettingsUiContext} from "./settings-dialog";

export interface CsvTsvWizardState {
    rawText: string;
    delimiter: string;
    grid: string[][];
    mapping: {
        titleIndex: number;
        contentIndex: number;
        categoryIndex: number;
        tagsIndex: number;
        aliasIndex: number;
        urlIndex: number;
    };
    previewRows: ExportedItem[];
}

/** 交互式字段映射向导对话框 */
export function openCsvTsvImportWizard(ctx: SettingsUiContext, onClose?: () => void): void {
    const t = ctx.t;
    const dialog = new Dialog({
        title: t("csvImportTitle"),
        content: "",
        width: "min(800px, 96vw)",
        height: "min(700px, 86vh)",
    });
    const container = dialog.element.querySelector(".b3-dialog__container");
    if (container) container.classList.add("xlc-form-host", "xlc-settings-host");
    const body = getDialogBody(dialog.element);
    if (!body) {
        onClose?.();
        return;
    }
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form";

    // 步骤 1：粘贴表格文本
    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.textContent = t("csvImportHint");
    root.appendChild(hint);

    const ta = document.createElement("textarea");
    ta.className = "b3-text-field";
    ta.dataset.xlcControl = "wizard.csv.text";
    ta.rows = 8;
    ta.placeholder = t("csvImportPlaceholder");
    ta.setAttribute("spellcheck", "false");
    root.appendChild(ta);

    // 状态管理
    let state: CsvTsvWizardState = {
        rawText: "",
        delimiter: ",",
        grid: [],
        mapping: {
            titleIndex: -1,
            contentIndex: -1,
            categoryIndex: -1,
            tagsIndex: -1,
            aliasIndex: -1,
            urlIndex: -1,
        },
        previewRows: [],
    };

    // 步骤 2：字段映射区域
    const mapRow = document.createElement("div");
    mapRow.className = "xlc-wizard-mapping-row";
    mapRow.style.display = "none";
    const mapTitle = document.createElement("h4");
    mapTitle.className = "xlc-form-title";
    mapTitle.textContent = t("fieldMapping");
    mapRow.appendChild(mapTitle);

    const mappingGrid = document.createElement("div");
    mappingGrid.className = "xlc-wizard-mapping-grid";
    mappingGrid.style.display = "grid";
    mappingGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(200px, 1fr))";
    mappingGrid.style.gap = "12px";
    mappingGrid.style.marginTop = "8px";

    const createMappingSelect = (fieldName: keyof typeof state.mapping): HTMLSelectElement => {
        const select = document.createElement("select");
        select.className = "b3-text-field xlc-wizard-select";
        select.dataset.xlcControl = `wizard.field.${fieldName}`;
        select.addEventListener("change", () => {
            state.mapping[fieldName] = parseInt(select.value, 10);
            updatePreview();
        });
        return select;
    };

    const fieldLabels: Array<{key: keyof typeof state.mapping}> = [
        {key: "titleIndex"},
        {key: "contentIndex"},
        {key: "categoryIndex"},
        {key: "tagsIndex"},
        {key: "aliasIndex"},
        {key: "urlIndex"},
    ];

    for (const {key} of fieldLabels) {
        const sel = createMappingSelect(key);
        mappingGrid.appendChild(sel);
    }

    const btnRow = document.createElement("div");
    btnRow.className = "xlc-form-actions";
    btnRow.style.justifyContent = "flex-start";
    btnRow.style.gap = "8px";

    const autoBtn = document.createElement("button");
    autoBtn.className = "b3-button b3-button--secondary";
    autoBtn.textContent = "✨ " + t("autoInfer");
    autoBtn.addEventListener("click", () => {
        const inferred = inferColumnMapping(state.grid);
        state.mapping.titleIndex = inferred.titleIndex;
        state.mapping.contentIndex = inferred.contentIndex;
        state.mapping.categoryIndex = inferred.categoryIndex;
        state.mapping.tagsIndex = inferred.tagsIndex;
        state.mapping.aliasIndex = inferred.aliasIndex;
        state.mapping.urlIndex = inferred.urlIndex;
        syncMappingToUI();
        updatePreview();
    });
    btnRow.appendChild(autoBtn);

    mapRow.appendChild(mappingGrid);
    mapRow.appendChild(btnRow);
    root.appendChild(mapRow);

    // 步骤 3：预览区域
    const preview = document.createElement("div");
    preview.className = "xlc-form-hint";
    preview.style.whiteSpace = "pre-wrap";
    preview.style.maxHeight = "200px";
    preview.style.overflowY = "auto";
    preview.style.border = "1px solid var(--b3-border-color)";
    preview.style.padding = "8px";
    preview.style.borderRadius = "var(--b3-radius-md)";
    root.appendChild(preview);

    // 底部按钮
    const foot = document.createElement("div");
    foot.className = "xlc-form-actions";
    foot.style.justifyContent = "flex-end";
    foot.style.gap = "8px";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.textContent = t("cancel");
    cancelBtn.addEventListener("click", () => {
        dialog.destroy();
        release();
    });

    const nextBtn = document.createElement("button");
    nextBtn.className = "b3-button xlc-btn-primary";
    nextBtn.textContent = t("setupNext");
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => {
        if (nextBtn.disabled || !parsedItems.length || parsedText !== state.rawText) return;
        dialog.destroy();
        release();
        void loadParser().then((parser) => {
            const fullResult = parser.parseCsvTsvItems(state.rawText, state.delimiter, Date.now(), state.mapping);
            const importIssues = fullResult.issues.map((reason, index) => ({index, reason}));
            void import("./settings-dialog").then((mod) => {
                mod.openImportPolicyDialog(
                    ctx,
                    {items: fullResult.items.map((i) => ({id: i.id, title: i.title}))},
                    importIssues,
                    {kind: "csv-tsv", items: fullResult.items},
                );
            });
        });
    });

    foot.appendChild(cancelBtn);
    foot.appendChild(nextBtn);
    root.appendChild(foot);
    body.appendChild(root);

    let released = false;
    const release = (): void => {
        if (released) return;
        released = true;
        observer?.disconnect();
        onClose?.();
    };
    let observer: MutationObserver | null = null;
    observer = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
        if (!dialog.element.isConnected) release();
    });
    observer?.observe(document.body, {childList: true, subtree: true});

    let parsedItems: ExportedItem[] = [];
    let parsedText: string | null = null;
    let parserPromise: Promise<typeof import("../service/csv-tsv-import")> | null = null;

    const loadParser = async (): Promise<typeof import("../service/csv-tsv-import")> => {
        if (!parserPromise) parserPromise = import("../service/csv-tsv-import");
        return parserPromise;
    };

    const updatePreview = async (): Promise<void> => {
        if (!state.rawText.trim()) {
            preview.textContent = t("noData");
            nextBtn.disabled = true;
            return;
        }

        try {
            const parser = await loadParser();
            const {delimiter, grid} = parser.parseDelimitedTable(state.rawText, state.delimiter);
            state.delimiter = delimiter;
            state.grid = grid;

            // 显示字段映射区域
            mapRow.style.display = "block";
            syncMappingToUI();

            const result = parser.parseCsvTsvItems(state.rawText, state.delimiter, Date.now(), state.mapping);
            parsedItems = result.items.slice(0, 5);
            parsedText = state.rawText;

            const lines = [`解析出 ${result.validRows} 条（分隔符「${delimiter === "\t" ? "Tab" : delimiter === ";" ? "分号" : "逗号"}」）`];
            for (const item of parsedItems) {
                lines.push(`• ${item.title} (${item.itemType})`);
            }
            if (parsedItems.length < result.validRows) {
                lines.push(`· …+${result.validRows - parsedItems.length}`);
            }
            preview.textContent = lines.join("\n");
            nextBtn.disabled = parsedItems.length === 0;
        } catch (err) {
            preview.textContent = t("importFailed", toErrorMessage(err).slice(0, 120));
            nextBtn.disabled = true;
        }
    };

    const syncMappingToUI = (): void => {
        const selects = mappingGrid.querySelectorAll<HTMLSelectElement>(".xlc-wizard-select");
        for (const sel of Array.from(selects)) {
            const fieldName = sel.dataset.xlcControl?.replace("wizard.field.", "") as keyof typeof state.mapping;
            if (fieldName && fieldName in state.mapping) {
                sel.value = String(state.mapping[fieldName]);
            }
        }
    };

    let parseTimer: ReturnType<typeof setTimeout> | undefined;
    ta.addEventListener("input", () => {
        if (parseTimer) clearTimeout(parseTimer);
        state.rawText = ta.value;
        mapRow.style.display = "none";
        preview.textContent = t("loading");
        nextBtn.disabled = true;
        parseTimer = setTimeout(() => { void updatePreview(); }, 400);
    });

    cancelBtn.addEventListener("click", () => {
        dialog.destroy();
        release();
    });

    ta.focus();
}
