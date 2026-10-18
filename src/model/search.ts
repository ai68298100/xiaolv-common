// 搜索模型：纯函数过滤打分。索引条目（SearchEntry）由 library 服务构建，可丢弃可重建。
import {LIMITS} from "../constants";
import {CommonItem, ItemType} from "./item";
import {getPinyinAdapter} from "./pinyin";

export interface DateRangeFilter {
    /** 起始毫秒时间戳（闭区间，含此毫秒） */
    from?: number;
    /** 截止毫秒时间戳（闭区间，含此毫秒） */
    to?: number;
    /** 匹配字段：默认 "updatedAt"，可选 "createdAt" */
    field?: "updatedAt" | "createdAt";
}

export interface SearchQuery {
    text: string;
    itemType?: "" | ItemType;
    tag?: string;
    category?: string;
    scope?: "all" | "favorites" | "recent";
    dateRange?: DateRangeFilter;
}

export interface SearchContext {
    /** 逻辑 ID → 是否收藏（侧车，非真源） */
    favorites: ReadonlySet<string>;
    /** 逻辑 ID → 最近使用时间戳 */
    recents: ReadonlyMap<string, number>;
    /** 逻辑 ID → 使用次数（F3「常用」排序用；侧车，可重建） */
    usage?: ReadonlyMap<string, number>;
    /** 手动排序（收藏序/置顶顺序），sort=manual 时生效 */
    manualOrder?: ReadonlyMap<string, number>;
    /** 排序模式（title 仅在无关键词浏览时生效，有关键词保持相关度优先） */
    sort?: "manual" | "recent" | "frequent" | "title";
    now: number;
}

// 索引条目：内容真源在库文档，这里只允许有界摘要与元数据
export type SearchEntry = Pick<CommonItem, "id" | "blockId" | "libraryDocId" | "itemType" | "title" | "alias" | "tags" | "category" | "summary" | "createdAt" | "updatedAt"> & {
    /** 来源引用（失效检测预检用；不参与搜索打分，绝不出域给 AI） */
    sourceDocId?: string;
    sourceBlockId?: string;
    /** 拼音注解（索引期由适配器生成；noop 适配器下不存在） */
    py?: string;
    pyi?: string;
    /** ask 变量数（写入期落库属性；0/缺省=无徽标。行为以插入时现场内容为准） */
    varCount?: number;
};

export interface ScoredResult {
    entry: SearchEntry;
    score: number;
    matchedBy: string;
    /** 输入序（最终平级兜底：默认保持库内顺序，而非隐式标题序） */
    order: number;
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
    if (haystack === needle) score += 4; // 精确整串命中压过前缀/包含命中
    return score;
}

function matchSingleToken(entry: SearchEntry, token: string): {score: number; matchedBy: string} | null {
    const expansions = getPinyinAdapter().expand(token);
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
            // 拼音注解（适配器启用时才存在）：全拼/首字母低权重命中
            {score: entry.py ? scoreHaystack(entry.py, q, 3) : 0, matchedBy: "pinyin"},
            {score: entry.pyi ? scoreHaystack(entry.pyi, q, 3, 2) : 0, matchedBy: "pinyin-initials"},
        ];
        const first = candidates[0];
        if (!first) continue;
        const top = candidates.reduce((a, b) => (b.score > a.score ? b : a), first);
        if (top.score > 0 && (!best || top.score > best.score)) best = top;
    }
    return best;
}

/**
 * 单词/多词组合评分：标题×8（前缀+3）/ 别名×6（前缀+2）/ 标签×4 / 分类×4 / 摘要×2。
 * 单词走快速路径；空格分隔的多词执行跨字段 AND 匹配并累加各词得分（ADR 0036 / T-0063）。
 */
export function matchEntry(entry: SearchEntry, rawQuery: string): Omit<ScoredResult, "order"> | null {
    const trimmed = rawQuery.slice(0, LIMITS.queryChars).trim();
    if (!trimmed) return null;
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;

    if (tokens.length === 1) {
        const token = tokens[0];
        if (!token) return null;
        const res = matchSingleToken(entry, token);
        return res ? {entry, score: res.score, matchedBy: res.matchedBy} : null;
    }

    let totalScore = 0;
    const matchedBys = new Set<string>();
    for (const token of tokens) {
        const res = matchSingleToken(entry, token);
        if (!res || res.score <= 0) {
            // AND 语义：任意一个关键词未命中任何字段，整个条目视为不匹配
            return null;
        }
        totalScore += res.score;
        matchedBys.add(res.matchedBy);
    }

    const matchedBy = matchedBys.size === 1 ? (Array.from(matchedBys)[0] ?? "multi") : "multi";
    return {entry, score: totalScore, matchedBy};
}

