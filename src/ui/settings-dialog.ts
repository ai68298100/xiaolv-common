// 设置界面（自 index.ts 拆出，R19）：首次引导 / 完整设置 / 库选择器 / AI / 搜索 / 数据区 / 标签体检 / 导入策略。
// 依赖经 SettingsUiContext 注入（不持有插件实例）；状态对象按引用共享，落盘由 persistSoon 节流。
import {Dialog, confirm} from "siyuan";
import {CONFIG_VERSION, LibraryConfig, PluginState} from "../model/storage";
import {LIMITS} from "../constants";
import {validateImport, ConflictPolicy, ImportIssue, ImportReceipt} from "../model/transfer";
import {buildZip} from "../model/zip";
import {buildMarkdownExport} from "../service/export-markdown";
import {LibraryService} from "../service/library";
import {AiAssistant} from "../service/ai";
import {CommonItem} from "../model/item";

type TFn = (key: string, ...args: string[]) => string;

export interface SettingsUiContext {
    t: TFn;
    state: PluginState;
    getConfig(): LibraryConfig | null;
    library: LibraryService;
    ai: AiAssistant;
    notify(kind: "info" | "error", message: string): void;
    applyConfig(config: LibraryConfig): void;
    persistSoon(): void;
    exportBundle(): Promise<string>;
    importBundleText(text: string, policy: ConflictPolicy): Promise<ImportReceipt>;
    fetchAssetBytes(assetPath: string): Promise<Uint8Array | null>;
    aiErrorText(err: unknown): string;
    applyPinyinAdapter(): void;
}

/** 首次引导（仅库选择；完整设置见 openSettingsDialog） */
export function openSetupDialog(ctx: SettingsUiContext): void {
    const t = ctx.t;
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
    buildLibraryPickerSection(ctx, root, () => dialog.destroy());
    body.appendChild(root);
}

