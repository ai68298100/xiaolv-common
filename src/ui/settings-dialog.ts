// 设置界面（自 index.ts 拆出，R19）：首次引导 / 完整设置 / 库选择器 / AI / 搜索 / 数据区 / 标签体检 / 导入策略。
// 依赖经 SettingsUiContext 注入（不持有插件实例）；状态对象按引用共享，落盘由 persistSoon 节流。
import {Dialog, confirm} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {CONFIG_VERSION, LibraryConfig, PluginState, summarizeUsage} from "../model/storage";
import {LIMITS} from "../constants";
import {validateImport, ConflictPolicy, ImportIssue, ImportReceipt, ExportedItem} from "../model/transfer";
import {buildZip} from "../model/zip";
import {buildMarkdownExport, ExportIntegrityError} from "../service/export-markdown";
import {parseMarkdownPack} from "../service/import-markdown";
import {LibraryService} from "../service/library";
import {AiAssistant} from "../service/ai";
import {ProviderRegistry} from "../service/providers";
import {CommonItem} from "../model/item";
import {toErrorMessage} from "../model/errors";
import {collectTags} from "../model/search";
import {PROMPT_PACK_MD} from "../service/prompt-pack";
import type {SavedDiscoveryScope, SavedDiscoveryView} from "../model/storage";

type TFn = (key: string, ...args: string[]) => string;

// 设置/首次引导是单实例浮层。入口可能同时来自命令面板、空态和移动端底栏；
// 复用已打开的实例可避免重复点击堆积多个遮罩层，并保持焦点与当前表单状态。
let activeSetupDialog: Dialog | null = null;
let activeSettingsDialog: Dialog | null = null;

// Espanso 解析器连同 js-yaml 仅在用户打开导入窗口时需要；保持设置首屏不加载重型 YAML 依赖。
let espansoParserPromise: Promise<typeof import("../service/espanso-import")> | null = null;
function loadEspansoParser(): Promise<typeof import("../service/espanso-import")> {
    espansoParserPromise ??= import("../service/espanso-import");
    return espansoParserPromise;
}

/** 开关行统一构造（文本+说明在左，开关右贴；input 语义不变） */
function buildSwitchRow(text: string, sub: string | null, checked: boolean, onChange: (value: boolean) => void): HTMLLabelElement {
    const row = document.createElement("label");
    row.className = "xlc-setting-row";
    const cap = document.createElement("span");
    cap.className = "xlc-setting-text";
    cap.textContent = text;
    if (sub) {
        // span 内不嵌 div（内容模型）：副文案用 span + 块状样式（R138）
        const subEl = document.createElement("span");
        subEl.className = "xlc-setting-sub";
        subEl.textContent = sub;
        cap.appendChild(subEl);
    }
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "xlc-switch";
    box.dataset.xlcControl = `settings.switch.${text}`;
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
    refreshSearch?(): void;
    /** Saved tag-scoped discovery shortcuts. The source blocks remain canonical. */
    getSavedDiscoveryViews?(): readonly SavedDiscoveryView[];
    openSavedDiscoveryView?(view: SavedDiscoveryView): void;
    deleteSavedDiscoveryView?(id: string): void;
}

export interface SetupDialogOptions {
    /** 配置落地后回调 */
    onConfigured?: () => void;
    /** 用户点击「稍后再说」 */
    onDismiss?: () => void;
}

/** 首次引导（仅库选择，两步式；完整设置见 openSettingsDialog） */
export function openSetupDialog(ctx: SettingsUiContext, opts?: SetupDialogOptions): void {
    if (activeSetupDialog?.element?.isConnected) {
        activeSetupDialog.element.querySelector<HTMLElement>("input, select, button")?.focus();
        return;
    }
    activeSetupDialog = null;
    const t = ctx.t;
    const dialog = new Dialog({
        title: t("setupTitle"),
        content: "",
        width: "min(680px, 92vw)",
        height: "min(820px, 92vh)", // 首次快速开始卡需要留出阅读空间，长屏仍保持视口内滚动（R175）
    });
    activeSetupDialog = dialog;
    dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-form-host", "xlc-settings-host", "xlc-setup-root-host");
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form xlc-setup";
    buildLibraryPickerSection(ctx, root, () => {
        dialog.destroy();
        opts?.onConfigured?.();
    }, {onDismiss: () => dialog.destroy()});
    body.appendChild(root);
}

/** 完整设置：库管理（含更改库）+ AI + 搜索 + 数据 */
export function openSettingsDialog(ctx: SettingsUiContext): void {
    if (activeSettingsDialog?.element?.isConnected) {
        activeSettingsDialog.element.querySelector<HTMLElement>("input, select, button")?.focus();
        return;
    }
    activeSettingsDialog = null;
    const t = ctx.t;
    const dialog = new Dialog({
        title: t("openSettings"),
        content: "",
        width: "min(720px, 92vw)",
        height: "min(860px, 92vh)", // 固定高：展开/收起/提示行显隐不再顶跳弹窗（R146）
    });
    activeSettingsDialog = dialog;
    dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-form-host", "xlc-settings-host", "xlc-settings-root-host");
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form xlc-settings";
    const intro = document.createElement("p");
    intro.className = "xlc-page-intro";
    intro.textContent = t("settingsIntro");
    root.appendChild(intro);

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
        ? cfg.mode === "notebook" ? t("libModeNotebook", String(cfg.notebookIds.length))
            : cfg.mode === "tree" ? t("libModeTree", String(cfg.containerDocIds.length))
                : t("libModeDoc", String(cfg.containerDocIds.length))
        : t("libraryNone");
    const changeBtn = document.createElement("button");
    changeBtn.className = "b3-button";
    changeBtn.dataset.xlcControl = "settings.library.change";
    changeBtn.textContent = t("openSettingsChangeLib");
    changeBtn.setAttribute("aria-expanded", "false");
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
        changeBtn.setAttribute("aria-expanded", show ? "true" : "false");
        if (show && pickerHost.childElementCount === 0) {
            buildLibraryPickerSection(ctx, pickerHost, () => dialog.destroy());
        }
        // 展开即聚焦文档搜索框（R129，对齐「添加即聚焦」惯例）；
        // 布局变更同帧强制聚焦是 Blink 敏感路径（B-004 嫌疑点），rAF 延一帧缓解（R138）
        if (show) requestAnimationFrame(() => {
            try {
                pickerHost.querySelector<HTMLInputElement>(".b3-text-field")?.focus();
            } catch {
                // 聚焦失败不致命：选择器仍可点击
            }
        });
    });
    libSec.appendChild(pickerHost);
    root.appendChild(libSec);

    if (cfg) {
        const modeLabel = libStatus.textContent ?? "";
        const setLocation = (location: string): void => { statusText.textContent = `${modeLabel} · ${location}`; };
        if (cfg.mode === "notebook") {
            void ctx.library.listNotebooks().then((result) => {
                if (!result.ok) return;
                const names = cfg.notebookIds.map((id) => result.data.find((nb) => nb.id === id)?.name ?? id);
                if (names.length) setLocation(names.join(", "));
            });
        } else {
            const docId = cfg.containerDocIds[0];
            if (docId) void ctx.library.getDocPath(docId).then((hPath) => { if (hPath) setLocation(hPath); });
        }
    }

    buildAiSection(ctx, root);
    buildInsertSection(ctx, root);
    buildSearchSection(ctx, root);
    buildSavedViewsSection(ctx, root, () => dialog.destroy());
    buildProviderSection(ctx, root);
    buildDataSection(ctx, root);
    body.appendChild(root);
}

/** 模板包导出（F6，原型屏 8 右帧）：包名 / 分类筛选 / 内容清单 → items.md+assets ZIP。
 *  分享的是「活的块」：导入方得到真实思源块，可继续编辑与再分享。 */
