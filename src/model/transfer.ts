// 导入导出 v1：JSON 捆绑包。导入前校验 → 冲突分类 → 逐项回执；失败不落库（不覆盖原始数据）。
import {EXPORT_SCHEMA_VERSION, LIMITS, PROTOCOL_NAME} from "../constants";
import {CommonItem, newLogicalId} from "./item";

export interface ExportBundle {
    protocol: typeof PROTOCOL_NAME;
    schemaVersion: typeof EXPORT_SCHEMA_VERSION;
    exportedAt: number;
    items: ExportedItem[];
}

export interface ExportedItem {
    /** 稳定逻辑 ID */
    id: string;
    itemType: string;
    title: string;
    alias: string;
    tags: string[];
    category: string;
    /** 库块 kramdown（内容真源随包走；不导出插件侧车偏好） */
    kramdown: string;
    source: {sourceDocId: string; sourceBlockId: string; sourceType: string};
    url: string;
    targetBlockId: string;
    createdAt: number;
    updatedAt: number;
    /** 未来版本字段在导出时保留在 extensions，导入时忽略（未知字段策略） */
    extensions?: Record<string, unknown>;
}

export function buildBundle(items: readonly CommonItem[], kramdownById: ReadonlyMap<string, string>, now: number): ExportBundle {
    return {
        protocol: PROTOCOL_NAME,
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: now,
        items: items.map((item) => ({
            id: item.id,
            itemType: item.itemType,
            title: item.title,
            alias: item.alias,
            tags: [...item.tags],
            category: item.category,
            kramdown: (kramdownById.get(item.id) ?? "").slice(0, LIMITS.contentChars),
            source: {...item.source},
            url: item.url,
            targetBlockId: item.targetBlockId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        })),
    };
}

// ---- 导入 ----

export type ConflictPolicy = "skip" | "overwrite" | "rename";

export interface ParsedImport {
    schemaVersion: number;
    items: ExportedItem[];
    /** 原始 JSON 中未知顶层字段（如未来版本的 meta）——保留计数，不阻断 */
    unknownTopFields: string[];
}

export interface ImportIssue {
    index: number;
    reason: string;
}

export interface ImportValidation {
    ok: boolean;
    reason?: string;
    parsed?: ParsedImport;
    issues: ImportIssue[];
}

export function validateImport(jsonText: string): ImportValidation {
    const issues: ImportIssue[] = [];
    let obj: unknown;
    try {
        obj = JSON.parse(jsonText);
    } catch (e) {
        return {ok: false, reason: "json-parse", issues};
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        return {ok: false, reason: "not-an-object", issues};
    }
    const record = obj as Record<string, unknown>;
    if (record.protocol !== PROTOCOL_NAME) {
        return {ok: false, reason: "protocol-mismatch", issues};
    }
    const schemaVersion = record.schemaVersion;
    if (schemaVersion !== EXPORT_SCHEMA_VERSION) {
        // v1 只接受精确版本：更高版本拒绝降级导入，更低版本无历史
        return {ok: false, reason: "schema-version-unsupported", issues};
    }
    if (!Array.isArray(record.items)) {
        return {ok: false, reason: "items-not-array", issues};
    }
    if (record.items.length > LIMITS.maxItems) {
        return {ok: false, reason: "too-many-items", issues};
    }
    const knownTop = ["protocol", "schemaVersion", "exportedAt", "items"];
    const unknownTopFields = Object.keys(record).filter((k) => !knownTop.includes(k));
    const items: ExportedItem[] = [];
    record.items.forEach((raw, index) => {
        const item = normalizeExportedItem(raw);
        if (!item) {
            issues.push({index, reason: "invalid-item"});
            return;
        }
        items.push(item);
    });
    return {ok: true, parsed: {schemaVersion: EXPORT_SCHEMA_VERSION, items, unknownTopFields}, issues};
}

function normalizeExportedItem(raw: unknown): ExportedItem | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string" || !obj.id.startsWith("xlc-") || obj.id.length > 64) return null;
    if (typeof obj.kramdown !== "string" || obj.kramdown.length > LIMITS.contentChars) return null;
    if (typeof obj.itemType !== "string" || obj.itemType.length > 24) return null;
    const sourceRaw = (obj.source ?? {}) as Record<string, unknown>;
    const known = ["id", "itemType", "title", "alias", "tags", "category", "kramdown", "source", "url", "targetBlockId", "createdAt", "updatedAt"];
    const extensions: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (!known.includes(k)) extensions[k] = v;
    }
    const str = (v: unknown, cap: number): string => (typeof v === "string" ? v.slice(0, cap) : "");
    const tags = Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string").slice(0, LIMITS.tags) : [];
    return {
        id: obj.id,
        itemType: obj.itemType,
        title: str(obj.title, LIMITS.title),
        alias: str(obj.alias, LIMITS.alias),
        tags,
        category: str(obj.category, LIMITS.category),
        kramdown: obj.kramdown,
        source: {
            sourceDocId: str(sourceRaw.sourceDocId, 32),
            sourceBlockId: str(sourceRaw.sourceBlockId, 32),
            sourceType: str(sourceRaw.sourceType, 24),
        },
        url: str(obj.url, 2048),
        targetBlockId: str(obj.targetBlockId, 32),
        createdAt: Number(obj.createdAt) || 0,
        updatedAt: Number(obj.updatedAt) || 0,
        extensions: Object.keys(extensions).length ? extensions : undefined,
    };
}

// ---- 冲突分类（纯函数）----

export type ConflictKind = "new" | "skip" | "overwrite" | "rename";

export interface ConflictDecision {
    kind: ConflictKind;
    /** rename 时的新逻辑 ID */
    newId?: string;
}

/**
 * 判定单个导入条目与现有库的关系（按稳定逻辑 ID）：
 * - ID 不存在 → new
 * - ID 已存在 → 按用户策略：skip（保留现有）/ overwrite（覆盖现有条目块）/ rename（新 ID 并存）。
 *   内容级 diff（同 ID 同内容自动 skip）需要逐条取 kramdown，首版不做并如实记录于已知限制。
 */
export function classifyConflict(_incomingId: string, idExists: boolean, policy: ConflictPolicy, random = Math.random): ConflictDecision {
    if (!idExists) return {kind: "new"};
    if (policy === "overwrite") return {kind: "overwrite"};
    if (policy === "rename") return {kind: "rename", newId: newLogicalId(Date.now(), random)};
    return {kind: "skip"};
}

export interface ImportReceiptLine {
    id: string;
    title: string;
    action: ConflictKind;
    ok: boolean;
    error?: string;
}

export interface ImportReceipt {
    total: number;
    created: number;
    skipped: number;
    overwritten: number;
    renamed: number;
    failed: number;
    lines: ImportReceiptLine[];
}
