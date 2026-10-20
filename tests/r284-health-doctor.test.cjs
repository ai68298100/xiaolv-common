// T-0137 / R284 / G26：常用内容库健康度与语法体检中心契约测试
const test = require("node:test");
const assert = require("node:assert");
const {healthDoctor} = {
    healthDoctor: require("./.build/entry.cjs").healthDoctor,
};
const doc = healthDoctor;

test("detectSnippetCycles: 互相引用成环 (A -> B -> A)", () => {
    const items = [
        {id: "item-1", title: "条目甲", content: "前言 {{xlc:snippet:条目乙}} 后语"},
        {id: "item-2", title: "条目乙", content: "内容 {{xlc:snippet:条目甲}} 结束"},
    ];

    const cycles = doc.detectSnippetCycles(items);
    assert.equal(cycles.size, 2);
    assert.ok(cycles.has("item-1"));
    assert.ok(cycles.has("item-2"));

    const path1 = cycles.get("item-1");
    assert.deepEqual(path1, ["条目甲", "条目乙", "条目甲"]);
});

test("detectSnippetCycles: 自我循环引用 (A -> A)", () => {
    const items = [
        {id: "item-self", title: "自引条目", content: "递归自身 {{xlc:snippet:自引条目}}"},
    ];

    const cycles = doc.detectSnippetCycles(items);
    assert.equal(cycles.size, 1);
    assert.ok(cycles.has("item-self"));
    assert.deepEqual(cycles.get("item-self"), ["自引条目", "自引条目"]);
});

test("checkPlaceholderIntegrity: 未闭合与损坏占位符检出", () => {
    // 1. 未闭合占位符
    const unclosedText = "请于 {{xlc:date|+3d 处理完毕";
    const issues1 = doc.checkPlaceholderIntegrity(unclosedText);
    assert.ok(issues1.some((i) => i.type === "unclosed-placeholder"));

    // 2. 损坏参数的占位符（非法日期、非法算式）
    const malformedText = "日期 {{xlc:date|bogus}} 金额 {{xlc:calc|10+}}";
    const issues2 = doc.checkPlaceholderIntegrity(malformedText);
    assert.ok(issues2.some((i) => i.type === "malformed-placeholder" && i.details.includes("date|bogus")));
    assert.ok(issues2.some((i) => i.type === "malformed-placeholder" && i.details.includes("calc|10+")));

    // 3. 空字段名 ask
    const emptyAskText = "姓名: {{xlc:ask:}}";
    const issues3 = doc.checkPlaceholderIntegrity(emptyAskText);
    assert.ok(issues3.some((i) => i.type === "malformed-placeholder" && i.details.includes("ask:")));

    // 4. 合法占位符 0 问题
    const validText = "今天 {{xlc:date|YYYY-MM-DD}} 金额 {{xlc:calc|100*1.13}} 选区 {{xlc:selection}}";
    const issues4 = doc.checkPlaceholderIntegrity(validText);
    assert.equal(issues4.length, 0);
});

test("diagnoseLibraryHealth: 缺失子片段依赖警示", () => {
    const items = [
        {id: "doc-1", title: "主模板", content: "调用 {{xlc:snippet:不存在的子片段}} 完成"},
    ];

    const res = doc.diagnoseLibraryHealth(items);
    assert.equal(res.totalScanned, 1);
    assert.equal(res.warningCount, 1);
    assert.equal(res.errorCount, 0);
    assert.ok(res.issues.some((i) => i.type === "missing-snippet" && i.details === "不存在的子片段"));
});

test("diagnoseLibraryHealth: 非法协议与空链接 URL 检出", () => {
    const items = [
        {id: "url-bad", title: "危险链接", content: "javascript:alert(1)", itemType: "url", url: "javascript:alert(1)"},
        {id: "url-good", title: "正常链接", content: "https://example.com", itemType: "url", url: "https://example.com"},
    ];

    const res = doc.diagnoseLibraryHealth(items);
    assert.equal(res.totalScanned, 2);
    assert.equal(res.errorCount, 1);
    assert.ok(res.issues.some((i) => i.itemId === "url-bad" && i.type === "invalid-url"));
});

test("diagnoseLibraryHealth: 全健康内容库零异常返回", () => {
    const items = [
        {id: "i1", title: "片段一", content: "基础文本", itemType: "text"},
        {id: "i2", title: "片段二", content: "引入片段一: {{xlc:snippet:片段一}}", itemType: "text"},
        {id: "i3", title: "计算条目", content: "应付: {{xlc:calc|100*1.13}}", itemType: "text"},
        {id: "i4", title: "代码块", content: "```ts\n{{xlc:code_is_literal}}\n```", itemType: "code"},
        {id: "i5", title: "链接", content: "https://example.com", itemType: "url", url: "https://example.com"},
    ];

    const res = doc.diagnoseLibraryHealth(items);
    assert.equal(res.totalScanned, 5);
    assert.equal(res.healthyCount, 5);
    assert.equal(res.errorCount, 0);
    assert.equal(res.warningCount, 0);
    assert.equal(res.hasErrors, false);
    assert.equal(res.issues.length, 0);
});
