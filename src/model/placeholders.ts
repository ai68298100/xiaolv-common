// 动态占位符（参考 Quicker 常用语核心能力；R6/R11；R67 v2；R160 v3；R161 参数分隔符改 |；R274 G16 日期时间格式化与算术引擎）：
// 基础语法 {{xlc:date}} {{xlc:time}} {{xlc:datetime}} {{xlc:weekday}} {{xlc:title}} {{xlc:path}} {{xlc:doc}}
// 日期算术（R160，对齐 Espanso/TextExpander 核心差距）：{{xlc:date|+3d}} {{xlc:date|-1w}} {{xlc:date|+2m}}
//   {{xlc:date|+1y}} {{xlc:date|next_monday}} —— 月/年进位按日历钳制（1/31 +1m → 2/28），next_* 取严格未来最近一天。
//   中文自然语言快捷（T-0112）：{{xlc:date|明天}} {{xlc:date|后天}} {{xlc:date|昨天}} {{xlc:date|下周五}} 等。
// 自定义格式化与复合算术（T-0127 / R274 / G16）：
//   {{xlc:date|YYYY年MM月DD日}} {{xlc:date|+3d|YYYY/MM/DD}} {{xlc:date|明天|YYYY年MM月DD日}}
//   {{xlc:time|HH:mm:ss}} {{xlc:time|+1h|HH:mm:ss}} {{xlc:time|+30m}}
//   {{xlc:datetime|YYYY-MM-DD HH:mm:ss}} {{xlc:datetime|明天|YYYY/MM/DD HH:mm}}
//   {{xlc:weekday|full}} (星期X) {{xlc:weekday|en}} (Monday) {{xlc:weekday|en_short}} (Mon)
// UUID 与紧凑短 ID（T-0128 / R275 / G17）：
//   {{xlc:uuid}} (标准小写 36 字符) {{xlc:uuid|upper}} (大写) {{xlc:uuid|simple}} (32 位无连字符)
//   {{xlc:id}} (默认 8 位去混淆短 ID) {{xlc:id|12}} (指定 4~32 位长度) {{xlc:id|upper}} (大写短 ID)
// 文本大小写与命名范式转换（T-0130 / R277 / G19）：
//   {{xlc:case|upper|text}} (大写) {{xlc:case|lower|TEXT}} (小写)
//   {{xlc:case|title|hello world}} (首字母大写 Hello World)
//   {{xlc:case|camel|user login token}} (小驼峰 userLoginToken)
//   {{xlc:case|pascal|user login token}} (大驼峰 UserLoginToken)
//   {{xlc:case|snake|user login token}} (下划线 user_login_token)
//   {{xlc:case|kebab|user login token}} (短横线 user-login-token)
//   {{xlc:case|constant|user login token}} (常量大写 USER_LOGIN_TOKEN)
//   兼容冒号子命令形态：{{xlc:case:upper|text}}
// 安全内联算术计算（T-0131 / R278 / G20）：
//   {{xlc:calc|100*1.13}} {{xlc:calc|round(100/3, 2)}} {{xlc:calc|(50+30)*0.8}}
// 选区包裹模式（T-0134 / R281 / G23）：
//   {{xlc:selection}} {{xlc:selection|默认内容}} (无选区时回退默认内容或空串)

import {evaluateMathExpression} from "./calculator";
// 随机选择（R160）：{{xlc:random|a,b,c}} —— 每次替换随机取一项（每选项前后空白忽略）。
// 带参语法分隔符必须是 | 而非 :（R161 真机验收发现）：Lute 把 :date: 当 emoji 短代码转换，
// {{xlc:date:+3d}} 落库即损坏成 {{xlc📅+3d}}；ask 冒号语法无此问题（:ask: 非短代码，真机已验证）。
// —— xlc: 命名空间避免与思源模板 {{...}} / 用户正文冲突；未知占位符与非法表达式一律原样保留（不吞内容）。
// title/path 引用当前文档（R11）；doc 为 title 别名（原型 v3 命名，R67）；无活动文档时替换为空串（不把占位符残留在正文里）。
// {{xlc:clipboard}} 剪贴板文本由执行层异步替换（applyOutput；读取失败替换为空串，语义与 title/path 一致）。
// {{xlc:cursor}} 与 {{xlc:ask:…}} 不在本模型：分别见 variables.ts（插入路径专用）。
// 替换时机：插入/复制时（executor 输出载荷）；条目存储内容永远保留模板原文。

