// 拼音适配层（ADR 0004，R5 扩展）：搜索只依赖此接口。
// noop 默认实现零依赖零开销；tiny-pinyin 适配器见 pinyin-tiny.ts（装配处一行切换）。
export interface PinyinAnnotation {
    /** 全拼串（小写、无分隔），如 "changyongyu" */
    py: string;
    /** 首字母串，如 "cyy" */
    pyi: string;
}

export interface PinyinAdapter {
    /** 把查询词展开为一组等价匹配串（含原词）。多音字/模糊匹配在实现内消化。 */
    expand(query: string): string[];
    /** 条目文本 → 拼音注解（索引期调用一次；noop 返回 null 即零开销）。长文本由实现负责截断。 */
    annotate(text: {title: string; alias: string}): PinyinAnnotation | null;
    /** 能力声明：是否支持首字母/全拼（能力面板如实显示） */
    readonly capabilities: {initials: boolean; fullPinyin: boolean};
}

export function createNoopPinyinAdapter(): PinyinAdapter {
    return {
        capabilities: {initials: false, fullPinyin: false},
        expand(query) {
            const q = query.trim();
            return q ? [q] : [];
        },
        annotate() {
            return null;
        },
    };
}

// 装配点：替换为真实拼音适配器时只改这里
let active: PinyinAdapter = createNoopPinyinAdapter();

export function getPinyinAdapter(): PinyinAdapter {
    return active;
}

export function setPinyinAdapter(adapter: PinyinAdapter): void {
    active = adapter ?? createNoopPinyinAdapter();
}
