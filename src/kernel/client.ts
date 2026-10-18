// 内核 HTTP 客户端：端点白名单 + 超时 + 非零 code 抛错。
// 只允许本文件登记的官方端点；新增端点须先在上游 kernel/api/router.go 核对请求/响应结构。
import {LIMITS} from "../constants";

export type KernelPayload = Record<string, unknown>;

/**
 * 错误分类供 UI/服务层决定降级和重试策略。`kernel` 表示宿主返回了可读的非零 code，
 * 而 `network`/`timeout` 表示请求没有得到可用的宿主响应。
 */
export type KernelErrorKind = "network" | "timeout" | "auth" | "permission" | "validation" | "kernel" | "cancelled" | "stale" | "unknown";

export interface KernelRequestOptions {
    /** 每个逻辑请求的稳定键。相同键的进行中请求会共享同一 Promise。 */
    dedupeKey?: string;
    /** 让同一逻辑通道上的新请求取消旧请求，避免旧响应覆盖新查询。 */
    raceKey?: string;
    latest?: boolean;
    /** 外部取消（页面卸载、用户停止扫描等）。 */
    signal?: AbortSignal;
    /** 覆盖默认最大重试次数；仅网络/超时错误会重试。 */
    maxRetries?: number;
    /** 写操作建议传入稳定幂等键；客户端用它防止双击产生重复在途请求。 */
    idempotencyKey?: string;
    timeoutMs?: number;
}

export class KernelError extends Error {
    public readonly kind: KernelErrorKind;

    constructor(public readonly code: string | number, message: string, kind?: KernelErrorKind) {
        super(message);
        this.name = "KernelError";
        this.kind = kind ?? classifyKernelError(code, message);
    }
}

export class KernelTimeoutError extends Error {
    public readonly kind = "timeout" as const;
    constructor() {
        super("kernel request timed out");
        this.name = "KernelTimeoutError";
    }
}

export class KernelCancelledError extends Error {
    public readonly kind = "cancelled" as const;
    constructor() {
        super("kernel request cancelled");
        this.name = "KernelCancelledError";
    }
}

/** 被后续 latest 请求取代；调用方应丢弃本次响应并等待新请求。 */
export class KernelStaleError extends Error {
    public readonly kind = "stale" as const;
    constructor() {
        super("kernel response superseded by a newer request");
        this.name = "KernelStaleError";
    }
}

function classifyKernelError(code: string | number, message: string): KernelErrorKind {
    const normalizedCode = String(code).toLowerCase();
    const normalizedMessage = message.toLowerCase();
    if (normalizedCode === "401" || normalizedCode.includes("unauthor") || /token|登录|认证|鉴权/.test(normalizedMessage)) return "auth";
    if (normalizedCode === "403" || normalizedCode.includes("forbidden") || /permission|forbidden|无权限|权限/.test(normalizedMessage)) return "permission";
    if (normalizedCode === "400" || normalizedCode === "422" || normalizedCode.includes("invalid") || /invalid|validation|校验|参数/.test(normalizedMessage)) return "validation";
    if (normalizedCode === "transport" || normalizedCode === "network") return "network";
    if (normalizedCode === "timeout") return "timeout";
    if (normalizedCode === "aborted" || normalizedCode === "cancelled") return "cancelled";
    if (normalizedCode === "stale") return "stale";
    if (typeof code === "number" || normalizedCode === "kernel") return "kernel";
    return "unknown";
}

// 官方端点白名单（证据：siyuan kernel/api/router.go，行号见 docs/host-contract.md）
export const ENDPOINTS = {
    version: "/api/system/version",
    lsNotebooks: "/api/notebook/lsNotebooks",
    createNotebook: "/api/notebook/createNotebook",
    removeNotebook: "/api/notebook/removeNotebook",
    listDocsByPath: "/api/filetree/listDocsByPath",
    searchDocs: "/api/filetree/searchDocs",
    createDocWithMd: "/api/filetree/createDocWithMd",
    removeDoc: "/api/filetree/removeDoc",
    getHPathByID: "/api/filetree/getHPathByID",
    getFullHPathByID: "/api/filetree/getFullHPathByID",
    getChildBlocks: "/api/block/getChildBlocks",
    getBlockKramdown: "/api/block/getBlockKramdown",
    getBlockKramdowns: "/api/block/getBlockKramdowns",
    getBlockInfo: "/api/block/getBlockInfo",
    insertBlock: "/api/block/insertBlock",
    appendBlock: "/api/block/appendBlock",
    updateBlock: "/api/block/updateBlock",
    deleteBlock: "/api/block/deleteBlock",
    checkBlocksExist: "/api/block/checkBlocksExist",
    getFile: "/api/file/getFile",
    getBlockAttrs: "/api/attr/getBlockAttrs",
    batchGetBlockAttrs: "/api/attr/batchGetBlockAttrs",
    setBlockAttrs: "/api/attr/setBlockAttrs",
    exportMdContent: "/api/export/exportMdContent",
    // AI（宿主「设置→人工智能」的模型；插件不存密钥。router.go L663/L673）
    chatGPT: "/api/ai/chatGPT",
    listModels: "/api/ai/listModels",
} as const;

