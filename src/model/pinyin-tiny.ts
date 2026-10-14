// tiny-pinyin 适配器（MIT，npm tiny-pinyin@1.x）：全拼 + 首字母注解与查询。
// 注解截断：title+alias 前 80 字符（索引期开销有界）。
import PinyinLib from "tiny-pinyin";
import {createNoopPinyinAdapter, PinyinAdapter, PinyinAnnotation} from "./pinyin";

const ANNOTATE_MAX_CHARS = 80;

function isCjk(char: string): boolean {
    const code = char.codePointAt(0) ?? 0;
    return code >= 0x4e00 && code <= 0x9fff;
}

function fullPinyin(text: string): string {
    let out = "";
    for (const char of text.slice(0, ANNOTATE_MAX_CHARS)) {
        if (!isCjk(char)) continue;
        const py = PinyinLib.convertToPinyin(char, "", true);
        out += py;
    }
    return out;
}

function initials(text: string): string {
    let out = "";
    for (const char of text.slice(0, ANNOTATE_MAX_CHARS)) {
        if (!isCjk(char)) continue;
        const py = PinyinLib.convertToPinyin(char, "", true);
        if (py) out += py[0];
    }
    return out;
}

export function createTinyPinyinAdapter(): PinyinAdapter {
    if (!PinyinLib.isSupported()) {
        // 环境不支持（无 ICU 段）：退回 noop，基础中文搜索不受影响
        return createNoopPinyinAdapter();
    }
    return {
        capabilities: {initials: true, fullPinyin: true},
        expand(query) {
            const q = query.trim();
            return q ? [q] : [];
        },
        annotate(text: {title: string; alias: string}): PinyinAnnotation | null {
            const combined = `${text.alias || ""}${text.title || ""}`;
            if (!combined) return null;
            const py = fullPinyin(combined);
            if (!py) return null;
            return {py, pyi: initials(combined)};
        },
    };
}

/**
 * 拼音检索汉字字符级定位（ADR 0038 / T-0065）：
 * 当查询词为纯 ASCII 字母时，计算命中的汉字在原字符串中的物理区间 [start, end)。
 * 支持：首字母匹配（如 "yq" 匹配 "延期致歉" 中的 "延期" -> [0, 2]）
 * 以及全拼音节匹配（如 "yanqi" 匹配 "延期致歉" 中的 "延期" -> [0, 2]）。
 */
export function findPinyinMatches(text: string, rawToken: string): Array<[number, number]> {
    if (!text || !rawToken) return [];
    const token = rawToken.trim().toLowerCase();
    // 仅针对纯字母且长度适中的 token 尝试拼音定位（长词/含汉字直接走字面匹配，避免无效计算）
    if (!/^[a-z]{1,40}$/.test(token)) return [];
    if (!PinyinLib.isSupported()) return [];

    const chars: Array<{char: string; py: string; initial: string; index: number}> = [];
    const maxLen = Math.min(text.length, 120);
    for (let i = 0; i < maxLen; i++) {
        const char = text[i] ?? "";
        if (isCjk(char)) {
            const py = PinyinLib.convertToPinyin(char, "", true).toLowerCase();
            chars.push({char, py, initial: py[0] || "", index: i});
        } else {
            const lower = char.toLowerCase();
            chars.push({char, py: lower, initial: lower, index: i});
        }
    }

    if (chars.length === 0) return [];

    const intervals: Array<[number, number]> = [];

    // 1. 首字母匹配（Initials Match）
    const initialsStr = chars.map((c) => c.initial).join("");
    let initCursor = 0;
    while (initCursor <= initialsStr.length - token.length) {
        const at = initialsStr.indexOf(token, initCursor);
        if (at < 0) break;
        const startItem = chars[at];
        const endItem = chars[at + token.length - 1];
        if (startItem && endItem) {
            intervals.push([startItem.index, endItem.index + 1]);
        }
        initCursor = at + 1;
    }

    // 2. 连续汉字全拼匹配（Full Pinyin Syllables Match）
    for (let i = 0; i < chars.length; i++) {
        let concatPy = "";
        for (let j = i; j < chars.length; j++) {
            const item = chars[j];
            if (!item || !item.py) break;
            concatPy += item.py;
            if (concatPy === token) {
                const startItem = chars[i];
                if (startItem) {
                    intervals.push([startItem.index, item.index + 1]);
                }
                break;
            }
            if (concatPy.length >= token.length) {
                break;
            }
        }
    }

    return intervals;
}
