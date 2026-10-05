// 内核 HTTP 客户端：端点白名单 + 超时 + 非零 code 抛错。
// 只允许本文件登记的官方端点；新增端点须先在上游 kernel/api/router.go 核对请求/响应结构。
import {LIMITS} from "../constants";

export type KernelPayload = Record<string, unknown>;

export class KernelError extends Error {
    constructor(public readonly code: string | number, message: string) {
        super(message);
        this.name = "KernelError";
    }
}

export class KernelTimeoutError extends Error {
    constructor() {
        super("kernel request timed out");
        this.name = "KernelTimeoutError";
    }
}

// 官方端点白名单（证据：siyuan kernel/api/router.go，行号见 docs/host-contract.md）
export const ENDPOINTS = {
    version: "/api/system/version",
    lsNotebooks: "/api/notebook/lsNotebooks",
    listDocsByPath: "/api/filetree/listDocsByPath",
    createDocWithMd: "/api/filetree/createDocWithMd",
    removeDoc: "/api/filetree/removeDoc",
    getHPathByID: "/api/filetree/getHPathByID",
    getFullHPathByID: "/api/filetree/getFullHPathByID",
    getChildBlocks: "/api/block/getChildBlocks",
    getBlockKramdown: "/api/block/getBlockKramdown",
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
} as const;

export type EndpointName = keyof typeof ENDPOINTS;

export interface IKernelClient {
    request<T = unknown>(endpoint: EndpointName, payload?: KernelPayload): Promise<T>;
}

/**
 * 传输函数：生产环境注入官方 fetchSyncPost（自动处理宿主端口与鉴权，双端可用）；
 * 测试注入 stub。响应约定 {code,msg,data}（IWebSocketData）。
 */
export type SyncPost = (url: string, data: unknown) => Promise<{code?: number; msg?: string; data?: unknown}>;

export function createKernelClient(options: {
    /** 官方 fetchSyncPost（来自 "siyuan" 包）；离开思源运行时（测试）注入 stub */
    syncPost?: SyncPost;
    timeoutMs?: number;
}): IKernelClient {
    if (!options.syncPost) {
        // 生产装配必须走官方传输；此处兜底抛错而不是裸 fetch（避免绕过宿主鉴权口径）
        throw new Error("createKernelClient requires syncPost (use fetchSyncPost from 'siyuan')");
    }
    const doFetch = options.syncPost;
    const timeoutMs = options.timeoutMs ?? LIMITS.kernelTimeoutMs;
    return {
        async request<T = unknown>(endpoint: EndpointName, payload: KernelPayload = {}): Promise<T> {
            if (!Object.prototype.hasOwnProperty.call(ENDPOINTS, endpoint)) {
                throw new KernelError("UNKNOWN_ENDPOINT", `endpoint not allowlisted: ${endpoint}`);
            }
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                const body = await Promise.race([
                    doFetch(ENDPOINTS[endpoint], payload ?? {}),
                    new Promise<never>((_, reject) => {
                        timer = setTimeout(() => reject(new KernelTimeoutError()), timeoutMs);
                    }),
                ]);
                if (typeof body?.code !== "number" || body.code !== 0) {
                    throw new KernelError(body?.code ?? "INVALID_ENVELOPE", body?.msg || `kernel error on ${ENDPOINTS[endpoint]}`);
                }
                return (body.data ?? (null as unknown)) as T;
            } catch (err) {
                if (err instanceof KernelError) throw err;
                if (err instanceof KernelTimeoutError) throw err;
                throw new KernelError("TRANSPORT", (err as Error)?.message || String(err));
            } finally {
                if (timer) clearTimeout(timer);
            }
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

export function parseString(data: unknown): string {
    return typeof data === "string" ? data : "";
}
