// 动态占位符（参考 Quicker 常用语核心能力；R6/R11；R67 v2；R160 v3）：
// 基础语法 {{xlc:date}} {{xlc:time}} {{xlc:datetime}} {{xlc:weekday}} {{xlc:title}} {{xlc:path}} {{xlc:doc}}
// 日期算术（R160，对齐 Espanso/TextExpander 核心差距）：{{xlc:date:+3d}} {{xlc:date:-1w}} {{xlc:date:+2m}}
//   {{xlc:date:+1y}} {{xlc:date:next_monday}} —— 月/年进位按日历钳制（1/31 +1m → 2/28），next_* 取严格未来最近一天。
// 随机选择（R160）：{{xlc:random:a,b,c}} —— 每次替换随机取一项（每选项前后空白忽略）。
// —— xlc: 命名空间避免与思源模板 {{...}} / 用户正文冲突；未知占位符与非法表达式一律原样保留（不吞内容）。
// title/path 引用当前文档（R11）；doc 为 title 别名（原型 v3 命名，R67）；无活动文档时替换为空串（不把占位符残留在正文里）。
// {{xlc:clipboard}} 剪贴板文本由执行层异步替换（applyOutput；读取失败替换为空串，语义与 title/path 一致）。
// {{xlc:cursor}} 与 {{xlc:ask:…}} 不在本模型：分别见 variables.ts（插入路径专用）。
// 替换时机：插入/复制时（executor 输出载荷）；条目存储内容永远保留模板原文。

export type PlaceholderKind = "date" | "time" | "datetime" | "weekday" | "title" | "path" | "doc" | "random";

export const PLACEHOLDER_PATTERN = /\{\{xlc:(date|time|datetime|weekday|title|path|doc|random)(?::([^}]+))?\}\}/g;

export type PlaceholderResolver = (kind: PlaceholderKind) => string;

const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// 日期算术参数：相对偏移 [+-]N(d|w|m|y) 与 next_星期；数字限 4 位防荒诞值。
const RELATIVE_ARG = /^([+-])(\d{1,4})([dwmy])$/;
const NEXT_WEEKDAY_ARG = /^next_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/;
// JS getDay(): 0=周日
const WEEKDAY_INDEX: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function renderDate(now: Date): string {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 加 N 个月并把「日」钳制在目标月月末（1/31 +1m → 2/28；闰年 2/29 +1y → 2/28）。 */
function addMonthsClamped(base: Date, months: number): Date {
    const y = base.getFullYear();
    const m = base.getMonth() + months;
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(base.getDate(), lastDay));
}

/** 解析日期算术参数并渲染；非法参数返回 null（调用方保留占位符原文）。 */
export function resolveDateArg(now: Date, rawArg: string): string | null {
    const arg = rawArg.trim().toLowerCase();
    const rel = RELATIVE_ARG.exec(arg);
    if (rel) {
        const sign = rel[1] === "+" ? 1 : -1;
        const n = Number(rel[2]);
        let next: Date;
        if (rel[3] === "d" || rel[3] === "w") {
            next = new Date(now);
            next.setDate(next.getDate() + sign * n * (rel[3] === "w" ? 7 : 1));
        } else {
            next = addMonthsClamped(now, sign * n * (rel[3] === "y" ? 12 : 1));
        }
        return renderDate(next);
    }
    const wd = NEXT_WEEKDAY_ARG.exec(arg);
    const dayName = wd?.[1];
    const target = dayName ? WEEKDAY_INDEX[dayName] : undefined;
    if (target !== undefined) {
        const ahead = (target - now.getDay() + 7) % 7 || 7;
        const next = new Date(now);
        next.setDate(next.getDate() + ahead);
        return renderDate(next);
    }
    return null;
}

/** 随机选一：逗号分隔选项，每项去首尾空白；无可选项返回 null（保留原文）。 */
export function pickRandomOption(rawArg: string): string | null {
    const options = rawArg.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 16);
    if (options.length === 0) return null;
    return options[Math.floor(Math.random() * options.length)] ?? null;
}

export function renderPlaceholder(kind: PlaceholderKind, now: Date, doc?: {title: string; path: string} | null): string {
    switch (kind) {
        case "date": return renderDate(now);
        case "time": return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        case "datetime": return `${renderDate(now)} ${renderPlaceholder("time", now)}`;
        case "weekday": return WEEKDAYS_ZH[now.getDay()] ?? "";
        case "title":
        case "doc": return doc?.title ?? "";
        case "path": return doc?.path ?? "";
        case "random": return "";
    }
}

/**
 * 解析占位符（含带参形态）：返回 null 表示非法/不可解析——调用方保留原文（不吞内容）。
 * 基础 kind 不接受参数（{{xlc:time:任意}} 原样保留，不静默忽略参数）。
 */
export function resolvePlaceholder(
    kind: PlaceholderKind,
    arg: string | undefined,
    now: Date,
    doc?: {title: string; path: string} | null,
): string | null {
    if (kind === "random") return arg ? pickRandomOption(arg) : null;
    if (kind === "date" && arg) return resolveDateArg(now, arg);
    if (arg) return null;
    return renderPlaceholder(kind, now, doc);
}

/** 应用占位符替换（resolver 返回各 kind 的值）。enabled=false 时原文返回（一字不改）。 */
export function applyPlaceholders(text: string, now: Date, enabled: boolean, doc?: {title: string; path: string} | null): string {
    if (!enabled || !text) return text;
    return text.replace(PLACEHOLDER_PATTERN, (match, kind: string, arg?: string) => {
        return resolvePlaceholder(kind as PlaceholderKind, arg, now, doc) ?? match;
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