export type PlaceholderKind = "date" | "time" | "datetime" | "weekday" | "title" | "path" | "doc" | "random" | "uuid" | "id" | "case" | "calc" | "selection";

// 带参形态只接受 | 分隔：: 分隔会撞 Lute emoji 短代码（:date:→📅，R161 真机实证），永不支持。
export const PLACEHOLDER_PATTERN = /\{\{xlc:(date|time|datetime|weekday|title|path|doc|random|uuid|id|calc|selection|case(?::[a-zA-Z0-9_-]+)?)(?:\|([^}]+))?\}\}/g;

export type PlaceholderResolver = (kind: PlaceholderKind) => string;

const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const WEEKDAYS_FULL_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ZH_RELATIVE_DAYS: Readonly<Record<string, number>> = {
    今天: 0,
    明天: 1,
    后天: 2,
    大后天: 3,
    昨天: -1,
    前天: -2,
    大前天: -3,
};

const ZH_NEXT_WEEKDAY: Readonly<Record<string, number>> = {
    下周一: 1, 下星期一: 1, 下礼拜一: 1,
    下周二: 2, 下星期二: 2, 下礼拜二: 2,
    下周三: 3, 下星期三: 3, 下礼拜三: 3,
    下周四: 4, 下星期四: 4, 下礼拜四: 4,
    下周五: 5, 下星期五: 5, 下礼拜五: 5,
    下周六: 6, 下星期六: 6, 下礼拜六: 6,
    下周日: 0, 下周天: 0, 下星期日: 0, 下星期天: 0, 下礼拜日: 0, 下礼拜天: 0,
};

// 日期算术参数：相对偏移 [+-]N(d|w|m|y) 与 next_星期；数字限 4 位防荒诞值。
const RELATIVE_ARG = /^([+-])(\d{1,4})([dwmy])$/;
const RELATIVE_TIME_ARG = /^([+-])(\d{1,4})([hms])$/i;
const NEXT_WEEKDAY_ARG = /^next_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/;
// JS getDay(): 0=周日
const WEEKDAY_INDEX: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

// 格式化令牌：长优先匹配
export const FORMAT_TOKEN_PATTERN = /YYYY|YY|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s|dddd|ddd|A|a/g;

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function renderDate(now: Date): string {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 格式化日期时间对象，零依赖轻量替换 */
export function formatDateTime(date: Date, pattern: string): string {
    return pattern.replace(FORMAT_TOKEN_PATTERN, (token) => {
        switch (token) {
            case "YYYY": return String(date.getFullYear());
            case "YY": return String(date.getFullYear()).slice(-2);
            case "MM": return pad(date.getMonth() + 1);
            case "M": return String(date.getMonth() + 1);
            case "DD": return pad(date.getDate());
            case "D": return String(date.getDate());
            case "HH": return pad(date.getHours());
            case "H": return String(date.getHours());
            case "hh": return pad(date.getHours() % 12 || 12);
            case "h": return String(date.getHours() % 12 || 12);
            case "mm": return pad(date.getMinutes());
            case "m": return String(date.getMinutes());
            case "ss": return pad(date.getSeconds());
            case "s": return String(date.getSeconds());
            case "dddd": return WEEKDAYS_FULL_ZH[date.getDay()] ?? "";
            case "ddd": return WEEKDAYS_ZH[date.getDay()] ?? "";
            case "A": return date.getHours() < 12 ? "上午" : "下午";
            case "a": return date.getHours() < 12 ? "am" : "pm";
            default: return token;
        }
    });
}

/** 检验是否为合法的时间格式模式（必须包含有效令牌，且不得包含未识别的 ASCII 字母） */
export function isValidFormatPattern(pattern: string): boolean {
    if (!pattern || !pattern.trim()) return false;
    let matchCount = 0;
    const stripped = pattern.replace(FORMAT_TOKEN_PATTERN, () => {
        matchCount++;
        return "";
    });
    if (matchCount === 0) return false;
    // 允许 ISO 分隔符 T/Z 以及空白和中文字符/标点
    const remainingLetters = stripped.replace(/[TZ]/g, "");
    if (/[A-Za-z]/.test(remainingLetters)) {
        return false;
    }
    return true;
}

/** 加 N 个月并把「日」钳制在目标月月末（1/31 +1m → 2/28；闰年 2/29 +1y → 2/28）。 */
function addMonthsClamped(base: Date, months: number): Date {
    const y = base.getFullYear();
    const m = base.getMonth() + months;
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(base.getDate(), lastDay));
}

