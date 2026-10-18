// tiny-pinyin 适配器（MIT，npm tiny-pinyin@1.x）：全拼 + 首字母注解与查询。
// 注解截断：title+alias 前 80 字符（索引期开销有界）。
import PinyinLib from "tiny-pinyin";
import {createNoopPinyinAdapter, PinyinAdapter, PinyinAnnotation} from "./pinyin";

const ANNOTATE_MAX_CHARS = 80;

/** 高频场景多音词词组映射表（ADR 0041 / T-0068） */
export const POLYPHONE_PHRASES: Readonly<Record<string, readonly string[]>> = {
    "开户行": ["kai", "hu", "hang"],
    "开户银行": ["kai", "hu", "yin", "hang"],
    "银行": ["yin", "hang"],
    "行业": ["hang", "ye"],
    "行长": ["hang", "zhang"],
    "重新": ["chong", "xin"],
    "重试": ["chong", "shi"],
    "重构": ["chong", "gou"],
    "重要": ["zhong", "yao"],
    "重点": ["zhong", "dian"],
    "会计": ["kuai", "ji"],
    "调整": ["tiao", "zheng"],
    "调试": ["tiao", "shi"],
    "调查": ["diao", "cha"],
    "长按": ["chang", "an"],
    "长度": ["chang", "du"],
    "成长": ["cheng", "zhang"],
    "差错": ["cha", "cuo"],
    "差别": ["cha", "bie"],
    "出差": ["chu", "chai"],
    "处理": ["chu", "li"],
    "相处": ["xiang", "chu"],
    "更名": ["geng", "ming"],
    "更改": ["geng", "gai"],
};

export interface CharPinyinInfo {
    char: string;
    py: string;
    initial: string;
    index: number;
}

function isCjk(char: string): boolean {
    const code = char.codePointAt(0) ?? 0;
    return code >= 0x4e00 && code <= 0x9fff;
}

/** 词组优先的字符级拼音提取引擎（ADR 0041） */
export function extractCharPinyins(text: string, maxChars: number, options?: {cjkOnly?: boolean}): CharPinyinInfo[] {
    if (!text) return [];
    const len = Math.min(text.length, maxChars);
    const chars: CharPinyinInfo[] = [];
    const cjkOnly = options?.cjkOnly ?? false;
    let cursor = 0;

    while (cursor < len) {
        // 尝试前瞻匹配多音词表中的词组（由长到短匹配）
        let matchedPhrase: string | null = null;
        let matchedPys: readonly string[] | null = null;
        for (const [phrase, pys] of Object.entries(POLYPHONE_PHRASES)) {
            if (text.startsWith(phrase, cursor)) {
                if (!matchedPhrase || phrase.length > matchedPhrase.length) {
                    matchedPhrase = phrase;
                    matchedPys = pys;
                }
            }
        }

        if (matchedPhrase && matchedPys) {
            for (let k = 0; k < matchedPhrase.length; k++) {
                const c = matchedPhrase[k] ?? "";
                const py = matchedPys[k] ?? "";
                chars.push({
                    char: c,
                    py,
                    initial: py[0] || "",
                    index: cursor + k,
                });
            }
            cursor += matchedPhrase.length;
            continue;
        }

        // 单字注音回退
        const char = text[cursor] ?? "";
        if (isCjk(char)) {
            const py = PinyinLib.convertToPinyin(char, "", true).toLowerCase();
            chars.push({char, py, initial: py[0] || "", index: cursor});
        } else if (!cjkOnly) {
            const lower = char.toLowerCase();
            chars.push({char, py: lower, initial: lower, index: cursor});
        }
        cursor++;
    }

    return chars;
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
            // 索引期跳过非汉字（R5 契约），只为汉字生成 py/pyi
            const charInfos = extractCharPinyins(combined, ANNOTATE_MAX_CHARS, {cjkOnly: true});
            if (charInfos.length === 0) return null;
            const py = charInfos.map((c) => c.py).join("");
            if (!py) return null;
            const pyi = charInfos.map((c) => c.initial).join("");
            return {py, pyi};
        },
    };
}

/**
 * 拼音检索汉字字符级定位（ADR 0038 / T-0065，升级多音词支持 ADR 0041 / T-0068）：
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

    const chars = extractCharPinyins(text, 120);
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

    // 2. 连续汉字全拼音节匹配（含输入过程中的前缀音节平滑匹配，消除输入中高亮闪断）
    for (let i = 0; i < chars.length; i++) {
        let accumulatedTokenIndex = 0;
        for (let j = i; j < chars.length; j++) {
            const item = chars[j];
            if (!item || !item.py) break;
            const remainingToken = token.slice(accumulatedTokenIndex);
            if (!remainingToken) break;

            if (remainingToken === item.py) {
                // 当前汉字完整拼音恰好消耗完剩余 token
                const startItem = chars[i];
                if (startItem) {
                    intervals.push([startItem.index, item.index + 1]);
                }
                break;
            } else if (remainingToken.startsWith(item.py)) {
                // 当前汉字完整拼音被 token 包含，继续向后匹配下一汉字
                accumulatedTokenIndex += item.py.length;
            } else if (token.length >= 2 && item.py.startsWith(remainingToken)) {
                // 最后一个汉字的前缀拼音匹配（例如 "yanq" 匹配 "延" [yan] + "期" [qi 开头]）
                const startItem = chars[i];
                if (startItem) {
                    intervals.push([startItem.index, item.index + 1]);
                }
                break;
            } else {
                break;
            }
        }
    }

    return intervals;
}
