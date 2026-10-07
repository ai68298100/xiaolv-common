// 设置界面（自 index.ts 拆出，R19）：首次引导 / 完整设置 / 库选择器 / AI / 搜索 / 数据区 / 标签体检 / 导入策略。
// 依赖经 SettingsUiContext 注入（不持有插件实例）；状态对象按引用共享，落盘由 persistSoon 节流。
import {Dialog, confirm} from "siyuan";
import {CONFIG_VERSION, LibraryConfig, PluginState} from "../model/storage";
import {LIMITS} from "../constants";
import {validateImport, ConflictPolicy, ImportIssue, ImportReceipt, ExportedItem} from "../model/transfer";
import {buildZip} from "../model/zip";
import {buildMarkdownExport} from "../service/export-markdown";
import {parseMarkdownPack} from "../service/import-markdown";
import {LibraryService} from "../service/library";
import {AiAssistant} from "../service/ai";
import {ProviderRegistry} from "../service/providers";
import {CommonItem} from "../model/item";
import {collectTags} from "../model/search";
import {PROMPT_PACK_MD} from "../service/prompt-pack";

type TFn = (key: string, ...args: string[]) => string;

/** 开关行统一构造（文本+说明在左，开关右贴；input 语义不变） */
function buildSwitchRow(text: string, sub: string | null, checked: boolean, onChange: (value: boolean) => void): HTMLLabelElement {
    const row = document.createElement("label");
    row.className = "xlc-setting-row";
    const cap = document.createElement("span");
    cap.className = "xlc-setting-text";
    cap.textContent = text;
    if (sub) {
        const subEl = document.createElement("div");
        subEl.className = "xlc-setting-sub";
        subEl.textContent = sub;
        cap.appendChild(subEl);
    }
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "xlc-switch";
    box.checked = checked;
    box.addEventListener("change", () => onChange(box.checked));
    row.appendChild(cap);
    row.appendChild(box);
    return row;
}

export interface SettingsUiContext {
    t: TFn;
    state: PluginState;
    getConfig(): LibraryConfig | null;
    library: LibraryService;
    ai: AiAssistant;
    registry: ProviderRegistry;
    notify(kind: "info" | "error", message: string): void;
    applyConfig(config: LibraryConfig): void;
    persistSoon(): void;
    exportBundle(): Promise<string>;
    importBundleText(text: string, policy: ConflictPolicy): Promise<ImportReceipt>;
    importMarkdownItems(items: ReadonlyArray<ExportedItem>, policy: ConflictPolicy): Promise<ImportReceipt>;
    fetchAssetBytes(assetPath: string): Promise<Uint8Array | null>;
    aiErrorText(err: unknown): string;
    applyPinyinAdapter(): void;
}

export interface SetupDialogOptions {
    /** 配置落地后回调 */
    onConfigured?: () => void;
    /** 用户点击「稍后再说」 */
    onDismiss?: () => void;
}