async function openPackExportDialog(ctx: SettingsUiContext): Promise<void> {
    const t = ctx.t;
    const idx = await ctx.library.ensureIndex();
    if (idx.truncated || idx.stopped || idx.errors.length > 0) {
        throw new ExportIntegrityError("index-incomplete");
    }
    // 性能（R76 修正 R71 回归）：打开对话框零 kramdown 预取——
    // 「含变量」徽标用写入期 varCount 属性（索引免费读取），正文在点导出时才按筛选取
    const all: CommonItem[] = Array.from(idx.items.values());
    const categories = Array.from(new Set(all.map((i) => i.category).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

    const dialog = new Dialog({
        title: t("packExportTitle"),
        content: "",
        width: "min(580px, 92vw)",
        height: "min(680px, 90vh)", // 固定高：分类切换不顶跳（R146）
    });
    dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-form-host", "xlc-settings-host");
    const body = getDialogBody(dialog.element);
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
    cancelBtn.dataset.xlcControl = "settings.pack-export.cancel";
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
            ctx.notify("error", t("exportEmpty"));
            return;
        }
        // 导出执行期保留对话框：按钮飞行态防重入（此前 destroy 后可并发再次导出，R138）
        if (exportBtn.disabled) return;
        exportBtn.disabled = true;
        exportBtn.textContent = t("indexing");
        void (async () => {
            // 导出时才按筛选取正文（打开对话框零预取）
            const kramdownById = await collectKramdown(ctx, items);
            const result = await buildMarkdownExport(items, kramdownById, (assetPath) => ctx.fetchAssetBytes(assetPath), {name: packName});
            const zipBytes = buildZip(result.entries);
            const blob = new Blob([zipBytes as unknown as BlobPart], {type: "application/zip"});
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            // 全部替换成特殊字符时保底名，避免产出「--.zip」（R138）
            const safeName = packName.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "pack";
            a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000); // 下载启动后再回收（R138）
            dialog.destroy();
            ctx.notify("info", t("exportMdDone", String(result.itemCount), String(result.assetCount), String(result.skippedAssets.length)));
        })().catch((err: unknown) => {
            exportBtn.disabled = false;
            exportBtn.textContent = t("packExportBtn");
            ctx.notify("error", formatExportError(ctx, err));
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
        const kd = await ctx.library.getStoredItemKramdown(item);
        if (!kd.ok) throw new ExportIntegrityError("item-unreadable", item.title || item.id, kd.message);
        kramdownById.set(item.id, kd.data);
    }
    return kramdownById;
}

function formatExportError(ctx: Pick<SettingsUiContext, "t">, err: unknown): string {
    if (err instanceof ExportIntegrityError) {
        switch (err.reason) {
            case "index-incomplete": return ctx.t("exportIncompleteIndex");
            case "item-unreadable": return ctx.t("exportItemReadFailed", err.itemLabel, err.detail);
            case "body-missing": return ctx.t("exportBodyMissing", err.itemLabel);
            case "too-large": return ctx.t("exportTooLarge", err.detail);
        }
    }
    return ctx.t("kernelError", toErrorMessage(err));
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
    const hasUsage = (): boolean => Object.values(ctx.state.usage).some((item) => item.count > 0);
    const syncClearUsage = (): void => {
        clearBtn.disabled = !hasUsage();
        clearBtn.textContent = hasUsage() ? t("clearUsageBtn") : t("clearUsageEmpty");
    };
    syncClearUsage();
    clearBtn.addEventListener("click", () => {
        if (!hasUsage()) return;
        confirm("⚠️ " + t("clearUsageBtn"), t("clearUsageConfirm"), () => {
            ctx.state.usage = {};
            ctx.persistSoon();
            ctx.refreshSearch?.();
            syncClearUsage();
            paintSummary();
            ctx.notify("info", t("clearUsageDone"));
        });
    });
    foot.appendChild(clearBtn);
    sec.appendChild(foot);
    const summary = document.createElement("div");
    summary.className = "xlc-usage-summary";
    summary.dataset.xlcControl = "settings.usage.summary";
    summary.setAttribute("role", "status");
    summary.setAttribute("aria-live", "polite");
    const paintSummary = (): void => {
        const current = summarizeUsage(ctx.state.usage);
        summary.textContent = t("usageStatsSummary", String(current.totalCount), String(current.trackedItems));
    };
    paintSummary();
    sec.appendChild(summary);
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
    let setupRevision = 0;
    let pickedDoc: {id: string; hPath: string} | null = null;

    const stepsEl = buildStepsEl(1, t("setupStep1"));
    root.appendChild(stepsEl);
    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.style.marginBottom = "12px";
    hint.textContent = t("setupHint");
    root.appendChild(hint);
    // 首次设置就给出可执行的最短路径，避免用户配置完库后不知道如何开始。
    // 模板包仍由用户显式点击导入，避免在库中静默写入示例块。
    const usageGuide = document.createElement("p");
    usageGuide.className = "xlc-form-hint";
    usageGuide.style.whiteSpace = "pre-line";
    usageGuide.textContent = t("setupUsageGuide");
    root.appendChild(usageGuide);
    const recommendation = document.createElement("p");
    recommendation.className = "xlc-form-hint xlc-setup-recommendation";
    recommendation.textContent = t("setupRecommendation");
    root.appendChild(recommendation);
    const existingConfig = ctx.getConfig();
    const showQuickStart = !existingConfig;
    // 未配置用户优先读三步卡；详细变量说明留给可重复打开的完整帮助，避免首屏重复堆字。
    if (showQuickStart) usageGuide.style.display = "none";

    // 首次进入时把最短可用路径拆成可扫描的三步，避免用户只看到配置项却不知道配置完成后做什么。
    const quickStart = document.createElement("section");
    quickStart.className = "xlc-setup-quickstart";
    quickStart.setAttribute("aria-labelledby", "xlc-setup-quickstart-title");
    const quickStartTitle = document.createElement("h3");
    quickStartTitle.className = "xlc-setup-quickstart-title";
    quickStartTitle.id = "xlc-setup-quickstart-title";
    quickStartTitle.textContent = t("setupQuickStartTitle");
    quickStart.appendChild(quickStartTitle);
    const quickStartItems: Array<[string, string, string]> = [
        ["1", t("setupQuickStart1Title"), t("setupQuickStart1Desc")],
        ["2", t("setupQuickStart2Title"), t("setupQuickStart2Desc")],
        ["3", t("setupQuickStart3Title"), t("setupQuickStart3Desc")],
    ];
    for (const [number, title, desc] of quickStartItems) {
        const item = document.createElement("div");
        item.className = "xlc-setup-quickstart-item";
        const dot = document.createElement("span");
        dot.className = "xlc-setup-quickstart-dot";
        dot.textContent = number;
        dot.setAttribute("aria-hidden", "true");
        const copy = document.createElement("span");
        copy.className = "xlc-setup-quickstart-copy";
        const itemTitle = document.createElement("strong");
        itemTitle.className = "xlc-setup-quickstart-item-title";
        itemTitle.textContent = title;
        const itemDesc = document.createElement("span");
        itemDesc.className = "xlc-setup-quickstart-item-desc";
        itemDesc.textContent = desc;
        copy.append(itemTitle, itemDesc);
        item.append(dot, copy);
        quickStart.appendChild(item);
    }
    root.appendChild(quickStart);
    if (!showQuickStart) quickStart.style.display = "none";

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
    modeSelect.dataset.xlcControl = "setup.mode";
    modeLabel.htmlFor = modeSelect.id;
    const modes: Array<{v: "new-doc" | "new-notebook" | "doc" | "tree" | "notebook"; label: string}> = [
        {v: "new-doc", label: t("setupCreateNewDoc")},
        {v: "new-notebook", label: t("setupCreateIndependentNotebook")},
        {v: "doc", label: t("setupPickDoc")},
        {v: "tree", label: t("setupPickDocTree")},
        {v: "notebook", label: t("setupNotebook")},
    ];
    for (const m of modes) {
        const opt = document.createElement("option");
        opt.value = m.v;
        opt.textContent = m.label;
        modeSelect.appendChild(opt);
    }
    if (existingConfig) modeSelect.value = existingConfig.mode;
    modeWrap.appendChild(modeSelect);
    step1.appendChild(modeWrap);

    // doc/tree：文档选择器（searchDocs 关键词搜索 → 点选使用）
    const pickerWrap = document.createElement("div");
    pickerWrap.className = "xlc-form-field";
    const pickerInput = document.createElement("input");
    pickerInput.className = "b3-text-field";
    pickerInput.placeholder = t("docPicker");
    pickerInput.setAttribute("aria-label", t("docPicker"));
    pickerInput.dataset.xlcControl = "setup.docs.query";
    pickerWrap.appendChild(pickerInput);
    const pickerList = document.createElement("div");
    pickerList.className = "xlc-doclist";
    pickerWrap.appendChild(pickerList);
    step1.appendChild(pickerWrap);
    let pickerSeq = 0;
    const currentDocId = existingConfig?.mode !== "notebook" ? existingConfig?.containerDocIds[0] : undefined;
    const showDocPickerMessage = (message: string, retry?: () => void): void => {
        pickerList.textContent = "";
        const status = document.createElement("div");
        status.className = "xlc-doclist-empty";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.textContent = message;
        pickerList.appendChild(status);
        if (retry) {
            const retryBtn = document.createElement("button");
            retryBtn.type = "button";
            retryBtn.className = "b3-button xlc-btn-ghost xlc-doclist-retry";
            retryBtn.dataset.xlcControl = "setup.docs.retry";
            retryBtn.textContent = t("retry");
            retryBtn.addEventListener("click", retry);
            pickerList.appendChild(retryBtn);
        }
    };
    const searchPickerDocs = (keyword: string): void => {
        const seq = ++pickerSeq;
        pickerList.innerHTML = "";
        pickerList.removeAttribute("aria-busy");
        pickedDoc = null;
        syncNextState();
        if (!keyword) return;
        pickerList.setAttribute("aria-busy", "true");
        showDocPickerMessage(t("loading"));
        void ctx.library.searchDocs(keyword).then((result) => {
            if (seq !== pickerSeq) return;
            pickerList.removeAttribute("aria-busy");
            if (!result.ok || result.data.length === 0) {
                const message = result.ok ? t("docPickerEmpty") : t("kernelError", result.message);
                showDocPickerMessage(message, result.ok ? undefined : () => {
                    if (pickerInput.value.trim() === keyword) searchPickerDocs(keyword);
                });
                return;
            }
            pickerList.textContent = "";
            for (const hit of result.data.slice(0, 8)) {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "xlc-doclist-item";
                item.dataset.xlcControl = "setup.doc.result";
                item.textContent = hit.hPath || hit.name || hit.id;
                if (hit.id === currentDocId) {
                    pickedDoc = {id: hit.id, hPath: hit.hPath};
                    item.classList.add("xlc-doclist-item--on");
                }
                item.addEventListener("click", () => {
                    pickedDoc = {id: hit.id, hPath: hit.hPath};
                    pickerList.querySelectorAll(".xlc-doclist-item").forEach((el) => el.classList.remove("xlc-doclist-item--on"));
                    item.classList.add("xlc-doclist-item--on");
                    syncNextState();
                });
                pickerList.appendChild(item);
            }
            syncNextState();
        }).catch((err) => {
            if (seq !== pickerSeq) return;
            pickerList.removeAttribute("aria-busy");
            showDocPickerMessage(t("kernelError", toErrorMessage(err)), () => {
                if (pickerInput.value.trim() === keyword) searchPickerDocs(keyword);
            });
        });
    };
    pickerInput.addEventListener("input", () => searchPickerDocs(pickerInput.value.trim()));

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
    nbSelect.dataset.xlcControl = "setup.notebook";
    nbSelect.disabled = true;
    if (existingConfig?.mode === "notebook" && existingConfig.notebookIds[0]) {
        nbSelect.dataset.currentNotebook = existingConfig.notebookIds[0];
    }
    nbLabel.htmlFor = nbSelect.id;
    nbWrap.appendChild(nbSelect);
    const nbStatus = document.createElement("p");
    nbStatus.className = "xlc-form-hint xlc-setup-notebook-status";
    nbStatus.textContent = t("setupNotebookLoading");
    nbWrap.appendChild(nbStatus);
    const retryNotebooksBtn = document.createElement("button");
    retryNotebooksBtn.type = "button";
    retryNotebooksBtn.className = "b3-button xlc-btn-ghost xlc-setup-notebook-retry";
    retryNotebooksBtn.dataset.xlcControl = "setup.notebook.retry";
    retryNotebooksBtn.textContent = t("retry");
    retryNotebooksBtn.style.display = "none";
    nbWrap.appendChild(retryNotebooksBtn);
    step1.appendChild(nbWrap);
    let notebooksLoaded = false;
    let notebooksLoading = false;
    let notebookDocsChecking = false;
    let checkedNotebookId = "";
    let notebookDocsState: "unchecked" | "ready" | "empty" | "error" = "unchecked";
    const loadNotebooks = (force = false): void => {
        if ((!force && notebooksLoaded) || notebooksLoading) return;
        notebooksLoading = true;
        notebooksLoaded = false;
        nbSelect.disabled = true;
        nbStatus.textContent = t("setupNotebookLoading");
        retryNotebooksBtn.style.display = "none";
        retryNotebookAction = () => { void loadNotebooks(true); };
        void ctx.library.listNotebooks().then((result) => {
            nbSelect.textContent = "";
            if (!result.ok) {
                return;
            }
            if (result.data.length === 0) {
                notebooksLoaded = true;
                return;
            }
            const choose = document.createElement("option");
            choose.value = "";
            choose.textContent = t("setupChooseNotebook");
            choose.disabled = true;
            nbSelect.appendChild(choose);
            for (const nb of result.data) {
                const opt = document.createElement("option");
                opt.value = nb.id;
                opt.textContent = nb.name;
                nbSelect.appendChild(opt);
            }
            nbSelect.value = nbSelect.dataset.currentNotebook && result.data.some((nb) => nb.id === nbSelect.dataset.currentNotebook)
                ? nbSelect.dataset.currentNotebook
                : "";
            notebooksLoaded = true;
            nbSelect.disabled = false;
        }).catch(() => {
        }).finally(() => {
            notebooksLoading = false;
            renderNotebookStatus();
            syncCreateState();
            syncNextState();
        });
    };
    let retryNotebookAction = (): void => { void loadNotebooks(true); };
    retryNotebooksBtn.addEventListener("click", () => retryNotebookAction());
    const renderNotebookStatus = (): void => {
        const selectedId = nbSelect.value;
        if (notebooksLoading) {
            nbStatus.textContent = t("setupNotebookLoading");
            retryNotebooksBtn.style.display = "none";
            return;
        }
        if (!notebooksLoaded) {
            nbStatus.textContent = t("setupNotebookLoadFailed");
            retryNotebooksBtn.style.display = "";
            retryNotebookAction = () => { void loadNotebooks(true); };
            return;
        }
        if (nbSelect.options.length <= 1) {
            nbStatus.textContent = t("setupNotebookEmpty");
            retryNotebooksBtn.style.display = "none";
            return;
        }
        if (modeSelect.value !== "notebook" || !selectedId) {
            nbStatus.textContent = t("setupNotebookReady");
            retryNotebooksBtn.style.display = "none";
            return;
        }
        if (notebookDocsChecking) {
            nbStatus.textContent = t("setupNotebookDocsChecking");
            retryNotebooksBtn.style.display = "none";
            return;
        }
        if (checkedNotebookId !== selectedId || notebookDocsState === "unchecked") {
            nbStatus.textContent = t("setupNotebookNeedsDocsCheck");
            retryNotebooksBtn.style.display = "none";
            return;
        }
        if (notebookDocsState === "ready") {
            nbStatus.textContent = t("setupNotebookDocsReady");
            retryNotebooksBtn.style.display = "none";
            return;
        }
        nbStatus.textContent = notebookDocsState === "empty" ? t("setupNotebookNoDocs") : t("setupNotebookDocsCheckFailed");
        retryNotebooksBtn.style.display = notebookDocsState === "error" ? "" : "none";
        retryNotebookAction = () => {
            const notebookId = nbSelect.value;
            const revision = setupRevision;
            void verifyNotebookHasDocs(notebookId).then((valid) => {
                if (valid && setupRevision === revision && modeSelect.value === "notebook" && nbSelect.value === notebookId) gotoStep(2);
            });
        };
    };
    async function verifyNotebookHasDocs(notebookId: string): Promise<boolean> {
        if (notebookDocsChecking || !notebookId) return false;
        notebookDocsChecking = true;
        checkedNotebookId = notebookId;
        notebookDocsState = "unchecked";
        nbSelect.disabled = true;
        renderNotebookStatus();
        try {
            const result = await ctx.library.listNotebookDocs(notebookId);
            if (!result.ok) {
                notebookDocsState = "error";
                ctx.notify("error", t("kernelError", result.message));
                return false;
            }
            if (result.data.length === 0) {
                notebookDocsState = "empty";
                ctx.notify("error", t("setupNotebookNoDocs"));
                return false;
            }
            notebookDocsState = "ready";
            return true;
        } catch (err) {
            notebookDocsState = "error";
            ctx.notify("error", t("kernelError", toErrorMessage(err)));
            return false;
        } finally {
            notebookDocsChecking = false;
            nbSelect.disabled = !notebooksLoaded || nbSelect.options.length <= 1;
            renderNotebookStatus();
            syncCreateState();
            syncNextState();
        }
    }

    // new-notebook：独立笔记本名称；与已有笔记本选择分开，避免把“创建”误解成切换已有容器。
    const independentNotebookWrap = document.createElement("div");
    independentNotebookWrap.className = "xlc-form-field xlc-setup-independent-notebook";
    independentNotebookWrap.style.display = "none";
    const independentNotebookLabel = document.createElement("label");
    independentNotebookLabel.className = "xlc-form-label";
    independentNotebookLabel.textContent = t("setupIndependentNotebookName");
    independentNotebookWrap.appendChild(independentNotebookLabel);
    const independentNotebookInput = document.createElement("input");
    independentNotebookInput.className = "b3-text-field";
    independentNotebookInput.id = "xlc-setup-independent-notebook";
    independentNotebookInput.placeholder = t("setupIndependentNotebookNamePlaceholder");
    independentNotebookInput.setAttribute("aria-label", t("setupIndependentNotebookName"));
    independentNotebookInput.dataset.xlcControl = "setup.new-notebook.name";
    independentNotebookLabel.htmlFor = independentNotebookInput.id;
    independentNotebookWrap.appendChild(independentNotebookInput);
    const independentNotebookHint = document.createElement("p");
    independentNotebookHint.className = "xlc-form-hint";
    independentNotebookHint.textContent = t("setupIndependentNotebookHint");
    independentNotebookWrap.appendChild(independentNotebookHint);
    const independentNotebookStatus = document.createElement("p");
    independentNotebookStatus.className = "xlc-form-hint xlc-setup-create-status";
    independentNotebookStatus.setAttribute("role", "status");
    independentNotebookStatus.setAttribute("aria-live", "polite");
    independentNotebookWrap.appendChild(independentNotebookStatus);
    step1.appendChild(independentNotebookWrap);

    const syncModeUi = (): void => {
        const mode = modeSelect.value;
        const needsNotebook = mode === "notebook" || mode === "new-doc";
        pickerWrap.style.display = mode === "doc" || mode === "tree" ? "" : "none";
        nbWrap.style.display = needsNotebook ? "" : "none";
        independentNotebookWrap.style.display = mode === "new-notebook" ? "" : "none";
        nameWrap.style.display = mode === "new-doc" || mode === "new-notebook" ? "" : "none";
        nbLabel.textContent = mode === "new-doc" ? t("setupCreateNotebook") : t("setupNotebook");
        createBtn.dataset.xlcControl = mode === "new-notebook" ? "setup.new-notebook.create" : "setup.newdoc.create";
        if (needsNotebook) loadNotebooks();
        renderNotebookStatus();
        syncCreateState();
        syncNextState();
    };
    modeSelect.addEventListener("change", () => {
        setupRevision++;
        syncModeUi();
    });

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
    nameInput.dataset.xlcControl = "setup.newdoc.title";
    nameLabel.htmlFor = nameInput.id;
    nameInput.value = t("setupNewDocName");
    nameRow.appendChild(nameInput);
    const createBtn = document.createElement("button");
    createBtn.className = "b3-button";
    createBtn.dataset.xlcControl = "setup.newdoc.create";
    createBtn.style.whiteSpace = "nowrap";
    createBtn.textContent = t("create");
    createBtn.disabled = true;
    let creatingLibrary = false;
    createBtn.addEventListener("click", () => {
        const mode = modeSelect.value;
        const notebookId = mode === "new-doc" ? nbSelect.value : "";
        const notebookName = independentNotebookInput.value.trim();
        const title = nameInput.value.trim();
        if ((mode === "new-doc" && !notebookId) || (mode === "new-notebook" && !notebookName) || !title) {
            ctx.notify("error", t("invalidItem"));
            return;
        }
        const revision = setupRevision;
        // 创建前明确确认（不静默写入）；执行期飞行态防重入——并发创建会产生孤儿库文档（R138）
        const confirmText = mode === "new-notebook"
            ? t("setupIndependentConfirmCreate", notebookName, title)
            : t("setupConfirmCreate", title);
        confirm("⚠️ " + t("setupTitle"), confirmText, () => {
            if (creatingLibrary || setupRevision !== revision || modeSelect.value !== mode
                || (mode === "new-doc" && nbSelect.value !== notebookId)
                || (mode === "new-notebook" && independentNotebookInput.value.trim() !== notebookName)
                || nameInput.value.trim() !== title) return;
            creatingLibrary = true;
            modeSelect.disabled = true;
            nbSelect.disabled = true;
            nameInput.disabled = true;
            independentNotebookInput.disabled = true;
            createBtn.textContent = t("saving");
            independentNotebookStatus.textContent = mode === "new-notebook" ? t("saving") : "";
            independentNotebookStatus.classList.remove("xlc-form-error");
            syncCreateState();
            const createTask = mode === "new-notebook"
                ? ctx.library.createIndependentLibrary(notebookName, title)
                : ctx.library.createLibraryDoc(notebookId, title);
            void createTask.then((result) => {
                creatingLibrary = false;
                modeSelect.disabled = false;
                nbSelect.disabled = !notebooksLoaded || nbSelect.options.length <= 1;
                nameInput.disabled = false;
                independentNotebookInput.disabled = false;
                createBtn.textContent = t("create");
                syncCreateState();
                if (!result.ok) {
                    const message = mode === "new-notebook"
                        ? t("setupIndependentCreateFailed", result.message)
                        : t("kernelError", result.message);
                    independentNotebookStatus.classList.toggle("xlc-form-error", mode === "new-notebook");
                    independentNotebookStatus.textContent = mode === "new-notebook" ? message : "";
                    nbStatus.textContent = mode === "new-notebook" ? message : t("kernelError", result.message);
                    ctx.notify("error", message);
                    return;
                }
                const docId = result.data.docId;
                const createdNotebookId = mode === "new-notebook" && "notebookId" in result.data
                    && typeof result.data.notebookId === "string"
                    ? result.data.notebookId
                    : "";
                ctx.applyConfig({
                    configVersion: CONFIG_VERSION,
                    mode: "doc",
                    notebookIds: [],
                    containerDocIds: [docId],
                    createdDocIds: [docId],
                    ...(createdNotebookId ? {createdNotebookIds: [createdNotebookId]} : {}),
                    configuredAt: Date.now(),
                });
                independentNotebookStatus.textContent = "";
                independentNotebookStatus.classList.remove("xlc-form-error");
                ctx.notify("info", t("libDocCreated", title));
                onConfigured();
            }).catch((err) => {
                creatingLibrary = false;
                modeSelect.disabled = false;
                nbSelect.disabled = !notebooksLoaded || nbSelect.options.length <= 1;
                nameInput.disabled = false;
                independentNotebookInput.disabled = false;
                createBtn.textContent = t("create");
                syncCreateState();
                const message = mode === "new-notebook"
                    ? t("setupIndependentCreateFailed", toErrorMessage(err))
                    : t("kernelError", toErrorMessage(err));
                independentNotebookStatus.classList.toggle("xlc-form-error", mode === "new-notebook");
                independentNotebookStatus.textContent = mode === "new-notebook" ? message : "";
                ctx.notify("error", message);
            });
        });
    });
    nameRow.appendChild(createBtn);
    nameWrap.appendChild(nameRow);
    step1.appendChild(nameWrap);

    function syncCreateState(): void {
        const mode = modeSelect.value;
        createBtn.disabled = creatingLibrary
            || (mode === "new-doc" && (!notebooksLoaded || !nbSelect.value))
            || (mode !== "new-doc" && mode !== "new-notebook")
            || (mode === "new-notebook" && !independentNotebookInput.value.trim())
            || !nameInput.value.trim();
    }
    nbSelect.addEventListener("change", () => {
        setupRevision++;
        checkedNotebookId = "";
        notebookDocsState = "unchecked";
        renderNotebookStatus();
        syncCreateState();
        syncNextState();
    });
    nameInput.addEventListener("input", syncCreateState);
    independentNotebookInput.addEventListener("input", syncCreateState);

    const step1Actions = document.createElement("div");
    step1Actions.className = "xlc-form-actions";
    if (opts?.onDismiss) {
        const dismissBtn = document.createElement("button");
        dismissBtn.className = "b3-button xlc-btn-ghost";
        dismissBtn.dataset.xlcControl = "setup.later";
        dismissBtn.textContent = t("setupLater");
        dismissBtn.addEventListener("click", () => opts.onDismiss?.());
        step1Actions.appendChild(dismissBtn);
    }
    const nextBtn = document.createElement("button");
    nextBtn.className = "b3-button xlc-btn-primary";
    nextBtn.dataset.xlcControl = "setup.next";
    nextBtn.textContent = t("setupNext");
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => {
        const mode = modeSelect.value as LibraryConfig["mode"];
        if (mode === "notebook" && !nbSelect.value) {
            ctx.notify("error", nbSelect.disabled ? t("setupNotebookNotReady") : t("pickNotebookFirst"));
            return;
        }
        if (mode !== "notebook" && !pickedDoc) {
            ctx.notify("error", t("pickDocFirst"));
            return;
        }
        if (mode === "notebook") {
            const notebookId = nbSelect.value;
            const revision = setupRevision;
            nextBtn.disabled = true;
            void verifyNotebookHasDocs(notebookId).then((valid) => {
                if (valid && setupRevision === revision && modeSelect.value === "notebook" && nbSelect.value === notebookId) gotoStep(2);
            }).finally(() => syncNextState());
            return;
        }
        gotoStep(2);
    });
    step1Actions.appendChild(nextBtn);
    step1.appendChild(step1Actions);
    function syncNextState(): void {
        const mode = modeSelect.value;
        const rootCheckFailed = checkedNotebookId === nbSelect.value
            && (notebookDocsState === "empty" || notebookDocsState === "error");
        nextBtn.style.display = mode === "new-doc" || mode === "new-notebook" ? "none" : "";
        nextBtn.disabled = mode === "notebook"
            ? !notebooksLoaded || !nbSelect.value || notebookDocsChecking || rootCheckFailed
            : mode === "new-doc" || mode === "new-notebook" || !pickedDoc;
    }
    syncModeUi();
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
    backBtn.dataset.xlcControl = "setup.back";
    backBtn.textContent = t("setupBack");
    backBtn.addEventListener("click", () => gotoStep(1));
    step2Actions.appendChild(backBtn);
    const finishBtn = document.createElement("button");
    finishBtn.className = "b3-button xlc-btn-primary";
    finishBtn.dataset.xlcControl = "setup.finish";
    finishBtn.textContent = t("setupFinish");
    finishBtn.addEventListener("click", () => {
        const mode = modeSelect.value as LibraryConfig["mode"];
        if (mode === "notebook") {
            const notebookId = nbSelect.value;
            if (!notebookId) {
                ctx.notify("error", t("invalidItem"));
                return;
            }
            const revision = setupRevision;
            finishBtn.disabled = true;
            void verifyNotebookHasDocs(notebookId).then((valid) => {
                if (setupRevision !== revision || step !== 2 || modeSelect.value !== "notebook" || nbSelect.value !== notebookId) return;
                if (!valid) {
                    gotoStep(1);
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
            }).finally(() => {
                finishBtn.disabled = false;
                syncNextState();
            });
            return;
        }
        if (!pickedDoc) {
            ctx.notify("error", t("pickDocFirst"));
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
        desc.textContent = mode === "notebook"
            ? t("setupSummaryNotebook")
            : mode === "tree" ? t("setupSummaryTree") : t("setupSummaryDoc");
        text.appendChild(desc);
        card.appendChild(text);
        summaryWrap.appendChild(card);
    }

    function gotoStep(next: 1 | 2): void {
        setupRevision++;
        step = next;
        stepsEl.remove();
        root.insertBefore(buildStepsEl(step, step === 1 ? t("setupStep1") : t("setupStep2")), root.firstChild);
        step1.style.display = step === 1 ? "" : "none";
        hint.style.display = step === 1 ? "" : "none";
        usageGuide.style.display = step === 1 && !showQuickStart ? "" : "none";
        recommendation.style.display = step === 1 ? "" : "none";
        quickStart.style.display = step === 1 && showQuickStart ? "" : "none";
        step2.style.display = step === 2 ? "" : "none";
        if (step === 2) paintSummary();
    }

    if (existingConfig && existingConfig.mode !== "notebook") {
        const currentDoc = existingConfig.containerDocIds[0];
        if (currentDoc) {
            void ctx.library.getDocPath(currentDoc).then((hPath) => {
                if (!hPath || pickerInput.value) return;
                const pathParts = hPath.split("/").filter(Boolean);
                pickerInput.value = pathParts[pathParts.length - 1] ?? hPath;
                pickerInput.dispatchEvent(new Event("input"));
            });
        }
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
    const dirtyShare = !aiEnabledBox.checked && ctx.state.ai.shareContent; // 总开关关但正文开关仍开（R138）
    syncAiShare();
    aiEnabledBox.addEventListener("change", syncAiShare);
    if (dirtyShare) ctx.persistSoon(); // 构建期修复的脏数据落盘，否则重载后回归
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
    let addCtBtn: HTMLButtonElement | null = null;
    const repaintCt = (): void => {
        ctList.textContent = "";
        for (const ct of ctx.state.ai.customTransforms) {
            const row = document.createElement("div");
            row.className = "xlc-ct-row";
            const nameInput = document.createElement("input");
            nameInput.className = "b3-text-field xlc-ct-name";
            nameInput.dataset.xlcControl = `settings.ai.custom-transform.name.${ct.id}`;
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
            promptInput.dataset.xlcControl = `settings.ai.custom-transform.prompt.${ct.id}`;
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
            delBtn.dataset.xlcControl = `settings.ai.custom-transform.delete.${ct.id}`;
            delBtn.textContent = t("delete");
            delBtn.addEventListener("click", () => {
                // 危险操作对齐惯例：确认 + 回执（名称+指令一键即失，且不可恢复，R138）
                confirm(t("delete") + " · " + t("customTransformSection"), t("ctDeleteConfirm", ct.name), () => {
                    ctx.state.ai.customTransforms = ctx.state.ai.customTransforms.filter((c) => c.id !== ct.id);
                    persistCt();
                    repaintCt();
                    ctx.notify("info", t("ctDeleted", ct.name));
                });
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
        if (addCtBtn) addCtBtn.disabled = ctx.state.ai.customTransforms.length >= 10;
    };
    repaintCt();
    addCtBtn = document.createElement("button");
    addCtBtn.type = "button";
    addCtBtn.className = "b3-button";
    addCtBtn.dataset.xlcControl = "settings.ai.custom-transform.add";
    addCtBtn.style.alignSelf = "flex-start";
    addCtBtn.textContent = t("customTransformAdd");
    addCtBtn.addEventListener("click", () => {
        if (ctx.state.ai.customTransforms.length >= 10) return;
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
    root.appendChild(aiSec);
}

function buildSearchSection(ctx: SettingsUiContext, root: HTMLElement): void {
    const t = ctx.t;
    let pinyinSeq = 0; // 重索引代次（R138）
    // 搜索设置区（拼音：本地注解，无出域）
    const searchSec = document.createElement("div");
    searchSec.className = "xlc-form-field xlc-card";
    const searchLabel = document.createElement("span");
    searchLabel.className = "xlc-form-label";
    searchLabel.textContent = t("searchSection");
    searchSec.appendChild(searchLabel);
    const pinyinRow = buildSwitchRow(t("pinyinToggle"), t("pinyinToggleSub"), ctx.state.search.pinyin, (value) => {
        // 代次守卫：快速来回拨动时丢弃过期的重索引回执（R138，对齐 doc picker seq 范式）
        const mySeq = ++pinyinSeq;
        ctx.state.search.pinyin = value;
        ctx.applyPinyinAdapter();
        ctx.persistSoon();
        const pinyinInput = pinyinRow.querySelector<HTMLInputElement>("input");
        pinyinInput?.setAttribute("aria-busy", "true");
        if (pinyinInput) pinyinInput.disabled = true;
        pinyinRow.setAttribute("aria-busy", "true");
        void ctx.library.reindex().then((idx) => {
            if (mySeq !== pinyinSeq) return;
            ctx.refreshSearch?.();
            ctx.notify("info", t("reindexDone", String(idx.entries.length)));
        }).catch((err) => {
            if (mySeq !== pinyinSeq) return;
            ctx.notify("error", t("kernelError", toErrorMessage(err)));
        }).finally(() => {
            if (pinyinInput) {
                pinyinInput.disabled = false;
                pinyinInput.removeAttribute("aria-busy");
            }
            pinyinRow.removeAttribute("aria-busy");
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

/** 已保存的标签发现视图：只管理侧车快捷配置，不触碰源块或内容库条目。 */
function buildSavedViewsSection(ctx: SettingsUiContext, root: HTMLElement, beforeOpen?: () => void): void {
    const t = ctx.t;
    const sec = document.createElement("div");
    sec.className = "xlc-form-field xlc-card xlc-saved-views";
    sec.dataset.xlcControl = "settings.saved-views";
    const label = document.createElement("span");
    label.className = "xlc-form-label";
    label.textContent = t("savedViewsSection");
    sec.appendChild(label);
    const list = document.createElement("div");
    list.className = "xlc-saved-view-list";
    list.setAttribute("role", "list");
    list.setAttribute("aria-label", t("savedViewsSection"));
    sec.appendChild(list);

    const readViews = (): readonly SavedDiscoveryView[] => {
        const fromContext = ctx.getSavedDiscoveryViews?.();
        return fromContext ?? ctx.state.search.savedDiscoveryViews ?? [];
    };
    const scopeLabel = (scope: SavedDiscoveryScope): string => {
        switch (scope) {
            case "document": return t("discoveryScopeDocument");
            case "notebook": return t("discoveryScopeNotebook");
            case "tree": return t("discoveryScopeTree");
            case "selected-notebook": return t("discoveryScopeSelectedNotebook");
            case "all-notebooks": return t("discoveryScopeAllNotebooks");
        }
    };
    const render = (): void => {
        list.replaceChildren();
        const views = readViews();
        if (views.length === 0) {
            const empty = document.createElement("span");
            empty.className = "xlc-form-hint xlc-saved-view-empty";
            empty.textContent = t("savedViewsEmpty");
            list.appendChild(empty);
            return;
        }
        for (const view of views) {
            const row = document.createElement("div");
            row.className = "xlc-setting-row xlc-saved-view-row";
            row.dataset.xlcSavedViewId = view.id;
            row.setAttribute("role", "listitem");

            const text = document.createElement("span");
            text.className = "xlc-setting-text";
            const name = document.createElement("strong");
            name.className = "xlc-saved-view-name";
            name.textContent = view.name;
            text.appendChild(name);
            const meta = document.createElement("span");
            meta.className = "xlc-setting-sub xlc-saved-view-meta";
            const pieces = [`#${view.tag}`, scopeLabel(view.scope)];
            if (view.pathLabel) pieces.push(view.pathLabel);
            meta.textContent = pieces.join(" · ");
            text.appendChild(meta);
            row.appendChild(text);

            const actions = document.createElement("span");
            actions.className = "xlc-setting-actions";
            const open = document.createElement("button");
            open.type = "button";
            open.className = "b3-button xlc-btn-ghost";
            open.dataset.xlcControl = "settings.saved-view.open";
            open.textContent = t("savedViewsOpen");
            open.disabled = !ctx.openSavedDiscoveryView;
            open.addEventListener("click", () => {
                if (!ctx.openSavedDiscoveryView) return;
                beforeOpen?.();
                ctx.openSavedDiscoveryView(view);
            });
            actions.appendChild(open);

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "b3-button xlc-btn-ghost";
            remove.dataset.xlcControl = "settings.saved-view.delete";
            remove.textContent = t("savedViewsDelete");
            remove.addEventListener("click", () => {
                confirm("⚠️ " + t("savedViewsDelete"), t("savedViewsDeleteConfirm", view.name), () => {
                    if (ctx.deleteSavedDiscoveryView) {
                        ctx.deleteSavedDiscoveryView(view.id);
                    } else {
                        ctx.state.search.savedDiscoveryViews = (ctx.state.search.savedDiscoveryViews ?? [])
                            .filter((entry) => entry.id !== view.id);
                        ctx.persistSoon();
                    }
                    ctx.notify("info", `${t("savedViewsDelete")}: ${view.name}`);
                    render();
                });
            });
            actions.appendChild(remove);
            row.appendChild(actions);
            list.appendChild(row);
        }
    };
    render();
    root.appendChild(sec);
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
        ? (cfg.mode === "notebook" ? t("libModeNotebook", String(cfg.notebookIds.length))
            : cfg.mode === "tree" ? t("libModeTree", String(cfg.containerDocIds.length))
                : t("libModeDoc", String(cfg.containerDocIds.length)))
        : t("libraryNone")}`;
    dataSec.appendChild(libRow);
    // 数据动作统一使用可访问状态行，避免只依赖 toast：加载会锁定按钮，失败提供重试，
    // 空结果和成功都在动作区附近保留可观测反馈。
    const operationStatus = document.createElement("div");
    operationStatus.className = "xlc-operation-status";
    operationStatus.hidden = true;
    operationStatus.setAttribute("role", "status");
    operationStatus.setAttribute("aria-live", "polite");
    dataSec.appendChild(operationStatus);
    const setOperationStatus = (state: "loading" | "success" | "error" | "empty" | "idle", message = "", retry?: () => void): void => {
        operationStatus.dataset.state = state;
        operationStatus.hidden = state === "idle";
        operationStatus.replaceChildren();
        if (message) {
            const text = document.createElement("span");
            text.className = state === "error" ? "xlc-form-error" : "xlc-form-hint";
            text.textContent = message;
            operationStatus.appendChild(text);
        }
        if (retry && state === "error") {
            const retryBtn = document.createElement("button");
            retryBtn.type = "button";
            retryBtn.className = "b3-button xlc-btn-ghost xlc-operation-retry";
            retryBtn.dataset.xlcControl = "settings.data.retry";
            retryBtn.textContent = t("retry");
            retryBtn.addEventListener("click", retry);
            operationStatus.appendChild(retryBtn);
        }
    };
    const dataBtns = document.createElement("div");
    dataBtns.style.display = "flex";
    dataBtns.style.gap = "8px";
    dataBtns.style.flexWrap = "wrap";
    const mkBtn = (label: string, onClick?: () => void, control?: string): HTMLButtonElement => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "b3-button";
        btn.textContent = label;
        if (control) btn.dataset.xlcControl = control;
        if (onClick) btn.addEventListener("click", onClick);
        dataBtns.appendChild(btn);
        return btn;
    };
    // 异步按钮统一飞行态：执行期间禁用防连击，失败时保留可重试入口。
    const withFlight = (btn: HTMLButtonElement, run: () => Promise<{status?: "empty"; message?: string} | void>, opts: {flightLabel?: string; loading?: string; success?: string; empty?: string; formatError?: (err: unknown) => string} = {}): void => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            btn.disabled = true;
            const original = btn.textContent ?? "";
            btn.setAttribute("aria-busy", "true");
            if (opts.flightLabel) btn.textContent = opts.flightLabel;
            setOperationStatus("loading", opts.loading ?? t("loading"));
            void Promise.resolve()
                .then(run)
                .then((result) => {
                    const value = result ?? {};
                    if (value.status === "empty") {
                        setOperationStatus("empty", value.message ?? opts.empty ?? t("empty"));
                    } else if (value.message || opts.success) {
                        setOperationStatus("success", value.message ?? opts.success ?? "");
                    } else {
                        setOperationStatus("idle");
                    }
                })
                .catch((err: unknown) => {
                    const message = opts.formatError?.(err) ?? t("kernelError", toErrorMessage(err));
                    ctx.notify("error", message);
                    setOperationStatus("error", message, () => btn.click());
                })
                .finally(() => {
                    btn.disabled = false;
                    btn.removeAttribute("aria-busy");
                    if (opts.flightLabel) btn.textContent = original;
                });
        });
    };
    const reindexBtn = mkBtn(t("reindexBtn"), undefined, "settings.data.reindex");
    withFlight(reindexBtn, async () => {
        const idx = await ctx.library.reindex();
        const message = idx.truncated
            ? t("reindexTruncated", String(LIMITS.maxItems))
            : t("reindexDone", String(idx.entries.length));
        ctx.refreshSearch?.();
        ctx.notify("info", message);
        return {message};
    }, {flightLabel: t("indexing"), loading: t("indexing")});
    const clearRecentsBtn = mkBtn(ctx.state.recents.length ? t("clearRecents") : t("clearRecentsEmpty"), undefined, "settings.data.clearRecents");
    clearRecentsBtn.addEventListener("click", () => {
        if (ctx.state.recents.length === 0 || clearRecentsBtn.disabled) return;
        confirm("⚠️ " + t("clearRecents"), t("clearRecentsConfirm"), () => {
            ctx.state.recents = [];
            ctx.persistSoon();
            ctx.refreshSearch?.();
            clearRecentsBtn.textContent = t("clearRecentsEmpty");
            clearRecentsBtn.disabled = true;
            ctx.notify("info", t("clearRecentsDone"));
            setOperationStatus("success", t("clearRecentsDone"));
        });
    });
    clearRecentsBtn.disabled = ctx.state.recents.length === 0;
    if (ctx.state.ai.enabled) {
        const auditBtn = mkBtn("✦ " + t("tagAuditBtn"), undefined, "settings.data.tagAudit");
        withFlight(auditBtn, async () => {
            const result = await runTagAudit(ctx);
            return result === "empty" ? {status: "empty" as const, message: t("tagAuditTooFew")} : undefined;
        }, {flightLabel: "✦ " + t("aiWorking"), loading: t("aiWorking"), formatError: (err) => toErrorMessage(err)});
    }
    const exportBtn = mkBtn(t("exportBtn"), undefined, "settings.data.export");
    withFlight(exportBtn, async () => {
        const json = await ctx.exportBundle();
        const count = (JSON.parse(json) as {items: unknown[]}).items.length;
        if (count === 0) {
            return {status: "empty" as const, message: t("exportEmpty")};
        }
        const blob = new Blob([json], {type: "application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `xiaolv-common-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        const message = t("exportDone", String(count));
        ctx.notify("info", message);
        return {message};
    }, {flightLabel: t("indexing"), loading: t("indexing"), formatError: (err) => formatExportError(ctx, err)});
    const packBtn = mkBtn(t("packBtn"), undefined, "settings.data.packExport");
    withFlight(packBtn, async () => {
        await openPackExportDialog(ctx);
        return {message: t("packExportTitle")};
    }, {flightLabel: t("loading"), loading: t("loading"), formatError: (err) => formatExportError(ctx, err)});
    const importBtn = mkBtn(t("importBtn"), () => {
        if (importBtn.disabled) return;
        const originalLabel = importBtn.textContent ?? "";
        let finished = false;
        let focusTimer: number | null = null;
        let onFocus: () => void;
        const finish = (): void => {
            if (finished) return;
            finished = true;
            importBtn.disabled = false;
            importBtn.textContent = originalLabel;
            importBtn.removeAttribute("aria-busy");
            window.removeEventListener("focus", onFocus);
            if (focusTimer !== null) window.clearTimeout(focusTimer);
        };
        onFocus = (): void => {
            // 取消系统文件选择器时没有 change 事件，回焦后恢复按钮，避免永久锁死。
            focusTimer = window.setTimeout(finish, 350);
        };
        importBtn.disabled = true;
        importBtn.setAttribute("aria-busy", "true");
        importBtn.textContent = t("loading");
        setOperationStatus("loading", t("loading"));
        window.addEventListener("focus", onFocus, {once: true});
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.dataset.xlcControl = "settings.import.file";
        fileInput.accept = ".json,application/json,.md,text/markdown";
        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) {
                finish();
                return;
            }
            if (file.size > LIMITS.maxImportBytes) {
                const message = t("importFailed", t("importReasonTooLarge"));
                ctx.notify("error", message);
                setOperationStatus("error", message, () => importBtn.click());
                finish();
                return;
            }
            void file.text().then((text) => {
                const isMd = /\.md$/i.test(file.name);
                if (isMd) {
                    // Markdown 包：解析 → 同一策略对话框 → importBundle
                    const parsed = parseMarkdownPack(text);
                    if (parsed.items.length === 0) {
                        const message = t("importFailed", t("importReasonNoMeta"));
                        ctx.notify("error", message);
                        setOperationStatus("error", message, () => importBtn.click());
                        finish();
                        return;
                    }
                    openImportPolicyDialog(ctx, {items: parsed.items, pack: parsed.pack}, parsed.issues, {kind: "markdown-pack", items: parsed.items});
                    setOperationStatus("success", t("importPreview", String(parsed.items.length), String(parsed.issues.length)));
                    finish();
                    return;
                }
                const validation = validateImport(text);
                if (!validation.ok || !validation.parsed) {
                    const message = t("importFailed", validation.reason ?? t("importReasonUnknown"));
                    ctx.notify("error", message);
                    setOperationStatus("error", message, () => importBtn.click());
                    finish();
                    return;
                }
                openImportPolicyDialog(ctx, validation.parsed, validation.issues, {kind: "json", text});
                setOperationStatus("success", t("importPreview", String(validation.parsed.items.length), String(validation.issues.length)));
                finish();
            }).catch((err: unknown) => {
                const message = t("importFailed", toErrorMessage(err));
                ctx.notify("error", message);
                setOperationStatus("error", message, () => importBtn.click());
                finish();
            });
        });
        fileInput.addEventListener("cancel", () => {
            finish();
            setOperationStatus("idle");
        });
        fileInput.click();
    });
    importBtn.dataset.xlcControl = "settings.data.import";
    const espansoBtn = mkBtn(t("espansoImportBtn"), undefined, "settings.data.espansoImport");
    // 打开 Espanso 输入对话框本身是同步动作，但仍需锁住按钮直到对话框关闭，
    // 防止连续点击叠出多个解析窗口。
    let espansoOpen = false;
    espansoBtn.addEventListener("click", () => {
        if (espansoOpen || espansoBtn.disabled) return;
        espansoOpen = true;
        espansoBtn.disabled = true;
        espansoBtn.setAttribute("aria-busy", "true");
        setOperationStatus("loading", t("loading"));
        openEspansoImportDialog(ctx, () => {
            espansoOpen = false;
            espansoBtn.disabled = false;
            espansoBtn.removeAttribute("aria-busy");
            setOperationStatus("idle");
        });
    });
    dataSec.appendChild(dataBtns);
    const templateRow = document.createElement("div");
    templateRow.className = "xlc-setting-row xlc-template-import-row";
    const templateText = document.createElement("span");
    templateText.className = "xlc-setting-text";
    templateText.textContent = t("promptPackHint");
    templateRow.appendChild(templateText);
    const templateBtn = document.createElement("button");
    templateBtn.type = "button";
    templateBtn.className = "b3-button";
    templateBtn.textContent = t("promptPackBtn");
    templateBtn.dataset.xlcControl = "settings.data.templateImport";
    templateBtn.addEventListener("click", () => {
        if (templateBtn.disabled) return;
        templateBtn.disabled = true;
        templateBtn.setAttribute("aria-busy", "true");
        const originalLabel = templateBtn.textContent ?? "";
        templateBtn.textContent = t("loading");
        setOperationStatus("loading", t("loading"));
        const parsed = parseMarkdownPack(PROMPT_PACK_MD);
        if (parsed.items.length === 0) {
            const message = t("importFailed", t("importReasonPackEmpty"));
            ctx.notify("error", message);
            setOperationStatus("error", message, () => templateBtn.click());
            templateBtn.disabled = false;
            templateBtn.removeAttribute("aria-busy");
            templateBtn.textContent = originalLabel;
            return;
        }
        openImportPolicyDialog(ctx, {items: parsed.items, pack: parsed.pack}, parsed.issues, {kind: "markdown-pack", items: parsed.items});
        setOperationStatus("success", t("importPreview", String(parsed.items.length), String(parsed.issues.length)));
        templateBtn.disabled = false;
        templateBtn.removeAttribute("aria-busy");
        templateBtn.textContent = originalLabel;
    });
    templateRow.appendChild(templateBtn);
    dataSec.appendChild(templateRow);
    root.appendChild(dataSec);
}

/** Espanso 配置导入（G2/R164）：粘贴 match YAML → 解析预览（条数+问题清单）→ 复用导入策略管道落库。 */
function openEspansoImportDialog(ctx: SettingsUiContext, onClose?: () => void): void {
    const t = ctx.t;
    const dialog = new Dialog({
        title: t("espansoTitle"),
        content: "",
        width: "min(680px, 92vw)",
        height: "min(680px, 86vh)",
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

    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.textContent = t("espansoHint");
    root.appendChild(hint);

    const ta = document.createElement("textarea");
    ta.className = "b3-text-field";
    ta.dataset.xlcControl = "settings.espanso.text";
    ta.rows = 10;
    ta.placeholder = t("espansoPlaceholder");
    ta.setAttribute("spellcheck", "false");
    root.appendChild(ta);

    const preview = document.createElement("div");
    preview.className = "xlc-form-hint";
    preview.style.whiteSpace = "pre-wrap";
    root.appendChild(preview);

    const foot = document.createElement("div");
    foot.className = "xlc-form-row";
    foot.style.justifyContent = "flex-end";
    foot.style.gap = "8px";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.dataset.xlcControl = "settings.espanso.cancel";
    cancelBtn.textContent = t("cancel");
    foot.appendChild(cancelBtn);
    const nextBtn = document.createElement("button");
    nextBtn.className = "b3-button xlc-btn-primary";
    nextBtn.dataset.xlcControl = "settings.espanso.next";
    nextBtn.textContent = t("setupNext");
    nextBtn.disabled = true;
    foot.appendChild(nextBtn);
    root.appendChild(foot);
    body.appendChild(root);

    // Dialog 的右上角关闭按钮由宿主销毁 DOM；观察移除确保入口按钮不会永久锁定。
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
    const runParse = async (): Promise<void> => {
        const sourceText = ta.value;
        parsedItems = [];
        parsedText = null;
        nextBtn.disabled = true;
        preview.textContent = "";
        let parser: typeof import("../service/espanso-import");
        try {
            parser = await loadEspansoParser();
        } catch (err) {
            preview.textContent = t("importFailed", toErrorMessage(err).slice(0, 120));
            return;
        }
        // 输入等待期间可能已经变化；旧解析结果不能覆盖最新文本。
        if (sourceText !== ta.value || !dialog.element.isConnected) return;
        const result = parser.parseEspansoYaml(sourceText);
        if (result.items.length === 0) {
            preview.textContent = result.issues.length ? result.issues.slice(0, 5).join("\n") : t("espansoNone");
            return;
        }
        parsedItems = result.items;
        parsedText = sourceText;
        const lines = [t("espansoParsed", String(result.items.length))];
        for (const issue of result.issues.slice(0, 5)) lines.push(`· ${issue}`);
        if (result.issues.length > 5) lines.push(`· …+${result.issues.length - 5}`);
        preview.textContent = lines.join("\n");
        nextBtn.disabled = false;
    };
    // 输入防抖 400ms（与搜索输入同节奏）：粘贴后无需额外点按钮
    let parseTimer: ReturnType<typeof setTimeout> | undefined;
    ta.addEventListener("input", () => {
        if (parseTimer) clearTimeout(parseTimer);
        // 立即让旧预览失效；400ms 防抖期间不能继续导入上一次的解析结果。
        parsedItems = [];
        parsedText = null;
        nextBtn.disabled = true;
        preview.textContent = "";
        parseTimer = setTimeout(() => { void runParse(); }, 400);
    });
    cancelBtn.addEventListener("click", () => {
        dialog.destroy();
        release();
    });
    nextBtn.addEventListener("click", () => {
        if (nextBtn.disabled || parsedItems.length === 0 || parsedText !== ta.value) return;
        dialog.destroy();
        release();
        openImportPolicyDialog(
            ctx,
            {items: parsedItems.map((i) => ({id: i.id, title: i.title}))},
            [],
            {kind: "espanso", items: parsedItems},
        );
    });
    ta.focus();
}

/** AI 标签体检：仅标签清单出域；结果只展示，不自动修改任何条目 */
async function runTagAudit(ctx: SettingsUiContext): Promise<"empty" | "shown"> {
    const t = ctx.t;
    let idx: Awaited<ReturnType<LibraryService["ensureIndex"]>>;
    try {
        idx = await ctx.library.ensureIndex();
    } catch (err) {
        throw new Error(t("kernelError", toErrorMessage(err)));
    }
    const tags = collectTags(idx.entries);
    if (tags.length < 2) {
        ctx.notify("info", t("tagAuditTooFew"));
        return "empty";
    }
    let suggestions;
    try {
        suggestions = await ctx.ai.tagAudit(tags);
    } catch (err) {
        throw new Error(ctx.aiErrorText(err));
    }
    const dialog = new Dialog({
        title: t("tagAuditTitle"),
        content: "",
        width: "min(620px, 92vw)",
        height: "min(600px, 84vh)", // 固定高：建议清单增长不顶跳（R146）
    });
    dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-form-host", "xlc-settings-host");
    const body = getDialogBody(dialog.element);
    if (!body) throw new Error(t("kernelError", "无法打开体检结果"));
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
    close.dataset.xlcControl = "settings.tag-audit.close";
    close.textContent = t("close");
    close.addEventListener("click", () => dialog.destroy());
    actions.appendChild(close);
    wrap.appendChild(actions);
    body.appendChild(wrap);
    return suggestions.length === 0 ? "empty" : "shown";
}

/** 导入策略确认（导入前校验已过；策略三选 → importBundleText → 汇总回执）。导出供渲染 harness 取证。 */
export function openImportPolicyDialog(
    ctx: SettingsUiContext,
    parsed: {items: Array<{id: string; title: string}>; pack?: {name: string; vars: string[]}},
    issues: ImportIssue[],
    source: {kind: "json"; text: string} | {kind: "markdown-pack"; items: ExportedItem[]} | {kind: "espanso"; items: ExportedItem[]},
): void {
    const t = ctx.t;
    const dialog = new Dialog({
        title: t("importPolicyTitle"),
        content: "",
        width: "min(540px, 92vw)",
        height: "min(640px, 86vh)", // 固定高：策略卡片高度稳定（R146）
    });
    dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-form-host", "xlc-settings-host");
    const body = getDialogBody(dialog.element);
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
    const receiptHint = document.createElement("p");
    receiptHint.className = "xlc-form-hint";
    receiptHint.setAttribute("role", "status");
    receiptHint.setAttribute("aria-live", "polite");
    receiptHint.textContent = t("importReceiptHint");
    const policyCards: HTMLButtonElement[] = [];
    const run = async (policy: ConflictPolicy): Promise<void> => {
        if (policyCards.some((card) => card.disabled)) return;
        policyCards.forEach((card) => {
            card.disabled = true;
            card.setAttribute("aria-busy", "true");
        });
        receiptHint.dataset.state = "loading";
        receiptHint.textContent = t("loading");
        try {
            const receipt = source.kind === "json"
                ? await ctx.importBundleText(source.text, policy)
                : await ctx.importMarkdownItems(source.items, policy);
            ctx.refreshSearch?.();
            const message = t(
                "importDone",
                String(receipt.created),
                String(receipt.skipped),
                String(receipt.overwritten),
                String(receipt.renamed),
                String(receipt.failed),
            );
            receiptHint.dataset.state = receipt.failed > 0 ? "error" : "success";
            receiptHint.textContent = message;
            ctx.notify(receipt.failed > 0 ? "error" : "info", message);
        } catch (err) {
            // 执行期失败≠校验失败：写入可能已部分完成，文案不得谎称「原始数据未改动」。
            const message = t("importRunFailed", toErrorMessage(err));
            receiptHint.dataset.state = "error";
            receiptHint.replaceChildren();
            const error = document.createElement("span");
            error.className = "xlc-form-error";
            error.textContent = message;
            receiptHint.appendChild(error);
            const retryBtn = document.createElement("button");
            retryBtn.type = "button";
            retryBtn.className = "b3-button xlc-btn-ghost xlc-operation-retry";
            retryBtn.dataset.xlcControl = "settings.import.retry";
            retryBtn.textContent = t("retry");
            retryBtn.addEventListener("click", () => void run(policy));
            receiptHint.appendChild(retryBtn);
            ctx.notify("error", message);
            policyCards.forEach((card) => {
                card.disabled = false;
                card.removeAttribute("aria-busy");
            });
        }
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
        card.dataset.xlcControl = `settings.import.policy.${policy}`;
        card.addEventListener("click", () => void run(policy));
        policyCards.push(card);
        policyList.appendChild(card);
    }
    wrap.appendChild(policyList);
    wrap.appendChild(receiptHint);
    body.appendChild(wrap);
}
