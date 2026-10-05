// 动态占位符（参考 Quicker 常用语核心能力；R6）：
// 语法 {{xlc:date}} {{xlc:time}} {{xlc:datetime}} {{xlc:weekday}} —— xlc: 命名空间
// 避免与思源模板 {{...}} / 用户正文冲突；未知占位符原样保留（不吞内容）。
// 替换时机：插入/复制时（插入到文档与剪贴板载荷都替换）；条目存储内容永远保持模板原文。

export const PLACEHOLDER_PATTERN = /\{\{xlc:(date|time|datetime|weekday)\}\}/g;

export type PlaceholderKind = "date" | "time" | "datetime" | "weekday";

const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date): string {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWeekday(d: Date): string {
    return WEEKDAYS_ZH[d.getDay()] ?? "";
}

export function renderPlaceholder(kind: PlaceholderKind, now: Date): string {
    switch (kind) {
        case "date": return formatDate(now);
        case "time": return formatTime(now);
        case "datetime": return `${formatDate(now)} ${formatTime(now)}`;
        case "weekday": return formatWeekday(now);
    }
}

/** 应用占位符替换。enabled=false 时原文返回（一字不改）。 */
export function applyPlaceholders(text: string, now: Date, enabled: boolean): string {
    if (!enabled || !text) return text;
    return text.replace(PLACEHOLDER_PATTERN, (_match, kind: string) => {
        return renderPlaceholder(kind as PlaceholderKind, now);
    });
}

/** 诊断：列出文本中出现的占位符种类（回执/提示用） */
export function listPlaceholders(text: string): PlaceholderKind[] {
    const kinds: PlaceholderKind[] = [];
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
        const kind = match[1] as PlaceholderKind;
        if (!kinds.includes(kind)) kinds.push(kind);
    }
    return kinds;
}
