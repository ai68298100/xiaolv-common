// 搜索模型测试：打分排序、筛选、收藏/最近 scope、置顶（manualOrder）、拼音适配层接入点。
const test = require("node:test");
const assert = require("node:assert");
const search = require("./.build/entry.cjs").search;
const pinyin = require("./.build/entry.cjs").pinyin;

function entry(overrides = {}) {
    return {
        id: "xlc-e1", blockId: "20240101120000-abcdefg", libraryDocId: "20240101120001-hijklmn",
        itemType: "text", title: "", alias: "", tags: [], category: "", summary: "",
        createdAt: 0, updatedAt: 0, ...overrides,
    };
}

const CTX = {favorites: new Set(), recents: new Map(), now: 1000};

test("空查询返回全部（有界）", () => {
    const entries = [entry({id: "xlc-a", title: "甲"}), entry({id: "xlc-b", title: "乙"})];
    const results = search.searchEntries(entries, {text: "", scope: "all"}, CTX);
    assert.equal(results.length, 2);
});

test("中文关键词命中标题/摘要，标题权重更高", () => {
    const titleHit = entry({id: "xlc-title", title: "客服常用回复"});
    const summaryHit = entry({id: "xlc-summary", title: "其他", summary: "客服相关摘要"});
    const results = search.searchEntries([titleHit, summaryHit], {text: "客服", scope: "all"}, CTX);
    assert.equal(results[0].entry.id, "xlc-title");
    assert.ok(results[0].score > results[1].score);
});

test("别名/标签/分类可命中", () => {
    const e = entry({id: "xlc-alias", title: "无", alias: "问候语", tags: ["社交"], category: "模板"});
    assert.ok(search.matchEntry(e, "问候"));
    assert.ok(search.matchEntry(e, "社交"));
    assert.ok(search.matchEntry(e, "模板"));
    assert.equal(search.matchEntry(e, "不存在的词"), null);
});

test("类型与标签筛选", () => {
    const entries = [
        entry({id: "xlc-code", itemType: "code", title: "片段"}),
        entry({id: "xlc-text", itemType: "text", title: "文字", tags: ["工作"]}),
    ];
    const byType = search.searchEntries(entries, {text: "", itemType: "code", scope: "all"}, CTX);
    assert.deepEqual(byType.map((r) => r.entry.id), ["xlc-code"]);
    const byTag = search.searchEntries(entries, {text: "", tag: "工作", scope: "all"}, CTX);
    assert.deepEqual(byTag.map((r) => r.entry.id), ["xlc-text"]);
});

test("收藏/最近 scope 与置顶顺序", () => {
    const ctx = {
        favorites: new Set(["xlc-fav"]),
        recents: new Map([["xlc-recent", 500]]),
        manualOrder: new Map([["xlc-pinned", 0]]),
        now: 1000,
    };
    const entries = [
        entry({id: "xlc-plain", title: "普通"}),
        entry({id: "xlc-fav", title: "已收藏"}),
        entry({id: "xlc-recent", title: "最近用"}),
        entry({id: "xlc-pinned", title: "置顶项"}),
    ];
    const favs = search.listByScope(entries, "favorites", ctx);
    assert.deepEqual(favs.map((e) => e.id), ["xlc-fav"]);
    const recents = search.listByScope(entries, "recent", ctx);
    assert.deepEqual(recents.map((e) => e.id), ["xlc-recent"]);
    const recentSearch = search.searchEntries(entries, {text: "", scope: "recent"}, ctx);
    assert.deepEqual(recentSearch.map((r) => r.entry.id), ["xlc-recent"]);
    // 置顶项在混合搜索里排最前
    const ranked = search.searchEntries(entries, {text: "", scope: "all"}, ctx);
    assert.equal(ranked[0].entry.id, "xlc-pinned");
});

test("最近排序只改变浏览顺序，关键词搜索仍优先匹配度", () => {
    const entries = [
        entry({id: "xlc-old", title: "客服延期回复", updatedAt: 1}),
        entry({id: "xlc-new", title: "其他模板", summary: "客服相关", updatedAt: 2}),
    ];
    const ctx = {favorites: new Set(), recents: new Map([["xlc-old", 10], ["xlc-new", 20]]), sort: "recent", now: 1000};
    const browse = search.searchEntries(entries, {text: "", scope: "all"}, ctx);
    assert.deepEqual(browse.map((r) => r.entry.id), ["xlc-new", "xlc-old"]);
    const query = search.searchEntries(entries, {text: "客服", scope: "all"}, ctx);
    assert.deepEqual(query.map((r) => r.entry.id), ["xlc-old", "xlc-new"]);
});

test("拼音适配层：默认实现原样返回；自定义实现参与匹配", () => {
    // 默认：noop —— "kx" 不命中「常用」
    assert.equal(pinyin.getPinyinAdapter().capabilities.initials, false);
    const e = entry({id: "xlc-cy", title: "常用语"});
    assert.equal(search.matchEntry(e, "cy"), null);
    // 注入首字母适配器（未来 tiny-pinyin 的等价替身）
    pinyin.setPinyinAdapter({
        capabilities: {initials: true, fullPinyin: false},
        expand: (q) => [q, "常用语"],
    });
    assert.ok(search.matchEntry(e, "cy"));
    // 还原默认（不影响其他用例）
    pinyin.setPinyinAdapter(pinyin.createNoopPinyinAdapter());
    assert.equal(search.matchEntry(e, "cy"), null);
});

test("collectTags 聚合去重", () => {
    const tags = search.collectTags([
        entry({tags: ["工作", "常用"]}),
        entry({tags: ["工作", "生活"]}),
    ]);
    assert.deepEqual(tags, ["常用", "工作", "生活"]);
});

test("超长查询词被裁剪且不抛异常", () => {
    const results = search.searchEntries([entry({title: "甲"})], {text: "长".repeat(5000), scope: "all"}, CTX);
    assert.equal(results.length, 0);
});