/** 计算日期偏移并返回目标 Date，非法参数返回 null */
export function calculateDateOffset(now: Date, rawArg: string): Date | null {
    const arg = rawArg.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(ZH_RELATIVE_DAYS, arg)) {
        const offset = ZH_RELATIVE_DAYS[arg]!;
        const next = new Date(now);
        next.setDate(next.getDate() + offset);
        return next;
    }
    if (Object.prototype.hasOwnProperty.call(ZH_NEXT_WEEKDAY, arg)) {
        const target = ZH_NEXT_WEEKDAY[arg]!;
        const ahead = (target - now.getDay() + 7) % 7 || 7;
        const next = new Date(now);
        next.setDate(next.getDate() + ahead);
        return next;
    }
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
        return next;
    }
    const wd = NEXT_WEEKDAY_ARG.exec(arg);
    const dayName = wd?.[1];
    const target = dayName ? WEEKDAY_INDEX[dayName] : undefined;
    if (target !== undefined) {
        const ahead = (target - now.getDay() + 7) % 7 || 7;
        const next = new Date(now);
        next.setDate(next.getDate() + ahead);
        return next;
    }
    return null;
}

/** 计算时间偏移（+1h, -30m, +10s）并返回目标 Date，非法返回 null */
export function calculateTimeOffset(now: Date, rawArg: string): Date | null {
    const rel = RELATIVE_TIME_ARG.exec(rawArg.trim());
    if (!rel) return null;
    const sign = rel[1] === "+" ? 1 : -1;
    const n = Number(rel[2]);
    const unit = rel[3]!.toLowerCase();
    const next = new Date(now);
    if (unit === "h") {
        next.setHours(next.getHours() + sign * n);
    } else if (unit === "m") {
        next.setMinutes(next.getMinutes() + sign * n);
    } else if (unit === "s") {
        next.setSeconds(next.getSeconds() + sign * n);
    }
    return next;
}

/** 解析日期参数（支持偏移、格式及两者复合）；非法返回 null */
export function resolveDateArg(now: Date, rawArg: string): string | null {
    const trimmed = rawArg.trim();
    if (trimmed.includes("|")) {
        const firstPipeIndex = trimmed.indexOf("|");
        const offsetPart = trimmed.slice(0, firstPipeIndex).trim();
        const formatPart = trimmed.slice(firstPipeIndex + 1).trim();
        const targetDate = calculateDateOffset(now, offsetPart);
        if (targetDate && isValidFormatPattern(formatPart)) {
            return formatDateTime(targetDate, formatPart);
        }
        return null;
    }
    const targetDate = calculateDateOffset(now, trimmed);
    if (targetDate) {
        return renderDate(targetDate);
    }
    if (isValidFormatPattern(trimmed)) {
        return formatDateTime(now, trimmed);
    }
    return null;
}

