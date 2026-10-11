// 按需发现：当前文档顶层块只读扫描，候选仅保存在本实例内存中。
import {ATTR, LIMITS} from "../constants";
import type {IKernelClient} from "../kernel/client";
import {deriveSummary, deriveTitle, inferItemType, isBlockId, ItemType} from "../model/item";
import type {CommonItem} from "../model/item";
import type {LibraryConfig} from "../model/storage";
import type {IndexBuildResult, NewItemInput, Receipt} from "./library";

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
    candidates: DiscoveryCandidate[];
    scannedBlocks: number;
    skippedEmpty: number;
    truncated: boolean;
}

export interface DiscoveryPreview {
    candidate: DiscoveryCandidate;
    markdown: string;
    contentComparisonComplete: boolean;
}

export type AddCandidateResult =
    | {status: "added"; item: CommonItem}
    | {status: "already-in-library"; itemId: string; title: string}
    | {status: "same-content"; itemId: string; title: string};

interface ChildBlock {
    id: string;
    type: string;
    subType: string;
    content: string;
    markdown: string;
}

interface LibraryPort {
    getConfig(): LibraryConfig | null;
    reindex(): Promise<IndexBuildResult>;
    getItemKramdown(item: CommonItem): Promise<Receipt<string>>;
    createItem(input: NewItemInput): Promise<Receipt<{item: CommonItem}>>;
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
    candidates: Map<string, InternalCandidate>;
}

export interface DiscoveryServiceOptions {
    maxBlocks?: number;
}

const MAX_DOCS = LIMITS.maxDocs;
const TREE_DEPTH = 3;

function ok<T>(data: T): DiscoveryReceipt<T> {
    return {ok: true, data};
}

function fail<T = never>(reason: DiscoveryReason, message: string): DiscoveryReceipt<T> {
    return {ok: false, reason, message};
}

