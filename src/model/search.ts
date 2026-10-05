// 搜索模型：纯函数过滤打分。索引条目（SearchEntry）由 library 服务构建，可丢弃可重建。
import {LIMITS} from "../constants";
import {CommonItem, ItemType} from "./item";
import {getPinyinAdapter} from "./pinyin";

export interface SearchQuery {
    text: string;
    itemType?: "" | ItemType;
    tag?: string;
    category?: string;
    scope?: "all" | "favorites" | "recent";
}

export interface SearchContext {
    /** 逻辑 ID → 是否收藏（侧车，非真源） */
    favorites: ReadonlySet<string>;
    /** 逻辑 ID → 最近使用时间戳 */
    recents: ReadonlyMap<string, number>;
    /** 手动排序（拖拽/置顶顺序），存在时优先 */
    manualOrder?: ReadonlyMap<string, number>;
    now: number;
}

// 索引条目：内容真源在库文档，这里只允许有界摘要与元数据
export type SearchEntry = Pick<CommonItem, "id" | "blockId" | "libraryDocId" | "itemType" | "title" | "alias" | "tags" | "category" | "summary" | "createdAt" | "updatedAt"> & {
    /** 来源引用（失效检测预检用；不参与搜索打分，绝不出域给 AI） */
    sourceDocId?: string;
    sourceBlockId?: string;
};

export interface ScoredResult {
    entry: SearchEntry;
    score: number;
    matchedBy: string;
}

function normalizeText(s: string): string {
    return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreHaystack(haystack: string, needle: string, weight: number, prefixWeight?: number): number {
    if (!needle) return 0;
    const idx = haystack.indexOf(needle);
    if (idx === -1) return 0;
    let score = weight;
    if (idx === 0 && prefixWeight !== undefined) score += prefixWeight;
    return score;
}

/**
 * 单词评分：标题×8（前缀+3）/ 别名×6（前缀+2）/ 标签×4 / 分类×4 / 摘要×2。
 * 拼音适配层把查询展开为等价匹配串，任一命中即按最高分计。
 */
export function matchEntry(entry: SearchEntry, rawQuery: string): ScoredResult | null {
    const expansions = getPinyinAdapter().expand(rawQuery.slice(0, LIMITS.queryChars));
    if (expansions.length === 0) return null;
    const title = normalizeText(entry.title);
    const alias = normalizeText(entry.alias);
    const tags = entry.tags.map(normalizeText);
    const category = normalizeText(entry.category);
    const summary = normalizeText(entry.summary);
    let best: {score: number; matchedBy: string} | null = null;
    for (const q of expansions.map(normalizeText)) {
        if (!q) continue;
        const candidates: Array<{score: number; matchedBy: string}> = [
            {score: scoreHaystack(title, q, 8, 3), matchedBy: "title"},
            {score: scoreHaystack(alias, q, 6, 2), matchedBy: "alias"},
            {score: Math.max(0, ...tags.map((t) => scoreHaystack(t, q, 4))), matchedBy: "tags"},
            {score: scoreHaystack(category, q, 4), matchedBy: "category"},
            {score: scoreHaystack(summary, q, 2), matchedBy: "summary"},
        ];
        const top = candidates.reduce((a, b) => (b.score > a.score ? b : a), candidates[0]);
        if (top.score > 0 && (!best || top.score > best.score)) best = top;
    }
    return best ? {entry, score: best.score, matchedBy: best.matchedBy} : null;
}

export function passesFilters(entry: SearchEntry, query: SearchQuery, ctx: SearchContext): boolean {
    if (query.itemType && entry.itemType !== query.itemType) return false;
    if (query.tag && !entry.tags.includes(query.tag)) return false;
    if (query.category && entry.category !== query.category) return false;
    if (query.scope === "favorites" && !ctx.favorites.has(entry.id)) return false;
    return true;
}

function compareResults(a: ScoredResult, b: ScoredResult, ctx: SearchContext): number {
    // 置顶（手动顺序值小者靠前，缺失视为无穷大）
    const ma = ctx.manualOrder?.get(a.entry.id) ?? Number.MAX_SAFE_INTEGER;
    const mb = ctx.manualOrder?.get(b.entry.id) ?? Number.MAX_SAFE_INTEGER;
    if (ma !== mb) return ma - mb;
    if (b.score !== a.score) return b.score - a.score;
    // 同分：最近使用 > 更新时间 > 标题稳定序
    const ra = ctx.recents.get(a.entry.id) ?? 0;
    const rb = ctx.recents.get(b.entry.id) ?? 0;
    if (rb !== ra) return rb - ra;
    if (b.entry.updatedAt !== a.entry.updatedAt) return b.entry.updatedAt - a.entry.updatedAt;
    return a.entry.title.localeCompare(b.entry.title, "zh-Hans-CN");
}

export function searchEntries(entries: readonly SearchEntry[], query: SearchQuery, ctx: SearchContext, cap = 100): ScoredResult[] {
    const results: ScoredResult[] = [];
    for (const entry of entries) {
        if (!passesFilters(entry, query, ctx)) continue;
        const text = query.text.trim();
        if (text) {
            const m = matchEntry(entry, text);
            if (m) results.push(m);
        } else {
            results.push({entry, score: 0, matchedBy: "none"});
        }
    }
    results.sort((a, b) => compareResults(a, b, ctx));
    return results.slice(0, cap);
}

/** 收藏/最近入口列表（scope 无查询词时使用，同样尊重置顶） */
export function listByScope(entries: readonly SearchEntry[], scope: "favorites" | "recent", ctx: SearchContext, cap = 100): SearchEntry[] {
    if (scope === "favorites") {
        return entries
            .filter((e) => ctx.favorites.has(e.id))
            .sort((a, b) => compareResults({entry: a, score: 0, matchedBy: "none"}, {entry: b, score: 0, matchedBy: "none"}, ctx))
            .slice(0, cap);
    }
    return entries
        .filter((e) => ctx.recents.has(e.id))
        .sort((a, b) => (ctx.recents.get(b.id) ?? 0) - (ctx.recents.get(a.id) ?? 0))
        .slice(0, cap);
}

/** 从条目集合聚合标签面（筛选 chips 用） */
export function collectTags(entries: readonly SearchEntry[]): string[] {
    const tags = new Set<string>();
    for (const e of entries) for (const t of e.tags) tags.add(t);
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}
