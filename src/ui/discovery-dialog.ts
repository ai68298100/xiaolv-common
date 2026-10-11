import {Dialog} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {ITEM_TYPES, ItemType} from "../model/item";
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
    & {addCandidate: (sessionId: string, candidateKey: string, options?: {allowSameContent?: boolean; batchId?: string}) => Promise<DiscoveryReceipt<AddCandidateResult>>}
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
    scope?: "document" | "notebook";
}

export interface DiscoveryDialogController {
    open(): void;
    close(force?: boolean): boolean;
}

const FALLBACKS: Record<string, string> = {
    discoveryTitle: "从当前文档发现",
    discoveryTitleNotebook: "从当前笔记本发现",
    discoveryTitleGeneral: "发现已有内容",
    discoveryScope: "扫描范围",
    discoveryStartDocument: "入口文档",
    discoveryScopeDocument: "当前文档",
    discoveryScopeNotebook: "当前笔记本",
    discoveryScopeTree: "指定文档树",
    discoveryScopeSelectedNotebook: "指定笔记本",
    discoveryScopeAllNotebooks: "全部笔记本（高级）",
    discoveryScopeTreeHint: "扫描所选根文档及其下级文档顶层块；加入内容只复制到专用库。",
    discoveryScopeSelectedNotebookHint: "扫描所选笔记本的文档顶层块；加入内容只复制到专用库。",
    discoverySelectTree: "输入关键词查找文档树根文档",
    discoverySelectNotebook: "选择要扫描的笔记本",
    discoverySearch: "搜索",
    discoveryAllWarning: "上限：%s 个笔记本、%s 篇文档、%s 层目录、%s 个块、%s 个候选、单块 %s 字符、候选文本累计 %s 字符、%s 秒。文档和块按顺序读取；路径查询与重复核验最多 4 路并发。只读扫描，不会自动收录。",
    discoveryConfirmAll: "我确认开始扫描所有可搜索笔记本",
    discoveryTargetRequired: "请先选择扫描范围",
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
    discoveryRescanKeepsUndo: "请先撤销或关闭本批次，再重新扫描。",
    discoveryCloseKeepsUndo: "本次发现仍有可撤销的收录批次。关闭会丢失撤销入口；仍要关闭吗？",
    discoveryScopeHintDocument: "只读取当前文档的顶层块；收录前可预览，原文不会被修改。",
    discoveryScopeHintNotebook: "扫描当前文档所属笔记本的顶层块；候选会显示各自来源，收录只复制到专用库。",
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
    discoveryPreviewTitle: "候选预览",
    discoveryPreviewEmpty: "选择左侧候选后查看正文；收录前会再次校验来源。",
    discoveryPreviewLoading: "正在读取候选正文…",
    discoveryAdd: "加入常用库",
    discoveryAddSelected: "加入选中项",
    discoveryForceSameContent: "允许收录内容相同的候选",
    discoverySelected: "已选 %s 项",
    discoveryClose: "关闭",
    discoveryClosePendingWrites: "有收录正在写入内容库。请等待收录回执，必要时先撤销本批新增，再关闭此窗口。",
    discoveryReceiptTitle: "收录回执",
    discoveryReceiptAdded: "已复制到常用库：%s；原笔记未修改，之后不会自动同步。",
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
    private targetNotebookId = "";
    private allConfirmed = false;
    private scopeLoadSeq = 0;
    private page = 0;
    private readonly pageSize = 100;
    private undoableBatchIds = new Set<string>();
    private filterStatus: HTMLSelectElement | null = null;
    private filterType: HTMLSelectElement | null = null;
    private filterText: HTMLInputElement | null = null;
    private forceSameContent: HTMLInputElement | null = null;

    private session: DiscoverySessionView | null = null;
    private sessionId: string | null = null;
    private candidates = new Map<string, DiscoveryCandidate>();
    private selected = new Set<string>();
    private previewed = new Set<string>();
    private activeKey: string | null = null;
    private scanSeq = 0;
    private previewSeq = 0;
    private actionBusy = false;
    private closed = false;
    private scope: DiscoveryScope;
    private cancelRequested = false;
    private filter: {status: DiscoveryCandidateStatus | "all"; type: ItemType | "all"; text: string} = {
        status: "all", type: "all", text: "",
    };

    constructor(private readonly deps: DiscoveryDialogDeps, private readonly options: DiscoveryDialogOptions) {
        this.scope = options.scope === "notebook" && deps.service.discoverCurrentNotebook ? "notebook" : "document";
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
            title: this.options.title ?? this.tx(this.scope === "notebook" ? "discoveryTitleNotebook" : "discoveryTitleGeneral"),
            content: "",
            width: "min(820px, 94vw)",
            height: "min(700px, 88vh)",
            disableClose: true,
            destroyCallback: () => {
                if (this.closed) return;
                this.closed = true;
                const closed = this.deps.service.closeSession(this.sessionId ?? undefined);
                if (!closed.ok) {
                    this.deps.notify?.("error", closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : closed.message);
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
                const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : closed.message;
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
        title.textContent = this.tx(this.scope === "notebook" ? "discoveryTitleNotebook" : "discoveryTitle");
        heading.appendChild(title);
        const scopeRow = document.createElement("div");
        scopeRow.className = "xlc-discovery-scope-row";
        const scopeLabel = document.createElement("label");
        scopeLabel.className = "xlc-form-hint";
        scopeLabel.textContent = `${this.tx("discoveryScope")}：`;
        this.scopeSelect = document.createElement("select");
        this.scopeSelect.className = "b3-select xlc-discovery-scope-select";
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
            if (!enabled) option.title = this.tx("discoveryNotebookUnavailable");
            this.scopeSelect.appendChild(option);
        }
        this.scopeSelect.value = this.scope;
        this.scopeSelect.addEventListener("change", () => {
            const nextScope = this.scopeSelect?.value as DiscoveryScope;
            if (nextScope === this.scope) return;
            this.scope = nextScope;
            title.textContent = this.tx(this.scope === "document" ? "discoveryTitle" : this.scope === "notebook" ? "discoveryTitleNotebook" : "discoveryTitleGeneral");
            if (this.scopeHint) this.scopeHint.textContent = this.scopeHintText();
            this.targetDocId = "";
            this.targetNotebookId = "";
            this.allConfirmed = false;
            this.renderScopeTarget();
            if (this.scope === "document" || this.scope === "notebook") void this.scan();
            else {
                this.setStatus(this.tx("discoveryTargetRequired"));
                this.scanButton && (this.scanButton.disabled = true);
            }
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
            if (this.root?.getAttribute("aria-busy") === "true") this.cancelScan();
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
        this.filterText.placeholder = this.tx("discoverySearchPlaceholder");
        this.filterText.setAttribute("aria-label", this.tx("discoverySearchPlaceholder"));
        this.filterText.addEventListener("input", () => {
            this.filter.text = this.filterText?.value.trim().toLocaleLowerCase() ?? "";
            this.page = 0;
            this.renderList();
        });
        filters.appendChild(this.filterText);
        root.appendChild(filters);

        const content = document.createElement("div");
        content.className = "xlc-discovery-content";
        this.list = document.createElement("div");
        this.list.className = "xlc-discovery-list";
        this.list.setAttribute("role", "listbox");
        this.list.setAttribute("aria-label", this.tx("discoveryTitle"));
        content.appendChild(this.list);
        const pane = document.createElement("section");
        pane.className = "xlc-discovery-preview";
        const paneTitle = document.createElement("h3");
        paneTitle.textContent = this.tx("discoveryPreviewTitle");
        pane.appendChild(paneTitle);
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
        this.receipt.style.display = "none";
        root.appendChild(this.receipt);
        this.setScanningState(true);
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
        this.root?.setAttribute("aria-busy", String(scanning));
        if (this.scanButton) {
            this.scanButton.disabled = this.actionBusy || (scanning ? this.cancelRequested : this.missingScopeTarget());
            this.scanButton.textContent = scanning
                ? this.tx(this.cancelRequested ? "discoveryStopping" : "discoveryCancelScan")
                : this.tx("discoveryRetry");
            this.scanButton.dataset.xlcDiscoveryAction = scanning ? "cancel-scan" : "retry-scan";
        }
        if (this.filterStatus) this.filterStatus.disabled = scanning;
        if (this.filterType) this.filterType.disabled = scanning;
        if (this.filterText) this.filterText.disabled = scanning;
        if (this.scopeSelect) this.scopeSelect.disabled = scanning || this.actionBusy;
        if (this.scopeTarget) this.scopeTarget.querySelectorAll("input, select, button").forEach((control) => {
            (control as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled = scanning || this.actionBusy;
        });
    }

    private scopeHintText(): string {
        if (this.scope === "document") return this.tx("discoveryScopeHintDocument");
        if (this.scope === "notebook") return this.tx("discoveryScopeHintNotebook");
        if (this.scope === "tree") return this.tx("discoveryScopeTreeHint");
        if (this.scope === "selected-notebook") return this.tx("discoveryScopeSelectedNotebookHint");
        if (this.scope === "all-notebooks") return this.tx("discoveryAllWarning", "20", "200", "8", "2,000", "500", "100,000", "2,000,000", "60");
        return this.tx("discoveryScopeHintDocument");
    }

    private renderScopeTarget(): void {
        const target = this.scopeTarget;
        if (!target) return;
        const seq = ++this.scopeLoadSeq;
        target.textContent = "";
        if (this.scope === "tree") {
            const input = document.createElement("input");
            input.type = "search";
            input.className = "b3-text-field";
            input.placeholder = this.tx("discoverySelectTree");
            input.setAttribute("aria-label", this.tx("discoverySelectTree"));
            const search = document.createElement("button");
            search.type = "button";
            search.className = "b3-button xlc-btn-ghost";
            search.textContent = this.tx("discoverySearch");
            const results = document.createElement("select");
            results.className = "b3-select";
            results.setAttribute("aria-label", this.tx("discoverySelectTree"));
            results.addEventListener("change", () => {
                this.targetDocId = results.value;
                if (this.scanButton) this.scanButton.disabled = !this.targetDocId;
                if (this.targetDocId) void this.scan();
            });
            search.addEventListener("click", () => {
                const keyword = input.value.trim();
                if (!keyword || !this.deps.searchDocs) return;
                search.disabled = true;
                void this.deps.searchDocs(keyword).then((docs) => {
                    if (seq !== this.scopeLoadSeq || this.closed) return;
                    results.textContent = "";
                    for (const doc of docs) {
                        const option = document.createElement("option");
                        option.value = doc.id;
                        option.textContent = doc.hPath || doc.name || doc.id;
                        results.appendChild(option);
                    }
                    results.hidden = docs.length === 0;
                    this.setStatus(docs.length ? this.tx("discoveryTargetRequired") : this.tx("discoveryNoCandidates"));
                }).catch((error) => {
                    if (seq === this.scopeLoadSeq) this.setStatus(this.tx("discoverySearchFailed", error instanceof Error ? error.message : String(error)), true);
                }).finally(() => { search.disabled = false; });
            });
            results.hidden = true;
            target.append(input, search, results);
            return;
        }
        if (this.scope === "selected-notebook") {
            const select = document.createElement("select");
            select.className = "b3-select";
            select.setAttribute("aria-label", this.tx("discoverySelectNotebook"));
            select.disabled = true;
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = this.tx("discoverySelectNotebook");
            select.appendChild(placeholder);
            target.appendChild(select);
            if (!this.deps.listNotebooks) return;
            void this.deps.listNotebooks().then((notebooks) => {
                if (seq !== this.scopeLoadSeq || this.closed) return;
                for (const notebook of notebooks) {
                    const option = document.createElement("option");
                    option.value = notebook.id;
                    option.textContent = notebook.name;
                    select.appendChild(option);
                }
                select.disabled = notebooks.length === 0;
                this.setStatus(notebooks.length ? this.tx("discoveryTargetRequired") : this.tx("discoveryNoCandidates"));
            }).catch((error) => {
                if (seq === this.scopeLoadSeq) this.setStatus(this.tx("discoveryNotebookLoadFailed", error instanceof Error ? error.message : String(error)), true);
            });
            select.addEventListener("change", () => {
                this.targetNotebookId = select.value;
                if (this.scanButton) this.scanButton.disabled = !this.targetNotebookId;
                if (this.targetNotebookId) void this.scan();
            });
            return;
        }
        if (this.scope === "all-notebooks") {
            const label = document.createElement("label");
            label.className = "xlc-discovery-all-confirm";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            const text = document.createElement("span");
            text.textContent = this.tx("discoveryConfirmAll");
            checkbox.addEventListener("change", () => {
                this.allConfirmed = checkbox.checked;
                if (this.scanButton) this.scanButton.disabled = !this.allConfirmed;
            });
            label.append(checkbox, text);
            target.appendChild(label);
            if (this.scanButton) this.scanButton.disabled = true;
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
                const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : closed.message;
                this.setReceipt(message, true);
                this.deps.notify?.("error", message);
                return;
            }
        }
        this.session = null;
        this.sessionId = null;
        this.candidates.clear();
        this.selected.clear();
        this.previewed.clear();
        this.activeKey = null;
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
            this.setScanningState(false);
            if (this.cancelRequested) {
                const message = this.tx("discoveryStoppedNoResults");
                this.setStatus(message);
                this.showRetryReceipt(message);
            } else {
                this.setStatus(this.tx("discoveryRetry"));
                this.showRetryReceipt(this.tx("discoveryRetry"));
            }
            return;
        }
        if (!result.ok) {
            this.setScanningState(false);
            this.setStatus(this.failureMessage(result), true);
            this.showRetryReceipt(this.tx("discoveryScanFailed", result.message || this.tx("discoveryUnknown")));
            return;
        }
        this.session = result.data;
        this.sessionId = result.data.id;
        this.candidates = new Map(result.data.candidates.map((candidate) => [candidate.key, candidate]));
        this.page = 0;
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
        if (result.data.errors.length) this.setReceipt(result.data.errors.map((error) => `${error.sourcePath || "扫描范围"}：${error.message}`).join("\n"), true);
        this.renderList();
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
        this.scanButton.disabled = false;
    }

    private matches(candidate: DiscoveryCandidate): boolean {
        if (this.filter.status !== "all" && candidate.status !== this.filter.status) return false;
        if (this.filter.type !== "all" && candidate.itemType !== this.filter.type) return false;
        if (!this.filter.text) return true;
        const haystack = `${candidate.title} ${candidate.summary} ${candidate.sourcePath}`.toLocaleLowerCase();
        return haystack.includes(this.filter.text);
    }

    private canAdd(candidate: DiscoveryCandidate): boolean {
        return candidate.status === "candidate" || candidate.status === "same-content" || candidate.status === "library-unverified";
    }

    private renderList(): void {
        const list = this.list;
        if (!list) return;
        list.textContent = "";
        const visible = Array.from(this.candidates.values()).filter((candidate) => this.matches(candidate));
        const pages = Math.max(1, Math.ceil(visible.length / this.pageSize));
        this.page = Math.max(0, Math.min(this.page, pages - 1));
        const pageItems = visible.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
        if (!visible.length) {
            const empty = document.createElement("div");
            empty.className = "xlc-discovery-empty";
            empty.textContent = this.tx("discoveryNoCandidates");
            list.appendChild(empty);
        }
        for (const candidate of pageItems) {
            const row = document.createElement("div");
            row.className = "xlc-discovery-row";
            row.dataset.xlcDiscoveryKey = candidate.key;
            row.setAttribute("role", "option");
            row.setAttribute("aria-selected", String(this.activeKey === candidate.key));
            row.classList.toggle("xlc-discovery-row--active", this.activeKey === candidate.key);
            row.classList.toggle("xlc-discovery-row--disabled", !this.canAdd(candidate));
            row.addEventListener("click", (event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button, input")) return;
                void this.selectCandidate(candidate.key);
            });
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
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
            meta.textContent = `${typeLabel(this.deps.t, candidate.itemType)} · ${candidate.sourcePath}`;
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
            list.appendChild(row);
        }
        if (visible.length > this.pageSize) {
            const pager = document.createElement("div");
            pager.className = "xlc-discovery-pager";
            const previous = document.createElement("button");
            previous.type = "button";
            previous.className = "b3-button xlc-btn-ghost";
            previous.textContent = this.tx("discoveryPreviousPage");
            previous.disabled = this.page === 0 || this.actionBusy;
            previous.addEventListener("click", () => { this.page--; this.renderList(); });
            const label = document.createElement("span");
            label.textContent = this.tx("discoveryResultsPage", String(this.page + 1), String(pages));
            const next = document.createElement("button");
            next.type = "button";
            next.className = "b3-button xlc-btn-ghost";
            next.textContent = this.tx("discoveryNextPage");
            next.disabled = this.page >= pages - 1 || this.actionBusy;
            next.addEventListener("click", () => { this.page++; this.renderList(); });
            pager.append(previous, label, next);
            list.appendChild(pager);
        }
        this.updateSelectionState();
    }

    private updateSelectionState(): void {
        const count = this.selected.size;
        if (this.closeButton) this.closeButton.disabled = this.actionBusy;
        if (this.selectedLabel) this.selectedLabel.textContent = this.tx("discoverySelected", String(count));
        if (this.scopeSelect) this.scopeSelect.disabled = this.actionBusy || this.root?.getAttribute("aria-busy") === "true";
        if (this.addSelectedButton) {
            this.addSelectedButton.disabled = this.actionBusy || !this.sessionId || count === 0;
        }
    }

    private async selectCandidate(key: string, allowBusy = false): Promise<void> {
        const candidate = this.candidates.get(key);
        if (!candidate || !this.sessionId || (this.actionBusy && !allowBusy)) return;
        this.activeKey = key;
        this.renderList();
        if (this.preview) this.preview.textContent = this.tx("discoveryPreviewLoading");
        const seq = ++this.previewSeq;
        const result = await this.deps.service.previewCandidate(this.sessionId, key);
        if (this.closed || seq !== this.previewSeq) return;
        if (!result.ok) {
            this.handleFailure(result);
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
        this.setReceipt(data.contentComparisonComplete ? "" : this.tx("discoveryStatusUnverified"));
    }

    private async ensurePreview(key: string): Promise<boolean> {
        if (this.previewed.has(key)) return true;
        await this.selectCandidate(key, true);
        return this.previewed.has(key);
    }

    private async addOne(key: string, allowSameContent: boolean): Promise<void> {
        if (!this.sessionId || this.actionBusy) return;
        const candidate = this.candidates.get(key);
        if (!candidate || !this.canAdd(candidate)) return;
        this.actionBusy = true;
        this.updateSelectionState();
        this.renderList();
        try {
            if (!(await this.ensurePreview(key)) || !this.sessionId) return;
            const result = await this.deps.service.addCandidate(this.sessionId, key, {allowSameContent});
            if (!result.ok) {
                this.handleFailure(result);
                return;
            }
            this.handleAddResult(key, result.data);
        } finally {
            this.actionBusy = false;
            this.renderList();
        }
    }

    private async addSelected(): Promise<void> {
        if (!this.sessionId || this.actionBusy || this.selected.size === 0) return;
        const sessionId = this.sessionId;
        const batchStart = this.deps.service.beginAddBatch(sessionId);
        if (!batchStart.ok) {
            this.handleFailure(batchStart);
            return;
        }
        const batchId = batchStart.data.batchId;
        this.actionBusy = true;
        this.updateSelectionState();
        this.renderList();
        const keys = Array.from(this.selected);
        let added = 0;
        let skipped = 0;
        let failed = 0;
        const details: string[] = [];
        try {
            for (const key of keys) {
                if (!this.sessionId || this.sessionId !== sessionId) break;
                const candidate = this.candidates.get(key);
                if (!candidate || !this.canAdd(candidate)) {
                    skipped++;
                    continue;
                }
                if (!(await this.ensurePreview(key)) || !this.sessionId || this.sessionId !== sessionId) {
                    failed++;
                    details.push(`${candidate.title}：${this.tx("discoveryReceiptFailed", this.tx("discoveryPreviewEmpty"))}`);
                    continue;
                }
                const result = await this.deps.service.addCandidate(this.sessionId, key, {
                    allowSameContent: this.forceSameContent?.checked === true,
                    batchId,
                });
                if (!result.ok) {
                    if (result.reason === "session-expired") {
                        this.handleFailure(result);
                        failed++;
                        break;
                    }
                    failed++;
                    details.push(`${candidate.title}：${result.message}`);
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
            details.push(error instanceof Error ? error.message : String(error));
        } finally {
            const finish = this.deps.service.finishAddBatch(sessionId, batchId);
            if (!finish.ok) {
                failed++;
                details.push(finish.message);
            }
            this.actionBusy = false;
            this.renderList();
        }
        const summary = `${this.tx("discoveryReceiptBatch", String(added), String(skipped), String(failed))}${details.length ? `\n${details.join("\n")}` : ""}`;
        if (added > 0) this.undoableBatchIds.add(batchId);
        this.setReceipt(summary, failed > 0, added > 0 ? [batchId] : []);
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
            if (this.forceSameContent) this.forceSameContent.checked = true;
            void this.addOne(key, true);
        });
        this.receipt.appendChild(document.createTextNode(" "));
        this.receipt.appendChild(force);
    }

    private handleFailure(result: {ok: false; reason?: string; message: string}): void {
        if (result.reason === "session-expired") {
            this.session = null;
            this.sessionId = null;
            this.selected.clear();
            this.setStatus(this.tx("discoverySessionExpired"), true);
            this.showRetryReceipt();
            this.renderList();
            return;
        }
        this.setReceipt(result.message || this.tx("discoveryUnknown"), true);
        this.deps.notify?.("error", result.message || this.tx("discoveryUnknown"));
    }

    private failureMessage(result: {reason: string; message: string}): string {
        if (result.reason === "not-configured") return this.tx("discoveryNotConfigured");
        if (result.reason === "session-expired") return this.tx("discoverySessionExpired");
        return this.tx("discoveryScanFailed", result.message || this.tx("discoveryUnknown"));
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
                this.setReceipt(result.message || this.tx("discoveryUnknown"), true, [batchId], "discoveryUndoReceiptTitle");
                this.deps.notify?.("error", result.message || this.tx("discoveryUnknown"));
                return;
            }
            this.showUndoResult(result.data);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
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
        for (const item of result.failed) lines.push(`${item.title}：${this.tx("discoveryUndoDeleteFailed", item.message)}`);
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