function errorReceipt<T>(error: unknown): DiscoveryReceipt<T> {
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

function normalizeKramdown(markdown: string): string {
    return markdown.replace(/\r\n?/g, "\n").trim();
}

function makeSessionId(): string {
    const random = Math.floor(Math.random() * 0x100000000).toString(36).padStart(6, "0");
    return `discovery-${Date.now().toString(36)}-${random}`;
}

/**
 * 当前文档发现服务。扫描结果不进入侧车或主索引；只有 addCandidate 会写入专用库。
 * 本服务只接收公开内核客户端和 LibraryService 的结构化能力。
 */
export class DiscoveryService {
    private session: InternalSession | null = null;
    private readonly maxBlocks: number;

    constructor(private readonly kernel: IKernelClient, private readonly library: LibraryPort, options: DiscoveryServiceOptions = {}) {
        this.maxBlocks = Math.max(1, Math.min(LIMITS.maxItems, Math.floor(options.maxBlocks ?? LIMITS.maxItems)));
    }

    async discoverCurrentDocument(docId: string): Promise<DiscoveryReceipt<DiscoverySessionView>> {
        if (!isBlockId(docId)) return fail("invalid-input", "current document id is invalid");
        const config = this.library.getConfig();
        if (!config) return fail("not-configured", "content library is not configured");

        let libraryDocs: Set<string>;
        try {
            libraryDocs = await this.resolveLibraryDocuments(config);
        } catch (error) {
            if ((error as {discoveryReason?: unknown})?.discoveryReason === "library-boundary-unknown") {
                return fail("library-boundary-unknown", (error as Error).message);
            }
            return errorReceipt(error);
        }
        if (libraryDocs.has(docId)) return fail("library-document", "current document is part of the configured content library");

        let sourcePath = docId;
        try {
            const path = await this.kernel.request<unknown>("getFullHPathByID", {id: docId});
            if (typeof path === "string" && path.trim()) sourcePath = path;
        } catch {
            // The ID remains a reliable source locator when the display path is unavailable.
        }

        let rawChildren: unknown;
        try {
            rawChildren = await this.kernel.request("getChildBlocks", {id: docId});
        } catch (error) {
            return errorReceipt(error);
        }
        const parsedChildren = parseChildren(rawChildren);
        if (!parsedChildren.ok) return fail("invalid-response", parsedChildren.message);
        const allChildren = parsedChildren.children;
        const scanned = allChildren.slice(0, this.maxBlocks);
        const truncated = allChildren.length > scanned.length;

        let attrsById: Record<string, Record<string, string>> = {};
        if (scanned.length) {
            let rawAttrs: unknown;
            try {
                rawAttrs = await this.kernel.request("batchGetBlockAttrs", {ids: scanned.map((child) => child.id)});
            } catch (error) {
                return errorReceipt(error);
            }
            const parsedAttrs = parseAttrsById(rawAttrs);
            if (!parsedAttrs.ok) return fail("invalid-response", parsedAttrs.message);
            attrsById = parsedAttrs.attrs;
        }

        let index: IndexBuildResult;
        try {
            index = await this.library.reindex();
        } catch (error) {
            return errorReceipt(error);
        }
        const indexComplete = !index.truncated && index.errors.length === 0;
        const sourceItems = this.itemsBySourceBlock(index);
        const candidates = new Map<string, InternalCandidate>();
        let skippedEmpty = 0;
        let sequence = 0;

        for (const child of scanned) {
            const brief = child.markdown || child.content;
            if (!brief.trim()) {
                skippedEmpty++;
                continue;
            }
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
                sourceDocId: docId,
                sourceBlockId: child.id,
                sourcePath,
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

        const view: DiscoverySessionView = {
            id: makeSessionId(),
            sourceDocId: docId,
            sourcePath,
            candidates: Array.from(candidates.values(), (candidate) => ({...candidate.view})),
            scannedBlocks: scanned.length,
            skippedEmpty,
            truncated,
        };
        this.session = {view, candidates};
        return ok(view);
    }

    async previewCandidate(sessionId: string, candidateKey: string): Promise<DiscoveryReceipt<DiscoveryPreview>> {
        const current = this.getCandidate(sessionId, candidateKey);
        if (!current.ok) return current;
        const candidate = current.data.view;
        const currentBlock = await this.getCurrentTopLevelBlock(candidate.sourceDocId, candidate.sourceBlockId);
        if (!currentBlock.ok) return currentBlock;
        if (!currentBlock.data) return fail("not-found", "source block no longer exists at the top level of this document");

        let body: unknown;
        try {
            body = await this.kernel.request("getBlockKramdown", {id: candidate.sourceBlockId});
        } catch (error) {
            return errorReceipt(error);
        }
        if (!isRecord(body) || body.id !== candidate.sourceBlockId || typeof body.kramdown !== "string") {
            return fail("invalid-response", "getBlockKramdown returned an invalid block or body");
        }
        const markdown = body.kramdown;
        if (!markdown.trim()) return fail("not-found", "source block is empty");
        if (markdown.length > LIMITS.contentChars) return fail("content-too-long", "source block exceeds the item content limit");

        current.data.previewBlockType = currentBlock.data.type;
        current.data.previewSubType = currentBlock.data.subType;
        current.data.view.itemType = inferItemType(currentBlock.data.type, currentBlock.data.subType, markdown);
        current.data.view.title = deriveTitle(markdown, current.data.view.itemType, current.data.titleAttrs) || candidate.sourceBlockId;
        current.data.view.summary = deriveSummary(markdown);
        current.data.previewMarkdown = markdown;

        const comparison = await this.compareWithLibrary(markdown, candidate.sourceBlockId);
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

    async addCandidate(sessionId: string, candidateKey: string, options: {allowSameContent?: boolean} = {}): Promise<DiscoveryReceipt<AddCandidateResult>> {
        const current = this.getCandidate(sessionId, candidateKey);
        if (!current.ok) return current;
        const {previewMarkdown} = current.data;
        const candidate = current.data.view;
        if (previewMarkdown === undefined) return fail("invalid-input", "preview the candidate before adding it");

        const currentBlock = await this.getCurrentTopLevelBlock(candidate.sourceDocId, candidate.sourceBlockId);
        if (!currentBlock.ok) return currentBlock;
        if (!currentBlock.data) return fail("not-found", "source block no longer exists at the top level of this document");
        const previewBlockType = current.data.previewBlockType ?? current.data.blockType;
        const previewSubType = current.data.previewSubType ?? current.data.subType;
        if (currentBlock.data.type !== previewBlockType || currentBlock.data.subType !== previewSubType) {
            return fail("source-changed", "source block type changed after preview; preview it again before adding");
        }

        let body: unknown;
        try {
            body = await this.kernel.request("getBlockKramdown", {id: candidate.sourceBlockId});
        } catch (error) {
            return errorReceipt(error);
        }
        if (!isRecord(body) || body.id !== candidate.sourceBlockId || typeof body.kramdown !== "string") {
            return fail("invalid-response", "getBlockKramdown returned an invalid block or body");
        }
        const markdown = body.kramdown;
        if (!markdown.trim()) return fail("not-found", "source block is empty");
        if (markdown.length > LIMITS.contentChars) return fail("content-too-long", "source block exceeds the item content limit");
        if (normalizeKramdown(markdown) !== normalizeKramdown(previewMarkdown)) {
            return fail("source-changed", "source changed after preview; preview it again before adding");
        }

        const comparison = await this.compareWithLibrary(markdown, candidate.sourceBlockId);
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

        const itemType = inferItemType(current.data.blockType, current.data.subType, markdown);
        const title = deriveTitle(markdown, itemType, current.data.titleAttrs) || candidate.sourceBlockId;
        let created: Receipt<{item: CommonItem}>;
        try {
            created = await this.library.createItem({
                itemType,
                markdown,
                title,
                source: {sourceDocId: candidate.sourceDocId, sourceBlockId: candidate.sourceBlockId, sourceType: "block"},
            });
        } catch (error) {
            return errorReceipt(error);
        }
        if (!created.ok) return fail(created.reason, created.message);
        current.data.view.status = "added";
        current.data.view.match = {itemId: created.data.item.id, title: created.data.item.title};
        this.refreshSessionCandidate(candidateKey, current.data.view);
        return ok({status: "added", item: created.data.item});
    }

    closeSession(sessionId?: string): void {
        if (!sessionId || this.session?.view.id === sessionId) this.session = null;
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
                    if (body.ok && normalizeKramdown(body.data) === normalizeKramdown(markdown)) sameContent = item;
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
        if (!this.session || this.session.view.id !== sessionId) return fail("session-expired", "discovery session is no longer available");
        const candidate = this.session.candidates.get(candidateKey);
        return candidate ? ok(candidate) : fail("not-found", "discovery candidate was not found");
    }

    private refreshSessionCandidate(candidateKey: string, candidate: DiscoveryCandidate): void {
        if (!this.session) return;
        const stored = this.session.candidates.get(candidateKey);
        if (stored) stored.view = candidate;
        this.session.view.candidates = Array.from(this.session.candidates.values(), (entry) => ({...entry.view}));
    }

    private async resolveLibraryDocuments(config: LibraryConfig): Promise<Set<string>> {
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
                let response: unknown;
                try {
                    response = await this.kernel.request("listDocsByPath", {notebook: notebookId, path: "/"});
                } catch (error) {
                    throw this.boundaryError(`cannot identify library root documents: ${(error as Error).message}`);
                }
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
            let info: unknown;
            try {
                info = await this.kernel.request("getBlockInfo", {id: rootId});
            } catch (error) {
                throw this.boundaryError(`cannot identify configured library tree: ${(error as Error).message}`);
            }
            if (!isRecord(info) || typeof info.box !== "string" || !info.box || typeof info.path !== "string" || !info.path) {
                throw this.boundaryError("getBlockInfo did not identify the configured library tree");
            }
            queue.push({box: info.box, path: info.path, depth: 0});
        }
        while (queue.length) {
            const node = queue.shift();
            if (!node || node.depth >= TREE_DEPTH) continue;
            if (docs.size >= MAX_DOCS) throw this.boundaryError("configured library tree exceeds the document boundary limit");
            let response: unknown;
            try {
                response = await this.kernel.request("listDocsByPath", {notebook: node.box, path: node.path});
            } catch (error) {
                throw this.boundaryError(`cannot identify configured library tree: ${(error as Error).message}`);
            }
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
}
