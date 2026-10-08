// 变量模型（R67/F1，质感基准 docs/design/prototype.html 屏 4；R160 v2）：
// ask 语法 {{xlc:ask:名称}} 文本 / {{xlc:ask:名称|A,B,C}} 下拉 / {{xlc:ask:名称|date}} 日期
// / {{xlc:ask:名称|textarea}} 多行文本（R160；填充卡渲染 textarea，Enter 换行、按钮插入）。
// —— ask 与动态占位符（placeholders.ts）分离：ask 在插入前由填充卡片收集，存储内容永远保留模板原文。
// 不可用变量诚实降级：插入路径上未填充的 ask 展开为 __名称__（可见可改，绝不静默丢）。
// code 条目不处理变量：代码中的 {{xlc:…}} 是字面文本（与 r23 决策一致）。
// 片段嵌套（R72/F5）：{{xlc:snippet:标题}} 引用其他条目，插入时由 library.expandSnippetRefs 展开
// （深度 ≤3、环检测；此处只提供语法模式与光标/检测工具）。

import {LIMITS} from "../constants";

export type AskFieldKind = "text" | "select" | "date" | "textarea";

export interface AskField {
    /** 字段名（label；同名去重后只询问一次） */
    name: string;
    kind: AskFieldKind;
    /** select 选项列表 */
    options: string[];
}

// 名称禁 | 与 }；选项段不含 }。懒惰量防跨占位符误吞。
const ASK_PATTERN = /\{\{xlc:ask:([^|}]+)(?:\|([^}]*))?\}\}/g;

export function parseAskField(rawName: string, rawOptions: string | undefined): AskField | null {
    const name = rawName.trim().slice(0, LIMITS.tag);
    if (!name) return null;
    const options = (rawOptions ?? "")
        .split(",")
        .map((s) => s.trim().slice(0, LIMITS.tag))
        .filter(Boolean)
        .slice(0, 16);
    // date/textarea 单选项大小写不敏感：{{xlc:ask:x|DATE}} / {{xlc:ask:x|TextArea}} 语义不变（R139/R160）
    if (options.length === 1 && options[0]?.toLowerCase() === "date") return {name, kind: "date", options: []};
    if (options.length === 1 && options[0]?.toLowerCase() === "textarea") return {name, kind: "textarea", options: []};
    if (options.length >= 2) return {name, kind: "select", options};
    return {name, kind: "text", options: []};
}

/** 字段语法回显（填充卡片/预览 chip 共用）：展示与解析口径一致，不各写一份模板字符串。 */
export function askFieldTag(field: AskField): string {
    if (field.kind === "text") return `{{xlc:ask:${field.name}}}`;
    if (field.kind === "select") return `{{xlc:ask:${field.name}|${field.options.join(",")}}}`;
    return `{{xlc:ask:${field.name}|${field.kind}}}`;
}

/** 列出文本中的 ask 字段（同名去重，保留首次出现的形态）。 */
export function listAskFields(text: string): AskField[] {
    if (!text) return [];
    const fields: AskField[] = [];
    const seen = new Set<string>();
    for (const match of text.matchAll(ASK_PATTERN)) {
        const field = parseAskField(match[1] ?? "", match[2]);
        if (!field || seen.has(field.name)) continue;
        seen.add(field.name);
        fields.push(field);
        if (fields.length >= 16) break;
    }
    return fields;
}

export function countAskFields(text: string): number {
    return listAskFields(text).length;
}

/** 填充值清洗：去首尾空白、限长（多行合法）。 */
function cleanFillValue(v: string): string {
    return (v ?? "").trim().slice(0, LIMITS.askValueChars);
}

/**
 * 用填充值展开 ask。未提供值的字段展开为 __名称__（SiYuan 模板占位惯例，可见可改，不静默丢）。
 * 填充值中若含占位符/ask 语法，不再二次展开（防注入式套娃）。
 */
export function expandAsks(text: string, fills: Record<string, string>): string {
    if (!text) return text;
    return text.replace(ASK_PATTERN, (_match, rawName: string, rawOptions?: string) => {
        const field = parseAskField(rawName, rawOptions);
        if (!field) return _match;
        const filled = Object.prototype.hasOwnProperty.call(fills, field.name) ? cleanFillValue(fills[field.name] ?? "") : "";
        if (filled) return filled;
        return `__${field.name}__`;
    });
}

/** 插入路径上未填充 ask 的默认展开（插入前询问关闭/绕过时）：__名称__ 可见兜底。 */
export function applyAskDefaults(text: string): string {
    return expandAsks(text, {});
}

/** {{xlc:cursor}} 光标落点标记：宿主官方 API 无法定位文内光标，插入时移除标记（光标自然落在插入内容之后）。 */
export const CURSOR_TOKEN = "{{xlc:cursor}}";

/** 片段引用语法（F5）：标题不含 }；展开语义见 library.expandSnippetRefs */
export const SNIPPET_PATTERN = /\{\{xlc:snippet:([^}]+)\}\}/g;

export function stripCursorToken(text: string): string {
    return text.split(CURSOR_TOKEN).join("");
}

export function hasCursorToken(text: string): boolean {
    return text.includes(CURSOR_TOKEN);
}
