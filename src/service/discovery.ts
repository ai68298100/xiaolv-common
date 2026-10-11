// 按需发现：当前文档顶层块只读扫描，候选仅保存在本实例内存中。
import {ATTR, LIMITS} from "../constants";
import type {IKernelClient} from "../kernel/client";
import {deriveSummary, deriveTitle, inferItemType, isBlockId, ItemType} from "../model/item";
import {normalizeKramdownIal} from "../model/kramdown";
import type {CommonItem} from "../model/item";
import type {LibraryConfig} from "../model/storage";
import type {ConditionalDeleteInput, ConditionalDeleteOutcome, IndexBuildOptions, IndexBuildResult, NewItemInput, Receipt} from "./library";

export type DiscoveryReason =
    | "invalid-input"
    | "not-configured"
    | "library-document"
    | "library-boundary-unknown"
    | "invalid-response"
    | "not-found"
    | "source-changed"
    | "content-too-long"
    | "library-check-incomplete"
    | "session-expired"
    | "cancelled"
    | "conflict"
    | "kernel-error"
    | "timeout";

export type DiscoveryReceipt<T> =
    | {ok: true; data: T}
    | {ok: false; reason: DiscoveryReason; message: string};

export type DiscoveryCandidateStatus = "candidate" | "already-in-library" | "same-content" | "library-unverified" | "added";

export interface DiscoveryCandidate {
    key: string;
    sourceDocId: string;
    sourceBlockId: string;
    sourcePath: string;
    itemType: ItemType;
    title: string;
    summary: string;
    status: DiscoveryCandidateStatus;
    match?: {itemId: string; title: string};
}

export interface DiscoverySessionView {
    id: string;
    sourceDocId: string;
    sourcePath: string;
    scope: "document" | "tree" | "notebook" | "all-notebooks";
    scannedDocs?: number;
    scannedNotebooks?: number;
    candidates: DiscoveryCandidate[];
    scannedBlocks: number;
    skippedEmpty: number;
    skippedLong: number;
    truncated: boolean;
    stopped?: boolean;
    truncationReasons: string[];
    errors: Array<{sourcePath: string; message: string}>;
}

export interface DiscoveryProgress {
    phase: "enumerating" | "scanning";
    scannedDocs: number;
    scannedBlocks: number;
    discoveredDocs: number;
    totalDocs?: number;
}

export type DiscoveryProgressCallback = (progress: DiscoveryProgress) => void;

export interface DiscoverCurrentNotebookOptions {
    onProgress?: DiscoveryProgressCallback;
}

export interface DiscoverScopeOptions {
    onProgress?: DiscoveryProgressCallback;
    confirmed?: boolean;
}

export interface DiscoveryPreview {
    candidate: DiscoveryCandidate;
    markdown: string;
    contentComparisonComplete: boolean;
}

export type AddCandidateResult =
    | {status: "added"; item: CommonItem; batchId: string}
    | {status: "already-in-library"; itemId: string; title: string}
    | {status: "same-content"; itemId: string; title: string};

export type UndoBatchSkipReason = "not-found" | "identity-changed" | "edited" | "library-unverified";

export interface UndoBatchResult {
    batchId: string;
    deleted: number;
    deletedItems: Array<{itemId: string; title: string}>;
    alreadyUndone: boolean;
    skipped: Array<{itemId: string; title: string; reason: UndoBatchSkipReason}>;
    failed: Array<{itemId: string; title: string; message: string}>;
}

export interface DiscoveryShutdownResult {
    compensatedItemIds: string[];
    unresolved: Array<{batchId: string; itemId?: string; title: string; message: string}>;
}

interface ChildBlock {
    id: string;
    type: string;
    subType: string;
    content: string;
    markdown: string;
}

interface LibraryPort {
    getConfig(): LibraryConfig | null;
    reindex(options?: IndexBuildOptions): Promise<IndexBuildResult>;
    getItemKramdown(item: CommonItem): Promise<Receipt<string>>;
    createItem(input: NewItemInput, libraryDocId?: string, options?: {batchToken?: string}): Promise<Receipt<{item: CommonItem}>>;
    removeItemsIfUnchanged(batchToken: string, inputs: ConditionalDeleteInput[]): Promise<Receipt<ConditionalDeleteOutcome[]>>;
}

interface InternalCandidate {
    view: DiscoveryCandidate;
    blockType: string;
    subType: string;
    titleAttrs: Record<string, string>;
    previewBlockType?: string;
    previewSubType?: string;
    previewMarkdown?: string;
}

interface InternalSession {
    view: DiscoverySessionView;
    generation: number;
    scopeKind: DiscoverySessionView["scope"];
    notebookIds: Set<string>;
    treeRootDocId?: string;
    treeRootPath?: string;
    candidates: Map<string, InternalCandidate>;
    batches: Map<string, InternalAddBatch>;
    acceptingWrites: boolean;
}

interface InternalAddBatch {
    id: string;
    state: "open" | "ready" | "undoing" | "undone";
    items: Map<string, {item: CommonItem; markdown: string; title: string}>;
}

export interface DiscoveryServiceOptions {
    maxBlocks?: number;
    maxDocs?: number;
    maxNotebooks?: number;
    maxCandidates?: number;
    maxCharacters?: number;
    maxBlockCharacters?: number;
    maxDurationMs?: number;
}

const MAX_DOCS = LIMITS.maxDocs;
const TREE_DEPTH = 3;
const NOTEBOOK_DEPTH = LIMITS.walkDepth;
const DEFAULT_DISCOVERY_BUDGET = {
    maxNotebooks: 20,
    maxDocs: 200,
    maxBlocks: 2000,
    maxCandidates: 500,
    maxCharacters: 2_000_000,
    maxBlockCharacters: 100_000,
    maxDurationMs: 60_000,
} as const;

interface DiscoveryBudget {
    maxNotebooks: number;
    maxDocs: number;
    maxBlocks: number;
    maxCandidates: number;
    maxCharacters: number;
    maxBlockCharacters: number;
    maxDurationMs: number;
}

interface SourceDocument {
    id: string;
    path: string;
    displayPath?: string;
}

function ok<T>(data: T): DiscoveryReceipt<T> {
    return {ok: true, data};
}

function fail<T = never>(reason: DiscoveryReason, message: string): DiscoveryReceipt<T> {
    return {ok: false, reason, message};
}

function errorReceipt<T>(error: unknown): DiscoveryReceipt<T> {
    if ((error as {discoveryReason?: unknown})?.discoveryReason === "timeout") {
        return fail("timeout", (error as Error).message || "discovery time limit reached");
    }
    const name = (error as {name?: unknown})?.name;
    return name === "KernelTimeoutError"
        ? fail("timeout", (error as Error).message || "kernel request timed out")
        : fail("kernel-error", (error as Error)?.message || String(error));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseChildren(data: unknown): {ok: true; children: ChildBlock[]} | {ok: false; message: string} {
    if (!Array.isArray(data)) return {ok: false, message: "getChildBlocks response is not an array"};
    const children: ChildBlock[] = [];
    for (let i = 0; i < data.length; i++) {
        const raw = data[i];
        if (!isRecord(raw) || !isBlockId(raw.id) || typeof raw.type !== "string" || !raw.type.trim()) {
            return {ok: false, message: `getChildBlocks item ${i} has an invalid id or type`};
        }
        if (raw.subType !== undefined && typeof raw.subType !== "string") {
            return {ok: false, message: `getChildBlocks item ${i} has an invalid subType`};
        }
        if (raw.content !== undefined && typeof raw.content !== "string") {
            return {ok: false, message: `getChildBlocks item ${i} has invalid content`};
        }
        if (raw.markdown !== undefined && typeof raw.markdown !== "string") {
            return {ok: false, message: `getChildBlocks item ${i} has invalid markdown`};
        }
        children.push({
            id: raw.id,
            type: raw.type,
            subType: typeof raw.subType === "string" ? raw.subType : "",
            content: typeof raw.content === "string" ? raw.content : "",
            markdown: typeof raw.markdown === "string" ? raw.markdown : "",
        });
    }
    return {ok: true, children};
}

function parseAttrsById(data: unknown): {ok: true; attrs: Record<string, Record<string, string>>} | {ok: false; message: string} {
    if (!isRecord(data)) return {ok: false, message: "batchGetBlockAttrs response is not an object"};
    const attrs: Record<string, Record<string, string>> = {};
    for (const [id, rawAttrs] of Object.entries(data)) {
        if (!isBlockId(id) || !isRecord(rawAttrs)) return {ok: false, message: "batchGetBlockAttrs contains an invalid block entry"};
        const blockAttrs: Record<string, string> = {};
        for (const [key, value] of Object.entries(rawAttrs)) {
            if (typeof value !== "string") return {ok: false, message: `batchGetBlockAttrs contains a non-string value for ${id}`};
            blockAttrs[key] = value;
        }
        attrs[id] = blockAttrs;
    }
    return {ok: true, attrs};
}

function parseDocFiles(data: unknown): {ok: true; files: Array<{id: string; path: string}>} | {ok: false; message: string} {
    if (!isRecord(data) || !Array.isArray(data.files)) return {ok: false, message: "listDocsByPath response has no files array"};
    const files: Array<{id: string; path: string}> = [];
    for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];
        if (!isRecord(file) || !isBlockId(file.id) || typeof file.path !== "string") {
            return {ok: false, message: `listDocsByPath file ${i} has an invalid id or path`};
        }
        files.push({id: file.id, path: file.path});
    }
    return {ok: true, files};
}