export type EndpointName = keyof typeof ENDPOINTS;

export interface IKernelClient {
    request<T = unknown>(endpoint: EndpointName, payload?: KernelPayload, options?: KernelRequestOptions): Promise<T>;
}

/**
 * 传输函数：生产环境注入官方 fetchSyncPost（自动处理宿主端口与鉴权，双端可用）；
 * 测试注入 stub。响应约定 {code,msg,data}（IWebSocketData）。
 */
export interface SyncPostContext {
    signal: AbortSignal;
    attempt: number;
    timeoutMs: number;
    idempotencyKey?: string;
}

export type SyncPost = (url: string, data: unknown, context?: SyncPostContext) => Promise<{code?: number; msg?: string; data?: unknown}>;

/** 请求最终失败时的统一鉴权/权限通知。回调只在一次底层在途请求上触发一次。 */
export type KernelFailureHandler = (error: KernelError) => void;

const RETRYABLE_ENDPOINTS = new Set<EndpointName>([
    "version", "lsNotebooks", "listDocsByPath", "searchDocs", "getHPathByID", "getFullHPathByID",
    "getChildBlocks", "getBlockKramdown", "getBlockKramdowns", "getBlockInfo", "checkBlocksExist", "getBlockAttrs", "batchGetBlockAttrs",
    "exportMdContent", "listModels",
]);

const MAX_RETRIES = 2;

