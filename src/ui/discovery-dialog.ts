import {Dialog} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {ITEM_TYPES, ItemType} from "../model/item";
import type {
    AddCandidateResult,
    DiscoveryCandidate,
    DiscoveryCandidateStatus,
    DiscoveryPreview,
    DiscoveryService,
    DiscoverySessionView,
} from "../service/discovery";

type TFn = (key: string, ...args: string[]) => string;
type DiscoveryApi = Pick<DiscoveryService, "discoverCurrentDocument" | "previewCandidate" | "addCandidate" | "closeSession">;

export interface DiscoveryDialogDeps {
    t: TFn;
    service: DiscoveryApi;
    /** Optional host feedback. The dialog always keeps an in-dialog receipt as well. */
    notify?: (kind: "info" | "error", message: string) => void;
    /** Called after a candidate is copied into the configured library. */
    onAdded?: (itemId: string, title: string) => void;
}

export interface DiscoveryDialogOptions {
    /** The document whose top-level blocks should be scanned. */
    docId: string;
    /** Display path captured by the entry point; the service remains the source of truth. */
    sourcePath?: string;
    /** Optional title override for host-specific entry points. */
    title?: string;
}

export interface DiscoveryDialogController {
    open(): void;
    close(): void;
}

const FALLBACKS: Record<string, string> = {
    discoveryTitle: "从当前文档发现",
    discoveryScope: "扫描范围",
    discoveryScopeHint: "只读取当前文档的顶层块，不上传内容，也不会修改原文。",
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
    private addSelectedButton: HTMLButtonElement | null = null;
    private selectedLabel: HTMLElement | null = null;
    private scanButton: HTMLButtonElement | null = null;
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
    private filter: {status: DiscoveryCandidateStatus | "all"; type: ItemType | "all"; text: string} = {
        status: "all", type: "all", text: "",
    };

    constructor(private readonly deps: DiscoveryDialogDeps, private readonly options: DiscoveryDialogOptions) {}

    private tx(key: string, ...args: string[]): string {
        const result = this.deps.t(key, ...args);
        const value = result && result !== key ? result : FALLBACKS[key] ?? key;
        return replaceArgs(value, args);
    }

    open(): void {
        if (this.dialog) return;
        this.closed = false;
        const dialog = new Dialog({
            title: this.options.title ?? this.tx("discoveryTitle"),
            content: "",
            width: "min(820px, 94vw)",
            height: "min(700px, 88vh)",
            destroyCallback: () => {
                if (this.closed) return;
                this.closed = true;
                this.deps.service.closeSession(this.sessionId ?? undefined);
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

    close(): void {
        if (!this.dialog) return;
        this.closed = true;
        this.scanSeq++;
        this.previewSeq++;
        this.deps.service.closeSession(this.sessionId ?? undefined);
        this.session = null;
        this.sessionId = null;
        const dialog = this.dialog;
        this.dialog = null;
        dialog.destroy();
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
        title.textContent = this.tx("discoveryTitle");
        heading.appendChild(title);
        const scope = document.createElement("div");
        scope.className = "xlc-form-hint xlc-discovery-scope";
        scope.textContent = `${this.tx("discoveryScope")}：${this.options.sourcePath || this.options.docId}`;
        heading.appendChild(scope);
        head.appendChild(heading);
        const close = document.createElement("button");
        close.type = "button";
        close.className = "b3-button xlc-btn-ghost";
        close.textContent = this.tx("discoveryClose");
        close.dataset.xlcDiscoveryAction = "close";
        close.addEventListener("click", () => this.close());
        head.appendChild(close);
        root.appendChild(head);

        const notice = document.createElement("div");
        notice.className = "xlc-discovery-notice xlc-form-hint";
        notice.setAttribute("role", "note");
        notice.textContent = this.tx("discoveryScopeHint");
        root.appendChild(notice);

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
            if (this.session) void this.scan();
            else this.cancelScan();
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
            this.renderList();
        });
        filters.appendChild(this.filterType);
        this.filterText = document.createElement("input");
        this.filterText.className = "b3-text-field";
        this.filterText.placeholder = this.tx("discoverySearchPlaceholder");
        this.filterText.setAttribute("aria-label", this.tx("discoverySearchPlaceholder"));
        this.filterText.addEventListener("input", () => {
            this.filter.text = this.filterText?.value.trim().toLocaleLowerCase() ?? "";
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
        this.root?.setAttribute("aria-busy", String(scanning));
        if (this.scanButton) {
            this.scanButton.disabled = this.actionBusy;
            this.scanButton.textContent = scanning ? this.tx("discoveryCancelScan") : this.tx("discoveryRetry");
            this.scanButton.dataset.xlcDiscoveryAction = scanning ? "cancel-scan" : "retry-scan";
        }
        if (this.filterStatus) this.filterStatus.disabled = scanning;
        if (this.filterType) this.filterType.disabled = scanning;
        if (this.filterText) this.filterText.disabled = scanning;
    }

    private async scan(): Promise<void> {
        if (this.actionBusy) return;
        const seq = ++this.scanSeq;
        if (this.sessionId) this.deps.service.closeSession(this.sessionId);
        this.session = null;
        this.sessionId = null;
        this.candidates.clear();
        this.selected.clear();
        this.previewed.clear();
        this.activeKey = null;
        this.setScanningState(true);
        this.setStatus(this.tx("discoveryScanning"));
        if (this.preview) this.preview.textContent = this.tx("discoveryPreviewEmpty");
        this.renderList();
        const result = await this.deps.service.discoverCurrentDocument(this.options.docId);
        if (this.closed || seq !== this.scanSeq) return;
        if (!result.ok) {
            this.setScanningState(false);
            this.setStatus(this.failureMessage(result), true);
            this.showRetryReceipt(this.tx("discoveryScanFailed", result.message || this.tx("discoveryUnknown")));
            return;
        }
        this.session = result.data;
        this.sessionId = result.data.id;
        this.candidates = new Map(result.data.candidates.map((candidate) => [candidate.key, candidate]));
        this.setScanningState(false);
        const suffix = result.data.truncated ? ` · ${this.tx("discoveryTruncated")}` : "";
        this.setStatus(`${this.tx("discoveryScanned", String(result.data.scannedBlocks), String(result.data.candidates.length))} · ${this.tx("discoverySkipped", String(result.data.skippedEmpty))}${suffix}`);
        this.renderList();
    }

    private cancelScan(): void {
        this.scanSeq++;
        this.previewSeq++;
        this.deps.service.closeSession();
        this.session = null;
        this.sessionId = null;
        this.candidates.clear();
        this.selected.clear();
        this.activeKey = null;
        this.setScanningState(false);
        this.setStatus(this.tx("discoveryRetry"));
        this.showRetryReceipt(this.tx("discoveryRetry"));
        this.renderList();
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
        if (!visible.length) {
            const empty = document.createElement("div");
            empty.className = "xlc-discovery-empty";
            empty.textContent = this.tx("discoveryNoCandidates");
            list.appendChild(empty);
        }
        for (const candidate of visible) {
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
        this.updateSelectionState();
    }

    private updateSelectionState(): void {
        const count = this.selected.size;
        if (this.selectedLabel) this.selectedLabel.textContent = this.tx("discoverySelected", String(count));
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
                if (!this.sessionId) break;
                const candidate = this.candidates.get(key);
                if (!candidate || !this.canAdd(candidate)) {
                    skipped++;
                    continue;
                }
                if (!(await this.ensurePreview(key)) || !this.sessionId) {
                    failed++;
                    details.push(`${candidate.title}：${this.tx("discoveryReceiptFailed", this.tx("discoveryPreviewEmpty"))}`);
                    continue;
                }
                const result = await this.deps.service.addCandidate(this.sessionId, key, {
                    allowSameContent: this.forceSameContent?.checked === true,
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
            this.setReceipt(`${this.tx("discoveryReceiptBatch", String(added), String(skipped), String(failed))}${details.length ? `\n${details.join("\n")}` : ""}`);
        } finally {
            this.actionBusy = false;
            this.renderList();
        }
    }

    private handleAddResult(key: string, result: AddCandidateResult, showReceipt = true): void {
        const candidate = this.candidates.get(key);
        if (!candidate) return;
        if (result.status === "added") {
            candidate.status = "added";
            candidate.match = {itemId: result.item.id, title: result.item.title};
            this.previewed.add(key);
            this.selected.delete(key);
            this.deps.onAdded?.(result.item.id, result.item.title);
            if (showReceipt) {
                this.setReceipt(this.tx("discoveryReceiptAdded", result.item.title));
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

    private setReceipt(message: string, error = false): void {
        if (!this.receipt) return;
        this.receipt.style.display = message ? "block" : "none";
        this.receipt.textContent = "";
        if (!message) return;
        const title = document.createElement("strong");
        title.textContent = this.tx("discoveryReceiptTitle");
        this.receipt.appendChild(title);
        const body = document.createElement("div");
        body.className = error ? "xlc-status--error" : "";
        body.textContent = message;
        this.receipt.appendChild(body);
    }
}

export function openDiscoveryDialog(deps: DiscoveryDialogDeps, options: DiscoveryDialogOptions): DiscoveryDialogController {
    const dialog = new DiscoveryDialog(deps, options);
    dialog.open();
    return dialog;
}