/** 解析时间参数（支持偏移、格式及两者复合）；非法返回 null */
function resolveTimeArg(now: Date, rawArg: string): string | null {
    const trimmed = rawArg.trim();
    if (trimmed.includes("|")) {
        const firstPipeIndex = trimmed.indexOf("|");
        const offsetPart = trimmed.slice(0, firstPipeIndex).trim();
        const formatPart = trimmed.slice(firstPipeIndex + 1).trim();
        const targetTime = calculateTimeOffset(now, offsetPart);
        if (targetTime && isValidFormatPattern(formatPart)) {
            return formatDateTime(targetTime, formatPart);
        }
        return null;
    }
    const targetTime = calculateTimeOffset(now, trimmed);
    if (targetTime) {
        return `${pad(targetTime.getHours())}:${pad(targetTime.getMinutes())}`;
    }
    if (isValidFormatPattern(trimmed)) {
        return formatDateTime(now, trimmed);
    }
    return null;
}

/** 解析日期时间参数（支持偏移、格式及两者复合）；非法返回 null */
function resolveDatetimeArg(now: Date, rawArg: string): string | null {
    const trimmed = rawArg.trim();
    if (trimmed.includes("|")) {
        const firstPipeIndex = trimmed.indexOf("|");
        const offsetPart = trimmed.slice(0, firstPipeIndex).trim();
        const formatPart = trimmed.slice(firstPipeIndex + 1).trim();
        const target = calculateDateOffset(now, offsetPart) || calculateTimeOffset(now, offsetPart);
        if (target && isValidFormatPattern(formatPart)) {
            return formatDateTime(target, formatPart);
        }
        return null;
    }
    const target = calculateDateOffset(now, trimmed) || calculateTimeOffset(now, trimmed);
    if (target) {
        return `${renderDate(target)} ${pad(target.getHours())}:${pad(target.getMinutes())}`;
    }
    if (isValidFormatPattern(trimmed)) {
        return formatDateTime(now, trimmed);
    }
    return null;
}

/** 解析星期参数（full/dddd、short/ddd、en、en_short）；非法返回 null */
function resolveWeekdayArg(now: Date, rawArg: string): string | null {
    const arg = rawArg.trim().toLowerCase();
    const day = now.getDay();
    if (arg === "full" || arg === "dddd") {
        return WEEKDAYS_FULL_ZH[day] ?? "";
    }
    if (arg === "short" || arg === "ddd") {
        return WEEKDAYS_ZH[day] ?? "";
    }
    if (arg === "en") {
        return WEEKDAYS_EN[day] ?? "";
    }
    if (arg === "en_short") {
        return WEEKDAYS_SHORT_EN[day] ?? "";
    }
    return null;
}

/** 随机选一：逗号分隔选项（支持中英文逗号与顿号 [,，、]），每项去首尾空白；无可选项返回 null（保留原文）。 */
export function pickRandomOption(rawArg: string): string | null {
    const options = rawArg.split(/[,，、]/).map((s) => s.trim()).filter(Boolean).slice(0, 16);
    if (options.length === 0) return null;
    return options[Math.floor(Math.random() * options.length)] ?? null;
}

/**
 * 生成符合 RFC 4122 v4 规范的标准 UUID（小写 36 字符）
 * 优先使用宿主 crypto.randomUUID()，不可用时通过位运算安全回退
 */
export function generateUuidV4(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        try {
            return crypto.randomUUID().toLowerCase();
        } catch {
            // 降级回退
        }
    }
    // RFC 4122 v4 回退实现：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // 其中 y 为 8, 9, a, 或 b (即 (r & 0x3) | 0x8)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// 去混淆字符集（排除易混淆的 0/O, 1/l/I）
