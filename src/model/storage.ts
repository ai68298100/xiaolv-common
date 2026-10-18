// 侧车存储模型：库配置 + UI 状态（收藏/最近/排序/偏好/provider 注册）。
// 版本化 + 归一化 + 容量上限 + 损坏降级。侧车永远不是内容真源，可随时从库文档重建索引。
import {LIMITS, STATE_SCHEMA_VERSION} from "../constants";
import {isBlockId, isItemType, ItemType} from "./item";

// ---- 库配置 ----

export type LibraryMode = "doc" | "tree" | "notebook";

export interface LibraryConfig {
    /** 配置结构版本（R16 起：未来版本拒绝降级读取，防静默破坏） */
    configVersion: number;
    mode: LibraryMode;
    /** doc/tree：容器根文档；notebook：笔记本 ID */
    notebookIds: string[];
    containerDocIds: string[];
    /** 由插件创建的库文档（首次引导回执用） */
    createdDocIds: string[];
    /** 由插件创建的独立笔记本（Issue #1；旧配置缺省为空） */
    createdNotebookIds?: string[];
    configuredAt: number;
}

export const CONFIG_VERSION = 1;

const NOTEBOOK_ID_RE = /^\d{8,14}$/;

export function normalizeLibraryConfig(raw: unknown): LibraryConfig | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    // 未来配置版本：拒绝降级读取（返回 null → UI 提示重新设置），绝不静默改写
    const configVersion = typeof obj.configVersion === "number" ? Math.floor(obj.configVersion) : CONFIG_VERSION;
    if (configVersion > CONFIG_VERSION) return null;
    const mode = obj.mode === "doc" || obj.mode === "tree" || obj.mode === "notebook" ? obj.mode : null;
    if (!mode) return null;
    const ids = (v: unknown, predicate: (x: unknown) => boolean, cap: number): string[] => {
        if (!Array.isArray(v)) return [];
        return v.filter(predicate).slice(0, cap);
    };
    const containerDocIds = ids(obj.containerDocIds, isBlockId, 64);
    const notebookIds = ids(obj.notebookIds, (x) => typeof x === "string" && NOTEBOOK_ID_RE.test(x), 16);
    const createdDocIds = ids(obj.createdDocIds, isBlockId, 64);
    const createdNotebookIds = ids(obj.createdNotebookIds, (x) => typeof x === "string" && NOTEBOOK_ID_RE.test(x), 16);
    if (mode !== "notebook" && containerDocIds.length === 0) return null;
    if (mode === "notebook" && notebookIds.length === 0) return null;
    const configuredAt = Number(obj.configuredAt);
    return {
        configVersion: CONFIG_VERSION,
        mode,
        notebookIds,
        containerDocIds,
        createdDocIds,
        createdNotebookIds,
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
    /** 自定义 AI 变换（F7）：与内置五种并列出现在动作菜单 ✦ 区 */
    customTransforms: CustomTransform[];
}

export interface CustomTransform {
    /** 稳定 ID（xltf- 前缀） */
    id: string;
    /** 菜单显示名 */
    name: string;
    /** 变换指令（发给 AI 的提示正文） */
    prompt: string;
}

const CUSTOM_TRANSFORM_ID_RE = /^xltf-[0-9a-z]{4,24}$/;

function normalizeCustomTransforms(raw: unknown): CustomTransform[] {
    const out: CustomTransform[] = [];
    if (!Array.isArray(raw)) return out;
    const seen = new Set<string>();
    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;
        const id = (entry as CustomTransform).id;
        const name = typeof (entry as CustomTransform).name === "string" ? ((entry as CustomTransform).name as string).trim().slice(0, LIMITS.customNameChars) : "";
        const prompt = typeof (entry as CustomTransform).prompt === "string" ? ((entry as CustomTransform).prompt as string).trim().slice(0, LIMITS.customPromptChars) : "";
        if (typeof id !== "string" || !CUSTOM_TRANSFORM_ID_RE.test(id) || seen.has(id)) continue;
        if (!name || !prompt) continue;
        seen.add(id);
        out.push({id, name, prompt});
        if (out.length >= LIMITS.maxCustomTransforms) break;
    }
    return out;
}

export interface SearchPrefs {
    /** 拼音搜索（全拼/首字母注解；默认开，可在设置关闭） */
    pinyin: boolean;
    /** 动态占位符（插入/复制时替换 {{xlc:date}} 等；默认开，存储内容始终保留模板原文） */
    placeholders: boolean;
    /** 上次搜索词（跨会话保留，200 字符截断；空串=无） */
    lastQuery: string;
    /** 最近搜索词历史（上限 10 条，LRU 去重保序，ADR 0043 / T-0070） */
    recentQueries?: string[];
    /** Saved tag-scoped discovery shortcuts. Sidecar UI state only; source blocks remain canonical. */
    savedDiscoveryViews?: SavedDiscoveryView[];
}

