// 捕获去重防护（R14）：保存前按归一化纯文本比对索引摘要，命中则提示确认。
// 纯函数；索引摘要有界（240 字符），比对同样截断，防止超长内容误判。
import {LIMITS} from "../constants";
import {kramdownToPlainText} from "./item";

export interface DedupeCandidate {
    id: string;
    title: string;
}

function normalizeForCompare(text: string): string {
    return kramdownToPlainText(text).replace(/\s+/g, " ").trim().slice(0, LIMITS.summary);
}

/** 返回与待存内容完全同文的既有条目；无则 null。 */
export function findDuplicateByContent(
    content: string,
    entries: ReadonlyArray<{id: string; title: string; summary: string}>,
): DedupeCandidate | null {
    const normalized = normalizeForCompare(content);
    if (!normalized || normalized.length < 4) return null; // 过短内容不做去重（避免误报）
    for (const entry of entries) {
        const existing = (entry.summary ?? "").replace(/\s+/g, " ").trim();
        if (existing && existing === normalized) {
            return {id: entry.id, title: entry.title};
        }
    }
    return null;
}