function parseNotebooks(data: unknown): {ok: true; notebooks: Array<{id: string; name: string}>} | {ok: false; message: string} {
    const raw = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.notebooks) ? data.notebooks : null;
    if (!raw) return {ok: false, message: "lsNotebooks response has no notebooks array"};
    const notebooks: Array<{id: string; name: string}> = [];
    for (const entry of raw) {
        if (!isRecord(entry) || entry.closed === true || typeof entry.id !== "string" || !isBlockId(entry.id)
            || typeof entry.name !== "string" || !entry.name.trim() || entry.name.startsWith("&nbsp;")) continue;
        notebooks.push({id: entry.id, name: entry.name});
    }
    return {ok: true, notebooks};
}

function clampBudget(value: number | undefined, fallback: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.floor(Number.isFinite(value) ? value as number : fallback)));
}

function makeSessionId(): string {
    const random = Math.floor(Math.random() * 0x100000000).toString(36).padStart(6, "0");
    return `discovery-${Date.now().toString(36)}-${random}`;
}

function makeBatchId(): string {
    const random = Math.floor(Math.random() * 0x100000000).toString(36).padStart(6, "0");
    return `discovery-batch-${Date.now().toString(36)}-${random}`;
}

/**
 * 当前文档发现服务。扫描结果不进入侧车或主索引；只有 addCandidate 会写入专用库。
 * 本服务只接收公开内核客户端和 LibraryService 的结构化能力。
 */
export class DiscoveryService {
    private session: InternalSession | null = null;
    private readonly budget: DiscoveryBudget;
    private scanGeneration = 0;
    private scanDeadline = 0;
    private stopRequestedGeneration: number | null = null;
    private shuttingDown = false;
    private shutdownPromise: Promise<DiscoveryShutdownResult> | null = null;
    private shutdownDeadline = 0;
    private readonly shutdownResult: DiscoveryShutdownResult = {compensatedItemIds: [], unresolved: []};
    private activeCreates = 0;
    private activeCreateDrain: Promise<void> | null = null;
    private resolveActiveCreateDrain: (() => void) | null = null;

    constructor(private readonly kernel: IKernelClient, private readonly library: LibraryPort, options: DiscoveryServiceOptions = {}) {
        this.budget = {
            maxNotebooks: clampBudget(options.maxNotebooks, DEFAULT_DISCOVERY_BUDGET.maxNotebooks, 1, 100),
            maxDocs: clampBudget(options.maxDocs, DEFAULT_DISCOVERY_BUDGET.maxDocs, 1, MAX_DOCS),
            maxBlocks: clampBudget(options.maxBlocks, DEFAULT_DISCOVERY_BUDGET.maxBlocks, 1, 10_000),
            maxCandidates: clampBudget(options.maxCandidates, DEFAULT_DISCOVERY_BUDGET.maxCandidates, 1, 2_000),
            maxCharacters: clampBudget(options.maxCharacters, DEFAULT_DISCOVERY_BUDGET.maxCharacters, 1_000, 20_000_000),
            maxBlockCharacters: clampBudget(options.maxBlockCharacters, DEFAULT_DISCOVERY_BUDGET.maxBlockCharacters, 1_000, LIMITS.contentChars),
            maxDurationMs: clampBudget(options.maxDurationMs, DEFAULT_DISCOVERY_BUDGET.maxDurationMs, 1_000, 120_000),
        };
    }

    async discoverCurrentDocument(docId: string): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        const unavailable = this.scanUnavailable();
        if (unavailable) return unavailable;
        const generation = this.beginScan();
        if (!isBlockId(docId)) return fail("invalid-input", "current document id is invalid");
        const config = this.library.getConfig();
        if (!config) return fail("not-configured", "content library is not configured");

        const location = await this.getDocumentLocation(docId);
        if (this.isCancelled(generation)) return this.cancelled();
        if (this.isStopRequested(generation)) return this.cancelled();
        if (!location.ok) return location;
        if (config.mode === "notebook" && config.notebookIds.includes(location.data.notebookId)) {
            return fail("library-document", "current notebook is configured as the dedicated content library");
        }

        let libraryDocs: Set<string>;
        try {
            libraryDocs = await this.resolveLibraryDocuments(config, generation);
        } catch (error) {
            if (this.isCancelled(generation) || this.isStopRequested(generation)) return this.cancelled();
            if ((error as {discoveryReason?: unknown})?.discoveryReason === "library-boundary-unknown") {
                return fail("library-boundary-unknown", (error as Error).message);
            }
            return errorReceipt(error);
        }
        if (this.isCancelled(generation)) return this.cancelled();
        if (this.isStopRequested(generation)) return this.cancelled();
        if (libraryDocs.has(docId)) return fail("library-document", "current document is part of the configured content library");

