// T-0142 / R289 / G30：条目批量多选、批量修改分类与批量打标签契约测试
const test = require("node:test");
const assert = require("node:assert");
const {batchOps, library, item} = {
    batchOps: require("./.build/entry.cjs").batchOps,
    library: require("./.build/entry.cjs").library,
    item: require("./.build/entry.cjs").item,
};
const bo = batchOps;

test("mergeTags: 批量追加标签、自动去重与井号清洗", () => {
    const current = ["客服", "退款"];

    // 1. 追加新标签并清洗 # 号与空白
    const res1 = bo.mergeTags(current, ["#售后#", "  VIP客户  "]);
    assert.deepEqual(res1, ["客服", "退款", "售后", "VIP客户"]);

    // 2. 去重保序（已有标签不重复追加，大小写不敏感）
    const res2 = bo.mergeTags(current, ["客服", "退款", "新标签"]);
    assert.deepEqual(res2, ["客服", "退款", "新标签"]);

    // 3. 上限截断（最多 32 个）
    const manyTags = Array.from({length: 40}, (_, i) => `tag_${i}`);
    const res3 = bo.mergeTags([], manyTags);
    assert.equal(res3.length, 32);
});

test("removeTags: 批量剔除标签与大小写不敏感匹配", () => {
    const current = ["客服", "重要", "VIP", "退款"];

    // 1. 批量移除并大小写不敏感匹配
    const res1 = bo.removeTags(current, ["vip", "#重要#"]);
    assert.deepEqual(res1, ["客服", "退款"]);

    // 2. 移除不存在的标签时保持原状
    const res2 = bo.removeTags(current, ["不存在标签"]);
    assert.deepEqual(res2, ["客服", "重要", "VIP", "退款"]);
});

test("applyBatchTagCategoryOps: 属性变更计算与 changed 标记判定", () => {
    const testItem = {
        tags: ["客服"],
        category: "常见问题",
    };

    // 1. 标签与分类双重变更
    const res1 = bo.applyBatchTagCategoryOps(testItem, {
        addTags: ["售后"],
        setCategory: "售后服务",
    });
    assert.equal(res1.changed, true);
    assert.deepEqual(res1.tags, ["客服", "售后"]);
    assert.equal(res1.category, "售后服务");

    // 2. 仅移除标签
    const res2 = bo.applyBatchTagCategoryOps(testItem, {
        removeTags: ["客服"],
    });
    assert.equal(res2.changed, true);
    assert.deepEqual(res2.tags, []);
    assert.equal(res2.category, "常见问题");

    // 3. 无任何实质变动 -> changed: false
    const res3 = bo.applyBatchTagCategoryOps(testItem, {
        addTags: ["客服"], // 已存在
        setCategory: "常见问题", // 与当前一致
    });
    assert.equal(res3.changed, false);
    assert.deepEqual(res3.tags, ["客服"]);
    assert.equal(res3.category, "常见问题");
});

test("LibraryService: 批量更新标签分类与服务层回执集成", async () => {
    const storedItems = new Map();
    storedItems.set("item-1", {
        id: "item-1",
        title: "条目一",
        tags: ["旧标签"],
        category: "旧分类",
    });
    storedItems.set("item-2", {
        id: "item-2",
        title: "条目二",
        tags: ["新追加标签"],
        category: "目标分类",
    });

    const mockLib = {
        getItem: async (id) => {
            if (storedItems.has(id)) return {ok: true, data: storedItems.get(id)};
            return {ok: false, message: "item-not-found"};
        },
        updateItem: async (id, patch) => {
            const current = storedItems.get(id);
            if (!current) return {ok: false, message: "not-found"};
            storedItems.set(id, {...current, ...patch});
            return {ok: true, data: {item: storedItems.get(id)}};
        },
        invalidateIndex: () => {},
        batchUpdateTagsAndCategory: library.LibraryService.prototype.batchUpdateTagsAndCategory,
    };

    const receipt = await mockLib.batchUpdateTagsAndCategory(
        ["item-1", "item-2", "item-not-exist"],
        {
            addTags: ["新追加标签"],
            setCategory: "目标分类",
        },
    );

    // 1. 结果统计保真
    assert.equal(receipt.total, 3);
    assert.equal(receipt.updated, 1); // item-1 更新
    assert.equal(receipt.skipped, 1); // item-2 属性无变动跳过
    assert.equal(receipt.failed, 1);  // item-not-exist 失败

    // 2. item-1 正确落库新属性
    const updated1 = storedItems.get("item-1");
    assert.deepEqual(updated1.tags, ["旧标签", "新追加标签"]);
    assert.equal(updated1.category, "目标分类");
});
