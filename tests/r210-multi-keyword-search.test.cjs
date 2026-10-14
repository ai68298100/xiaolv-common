// R210 多关键词组合检索与分词高亮契约专项测试（ADR 0036 / T-0063）
const test = require("node:test");
const assert = require("node:assert/strict");
const {matchEntry, searchEntries} = require("./.build/entry.cjs").search;

const DEMO_ENTRY = {
    id: "xlc-demo0000001",
    blockId: "20240101120000-abcdef1",
    libraryDocId: "20240101120001-hijklmn",
    itemType: "markdown",
    title: "延期致歉回复",
    alias: "致歉信",
    tags: ["客服", "模板"],
    category: "客服",
    summary: "尊敬的王总：关于本期交付计划的调整，我们深表歉意。",
    createdAt: 1000,
    updatedAt: 2000,
};

const FAKE_CTX = {
    favorites: new Set(),
    recents: new Map(),
    now: 3000,
};

test("多关键词检索：单词路径与多词路径行为契约", () => {
    // 1. 单词精确标题命中
    const single = matchEntry(DEMO_ENTRY, "延期致歉回复");
    assert.ok(single);
    assert.strictEqual(single.matchedBy, "title");
    assert.ok(single.score >= 12); // 8(base) + 3(prefix) + 4(exact)

    // 2. 多词同字段命中（“延期 致歉”）
    const multiSame = matchEntry(DEMO_ENTRY, "延期 致歉");
    assert.ok(multiSame);
    assert.strictEqual(multiSame.matchedBy, "title");
    assert.ok(multiSame.score > single.score - 4, "两个词的得分应累加");

    // 3. 多词跨字段 AND 组合命中（“客服 延期”：分类 + 标题）
    const crossField = matchEntry(DEMO_ENTRY, "客服 延期");
    assert.ok(crossField);
    assert.strictEqual(crossField.matchedBy, "multi");
    assert.ok(crossField.score > 0);

    // 4. 多词跨字段三词组合（“客服 模板 延期”：分类 + 标签 + 标题）
    const tripple = matchEntry(DEMO_ENTRY, "客服 模板 延期");
    assert.ok(tripple);
    assert.strictEqual(tripple.matchedBy, "multi");

    // 5. 严格 AND 语义阻断：任一词不匹配，直接返回 null
    const blocked = matchEntry(DEMO_ENTRY, "客服 绝不存在的无关系内容");
    assert.strictEqual(blocked, null, "未全部满足的关键词组合必须严格返回 null");
});

test("searchEntries 集成搜索：多关键词检索与排序表现", () => {
    const entries = [
        DEMO_ENTRY,
        {
            id: "xlc-demo0000002",
            blockId: "20240101120000-abcdef2",
            libraryDocId: "20240101120001-hijklmn",
            itemType: "code",
            title: "SQL 分页查询模板",
            alias: "分页语句",
            tags: ["开发", "SQL"],
            category: "开发",
            summary: "SELECT * FROM users LIMIT 20 OFFSET 40;",
            createdAt: 1000,
            updatedAt: 2000,
        },
    ];

    // 查询 “SQL 分页”：应命中 entry 2，排除 entry 1
    const resSql = searchEntries(entries, {text: "SQL 分页"}, FAKE_CTX);
    assert.strictEqual(resSql.length, 1);
    assert.strictEqual(resSql[0].entry.id, "xlc-demo0000002");

    // 查询 “开发 分页”：跨分类与标题组合命中
    const resDev = searchEntries(entries, {text: "开发 分页"}, FAKE_CTX);
    assert.strictEqual(resDev.length, 1);
    assert.strictEqual(resDev[0].entry.id, "xlc-demo0000002");

    // 查询 “客服 延期”：命中 entry 1，排除 entry 2
    const resCs = searchEntries(entries, {text: "客服 延期"}, FAKE_CTX);
    assert.strictEqual(resCs.length, 1);
    assert.strictEqual(resCs[0].entry.id, "xlc-demo0000001");

    // 查询包含两者都不满足的词：空结果
    const resEmpty = searchEntries(entries, {text: "客服 SQL"}, FAKE_CTX);
    assert.strictEqual(resEmpty.length, 0);
});

test("多关键词高亮切分与重叠区间合并算法契约", () => {
    function computeMergedIntervals(text, query) {
        const tokens = query.toLowerCase().split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 0);
        if (tokens.length === 0) return [];
        const lowerText = text.toLowerCase();
        const intervals = [];
        for (const token of tokens) {
            let cursor = 0;
            while (cursor <= lowerText.length - token.length) {
                const at = lowerText.indexOf(token, cursor);
                if (at < 0) break;
                intervals.push([at, at + token.length]);
                cursor = at + Math.max(1, token.length);
            }
        }
        intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const merged = [];
        for (const [start, end] of intervals) {
            const prev = merged[merged.length - 1];
            if (prev && start <= prev[1]) {
                prev[1] = Math.max(prev[1], end);
            } else {
                merged.push([start, end]);
            }
        }
        return merged;
    }

    // 1. 分立区间（“延期 回复” 匹配 “延期致歉回复”）
    const intervals1 = computeMergedIntervals("延期致歉回复", "延期 回复");
    assert.deepEqual(intervals1, [[0, 2], [4, 6]]);

    // 2. 重叠区间（“延期 延期致歉” 匹配 “延期致歉回复” -> 合并为 [0, 4]）
    const intervals2 = computeMergedIntervals("延期致歉回复", "延期 延期致歉");
    assert.deepEqual(intervals2, [[0, 4]]);

    // 3. 大小写不敏感（“sql 分页” 匹配 “SQL 分页查询”）
    const intervals3 = computeMergedIntervals("SQL 分页查询", "sql 分页");
    assert.deepEqual(intervals3, [[0, 3], [4, 6]]);
});