        const sourcePath = await this.getDisplayPath(docId, docId);
        if (this.isCancelled(generation)) return this.cancelled();
        return this.scanDocuments([{id: docId, path: sourcePath}], docId, sourcePath, "document", [], generation,
            [location.data.notebookId]);
    }

    async discoverCurrentNotebook(currentDocId: string, options: DiscoverCurrentNotebookOptions = {}): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        const unavailable = this.scanUnavailable();
        if (unavailable) return unavailable;
        const generation = this.beginScan();
        if (!isBlockId(currentDocId)) return fail("invalid-input", "current document id is invalid");
        const location = await this.getDocumentLocation(currentDocId);
        if (this.isCancelled(generation)) return this.cancelled();
        if (this.isStopRequested(generation)) return this.cancelled();
        if (!location.ok) return location;
        const displayPath = await this.getDisplayPath(currentDocId, location.data.path);
        if (this.isCancelled(generation)) return this.cancelled();
        if (this.isStopRequested(generation)) return this.cancelled();
        return this.scanNotebookScope([location.data.notebookId], "notebook", currentDocId, displayPath, generation, options);
    }

    async discoverTree(rootDocId: string, options: DiscoverScopeOptions = {}): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        const unavailable = this.scanUnavailable();
        if (unavailable) return unavailable;
        const generation = this.beginScan();
        if (!isBlockId(rootDocId)) return fail("invalid-input", "tree root document id is invalid");
        const config = this.library.getConfig();
        if (!config) return fail("not-configured", "content library is not configured");
        const location = await this.getDocumentLocation(rootDocId);
        if (this.isCancelled(generation)) return this.cancelled();
        if (this.isStopRequested(generation)) return this.cancelled();
        if (!location.ok) return location;
        const boundary = await this.getLibraryBoundary(config, generation);
        if (!boundary.ok) return boundary;
        if (boundary.data.documents.has(rootDocId)) return fail("library-document", "tree root is part of the configured content library");

        const rootPath = location.data.path;
        const enumerated = await this.enumerateTreeDocuments(rootDocId, rootPath, location.data.notebookId, generation, options.onProgress);
        if (this.isCancelled(generation)) return this.cancelled();
        const docs = enumerated.documents.filter((doc) => !boundary.data.documents.has(doc.id));
        const displayPath = this.isStopRequested(generation) ? rootPath : await this.getDisplayPath(rootDocId, rootPath);
        if (this.isCancelled(generation)) return this.cancelled();
        return this.scanDocuments(docs, rootDocId, displayPath, "tree", enumerated.truncationReasons, generation,
            [location.data.notebookId], options.onProgress, enumerated.errors, {rootDocId, rootPath});
    }

    async discoverNotebook(notebookId: string, options: DiscoverScopeOptions = {}): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        const unavailable = this.scanUnavailable();
        if (unavailable) return unavailable;
        const generation = this.beginScan();
        if (!isBlockId(notebookId)) return fail("invalid-input", "notebook id is invalid");
        let raw: unknown;
        try {
            raw = await this.kernel.request("lsNotebooks", {});
        } catch (error) {
            if (this.isCancelled(generation) || this.isStopRequested(generation)) return this.cancelled();
            return errorReceipt(error);
        }
        if (this.isCancelled(generation) || this.isStopRequested(generation)) return this.cancelled();
        const notebooks = parseNotebooks(raw);
        if (!notebooks.ok) return fail("invalid-response", notebooks.message);
        if (!notebooks.notebooks.some((notebook) => notebook.id === notebookId)) return fail("not-found", "selected notebook is unavailable");
        return this.scanNotebookScope([notebookId], "notebook", notebookId, "", generation, options);
    }

    async discoverAllNotebooks(options: DiscoverScopeOptions = {}): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        const unavailable = this.scanUnavailable();
        if (unavailable) return unavailable;
        if (options.confirmed !== true) return fail("invalid-input", "all-notebooks discovery requires explicit confirmation");
        const generation = this.beginScan();
        let raw: unknown;
        try {
            raw = await this.kernel.request("lsNotebooks", {});
        } catch (error) {
            if (this.isCancelled(generation) || this.isStopRequested(generation)) return this.cancelled();
            return errorReceipt(error);
        }
        if (this.isCancelled(generation) || this.isStopRequested(generation)) return this.cancelled();
        const listed = parseNotebooks(raw);
        if (!listed.ok) return fail("invalid-response", listed.message);
        const config = this.library.getConfig();
        if (!config) return fail("not-configured", "content library is not configured");
        if (this.isCancelled(generation)) return this.cancelled();
        if (this.isStopRequested(generation)) return this.cancelled();
        const libraryNotebookIds = new Set(config.mode === "notebook" ? config.notebookIds : []);
        const available = listed.notebooks.filter((notebook) => !libraryNotebookIds.has(notebook.id));
        const selected = available.slice(0, this.budget.maxNotebooks);
        if (!selected.length) return fail("not-found", "no searchable notebooks are available");
        const notebookLimitReached = available.length > selected.length;
        const result = await this.scanNotebookScope(selected.map(({id}) => id), "all-notebooks", selected[0]?.id ?? "", "", generation, options);
        if (result.ok && notebookLimitReached) {
            result.data.truncated = true;
            result.data.truncationReasons.push("notebooks");
        }
        return result;
    }

    private async scanNotebookScope(
        notebookIds: string[],
        scope: "notebook" | "all-notebooks",
        rootDocId: string,
        rootPath: string,
        generation: number,
        options: DiscoverScopeOptions,
        initialErrors: Array<{sourcePath: string; message: string}> = [],
    ): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        const config = this.library.getConfig();
        if (!config) return fail("not-configured", "content library is not configured");
        if (config.mode === "notebook" && notebookIds.some((id) => config.notebookIds.includes(id))) {
            return fail("library-document", "selected notebook is configured as the dedicated content library");
        }
        const boundary = await this.getLibraryBoundary(config, generation);
        if (!boundary.ok) return boundary;
        const enumerated = await this.enumerateNotebookScope(notebookIds, generation, options.onProgress);
        if (this.isCancelled(generation)) return this.cancelled();
        const docs = enumerated.documents.filter((doc) => !boundary.data.documents.has(doc.id));
        const rootSource = docs.find((doc) => doc.id === rootDocId);
        if (rootSource && rootPath) rootSource.displayPath = rootPath;
        return this.scanDocuments(docs, rootDocId, rootPath || (scope === "all-notebooks" ? "全部笔记本" : rootDocId), scope,
            enumerated.truncationReasons, generation, notebookIds, options.onProgress,
            [...initialErrors, ...enumerated.errors], undefined, enumerated.scannedNotebooks);
    }

    async previewCandidate(sessionId: string, candidateKey: string): Promise<DiscoveryReceipt<DiscoveryPreview>> {
        const sessionResult = this.getSession(sessionId);
        if (!sessionResult.ok) return sessionResult;
        const session = sessionResult.data;
        const isCurrentSession = (): boolean => this.session === session && session.view.id === sessionId;
        const current = this.getCandidate(sessionId, candidateKey);
        if (!current.ok) return current;
        const candidate = current.data.view;
        const scope = await this.validateCandidateScope(session, candidate);
        if (!isCurrentSession()) return fail("session-expired", "discovery session is no longer available");
        if (!scope.ok) return scope;
        const currentBlock = scope;

        let body: unknown;
        try {
            body = await this.kernel.request("getBlockKramdown", {id: candidate.sourceBlockId});
        } catch (error) {
            return errorReceipt(error);
        }
        if (!isCurrentSession()) return fail("session-expired", "discovery session is no longer available");
        if (!isRecord(body) || body.id !== candidate.sourceBlockId || typeof body.kramdown !== "string") {
            return fail("invalid-response", "getBlockKramdown returned an invalid block or body");
        }
        const markdown = normalizeKramdownIal(body.kramdown);
        if (!markdown.trim()) return fail("not-found", "source block is empty");
        if (markdown.length > LIMITS.contentChars) return fail("content-too-long", "source block exceeds the item content limit");

        current.data.previewBlockType = currentBlock.data.type;
        current.data.previewSubType = currentBlock.data.subType;
        current.data.view.itemType = inferItemType(currentBlock.data.type, currentBlock.data.subType, markdown);
        current.data.view.title = deriveTitle(markdown, current.data.view.itemType, current.data.titleAttrs) || candidate.sourceBlockId;
        current.data.view.summary = deriveSummary(markdown);
        current.data.previewMarkdown = markdown;

        const comparison = await this.compareWithLibrary(markdown, candidate.sourceBlockId);
        if (!isCurrentSession()) return fail("session-expired", "discovery session is no longer available");
        if (!comparison.ok) {
            if (comparison.reason === "library-check-incomplete") {
                current.data.view.status = "library-unverified";
                this.refreshSessionCandidate(candidateKey, current.data.view);
                return ok({candidate: {...current.data.view}, markdown, contentComparisonComplete: false});
            }
            return comparison;
        }
        if (comparison.data.sameSource) {
            current.data.view.status = "already-in-library";
            current.data.view.match = {itemId: comparison.data.sameSource.id, title: comparison.data.sameSource.title};
        } else if (!comparison.data.complete) {
            current.data.view.status = "library-unverified";
            delete current.data.view.match;
        } else if (comparison.data.sameContent) {
            current.data.view.status = "same-content";
            current.data.view.match = {itemId: comparison.data.sameContent.id, title: comparison.data.sameContent.title};
        } else {
            current.data.view.status = "candidate";
            delete current.data.view.match;
        }
        this.refreshSessionCandidate(candidateKey, current.data.view);
        return ok({candidate: {...current.data.view}, markdown, contentComparisonComplete: comparison.data.complete});
    }

    beginAddBatch(sessionId: string): DiscoveryReceipt<{batchId: string}> {
        const session = this.getSession(sessionId);
        if (!session.ok) return session;
        if (this.shuttingDown || !session.data.acceptingWrites) return fail("conflict", "discovery session is closing and no longer accepts writes");
        if (session.data.batches.size >= 128) return fail("conflict", "too many discovery batches in this session");
        const batch: InternalAddBatch = {id: makeBatchId(), state: "open", items: new Map()};
        session.data.batches.set(batch.id, batch);
        return ok({batchId: batch.id});
    }

    finishAddBatch(sessionId: string, batchId: string): DiscoveryReceipt<{batchId: string; added: number; discarded: boolean}> {
        const batch = this.getBatch(sessionId, batchId);
        if (!batch.ok) return batch;
        if (this.activeCreates > 0) return fail("conflict", "a discovery write is still in progress; retry after its receipt arrives");
        if (batch.data.state !== "open") return fail("conflict", "discovery batch is not open");
        if (batch.data.items.size === 0) {
            this.session?.batches.delete(batchId);
            return ok({batchId, added: 0, discarded: true});
        }
        batch.data.state = "ready";
        return ok({batchId, added: batch.data.items.size, discarded: false});
    }

    async undoBatch(sessionId: string, batchId: string): Promise<DiscoveryReceipt<UndoBatchResult>> {
        const batchResult = this.getBatch(sessionId, batchId);
        if (!batchResult.ok) return batchResult;
        const batch = batchResult.data;
        if (batch.state === "undone") {
            return ok({batchId, deleted: 0, deletedItems: [], alreadyUndone: true, skipped: [], failed: []});
        }
        if (batch.state !== "ready") return fail("conflict", "discovery batch is not ready to undo");
        if (!batch.items.size) {
            batch.state = "undone";
            return ok({batchId, deleted: 0, deletedItems: [], alreadyUndone: false, skipped: [], failed: []});
        }

        batch.state = "undoing";
        const items = Array.from(batch.items.values());
        let removed: Receipt<ConditionalDeleteOutcome[]>;
        try {
            removed = await this.library.removeItemsIfUnchanged(batchId, items.map(({item, markdown}): ConditionalDeleteInput => ({item, markdown})));
        } catch (error) {
            batch.state = "ready";
            return errorReceipt(error);
        }
        if (!removed.ok) {
            batch.state = "ready";
            return fail(removed.reason, removed.message);
        }

        const byItemId = new Map(items.map((entry) => [entry.item.id, entry]));
        const completed = new Set<string>();
        const skipped: UndoBatchResult["skipped"] = [];
        const failed: UndoBatchResult["failed"] = [];
        const deletedItems: UndoBatchResult["deletedItems"] = [];
        let deleted = 0;
        for (const outcome of removed.data) {
            const entry = byItemId.get(outcome.itemId);
            if (!entry) continue;
            completed.add(outcome.itemId);
            if (outcome.status === "deleted") {
                deleted++;
                deletedItems.push({itemId: outcome.itemId, title: entry.title});
                batch.items.delete(outcome.itemId);
            } else if (outcome.status === "skipped") {
                skipped.push({itemId: outcome.itemId, title: entry.title, reason: outcome.reason});
                if (outcome.reason === "not-found") batch.items.delete(outcome.itemId);
            } else {
                failed.push({itemId: outcome.itemId, title: entry.title, message: outcome.message});
            }
        }
        for (const entry of items) {
            if (!completed.has(entry.item.id)) failed.push({itemId: entry.item.id, title: entry.title, message: "conditional delete returned no outcome"});
        }
        batch.state = batch.items.size === 0 ? "undone" : "ready";
        return ok({batchId, deleted, deletedItems, alreadyUndone: false, skipped, failed});
    }

    async addCandidate(
        sessionId: string,
        candidateKey: string,
        options: {allowSameContent?: boolean; batchId?: string} = {},
    ): Promise<DiscoveryReceipt<AddCandidateResult>> {
        const session = this.session;
        if (!session || session.view.id !== sessionId) return fail("session-expired", "discovery session is no longer available");
        if (this.shuttingDown || !session.acceptingWrites) return fail("conflict", "discovery session is closing and no longer accepts writes");
        const current = this.getCandidate(sessionId, candidateKey);
        if (!current.ok) return current;
        const isCurrentSession = (): boolean => this.session === session && session.view.id === sessionId
            && session.acceptingWrites && !this.shuttingDown;
        const batchResult = options.batchId
            ? this.getBatch(sessionId, options.batchId)
            : null;
        if (batchResult && !batchResult.ok) return batchResult;
        if (batchResult && batchResult.data.state !== "open") return fail("conflict", "discovery batch is not open");
        const {previewMarkdown} = current.data;
        const candidate = current.data.view;
        if (previewMarkdown === undefined) return fail("invalid-input", "preview the candidate before adding it");

        const scope = await this.validateCandidateScope(session, candidate);
        if (!isCurrentSession()) return fail("session-expired", "discovery session was closed before the item could be added");
        if (!scope.ok) return scope;
        const currentBlock = scope;
        const previewBlockType = current.data.previewBlockType ?? current.data.blockType;
        const previewSubType = current.data.previewSubType ?? current.data.subType;
        if (currentBlock.data.type !== previewBlockType || currentBlock.data.subType !== previewSubType) {
            return fail("source-changed", "source block type changed after preview; preview it again before adding");
        }

        let body: unknown;
        try {
            body = await this.kernel.request("getBlockKramdown", {id: candidate.sourceBlockId});
        } catch (error) {
            if (!isCurrentSession()) return fail("session-expired", "discovery session was closed before the item could be added");
            return errorReceipt(error);
        }
        if (!isCurrentSession()) return fail("session-expired", "discovery session was closed before the item could be added");
        if (!isRecord(body) || body.id !== candidate.sourceBlockId || typeof body.kramdown !== "string") {
            return fail("invalid-response", "getBlockKramdown returned an invalid block or body");
        }
        const markdown = normalizeKramdownIal(body.kramdown);
        if (!markdown.trim()) return fail("not-found", "source block is empty");
        if (markdown.length > LIMITS.contentChars) return fail("content-too-long", "source block exceeds the item content limit");
        if (normalizeKramdownIal(markdown) !== normalizeKramdownIal(previewMarkdown)) {
            return fail("source-changed", "source changed after preview; preview it again before adding");
        }

        const comparison = await this.compareWithLibrary(markdown, candidate.sourceBlockId);
        if (!isCurrentSession()) return fail("session-expired", "discovery session was closed before the item could be added");
        if (!comparison.ok) return comparison;
        if (comparison.data.sameSource) {
            current.data.view.status = "already-in-library";
            current.data.view.match = {itemId: comparison.data.sameSource.id, title: comparison.data.sameSource.title};
            this.refreshSessionCandidate(candidateKey, current.data.view);
            return ok({status: "already-in-library", itemId: comparison.data.sameSource.id, title: comparison.data.sameSource.title});
        }
        if (!comparison.data.complete) {
            return fail("library-check-incomplete", "content library could not be fully checked for duplicate content");
        }
        if (comparison.data.sameContent && !options.allowSameContent) {
            current.data.view.status = "same-content";
            current.data.view.match = {itemId: comparison.data.sameContent.id, title: comparison.data.sameContent.title};
            this.refreshSessionCandidate(candidateKey, current.data.view);
            return ok({status: "same-content", itemId: comparison.data.sameContent.id, title: comparison.data.sameContent.title});
        }

        const latestScope = await this.validateCandidateScope(session, candidate);
        if (!isCurrentSession()) return fail("session-expired", "discovery session was closed before the item could be added");
        if (!latestScope.ok) return latestScope;
        if (latestScope.data.type !== previewBlockType || latestScope.data.subType !== previewSubType) {
            return fail("source-changed", "source block type changed after preview; preview it again before adding");
        }

        const itemType = inferItemType(current.data.blockType, current.data.subType, markdown);
        const title = deriveTitle(markdown, itemType, current.data.titleAttrs) || candidate.sourceBlockId;
        const batch = batchResult?.data ?? {id: makeBatchId(), state: "open" as const, items: new Map<string, {item: CommonItem; markdown: string; title: string}>()};
        if (!isCurrentSession()) return fail("session-expired", "discovery session was closed before the item could be added");
        this.beginCreate();
        try {
            let created: Receipt<{item: CommonItem}>;
            try {
                created = await this.library.createItem({
                    itemType,
                    markdown,
                    title,
                    source: {sourceDocId: candidate.sourceDocId, sourceBlockId: candidate.sourceBlockId, sourceType: "block"},
                }, undefined, {batchToken: batch.id});
            } catch (error) {
                if (this.shuttingDown) {
                    this.shutdownResult.unresolved.push({batchId: batch.id, title, message: `create result is unknown: ${(error as Error)?.message || String(error)}`});
                }
                return errorReceipt(error);
            }
            if (!created.ok) {
                if (this.shuttingDown) {
                    this.shutdownResult.unresolved.push({batchId: batch.id, title, message: `create failed during shutdown: ${created.message}`});
                }
                return fail(created.reason, created.message);
            }
            if (!batchResult) {
                batch.state = "ready";
                session.batches.set(batch.id, batch);
            }
            batch.items.set(created.data.item.id, {item: created.data.item, markdown, title: created.data.item.title});
            current.data.view.status = "added";
            current.data.view.match = {itemId: created.data.item.id, title: created.data.item.title};
            this.refreshSessionCandidate(candidateKey, current.data.view);
            if (this.shuttingDown) {
                if (Date.now() < this.shutdownDeadline) {
                    await this.compensateShutdownItem(batch.id, created.data.item, markdown);
                } else {
                    this.shutdownResult.unresolved.push({
                        batchId: batch.id,
                        itemId: created.data.item.id,
                        title: created.data.item.title,
                        message: "shutdown wait budget expired before conditional removal could start",
                    });
                }
                return fail("conflict", "item was created during plugin shutdown; cleanup status is recorded by shutdown");
            }
            return ok({status: "added", item: created.data.item, batchId: batch.id});
        } finally {
            this.endCreate();
        }
    }

    closeSession(sessionId?: string): DiscoveryReceipt<{closed: boolean; activeWrites: number}> {
        const session = this.session;
        if (!session) {
            if (sessionId) return fail("session-expired", "discovery session is no longer available");
            this.scanGeneration++;
            this.stopRequestedGeneration = null;
            return ok({closed: true, activeWrites: 0});
        }
        if (sessionId && session.view.id !== sessionId) return fail("session-expired", "discovery session is no longer available");
        this.scanGeneration++;
        this.stopRequestedGeneration = null;
        session.acceptingWrites = false;
        if (this.activeCreates > 0) {
            return fail("conflict", "a discovery write is still in progress; wait for its receipt, undo it if needed, then close again");
        }
        this.session = null;
        return ok({closed: true, activeWrites: 0});
    }

    requestScanStop(): boolean {
        const generation = this.scanGeneration;
        if (!generation || this.session?.generation === generation) return false;
        this.stopRequestedGeneration = generation;
        return true;
    }

    shutdown(waitBudgetMs = 4200): Promise<DiscoveryShutdownResult> {
        if (this.shutdownPromise) return this.shutdownPromise;
        this.shuttingDown = true;
        this.shutdownDeadline = Date.now() + Math.max(0, waitBudgetMs);
        this.scanGeneration++;
        this.stopRequestedGeneration = null;
        if (this.session) this.session.acceptingWrites = false;
        this.shutdownPromise = this.finishShutdown();
        return this.shutdownPromise;
    }

    private async finishShutdown(): Promise<DiscoveryShutdownResult> {
        if (this.activeCreateDrain) await this.activeCreateDrain;
        this.session = null;
        return {
            compensatedItemIds: [...this.shutdownResult.compensatedItemIds],
            unresolved: this.shutdownResult.unresolved.map((entry) => ({...entry})),
        };
    }

    private scanUnavailable(): DiscoveryReceipt<never> | null {
        if (this.shuttingDown) return fail("conflict", "discovery service is shutting down");
        if (this.activeCreates > 0) return fail("conflict", "a discovery write is still in progress; wait for its receipt before starting another scan");
        if (this.session && !this.session.acceptingWrites) {
            return fail("conflict", "a closing discovery session still has undo receipts; retry close before starting another scan");
        }
        return null;
    }

    private beginCreate(): void {
        if (this.activeCreates === 0) {
            this.activeCreateDrain = new Promise<void>((resolve) => { this.resolveActiveCreateDrain = resolve; });
        }
        this.activeCreates++;
    }

    private endCreate(): void {
        this.activeCreates = Math.max(0, this.activeCreates - 1);
        if (this.activeCreates === 0) {
            this.resolveActiveCreateDrain?.();
            this.resolveActiveCreateDrain = null;
            this.activeCreateDrain = null;
        }
    }

    private async compensateShutdownItem(batchId: string, item: CommonItem, markdown: string): Promise<void> {
        const unresolved = (message: string): void => {
            this.shutdownResult.unresolved.push({batchId, itemId: item.id, title: item.title, message});
        };
        try {
            const result = await this.library.removeItemsIfUnchanged(batchId, [{item, markdown}]);
            if (!result.ok) {
                unresolved(`conditional removal failed: ${result.message}`);
                return;
            }
            const outcome = result.data.find((entry) => entry.itemId === item.id);
            if (outcome?.status === "deleted") {
                this.shutdownResult.compensatedItemIds.push(item.id);
            } else if (outcome?.status === "skipped") {
                unresolved(`conditional removal skipped: ${outcome.reason}`);
            } else if (outcome?.status === "failed") {
                unresolved(`conditional removal failed: ${outcome.message}`);
            } else {
                unresolved("conditional removal returned no outcome");
            }
        } catch (error) {
            unresolved(`conditional removal result is unknown: ${(error as Error)?.message || String(error)}`);
        }
    }

    private async scanDocuments(
        documents: SourceDocument[],
        rootDocId: string,
        rootPath: string,
        scope: DiscoverySessionView["scope"],
        initialTruncationReasons: string[],
        generation: number,
        notebookIds: string[],
        onProgress?: DiscoveryProgressCallback,
        initialErrors: Array<{sourcePath: string; message: string}> = [],
        treeRoot?: {rootDocId: string; rootPath: string},
        scannedNotebooks = notebookIds.length,
    ): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        const scannedDocuments: Array<{
            doc: SourceDocument;
            children: ChildBlock[];
            attrsById: Record<string, Record<string, string>>;
        }> = [];
        let scannedBlocks = 0;
        let scannedDocs = 0;
        let truncated = initialTruncationReasons.length > 0;
        let scannedCharacters = 0;
        let skippedLong = 0;
        const errors = initialErrors.slice();
        const truncationReasons = initialTruncationReasons.slice();
        this.reportProgress(onProgress, {
            phase: "scanning", scannedDocs: 0, scannedBlocks: 0,
            discoveredDocs: documents.length, totalDocs: documents.length,
        });

        for (const doc of documents) {
            if (this.isCancelled(generation)) return this.cancelled();
            if (this.isStopRequested(generation)) break;
            if (!this.withinScanBudget(generation)) {
                truncated = true;
                truncationReasons.push("time");
                break;
            }
            if (scannedBlocks >= this.budget.maxBlocks) {
                truncated = true;
                truncationReasons.push("blocks");
                break;
            }
            let rawChildren: unknown;
            try {
                rawChildren = await this.kernel.request("getChildBlocks", {id: doc.id});
            } catch (error) {
                if (this.isCancelled(generation)) return this.cancelled();
                if (scope === "document") return errorReceipt(error);
                errors.push({sourcePath: doc.displayPath ?? doc.path, message: (error as Error)?.message || String(error)});
                continue;
            }
            if (this.isCancelled(generation)) return this.cancelled();
            if (this.isStopRequested(generation)) break;
            const parsedChildren = parseChildren(rawChildren);
            if (!parsedChildren.ok) {
                if (scope === "document") return fail("invalid-response", parsedChildren.message);
                errors.push({sourcePath: doc.displayPath ?? doc.path, message: parsedChildren.message});
                continue;
            }
            scannedDocs++;
            const remaining = this.budget.maxBlocks - scannedBlocks;
            const scanned = parsedChildren.children.slice(0, remaining);
            if (parsedChildren.children.length > scanned.length) {
                truncated = true;
                truncationReasons.push("blocks");
            }
            scannedBlocks += scanned.length;

            let attrsById: Record<string, Record<string, string>> = {};
            if (scanned.length && this.withinScanBudget(generation) && !this.isStopRequested(generation)) {
                let rawAttrs: unknown;
                try {
                    rawAttrs = await this.kernel.request("batchGetBlockAttrs", {ids: scanned.map((child) => child.id)});
                } catch (error) {
                    if (this.isCancelled(generation)) return this.cancelled();
                    errors.push({sourcePath: doc.displayPath ?? doc.path, message: (error as Error)?.message || String(error)});
                    rawAttrs = null;
                }
                if (this.isCancelled(generation)) return this.cancelled();
                const parsedAttrs = parseAttrsById(rawAttrs);
                if (parsedAttrs.ok) attrsById = parsedAttrs.attrs;
                else if (rawAttrs !== null) errors.push({sourcePath: doc.displayPath ?? doc.path, message: parsedAttrs.message});
            } else if (scanned.length) {
                truncated = true;
                truncationReasons.push("time");
                errors.push({sourcePath: doc.displayPath ?? doc.path, message: "block attributes were not read before the time limit"});
            }
            scannedDocuments.push({doc, children: scanned, attrsById});
            this.reportProgress(onProgress, {
                phase: "scanning", scannedDocs, scannedBlocks,
                discoveredDocs: documents.length, totalDocs: documents.length,
            });
            if (this.isStopRequested(generation)) break;
            if (!this.withinScanBudget(generation)) {
                truncated = true;
                truncationReasons.push("time");
                break;
            }
        }

        let pathCursor = 0;
        const docsWithCandidates = scannedDocuments
            .filter(({children}) => children.some((child) => (child.markdown || child.content).trim()))
            .map(({doc}) => doc);
        const pathWorker = async (): Promise<void> => {
            while (pathCursor < docsWithCandidates.length) {
                if (this.isCancelled(generation) || this.isStopRequested(generation) || !this.withinScanBudget(generation)) return;
                const doc = docsWithCandidates[pathCursor++];
                if (!doc || doc.id === rootDocId) continue;
                doc.displayPath = await this.getDisplayPath(doc.id, doc.id);
            }
        };
        await Promise.all(Array.from({length: Math.min(4, Math.max(1, docsWithCandidates.length))}, () => pathWorker()));
        if (this.isCancelled(generation)) return this.cancelled();

        let index: IndexBuildResult | null = null;
        const startedIndexCheck = !this.isStopRequested(generation) && this.withinScanBudget(generation);
        if (startedIndexCheck) {
            try {
                index = await this.library.reindex({
                    shouldStop: () => this.isCancelled(generation)
                        || this.isStopRequested(generation)
                        || !this.withinScanBudget(generation),
                });
            } catch (error) {
                if (this.isCancelled(generation)) return this.cancelled();
                errors.push({sourcePath: "专用内容库", message: (error as Error)?.message || String(error)});
            }
        } else if (!this.isStopRequested(generation)) {
            truncated = true;
            truncationReasons.push("time");
            errors.push({sourcePath: "专用内容库", message: "duplicate check was skipped at the time limit"});
        }
        if (this.isCancelled(generation)) return this.cancelled();
        if (index?.stopped) {
            if (this.isStopRequested(generation)) {
                errors.push({sourcePath: "专用内容库", message: "duplicate check stopped after the current request"});
            } else if (!this.withinScanBudget(generation)) {
                truncated = true;
                truncationReasons.push("time");
                errors.push({sourcePath: "专用内容库", message: "duplicate check stopped at the time limit"});
            }
        }
        if (startedIndexCheck && !this.withinScanBudget(generation)) {
            index = null;
            truncated = true;
            truncationReasons.push("time");
            errors.push({sourcePath: "专用内容库", message: "duplicate check exceeded the discovery time limit"});
        }
        if (index && (index.truncated || index.errors.length > 0)) {
            const details = index.errors.slice(0, 5);
            if (index.errors.length > details.length) details.push(`and ${index.errors.length - details.length} more errors`);
            if (index.truncated) details.unshift("content library index was truncated");
            errors.push({sourcePath: "专用内容库", message: details.join("; ")});
        }
        const indexComplete = !!index && !index.truncated && index.errors.length === 0;
        const sourceItems = index ? this.itemsBySourceBlock(index) : new Map<string, CommonItem>();
        const candidates = new Map<string, InternalCandidate>();
        let skippedEmpty = 0;
        let candidateLimitReached = false;
        let stopCandidates = false;
        let sequence = 0;

        for (const {doc, children, attrsById} of scannedDocuments) {
            for (const child of children) {
                const brief = child.markdown || child.content;
                if (!brief.trim()) {
                    skippedEmpty++;
                    continue;
                }
                if (brief.length > this.budget.maxBlockCharacters) {
                    skippedLong++;
                    continue;
                }
                if (candidates.size >= this.budget.maxCandidates) {
                    truncated = true;
                    candidateLimitReached = true;
                    stopCandidates = true;
                    break;
                }
                if (scannedCharacters + brief.length > this.budget.maxCharacters) {
                    truncated = true;
                    truncationReasons.push("characters");
                    stopCandidates = true;
                    break;
                }
                scannedCharacters += brief.length;
                const attrs = attrsById[child.id] ?? {};
                const itemType = inferItemType(child.type, child.subType, brief);
                const titleAttrs: Record<string, string> = {};
                const titleAttr = attrs[ATTR.title];
                const aliasAttr = attrs[ATTR.alias];
                if (typeof titleAttr === "string") titleAttrs[ATTR.title] = titleAttr;
                if (typeof aliasAttr === "string") titleAttrs[ATTR.alias] = aliasAttr;
                const title = deriveTitle(brief, itemType, titleAttrs) || child.id;
                const candidate: DiscoveryCandidate = {
                    key: `candidate-${++sequence}`,
                    sourceDocId: doc.id,
                    sourceBlockId: child.id,
                    sourcePath: doc.displayPath ?? doc.id,
                    itemType,
                    title,
                    summary: deriveSummary(brief),
                    status: "candidate",
                };
                const sameSource = sourceItems.get(child.id);
                if (sameSource) {
                    candidate.status = "already-in-library";
                    candidate.match = {itemId: sameSource.id, title: sameSource.title};
                } else if (!indexComplete) {
                    candidate.status = "library-unverified";
                }
                candidates.set(candidate.key, {view: candidate, blockType: child.type, subType: child.subType, titleAttrs});
            }
            if (stopCandidates) break;
        }
        if (candidateLimitReached) truncationReasons.push("candidates");
        const stopped = this.isStopRequested(generation);
        if (stopped) {
            truncated = true;
            truncationReasons.push("cancelled");
        }
        if (!this.withinScanBudget(generation)) {
            truncated = true;
            truncationReasons.push("time");
        }

        const view: DiscoverySessionView = {
            id: makeSessionId(),
            sourceDocId: rootDocId,
            sourcePath: rootPath,
            scope,
            scannedDocs,
            scannedNotebooks,
            candidates: Array.from(candidates.values(), (candidate) => ({...candidate.view})),
            scannedBlocks,
            skippedEmpty,
            skippedLong,
            truncated,
            stopped,
            truncationReasons: Array.from(new Set(truncationReasons)),
            errors,
        };
        if (this.isCancelled(generation)) return this.cancelled();
        this.session = {
            view,
            generation,
            scopeKind: scope,
            notebookIds: new Set(notebookIds),
            treeRootDocId: treeRoot?.rootDocId,
            treeRootPath: treeRoot?.rootPath,
            candidates,
            batches: new Map(),
            acceptingWrites: true,
        };
        return ok(view);
    }

    private async enumerateNotebookScope(
        notebookIds: string[], generation: number, onProgress?: DiscoveryProgressCallback,
    ): Promise<{documents: SourceDocument[]; truncationReasons: string[]; errors: Array<{sourcePath: string; message: string}>; scannedNotebooks: number}> {
        const documents = new Map<string, SourceDocument>();
        const errors: Array<{sourcePath: string; message: string}> = [];
        const queue: Array<{notebookId: string; path: string; depth: number}> = notebookIds.map((notebookId) => ({notebookId, path: "/", depth: 0}));
        const queuedPaths = new Set(queue.map(({notebookId, path}) => `${notebookId}:${path}`));
        const successfulNotebooks = new Set<string>();
        const truncationReasons = new Set<string>();

        while (queue.length) {
            if (this.isCancelled(generation)) break;
            if (this.isStopRequested(generation)) break;
            if (!this.withinScanBudget(generation)) {
                truncationReasons.add("time");
                errors.push({sourcePath: "", message: "discovery time limit reached while listing documents"});
                break;
            }
            const node = queue.shift();
            if (!node) continue;
            if (node.depth >= NOTEBOOK_DEPTH) {
                truncationReasons.add("scope-document-depth");
                continue;
            }
            let raw: unknown;
            try {
                raw = await this.kernel.request("listDocsByPath", {notebook: node.notebookId, path: node.path});
            } catch (error) {
                if (this.isCancelled(generation)) break;
                errors.push({sourcePath: node.path, message: (error as Error)?.message || String(error)});
                continue;
            }
            if (this.isCancelled(generation)) break;
            if (!this.withinScanBudget(generation)) {
                truncationReasons.add("time");
                errors.push({sourcePath: node.path, message: "discovery time limit reached while listing documents"});
                break;
            }
            const parsed = parseDocFiles(raw);
            if (!parsed.ok) {
                errors.push({sourcePath: node.path, message: parsed.message});
                continue;
            }
            successfulNotebooks.add(node.notebookId);
            for (const file of parsed.files) {
                if (!documents.has(file.id)) {
                    if (documents.size >= this.budget.maxDocs) {
                        truncationReasons.add("documents");
                        break;
                    }
                    documents.set(file.id, {id: file.id, path: file.path});
                }
                const key = `${node.notebookId}:${file.path}`;
                if (file.path && !queuedPaths.has(key)) {
                    queuedPaths.add(key);
                    queue.push({notebookId: node.notebookId, path: file.path, depth: node.depth + 1});
                }
            }
            this.reportProgress(onProgress, {phase: "enumerating", scannedDocs: 0, scannedBlocks: 0, discoveredDocs: documents.size});
            if (documents.size >= this.budget.maxDocs && queue.length) {
                truncationReasons.add("documents");
                break;
            }
        }
        return {documents: Array.from(documents.values()), truncationReasons: Array.from(truncationReasons), errors, scannedNotebooks: successfulNotebooks.size};
    }

    private async enumerateTreeDocuments(
        rootDocId: string, rootPath: string, notebookId: string, generation: number, onProgress?: DiscoveryProgressCallback,
    ): Promise<{documents: SourceDocument[]; truncationReasons: string[]; errors: Array<{sourcePath: string; message: string}>}> {
        const documents = new Map<string, SourceDocument>([[rootDocId, {id: rootDocId, path: rootPath}]]);
        const queue: Array<{path: string; depth: number}> = [{path: rootPath, depth: 0}];
        const queuedPaths = new Set([rootPath]);
        const errors: Array<{sourcePath: string; message: string}> = [];
        const truncationReasons = new Set<string>();
        while (queue.length) {
            if (this.isCancelled(generation)) break;
            if (this.isStopRequested(generation)) break;
            if (!this.withinScanBudget(generation)) {
                truncationReasons.add("time");
                errors.push({sourcePath: rootPath, message: "discovery time limit reached while listing the document tree"});
                break;
            }
            const node = queue.shift();
            if (!node) continue;
            if (node.depth >= TREE_DEPTH) { truncationReasons.add("scope-document-depth"); continue; }
            let raw: unknown;
            try {
                raw = await this.kernel.request("listDocsByPath", {notebook: notebookId, path: node.path});
            } catch (error) {
                if (this.isCancelled(generation)) break;
                errors.push({sourcePath: node.path, message: (error as Error)?.message || String(error)});
                continue;
            }
            if (!this.withinScanBudget(generation)) {
                truncationReasons.add("time");
                errors.push({sourcePath: node.path, message: "discovery time limit reached while listing the document tree"});
                break;
            }
            const parsed = parseDocFiles(raw);
            if (!parsed.ok) { errors.push({sourcePath: node.path, message: parsed.message}); continue; }
            for (const file of parsed.files) {
                if (!documents.has(file.id)) {
                    if (documents.size >= this.budget.maxDocs) { truncationReasons.add("documents"); break; }
                    documents.set(file.id, {id: file.id, path: file.path});
                }
                if (file.path && !queuedPaths.has(file.path)) {
                    queuedPaths.add(file.path);
                    queue.push({path: file.path, depth: node.depth + 1});
                }
            }
            this.reportProgress(onProgress, {phase: "enumerating", scannedDocs: 0, scannedBlocks: 0, discoveredDocs: documents.size});
            if (documents.size >= this.budget.maxDocs && queue.length) { truncationReasons.add("documents"); break; }
        }
        return {documents: Array.from(documents.values()), truncationReasons: Array.from(truncationReasons), errors};
    }

    private isCancelled(generation: number): boolean {
        return generation !== this.scanGeneration;
    }

    private beginScan(): number {
        const generation = ++this.scanGeneration;
        this.stopRequestedGeneration = null;
        this.scanDeadline = Date.now() + this.budget.maxDurationMs;
        return generation;
    }

    private isStopRequested(generation: number): boolean {
        return this.stopRequestedGeneration === generation;
    }

    private withinScanBudget(generation: number): boolean {
        return generation === this.scanGeneration && Date.now() < this.scanDeadline;
    }

    private async getLibraryBoundary(config: LibraryConfig, generation: number): Promise<DiscoveryReceipt<{documents: Set<string>}>> {
        try {
            return ok({documents: await this.resolveLibraryDocuments(config, generation)});
        } catch (error) {
            if (this.isCancelled(generation) || this.isStopRequested(generation)) return this.cancelled();
            if ((error as {discoveryReason?: unknown})?.discoveryReason === "library-boundary-unknown") {
                return fail("library-boundary-unknown", (error as Error).message);
            }
            return errorReceipt(error);
        }
    }

    private async isDocumentWithinTree(docId: string, rootDocId: string, rootPath: string): Promise<DiscoveryReceipt<boolean>> {
        if (docId === rootDocId) return ok(true);
        const location = await this.getDocumentLocation(docId);
        if (!location.ok) return location;
        const root = await this.getDocumentLocation(rootDocId);
        if (!root.ok) return root;
        if (location.data.notebookId !== root.data.notebookId) return ok(false);
        const candidatePath = location.data.path.replace(/\/+$/, "");
        const normalizedRoot = (rootPath || root.data.path).replace(/\/+$/, "");
        return ok(candidatePath.startsWith(`${normalizedRoot}/`));
    }

    private reportProgress(callback: DiscoveryProgressCallback | undefined, progress: DiscoveryProgress): void {
        try {
            callback?.({...progress});
        } catch {
            // UI observers must not interrupt a read-only discovery scan.
        }
    }

    private cancelled(): DiscoveryReceipt<never> {
        return fail("cancelled", "discovery scan was cancelled");
    }

    private async getDisplayPath(docId: string, fallback: string): Promise<string> {
        try {
            const path = await this.kernel.request<unknown>("getFullHPathByID", {id: docId});
            return typeof path === "string" && path.trim() ? path : fallback;
        } catch {
            return fallback;
        }
    }

    private async getDocumentLocation(docId: string): Promise<DiscoveryReceipt<{notebookId: string; path: string}>> {
        let info: unknown;
        try {
            info = await this.kernel.request("getBlockInfo", {id: docId});
        } catch (error) {
            return errorReceipt(error);
        }
        if (!isRecord(info) || typeof info.box !== "string" || !isBlockId(info.box)
            || typeof info.path !== "string" || !info.path.trim() || !info.path.startsWith("/")) {
            return fail("invalid-response", "getBlockInfo did not identify the document notebook and path");
        }
        return ok({notebookId: info.box, path: info.path});
    }

    private async validateCandidateScope(
        session: InternalSession,
        candidate: DiscoveryCandidate,
    ): Promise<DiscoveryReceipt<ChildBlock>> {
        if (session.view.scope === "document" && candidate.sourceDocId !== session.view.sourceDocId) {
            return fail("source-changed", "candidate is outside the scanned document");
        }

        const location = await this.getDocumentLocation(candidate.sourceDocId);
        if (!location.ok) return location;
        if (!session.notebookIds.has(location.data.notebookId)) {
            return fail("source-changed", "source document moved outside the scanned notebook scope");
        }
        if (session.treeRootDocId) {
            const withinTree = await this.isDocumentWithinTree(candidate.sourceDocId, session.treeRootDocId, session.treeRootPath || "");
            if (!withinTree.ok) return withinTree;
            if (!withinTree.data) return fail("source-changed", "source document moved outside the scanned document tree");
        }

        const config = this.library.getConfig();
        if (!config) return fail("not-configured", "content library is not configured");
        if (config.mode === "notebook" && config.notebookIds.includes(location.data.notebookId)) {
            return fail("library-document", "source document belongs to the dedicated content library notebook");
        }

        let libraryDocs: Set<string>;
        try {
            libraryDocs = await this.resolveLibraryDocuments(config);
        } catch (error) {
            if ((error as {discoveryReason?: unknown})?.discoveryReason === "library-boundary-unknown") {
                return fail("library-boundary-unknown", (error as Error).message);
            }
            return errorReceipt(error);
        }
        if (libraryDocs.has(candidate.sourceDocId)) {
            return fail("library-document", "source document is part of the configured content library");
        }

        const block = await this.getCurrentTopLevelBlock(candidate.sourceDocId, candidate.sourceBlockId);
        if (!block.ok) return block;
        if (!block.data) return fail("not-found", "source block no longer exists at the top level of this document");
        return ok(block.data);
    }

    private async compareWithLibrary(markdown: string, sourceBlockId: string): Promise<DiscoveryReceipt<{
        sameSource: CommonItem | null;
        sameContent: CommonItem | null;
        complete: boolean;
    }>> {
        let index: IndexBuildResult;
        try {
            index = await this.library.reindex();
        } catch (error) {
            return errorReceipt(error);
        }
        if (index.truncated || index.errors.length > 0) {
            return fail("library-check-incomplete", "content library could not be fully checked for duplicates");
        }
        const sourceItems = this.itemsBySourceBlock(index);
        const sameSource = sourceItems.get(sourceBlockId) ?? null;
        if (sameSource) return ok({sameSource, sameContent: null, complete: true});

        const summary = deriveSummary(markdown);
        const matches = Array.from(index.items.values()).filter((item) => item.summary === summary);
        let sameContent: CommonItem | null = null;
        let failedReads = 0;
        let cursor = 0;
        const worker = async (): Promise<void> => {
            while (cursor < matches.length && !sameContent) {
                const item = matches[cursor++];
                if (!item) continue;
                try {
                    const body = await this.library.getItemKramdown(item);
                    if (body.ok && normalizeKramdownIal(body.data) === normalizeKramdownIal(markdown)) sameContent = item;
                    else if (!body.ok) failedReads++;
                } catch {
                    failedReads++;
                }
            }
        };
        await Promise.all(Array.from({length: Math.min(4, Math.max(1, matches.length))}, () => worker()));
        return ok({sameSource: null, sameContent, complete: failedReads === 0});
    }

    private itemsBySourceBlock(index: IndexBuildResult): Map<string, CommonItem> {
        const items = new Map<string, CommonItem>();
        for (const item of index.items.values()) {
            if (item.source.sourceBlockId) items.set(item.source.sourceBlockId, item);
        }
        return items;
    }

    private async getCurrentTopLevelBlock(docId: string, blockId: string): Promise<DiscoveryReceipt<ChildBlock | null>> {
        let raw: unknown;
        try {
            raw = await this.kernel.request("getChildBlocks", {id: docId});
        } catch (error) {
            return errorReceipt(error);
        }
        const parsed = parseChildren(raw);
        if (!parsed.ok) return fail("invalid-response", parsed.message);
        return ok(parsed.children.find((child) => child.id === blockId) ?? null);
    }

    private getCandidate(sessionId: string, candidateKey: string): DiscoveryReceipt<InternalCandidate> {
        const session = this.getSession(sessionId);
        if (!session.ok) return session;
        const candidate = session.data.candidates.get(candidateKey);
        return candidate ? ok(candidate) : fail("not-found", "discovery candidate was not found");
    }

    private getSession(sessionId: string): DiscoveryReceipt<InternalSession> {
        if (!this.session || this.session.view.id !== sessionId) return fail("session-expired", "discovery session is no longer available");
        return ok(this.session);
    }

    private getBatch(sessionId: string, batchId: string): DiscoveryReceipt<InternalAddBatch> {
        if (typeof batchId !== "string" || !batchId) return fail("invalid-input", "discovery batch id is required");
        const session = this.getSession(sessionId);
        if (!session.ok) return session;
        const batch = session.data.batches.get(batchId);
        return batch ? ok(batch) : fail("not-found", "discovery batch was not found");
    }

    private refreshSessionCandidate(candidateKey: string, candidate: DiscoveryCandidate): void {
        if (!this.session) return;
        const stored = this.session.candidates.get(candidateKey);
        if (stored) stored.view = candidate;
        this.session.view.candidates = Array.from(this.session.candidates.values(), (entry) => ({...entry.view}));
    }

    private async resolveLibraryDocuments(config: LibraryConfig, generation?: number): Promise<Set<string>> {
        const ensureActive = (): void => {
            if (generation === undefined) return;
            if (this.isCancelled(generation) || this.isStopRequested(generation)) throw this.cancelledError();
            if (!this.withinScanBudget(generation)) throw this.timeoutError();
        };
        ensureActive();
        const docs = new Set<string>();
        if (config.mode !== "doc" && config.mode !== "tree" && config.mode !== "notebook") {
            throw this.boundaryError("configured library mode is unknown");
        }
        for (const docId of [...config.containerDocIds, ...config.createdDocIds]) {
            if (!isBlockId(docId)) throw this.boundaryError("configured library contains an invalid document id");
            docs.add(docId);
        }
        if (config.mode === "notebook") {
            if (!config.notebookIds.length) throw this.boundaryError("configured notebooks are unavailable");
            for (const notebookId of config.notebookIds) {
                ensureActive();
                let response: unknown;
                try {
                    response = await this.kernel.request("listDocsByPath", {notebook: notebookId, path: "/"});
                } catch (error) {
                    ensureActive();
                    throw this.boundaryError(`cannot identify library root documents: ${(error as Error).message}`);
                }
                ensureActive();
                const parsed = parseDocFiles(response);
                if (!parsed.ok) throw this.boundaryError(parsed.message);
                for (const file of parsed.files) docs.add(file.id);
            }
            return docs;
        }
        if (config.mode === "doc") {
            if (!config.containerDocIds.length) throw this.boundaryError("configured library has no document identity");
            return docs;
        }
        if (!config.containerDocIds.length) throw this.boundaryError("configured library tree has no root document");
        if (docs.size > MAX_DOCS) throw this.boundaryError("configured library tree exceeds the document boundary limit");
        const queue: Array<{box: string; path: string; depth: number}> = [];
        for (const rootId of config.containerDocIds) {
            ensureActive();
            let info: unknown;
            try {
                info = await this.kernel.request("getBlockInfo", {id: rootId});
            } catch (error) {
                ensureActive();
                throw this.boundaryError(`cannot identify configured library tree: ${(error as Error).message}`);
            }
            ensureActive();
            if (!isRecord(info) || typeof info.box !== "string" || !info.box || typeof info.path !== "string" || !info.path) {
                throw this.boundaryError("getBlockInfo did not identify the configured library tree");
            }
            queue.push({box: info.box, path: info.path, depth: 0});
        }
        while (queue.length) {
            ensureActive();
            const node = queue.shift();
            if (!node || node.depth >= TREE_DEPTH) continue;
            if (docs.size >= MAX_DOCS) throw this.boundaryError("configured library tree exceeds the document boundary limit");
            let response: unknown;
            try {
                response = await this.kernel.request("listDocsByPath", {notebook: node.box, path: node.path});
            } catch (error) {
                ensureActive();
                throw this.boundaryError(`cannot identify configured library tree: ${(error as Error).message}`);
            }
            ensureActive();
            const parsed = parseDocFiles(response);
            if (!parsed.ok) throw this.boundaryError(parsed.message);
            for (const file of parsed.files) {
                if (docs.size >= MAX_DOCS && !docs.has(file.id)) throw this.boundaryError("configured library tree exceeds the document boundary limit");
                if (docs.has(file.id)) continue;
                docs.add(file.id);
                queue.push({box: node.box, path: file.path, depth: node.depth + 1});
            }
        }
        return docs;
    }

    private boundaryError(message: string): Error & {discoveryReason: string} {
        return Object.assign(new Error(message), {discoveryReason: "library-boundary-unknown"});
    }

    private cancelledError(): Error & {discoveryReason: string} {
        return Object.assign(new Error("discovery scan was cancelled"), {discoveryReason: "cancelled"});
    }

    private timeoutError(): Error & {discoveryReason: string} {
        return Object.assign(new Error("discovery time limit reached"), {discoveryReason: "timeout"});
    }
}
