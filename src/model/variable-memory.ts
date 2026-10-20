// 变量填写值记忆（ADR 0074 / G22 / T-0133）：
// 只存本机侧车（loadData），绝不出域、不写正文与块属性；用户可一键清除。
// 纯函数、零副作用，便于宿主隔离与契约测试。

export interface VariableMemoryEntry {
    value: string;
    /** 最近使用时间（ms），用于淘汰与展示 */
    lastAt: number;
}

export interface VariableMemory {
    /** 总开关：false 时既不预填也不写入，但保留已有数据（不擅自删用户数据） */
    enabled: boolean;
    values: Record<string, VariableMemoryEntry>;
}

export const VARIABLE_MEMORY_MAX_FIELDS = 200;
export const VARIABLE_MEMORY_MAX_VALUE_LEN = 500;
export const VARIABLE_MEMORY_MAX_LABEL_LEN = 80;

export const EMPTY_VARIABLE_MEMORY: VariableMemory = {enabled: true, values: {}};

/** 归一化字段名：trim + 长度裁剪 + 大小写折叠（读取用） */
export function normalizeVariableKey(label: string): string {
    return (label ?? "").trim().slice(0, VARIABLE_MEMORY_MAX_LABEL_LEN);
}

function keyOf(label: string): string {
    return normalizeVariableKey(label).toLowerCase();
}

/** 从任意侧车原始数据中安全提取记忆表：非法结构/超限项一律丢弃 */
export function normalizeVariableMemory(raw: unknown): VariableMemory {
    if (!raw || typeof raw !== "object") return {...EMPTY_VARIABLE_MEMORY, values: {}};
    const obj = raw as {enabled?: unknown; values?: unknown};
    const enabled = obj.enabled !== false; // 缺省开启；仅显式 false 关闭
    const values: Record<string, VariableMemoryEntry> = {};
    const rawValues = obj.values;
    if (rawValues && typeof rawValues === "object") {
        // 先收集合法项，再按最近使用时间裁剪到上限（防止侧车膨胀）
        const candidates: Array<{key: string; entry: VariableMemoryEntry}> = [];
        for (const [label, val] of Object.entries(rawValues as Record<string, unknown>)) {
            const key = keyOf(label);
            if (!key || key.length > VARIABLE_MEMORY_MAX_LABEL_LEN) continue;
            if (!val || typeof val !== "object") continue;
            const entry = val as {value?: unknown; lastAt?: unknown};
            if (typeof entry.value !== "string") continue;
            const value = entry.value.slice(0, VARIABLE_MEMORY_MAX_VALUE_LEN);
            if (!value.trim()) continue; // 空值不记忆
            const lastAt = typeof entry.lastAt === "number" && Number.isFinite(entry.lastAt) ? entry.lastAt : 0;
            candidates.push({key, entry: {value, lastAt}});
        }
        candidates.sort((a, b) => b.entry.lastAt - a.entry.lastAt);
        for (const item of candidates.slice(0, VARIABLE_MEMORY_MAX_FIELDS)) {
            values[item.key] = item.entry;
        }
    }
    return {enabled, values};
}

/** 读取某字段的记忆值（大小写不敏感）；无记忆返回空串 */
export function getRememberedValue(memory: VariableMemory, label: string): string {
    if (!memory.enabled) return "";
    const entry = memory.values[keyOf(label)];
    return entry ? entry.value : "";
}

/** 一次读取多个字段的预填值（只含有记忆的字段，空值不返回） */
export function collectDefaults(memory: VariableMemory, labels: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    if (!memory.enabled) return out;
    for (const label of labels) {
        const value = getRememberedValue(memory, label);
        if (value) out[label] = value;
    }
    return out;
}

/** 写入/刷新记忆（返回新对象，不改入参）；空值、关闭状态、超长标签一律不写 */
export function rememberValue(
    memory: VariableMemory,
    label: string,
    value: string,
    now: number,
): VariableMemory {
    if (!memory.enabled) return memory;
    const key = keyOf(label);
    if (!key || key.length > VARIABLE_MEMORY_MAX_LABEL_LEN) return memory;
    const trimmed = (value ?? "").trim();
    if (!trimmed) return memory; // 空值不记忆，避免兜底值污染
    const clipped = trimmed.slice(0, VARIABLE_MEMORY_MAX_VALUE_LEN);
    const values = {...memory.values, [key]: {value: clipped, lastAt: now}};
    // 超上限时淘汰最久未使用者
    const entries = Object.entries(values);
    if (entries.length > VARIABLE_MEMORY_MAX_FIELDS) {
        entries.sort((a, b) => b[1].lastAt - a[1].lastAt);
        const kept: Record<string, VariableMemoryEntry> = {};
        for (const [k, v] of entries.slice(0, VARIABLE_MEMORY_MAX_FIELDS)) kept[k] = v;
        return {enabled: memory.enabled, values: kept};
    }
    return {enabled: memory.enabled, values};
}

/** 批量写入（变量卡提交时一次写入多条；跳过空值） */
export function rememberValues(
    memory: VariableMemory,
    fills: Record<string, string>,
    now: number,
): VariableMemory {
    let next = memory;
    for (const [label, value] of Object.entries(fills ?? {})) {
        next = rememberValue(next, label, value, now);
    }
    return next;
}

/** 清除单个字段记忆 */
export function forgetValue(memory: VariableMemory, label: string): VariableMemory {
    const key = keyOf(label);
    if (!key || !memory.values[key]) return memory;
    const values = {...memory.values};
    delete values[key];
    return {enabled: memory.enabled, values};
}

/** 清空全部记忆（保留开关状态） */
export function clearAllMemory(memory: VariableMemory): VariableMemory {
    return {enabled: memory.enabled, values: {}};
}

/** 记忆条目数（设置页展示用） */
export function countRememberedFields(memory: VariableMemory): number {
    return Object.keys(memory.values).length;
}