export type SavedDiscoveryScope = "document" | "notebook" | "tree" | "selected-notebook" | "all-notebooks";

export interface SavedDiscoveryView {
    id: string;
    name: string;
    tag: string;
    scope: SavedDiscoveryScope;
    targetDocId: string;
    targetNotebookId: string;
    pathLabel: string;
    defaultCategory: string;
}

const SAVED_VIEW_ID_RE = /^xlc-view-[0-9a-z]{6,32}$/;
const SAVED_DISCOVERY_SCOPES: readonly SavedDiscoveryScope[] = [
    "document", "notebook", "tree", "selected-notebook", "all-notebooks",
];

export function isSavedDiscoveryScope(value: unknown): value is SavedDiscoveryScope {
    return typeof value === "string" && (SAVED_DISCOVERY_SCOPES as readonly string[]).includes(value);
}

export function normalizeSavedDiscoveryViews(raw: unknown): SavedDiscoveryView[] {
    if (!Array.isArray(raw)) return [];
    const result: SavedDiscoveryView[] = [];
    const seen = new Set<string>();
    for (const value of raw) {
        if (!value || typeof value !== "object") continue;
        const item = value as Partial<SavedDiscoveryView>;
        const id = typeof item.id === "string" ? item.id : "";
        const name = typeof item.name === "string" ? item.name.trim().slice(0, LIMITS.savedViewNameChars) : "";
        const tag = typeof item.tag === "string" ? item.tag.trim().slice(0, LIMITS.tag) : "";
        const scope = item.scope;
        if (!SAVED_VIEW_ID_RE.test(id) || seen.has(id) || !name || !tag || !isSavedDiscoveryScope(scope)) continue;
        let targetDocId = typeof item.targetDocId === "string" && isBlockId(item.targetDocId) ? item.targetDocId : "";
        const targetNotebookId = typeof item.targetNotebookId === "string" && isBlockId(item.targetNotebookId) ? item.targetNotebookId : "";
        if ((scope === "document" || scope === "tree") && !targetDocId) continue;
        // Keep legacy anchor-only notebook shortcuts visible, but callers must never infer
        // their notebook from an anchor that may have moved. New rules use the frozen ID.
        if (scope === "notebook" && !targetNotebookId && !targetDocId) continue;
        if (scope === "selected-notebook" && !targetNotebookId) continue;
        if ((scope === "notebook" || scope === "selected-notebook") && targetNotebookId) targetDocId = "";
        const pathLabel = typeof item.pathLabel === "string" ? item.pathLabel.trim().slice(0, LIMITS.savedViewPathChars) : "";
        const defaultCategory = typeof item.defaultCategory === "string" ? item.defaultCategory.trim().slice(0, LIMITS.category) : "";
        seen.add(id);
        result.push({id, name, tag, scope, targetDocId, targetNotebookId, pathLabel, defaultCategory});
        if (result.length >= LIMITS.maxSavedDiscoveryViews) break;
    }
    return result;
}

/** 追加并更新最近搜索历史队列（LRU 去重保序，上限 10 条） */
export function pushRecentQuery(history: readonly string[], newQuery: string, limit = 10): string[] {
    const trimmed = (newQuery ?? "").trim().slice(0, LIMITS.queryChars);
    if (!trimmed) return [...history];
    return [trimmed, ...history.filter((q) => q !== trimmed)].slice(0, limit);
}

/** 使用计数（F3）：插入/复制成功 +1；「常用」排序=次数×最近使用时间。侧车存储，可重建可清空。 */
export interface UsageEntry {
    count: number;
    lastAt: number;
}

/** 插入偏好（F1/F3）：插入前询问变量 / 记录使用次数。默认都开。 */
export interface InsertPrefs {
    promptVariables: boolean;
    recordUsage: boolean;
}

export interface PluginState {
    schemaVersion: number;
    favorites: string[];
    recents: RecentEntry[];
    usage: Record<string, UsageEntry>;
    sort: "manual" | "recent" | "frequent" | "title";
    uiPrefs: {
        lastTypeFilter: "" | ItemType;
        lastTagFilter: string;
        lastCategoryFilter: string;
    };
    providers: ProviderRecord[];
    ai: AiPrefs;
    search: SearchPrefs;
    insert: InsertPrefs;
}

