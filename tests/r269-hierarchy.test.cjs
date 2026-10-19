// R269 专项：层次化标签与场景嵌套分类导航 (G11) 与级联过滤
const test = require("node:test");
const assert = require("node:assert");
const {hierarchy, search} = require("./.build/entry.cjs");

test("splitHierarchyPath：斜杠路径切分与空白过滤", () => {
    assert.deepStrictEqual(hierarchy.splitHierarchyPath("客服/售后/退换货"), ["客服", "售后", "退换货"]);
    assert.deepStrictEqual(hierarchy.splitHierarchyPath("//研发//前端/Vue/"), ["研发", "前端", "Vue"]);
    assert.deepStrictEqual(hierarchy.splitHierarchyPath("单层分类"), ["单层分类"]);
    assert.deepStrictEqual(hierarchy.splitHierarchyPath(""), []);
});

test("isHierarchicalChild：严格防止前缀污染的级联父子判定", () => {
    // 自身完全相同
    assert.strictEqual(hierarchy.isHierarchicalChild("客服", "客服"), true);

    // 直接子级
    assert.strictEqual(hierarchy.isHierarchicalChild("客服/售后", "客服"), true);

    // 深层后代
    assert.strictEqual(hierarchy.isHierarchicalChild("客服/售后/退换货", "客服"), true);
    assert.strictEqual(hierarchy.isHierarchicalChild("客服/售后/退换货", "客服/售后"), true);

    // 反向不是子级
    assert.strictEqual(hierarchy.isHierarchicalChild("客服", "客服/售后"), false);

    // 严防前缀误碰（红线：客服2 绝不能算作 客服 的子级）
    assert.strictEqual(hierarchy.isHierarchicalChild("客服2", "客服"), false);
    assert.strictEqual(hierarchy.isHierarchicalChild("客服专员", "客服"), false);
    assert.strictEqual(hierarchy.isHierarchicalChild("客服_售后", "客服"), false);
});

test("buildHierarchyTree 与 flattenHierarchyTree：树构建、计数聚合与缩进生成", () => {
    const paths = [
        "客服",
        "客服/售前",
        "客服/售后",
        "客服/售后/退款",
        "研发/前端",
    ];
    const countsMap = new Map([
        ["客服", 2],
        ["客服/售前", 3],
        ["客服/售后", 1],
        ["客服/售后/退款", 4],
        ["研发/前端", 5],
    ]);

    const tree = hierarchy.buildHierarchyTree(paths, countsMap);
    assert.strictEqual(tree.length, 2, "应聚合为 2 个根节点：客服 与 研发");

    // 检查客服根节点
    const csNode = tree.find((n) => n.name === "客服");
    assert.ok(csNode);
    // 客服自身 2 + 售前 3 + 售后 1 + 退款 4 = 10
    assert.strictEqual(csNode.count, 10);
    assert.strictEqual(csNode.children.length, 2); // 售前、售后

    // 检查售后子节点
    const afterSaleNode = csNode.children.find((n) => n.name === "售后");
    assert.ok(afterSaleNode);
    // 售后自身 1 + 退款 4 = 5
    assert.strictEqual(afterSaleNode.count, 5);

    // 扁平化下拉框选项
    const flat = hierarchy.flattenHierarchyTree(tree, {includeCount: true, showPrefixBranch: true});
    assert.ok(flat.length >= 5);

    // 验证根节点格式
    assert.strictEqual(flat[0].path, "客服");
    assert.strictEqual(flat[0].label, "客服 (10)");

    // 验证子级分支符号
    const refundItem = flat.find((f) => f.path === "客服/售后/退款");
    assert.ok(refundItem);
    assert.ok(refundItem.label.includes("└ 退款 (4)"));
});

test("passesFilters：分类与标签父级级联过滤实测", () => {
    const entry = {
        id: "xlc-test1",
        title: "发票退款政策",
        itemType: "text",
        category: "商务/合同/补充协议",
        tags: ["财务/开票", "制度"],
        kramdown: "发票退款正文",
        createdAt: 1000,
        updatedAt: 2000,
    };
    const ctx = {
        favorites: new Set(),
        recents: new Map(),
    };

    // 1. 父级分类匹配
    assert.strictEqual(search.passesFilters(entry, {text: "", category: "商务"}, ctx), true, "筛选「商务」应级联命中「商务/合同/补充协议」");
    assert.strictEqual(search.passesFilters(entry, {text: "", category: "商务/合同"}, ctx), true, "筛选「商务/合同」应级联命中");
    assert.strictEqual(search.passesFilters(entry, {text: "", category: "商务/合同/补充协议"}, ctx), true, "精确全路径应命中");
    assert.strictEqual(search.passesFilters(entry, {text: "", category: "商务/采购"}, ctx), false, "兄弟分支「商务/采购」不应命中");
    assert.strictEqual(search.passesFilters(entry, {text: "", category: "商务2"}, ctx), false, "前缀相近「商务2」绝不应命中");

    // 2. 父级标签匹配
    assert.strictEqual(search.passesFilters(entry, {text: "", tag: "财务"}, ctx), true, "筛选标签「财务」应级联命中「财务/开票」");
    assert.strictEqual(search.passesFilters(entry, {text: "", tag: "财务/开票"}, ctx), true, "精确标签命中");
    assert.strictEqual(search.passesFilters(entry, {text: "", tag: "制度"}, ctx), true, "普通单层标签命中");
    assert.strictEqual(search.passesFilters(entry, {text: "", tag: "财务/报销"}, ctx), false, "不相干子标签不命中");
    assert.strictEqual(search.passesFilters(entry, {text: "", tag: "财务部"}, ctx), false, "前缀误伤不命中");
});
