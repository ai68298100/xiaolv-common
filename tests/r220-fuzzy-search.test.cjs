// Epoch 7: 模糊容错匹配 (Levenshtein distance <= 1) 与时间半衰期衰减评分测试
const test = require("node:test");
const assert = require("node:assert");
const {search} = require("./.build/entry.cjs");

function makeEntry(overrides = {}) {
    return {
        id: "xlc-" + Math.random().toString(36).slice(2, 8),
        blockId: "20261019120000-abcdefg",
        libraryDocId: "20261019120001-hijklmn",
        itemType: "text",
        title: "测试条目",
        alias: "",
        tags: [],
        category: "通用",
        summary: "",
        createdAt: 1000,
        updatedAt: 1000,
        ...overrides,
    };
}

test("Levenshtein 最小编辑距离算法纯函数测试", () => {
    assert.strictEqual(search.levenshteinDistance("abc", "abc"), 0);
    assert.strictEqual(search.levenshteinDistance("", "hello"), 5);
    assert.strictEqual(search.levenshteinDistance("hello", ""), 5);
    assert.strictEqual(search.levenshteinDistance("gihub", "github"), 1); // 插入
    assert.strictEqual(search.levenshteinDistance("siyuan", "siyua"), 1); // 删除
    assert.strictEqual(search.levenshteinDistance("客服", "客报"), 1); // 替换
    assert.strictEqual(search.levenshteinDistance("常用回复", "常用答复"), 1); // 单字替换
    assert.strictEqual(search.levenshteinDistance("常用回复", "常有回覆"), 2); // 两个字替换
});

test("fuzzyMatchHaystack 模糊滑动窗口匹配与边界防御", () => {
    // 字符长度 < 2 必须拒绝模糊匹配以防止误命中噪声
    assert.strictEqual(search.fuzzyMatchHaystack("客服常用回复", "客", 1).matched, false);
    assert.strictEqual(search.fuzzyMatchHaystack("客服常用回复", "", 1).matched, false);

    // 精确包含直接返回 distance = 0
    const exact = search.fuzzyMatchHaystack("客服常用回复", "常用", 1);
    assert.strictEqual(exact.matched, true);
    assert.strictEqual(exact.distance, 0);

    // 滑动窗口容错：1 字差（替换/漏字/多字）
    const typoSub = search.fuzzyMatchHaystack("客服常用回复", "客报", 1);
    assert.strictEqual(typoSub.matched, true);
    assert.strictEqual(typoSub.distance, 1);

    const typoMiss = search.fuzzyMatchHaystack("客服常用回复", "常回复", 1);
    assert.strictEqual(typoMiss.matched, true);
    assert.strictEqual(typoMiss.distance, 1);

    const typoExtra = search.fuzzyMatchHaystack("客服常用回复", "常用啊回复", 1);
    assert.strictEqual(typoExtra.matched, true);
    assert.strictEqual(typoExtra.distance, 1);

    // 超过最大容错距离 (maxDistance = 1) 拒绝匹配
    const beyond = search.fuzzyMatchHaystack("客服常用回复", "售后答复", 1);
    assert.strictEqual(beyond.matched, false);
});

test("matchEntry 模糊容错召回：标题与别名错别字命中", () => {
    const item1 = makeEntry({id: "item-reply", title: "客服常用回复", alias: "问候语"});
    const item2 = makeEntry({id: "item-github", title: "GitHub 工作流配置", alias: "gh-actions"});

    // 标题 1 字错别字模糊命中
    const hit1 = search.matchEntry(item1, "客报");
    assert.ok(hit1, "客报 应该模糊召回 客服常用回复");
    assert.strictEqual(hit1.matchedBy, "fuzzy-title");
    assert.strictEqual(hit1.score, 3);

    // 别名 1 字替换错别字模糊命中（gh-actxons 距离 gh-actions 为 1，且非子串）
    const hit2 = search.matchEntry(item2, "gh-actxons");
    assert.ok(hit2, "gh-actxons 应该模糊召回 gh-actions");
    assert.strictEqual(hit2.matchedBy, "fuzzy-alias");
    assert.strictEqual(hit2.score, 2);

    // 单词长度为 1 的错别字不应触发模糊匹配（避免海量误命中）
    const noHitSingleChar = search.matchEntry(item1, "报");
    assert.strictEqual(noHitSingleChar, null);
});