export function normalizeState(raw: unknown): PluginState {
    const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const favorites = Array.isArray(obj.favorites)
        ? Array.from(new Set(obj.favorites.filter((x): x is string => typeof x === "string" && x.startsWith("xlc-") && x.length <= 48)))
            .slice(0, LIMITS.maxFavorites)
        : [];
    const recentsRaw = Array.isArray(obj.recents) ? obj.recents : [];
    const seen = new Set<string>();
    const recents: RecentEntry[] = [];
    for (const entry of recentsRaw) {
        if (!entry || typeof entry !== "object") continue;
        const id = (entry as RecentEntry).id;
        const usedAt = Number((entry as RecentEntry).usedAt);
        if (typeof id !== "string" || !id.startsWith("xlc-") || id.length > 48 || seen.has(id)) continue;
        if (!Number.isFinite(usedAt) || usedAt <= 0) continue;
        seen.add(id);
        recents.push({id, usedAt});
        if (recents.length >= LIMITS.maxRecents) break;
    }
    const sort = obj.sort === "manual" || obj.sort === "recent" || obj.sort === "frequent" || obj.sort === "title" ? obj.sort : "manual";
    const prefsRaw = (obj.uiPrefs ?? {}) as Record<string, unknown>;
    const lastTypeFilter = (prefsRaw.lastTypeFilter === "" || isItemType(prefsRaw.lastTypeFilter))
        ? prefsRaw.lastTypeFilter as "" | ItemType
        : "";
    // 使用计数（F3）：形状不可信逐条丢弃；超限保留最近使用的 maxUsage 条
    const usageRaw = (obj.usage ?? {}) as Record<string, unknown>;
    const usageEntries: Array<{id: string; entry: UsageEntry}> = [];
    for (const [id, value] of Object.entries(usageRaw)) {
        if (!id.startsWith("xlc-") || id.length > 48 || !value || typeof value !== "object") continue;
        const count = Number((value as UsageEntry).count);
        const lastAt = Number((value as UsageEntry).lastAt);
        if (!Number.isInteger(count) || count <= 0 || count > 1_000_000) continue;
        if (!Number.isFinite(lastAt) || lastAt <= 0) continue;
        usageEntries.push({id, entry: {count, lastAt}});
    }
    usageEntries.sort((a, b) => b.entry.lastAt - a.entry.lastAt);
    const usage: Record<string, UsageEntry> = {};
    for (const {id, entry} of usageEntries.slice(0, LIMITS.maxUsage)) usage[id] = entry;
    const insertRaw = (obj.insert ?? {}) as Record<string, unknown>;
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
        usage,
        sort,
        uiPrefs: {
            lastTypeFilter,
            lastTagFilter: typeof prefsRaw.lastTagFilter === "string" ? prefsRaw.lastTagFilter.slice(0, LIMITS.category) : "",
            lastCategoryFilter: typeof prefsRaw.lastCategoryFilter === "string" ? prefsRaw.lastCategoryFilter.slice(0, LIMITS.category) : "",
        },
        providers,
        // AI 硬边界：任何输入下默认都关（门禁测试锁定）；自定义变换列表逐条校验（F7）
        ai: {
            enabled: obj.ai !== null && typeof obj.ai === "object" && (obj.ai as AiPrefs).enabled === true,
            shareContent: obj.ai !== null && typeof obj.ai === "object" && (obj.ai as AiPrefs).shareContent === true,
            customTransforms: normalizeCustomTransforms(obj.ai !== null && typeof obj.ai === "object" ? (obj.ai as AiPrefs).customTransforms : []),
        },
        // 拼音搜索默认开（本地注解，无出域；可关）
        search: {
            pinyin: !(obj.search !== null && typeof obj.search === "object" && (obj.search as SearchPrefs).pinyin === false),
            placeholders: !(obj.search !== null && typeof obj.search === "object" && (obj.search as SearchPrefs).placeholders === false),
            lastQuery: obj.search !== null && typeof obj.search === "object" && typeof (obj.search as SearchPrefs).lastQuery === "string"
                ? ((obj.search as SearchPrefs).lastQuery as string).slice(0, LIMITS.queryChars)
                : "",
            recentQueries: obj.search !== null && typeof obj.search === "object" && Array.isArray((obj.search as SearchPrefs).recentQueries)
                ? Array.from(new Set(
                    ((obj.search as SearchPrefs).recentQueries as unknown[])
                        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
                        .map((q) => q.trim().slice(0, LIMITS.queryChars))
                )).slice(0, 10)
                : [],
            savedDiscoveryViews: obj.search !== null && typeof obj.search === "object"
                ? normalizeSavedDiscoveryViews((obj.search as SearchPrefs).savedDiscoveryViews)
                : [],
        },
        // 插入偏好默认开（F1/F3）；显式 false 才关
        insert: {
            promptVariables: !(insertRaw.promptVariables === false),
            recordUsage: !(insertRaw.recordUsage === false),
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
