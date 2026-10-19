// 全域搜索终端动作闭环与就地快速修改专项测试（T-0126 / R273）
const test = require("node:test");
const assert = require("node:assert");
const {kramdown} = require("./.build/entry.cjs");

test("bodyWriteRestriction：单行文本允许通过", () => {
    assert.equal(kramdown.bodyWriteRestriction("这是一行普通文本"), undefined);
});

test("bodyWriteRestriction：空字符串拒绝", () => {
    assert.equal(kramdown.bodyWriteRestriction(""), "body is empty");
});

test("bodyWriteRestriction：超长文本拒绝", () => {
    const longText = "a".repeat(100_001);
    assert.equal(kramdown.bodyWriteRestriction(longText), "body exceeds the supported size; nothing was written");
});

test("bodyWriteRestriction：多行非代码块拒绝", () => {
    const multiLine = "第一行\n第二行";
    const res = kramdown.bodyWriteRestriction(multiLine);
    assert.ok(res && res.includes("multi-line or structured body writing is unavailable"));
});

test("bodyWriteRestriction：完整代码块允许通过", () => {
    const codeFence = "```typescript\nconsole.log('hello');\n```";
    assert.equal(kramdown.bodyWriteRestriction(codeFence), undefined);
});

test("bodyWriteRestriction：不完整代码块拒绝", () => {
    const incompleteFence = "```typescript\nconsole.log('hello');";
    const res = kramdown.bodyWriteRestriction(incompleteFence);
    assert.ok(res && res.includes("multi-line or structured body writing is unavailable"));
});

test("bodyWriteRestriction：单行结构化内容拒绝", () => {
    const structured = "- 列表项";
    const res = kramdown.bodyWriteRestriction(structured);
    assert.ok(res && res.includes("multi-line or structured body writing is unavailable"));
});

test("负向验证：注入含换行符的违规内容应被拒绝", () => {
    const badContent = "第一行\n第二行\n第三行";
    const result = kramdown.bodyWriteRestriction(badContent);
    assert.notEqual(result, undefined);
    assert.ok(result.includes("multi-line"));
});

test("负向验证：注入结构化 Markdown 应被拒绝", () => {
    const badContent = "| 列 1 | 列 2 |";
    const result = kramdown.bodyWriteRestriction(badContent);
    assert.notEqual(result, undefined);
    assert.ok(result.includes("multi-line or structured"));
});

test("负向验证：恢复合规内容后应允许写入", () => {
    const goodContent = "这是一行合规的单行文本";
    const result = kramdown.bodyWriteRestriction(goodContent);
    assert.equal(result, undefined);
});
