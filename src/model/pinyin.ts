// 拼音适配层（ADR 0004）：搜索只依赖此接口。
// 默认实现不引入拼音库——基础中文子串搜索完整可用；未来接入 tiny-pinyin 只替换装配处。
export interface PinyinAdapter {
    /** 把查询词展开为一组等价匹配串（含原词）。多音字/模糊匹配在实现内消化。 */
    expand(query: string): string[];
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
