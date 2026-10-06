// 动态占位符（参考 Quicker 常用语核心能力；R6/R11；R67 v2）：
// 语法 {{xlc:date}} {{xlc:time}} {{xlc:datetime}} {{xlc:weekday}} {{xlc:title}} {{xlc:path}} {{xlc:doc}}
// —— xlc: 命名空间避免与思源模板 {{...}} / 用户正文冲突；未知占位符原样保留（不吞内容）。
// title/path 引用当前文档（R11）；doc 为 title 别名（原型 v3 命名，R67）；无活动文档时替换为空串（不把占位符残留在正文里）。
// {{xlc:clipboard}} 剪贴板文本由执行层异步替换（applyOutput；读取失败替换为空串，语义与 title/path 一致）。
// {{xlc:cursor}} 与 {{xlc:ask:…}} 不在本模型：分别见 variables.ts（插入路径专用）。
// 替换时机：插入/复制时（executor 输出载荷）；条目存储内容永远保留模板原文。

export type PlaceholderKind = "date" | "time" | "datetime" | "weekday" | "title" | "path" | "doc";

export const PLACEHOLDER_PATTERN = /\{\{xlc:(date|time|datetime|weekday|title|path|doc)\}\}/g;

export type PlaceholderResolver = (kind: PlaceholderKind) => string;

const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

export function renderPlaceholder(kind: PlaceholderKind, now: Date, doc?: {title: string; path: string} | null): string {
    switch (kind) {
        case "date": return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        case "time": return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        case "datetime": return `${renderPlaceholder("date", now)} ${renderPlaceholder("time", now)}`;
        case "weekday": return WEEKDAYS_ZH[now.getDay()] ?? "";
        case "title":
        case "doc": return doc?.title ?? "";
        case "path": return doc?.path ?? "";
    }
}

/** 应用占位符替换（resolver 返回各 kind 的值）。enabled=false 时原文返回（一字不改）。 */
export function applyPlaceholders(text: string, now: Date, enabled: boolean, doc?: {title: string; path: string} | null): string {
    if (!enabled || !text) return text;
    return text.replace(PLACEHOLDER_PATTERN, (_match, kind: string) => {
        return renderPlaceholder(kind as PlaceholderKind, now, doc);
    });
}

/** 诊断：列出文本中出现的占位符种类（回执/提示/预取判定用） */
export function listPlaceholders(text: string): PlaceholderKind[] {
    const kinds: PlaceholderKind[] = [];
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
        const kind = match[1] as PlaceholderKind;
        if (!kinds.includes(kind)) kinds.push(kind);
    }
    return kinds;
}