/** 完整设置：库管理（含更改库）+ AI + 搜索 + 数据 */
export function openSettingsDialog(ctx: SettingsUiContext): void {
    const t = ctx.t;
    const dialog = new Dialog({
        title: t("openSettings"),
        content: "",
        width: "min(560px, 92vw)",
        height: "auto",
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form";

    // 库管理：状态行 + 「更改内容库」展开选择器
    const libSec = document.createElement("div");
    libSec.className = "xlc-form-field";
    const libLabel = document.createElement("span");
    libLabel.className = "xlc-form-label";
    libLabel.textContent = t("librarySection");
    libSec.appendChild(libLabel);
    const libStatus = document.createElement("div");
    libStatus.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libStatus.textContent = cfg
        ? (cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} · ${cfg.containerDocIds.length} doc(s)`)
        : t("libraryNone");
    libSec.appendChild(libStatus);
    const changeBtn = document.createElement("button");
    changeBtn.className = "b3-button";
    changeBtn.textContent = t("openSettingsChangeLib");
    const pickerHost = document.createElement("div");
    pickerHost.style.display = "none";
    changeBtn.addEventListener("click", () => {
        const show = pickerHost.style.display === "none";
        pickerHost.style.display = show ? "" : "none";
        if (show && pickerHost.childElementCount === 0) {
            buildLibraryPickerSection(ctx, pickerHost, () => dialog.destroy());
        }
    });
    libSec.appendChild(changeBtn);
    libSec.appendChild(pickerHost);
    root.appendChild(libSec);

    buildAiSection(ctx, root);
    buildSearchSection(ctx, root);
    buildDataSection(ctx, root);
    body.appendChild(root);
}

/** 库选择器（首跑引导与「更改库」共用；onConfigured 在配置落地后回调） */
function buildLibraryPickerSection(ctx: SettingsUiContext, root: HTMLElement, onConfigured: () => void): void {
    const t = ctx.t;

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
    void ctx.library.listNotebooks().then((result) => {
        if (!result.ok) {
            ctx.notify("error", t("kernelError", result.message));
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
            ctx.notify("error", t("invalidItem"));
            return;
        }
        // 创建前明确确认（不静默写入）
        confirm("⚠️ " + t("setupTitle"), t("setupConfirmCreate", title), () => {
            void ctx.library.createLibraryDoc(notebookId, title).then((result) => {
                if (!result.ok) {
                    ctx.notify("error", t("kernelError", result.message));
                    return;
                }
                ctx.applyConfig({
                    configVersion: CONFIG_VERSION,
                    mode: "doc",
                    notebookIds: [],
                    containerDocIds: [result.data.docId],
                    createdDocIds: [result.data.docId],
                    configuredAt: Date.now(),
                });
                ctx.notify("info", t("libDocCreated", title));
                onConfigured();
            });
        });
    });
    // doc/tree 模式：文档选择器（searchDocs 关键词搜索 → 点选使用）
    const pickerWrap = document.createElement("div");
    pickerWrap.className = "xlc-form-field";
    const pickerInput = document.createElement("input");
    pickerInput.className = "b3-text-field";
    pickerInput.placeholder = t("docPicker");
    pickerWrap.appendChild(pickerInput);
    const pickerList = document.createElement("div");
    pickerList.className = "xlc-doclist";
    pickerWrap.appendChild(pickerList);
    root.appendChild(pickerWrap);
    let pickedDoc: {id: string; hPath: string} | null = null;
    let pickerSeq = 0;
    pickerInput.addEventListener("input", () => {
        const seq = ++pickerSeq;
        const k = pickerInput.value.trim();
        pickerList.innerHTML = "";
        pickedDoc = null;
        if (!k) return;
        void ctx.library.searchDocs(k).then((result) => {
            if (seq !== pickerSeq) return;
            if (!result.ok || result.data.length === 0) {
                const empty = document.createElement("div");
                empty.className = "xlc-doclist-empty";
                empty.textContent = result.ok ? t("docPickerEmpty") : t("kernelError", result.message);
                pickerList.appendChild(empty);
                return;
            }
            for (const hit of result.data.slice(0, 8)) {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "xlc-doclist-item";
                item.textContent = hit.hPath || hit.name || hit.id;
                item.addEventListener("click", () => {
                    pickedDoc = {id: hit.id, hPath: hit.hPath};
                    pickerList.querySelectorAll(".xlc-doclist-item").forEach((el) => el.classList.remove("xlc-doclist-item--on"));
                    item.classList.add("xlc-doclist-item--on");
                });
                pickerList.appendChild(item);
            }
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
                ctx.notify("error", t("invalidItem"));
                return;
            }
            ctx.applyConfig({
                configVersion: CONFIG_VERSION,
                mode: "notebook",
                notebookIds: [notebookId],
                containerDocIds: [],
                createdDocIds: [],
                configuredAt: Date.now(),
            });
            onConfigured();
            return;
        }
        if (!pickedDoc) {
            ctx.notify("error", t("docPickerEmpty"));
            return;
        }
        ctx.applyConfig({
            configVersion: CONFIG_VERSION,
            mode,
            notebookIds: [],
            containerDocIds: [pickedDoc.id],
            createdDocIds: [],
            configuredAt: Date.now(),
        });
        onConfigured();
    });
    actions.appendChild(createBtn);
    actions.appendChild(useNotebookBtn);
    root.appendChild(actions);
}

function buildAiSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    // AI 设置区（默认关；开启即视为同意元数据出域；正文出域单独开关）
    const aiSec = document.createElement("div");
    aiSec.className = "xlc-form-field";
    const aiLabel = document.createElement("span");
    aiLabel.className = "xlc-form-label";
    aiLabel.textContent = t("aiSection");
    aiSec.appendChild(aiLabel);
    const aiRow = (key: "enabled" | "shareContent", text: string): HTMLInputElement => {
        const row = document.createElement("label");
        row.className = "xlc-setting-row";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = ctx.state.ai[key];
        box.addEventListener("change", () => {
            ctx.state.ai[key] = box.checked;
            if (key === "enabled" && !box.checked) ctx.state.ai.shareContent = false;
            ctx.ai.updateSettings(ctx.state.ai);
            ctx.persistSoon();
        });
        const cap = document.createElement("span");
        cap.textContent = text;
        row.appendChild(box);
        row.appendChild(cap);
        aiSec.appendChild(row);
        return box;
    };
    const aiEnabledBox = aiRow("enabled", t("aiEnabled"));
    const aiShareBox = aiRow("shareContent", t("aiShareContent"));
    aiEnabledBox.addEventListener("change", () => {
        if (!aiEnabledBox.checked) aiShareBox.checked = false;
    });
    root.appendChild(aiSec);
}

function buildSearchSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    // 搜索设置区（拼音：本地注解，无出域）
    const searchSec = document.createElement("div");
    searchSec.className = "xlc-form-field";
    const searchLabel = document.createElement("span");
    searchLabel.className = "xlc-form-label";
    searchLabel.textContent = t("searchSection");
    searchSec.appendChild(searchLabel);
    const pinyinRow = document.createElement("label");
    pinyinRow.className = "xlc-setting-row";
    const pinyinBox = document.createElement("input");
    pinyinBox.type = "checkbox";
    pinyinBox.checked = ctx.state.search.pinyin;
    pinyinBox.addEventListener("change", () => {
        ctx.state.search.pinyin = pinyinBox.checked;
        ctx.applyPinyinAdapter();
        ctx.persistSoon();
        void ctx.library.reindex().then((idx) => {
            ctx.notify("info", t("reindexDone", String(idx.entries.length)));
        });
    });
    const pinyinCap = document.createElement("span");
    pinyinCap.textContent = t("pinyinToggle");
    pinyinRow.appendChild(pinyinBox);
    pinyinRow.appendChild(pinyinCap);
    searchSec.appendChild(pinyinRow);
    // 占位符开关
    const phRow = document.createElement("label");
    phRow.className = "xlc-setting-row";
    const phBox = document.createElement("input");
    phBox.type = "checkbox";
    phBox.checked = ctx.state.search.placeholders;
    phBox.addEventListener("change", () => {
        ctx.state.search.placeholders = phBox.checked;
        ctx.persistSoon();
    });
    const phCap = document.createElement("span");
    phCap.textContent = t("placeholdersToggle");
    phRow.appendChild(phBox);
    phRow.appendChild(phCap);
    searchSec.appendChild(phRow);
    const phHint = document.createElement("span");
    phHint.className = "xlc-form-hint";
    phHint.textContent = t("placeholdersHint");
    searchSec.appendChild(phHint);
    root.appendChild(searchSec);
}

function buildDataSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    // 数据区：当前库 + 重建索引 + 清空最近 + 标签体检 + 导出/导入
    const dataSec = document.createElement("div");
    dataSec.className = "xlc-form-field";
    const dataLabel = document.createElement("span");
    dataLabel.className = "xlc-form-label";
    dataLabel.textContent = t("dataSection");
    dataSec.appendChild(dataLabel);
    const libRow = document.createElement("div");
    libRow.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libRow.textContent = `${t("librarySection")}：${cfg
        ? (cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} · ${cfg.containerDocIds.length}`)
        : t("libraryNone")}`;
    dataSec.appendChild(libRow);
    const dataBtns = document.createElement("div");
    dataBtns.style.display = "flex";
    dataBtns.style.gap = "8px";
    dataBtns.style.flexWrap = "wrap";
    const mkBtn = (label: string, onClick: () => void): HTMLButtonElement => {
        const btn = document.createElement("button");
        btn.className = "b3-button";
        btn.textContent = label;
        btn.addEventListener("click", onClick);
        dataBtns.appendChild(btn);
        return btn;
    };
    mkBtn(t("reindexBtn"), () => {
        ctx.library.reindex().then((idx) => {
            ctx.notify("info", idx.truncated
                ? t("reindexTruncated", String(LIMITS.maxItems))
                : t("reindexDone", String(idx.entries.length)));
        });
    });
    mkBtn(t("clearRecents"), () => {
        confirm("⚠️ " + t("clearRecents"), t("clearRecentsConfirm"), () => {
            ctx.state.recents = [];
            ctx.persistSoon();
            ctx.notify("info", t("clearRecentsDone"));
        });
    });
    if (ctx.state.ai.enabled) {
        mkBtn("✦ " + t("tagAuditBtn"), () => void runTagAudit(ctx));
    }
    mkBtn(t("exportBtn"), () => {
        void ctx.exportBundle().then((json) => {
            const count = (JSON.parse(json) as {items: unknown[]}).items.length;
            const blob = new Blob([json], {type: "application/json"});
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `xiaolv-common-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            ctx.notify("info", t("exportDone", String(count)));
        });
    });
    mkBtn(t("exportMdBtn"), () => {
        void (async () => {
            const idx = await ctx.library.ensureIndex();
            const items: CommonItem[] = [];
            const kramdownById = new Map<string, string>();
            for (const item of idx.items.values()) {
                const kd = await ctx.library.getItemKramdown(item);
                if (kd.ok) {
                    items.push(item);
                    kramdownById.set(item.id, kd.data);
                }
            }
            const result = await buildMarkdownExport(items, kramdownById, (assetPath) => ctx.fetchAssetBytes(assetPath));
            const zipBytes = buildZip(result.entries);
            const blob = new Blob([zipBytes as unknown as BlobPart], {type: "application/zip"});
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `xiaolv-common-md-${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
            ctx.notify("info", t("exportMdDone", String(result.itemCount), String(result.assetCount), String(result.skippedAssets.length)));
        })();
    });
    const importBtn = mkBtn(t("importBtn"), () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json,application/json";
        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            if (file.size > LIMITS.maxImportBytes) {
                ctx.notify("error", t("importFailed", "file too large"));
                return;
            }
            void file.text().then((text) => {
                const validation = validateImport(text);
                if (!validation.ok || !validation.parsed) {
                    ctx.notify("error", t("importFailed", validation.reason ?? "unknown"));
                    return;
                }
                openImportPolicyDialog(ctx, validation.parsed, validation.issues, text);
            });
        });
        fileInput.click();
    });
    void importBtn;
    dataSec.appendChild(dataBtns);
    root.appendChild(dataSec);
}

/** AI 标签体检：仅标签清单出域；结果只展示，不自动修改任何条目 */
async function runTagAudit(ctx: SettingsUiContext): Promise<void> {
    const t = ctx.t;
    const idx = await ctx.library.ensureIndex();
    const {collectTags} = await import("../model/search");
    const tags = collectTags(idx.entries);
    if (tags.length < 2) {
        ctx.notify("info", t("tagAuditTooFew"));
        return;
    }
    let suggestions;
    try {
        suggestions = await ctx.ai.tagAudit(tags);
    } catch (err) {
        ctx.notify("error", ctx.aiErrorText(err));
        return;
    }
    const dialog = new Dialog({
        title: t("tagAuditTitle"),
        content: "",
        width: "min(520px, 92vw)",
        height: "auto",
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "xlc-form";
    if (suggestions.length === 0) {
        const empty = document.createElement("p");
        empty.className = "xlc-form-hint";
        empty.textContent = t("tagAuditEmpty");
        wrap.appendChild(empty);
    } else {
        for (const s of suggestions) {
            const row = document.createElement("div");
            row.className = "xlc-sugrow";
            const label = document.createElement("span");
            label.textContent = `✦ ${t(s.type === "merge" ? "tagAuditMerge" : "tagAuditRename")}：${s.tags.join(" + ")} → ${s.suggestion}${s.reason ? `（${s.reason}）` : ""}`;
            row.appendChild(label);
            wrap.appendChild(row);
        }
        const hint = document.createElement("span");
        hint.className = "xlc-form-hint";
        hint.textContent = t("aiOriginalPreserved");
        wrap.appendChild(hint);
    }
    const actions = document.createElement("div");
    actions.className = "xlc-form-actions";
    const close = document.createElement("button");
    close.className = "b3-button";
    close.textContent = t("close");
    close.addEventListener("click", () => dialog.destroy());
    actions.appendChild(close);
    wrap.appendChild(actions);
    body.appendChild(wrap);
}

/** 导入策略确认（导入前校验已过；策略三选 → importBundleText → 汇总回执） */
function openImportPolicyDialog(
    ctx: SettingsUiContext,
    parsed: {items: Array<{id: string; title: string}>},
    issues: ImportIssue[],
    text: string,
): void {
    const t = ctx.t;
    const dialog = new Dialog({
        title: t("importPolicyTitle"),
        content: "",
        width: "min(440px, 92vw)",
        height: "auto",
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "xlc-form";
    const preview = document.createElement("p");
    preview.className = "xlc-form-hint";
    preview.textContent = t("importPreview", String(parsed.items.length), String(issues.length));
    wrap.appendChild(preview);
    const run = (policy: ConflictPolicy): void => {
        dialog.destroy();
        void ctx.importBundleText(text, policy).then((receipt) => {
            ctx.notify(receipt.failed > 0 ? "error" : "info", t(
                "importDone",
                String(receipt.created),
                String(receipt.skipped),
                String(receipt.overwritten),
                String(receipt.renamed),
                String(receipt.failed),
            ));
        }).catch((err) => {
            ctx.notify("error", t("importFailed", (err as Error).message));
        });
    };
    const btns = document.createElement("div");
    btns.className = "xlc-form-actions";
    btns.style.flexDirection = "column";
    btns.style.alignItems = "stretch";
    for (const [policy, label] of [
        ["skip", t("importPolicySkip")],
        ["overwrite", t("importPolicyOverwrite")],
        ["rename", t("importPolicyRename")],
    ] as Array<[ConflictPolicy, string]>) {
        const btn = document.createElement("button");
        btn.className = "b3-button";
        btn.textContent = label;
        btn.addEventListener("click", () => run(policy));
        btns.appendChild(btn);
    }
    wrap.appendChild(btns);
    body.appendChild(wrap);
}