/** 首次引导（仅库选择，两步式；完整设置见 openSettingsDialog） */
export function openSetupDialog(ctx: SettingsUiContext, opts?: SetupDialogOptions): void {
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
    buildLibraryPickerSection(ctx, root, () => {
        dialog.destroy();
        opts?.onConfigured?.();
    }, {onDismiss: () => dialog.destroy()});
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

    // 库管理：状态行 + 「更改内容库」展开选择器（分区卡片）
    const libSec = document.createElement("div");
    libSec.className = "xlc-form-field xlc-card";
    const libLabel = document.createElement("span");
    libLabel.className = "xlc-form-label";
    libLabel.textContent = t("librarySection");
    libSec.appendChild(libLabel);
    const libStatus = document.createElement("div");
    libStatus.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libStatus.textContent = cfg
        ? (cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} · ${t("docCount", String(cfg.containerDocIds.length))}`)
        : t("libraryNone");
    const changeBtn = document.createElement("button");
    changeBtn.className = "b3-button";
    changeBtn.textContent = t("openSettingsChangeLib");
    // 原型屏 5：状态与按钮同行（状态左、按钮右贴）
    const libRow = document.createElement("div");
    libRow.className = "xlc-setting-row";
    const statusText = document.createElement("span");
    statusText.className = "xlc-setting-text";
    statusText.textContent = libStatus.textContent;
    libRow.appendChild(statusText);
    libRow.appendChild(changeBtn);
    libSec.appendChild(libRow);
    const pickerHost = document.createElement("div");
    pickerHost.style.display = "none";
    changeBtn.addEventListener("click", () => {
        const show = pickerHost.style.display === "none";
        pickerHost.style.display = show ? "" : "none";
        if (show && pickerHost.childElementCount === 0) {
            buildLibraryPickerSection(ctx, pickerHost, () => dialog.destroy());
        }
    });
    libSec.appendChild(pickerHost);
    root.appendChild(libSec);

    buildAiSection(ctx, root);
    buildInsertSection(ctx, root);
    buildSearchSection(ctx, root);
    buildProviderSection(ctx, root);
    buildDataSection(ctx, root);
    body.appendChild(root);
}

/** 模板包导出（F6，原型屏 8 右帧）：包名 / 分类筛选 / 内容清单 → items.md+assets ZIP。
 *  分享的是「活的块」：导入方得到真实思源块，可继续编辑与再分享。 */
async function openPackExportDialog(ctx: SettingsUiContext): Promise<void> {
    const t = ctx.t;
    const idx = await ctx.library.ensureIndex();
    // 性能（R76 修正 R71 回归）：打开对话框零 kramdown 预取——
    // 「含变量」徽标用写入期 varCount 属性（索引免费读取），正文在点导出时才按筛选取
    const all: CommonItem[] = Array.from(idx.items.values());
    const categories = Array.from(new Set(all.map((i) => i.category).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

    const dialog = new Dialog({
        title: t("packExportTitle"),
        content: "",
        width: "min(460px, 92vw)",
        height: "auto",
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "xlc-form";

    // 元数据徽标行（随筛选联动）
    const meta = document.createElement("div");
    meta.className = "xlc-import-meta";
    wrap.appendChild(meta);
    const paintMeta = (count: number, varCount: number): void => {
        meta.textContent = "";
        const countBadge = document.createElement("span");
        countBadge.className = "xlc-badge xlc-badge--markdown";
        countBadge.textContent = t("itemCountBadge", String(count));
        meta.appendChild(countBadge);
        if (varCount > 0) {
            const varBadge = document.createElement("span");
            varBadge.className = "xlc-badge xlc-badge--var";
            varBadge.textContent = t("packVarsBadge", String(varCount));
            meta.appendChild(varBadge);
        }
    };

    // 分类筛选（全部 / 各分类）
    const catWrap = document.createElement("div");
    catWrap.className = "xlc-form-field";
    const catLabel = document.createElement("label");
    catLabel.className = "xlc-form-label";
    catLabel.textContent = t("packCategoryLabel");
    catWrap.appendChild(catLabel);
    const catSelect = document.createElement("select");
    catSelect.className = "b3-select";
    catSelect.id = "xlc-pack-category";
    catLabel.htmlFor = catSelect.id;
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = t("allCategories");
    catSelect.appendChild(allOpt);
    for (const c of categories) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
    }
    catWrap.appendChild(catSelect);
    wrap.appendChild(catWrap);

    // 包名称
    const nameWrap = document.createElement("div");
    nameWrap.className = "xlc-form-field";
    const nameLabel = document.createElement("label");
    nameLabel.className = "xlc-form-label";
    nameLabel.textContent = t("packNameLabel");
    nameWrap.appendChild(nameLabel);
    const nameInput = document.createElement("input");
    nameInput.className = "b3-text-field";
    nameInput.id = "xlc-pack-name";
    nameLabel.htmlFor = nameInput.id;
    nameInput.value = t("packNameDefault");
    nameWrap.appendChild(nameInput);
    wrap.appendChild(nameWrap);

    // 包含内容说明
    const contents = document.createElement("div");
    contents.className = "xlc-form-hint";
    contents.style.lineHeight = "1.8";
    // 清单含 \n 三行结构：pre-line 才能换行（默认 div 会塌成一行，R111 修）
    contents.style.whiteSpace = "pre-line";
    contents.textContent = t("packContentsHint");
    wrap.appendChild(contents);
    const trustHint = document.createElement("div");
    trustHint.className = "xlc-form-hint";
    trustHint.style.marginTop = "8px";
    trustHint.textContent = t("packTrustHint");
    wrap.appendChild(trustHint);

    const actions = document.createElement("div");
    actions.className = "xlc-form-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.textContent = t("cancel");
    cancelBtn.addEventListener("click", () => dialog.destroy());
    actions.appendChild(cancelBtn);
    const exportBtn = document.createElement("button");
    exportBtn.className = "b3-button xlc-btn-primary";
    exportBtn.textContent = t("packExportBtn");
    exportBtn.addEventListener("click", () => {
        const packName = nameInput.value.trim() || t("packNameDefault");
        const category = catSelect.value;
        const items = category ? all.filter((i) => i.category === category) : all;
        if (items.length === 0) {
            ctx.notify("error", t("invalidItem"));
            return;
        }
        dialog.destroy();
        void (async () => {
            // 导出时才按筛选取正文（打开对话框零预取）
            const kramdownById = await collectKramdown(ctx, items);
            const result = await buildMarkdownExport(items, kramdownById, (assetPath) => ctx.fetchAssetBytes(assetPath), {name: packName});
            const zipBytes = buildZip(result.entries);
            const blob = new Blob([zipBytes as unknown as BlobPart], {type: "application/zip"});
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            const safeName = packName.replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 40) || "pack";
            a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
            ctx.notify("info", t("exportMdDone", String(result.itemCount), String(result.assetCount), String(result.skippedAssets.length)));
        })().catch((err: unknown) => {
            ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
        });
    });
    actions.appendChild(exportBtn);
    wrap.appendChild(actions);
    body.appendChild(wrap);

    const repaint = (): void => {
        const category = catSelect.value;
        const items = category ? all.filter((i) => i.category === category) : all;
        // 含变量条数用写入期 varCount 徽标（零内核调用；行为以插入时现场内容为准）
        const withVars = items.filter((i) => (i.varCount ?? 0) > 0).length;
        paintMeta(items.length, withVars);
    };
    catSelect.addEventListener("change", repaint);
    repaint();
}

/** 收集筛选后条目的 kramdown（导出确认时才取正文） */
async function collectKramdown(
    ctx: SettingsUiContext,
    items: readonly CommonItem[],
): Promise<Map<string, string>> {
    const kramdownById = new Map<string, string>();
    for (const item of items) {
        const kd = await ctx.library.getItemKramdown(item);
        if (kd.ok) kramdownById.set(item.id, kd.data);
    }
    return kramdownById;
}

/** 变量与插入（F1/F3，原型屏 5）：插入前询问 / 使用计数开关 / 清空统计 */
function buildInsertSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    const sec = document.createElement("div");
    sec.className = "xlc-form-field xlc-card";
    const label = document.createElement("span");
    label.className = "xlc-form-label";
    label.textContent = t("insertSection");
    sec.appendChild(label);
    sec.appendChild(buildSwitchRow(
        t("promptVariablesToggle"),
        t("promptVariablesSub"),
        ctx.state.insert.promptVariables,
        (value) => {
            ctx.state.insert.promptVariables = value;
            ctx.persistSoon();
        },
    ));
    sec.appendChild(buildSwitchRow(
        t("recordUsageToggle"),
        t("recordUsageSub"),
        ctx.state.insert.recordUsage,
        (value) => {
            ctx.state.insert.recordUsage = value;
            ctx.persistSoon();
        },
    ));
    const foot = document.createElement("div");
    foot.className = "xlc-setting-row";
    const hint = document.createElement("span");
    hint.className = "xlc-setting-text";
    hint.textContent = t("usageStatsHint");
    foot.appendChild(hint);
    const clearBtn = document.createElement("button");
    clearBtn.className = "b3-button";
    clearBtn.textContent = t("clearUsageBtn");
    clearBtn.addEventListener("click", () => {
        confirm("⚠️ " + t("clearUsageBtn"), t("clearUsageConfirm"), () => {
            ctx.state.usage = {};
            ctx.persistSoon();
            ctx.notify("info", t("clearUsageDone"));
        });
    });
    foot.appendChild(clearBtn);
    sec.appendChild(foot);
    root.appendChild(sec);
}

/** 内容提供方列表：注册状态一目了然（可执行 = 本次会话已接线；待重载 = 提供方需重新 register） */
function buildProviderSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    const provSec = document.createElement("div");
    provSec.className = "xlc-form-field xlc-card";
    const provLabel = document.createElement("span");
    provLabel.className = "xlc-form-label";
    provLabel.textContent = t("providerSection");
    provSec.appendChild(provLabel);
    const providers = ctx.registry.list();
    if (providers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "xlc-form-hint";
        empty.textContent = t("providerNone");
        provSec.appendChild(empty);
    } else {
        for (const p of providers) {
            const row = document.createElement("div");
            row.className = "xlc-setting-row";
            const status = document.createElement("span");
            // 可执行=AI 蓝（原型屏 5 同款）；待重载=warn 红保持
            status.className = "xlc-badge " + (p.runtime ? "xlc-badge--ai" : "xlc-badge--warn");
            status.textContent = p.runtime ? t("providerExecutable") : t("providerPendingReload");
            const cap = document.createElement("span");
            cap.textContent = `${p.record.displayName}（v${p.record.protocolVersion}）`;
            row.appendChild(status);
            row.appendChild(cap);
            provSec.appendChild(row);
        }
    }
    root.appendChild(provSec);
}

/** 步骤指示（原型屏 6）：dot(+状态) — 线 — dot + 文案 */
function buildStepsEl(current: 1 | 2, caption: string): HTMLElement {
    const steps = document.createElement("div");
    steps.className = "xlc-steps";
    const dot1 = document.createElement("span");
    dot1.className = "xlc-step-dot" + (current === 1 ? " xlc-step-dot--on" : "");
    dot1.textContent = current === 1 ? "1" : "✓";
    steps.appendChild(dot1);
    const line = document.createElement("span");
    line.className = "xlc-step-line";
    steps.appendChild(line);
    const dot2 = document.createElement("span");
    dot2.className = "xlc-step-dot" + (current === 2 ? " xlc-step-dot--on" : "");
    dot2.textContent = "2";
    steps.appendChild(dot2);
    const cap = document.createElement("span");
    cap.className = "xlc-step-cap";
    cap.textContent = caption;
    steps.appendChild(cap);
    return steps;
}

/**
 * 库选择器（首跑引导与「更改库」共用；onConfigured 在配置落地后回调）。
 * 两步式（原型屏 6）：① 选库方式（文档选择器/笔记本/新建）→ ② 确认落点后写入。
 * 创建新库文档仍为立即动作（confirm 后直达配置）。onDismiss 提供「稍后再说」。
 */
function buildLibraryPickerSection(ctx: SettingsUiContext, root: HTMLElement, onConfigured: () => void, opts?: {onDismiss?: () => void}): void {
    const t = ctx.t;
    let step: 1 | 2 = 1;
    let pickedDoc: {id: string; hPath: string} | null = null;

    const stepsEl = buildStepsEl(1, t("setupStep1"));
    root.appendChild(stepsEl);
    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.style.marginBottom = "12px";
    hint.textContent = t("setupHint");
    root.appendChild(hint);

    // ---- 第 1 步：选库方式 ----
    const step1 = document.createElement("div");
    const modeWrap = document.createElement("div");
    modeWrap.className = "xlc-form-field";
    const modeLabel = document.createElement("label");
    modeLabel.className = "xlc-form-label";
    modeLabel.textContent = t("setupModeLabel");
    modeWrap.appendChild(modeLabel);
    const modeSelect = document.createElement("select");
    modeSelect.className = "b3-select";
    modeSelect.id = "xlc-setup-mode";
    modeLabel.htmlFor = modeSelect.id;
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
    step1.appendChild(modeWrap);

    // doc/tree：文档选择器（searchDocs 关键词搜索 → 点选使用）
    const pickerWrap = document.createElement("div");
    pickerWrap.className = "xlc-form-field";
    const pickerInput = document.createElement("input");
    pickerInput.className = "b3-text-field";
    pickerInput.placeholder = t("docPicker");
    pickerInput.setAttribute("aria-label", t("docPicker"));
    pickerWrap.appendChild(pickerInput);
    const pickerList = document.createElement("div");
    pickerList.className = "xlc-doclist";
    pickerWrap.appendChild(pickerList);
    step1.appendChild(pickerWrap);
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
        }).catch((err) => {
            if (seq !== pickerSeq) return;
            const empty = document.createElement("div");
            empty.className = "xlc-doclist-empty";
            empty.textContent = t("kernelError", (err as Error).message);
            pickerList.appendChild(empty);
        });
    });

    // notebook：笔记本下拉
    const nbWrap = document.createElement("div");
    nbWrap.className = "xlc-form-field";
    nbWrap.style.display = "none";
    const nbLabel = document.createElement("label");
    nbLabel.className = "xlc-form-label";
    nbLabel.textContent = t("setupNotebook");
    nbWrap.appendChild(nbLabel);
    const nbSelect = document.createElement("select");
    nbSelect.className = "b3-select";
    nbSelect.id = "xlc-setup-notebook";
    nbLabel.htmlFor = nbSelect.id;
    nbWrap.appendChild(nbSelect);
    step1.appendChild(nbWrap);
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
    }).catch((err) => {
        ctx.notify("error", t("kernelError", (err as Error).message));
    });
    const syncModeUi = (): void => {
        const notebook = modeSelect.value === "notebook";
        pickerWrap.style.display = notebook ? "none" : "";
        nbWrap.style.display = notebook ? "" : "none";
    };
    modeSelect.addEventListener("change", syncModeUi);
    syncModeUi();

    // 新建库文档（立即动作：confirm → 创建 → 配置落地）
    const nameWrap = document.createElement("div");
    nameWrap.className = "xlc-form-field";
    const nameLabel = document.createElement("label");
    nameLabel.className = "xlc-form-label";
    nameLabel.textContent = t("setupNewDoc");
    nameWrap.appendChild(nameLabel);
    const nameRow = document.createElement("div");
    nameRow.className = "xlc-form-row";
    const nameInput = document.createElement("input");
    nameInput.className = "b3-text-field";
    nameInput.id = "xlc-setup-newdoc";
    nameLabel.htmlFor = nameInput.id;
    nameInput.value = t("setupNewDocName");
    nameRow.appendChild(nameInput);
    const createBtn = document.createElement("button");
    createBtn.className = "b3-button";
    createBtn.style.whiteSpace = "nowrap";
    createBtn.textContent = t("create");
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
            }).catch((err) => {
                ctx.notify("error", t("kernelError", (err as Error).message));
            });
        });
    });
    nameRow.appendChild(createBtn);
    nameWrap.appendChild(nameRow);
    step1.appendChild(nameWrap);

    const step1Actions = document.createElement("div");
    step1Actions.className = "xlc-form-actions";
    if (opts?.onDismiss) {
        const dismissBtn = document.createElement("button");
        dismissBtn.className = "b3-button xlc-btn-ghost";
        dismissBtn.textContent = t("setupLater");
        dismissBtn.addEventListener("click", () => opts.onDismiss?.());
        step1Actions.appendChild(dismissBtn);
    }
    const nextBtn = document.createElement("button");
    nextBtn.className = "b3-button xlc-btn-primary";
    nextBtn.textContent = t("setupNext");
    nextBtn.addEventListener("click", () => {
        const mode = modeSelect.value as LibraryConfig["mode"];
        if (mode === "notebook" && !nbSelect.value) {
            ctx.notify("error", t("invalidItem"));
            return;
        }
        if (mode !== "notebook" && !pickedDoc) {
            ctx.notify("error", t("docPickerEmpty"));
            return;
        }
        gotoStep(2);
    });
    step1Actions.appendChild(nextBtn);
    step1.appendChild(step1Actions);
    root.appendChild(step1);

    // ---- 第 2 步：确认落点 ----
    const step2 = document.createElement("div");
    step2.style.display = "none";
    const summaryWrap = document.createElement("div");
    summaryWrap.className = "xlc-policy-list";
    step2.appendChild(summaryWrap);
    const summaryHint = document.createElement("p");
    summaryHint.className = "xlc-form-hint";
    summaryHint.style.marginTop = "12px";
    summaryHint.textContent = t("setupConfirmHint");
    step2.appendChild(summaryHint);
    const step2Actions = document.createElement("div");
    step2Actions.className = "xlc-form-actions";
    const backBtn = document.createElement("button");
    backBtn.className = "b3-button xlc-btn-ghost";
    backBtn.textContent = t("setupBack");
    backBtn.addEventListener("click", () => gotoStep(1));
    step2Actions.appendChild(backBtn);
    const finishBtn = document.createElement("button");
    finishBtn.className = "b3-button xlc-btn-primary";
    finishBtn.textContent = t("setupFinish");
    finishBtn.addEventListener("click", () => {
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
    step2Actions.appendChild(finishBtn);
    step2.appendChild(step2Actions);
    root.appendChild(step2);

    function paintSummary(): void {
        summaryWrap.textContent = "";
        const mode = modeSelect.value as LibraryConfig["mode"];
        const card = document.createElement("div");
        card.className = "xlc-policy xlc-policy--recommended";
        const icon = document.createElement("span");
        icon.className = "xlc-policy-ic";
        icon.textContent = "✓";
        card.appendChild(icon);
        const text = document.createElement("span");
        const titleEl = document.createElement("span");
        titleEl.className = "xlc-policy-title";
        titleEl.textContent = mode === "notebook"
            ? `${t("setupNotebook")} · ${nbSelect.selectedOptions[0]?.textContent ?? nbSelect.value}`
            : (pickedDoc?.hPath || pickedDoc?.id || "-");
        text.appendChild(titleEl);
        const desc = document.createElement("span");
        desc.className = "xlc-policy-desc";
        desc.textContent = mode === "notebook" ? t("setupSummaryNotebook") : t("setupSummaryDoc");
        text.appendChild(desc);
        card.appendChild(text);
        summaryWrap.appendChild(card);
    }

    function gotoStep(next: 1 | 2): void {
        step = next;
        stepsEl.remove();
        root.insertBefore(buildStepsEl(step, step === 1 ? t("setupStep1") : t("setupStep2")), root.firstChild);
        step1.style.display = step === 1 ? "" : "none";
        hint.style.display = step === 1 ? "" : "none";
        step2.style.display = step === 2 ? "" : "none";
        if (step === 2) paintSummary();
    }
}

function buildAiSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    // AI 设置区（默认关；开启即视为同意元数据出域；正文出域单独开关）
    const aiSec = document.createElement("div");
    aiSec.className = "xlc-form-field xlc-card";
    const aiLabel = document.createElement("span");
    aiLabel.className = "xlc-form-label";
    aiLabel.textContent = t("aiSection");
    aiSec.appendChild(aiLabel);
    const aiRow = (key: "enabled" | "shareContent", text: string, sub: string): HTMLInputElement => {
        const row = buildSwitchRow(text, sub, ctx.state.ai[key], (value) => {
            ctx.state.ai[key] = value;
            if (key === "enabled" && !value) ctx.state.ai.shareContent = false;
            ctx.ai.updateSettings(ctx.state.ai);
            ctx.persistSoon();
        });
        aiSec.appendChild(row);
        return row.querySelector<HTMLInputElement>(".xlc-switch") as HTMLInputElement;
    };
    const aiEnabledBox = aiRow("enabled", t("aiEnabled"), t("aiEnabledSub"));
    const aiShareBox = aiRow("shareContent", t("aiShareContent"), t("aiShareContentSub"));
    const syncAiShare = (): void => {
        aiShareBox.disabled = !aiEnabledBox.checked;
        if (!aiEnabledBox.checked) {
            aiShareBox.checked = false;
            ctx.state.ai.shareContent = false;
        }
    };
    syncAiShare();
    aiEnabledBox.addEventListener("change", syncAiShare);
    // 自定义变换（F7）：与内置五种并列出现在条目动作菜单 ✦ 区
    const ctLabel = document.createElement("span");
    ctLabel.className = "xlc-form-label";
    ctLabel.style.marginTop = "6px";
    ctLabel.textContent = t("customTransformSection");
    aiSec.appendChild(ctLabel);
    const ctList = document.createElement("div");
    ctList.className = "xlc-ct-list";
    aiSec.appendChild(ctList);
    const persistCt = (): void => {
        ctx.ai.updateSettings(ctx.state.ai);
        ctx.persistSoon();
    };
    const repaintCt = (): void => {
        ctList.textContent = "";
        for (const ct of ctx.state.ai.customTransforms) {
            const row = document.createElement("div");
            row.className = "xlc-ct-row";
            const nameInput = document.createElement("input");
            nameInput.className = "b3-text-field xlc-ct-name";
            nameInput.placeholder = t("customTransformName");
            nameInput.setAttribute("aria-label", t("customTransformName"));
            nameInput.value = ct.name;
            nameInput.maxLength = 20;
            nameInput.addEventListener("change", () => {
                ct.name = nameInput.value.trim().slice(0, 20);
                persistCt();
            });
            row.appendChild(nameInput);
            const promptInput = document.createElement("input");
            promptInput.className = "b3-text-field xlc-ct-prompt";
            promptInput.placeholder = t("customTransformPrompt");
            promptInput.setAttribute("aria-label", t("customTransformPrompt"));
            promptInput.value = ct.prompt;
            promptInput.maxLength = 500;
            promptInput.addEventListener("change", () => {
                ct.prompt = promptInput.value.trim().slice(0, 500);
                persistCt();
            });
            row.appendChild(promptInput);
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "b3-button xlc-btn-ghost xlc-ct-del";
            delBtn.textContent = t("delete");
            delBtn.addEventListener("click", () => {
                ctx.state.ai.customTransforms = ctx.state.ai.customTransforms.filter((c) => c.id !== ct.id);
                persistCt();
                repaintCt();
            });
            row.appendChild(delBtn);
            ctList.appendChild(row);
        }
        if (ctx.state.ai.customTransforms.length === 0) {
            const empty = document.createElement("div");
            empty.className = "xlc-form-hint";
            empty.textContent = t("customTransformEmpty");
            ctList.appendChild(empty);
        }
    };
    repaintCt();
    const addCtBtn = document.createElement("button");
    addCtBtn.type = "button";
    addCtBtn.className = "b3-button";
    addCtBtn.style.alignSelf = "flex-start";
    addCtBtn.textContent = t("customTransformAdd");
    addCtBtn.addEventListener("click", () => {
        if (ctx.state.ai.customTransforms.length >= 10) {
            ctx.notify("error", t("customTransformCap"));
            return;
        }
        const id = `xltf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        ctx.state.ai.customTransforms = [...ctx.state.ai.customTransforms, {id, name: t("customTransformNewName"), prompt: ""}];
        persistCt();
        repaintCt();
        // 新行名称输入直接聚焦（R120）：添加即可改名，不用再点一次
        ctList.querySelector<HTMLInputElement>(".xlc-ct-row:last-child .xlc-ct-name")?.focus();
    });
    aiSec.appendChild(addCtBtn);
    const ctHint = document.createElement("span");
    ctHint.className = "xlc-form-hint";
    ctHint.textContent = t("customTransformHint");
    aiSec.appendChild(ctHint);
    // 提示词场景包（F7 收尾）：内置模板集一键导入当前库（真实块，可改可再分享）
    const packRow = document.createElement("div");
    packRow.className = "xlc-setting-row";
    const packText = document.createElement("span");
    packText.className = "xlc-setting-text";
    packText.textContent = t("promptPackHint");
    packRow.appendChild(packText);
    const packBtn = document.createElement("button");
    packBtn.type = "button";
    packBtn.className = "b3-button";
    packBtn.textContent = t("promptPackBtn");
    packBtn.addEventListener("click", () => {
        const parsed = parseMarkdownPack(PROMPT_PACK_MD);
        if (parsed.items.length === 0) {
            ctx.notify("error", t("importFailed", "builtin pack empty"));
            return;
        }
        openImportPolicyDialog(ctx, {items: parsed.items, pack: parsed.pack}, parsed.issues, {kind: "markdown-pack", items: parsed.items});
    });
    packRow.appendChild(packBtn);
    aiSec.appendChild(packRow);
    root.appendChild(aiSec);
}

function buildSearchSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    // 搜索设置区（拼音：本地注解，无出域）
    const searchSec = document.createElement("div");
    searchSec.className = "xlc-form-field xlc-card";
    const searchLabel = document.createElement("span");
    searchLabel.className = "xlc-form-label";
    searchLabel.textContent = t("searchSection");
    searchSec.appendChild(searchLabel);
    const pinyinRow = buildSwitchRow(t("pinyinToggle"), t("pinyinToggleSub"), ctx.state.search.pinyin, (value) => {
        ctx.state.search.pinyin = value;
        ctx.applyPinyinAdapter();
        ctx.persistSoon();
        void ctx.library.reindex().then((idx) => {
            ctx.notify("info", t("reindexDone", String(idx.entries.length)));
        }).catch((err) => {
            ctx.notify("error", t("kernelError", (err as Error).message));
        });
    });
    searchSec.appendChild(pinyinRow);
    // 占位符开关
    const phRow = buildSwitchRow(t("placeholdersToggle"), t("placeholdersToggleSub"), ctx.state.search.placeholders, (value) => {
        ctx.state.search.placeholders = value;
        ctx.persistSoon();
    });
    searchSec.appendChild(phRow);
    root.appendChild(searchSec);
}

function buildDataSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    // 数据区：当前库 + 重建索引 + 清空最近 + 标签体检 + 导出/导入
    const dataSec = document.createElement("div");
    dataSec.className = "xlc-form-field xlc-card";
    const dataLabel = document.createElement("span");
    dataLabel.className = "xlc-form-label";
    dataLabel.textContent = t("dataSection");
    dataSec.appendChild(dataLabel);
    const libRow = document.createElement("div");
    libRow.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libRow.textContent = `${t("librarySection")}：${cfg
        ? (cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} · ${t("docCount", String(cfg.containerDocIds.length))}`)
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
    const reindexBtn = mkBtn(t("reindexBtn"), () => {
        reindexBtn.disabled = true;
        void ctx.library.reindex().then((idx) => {
            ctx.notify("info", idx.truncated
                ? t("reindexTruncated", String(LIMITS.maxItems))
                : t("reindexDone", String(idx.entries.length)));
        }).catch((err) => {
            ctx.notify("error", t("kernelError", (err as Error).message));
        }).finally(() => {
            reindexBtn.disabled = false;
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
        mkBtn("✦ " + t("tagAuditBtn"), () => {
            void runTagAudit(ctx).catch((err: unknown) => {
                ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
            });
        });
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
        }).catch((err: unknown) => {
            ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
        });
    });
    mkBtn(t("packBtn"), () => {
        void openPackExportDialog(ctx).catch((err: unknown) => {
            ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
        });
    });
    const importBtn = mkBtn(t("importBtn"), () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json,application/json,.md,text/markdown";
        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            if (file.size > LIMITS.maxImportBytes) {
                ctx.notify("error", t("importFailed", "file too large"));
                return;
            }
            void file.text().then((text) => {
                const isMd = /\.md$/i.test(file.name);
                if (isMd) {
                    // Markdown 包：解析 → 同一策略对话框 → importBundle
                    const parsed = parseMarkdownPack(text);
                    if (parsed.items.length === 0) {
                        ctx.notify("error", t("importFailed", "no xlc-item metadata found"));
                        return;
                    }
                    openImportPolicyDialog(ctx, {items: parsed.items, pack: parsed.pack}, parsed.issues, {kind: "markdown-pack", items: parsed.items});
                    return;
                }
                const validation = validateImport(text);
                if (!validation.ok || !validation.parsed) {
                    ctx.notify("error", t("importFailed", validation.reason ?? "unknown"));
                    return;
                }
                openImportPolicyDialog(ctx, validation.parsed, validation.issues, {kind: "json", text});
            }).catch((err: unknown) => {
                ctx.notify("error", t("importFailed", err instanceof Error ? err.message : String(err)));
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
    let idx: Awaited<ReturnType<LibraryService["ensureIndex"]>>;
    try {
        idx = await ctx.library.ensureIndex();
    } catch (err) {
        ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
        return;
    }
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

/** 导入策略确认（导入前校验已过；策略三选 → importBundleText → 汇总回执）。导出供渲染 harness 取证。 */
export function openImportPolicyDialog(
    ctx: SettingsUiContext,
    parsed: {items: Array<{id: string; title: string}>; pack?: {name: string; vars: string[]}},
    issues: ImportIssue[],
    source: {kind: "json"; text: string} | {kind: "markdown-pack"; items: ExportedItem[]},
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
    // 元数据徽标行（原型屏 8：条目数 / 无效将跳过 / 模板包名·变量）
    const meta = document.createElement("div");
    meta.className = "xlc-import-meta";
    const metaCount = document.createElement("span");
    metaCount.className = "xlc-badge xlc-badge--markdown";
    metaCount.textContent = t("itemCountBadge", String(parsed.items.length));
    meta.appendChild(metaCount);
    if (issues.length > 0) {
        const metaInvalid = document.createElement("span");
        metaInvalid.className = "xlc-badge xlc-badge--warn";
        metaInvalid.textContent = t("invalidSkipBadge", String(issues.length));
        meta.appendChild(metaInvalid);
    }
    if (parsed.pack) {
        const metaPack = document.createElement("span");
        metaPack.className = "xlc-badge xlc-badge--var";
        metaPack.textContent = `${parsed.pack.name} · ${t("packVarsBadge", String(parsed.pack.vars.length))}`;
        meta.appendChild(metaPack);
    }
    wrap.appendChild(meta);
    const preview = document.createElement("p");
    preview.className = "xlc-form-hint";
    preview.textContent = t("importPreview", String(parsed.items.length), String(issues.length));
    wrap.appendChild(preview);
    const run = (policy: ConflictPolicy): void => {
        dialog.destroy();
        const promise = source.kind === "json"
            ? ctx.importBundleText(source.text, policy)
            : ctx.importMarkdownItems(source.items, policy);
        void promise.then((receipt) => {
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
    // 策略卡（原型屏 8）：标题+说明+推荐档高亮；逐卡整行可点
    const policyList = document.createElement("div");
    policyList.className = "xlc-policy-list";
    for (const [policy, title, desc, recommended] of [
        ["skip", t("importPolicySkip"), t("importPolicySkipDesc"), false],
        ["overwrite", t("importPolicyOverwrite"), t("importPolicyOverwriteDesc"), false],
        ["rename", t("importPolicyRename"), t("importPolicyRenameDesc"), true],
    ] as Array<[ConflictPolicy, string, string, boolean]>) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "xlc-policy" + (recommended ? " xlc-policy--recommended" : "");
        const icon = document.createElement("span");
        icon.className = "xlc-policy-ic";
        // ○（U+25CB）：⃝ 组合字符在中文字体下渲染成错位小圈，换稳定字形
        icon.textContent = policy === "skip" ? "○" : policy === "overwrite" ? "⇄" : "＋";
        card.appendChild(icon);
        const text = document.createElement("span");
        const titleEl = document.createElement("span");
        titleEl.className = "xlc-policy-title";
        titleEl.textContent = title + (recommended ? `（${t("recommended")}）` : "");
        text.appendChild(titleEl);
        const descEl = document.createElement("span");
        descEl.className = "xlc-policy-desc";
        descEl.textContent = desc;
        text.appendChild(descEl);
        card.appendChild(text);
        card.addEventListener("click", () => run(policy));
        policyList.appendChild(card);
    }
    wrap.appendChild(policyList);
    const receiptHint = document.createElement("p");
    receiptHint.className = "xlc-form-hint";
    receiptHint.textContent = t("importReceiptHint");
    wrap.appendChild(receiptHint);
    body.appendChild(wrap);
}