test("精确匹配与拼音匹配的优先级严格高于模糊匹配", () => {
    const exactItem = makeEntry({id: "item-exact", title: "客服常用回复"});
    const fuzzyItem = makeEntry({id: "item-fuzzy", title: "客报常用回复"});

    const ctx = {favorites: new Set(), recents: new Map(), now: 1000};
    const results = search.searchEntries([fuzzyItem, exactItem], {text: "客服", scope: "all"}, ctx);

    assert.strictEqual(results.length, 2);
    // 精确匹配项得分必须显著高于模糊匹配项，并排在第一位
    assert.strictEqual(results[0].entry.id, "item-exact");
    assert.strictEqual(results[0].matchedBy, "title");
    assert.ok(results[0].score > results[1].score);
    assert.strictEqual(results[1].entry.id, "item-fuzzy");
    assert.strictEqual(results[1].matchedBy, "fuzzy-title");
});

test("calculateRecencyDecay 时间半衰期衰减纯函数计算", () => {
    const halfLife = 7 * 24 * 3600 * 1000;
    const now = 1700000000000; // 真实毫秒时间戳基准

    // 无时间戳或负时间戳返回 0
    assert.strictEqual(search.calculateRecencyDecay(undefined, now, halfLife), 0);
    assert.strictEqual(search.calculateRecencyDecay(0, now, halfLife), 0);
    assert.strictEqual(search.calculateRecencyDecay(-100, now, halfLife), 0);

    // 刚使用（delta = 0）衰减系数为 1.0
    const instant = search.calculateRecencyDecay(now, now, halfLife);
    assert.strictEqual(instant, 1.0);

    // 刚过一个半衰期（delta = 7天），衰减系数严格等于 0.5
    const oneHalf = search.calculateRecencyDecay(now - halfLife, now, halfLife);
    assert.ok(Math.abs(oneHalf - 0.5) < 1e-6);

    // 经过两个半衰期（delta = 14天），衰减系数严格等于 0.25
    const twoHalf = search.calculateRecencyDecay(now - 2 * halfLife, now, halfLife);
    assert.ok(Math.abs(twoHalf - 0.25) < 1e-6);
});

test("searchEntries 启用时间半衰期衰减评分排序加权", () => {
    const now = 2000000000;
    const halfLife = 7 * 24 * 3600 * 1000;

    const itemOld = makeEntry({id: "item-old", title: "数据库调优经验", tags: ["技术"]});
    const itemFresh = makeEntry({id: "item-fresh", title: "后端性能调优记录", tags: ["技术"]});

    // 两者均通过标签 '技术' 匹配（基准分均为 4 分）
    const recentsMap = new Map([
        ["item-old", now - 30 * 24 * 3600 * 1000], // 30天前
        ["item-fresh", now - 1 * 3600 * 1000],      // 1小时前（非常新鲜）
    ]);

    // 1. 未开启半衰期衰减时，按默认同分比对
    const ctxDisabled = {
        favorites: new Set(),
        recents: recentsMap,
        enableRecencyDecay: false,
        now,
    };
    const resDisabled = search.searchEntries([itemOld, itemFresh], {text: "技术", scope: "all"}, ctxDisabled);
    assert.strictEqual(resDisabled[0].score, 8);
    assert.strictEqual(resDisabled[1].score, 8);

    // 2. 开启半衰期衰减时，新鲜项获得更高的加权分，排在最前面
    const ctxEnabled = {
        favorites: new Set(),
        recents: recentsMap,
        enableRecencyDecay: true,
        recencyHalfLifeMs: halfLife,
        recencyMaxBoost: 2.0,
        now,
    };
    const resEnabled = search.searchEntries([itemOld, itemFresh], {text: "技术", scope: "all"}, ctxEnabled);
    assert.strictEqual(resEnabled[0].entry.id, "item-fresh");
    assert.ok(resEnabled[0].score > resEnabled[1].score);
    // 新鲜项 decay 接近 1.0，score 约为 8 + 2.0 = 10.0
    assert.ok(resEnabled[0].score >= 9.9);
    // 陈旧项 (30天前，> 4 个半衰期)，decay 极小，加权分接近 8.0
    assert.ok(resEnabled[1].score < 8.2);
});
