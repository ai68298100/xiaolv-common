import {Dialog} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {ITEM_TYPES, ItemType} from "../model/item";
import {buildDiscoveryTagFacets, matchesDiscoveryTag} from "../model/discovery-facets";
import type {
    AddCandidateResult,
    DiscoveryCandidate,
    DiscoveryCandidateStatus,
    DiscoveryPreview,
    DiscoveryProgress,
    DiscoveryReceipt,
    DiscoveryService,
    DiscoverySessionView,
    UndoBatchResult,
} from "../service/discovery";

type TFn = (key: string, ...args: string[]) => string;
type DiscoveryScope = "document" | "notebook" | "tree" | "selected-notebook" | "all-notebooks";
type DiscoveryApi = Omit<Pick<DiscoveryService, "discoverCurrentDocument" | "previewCandidate" | "addCandidate" | "closeSession">, "addCandidate">
    & Pick<DiscoveryService, "beginAddBatch" | "finishAddBatch" | "undoBatch" | "requestScanStop">
    & {addCandidate: (sessionId: string, candidateKey: string, options?: {allowSameContent?: boolean; batchId?: string; category?: string; mode?: "copy" | "reference"}) => Promise<DiscoveryReceipt<AddCandidateResult>>}
    & {discoverCurrentNotebook?: (docId: string, options?: {onProgress?: (progress: DiscoveryProgress) => void}) => Promise<DiscoveryReceipt<DiscoverySessionView>>}
    & {discoverTree?: (docId: string, options?: {onProgress?: (progress: DiscoveryProgress) => void}) => Promise<DiscoveryReceipt<DiscoverySessionView>>}
    & {discoverNotebook?: (notebookId: string, options?: {onProgress?: (progress: DiscoveryProgress) => void}) => Promise<DiscoveryReceipt<DiscoverySessionView>>}
    & {discoverAllNotebooks?: (options?: {onProgress?: (progress: DiscoveryProgress) => void; confirmed?: boolean}) => Promise<DiscoveryReceipt<DiscoverySessionView>>};

interface DiscoveryNotebook {id: string; name: string}
interface DiscoveryDoc {id: string; hPath: string; box: string; name: string}

export interface DiscoveryDialogDeps {
    t: TFn;
    service: DiscoveryApi;
    /** Optional host feedback. The dialog always keeps an in-dialog receipt as well. */
    notify?: (kind: "info" | "error", message: string) => void;
    /** Called after a candidate is copied into the configured library. */
    onAdded?: (itemId: string, title: string) => void;
    listNotebooks?: () => Promise<DiscoveryNotebook[]>;
    searchDocs?: (keyword: string) => Promise<DiscoveryDoc[]>;
}

export interface DiscoveryDialogOptions {
    /** The document whose top-level blocks should be scanned. */
    docId: string;
    /** Display path captured by the entry point; the service remains the source of truth. */
    sourcePath?: string;
    /** Optional title override for host-specific entry points. */
    title?: string;
    /** Initial scan scope; notebook scope is offered only when supported by the service. */
    scope?: "document" | "notebook" | "tree";
    /** Initial root for a document-tree entry point; later tree searches still require explicit selection. */
    initialTreeRootId?: string;
    /** Optional saved-view preset. The dialog still revalidates the target before scanning. */
    initialTag?: string;
    autoSelectFiltered?: boolean;
    referenceOnly?: boolean;
}

export interface DiscoveryDialogController {
    open(): void;
    close(force?: boolean): boolean;
}

const FALLBACKS: Record<string, string> = {
    discoveryTitle: "从当前文档发现",
    discoveryTitleNotebook: "从当前笔记本发现",
    discoveryTitleGeneral: "发现已有内容",
    discoveryTitleTree: "从指定文档树发现常用语",
    discoveryScope: "扫描范围",
    discoveryStartDocument: "入口文档",
    discoveryScopeDocument: "当前文档",
    discoveryScopeNotebook: "当前笔记本",
    discoveryScopeTree: "指定文档树",
    discoveryScopeSelectedNotebook: "指定笔记本",
    discoveryScopeAllNotebooks: "全部笔记本（高级）",
    discoveryScopeUnavailable: "当前环境暂不可用此扫描范围",
    discoveryScopeTreeHint: "扫描所选根文档及其下级文档顶层块；收录方式可选引用或独立副本。",
    discoveryScopeSelectedNotebookHint: "扫描所选笔记本的文档顶层块；收录方式可选引用或独立副本。",
    discoveryScopeLockedForUndo: "当前仍有可撤销的收录批次；请先撤销或关闭本窗口，再更换扫描范围。",
    discoverySelectTree: "输入关键词查找文档树根文档",
    discoverySelectTreeRoot: "请选择文档树根文档",
    discoveryNoDocsFound: "没有找到匹配的文档",
    discoveryNoNotebooks: "当前没有可扫描的笔记本",
    discoverySelectNotebook: "选择要扫描的笔记本",
    discoverySearch: "搜索",
    discoverySearchingDocs: "正在搜索文档…",
    discoveryNotebookLoading: "正在读取笔记本列表…",
    discoveryRetryNotebooks: "重试加载笔记本",
    discoveryAllWarning: "上限：%s 个笔记本、%s 篇文档、%s 层目录、%s 个块、%s 个候选、单块 %s 字符、候选文本累计 %s 字符、%s 秒。文档和块按顺序读取；路径查询与重复核验最多 4 路并发。只读扫描，不会自动收录。",
    discoveryConfirmAll: "我确认开始扫描所有可搜索笔记本",
    discoveryTargetRequired: "请先选择或确认扫描目标",
    discoverySearchFailed: "文档搜索失败：%s",
    discoveryNotebookLoadFailed: "笔记本列表加载失败：%s",
    discoveryErrors: "扫描或内容库重复核验失败 %s 处，已保留其他结果",
    discoverySkippedLong: "跳过超长块 %s 个",
    discoveryLimitScope: "范围/深度上限",
    discoveryLimitNotebooks: "笔记本数上限",
    discoveryLimitDocuments: "文档数上限",
    discoveryLimitBlocks: "块数上限",
    discoveryLimitCandidates: "候选数上限",
    discoveryLimitCharacters: "文本字符上限",
    discoveryLimitTime: "扫描时间上限",
    discoveryResultsPage: "第 %s / %s 页",
    discoveryPreviousPage: "上一页",
    discoveryNextPage: "下一页",
    discoveryAddAll: "加入本页选中项",
    discoveryDefaultCategory: "默认分类",
    discoveryUnsortedCategory: "待整理",
    discoveryDefaultCategoryHint: "新收录项默认使用此分类；预览中可单独修改当前条目。",
    discoveryCandidateCategory: "本条分类",
    discoveryUseDefaultCategory: "恢复默认",
    discoveryRescanKeepsUndo: "请先撤销或关闭本批次，再重新扫描。",
    discoveryCloseKeepsUndo: "本次发现仍有可撤销的收录批次。关闭会丢失撤销入口；仍要关闭吗？",
    discoveryScopeHintDocument: "只读取当前文档的顶层块；收录前可预览，原文不会被修改。",
    discoveryScopeHintNotebook: "扫描当前文档所属笔记本的顶层块；候选会显示各自来源，收录方式可选引用或独立副本。",
    discoveryNotebookUnavailable: "当前版本暂不支持笔记本范围发现",
    discoveryScanningDocument: "正在扫描当前文档…",
    discoveryScanningNotebook: "正在扫描当前笔记本…",
    discoveryScanningTree: "正在扫描所选文档树…",
    discoveryScanningSelectedNotebook: "正在扫描所选笔记本…",
    discoveryScanningAllNotebooks: "正在扫描全部笔记本…",
    discoveryNotebookEnumerating: "正在查找文档，已发现 %s 个…",
    discoveryNotebookProgress: "扫描文档 %s / %s，已读取 %s 个块…",
    discoveryScannedNotebooks: "至少有一次目录读取成功的笔记本 %s 个",
    discoveryCancelPending: "已请求停止；当前已发出的内核请求结束后不再启动后续请求，并保留已完成部分供你选择收录。",
    discoveryStopping: "正在等待当前请求结束…",
    discoveryStopped: "已停止扫描，保留 %s 条候选；没有自动收录，待确认重复状态的候选会在收录前复查。",
    discoveryStoppedNoResults: "已停止。专用库边界尚未核实，因此没有继续扫描或保留候选；可以重新开始。",
    discoveryUndoBatch: "撤销本批新增",
    discoveryUndoing: "正在安全检查并撤销…",
    discoveryUndoReceiptTitle: "撤销回执",
    discoveryUndoDone: "已撤销新增 %s 条；已跳过 %s 条，失败 %s 条。重新扫描可刷新候选状态。",
    discoveryUndoAlreadyDone: "这批新增已撤销。重新扫描可刷新候选状态。",
    discoveryUndoSkipNotFound: "条目已删除",
    discoveryUndoSkipIdentityChanged: "条目身份或内容库范围已变化",
    discoveryUndoSkipEdited: "条目已被编辑",
    discoveryUndoSkipLibraryUnverified: "内容库索引不完整，无法安全核对",
    discoveryUndoDeleteFailed: "删除失败：%s",
    discoveryScanning: "正在扫描当前文档…",
    discoveryScanned: "已扫描 %s 个块，发现 %s 个候选",
    discoverySkipped: "跳过空块 %s 个",
    discoveryTruncated: "已达到扫描上限，结果可能不完整",
    discoveryCancelScan: "停止扫描",
    discoveryRetry: "重新扫描",
    discoveryFilter: "筛选",
    discoveryFilterAll: "全部状态",
    discoveryFilterCandidate: "待收录",
    discoveryFilterUnverified: "待确认重复",
    discoveryFilterSameContent: "内容相同",
    discoveryFilterAlready: "已在库中",
    discoveryFilterAdded: "已收录",
    discoveryTypeAll: "全部类型",
    discoverySearchPlaceholder: "筛选标题、摘要或来源",
    discoveryNoCandidates: "没有符合条件的候选",
    discoveryEmptyScope: "此范围没有发现可收录的候选。",
    discoveryScanningCandidates: "正在扫描，候选完成后会显示在这里。",
    discoveryAwaitingScan: "选择扫描范围和目标后，开始扫描即可查看候选。",
    discoveryScanIncompleteEmpty: "扫描未完成，当前没有候选结果；可以重试。",
    discoveryScanStoppedEmpty: "扫描已停止，尚未保留候选；可以重新扫描。",
    discoveryClearFilters: "清除筛选",
    discoveryPreviewTitle: "候选预览",
    discoveryPreviewEmpty: "选择一条候选后查看正文；收录前会再次校验来源。",
    discoveryPreviewLoading: "正在读取候选正文…",
    discoveryPreviewRetry: "重新读取预览",
    discoveryPreviewUnavailable: "候选预览未能读取，请重试；原笔记未修改。",
    discoverySourceChanged: "来源内容或所在范围已变化，请重新读取预览后再收录；必要时重新扫描。",
    discoverySourceUnavailable: "来源或扫描目标已不可用，请检查原笔记后重新扫描。",
    discoveryContentTooLong: "来源正文超过单条内容上限，请缩短内容后重新读取预览。",
    discoveryLibraryCheckIncomplete: "内容库重复核验未完成，请检查内容库状态后重试。",
    discoveryOperationConflict: "当前操作状态发生变化，请等待正在进行的操作结束后重试。",
    discoveryInvalidInput: "扫描目标或候选状态无效，请重新选择目标或重新扫描。",
    discoveryKernelError: "思源请求未完成，请检查连接后重试。",
    discoveryUndoAvailable: "本次收录仍可撤销；关闭窗口后将失去这里的撤销入口。",
    discoveryAddingSingle: "正在校验来源并加入常用库…",
    discoveryAddingBatch: "正在收录选中项：%s / %s",
    discoveryAdd: "加入常用库",
    discoveryAddSelected: "加入选中项",
    discoverySelectFiltered: "选中当前筛选（%s）",
    discoveryClearFilteredSelection: "清除当前筛选选择",
    discoveryForceSameContent: "批量允许收录内容相同的候选",
    discoverySelected: "已选 %s 项",
    discoveryClose: "关闭",
    discoveryClosePendingWrites: "有收录正在写入内容库。请等待收录回执，必要时先撤销本批新增，再关闭此窗口。",
    discoveryReceiptTitle: "收录回执",
    discoveryReceiptAdded: "已加入常用库：%s；原笔记未修改。",
    discoveryReceiptSameContent: "内容与「%s」相同，未自动收录；如仍要收录，请明确确认。",
    discoveryReceiptAlready: "已在常用库中：%s",
    discoveryReceiptFailed: "收录失败：%s",
    discoveryReceiptBatch: "批量收录完成：新增 %s，跳过 %s，失败 %s",
    discoverySessionExpired: "发现会话已失效，候选正文已释放，请重新扫描。",
    discoveryScanFailed: "扫描失败：%s",
    discoveryUnknown: "未知错误",
    discoveryStatusCandidate: "待收录",
    discoveryStatusAlready: "已在库中",
    discoveryStatusSameContent: "内容相同",
    discoveryStatusUnverified: "重复待确认",
    discoveryStatusAdded: "已收录",
    discoveryType: "类型",
    discoverySource: "来源",
    discoveryStats: "统计",
    discoveryNotConfigured: "尚未配置常用内容库，无法收录候选。",
};

