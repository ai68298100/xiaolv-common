// 捕获去重防护（R14）：保存前按归一化纯文本比对索引摘要，命中则提示确认。
// 纯函数；索引摘要有界（240 字符），比对同样截断，防止超长内容误判。
import {LIMITS} from "../constants";
import {kramdownToPlainText} from "./item";

export interface DedupeCandidate {
    id: string;
    title: string;
}

export interface DedupeOptions {
    /** 排除特定条目 ID（编辑条目查重时避免与自身命中导致误报） */
    excludeId?: string;
    /** 是否大小写敏感，默认 false（即 "Hello" 与 "hello" 视为重复内容） */
    caseSensitive?: boolean;
}

function normalizeForCompare(text: string): string {
    return kramdownToPlainText(text)
        .replace(/[\s\u3000]+/g, " ")
        .trim()
        .slice(0, LIMITS.summary);
}

/** 返回与待存内容完全同文的既有条目；无则 null。 */
export function findDuplicateByContent(
    content: string,
    entries: ReadonlyArray<{id: string; title: string; summary: string}>,
    options?: DedupeOptions,
): DedupeCandidate | null {
    const normalized = normalizeForCompare(content);
    if (!normalized || normalized.length < 4) return null; // 过短内容不做去重（避免误报）
    const target = options?.caseSensitive ? normalized : normalized.toLowerCase();
    for (const entry of entries) {
        if (options?.excludeId && entry.id === options.excludeId) continue;
        const rawExisting = (entry.summary ?? "").replace(/[\s\u3000]+/g, " ").trim();
        const existing = options?.caseSensitive ? rawExisting : rawExisting.toLowerCase();
        if (existing && existing === target) {
            return {id: entry.id, title: entry.title};
        }
    }
    return null;
}
