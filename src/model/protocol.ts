// xiaolv-common/v1 协议模型：跨插件联动的稳定类型与能力协商。
// 原则（需求六.8）：最小稳定接口；未知字段保留透传；未知能力忽略；版本不匹配明确拒绝。
import {PROTOCOL_NAME, PROTOCOL_VERSION} from "../constants";
import {CommonItem, CommonItemRef, ItemType, isItemType, isSafeHttpUrl} from "./item";
import {SearchQuery} from "./search";
import {InsertPlan} from "./actions";
import {ProviderRecord} from "./storage";

export const CAPABILITIES = [
    "search",
    "get",
    "save",
    "update",
    "remove",
    "insert",
    "copy",
    "openSource",
    "reindex",
    "recent",
    "favorites",
    "providers",
    "ai",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export interface CapabilityAi {
    tidy: boolean;
    draft: boolean;
    transform: boolean;
    semanticSearch: boolean;
}

export interface CapabilityDescriptor {
    name: Capability;
    supportedSurfaces: Array<"desktop" | "mobile">;
    mobileSafe: boolean;
    itemTypes: readonly ItemType[];
    insertModes: readonly InsertPlan["mode"][];
    /** 未验证的宿主边界与降级方式（如实声明，不做假能力） */
    limitations: string[];
    /** ai 能力专属声明（v1 增量字段，消费方可忽略） */
    ai?: CapabilityAi;
}

export interface ProtocolEnvelope {
    protocol: typeof PROTOCOL_NAME;
    protocolVersion: number;
}

/** 跨插件调用结果：不抛异常，用 ok=false + reason 表达失败 */
export interface ActionResult<T = void> extends ProtocolEnvelope {
    ok: boolean;
    reason?: "not-found" | "invalid-input" | "kernel-error" | "timeout" | "source-missing" | "doc-missing" | "asset-missing" | "unsupported" | "protocol-mismatch";
    message?: string;
    data?: T;
}

export interface ProviderDescriptor extends ProtocolEnvelope {
    pluginId: string;
    displayName: string;
    /** 提供方支持的条目类型（如打卡插件提供"今日状态"文本模板） */
    provides?: ItemType[];
}

export type {CommonItem, CommonItemRef, SearchQuery, InsertPlan};

export interface IXiaolvCommonServiceV1 extends ProtocolEnvelope {
    getCapabilities(): CapabilityDescriptor[];
    search(query: SearchQuery): Promise<ActionResult<CommonItemRef[]>>;
    get(itemId: string): Promise<ActionResult<CommonItem>>;
    save(input: unknown): Promise<ActionResult<CommonItemRef>>;
    update(itemId: string, input: unknown): Promise<ActionResult<CommonItemRef>>;
    remove(itemId: string): Promise<ActionResult<void>>;
    insert(itemId: string, options?: unknown): Promise<ActionResult<{mode: string; downgraded: boolean}>>;
    copy(itemId: string): Promise<ActionResult<{kind: string; pendingVerification?: string[]}>>;
    openSource(itemId: string): Promise<ActionResult<{opened: "doc" | "block" | "asset" | "url"}>>;
    reindex(): Promise<ActionResult<{count: number; truncated: boolean}>>;
    getRecent(limit?: number): Promise<ActionResult<CommonItemRef[]>>;
    getFavorites(): Promise<ActionResult<CommonItemRef[]>>;
    registerProvider?(descriptor: ProviderDescriptor): ActionResult<void>;
    unregisterProvider?(pluginId: string): ActionResult<void>;
}

// ---- 能力协商 ----

export interface NegotiationResult {
    compatible: boolean;
    reason?: "name-mismatch" | "major-version-mismatch";
    /** 未知字段（对方有、我方不认识）——保留透传，不丢弃 */
    unknownFields: string[];
}

/**
 * 与远端声明的协商。只按主版本（整数）判断兼容；未知字段永远不导致失败。
 * 低于本方主版本：按 v1 最小接口工作（当前只有 v1，故只有 >1 拒绝）。
 */
export function negotiateProtocol(remote: {protocol?: unknown; protocolVersion?: unknown}, knownFields: readonly string[]): NegotiationResult {
    const name = typeof remote.protocol === "string" ? remote.protocol : "";
    const version = typeof remote.protocolVersion === "number" ? Math.floor(remote.protocolVersion) : NaN;
    if (name && name !== PROTOCOL_NAME) return {compatible: false, reason: "name-mismatch", unknownFields: []};
    if (!Number.isFinite(version) || version > PROTOCOL_VERSION) {
        return {compatible: false, reason: "major-version-mismatch", unknownFields: []};
    }
    const unknownFields = Object.keys(remote).filter((k) => !knownFields.includes(k));
    return {compatible: true, unknownFields};
}

export function envelope(): ProtocolEnvelope {
    return {protocol: PROTOCOL_NAME, protocolVersion: PROTOCOL_VERSION};
}

export function failureEnvelope(
    reason: Extract<NonNullable<ActionResult<never>["reason"]>, string>,
    message?: string,
): ActionResult<never> {
    return {...envelope(), ok: false, reason: reason as never, message};
}

export function successEnvelope<T>(data?: T): ActionResult<T> {
    return {...envelope(), ok: true, data} as ActionResult<T>;
}

// provider 记录 ↔ 描述符互转（不把函数回调写进持久化数据——只存标量）
export function descriptorToRecord(d: ProviderDescriptor, now: number): ProviderRecord {
    return {
        pluginId: d.pluginId,
        displayName: d.displayName,
        protocolVersion: d.protocolVersion,
        registeredAt: now,
    };
}

// ---- save() 协议输入（跨插件写入必须带正文；字段全部校验上界）----

export interface SaveInput {
    itemType: ImportableItemType;
    markdown: string;
    title?: string;
    alias?: string;
    tags?: string[];
    category?: string;
    url?: string;
    targetBlockId?: string;
    source?: {sourceDocId?: string; sourceBlockId?: string; sourceType?: string};
}

export type ImportableItemType = "text" | "markdown" | "url" | "code" | "image" | "asset" | "blockref" | "structure";

export function normalizeSaveInput(raw: unknown): {ok: true; input: SaveInput} | {ok: false; reason: string} {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {ok: false, reason: "not-an-object"};
    const obj = raw as Record<string, unknown>;
    const rawItemType: unknown = obj.itemType;
    if (!isItemType(rawItemType)) return {ok: false, reason: "itemType invalid"};
    if (typeof obj.markdown !== "string" || obj.markdown.length === 0 || obj.markdown.length > 100_000) {
        return {ok: false, reason: "markdown required (<=100000 chars)"};
    }
    const str = (v: unknown, cap: number): string | undefined => (typeof v === "string" ? v.slice(0, cap) : undefined);
    const url = str(obj.url, 2048);
    if (url && !isSafeHttpUrl(url)) return {ok: false, reason: "url invalid"};
    const srcRaw = (obj.source ?? {}) as Record<string, unknown>;
    return {
        ok: true,
        input: {
            itemType: rawItemType,
            markdown: obj.markdown,
            title: str(obj.title, 512),
            alias: str(obj.alias, 256),
            tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string").slice(0, 32) : undefined,
            category: str(obj.category, 64),
            url,
            targetBlockId: str(obj.targetBlockId, 32),
            source: {
                sourceDocId: str(srcRaw.sourceDocId, 32),
                sourceBlockId: str(srcRaw.sourceBlockId, 32),
                sourceType: str(srcRaw.sourceType, 24) || "external",
            },
        },
    };
}