const STATUS_KEYS: Array<DiscoveryCandidateStatus | "all"> = [
    "all", "candidate", "library-unverified", "same-content", "already-in-library", "added",
];

const typeLabel = (t: TFn, itemType: ItemType): string => {
    const value = t(`type.${itemType}`);
    return value && value !== `type.${itemType}` ? value : itemType;
};

function replaceArgs(value: string, args: string[]): string {
    let index = 0;
    return value.replace(/%s/g, () => args[index++] ?? "");
}

/**
 * Current-document discovery UI. It intentionally owns no persistence: the service session
 * is the only source of candidate state and is closed with this dialog.
 */
export class DiscoveryDialog implements DiscoveryDialogController {
    private dialog: Dialog | null = null;
    private root: HTMLElement | null = null;
    private list: HTMLElement | null = null;
    private preview: HTMLElement | null = null;
    private status: HTMLElement | null = null;
    private receipt: HTMLElement | null = null;
    private closeButton: HTMLButtonElement | null = null;
    private addSelectedButton: HTMLButtonElement | null = null;
    private selectedLabel: HTMLElement | null = null;
    private scanButton: HTMLButtonElement | null = null;
    private scopeSelect: HTMLSelectElement | null = null;
    private scopeHint: HTMLElement | null = null;
    private scopeTarget: HTMLElement | null = null;
    private targetDocId = "";
    private initialTreeRootId = "";
    private targetNotebookId = "";
    private allConfirmed = false;
    private scopeLoadSeq = 0;
    private page = 0;
    private readonly pageSize = 100;
    private undoableBatchIds = new Set<string>();
    private filterStatus: HTMLSelectElement | null = null;
    private filterType: HTMLSelectElement | null = null;
    private filterText: HTMLInputElement | null = null;
    private filterTag: HTMLInputElement | null = null;
    private tagFacets: HTMLElement | null = null;
    private selectFilteredButton: HTMLButtonElement | null = null;
    private addMode: HTMLSelectElement | null = null;
    private forceSameContent: HTMLInputElement | null = null;
    private defaultCategoryInput: HTMLInputElement | null = null;
    private candidateCategoryInput: HTMLInputElement | null = null;
    private resetCategoryButton: HTMLButtonElement | null = null;

    private session: DiscoverySessionView | null = null;
    private sessionId: string | null = null;
    private candidates = new Map<string, DiscoveryCandidate>();
    private selected = new Set<string>();
    private previewed = new Set<string>();
    private categoryOverrides = new Map<string, string>();
    private activeKey: string | null = null;
    private scanSeq = 0;
    private previewSeq = 0;
    private actionBusy = false;
    private closed = false;
    private scope: DiscoveryScope;
    private cancelRequested = false;
    private scanState: "idle" | "scanning" | "ready" | "failed" | "cancelled" = "idle";
    private filter: {status: DiscoveryCandidateStatus | "all"; type: ItemType | "all"; text: string; tag: string} = {
        status: "all", type: "all", text: "", tag: "",
    };

    constructor(private readonly deps: DiscoveryDialogDeps, private readonly options: DiscoveryDialogOptions) {
        this.scope = options.scope === "tree" && deps.service.discoverTree && deps.searchDocs
            ? "tree"
            : options.scope === "notebook" && deps.service.discoverCurrentNotebook ? "notebook" : "document";
        if (this.scope === "tree" && options.initialTreeRootId) {
            this.targetDocId = options.initialTreeRootId;
            this.initialTreeRootId = options.initialTreeRootId;
        }
        if (typeof options.initialTag === "string") {
            this.filter.tag = options.initialTag.trim().slice(0, 64).toLocaleLowerCase();
        }
    }

    private titleKey(): string {
        return this.scope === "notebook" ? "discoveryTitleNotebook"
            : this.scope === "tree" ? "discoveryTitleTree"
                : this.scope === "document" ? "discoveryTitle" : "discoveryTitleGeneral";
    }

    private tx(key: string, ...args: string[]): string {
        const result = this.deps.t(key, ...args);
        const value = result && result !== key ? result : FALLBACKS[key] ?? key;
        return replaceArgs(value, args);
    }

