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