function stableSerialize(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value) ?? String(value);
    if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(",")}}`;
}

function isAbortError(err: unknown): boolean {
    return err instanceof KernelCancelledError || err instanceof KernelStaleError || (err as {name?: unknown})?.name === "AbortError";
}

function shouldRetry(err: unknown, endpoint: EndpointName): boolean {
    if (!RETRYABLE_ENDPOINTS.has(endpoint)) return false;
    if (err instanceof KernelTimeoutError) return true;
    if (err instanceof KernelError) return err.kind === "network" || err.kind === "timeout";
    return !isAbortError(err);
}

function waitBeforeRetry(delayMs: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(new KernelCancelledError());
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, delayMs);
        const onAbort = (): void => {
            clearTimeout(timer);
            signal.removeEventListener("abort", onAbort);
            reject(new KernelCancelledError());
        };
        signal.addEventListener("abort", onAbort, {once: true});
    });
}

export function createKernelClient(options: {
    /** 官方 fetchSyncPost（来自 "siyuan" 包）；离开思源运行时（测试）注入 stub */
    syncPost?: SyncPost;
    timeoutMs?: number;
    /** 宿主返回鉴权失效时的统一恢复入口（不负责伪造宿主登录流程）。 */
    onAuthFailure?: KernelFailureHandler;
    /** 宿主返回权限不足时的统一降级入口。 */
    onPermissionFailure?: KernelFailureHandler;
}): IKernelClient {
    if (!options.syncPost) {
        // 生产装配必须走官方传输；此处兜底抛错而不是裸 fetch（避免绕过宿主鉴权口径）
        throw new Error("createKernelClient requires syncPost (use fetchSyncPost from 'siyuan')");
    }
    const doFetch = options.syncPost;
    const timeoutMs = options.timeoutMs ?? LIMITS.kernelTimeoutMs;
    const inFlight = new Map<string, Promise<unknown>>();
    const latestRequests = new Map<string, {controller: AbortController; requestKey: string}>();

    const reportFailure = (err: unknown): void => {
        if (!(err instanceof KernelError)) return;
        try {
            if (err.kind === "auth") options.onAuthFailure?.(err);
            else if (err.kind === "permission") options.onPermissionFailure?.(err);
        } catch (callbackError) {
            // 错误提示本身不能掩盖原始内核错误；宿主侧回调失败仅作诊断记录。
            console.warn("[小驴常用] kernel failure handler failed", callbackError);
        }
    };

    const executeOnce = async <T>(endpoint: EndpointName, payload: KernelPayload, signal: AbortSignal, requestOptions: KernelRequestOptions, attempt: number): Promise<T> => {
        if (signal.aborted) throw new KernelCancelledError();
        const controller = new AbortController();
        const abortChild = (): void => controller.abort();
        signal.addEventListener("abort", abortChild, {once: true});
        const requestedTimeout = requestOptions.timeoutMs ?? timeoutMs;
        const effectiveTimeout = Number.isFinite(requestedTimeout) ? Math.max(1, requestedTimeout) : LIMITS.kernelTimeoutMs;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const requestPromise = Promise.resolve().then(() => doFetch(ENDPOINTS[endpoint], payload, {
            signal: controller.signal,
            attempt,
            timeoutMs: effectiveTimeout,
            idempotencyKey: requestOptions.idempotencyKey,
        }));
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(new KernelTimeoutError());
            }, effectiveTimeout);
        });
        let rejectCancelled: ((err: KernelCancelledError) => void) | null = null;
        const onSignalAbort = (): void => {
            controller.abort();
            rejectCancelled?.(new KernelCancelledError());
        };
        const cancelledPromise = new Promise<never>((_, reject) => {
            rejectCancelled = reject;
            if (signal.aborted) reject(new KernelCancelledError());
        });
        signal.addEventListener("abort", onSignalAbort, {once: true});
        try {
            const body = await Promise.race([requestPromise, timeoutPromise, cancelledPromise]);
            if (typeof body?.code !== "number" || body.code !== 0) {
                throw new KernelError(body?.code ?? "INVALID_ENVELOPE", body?.msg || `kernel error on ${ENDPOINTS[endpoint]}`);
            }
            return (body.data ?? (null as unknown)) as T;
        } catch (err) {
            if (err instanceof KernelError || err instanceof KernelTimeoutError || err instanceof KernelCancelledError) throw err;
            if (isAbortError(err)) throw new KernelCancelledError();
            throw new KernelError("TRANSPORT", (err as Error)?.message || String(err), "network");
        } finally {
            if (timer) clearTimeout(timer);
            signal.removeEventListener("abort", abortChild);
            signal.removeEventListener("abort", onSignalAbort);
            rejectCancelled = null;
        }
    };

    const execute = async <T>(endpoint: EndpointName, payload: KernelPayload, rootSignal: AbortSignal, requestOptions: KernelRequestOptions): Promise<T> => {
        const requestedRetries = requestOptions.maxRetries ?? MAX_RETRIES;
        const maxRetries = Number.isFinite(requestedRetries)
            ? Math.min(MAX_RETRIES, Math.max(0, Math.floor(requestedRetries)))
            : MAX_RETRIES;
        let attempt = 0;
        while (true) {
            try {
                return await executeOnce<T>(endpoint, payload, rootSignal, requestOptions, attempt);
            } catch (err) {
                if (rootSignal.aborted) throw new KernelCancelledError();
                if (attempt >= maxRetries || !shouldRetry(err, endpoint)) throw err;
                attempt += 1;
                await waitBeforeRetry(150 * 2 ** (attempt - 1), rootSignal);
            }
        }
    };

    return {
        request<T = unknown>(endpoint: EndpointName, payload: KernelPayload = {}, requestOptions: KernelRequestOptions = {}): Promise<T> {
            if (!Object.prototype.hasOwnProperty.call(ENDPOINTS, endpoint)) {
                return Promise.reject(new KernelError("UNKNOWN_ENDPOINT", `endpoint not allowlisted: ${endpoint}`, "validation"));
            }
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                return Promise.reject(new KernelError("INVALID_PAYLOAD", "kernel request payload must be an object", "validation"));
            }
            const requestKey = requestOptions.dedupeKey ?? `${endpoint}:${stableSerialize(payload)}:${requestOptions.idempotencyKey ?? ""}`;
            const existing = inFlight.get(requestKey);
            if (existing) return existing as Promise<T>;
            const rootController = new AbortController();
            const relayAbort = (): void => rootController.abort();
            requestOptions.signal?.addEventListener("abort", relayAbort, {once: true});
            if (requestOptions.latest && requestOptions.raceKey) {
                const previous = latestRequests.get(requestOptions.raceKey);
                if (previous && previous.requestKey !== requestKey) previous.controller.abort();
                latestRequests.set(requestOptions.raceKey, {controller: rootController, requestKey});
            }
            const promise = execute<T>(endpoint, payload, rootController.signal, requestOptions)
                .catch((err: unknown) => {
                    // catch 挂在共享 Promise 上，去重调用方不会重复触发全局处理器。
                    reportFailure(err);
                    throw err;
                })
                .finally(() => {
                    if (inFlight.get(requestKey) === promise) inFlight.delete(requestKey);
                    if (requestOptions.raceKey && latestRequests.get(requestOptions.raceKey)?.controller === rootController) latestRequests.delete(requestOptions.raceKey);
                    requestOptions.signal?.removeEventListener("abort", relayAbort);
                });
            inFlight.set(requestKey, promise);
            return promise;
        },
    };
}

// ---- 结构化读取器（带响应形状校验，坏形状一律返回安全空值并计 violated）----

export interface IChildBlock {
    id: string;
    type: string;
    subtype?: string;
    children?: IChildBlock[];
}

export function parseChildBlocks(data: unknown): IChildBlock[] {
    if (!Array.isArray(data)) return [];
    return data.filter((raw): raw is IChildBlock => {
        return !!raw && typeof (raw as IChildBlock).id === "string" && typeof (raw as IChildBlock).type === "string";
    });
}

export function parseKramdown(data: unknown): {id: string; kramdown: string} | null {
    if (!data || typeof (data as {id?: unknown}).id !== "string") return null;
    const kramdown = (data as {kramdown?: unknown}).kramdown;
    return {id: (data as {id: string}).id, kramdown: typeof kramdown === "string" ? kramdown : ""};
}

/** getBlockKramdowns 响应形状：block id → kramdown string。 */
export function parseBatchKramdowns(data: unknown): Record<string, string> {
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const out: Record<string, string> = {};
    for (const [blockId, value] of Object.entries(data as Record<string, unknown>)) {
        if (/^\d{14}-[0-9a-z]{7}$/.test(blockId) && typeof value === "string") out[blockId] = value;
    }
    return out;
}

export function parseAttrs(data: unknown): Record<string, string> {
    if (!data || typeof data !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
    }
    return out;
}

export function parseBatchAttrs(data: unknown): Record<string, Record<string, string>> {
    if (!data || typeof data !== "object") return {};
    const out: Record<string, Record<string, string>> = {};
    for (const [blockId, attrs] of Object.entries(data as Record<string, unknown>)) {
        out[blockId] = parseAttrs(attrs);
    }
    return out;
}

export function parseExistingMap(data: unknown): Record<string, boolean> {
    if (!data || typeof data !== "object") return {};
    const out: Record<string, boolean> = {};
    for (const [id, v] of Object.entries(data as Record<string, unknown>)) {
        out[id] = v === true;
    }
    return out;
}

export function parseDocId(data: unknown): string | null {
    return typeof data === "string" && data.length > 0 ? data : null;
}

/** createNotebook 响应：{notebook: {id, ...} | null}。不猜测裸字符串或缺失 ID。 */
export function parseNotebookId(data: unknown): string | null {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const notebook = (data as {notebook?: unknown}).notebook;
    if (!notebook || typeof notebook !== "object" || Array.isArray(notebook)) return null;
    const id = (notebook as {id?: unknown}).id;
    return typeof id === "string" && /^\d{8,14}$/.test(id) ? id : null;
}

/** removeNotebook 成功回包必须是 null；避免把未知响应误报为已删除。 */
export function parseVoid(data: unknown): boolean {
    return data === null;
}

export function parseString(data: unknown): string {
    return typeof data === "string" ? data : "";
}

export interface IDocSearchHit {
    id: string;
    hPath: string;
    box: string;
    name: string;
}

/**
 * searchDocs 响应解析：[{path, hPath, box, name?}]。
 * 文档 ID 从 path 末段 `/<yyyymmddHHMMSS-xxxxxxx>.sy` 解析（思源 .sy 路径约定），
 * 解析失败的条目丢弃（不猜测 ID）。
 */
export function parseDocSearch(data: unknown): IDocSearchHit[] {
    if (!Array.isArray(data)) return [];
    const out: IDocSearchHit[] = [];
    for (const raw of data) {
        if (!raw || typeof raw !== "object") continue;
        const obj = raw as Record<string, unknown>;
        const path = typeof obj.path === "string" ? obj.path : "";
        const m = path.match(/(\d{14}-[0-9a-z]{7})\.sy$/);
        if (!m) continue;
        out.push({
            id: m[1] ?? "",
            hPath: typeof obj.hPath === "string" ? obj.hPath : "",
            box: typeof obj.box === "string" ? obj.box : "",
            name: typeof obj.name === "string" ? obj.name : "",
        });
        if (out.length >= 30) break;
    }
    return out;
}