    open(): void {
        if (this.dialog) return;
        this.closed = false;
        const dialog = new Dialog({
            title: this.options.title ?? this.tx(this.titleKey()),
            content: "",
            width: "min(1040px, 94vw)",
            height: "min(840px, 92vh)",
            disableClose: true,
            destroyCallback: () => {
                if (this.closed) return;
                this.closed = true;
                const closed = this.deps.service.closeSession(this.sessionId ?? undefined);
                if (!closed.ok) {
                    this.deps.notify?.("error", closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed));
                }
                this.session = null;
                this.sessionId = null;
                this.dialog = null;
                this.root = null;
                this.deps.notify?.("info", this.tx("discoveryClose"));
            },
        });
        this.dialog = dialog;
        dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-form-host", "xlc-discovery-host");
        const body = getDialogBody(dialog.element);
        if (!body) return;
        body.innerHTML = "";
        this.root = document.createElement("div");
        this.root.className = "xlc-form xlc-discovery";
        this.root.dataset.xlcDiscovery = "dialog";
        body.appendChild(this.root);
        this.renderShell();
        void this.scan();
    }

    close(force = false): boolean {
        if (!this.dialog) return true;
        if (!force) {
            if (this.undoableBatchIds.size && !window.confirm(this.tx("discoveryCloseKeepsUndo"))) return false;
            const closed = this.deps.service.closeSession(this.sessionId ?? undefined);
            if (!closed.ok) {
                const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed);
                this.setReceipt(message, true);
                this.deps.notify?.("error", message);
                return false;
            }
        }
        this.closed = true;
        this.scanSeq++;
        this.previewSeq++;
        this.session = null;
        this.sessionId = null;
        const dialog = this.dialog;
        this.dialog = null;
        dialog.destroy();
        return true;
    }

    private renderShell(): void {
        const root = this.root;
        if (!root) return;
        const head = document.createElement("div");
        head.className = "xlc-discovery-head";
        const heading = document.createElement("div");
        heading.className = "xlc-discovery-heading";
        const title = document.createElement("h2");
        title.className = "xlc-form-title";
        title.textContent = this.tx(this.titleKey());
        heading.appendChild(title);
        const scopeRow = document.createElement("div");
        scopeRow.className = "xlc-discovery-scope-row";
        const scopeLabel = document.createElement("label");
        scopeLabel.className = "xlc-form-hint";
        scopeLabel.textContent = `${this.tx("discoveryScope")}：`;
        this.scopeSelect = document.createElement("select");
        this.scopeSelect.className = "b3-select xlc-discovery-scope-select";
        this.scopeSelect.dataset.xlcControl = "discovery.scope";
        this.scopeSelect.setAttribute("aria-label", this.tx("discoveryScope"));
        const documentOption = document.createElement("option");
        documentOption.value = "document";
        documentOption.textContent = this.tx("discoveryScopeDocument");
        this.scopeSelect.appendChild(documentOption);
        const notebookOption = document.createElement("option");
        notebookOption.value = "notebook";
        notebookOption.textContent = this.tx("discoveryScopeNotebook");
        notebookOption.disabled = !this.deps.service.discoverCurrentNotebook;
        if (notebookOption.disabled) notebookOption.title = this.tx("discoveryNotebookUnavailable");
        this.scopeSelect.appendChild(notebookOption);
        for (const [value, key, enabled] of [
            ["tree", "discoveryScopeTree", !!this.deps.service.discoverTree && !!this.deps.searchDocs],
            ["selected-notebook", "discoveryScopeSelectedNotebook", !!this.deps.service.discoverNotebook && !!this.deps.listNotebooks],
            ["all-notebooks", "discoveryScopeAllNotebooks", !!this.deps.service.discoverAllNotebooks],
        ] as Array<[DiscoveryScope, string, boolean]>) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = this.tx(key);
            option.disabled = !enabled;
            if (!enabled) option.title = this.tx("discoveryScopeUnavailable");
            this.scopeSelect.appendChild(option);
        }
        this.scopeSelect.value = this.scope;
        this.scopeSelect.addEventListener("change", () => {
            const nextScope = this.scopeSelect?.value as DiscoveryScope;
            if (nextScope === this.scope) return;
            if (this.actionBusy || this.root?.getAttribute("aria-busy") === "true") {
                this.scopeSelect!.value = this.scope;
                return;
            }
            if (this.undoableBatchIds.size) {
                this.scopeSelect!.value = this.scope;
                this.setStatus(this.tx("discoveryRescanKeepsUndo"));
                return;
            }
            if (this.sessionId) {
                const closed = this.deps.service.closeSession(this.sessionId);
                if (!closed.ok) {
                    this.scopeSelect!.value = this.scope;
                    const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed);
                    this.setReceipt(message, true);
                    return;
                }
            }
            this.previewSeq++;
            this.session = null;
            this.sessionId = null;
            this.candidates.clear();
            this.selected.clear();
            this.previewed.clear();
            this.categoryOverrides.clear();
            this.activeKey = null;
            this.page = 0;
            this.scanState = "idle";
            this.scope = nextScope;
            title.textContent = this.tx(this.titleKey());
            this.list?.setAttribute("aria-label", this.tx(this.titleKey()));
            if (this.scopeHint) this.scopeHint.textContent = this.scopeHintText();
            this.targetDocId = "";
            this.targetNotebookId = "";
            this.allConfirmed = false;
            this.syncCandidateCategory();
            this.setReceipt("");
            if (this.preview) this.preview.textContent = this.tx("discoveryPreviewEmpty");
            this.renderList();
            this.renderScopeTarget();
            if (this.scope === "document" || this.scope === "notebook") void this.scan();
            else if (this.scope !== "selected-notebook") this.setStatus(this.tx("discoveryTargetRequired"));
            this.updateSelectionState();
        });
        scopeLabel.appendChild(this.scopeSelect);
        scopeRow.appendChild(scopeLabel);
        this.scopeTarget = document.createElement("div");
        this.scopeTarget.className = "xlc-discovery-scope-target";
        scopeRow.appendChild(this.scopeTarget);
        const sourcePath = document.createElement("span");
        sourcePath.className = "xlc-form-hint xlc-discovery-scope";
        sourcePath.textContent = `${this.tx("discoveryStartDocument")}：${this.options.sourcePath || this.options.docId}`;
        scopeRow.appendChild(sourcePath);
        heading.appendChild(scopeRow);
        head.appendChild(heading);
        this.closeButton = document.createElement("button");
        this.closeButton.type = "button";
        this.closeButton.className = "b3-button xlc-btn-ghost";
        this.closeButton.textContent = this.tx("discoveryClose");
        this.closeButton.dataset.xlcDiscoveryAction = "close";
        this.closeButton.addEventListener("click", () => this.close());
        head.appendChild(this.closeButton);
        root.appendChild(head);

        const notice = document.createElement("div");
        notice.className = "xlc-discovery-notice xlc-form-hint";
        notice.setAttribute("role", "note");
        this.scopeHint = notice;
        notice.textContent = this.scopeHintText();
        root.appendChild(notice);
        this.renderScopeTarget();

        const statusRow = document.createElement("div");
        statusRow.className = "xlc-discovery-status-row";
        this.status = document.createElement("div");
        this.status.className = "xlc-status";
        this.status.setAttribute("role", "status");
        this.status.setAttribute("aria-live", "polite");
        statusRow.appendChild(this.status);
        this.scanButton = document.createElement("button");
        this.scanButton.type = "button";
        this.scanButton.className = "b3-button xlc-btn-ghost";
        this.scanButton.textContent = this.tx("discoveryCancelScan");
        this.scanButton.dataset.xlcDiscoveryAction = "cancel-scan";
        this.scanButton.addEventListener("click", () => {
            if (this.scanState === "scanning") this.cancelScan();
            else void this.scan();
        });
        statusRow.appendChild(this.scanButton);
        root.appendChild(statusRow);

        const filters = document.createElement("div");
        filters.className = "xlc-discovery-filters";
        const filterLabel = document.createElement("span");
        filterLabel.className = "xlc-form-label";
        filterLabel.textContent = this.tx("discoveryFilter");
        filters.appendChild(filterLabel);
        this.filterStatus = document.createElement("select");
        this.filterStatus.className = "b3-select";
        this.filterStatus.dataset.xlcControl = "discovery.filter.status";
        this.filterStatus.setAttribute("aria-label", this.tx("discoveryFilter"));
        for (const status of STATUS_KEYS) {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status === "all" ? this.tx("discoveryFilterAll") : this.statusLabel(status);
            this.filterStatus.appendChild(option);
        }
        this.filterStatus.addEventListener("change", () => {
            this.filter.status = this.filterStatus?.value as DiscoveryCandidateStatus | "all";
            this.page = 0;
            this.renderList();
        });
        filters.appendChild(this.filterStatus);
        this.filterType = document.createElement("select");
        this.filterType.className = "b3-select";
        this.filterType.dataset.xlcControl = "discovery.filter.type";
        this.filterType.setAttribute("aria-label", this.tx("discoveryType"));
        const typeAll = document.createElement("option");
        typeAll.value = "all";
        typeAll.textContent = this.tx("discoveryTypeAll");
        this.filterType.appendChild(typeAll);
        for (const itemType of ITEM_TYPES) {
            const option = document.createElement("option");
            option.value = itemType;
            option.textContent = typeLabel(this.deps.t, itemType);
            this.filterType.appendChild(option);
        }
        this.filterType.addEventListener("change", () => {
            this.filter.type = this.filterType?.value as ItemType | "all";
            this.page = 0;
            this.renderList();
        });
        filters.appendChild(this.filterType);
        this.filterText = document.createElement("input");
        this.filterText.className = "b3-text-field";
        this.filterText.dataset.xlcControl = "discovery.filter.text";
        this.filterText.placeholder = this.tx("discoverySearchPlaceholder");
        this.filterText.setAttribute("aria-label", this.tx("discoverySearchPlaceholder"));
        this.filterText.addEventListener("input", () => {
            this.filter.text = this.filterText?.value.trim().toLocaleLowerCase() ?? "";
            this.page = 0;
            this.renderList();
        });
        filters.appendChild(this.filterText);
        this.filterTag = document.createElement("input");
        this.filterTag.className = "b3-text-field";
        this.filterTag.dataset.xlcControl = "discovery.filter.tag";
        this.filterTag.placeholder = this.tx("discoveryTagFilterPlaceholder");
        this.filterTag.setAttribute("aria-label", this.tx("discoveryTagFilterPlaceholder"));
        this.filterTag.addEventListener("input", () => {
            this.filter.tag = this.filterTag?.value.trim().toLocaleLowerCase() ?? "";
            this.page = 0;
            this.renderList();
        });
        if (this.filter.tag) this.filterTag.value = this.options.initialTag?.trim().slice(0, 64) ?? "";
        filters.appendChild(this.filterTag);
        this.tagFacets = document.createElement("div");
        this.tagFacets.className = "xlc-discovery-tag-facets";
        this.tagFacets.setAttribute("role", "list");
        this.tagFacets.setAttribute("aria-label", this.tx("discoveryTagFacets"));
        filters.appendChild(this.tagFacets);
        this.selectFilteredButton = document.createElement("button");
        this.selectFilteredButton.type = "button";
        this.selectFilteredButton.className = "b3-button xlc-btn-ghost";
        this.selectFilteredButton.dataset.xlcDiscoveryAction = "select-filtered";
        this.selectFilteredButton.setAttribute("aria-pressed", "false");
        this.selectFilteredButton.addEventListener("click", () => this.toggleFilteredSelection());
        filters.appendChild(this.selectFilteredButton);
        root.appendChild(filters);

        const modeRow = document.createElement("label");
        modeRow.className = "xlc-form-label xlc-discovery-mode-row";
        const modeLabel = document.createElement("span");
        modeLabel.textContent = this.tx("discoveryAddMode");
        modeRow.appendChild(modeLabel);
        this.addMode = document.createElement("select");
        this.addMode.className = "b3-select";
        this.addMode.dataset.xlcControl = "discovery.add-mode";
        const reference = document.createElement("option");
        reference.value = "reference";
        reference.textContent = this.tx("discoveryAddModeReference");
        const copy = document.createElement("option");
        copy.value = "copy";
        copy.textContent = this.tx("discoveryAddModeCopy");
        this.addMode.append(reference, copy);
        if (this.options.referenceOnly) {
            this.addMode.value = "reference";
            this.addMode.disabled = true;
        }
        modeRow.appendChild(this.addMode);
        const modeHint = document.createElement("span");
        modeHint.className = "xlc-form-hint";
        modeHint.textContent = this.tx("discoveryAddModeHint");
        modeRow.appendChild(modeHint);
        root.appendChild(modeRow);

        const categorySettings = document.createElement("div");
        categorySettings.className = "xlc-discovery-category-settings";
        const defaultCategoryLabel = document.createElement("label");
        defaultCategoryLabel.className = "xlc-form-label";
        defaultCategoryLabel.textContent = this.tx("discoveryDefaultCategory");
        defaultCategoryLabel.htmlFor = "xlc-discovery-default-category";
        this.defaultCategoryInput = document.createElement("input");
        this.defaultCategoryInput.type = "text";
        this.defaultCategoryInput.className = "b3-text-field";
        this.defaultCategoryInput.value = this.tx("discoveryUnsortedCategory");
        this.defaultCategoryInput.maxLength = 64;
        this.defaultCategoryInput.id = "xlc-discovery-default-category";
        this.defaultCategoryInput.dataset.xlcDiscoveryAction = "default-category";
        this.defaultCategoryInput.setAttribute("aria-label", this.tx("discoveryDefaultCategory"));
        this.defaultCategoryInput.addEventListener("input", () => {
            const key = this.activeKey;
            if (key && !this.categoryOverrides.has(key) && this.candidateCategoryInput) {
                this.candidateCategoryInput.value = this.defaultCategoryInput?.value ?? "";
            }
        });
        categorySettings.appendChild(defaultCategoryLabel);
        categorySettings.appendChild(this.defaultCategoryInput);
        const defaultCategoryHint = document.createElement("span");
        defaultCategoryHint.className = "xlc-form-hint";
        defaultCategoryHint.textContent = this.tx("discoveryDefaultCategoryHint");
        categorySettings.appendChild(defaultCategoryHint);
        root.appendChild(categorySettings);

        const content = document.createElement("div");
        content.className = "xlc-discovery-content";
        this.list = document.createElement("div");
        this.list.className = "xlc-discovery-list";
        this.list.setAttribute("role", "region");
        this.list.setAttribute("aria-label", this.tx(this.titleKey()));
        content.appendChild(this.list);
        const pane = document.createElement("section");
        pane.className = "xlc-discovery-preview";
        const paneTitle = document.createElement("h3");
        paneTitle.textContent = this.tx("discoveryPreviewTitle");
        pane.appendChild(paneTitle);
        const candidateCategoryRow = document.createElement("div");
        candidateCategoryRow.className = "xlc-discovery-candidate-category";
        const candidateCategoryLabel = document.createElement("label");
        candidateCategoryLabel.className = "xlc-form-label";
        candidateCategoryLabel.textContent = this.tx("discoveryCandidateCategory");
        candidateCategoryLabel.htmlFor = "xlc-discovery-candidate-category";
        this.candidateCategoryInput = document.createElement("input");
        this.candidateCategoryInput.type = "text";
        this.candidateCategoryInput.className = "b3-text-field";
        this.candidateCategoryInput.disabled = true;
        this.candidateCategoryInput.maxLength = 64;
        this.candidateCategoryInput.id = "xlc-discovery-candidate-category";
        this.candidateCategoryInput.dataset.xlcDiscoveryAction = "candidate-category";
        this.candidateCategoryInput.setAttribute("aria-label", this.tx("discoveryCandidateCategory"));
        this.candidateCategoryInput.addEventListener("input", () => {
            if (!this.activeKey) return;
            this.categoryOverrides.set(this.activeKey, this.candidateCategoryInput?.value ?? "");
            this.updateCategoryResetState();
        });
        candidateCategoryRow.appendChild(candidateCategoryLabel);
        candidateCategoryRow.appendChild(this.candidateCategoryInput);
        this.resetCategoryButton = document.createElement("button");
        this.resetCategoryButton.type = "button";
        this.resetCategoryButton.className = "b3-button xlc-btn-ghost";
        this.resetCategoryButton.textContent = this.tx("discoveryUseDefaultCategory");
        this.resetCategoryButton.dataset.xlcDiscoveryAction = "category-reset";
        this.resetCategoryButton.disabled = true;
        this.resetCategoryButton.addEventListener("click", () => {
            if (!this.activeKey || this.actionBusy) return;
            this.categoryOverrides.delete(this.activeKey);
            this.syncCandidateCategory();
        });
        candidateCategoryRow.appendChild(this.resetCategoryButton);
        pane.appendChild(candidateCategoryRow);
        this.preview = document.createElement("pre");
        this.preview.className = "xlc-discovery-preview-body";
        this.preview.textContent = this.tx("discoveryPreviewEmpty");
        pane.appendChild(this.preview);
        content.appendChild(pane);
        root.appendChild(content);

        const footer = document.createElement("div");
        footer.className = "xlc-discovery-footer";
        this.selectedLabel = document.createElement("span");
        this.selectedLabel.className = "xlc-form-hint";
        footer.appendChild(this.selectedLabel);
        const forceLabel = document.createElement("label");
        forceLabel.className = "xlc-discovery-force";
        this.forceSameContent = document.createElement("input");
        this.forceSameContent.type = "checkbox";
        this.forceSameContent.dataset.xlcControl = "discovery.allow-same-content";
        this.forceSameContent.addEventListener("change", () => this.renderList());
        forceLabel.appendChild(this.forceSameContent);
        const forceText = document.createElement("span");
        forceText.textContent = this.tx("discoveryForceSameContent");
        forceLabel.appendChild(forceText);
        footer.appendChild(forceLabel);
        this.addSelectedButton = document.createElement("button");
        this.addSelectedButton.type = "button";
        this.addSelectedButton.className = "b3-button xlc-btn-primary";
        this.addSelectedButton.textContent = this.tx("discoveryAddSelected");
        this.addSelectedButton.dataset.xlcDiscoveryAction = "add-selected";
        this.addSelectedButton.addEventListener("click", () => void this.addSelected());
        footer.appendChild(this.addSelectedButton);
        root.appendChild(footer);

        this.receipt = document.createElement("div");
        this.receipt.className = "xlc-discovery-receipt";
        this.receipt.setAttribute("role", "status");
        this.receipt.setAttribute("aria-live", "polite");
        this.receipt.setAttribute("aria-atomic", "true");
        this.receipt.style.display = "none";
        root.appendChild(this.receipt);
        this.setScanningState(false);
        this.renderList();
    }

    private statusLabel(status: DiscoveryCandidateStatus): string {
        const key = status === "already-in-library" ? "discoveryStatusAlready"
            : status === "library-unverified" ? "discoveryStatusUnverified"
                : status === "same-content" ? "discoveryStatusSameContent"
                    : status === "added" ? "discoveryStatusAdded" : "discoveryStatusCandidate";
        return this.tx(key);
    }

    private setStatus(message: string, isError = false): void {
        if (!this.status) return;
        this.status.textContent = message;
        this.status.classList.toggle("xlc-status--error", isError);
    }

    private setScanningState(scanning: boolean): void {
        if (!scanning) this.cancelRequested = false;
        this.updateScopeControlState();
    }

    private scopeControlsLocked(): boolean {
        return this.scanState === "scanning" || this.actionBusy || this.undoableBatchIds.size > 0;
    }

    /** Loading/empty states belong to each target control; operation locks only overlay them. */
    private setTargetDisabled(control: HTMLInputElement | HTMLSelectElement | HTMLButtonElement, disabled: boolean): void {
        control.dataset.xlcTargetDisabled = String(disabled);
        this.updateScopeControlState();
    }

    private updateScopeControlState(): void {
        const scanning = this.scanState === "scanning";
        const locked = this.undoableBatchIds.size > 0;
        this.root?.setAttribute("aria-busy", String(scanning || this.actionBusy));
        if (this.scanButton) {
            this.scanButton.disabled = this.actionBusy || (scanning ? this.cancelRequested : locked || this.missingScopeTarget());
            this.scanButton.textContent = scanning
                ? this.tx(this.cancelRequested ? "discoveryStopping" : "discoveryCancelScan")
                : this.tx("discoveryRetry");
            this.scanButton.dataset.xlcDiscoveryAction = scanning ? "cancel-scan" : "retry-scan";
        }
        if (this.filterStatus) this.filterStatus.disabled = scanning || this.actionBusy;
        if (this.filterType) this.filterType.disabled = scanning || this.actionBusy;
        if (this.filterText) this.filterText.disabled = scanning || this.actionBusy;
        if (this.filterTag) this.filterTag.disabled = scanning || this.actionBusy;
        if (this.tagFacets) this.tagFacets.setAttribute("aria-busy", String(scanning || this.actionBusy));
        if (this.addMode) this.addMode.disabled = scanning || this.actionBusy;
        if (this.scopeSelect) {
            this.scopeSelect.disabled = scanning || this.actionBusy || locked;
            this.scopeSelect.title = locked ? this.tx("discoveryScopeLockedForUndo") : "";
        }
        if (this.scopeTarget) this.scopeTarget.querySelectorAll("input, select, button").forEach((control) => {
            (control as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled = scanning || this.actionBusy || locked
                || (control as HTMLElement).dataset.xlcTargetDisabled === "true";
        });
        if (this.forceSameContent) this.forceSameContent.disabled = scanning || this.actionBusy || !this.sessionId;
    }

    private scopeHintText(): string {
        const hint = this.scope === "document" ? this.tx("discoveryScopeHintDocument")
            : this.scope === "notebook" ? this.tx("discoveryScopeHintNotebook")
                : this.scope === "tree" ? this.tx("discoveryScopeTreeHint")
                    : this.scope === "selected-notebook" ? this.tx("discoveryScopeSelectedNotebookHint")
                        : this.tx("discoveryAllWarning", "20", "200", "8", "2,000", "500", "100,000", "2,000,000", "60");
        return this.undoableBatchIds.size ? `${hint} ${this.tx("discoveryScopeLockedForUndo")}` : hint;
    }

    private renderScopeTarget(): void {
        const target = this.scopeTarget;
        if (!target) return;
        this.scopeLoadSeq++;
        target.textContent = "";
        if (this.scope === "tree") {
            const input = document.createElement("input");
            input.type = "search";
            input.className = "b3-text-field";
            input.dataset.xlcControl = "discovery.tree.query";
            input.placeholder = this.tx("discoverySelectTree");
            input.setAttribute("aria-label", this.tx("discoverySelectTree"));
            const search = document.createElement("button");
            search.type = "button";
            search.className = "b3-button xlc-btn-ghost";
            search.dataset.xlcControl = "discovery.tree.search";
            search.textContent = this.tx("discoverySearch");
            const results = document.createElement("select");
            results.className = "b3-select";
            results.dataset.xlcControl = "discovery.tree.result";
            results.setAttribute("aria-label", this.tx("discoverySelectTree"));
            results.addEventListener("change", () => {
                if (this.scopeControlsLocked()) {
                    results.value = this.targetDocId;
                    return;
                }
                this.targetDocId = results.value;
                this.updateScopeControlState();
                if (this.targetDocId) void this.scan();
            });
            if (this.initialTreeRootId) {
                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.textContent = this.tx("discoverySelectTreeRoot");
                results.appendChild(placeholder);
                const root = document.createElement("option");
                root.value = this.initialTreeRootId;
                root.textContent = this.options.sourcePath || this.initialTreeRootId;
                results.appendChild(root);
                results.value = this.initialTreeRootId;
                results.hidden = false;
                this.initialTreeRootId = "";
            }
            input.addEventListener("input", () => {
                if (this.scopeControlsLocked()) return;
                this.targetDocId = "";
                results.textContent = "";
                results.hidden = true;
                this.scopeLoadSeq++;
                this.setTargetDisabled(search, !input.value.trim());
                this.setStatus(this.tx("discoveryTargetRequired"));
            });
            search.addEventListener("click", () => {
                const keyword = input.value.trim();
                if (!keyword || !this.deps.searchDocs || this.scopeControlsLocked()) return;
                this.targetDocId = "";
                results.textContent = "";
                results.hidden = true;
                this.setTargetDisabled(search, true);
                const requestSeq = ++this.scopeLoadSeq;
                this.setStatus(this.tx("discoverySearchingDocs"));
                void this.deps.searchDocs(keyword).then((docs) => {
                    if (requestSeq !== this.scopeLoadSeq || this.closed) return;
                    results.textContent = "";
                    const placeholder = document.createElement("option");
                    placeholder.value = "";
                    placeholder.textContent = this.tx("discoverySelectTreeRoot");
                    results.appendChild(placeholder);
                    for (const doc of docs) {
                        const option = document.createElement("option");
                        option.value = doc.id;
                        option.textContent = doc.hPath || doc.name || doc.id;
                        results.appendChild(option);
                    }
                    results.hidden = docs.length === 0;
                    this.setStatus(docs.length ? this.tx("discoveryTargetRequired") : this.tx("discoveryNoDocsFound"));
                }).catch((error) => {
                    if (requestSeq === this.scopeLoadSeq && !this.closed) this.setStatus(this.tx("discoverySearchFailed", this.errorMessage(error)), true);
                }).finally(() => {
                    if (requestSeq === this.scopeLoadSeq && !this.closed) this.setTargetDisabled(search, !input.value.trim());
                });
            });
            results.hidden = !this.targetDocId;
            target.append(input, search, results);
            this.setTargetDisabled(search, true);
            return;
        }
        if (this.scope === "selected-notebook") {
            const select = document.createElement("select");
            select.className = "b3-select";
            select.dataset.xlcControl = "discovery.notebook.select";
            select.setAttribute("aria-label", this.tx("discoverySelectNotebook"));
            select.dataset.xlcTargetDisabled = "true";
            select.disabled = true;
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = this.tx("discoverySelectNotebook");
            select.appendChild(placeholder);
            if (!this.deps.listNotebooks) return;
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "b3-button xlc-btn-ghost xlc-discovery-retry-notebooks";
            retry.textContent = this.tx("discoveryRetryNotebooks");
            retry.dataset.xlcDiscoveryAction = "retry-notebooks";
            retry.hidden = true;
            target.append(select, retry);
            select.addEventListener("change", () => {
                if (this.scopeControlsLocked()) {
                    select.value = this.targetNotebookId;
                    return;
                }
                this.targetNotebookId = select.value;
                this.updateScopeControlState();
                if (this.targetNotebookId) void this.scan();
            });
            const loadNotebooks = async (): Promise<void> => {
                if (this.scopeControlsLocked()) return;
                const requestSeq = ++this.scopeLoadSeq;
                this.targetNotebookId = "";
                this.setTargetDisabled(select, true);
                select.textContent = "";
                const pending = document.createElement("option");
                pending.value = "";
                pending.textContent = this.tx("discoverySelectNotebook");
                select.appendChild(pending);
                retry.hidden = true;
                this.setTargetDisabled(retry, true);
                this.setStatus(this.tx("discoveryNotebookLoading"));
                try {
                    const notebooks = await this.deps.listNotebooks?.();
                    if (requestSeq !== this.scopeLoadSeq || this.closed || !notebooks) return;
                    for (const notebook of notebooks) {
                        const option = document.createElement("option");
                        option.value = notebook.id;
                        option.textContent = notebook.name;
                        select.appendChild(option);
                    }
                    this.setTargetDisabled(select, notebooks.length === 0);
                    retry.hidden = notebooks.length > 0;
                    this.setStatus(notebooks.length ? this.tx("discoveryTargetRequired") : this.tx("discoveryNoNotebooks"));
                } catch (error) {
                    if (requestSeq !== this.scopeLoadSeq || this.closed) return;
                    this.setStatus(this.tx("discoveryNotebookLoadFailed", this.errorMessage(error)), true);
                    retry.hidden = false;
                } finally {
                    if (requestSeq === this.scopeLoadSeq && !this.closed) this.setTargetDisabled(retry, false);
                }
            };
            retry.addEventListener("click", () => void loadNotebooks());
            void loadNotebooks();
            return;
        }
        if (this.scope === "all-notebooks") {
            const label = document.createElement("label");
            label.className = "xlc-discovery-all-confirm";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.xlcControl = "discovery.all-notebooks.confirm";
            const text = document.createElement("span");
            text.textContent = this.tx("discoveryConfirmAll");
            checkbox.addEventListener("change", () => {
                if (this.scopeControlsLocked()) {
                    checkbox.checked = this.allConfirmed;
                    return;
                }
                this.allConfirmed = checkbox.checked;
                this.updateScopeControlState();
            });
            label.append(checkbox, text);
            target.appendChild(label);
            this.updateScopeControlState();
        }
    }

    private async scan(): Promise<void> {
        if (this.actionBusy) return;
        if (this.undoableBatchIds.size) {
            this.setReceipt(this.tx("discoveryRescanKeepsUndo"), true, Array.from(this.undoableBatchIds));
            return;
        }
        if ((this.scope === "tree" && !this.targetDocId)
            || (this.scope === "selected-notebook" && !this.targetNotebookId)
            || (this.scope === "all-notebooks" && !this.allConfirmed)) return;
        this.cancelRequested = false;
        const seq = ++this.scanSeq;
        if (this.sessionId) {
            const closed = this.deps.service.closeSession(this.sessionId);
            if (!closed.ok) {
                const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed);
                this.setReceipt(message, true);
                this.deps.notify?.("error", message);
                return;
            }
        }
        this.scanState = "scanning";
        this.session = null;
        this.sessionId = null;
        this.candidates.clear();
        this.selected.clear();
        this.previewed.clear();
        this.categoryOverrides.clear();
        this.activeKey = null;
        this.syncCandidateCategory();
        this.setScanningState(true);
        const scanningKey = this.scope === "document" ? "discoveryScanningDocument"
            : this.scope === "notebook" ? "discoveryScanningNotebook"
                : this.scope === "tree" ? "discoveryScanningTree"
                    : this.scope === "selected-notebook" ? "discoveryScanningSelectedNotebook"
                        : "discoveryScanningAllNotebooks";
        this.setStatus(this.tx(scanningKey));
        this.setReceipt("");
        if (this.preview) this.preview.textContent = this.tx("discoveryPreviewEmpty");
        this.renderList();
        let result: DiscoveryReceipt<DiscoverySessionView>;
        try {
            const progress = {
                    onProgress: (progress: DiscoveryProgress) => {
                        if (this.closed || seq !== this.scanSeq) return;
                        if (progress.phase === "enumerating") {
                            this.setStatus(this.tx("discoveryNotebookEnumerating", String(progress.discoveredDocs)));
                            return;
                        }
                        const total = typeof progress.totalDocs === "number" ? String(progress.totalDocs) : "…";
                        this.setStatus(this.tx("discoveryNotebookProgress", String(progress.scannedDocs), total, String(progress.scannedBlocks)));
                    },
                };
            if (this.scope === "notebook" && this.deps.service.discoverCurrentNotebook) {
                result = await this.deps.service.discoverCurrentNotebook(this.options.docId, progress);
            } else if (this.scope === "tree" && this.deps.service.discoverTree) {
                result = await this.deps.service.discoverTree(this.targetDocId, progress);
            } else if (this.scope === "selected-notebook" && this.deps.service.discoverNotebook) {
                result = await this.deps.service.discoverNotebook(this.targetNotebookId, progress);
            } else if (this.scope === "all-notebooks" && this.deps.service.discoverAllNotebooks) {
                result = await this.deps.service.discoverAllNotebooks({...progress, confirmed: this.allConfirmed});
            } else {
                result = await this.deps.service.discoverCurrentDocument(this.options.docId);
            }
        } catch (error) {
            result = {ok: false, reason: "kernel-error", message: error instanceof Error ? error.message : String(error)};
        }
        if (this.closed) return;
        if (seq !== this.scanSeq) return;
        if (!result.ok && result.reason === "cancelled") {
            const stoppedByUser = this.cancelRequested;
            this.scanState = "cancelled";
            this.setScanningState(false);
            if (stoppedByUser) {
                const message = this.tx("discoveryStoppedNoResults");
                this.setStatus(message);
                this.showRetryReceipt(message);
            } else {
                this.setStatus(this.tx("discoveryRetry"));
                this.showRetryReceipt(this.tx("discoveryRetry"));
            }
            this.renderList();
            return;
        }
        if (!result.ok) {
            this.scanState = "failed";
            this.setScanningState(false);
            const message = this.tx("discoveryScanFailed", this.failureMessage(result));
            this.setStatus(message, true);
            this.showRetryReceipt(message);
            this.renderList();
            return;
        }
        this.session = result.data;
        this.sessionId = result.data.id;
        this.candidates = new Map(result.data.candidates.map((candidate) => [candidate.key, candidate]));
        this.page = 0;
        this.scanState = "ready";
        this.setScanningState(false);
        const suffix = result.data.truncated && !result.data.stopped ? ` · ${this.tx("discoveryTruncated")}` : "";
        const stoppedSuffix = result.data.stopped
            ? ` · ${this.tx("discoveryStopped", String(result.data.candidates.length))}` : "";
        const scannedDocs = (result.data as DiscoverySessionView & {scannedDocs?: number}).scannedDocs;
        const docsSuffix = this.scope !== "document" && typeof scannedDocs === "number"
            ? ` · ${this.tx("discoveryScannedDocs", String(scannedDocs))}` : "";
        const scannedNotebooks = (result.data as DiscoverySessionView & {scannedNotebooks?: number}).scannedNotebooks;
        const notebooksSuffix = this.scope === "all-notebooks" && typeof scannedNotebooks === "number"
            ? ` · ${this.tx("discoveryScannedNotebooks", String(scannedNotebooks))}` : "";
        const skippedLong = result.data.skippedLong ? ` · ${this.tx("discoverySkippedLong", String(result.data.skippedLong))}` : "";
        const errorSuffix = result.data.errors.length ? ` · ${this.tx("discoveryErrors", String(result.data.errors.length))}` : "";
        const limitKeys: Record<string, string> = {
            "scope-document-depth": "discoveryLimitScope",
            notebooks: "discoveryLimitNotebooks",
            documents: "discoveryLimitDocuments",
            blocks: "discoveryLimitBlocks",
            candidates: "discoveryLimitCandidates",
            characters: "discoveryLimitCharacters",
            time: "discoveryLimitTime",
        };
        const reasons = result.data.truncationReasons.filter((reason) => reason !== "cancelled").length
            ? ` · ${result.data.truncationReasons.filter((reason) => reason !== "cancelled").map((reason) => this.tx(limitKeys[reason] ?? "discoveryTruncated")).join("、")}` : "";
        this.setStatus(`${this.tx("discoveryScanned", String(result.data.scannedBlocks), String(result.data.candidates.length))}${docsSuffix}${notebooksSuffix} · ${this.tx("discoverySkipped", String(result.data.skippedEmpty))}${skippedLong}${suffix}${reasons}${stoppedSuffix}${errorSuffix}`);
        if (result.data.errors.length) this.setReceipt(result.data.errors.map((error) => `${error.sourcePath || this.tx("discoveryScope")}：${this.errorMessage(error.message)}`).join("\n"), true);
        this.renderList();
        if (this.options.autoSelectFiltered) {
            const eligible = Array.from(this.candidates.values()).filter((candidate) => this.canAdd(candidate) && this.matches(candidate));
            for (const candidate of eligible) this.selected.add(candidate.key);
            this.updateSelectionState();
        }
    }

    private missingScopeTarget(): boolean {
        return (this.scope === "tree" && !this.targetDocId)
            || (this.scope === "selected-notebook" && !this.targetNotebookId)
            || (this.scope === "all-notebooks" && !this.allConfirmed);
    }

    private cancelScan(): void {
        if (this.cancelRequested || !this.deps.service.requestScanStop()) return;
        this.cancelRequested = true;
        this.setScanningState(true);
        this.setStatus(this.tx("discoveryCancelPending"));
    }

    private showRetryReceipt(message = this.tx("discoverySessionExpired")): void {
        if (!this.receipt || !this.scanButton) return;
        this.receipt.style.display = "block";
        this.receipt.textContent = "";
        const text = document.createElement("span");
        text.textContent = message;
        this.receipt.appendChild(text);
        this.updateScopeControlState();
    }

    private matches(candidate: DiscoveryCandidate): boolean {
        if (this.filter.status !== "all" && candidate.status !== this.filter.status) return false;
        if (this.filter.type !== "all" && candidate.itemType !== this.filter.type) return false;
        if (!matchesDiscoveryTag(candidate.tags, this.filter.tag)) return false;
        if (!this.filter.text) return true;
        const haystack = `${candidate.title} ${candidate.summary} ${candidate.sourcePath}`.toLocaleLowerCase();
        return haystack.includes(this.filter.text);
    }

    private toggleFilteredSelection(): void {
        const eligible = Array.from(this.candidates.values()).filter((candidate) => this.canAdd(candidate) && this.matches(candidate));
        if (!eligible.length || this.actionBusy || !this.sessionId) return;
        const allSelected = eligible.every((candidate) => this.selected.has(candidate.key));
        for (const candidate of eligible) {
            if (allSelected) this.selected.delete(candidate.key);
            else this.selected.add(candidate.key);
        }
        this.renderList();
        this.selectFilteredButton?.focus();
    }

    private canAdd(candidate: DiscoveryCandidate): boolean {
        return candidate.status === "candidate" || candidate.status === "same-content" || candidate.status === "library-unverified";
    }

    private renderList(): void {
        const list = this.list;
        if (!list) return;
        this.renderTagFacets();
        list.textContent = "";
        const visible = Array.from(this.candidates.values()).filter((candidate) => this.matches(candidate));
        const pages = Math.max(1, Math.ceil(visible.length / this.pageSize));
        this.page = Math.max(0, Math.min(this.page, pages - 1));
        const pageItems = visible.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
        const results = document.createElement("div");
        results.setAttribute("role", "list");
        results.setAttribute("aria-label", this.tx(this.titleKey()));
        if (!visible.length) {
            const empty = document.createElement("div");
            empty.className = "xlc-discovery-empty";
            empty.setAttribute("role", "listitem");
            const scanning = this.root?.getAttribute("aria-busy") === "true";
            const hasFilters = this.filter.status !== "all" || this.filter.type !== "all" || !!this.filter.text || !!this.filter.tag;
            empty.textContent = scanning ? this.tx("discoveryScanningCandidates")
                : this.scanState === "failed" ? this.tx("discoveryScanIncompleteEmpty")
                    : this.scanState === "cancelled" ? this.tx("discoveryScanStoppedEmpty")
                        : this.candidates.size === 0 && this.scanState === "ready" ? this.tx("discoveryEmptyScope")
                            : this.candidates.size === 0 ? this.tx("discoveryAwaitingScan") : this.tx("discoveryNoCandidates");
            results.appendChild(empty);
            if (!scanning && this.candidates.size > 0 && hasFilters) {
                const clear = document.createElement("button");
                clear.type = "button";
                clear.className = "b3-button xlc-btn-ghost";
                clear.textContent = this.tx("discoveryClearFilters");
                clear.dataset.xlcDiscoveryAction = "clear-filters";
                clear.addEventListener("click", () => {
                    this.filter = {status: "all", type: "all", text: "", tag: ""};
                    if (this.filterStatus) this.filterStatus.value = "all";
                    if (this.filterType) this.filterType.value = "all";
                    if (this.filterText) this.filterText.value = "";
                    if (this.filterTag) this.filterTag.value = "";
                    this.page = 0;
                    this.renderList();
                });
                empty.appendChild(clear);
            }
        }
        for (const candidate of pageItems) {
            const row = document.createElement("div");
            row.className = "xlc-discovery-row";
            row.dataset.xlcDiscoveryKey = candidate.key;
            row.setAttribute("role", "listitem");
            row.tabIndex = 0;
            row.setAttribute("aria-label", `${candidate.title} · ${candidate.sourcePath} · ${this.statusLabel(candidate.status)}`);
            row.classList.toggle("xlc-discovery-row--active", this.activeKey === candidate.key);
            row.classList.toggle("xlc-discovery-row--disabled", !this.canAdd(candidate));
            row.addEventListener("click", (event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button, input")) return;
                void this.selectCandidate(candidate.key);
            });
            row.addEventListener("keydown", (event) => {
                if (event.target !== row || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                void this.selectCandidate(candidate.key);
            });
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
                checkbox.dataset.xlcControl = "discovery.candidate.select";
            checkbox.checked = this.selected.has(candidate.key);
            checkbox.disabled = this.actionBusy || !this.canAdd(candidate);
            checkbox.setAttribute("aria-label", `${this.tx("discoveryAdd")}：${candidate.title}`);
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) this.selected.add(candidate.key);
                else this.selected.delete(candidate.key);
                this.updateSelectionState();
            });
            row.appendChild(checkbox);
            const body = document.createElement("div");
            body.className = "xlc-discovery-row-body";
            const title = document.createElement("div");
            title.className = "xlc-discovery-row-title";
            title.textContent = candidate.title;
            body.appendChild(title);
            const meta = document.createElement("div");
            meta.className = "xlc-discovery-row-meta";
            meta.textContent = `${typeLabel(this.deps.t, candidate.itemType)} · ${candidate.sourcePath}${candidate.tags.length ? ` · ${candidate.tags.join(", ")}` : ""}`;
            body.appendChild(meta);
            const summary = document.createElement("div");
            summary.className = "xlc-discovery-row-summary";
            summary.textContent = candidate.summary;
            body.appendChild(summary);
            row.appendChild(body);
            const side = document.createElement("div");
            side.className = "xlc-discovery-row-side";
            const badge = document.createElement("span");
            badge.className = "xlc-badge";
            badge.textContent = this.statusLabel(candidate.status);
            side.appendChild(badge);
            const add = document.createElement("button");
            add.type = "button";
            add.className = "b3-button xlc-btn-primary";
            add.textContent = candidate.status === "added" ? this.tx("discoveryStatusAdded") : this.tx("discoveryAdd");
            add.disabled = this.actionBusy || !this.canAdd(candidate);
            add.dataset.xlcDiscoveryAction = "add-one";
            add.addEventListener("click", () => void this.addOne(candidate.key, false));
            side.appendChild(add);
            row.appendChild(side);
            results.appendChild(row);
        }
        // Keep the list semantic container present for empty, loading and filtered states too.
        list.appendChild(results);
        if (visible.length > this.pageSize) {
            const pager = document.createElement("div");
            pager.className = "xlc-discovery-pager";
            pager.setAttribute("role", "navigation");
            pager.setAttribute("aria-label", this.tx("discoveryPagination"));
            const pageLabel = document.createElement("span");
            pageLabel.className = "xlc-discovery-page-label";
            pageLabel.setAttribute("aria-current", "page");
            pageLabel.setAttribute("role", "status");
            pageLabel.setAttribute("aria-live", "polite");
            pageLabel.setAttribute("aria-atomic", "true");
            const previous = document.createElement("button");
            previous.type = "button";
            previous.className = "b3-button xlc-btn-ghost";
            previous.dataset.xlcControl = "discovery.page.previous";
            previous.textContent = this.tx("discoveryPreviousPage");
            previous.disabled = this.page === 0 || this.actionBusy;
            previous.addEventListener("click", () => this.changePage(-1, "previous"));
            pageLabel.textContent = this.tx("discoveryResultsPage", String(this.page + 1), String(pages));
            const next = document.createElement("button");
            next.type = "button";
            next.className = "b3-button xlc-btn-ghost";
            next.dataset.xlcControl = "discovery.page.next";
            next.textContent = this.tx("discoveryNextPage");
            next.disabled = this.page >= pages - 1 || this.actionBusy;
            next.addEventListener("click", () => this.changePage(1, "next"));
            pager.append(previous, pageLabel, next);
            list.appendChild(pager);
        }
        this.updateSelectionState();
    }

    private renderTagFacets(): void {
        const host = this.tagFacets;
        if (!host) return;
        host.textContent = "";
        const facets = buildDiscoveryTagFacets(Array.from(this.candidates.values()));
        if (!facets.length) {
            host.style.display = "none";
            return;
        }
        host.style.display = "flex";
        const label = document.createElement("span");
        label.className = "xlc-discovery-tag-facets-label";
        label.textContent = this.tx("discoveryTagFacets");
        host.appendChild(label);
        for (const facet of facets) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "b3-button xlc-tag-facet";
            button.dataset.xlcControl = "discovery.tag-facet";
            button.dataset.tag = facet.tag;
            button.setAttribute("role", "listitem");
            const active = this.filter.tag === facet.tag.toLocaleLowerCase();
            button.setAttribute("aria-pressed", String(active));
            button.setAttribute("aria-label", this.tx("discoveryTagFacetApply", facet.tag, String(facet.count)));
            button.textContent = `#${facet.tag} · ${facet.count}`;
            button.addEventListener("click", () => {
                const next = active ? "" : facet.tag;
                this.filter.tag = next.toLocaleLowerCase();
                if (this.filterTag) this.filterTag.value = next;
                this.page = 0;
                this.renderList();
                this.filterTag?.focus();
            });
            host.appendChild(button);
        }
    }

    private changePage(delta: -1 | 1, direction: "previous" | "next"): void {
        this.page += delta;
        this.renderList();
        const preferred = this.list?.querySelector<HTMLButtonElement>(`[data-xlc-control="discovery.page.${direction}"]`);
        const fallback = this.list?.querySelector<HTMLButtonElement>(`[data-xlc-control="discovery.page.${direction === "next" ? "previous" : "next"}"]`);
        const target = preferred && !preferred.disabled ? preferred : fallback && !fallback.disabled ? fallback : this.list;
        if (target === this.list && this.list) this.list.tabIndex = -1;
        target?.focus();
    }

    private updateSelectionState(): void {
        const count = this.selected.size;
        this.updateScopeControlState();
        if (this.closeButton) this.closeButton.disabled = this.actionBusy;
        if (this.selectedLabel) this.selectedLabel.textContent = this.tx("discoverySelected", String(count));
        if (this.scopeHint) this.scopeHint.textContent = this.scopeHintText();
        if (this.addSelectedButton) {
            this.addSelectedButton.disabled = this.actionBusy || !this.sessionId || count === 0;
        }
        if (this.selectFilteredButton) {
            const eligible = Array.from(this.candidates.values()).filter((candidate) => this.canAdd(candidate) && this.matches(candidate));
            const allSelected = eligible.length > 0 && eligible.every((candidate) => this.selected.has(candidate.key));
            this.selectFilteredButton.textContent = this.tx(allSelected ? "discoveryClearFilteredSelection" : "discoverySelectFiltered", String(eligible.length));
            this.selectFilteredButton.disabled = this.actionBusy || !this.sessionId || eligible.length === 0;
            this.selectFilteredButton.setAttribute("aria-pressed", String(allSelected));
            this.selectFilteredButton.setAttribute("aria-label", this.tx(allSelected ? "discoveryClearFilteredSelection" : "discoverySelectFiltered", String(eligible.length)));
        }
        if (this.defaultCategoryInput) this.defaultCategoryInput.disabled = this.actionBusy;
        if (this.candidateCategoryInput) this.candidateCategoryInput.disabled = this.actionBusy || !this.activeKey || !this.sessionId;
        this.updateCategoryResetState();
        this.receipt?.querySelectorAll<HTMLButtonElement>("button")
            .forEach((button) => { button.disabled = this.actionBusy; });
    }

    private getCategory(key: string): string {
        return this.categoryOverrides.has(key)
            ? this.categoryOverrides.get(key) ?? ""
            : this.defaultCategoryInput?.value ?? this.tx("discoveryUnsortedCategory");
    }

    private syncCandidateCategory(): void {
        if (this.candidateCategoryInput) {
            this.candidateCategoryInput.value = this.activeKey ? this.getCategory(this.activeKey) : "";
        }
        this.updateCategoryResetState();
    }

    private updateCategoryResetState(): void {
        if (!this.resetCategoryButton) return;
        this.resetCategoryButton.disabled = this.actionBusy || !this.activeKey || !this.categoryOverrides.has(this.activeKey);
    }

    private async selectCandidate(key: string, allowBusy = false): Promise<void> {
        const candidate = this.candidates.get(key);
        if (!candidate || !this.sessionId || (this.actionBusy && !allowBusy)) return;
        this.activeKey = key;
        this.syncCandidateCategory();
        this.renderList();
        if (this.preview) this.preview.textContent = this.tx("discoveryPreviewLoading");
        this.previewed.delete(key);
        const seq = ++this.previewSeq;
        let result: DiscoveryReceipt<DiscoveryPreview>;
        try {
            result = await this.deps.service.previewCandidate(this.sessionId, key);
        } catch (error) {
            result = {ok: false, reason: "kernel-error", message: this.errorMessage(error)};
        }
        if (this.closed || seq !== this.previewSeq) return;
        if (!result.ok) {
            this.handleFailure(result, key, true);
            return;
        }
        this.applyPreview(result.data);
    }

    private applyPreview(data: DiscoveryPreview): void {
        this.previewed.add(data.candidate.key);
        this.candidates.set(data.candidate.key, data.candidate);
        this.session?.candidates.splice(0, this.session.candidates.length, ...this.candidates.values());
        if (this.preview && this.activeKey === data.candidate.key) this.preview.textContent = data.markdown;
        this.renderList();
        this.setReceipt(!data.contentComparisonComplete ? this.tx("discoveryStatusUnverified")
            : this.undoableBatchIds.size ? this.tx("discoveryUndoAvailable") : "");
    }

    private async ensurePreview(key: string): Promise<boolean> {
        if (this.previewed.has(key)) return true;
        await this.selectCandidate(key, true);
        return this.previewed.has(key);
    }

    private async addOne(key: string, allowSameContent: boolean): Promise<void> {
        if (!this.sessionId || this.actionBusy) return;
        const mode = this.addMode?.value === "copy" ? "copy" : "reference";
        const candidate = this.candidates.get(key);
        if (!candidate || !this.canAdd(candidate)) return;
        const previousStatus = this.status?.textContent ?? "";
        this.actionBusy = true;
        this.setStatus(this.tx("discoveryAddingSingle"));
        this.updateSelectionState();
        this.renderList();
        try {
            if (!(await this.ensurePreview(key)) || !this.sessionId) return;
            const result = await this.deps.service.addCandidate(this.sessionId, key, {
                allowSameContent,
                category: this.getCategory(key),
                mode,
            });
            if (!result.ok) {
                this.handleFailure(result, key);
                return;
            }
            this.handleAddResult(key, result.data);
        } catch (error) {
            this.handleFailure({ok: false, reason: "kernel-error", message: this.errorMessage(error)}, key);
        } finally {
            this.actionBusy = false;
            this.renderList();
            if (this.sessionId) this.setStatus(previousStatus);
        }
    }

    private async addSelected(): Promise<void> {
        if (!this.sessionId || this.actionBusy || this.selected.size === 0) return;
        const sessionId = this.sessionId;
        const mode = this.addMode?.value === "copy" ? "copy" : "reference";
        const batchStart = this.deps.service.beginAddBatch(sessionId);
        if (!batchStart.ok) {
            this.handleFailure(batchStart);
            return;
        }
        const batchId = batchStart.data.batchId;
        const previousStatus = this.status?.textContent ?? "";
        this.actionBusy = true;
        this.updateSelectionState();
        this.renderList();
        const keys = Array.from(this.selected);
        const categories = new Map(keys.map((key) => [key, this.getCategory(key)]));
        const allowSameContent = this.forceSameContent?.checked === true;
        let added = 0;
        let skipped = 0;
        let failed = 0;
        const details: string[] = [];
        try {
            for (const [index, key] of keys.entries()) {
                this.setStatus(this.tx("discoveryAddingBatch", String(index + 1), String(keys.length)));
                if (!this.sessionId || this.sessionId !== sessionId) break;
                const candidate = this.candidates.get(key);
                if (!candidate || !this.canAdd(candidate)) {
                    skipped++;
                    continue;
                }
                if (!(await this.ensurePreview(key)) || !this.sessionId || this.sessionId !== sessionId) {
                    failed++;
                    details.push(`${candidate.title}：${this.tx("discoveryPreviewUnavailable")}`);
                    continue;
                }
                const result = await this.deps.service.addCandidate(this.sessionId, key, {
                    allowSameContent,
                    batchId,
                    category: categories.get(key) ?? this.tx("discoveryUnsortedCategory"),
                    mode,
                });
                if (!result.ok) {
                    if (result.reason === "session-expired") {
                        this.handleFailure(result);
                        failed++;
                        break;
                    }
                    failed++;
                    if (result.reason === "source-changed" || result.reason === "invalid-input") this.previewed.delete(key);
                    details.push(`${candidate.title}：${this.failureMessage(result)}`);
                    continue;
                }
                if (result.data.status === "added") {
                    added++;
                    this.handleAddResult(key, result.data, false);
                } else {
                    skipped++;
                    this.handleAddResult(key, result.data, false);
                }
            }
        } catch (error) {
            failed++;
            details.push(this.errorMessage(error));
        } finally {
            const finish = this.deps.service.finishAddBatch(sessionId, batchId);
            if (!finish.ok) {
                failed++;
                details.push(this.failureMessage(finish));
            }
            this.actionBusy = false;
            this.renderList();
            if (this.sessionId) this.setStatus(previousStatus);
        }
        const summary = `${this.tx("discoveryReceiptBatch", String(added), String(skipped), String(failed))}${details.length ? `\n${details.join("\n")}` : ""}`;
        if (added > 0) this.undoableBatchIds.add(batchId);
        this.setReceipt(summary, failed > 0, added > 0 ? [batchId] : []);
        // 批次令牌在 finally 后才生成；立即同步范围/关闭/重扫控件，避免短暂露出可变入口。
        this.updateSelectionState();
    }

    private handleAddResult(key: string, result: AddCandidateResult, showReceipt = true): void {
        const candidate = this.candidates.get(key);
        if (!candidate) return;
        if (result.status === "added") {
            this.undoableBatchIds.add(result.batchId);
            candidate.status = "added";
            candidate.match = {itemId: result.item.id, title: result.item.title};
            this.previewed.add(key);
            this.selected.delete(key);
            this.deps.onAdded?.(result.item.id, result.item.title);
            if (showReceipt) {
                this.setReceipt(this.tx("discoveryReceiptAdded", result.item.title), false, [result.batchId]);
                this.deps.notify?.("info", this.tx("discoveryReceiptAdded", result.item.title));
            }
            return;
        }
        if (result.status === "already-in-library") {
            candidate.status = "already-in-library";
            candidate.match = {itemId: result.itemId, title: result.title};
            this.selected.delete(key);
            if (showReceipt) this.setReceipt(this.tx("discoveryReceiptAlready", result.title));
            return;
        }
        candidate.status = "same-content";
        candidate.match = {itemId: result.itemId, title: result.title};
        if (showReceipt) {
            this.setReceipt(this.tx("discoveryReceiptSameContent", result.title), true);
            this.renderForceAction(key, result.title);
        }
    }

    private renderForceAction(key: string, title: string): void {
        if (!this.receipt) return;
        const force = document.createElement("button");
        force.type = "button";
        force.className = "b3-button xlc-btn-primary";
        force.textContent = `${this.tx("discoveryAdd")}（${title}）`;
        force.dataset.xlcDiscoveryAction = "force-same-content";
        force.addEventListener("click", () => {
            void this.addOne(key, true);
        });
        this.receipt.appendChild(document.createTextNode(" "));
        this.receipt.appendChild(force);
    }

    private handleFailure(result: {ok: false; reason?: string; message: string}, candidateKey?: string, previewFailure = false): void {
        if (result.reason === "session-expired") {
            this.previewSeq++;
            this.session = null;
            this.sessionId = null;
            this.candidates.clear();
            this.selected.clear();
            this.previewed.clear();
            this.categoryOverrides.clear();
            this.undoableBatchIds.clear();
            this.activeKey = null;
            this.scanState = "failed";
            this.syncCandidateCategory();
            if (this.preview) this.preview.textContent = this.tx("discoverySessionExpired");
            this.setStatus(this.tx("discoverySessionExpired"), true);
            this.showRetryReceipt();
            this.renderList();
            return;
        }
        const message = this.failureMessage(result);
        const retryPreview = candidateKey && (previewFailure || result.reason === "source-changed" || result.reason === "invalid-input");
        if (retryPreview) {
            this.previewed.delete(candidateKey);
            if (this.preview && this.activeKey === candidateKey) this.preview.textContent = message;
        }
        this.setReceipt(message, true);
        if (retryPreview && this.receipt) {
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "b3-button xlc-btn-ghost";
            retry.textContent = this.tx("discoveryPreviewRetry");
            retry.dataset.xlcDiscoveryAction = "retry-preview";
            retry.disabled = this.actionBusy;
            retry.addEventListener("click", () => void this.selectCandidate(candidateKey));
            this.receipt.appendChild(retry);
        }
        this.deps.notify?.("error", message);
    }

    private failureMessage(result: {reason?: string; message: string}): string {
        const keys: Record<string, string> = {
            "not-configured": "discoveryNotConfigured",
            "library-document": "discoveryLibraryDocument",
            "library-boundary-unknown": "discoveryBoundaryUnknown",
            "invalid-response": "discoveryInvalidResponse",
            "invalid-input": "discoveryInvalidInput",
            "not-found": "discoverySourceUnavailable",
            "source-changed": "discoverySourceChanged",
            "content-too-long": "discoveryContentTooLong",
            "library-check-incomplete": "discoveryLibraryCheckIncomplete",
            "session-expired": "discoverySessionExpired",
            conflict: "discoveryOperationConflict",
            timeout: "timeout",
            cancelled: "discoveryScanStoppedEmpty",
        };
        const key = result.reason ? keys[result.reason] : undefined;
        return key ? this.tx(key) : this.errorMessage(result.message);
    }

    private errorMessage(error: unknown): string {
        const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
        return /[\u3400-\u9fff]/.test(message) ? message : this.tx("discoveryKernelError");
    }

    private async undoBatch(batchId: string): Promise<void> {
        if (!this.sessionId || this.actionBusy) return;
        const sessionId = this.sessionId;
        this.actionBusy = true;
        this.updateSelectionState();
        this.renderList();
        this.setReceipt(this.tx("discoveryUndoing"), false, [], "discoveryUndoReceiptTitle");
        try {
            const result = await this.deps.service.undoBatch(sessionId, batchId);
            if (!result.ok) {
                const message = this.failureMessage(result);
                this.setReceipt(message, true, [batchId], "discoveryUndoReceiptTitle");
                this.deps.notify?.("error", message);
                return;
            }
            this.showUndoResult(result.data);
        } catch (error) {
            const message = this.errorMessage(error);
            this.setReceipt(message, true, [batchId], "discoveryUndoReceiptTitle");
            this.deps.notify?.("error", message);
        } finally {
            this.actionBusy = false;
            this.renderList();
            if (this.receipt?.querySelector("[data-xlc-discovery-action='undo-batch']")) {
                (this.receipt.querySelector("[data-xlc-discovery-action='undo-batch']") as HTMLButtonElement).disabled = false;
            }
        }
    }

    private showUndoResult(result: UndoBatchResult): void {
        const deletedItems = (result as UndoBatchResult & {deletedItems?: Array<{itemId: string; title: string}>}).deletedItems ?? [];
        const absentItems = [
            ...deletedItems,
            ...result.skipped
                .filter((item) => item.reason === "not-found")
                .map(({itemId, title}) => ({itemId, title})),
        ];
        for (const {itemId} of absentItems) {
            for (const candidate of this.candidates.values()) {
                if (candidate.status === "added" && candidate.match?.itemId === itemId) {
                    candidate.status = "candidate";
                    delete candidate.match;
                }
            }
        }
        for (const item of absentItems) this.deps.onAdded?.(item.itemId, item.title);
        const skipKey: Record<string, string> = {
            "not-found": "discoveryUndoSkipNotFound",
            "identity-changed": "discoveryUndoSkipIdentityChanged",
            edited: "discoveryUndoSkipEdited",
            "library-unverified": "discoveryUndoSkipLibraryUnverified",
        };
        const lines = [this.tx("discoveryUndoDone", String(result.deleted), String(result.skipped.length), String(result.failed.length))];
        for (const item of result.skipped) lines.push(`${item.title}：${this.tx(skipKey[item.reason] ?? "discoveryUnknown")}`);
        for (const item of result.failed) lines.push(`${item.title}：${this.tx("discoveryUndoDeleteFailed", this.errorMessage(item.message))}`);
        const retryable = result.skipped.some((item) => item.reason !== "not-found") || result.failed.length > 0;
        if (!retryable) this.undoableBatchIds.delete(result.batchId);
        this.setReceipt(result.alreadyUndone ? this.tx("discoveryUndoAlreadyDone") : lines.join("\n"), false, retryable ? [result.batchId] : [], "discoveryUndoReceiptTitle");
    }

    private setReceipt(message: string, error = false, undoBatchIds: string[] = [], titleKey = "discoveryReceiptTitle"): void {
        if (!this.receipt) return;
        this.receipt.style.display = message ? "block" : "none";
        this.receipt.textContent = "";
        if (!message) return;
        const title = document.createElement("strong");
        title.textContent = this.tx(titleKey);
        this.receipt.appendChild(title);
        const body = document.createElement("div");
        body.className = error ? "xlc-status--error" : "";
        body.textContent = message;
        this.receipt.appendChild(body);
        for (const batchId of new Set([...this.undoableBatchIds, ...undoBatchIds])) {
            const undo = document.createElement("button");
            undo.type = "button";
            undo.className = "b3-button xlc-btn-ghost";
            undo.textContent = this.tx("discoveryUndoBatch");
            undo.disabled = this.actionBusy;
            undo.dataset.xlcDiscoveryAction = "undo-batch";
            undo.addEventListener("click", () => void this.undoBatch(batchId));
            this.receipt.appendChild(undo);
        }
    }
}

export function openDiscoveryDialog(deps: DiscoveryDialogDeps, options: DiscoveryDialogOptions): DiscoveryDialogController {
    const dialog = new DiscoveryDialog(deps, options);
    dialog.open();
    return dialog;
}
