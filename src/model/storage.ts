// 侧车存储模型：库配置 + UI 状态（收藏/最近/排序/偏好/provider 注册）。
// 版本化 + 归一化 + 容量上限 + 损坏降级。侧车永远不是内容真源，可随时从库文档重建索引。
import {LIMITS, STATE_SCHEMA_VERSION} from "../constants";
import {isBlockId, isItemType, ItemType} from "./item";

// ---- 库配置 ----

export type LibraryMode = "doc" | "tree" | "notebook";

export interface LibraryConfig {
    mode: LibraryMode;
    /** doc/tree：容器根文档；notebook：笔记本 ID */
    notebookIds: string[];
    containerDocIds: string[];
    /** 由插件创建的库文档（首次引导回执用） */
    createdDocIds: string[];
    configuredAt: number;
}

const NOTEBOOK_ID_RE = /^\d{8,14}$/;

export function normalizeLibraryConfig(raw: unknown): LibraryConfig | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const mode = obj.mode === "doc" || obj.mode === "tree" || obj.mode === "notebook" ? obj.mode : null;
    if (!mode) return null;
    const ids = (v: unknown, predicate: (x: unknown) => boolean, cap: number): string[] => {
        if (!Array.isArray(v)) return [];
        return v.filter(predicate).slice(0, cap);
    };
    const containerDocIds = ids(obj.containerDocIds, isBlockId, 64);
    const notebookIds = ids(obj.notebookIds, (x) => typeof x === "string" && NOTEBOOK_ID_RE.test(x), 16);
    const createdDocIds = ids(obj.createdDocIds, isBlockId, 64);
    if (mode !== "notebook" && containerDocIds.length === 0) return null;
    if (mode === "notebook" && notebookIds.length === 0) return null;
    const configuredAt = Number(obj.configuredAt);
    return {
        mode,
        notebookIds,
        containerDocIds,
        createdDocIds,
        configuredAt: Number.isFinite(configuredAt) && configuredAt > 0 ? configuredAt : 0,
    };
}

// ---- 收藏 / 最近 ----

export interface RecentEntry {
    id: string;
    usedAt: number;
}

// ---- provider 注册（xiaolv-common/v1 联动）----

export interface ProviderRecord {
    pluginId: string;
    displayName: string;
    /** 协议版本，整数。协商见 model/protocol.ts */
    protocolVersion: number;
    registeredAt: number;
}

// ---- 顶层状态 ----

export interface AiPrefs {
    /** AI 总开关（默认关；使用宿主思源「设置→人工智能」的模型） */
    enabled: boolean;
    /** 允许发送完整正文给 AI（元数据级功能不需要） */
    shareContent: boolean;
}

export interface SearchPrefs {
    /** 拼音搜索（全拼/首字母注解；默认开，可在设置关闭） */
    pinyin: boolean;
}

export interface PluginState {
    schemaVersion: number;
    favorites: string[];
    recents: RecentEntry[];
    sort: "manual" | "recent" | "title";
    uiPrefs: {
        lastTypeFilter: "" | ItemType;
        lastTagFilter: string;
    };
    providers: ProviderRecord[];
    ai: AiPrefs;
    search: SearchPrefs;
}