const UNAMBIGUOUS_CHARS = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * 生成紧凑短随机 ID（排除易混淆字符）
 * @param length 字符长度，合法区间 [4, 32]，默认 8
 * @param uppercase 是否强制转为全大写，默认 false
 */
export function generateShortId(length = 8, uppercase = false): string {
    const validLen = Math.max(4, Math.min(32, length || 8));
    let result = "";
    for (let i = 0; i < validLen; i++) {
        const idx = Math.floor(Math.random() * UNAMBIGUOUS_CHARS.length);
        result += UNAMBIGUOUS_CHARS[idx];
    }
    return uppercase ? result.toUpperCase() : result;
}

/** 解析 UUID 参数（upper, simple/compact）；非法返回 null */
export function resolveUuidArg(rawArg: string): string | null {
    const tokens = rawArg.split(/[,，|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (tokens.length === 0) return generateUuidV4();
    let isUpper = false;
    let isSimple = false;
    for (const tok of tokens) {
        if (tok === "upper" || tok === "uppercase") {
            isUpper = true;
        } else if (tok === "simple" || tok === "compact") {
            isSimple = true;
        } else {
            return null;
        }
    }
    let uuid = generateUuidV4();
    if (isSimple) {
        uuid = uuid.replace(/-/g, "");
    }
    if (isUpper) {
        uuid = uuid.toUpperCase();
    }
    return uuid;
}

/** 解析短 ID 参数（4~32 数字长度，或 upper）；非法返回 null */
export function resolveIdArg(rawArg: string): string | null {
    const tokens = rawArg.split(/[,，|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (tokens.length === 0) return generateShortId(8, false);
    let length = 8;
    let isUpper = false;
    for (const tok of tokens) {
        if (/^\d{1,2}$/.test(tok)) {
            const num = Number(tok);
            if (num < 4 || num > 32) return null;
            length = num;
        } else if (tok === "upper" || tok === "uppercase") {
            isUpper = true;
        } else {
            return null;
        }
    }
    return generateShortId(length, isUpper);
}

/** 分词提取单词：支持下划线、短横线、空白、标点以及驼峰边界切分 */
export function splitWords(text: string): string[] {
    if (!text || !text.trim()) return [];
    // 匹配连续大写、大写后接小写、纯小写、数字、中文汉字块
    const matches = text.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+|[\u4e00-\u9fa5]+/g);
    return matches ? matches.map((w) => w.trim()).filter(Boolean) : [];
}

/**
 * 文本命名范式转换器（纯函数、零副作用）
 * @param text 输入文本
 * @param style 命名风格
 */
export function transformCase(text: string, style: string): string | null {
    if (typeof text !== "string") return null;
    if (!text) return "";
    const normStyle = style.trim().toLowerCase();
    switch (normStyle) {
        case "upper":
        case "uppercase":
            return text.toUpperCase();
        case "lower":
        case "lowercase":
            return text.toLowerCase();
        case "title":
        case "capitalize": {
            const words = splitWords(text);
            if (words.length === 0) return text;
            return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
        case "camel":
        case "camelcase": {
            const words = splitWords(text);
            if (words.length === 0) return text;
            return words.map((w, idx) => {
                const lower = w.toLowerCase();
                return idx === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
            }).join("");
        }
        case "pascal":
        case "pascalcase": {
            const words = splitWords(text);
            if (words.length === 0) return text;
            return words.map((w) => {
                const lower = w.toLowerCase();
                return lower.charAt(0).toUpperCase() + lower.slice(1);
            }).join("");
        }
        case "snake":
        case "snakecase": {
            const words = splitWords(text);
            if (words.length === 0) return text;
            return words.map((w) => w.toLowerCase()).join("_");
        }
        case "kebab":
        case "kebabcase": {
            const words = splitWords(text);
            if (words.length === 0) return text;
            return words.map((w) => w.toLowerCase()).join("-");
        }
        case "constant": {
            const words = splitWords(text);
            if (words.length === 0) return text;
            return words.map((w) => w.toUpperCase()).join("_");
        }
        default:
            return null;
    }
}

/** 解析 case 语法参数 */
export function resolveCaseArg(rawArg: string, subStyle?: string): string | null {
    if (subStyle) {
        return transformCase(rawArg, subStyle);
    }
    const trimmed = rawArg.trim();
    const firstPipe = trimmed.indexOf("|");
    if (firstPipe === -1) return null;
    const style = trimmed.slice(0, firstPipe).trim();
    const content = trimmed.slice(firstPipe + 1);
    return transformCase(content, style);
}

export function renderPlaceholder(kind: PlaceholderKind, now: Date, doc?: {title: string; path: string; selection?: string} | null): string {
    switch (kind) {
        case "date": return renderDate(now);
        case "time": return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        case "datetime": return `${renderDate(now)} ${renderPlaceholder("time", now)}`;
        case "weekday": return WEEKDAYS_ZH[now.getDay()] ?? "";
        case "title":
        case "doc": return doc?.title ?? "";
        case "path": return doc?.path ?? "";
        case "random": return "";
        case "uuid": return generateUuidV4();
        case "id": return generateShortId(8, false);
        case "case": return "";
        case "calc": return "";
        case "selection": return doc?.selection ?? "";
    }
}

/**
 * 解析占位符（含带参形态）：返回 null 表示非法/不可解析——调用方保留原文（不吞内容）。
 */
export function resolvePlaceholder(
    rawKind: string,
    arg: string | undefined,
    now: Date,
    doc?: {title: string; path: string; selection?: string} | null,
): string | null {
    let kind = rawKind as PlaceholderKind;
    let subStyle: string | undefined;
    if (rawKind.startsWith("case")) {
        kind = "case";
        if (rawKind.includes(":")) {
            subStyle = rawKind.split(":")[1];
        }
    }
    if (kind === "random") return arg ? pickRandomOption(arg) : null;
    if (kind === "date") return arg ? resolveDateArg(now, arg) : renderDate(now);
    if (kind === "time") return arg ? resolveTimeArg(now, arg) : `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (kind === "datetime") return arg ? resolveDatetimeArg(now, arg) : `${renderDate(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (kind === "weekday") return arg ? resolveWeekdayArg(now, arg) : (WEEKDAYS_ZH[now.getDay()] ?? "");
    if (kind === "uuid") return arg ? resolveUuidArg(arg) : generateUuidV4();
    if (kind === "id") return arg ? resolveIdArg(arg) : generateShortId(8, false);
    if (kind === "case") return arg ? resolveCaseArg(arg, subStyle) : null;
    if (kind === "calc") return arg ? evaluateMathExpression(arg) : null;
    if (kind === "selection") return (doc?.selection && doc.selection.length > 0) ? doc.selection : (arg ?? "");
    if (arg) return null;
    return renderPlaceholder(kind, now, doc);
}

/** 应用占位符替换（resolver 返回各 kind 的值）。enabled=false 时原文返回（一字不改）。 */
export function applyPlaceholders(text: string, now: Date, enabled: boolean, doc?: {title: string; path: string; selection?: string} | null): string {
    if (!enabled || !text) return text;
    return text.replace(PLACEHOLDER_PATTERN, (match, kind: string, arg?: string) => {
        return resolvePlaceholder(kind, arg, now, doc) ?? match;
    });
}

/** 诊断：列出文本中出现的占位符种类（回执/提示/预取判定用） */
export function listPlaceholders(text: string): PlaceholderKind[] {
    const kinds: PlaceholderKind[] = [];
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
        const rawKind = match[1]!;
        const kind = (rawKind.startsWith("case") ? "case" : rawKind) as PlaceholderKind;
        if (!kinds.includes(kind)) kinds.push(kind);
    }
    return kinds;
}
