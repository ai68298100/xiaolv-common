// R270 专项：全域内容搜索终端 (G12) - 当前文档块与全库笔记检索
const test = require("node:test");
const assert = require("node:assert");
const {omniSearch} = require("./.build/entry.cjs");

test("scoreAndFilterBlocks：AND 多关键词命中与权重排序", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: "常报销的财务流程与差旅审批说明"},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "本周工时统计和财务注意事项"},
        {id: "20240101000003-ccccccc", type: "h", kramdown: "常用语库的使用说明"},
        {id: "20240101000004-ddddddd", type: "p", kramdown: "今天天气不错"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务 报销", "doc-1", "财务文档");
    // 应该只命中包含「财务」+「报销」的全部块
    assert.strictEqual(result.length, 1, "应只返回同时包含两个关键词的块");
    assert.strictEqual(result[0].id, "xlc-omni-20240101000001-aaaaaa");
    assert.strictEqual(result[0].category, "财务文档");
    assert.strictEqual(result[0].blockId, "20240101000001-aaaaaa");
    assert.strictEqual(result[0].sourceDocId, "doc-1");
});

test("scoreAndFilterBlocks：空关键词直接返回空数组", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: "常报销的财务流程"},
    ];
    const result = omniSearch.scoreAndFilterBlocks(blocks, "  ", "doc-1", "测试");
    assert.deepStrictEqual(result, []);
});

test("scoreAndFilterBlocks：标题命中得分应高于正文命中", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "h", kramdown: "财务专题"},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "包含财务一词但是普通正文段落"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务", "doc-1");
    assert.strictEqual(result.length, 2);
    // 标题应排在前面（标题命中权重 20 vs 正文 5/10）
    assert.strictEqual(result[0].id, "xlc-omni-20240101000001-aaaaaa");
});

test("scoreAndFilterBlocks：AND 语义严格性，缺一即拒", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: "只包含财务"},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "只包含报销"},
        {id: "20240101000003-ccccccc", type: "p", kramdown: "财务和报销都包含"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务 报销", "doc-1");
    assert.strictEqual(result.length, 1, "AND 严格性应只命中同时包含两词的块");
    assert.ok(result[0].id.includes("ccccccc"));
});

test("scoreAndFilterBlocks：空块内容自动跳过", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: ""},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "   "},
        {id: "20240101000003-ccccccc", type: "p", kramdown: "财务相关内容"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务", "doc-1");
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].id.includes("ccccccc"));
});