export function passesFilters(entry: SearchEntry, query: SearchQuery, ctx: SearchContext): boolean {
    if (query.itemType && entry.itemType !== query.itemType) return false;
    if (query.tag && !entry.tags.includes(query.tag)) return false;
    if (query.category && entry.category !== query.category) return false;
    if (query.scope === "favorites" && !ctx.favorites.has(entry.id)) return false;
    if (query.scope === "recent" && !ctx.recents.has(entry.id)) return false;
    if (query.dateRange) {
        const {from, to, field = "updatedAt"} = query.dateRange;
        const targetField = field === "createdAt" ? "createdAt" : "updatedAt";
        const ts = entry[targetField] ?? 0;
        const hasFrom = typeof from === "number" && Number.isFinite(from);
        const hasTo = typeof to === "number" && Number.isFinite(to);
        if (hasFrom && hasTo && from > to) return false;
        if (hasFrom && ts < from) return false;
        if (hasTo && ts > to) return false;
    }
    return true;
}

/** 仅筛选不过滤打分（`?` 语义找的候选预过滤用——语义找忽略文本但必须尊重类型/标签/收藏/时间范围） */
export function applyBasicFilters(entries: readonly SearchEntry[], query: Pick<SearchQuery, "itemType" | "tag" | "category" | "scope" | "dateRange">, ctx: SearchContext): SearchEntry[] {
    return entries.filter((e) => passesFilters(e, {text: "", itemType: query.itemType, tag: query.tag, category: query.category, scope: query.scope, dateRange: query.dateRange}, ctx));
}

function compareResults(a: ScoredResult, b: ScoredResult, ctx: SearchContext): number {
    // 标题排序：仅在无关键词浏览（score 全 0）时生效，有关键词保持相关度优先
    if (!ctx.sort || ctx.sort === "manual") {
        const ma = ctx.manualOrder?.get(a.entry.id) ?? Number.MAX_SAFE_INTEGER;
        const mb = ctx.manualOrder?.get(b.entry.id) ?? Number.MAX_SAFE_INTEGER;
        if (ma !== mb) return ma - mb;
    }
    // 常用排序（F3）：次数 > 最近使用 > 相关度/稳定序
    if (ctx.sort === "frequent") {
        const ca = ctx.usage?.get(a.entry.id) ?? 0;
        const cb = ctx.usage?.get(b.entry.id) ?? 0;
        if (cb !== ca) return cb - ca;
        const ra = ctx.recents.get(a.entry.id) ?? 0;
        const rb = ctx.recents.get(b.entry.id) ?? 0;
        if (rb !== ra) return rb - ra;
    }
    if (ctx.sort === "recent" && a.score === 0 && b.score === 0) {
        const ra = ctx.recents.get(a.entry.id) ?? 0;
        const rb = ctx.recents.get(b.entry.id) ?? 0;
        if (rb !== ra) return rb - ra;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (ctx.sort === "title" && a.score === 0 && b.score === 0) {
        return a.entry.title.localeCompare(b.entry.title, "zh-Hans-CN");
    }
    // 同分：最近使用 > 更新时间 > 标题稳定序
    const ra = ctx.recents.get(a.entry.id) ?? 0;
    const rb = ctx.recents.get(b.entry.id) ?? 0;
    if (rb !== ra) return rb - ra;
    if (b.entry.updatedAt !== a.entry.updatedAt) return b.entry.updatedAt - a.entry.updatedAt;
    return a.order - b.order;
}

export function searchEntries(entries: readonly SearchEntry[], query: SearchQuery, ctx: SearchContext, cap = 100): ScoredResult[] {
    const results: ScoredResult[] = [];
    for (let order = 0; order < entries.length; order++) {
        const entry = entries[order];
        if (!entry || !passesFilters(entry, query, ctx)) continue;
        const text = query.text.trim();
        if (text) {
            const m = matchEntry(entry, text);
            if (m) results.push({...m, order});
        } else {
            results.push({entry, score: 0, matchedBy: "none", order});
        }
    }
    results.sort((a, b) => compareResults(a, b, ctx));
    return results.slice(0, cap);
}

/** 收藏/最近入口列表（scope 无查询词时使用，同样尊重置顶） */
export function listByScope(entries: readonly SearchEntry[], scope: "favorites" | "recent", ctx: SearchContext, cap = 100): SearchEntry[] {
    if (scope === "favorites") {
        return entries
            .map((entry, order) => ({entry, order}))
            .filter(({entry}) => ctx.favorites.has(entry.id))
            .sort((a, b) => compareResults(
                {entry: a.entry, score: 0, matchedBy: "none", order: a.order},
                {entry: b.entry, score: 0, matchedBy: "none", order: b.order},
                ctx,
            ))
            .slice(0, cap)
            .map(({entry}) => entry);
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

/** 从条目集合聚合分类面（分类筛选下拉用；F4） */
export function collectCategories(entries: readonly SearchEntry[]): string[] {
    const categories = new Set<string>();
    for (const e of entries) if (e.category) categories.add(e.category);
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}