export function normalizeState(raw: unknown): PluginState {
    const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const favorites = Array.isArray(obj.favorites)
        ? Array.from(new Set(obj.favorites.filter((x): x is string => typeof x === "string" && x.startsWith("xlc-"))))
            .slice(0, LIMITS.maxFavorites)
        : [];
    const recentsRaw = Array.isArray(obj.recents) ? obj.recents : [];
    const seen = new Set<string>();
    const recents: RecentEntry[] = [];
    for (const entry of recentsRaw) {
        if (!entry || typeof entry !== "object") continue;
        const id = (entry as RecentEntry).id;
        const usedAt = Number((entry as RecentEntry).usedAt);
        if (typeof id !== "string" || !id.startsWith("xlc-") || seen.has(id)) continue;
        if (!Number.isFinite(usedAt) || usedAt <= 0) continue;
        seen.add(id);
        recents.push({id, usedAt});
        if (recents.length >= LIMITS.maxRecents) break;
    }
    const sort = obj.sort === "manual" || obj.sort === "recent" || obj.sort === "title" ? obj.sort : "manual";
    const prefsRaw = (obj.uiPrefs ?? {}) as Record<string, unknown>;
    const lastTypeFilter = (prefsRaw.lastTypeFilter === "" || isItemType(prefsRaw.lastTypeFilter))
        ? prefsRaw.lastTypeFilter as "" | ItemType
        : "";
    const providersRaw = Array.isArray(obj.providers) ? obj.providers : [];
    const providers: ProviderRecord[] = [];
    const providerSeen = new Set<string>();
    for (const p of providersRaw) {
        if (!p || typeof p !== "object") continue;
        const pluginId = (p as ProviderRecord).pluginId;
        if (typeof pluginId !== "string" || !pluginId || providerSeen.has(pluginId)) continue;
        providerSeen.add(pluginId);
        providers.push({
            pluginId: pluginId.slice(0, 128),
            displayName: typeof (p as ProviderRecord).displayName === "string"
                ? (p as ProviderRecord).displayName.slice(0, 128)
                : pluginId,
            protocolVersion: typeof (p as ProviderRecord).protocolVersion === "number"
                ? Math.floor((p as ProviderRecord).protocolVersion)
                : 1,
            registeredAt: Number((p as ProviderRecord).registeredAt) || 0,
        });
        if (providers.length >= LIMITS.maxProviders) break;
    }
    return {
        schemaVersion: STATE_SCHEMA_VERSION,
        favorites,
        recents,
        sort,
        uiPrefs: {
            lastTypeFilter,
            lastTagFilter: typeof prefsRaw.lastTagFilter === "string" ? prefsRaw.lastTagFilter.slice(0, LIMITS.category) : "",
        },
        providers,
        // AI 硬边界：任何输入下默认都关（门禁测试锁定）
        ai: {
            enabled: obj.ai !== null && typeof obj.ai === "object" && (obj.ai as AiPrefs).enabled === true,
            shareContent: obj.ai !== null && typeof obj.ai === "object" && (obj.ai as AiPrefs).shareContent === true,
        },
        // 拼音搜索默认开（本地注解，无出域；可关）
        search: {
            pinyin: !(obj.search !== null && typeof obj.search === "object" && (obj.search as SearchPrefs).pinyin === false),
        },
    };
}

/**
 * 迁移：v1 → v2。
 * v1 形状（历史占位）：{schemaVersion:1, pinnedIds, recentIds, settings:{typeFilter, tagFilter}}。
 * 未知的未来版本拒绝降级读取（返回 null，由调用方保留原始数据等待升级），禁止静默改写。
 */
export function migrateState(raw: unknown): {state: PluginState} | {rejected: "future-version"; observedVersion: number} {
    if (!raw || typeof raw !== "object") return {state: normalizeState(null)};
    const obj = raw as Record<string, unknown>;
    const version = typeof obj.schemaVersion === "number" ? Math.floor(obj.schemaVersion) : 1;
    if (version > STATE_SCHEMA_VERSION) {
        return {rejected: "future-version", observedVersion: version};
    }
    let payload = obj;
    if (version === 1) {
        payload = {
            schemaVersion: 2,
            favorites: Array.isArray(obj.pinnedIds) ? obj.pinnedIds : obj.favorites,
            recents: Array.isArray(obj.recentIds)
                ? (obj.recentIds as unknown[]).map((id) => ({id, usedAt: Date.now()}))
                : obj.recents,
            sort: obj.sort,
            uiPrefs: {
                lastTypeFilter: (obj.settings as {typeFilter?: unknown})?.typeFilter,
                lastTagFilter: (obj.settings as {tagFilter?: unknown})?.tagFilter,
            },
            providers: obj.providers,
        };
    }
    return {state: normalizeState(payload)};
}

// ---- 持久化载荷组装（写入口径统一，杜绝散落的字段拼装）----

export function serializeState(state: PluginState): Record<string, unknown> {
    return normalizeState(state) as unknown as Record<string, unknown>;
}

export function serializeLibraryConfig(config: LibraryConfig): Record<string, unknown> {
    const normalized = normalizeLibraryConfig(config);
    if (!normalized) throw new Error("invalid library config");
    return normalized as unknown as Record<string, unknown>;
}
