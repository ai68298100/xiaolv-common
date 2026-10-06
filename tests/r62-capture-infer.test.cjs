// R62：捕获类型推断（inferTypeFromText）纯函数测试——选中文字捕获的类型自动推断。
const test = require("node:test");
const assert = require("node:assert");
const capture = require("./.build/entry.cjs").capture;

test("URL 推断：http/https 单行", () => {
    assert.equal(capture.inferTypeFromText("https://example.com"), "url");
    assert.equal(capture.inferTypeFromText("http://example.com/x?y=1"), "url");
});

test("code 推断：完整围栏", () => {
    assert.equal(capture.inferTypeFromText("```sql\nSELECT 1;\n```"), "code");
});

test("image 推断：assets 图片单行", () => {
    assert.equal(capture.inferTypeFromText("![](assets/pic-20240101.png)"), "image");
});

test("asset 推断：assets 链接", () => {
    assert.equal(capture.inferTypeFromText("[文档](assets/report-20240101.pdf)"), "asset");
});

test("markdown 推断：标题/列表/粗体/多行", () => {
    assert.equal(capture.inferTypeFromText("# 标题"), "markdown");
    assert.equal(capture.inferTypeFromText("- 列表项"), "markdown");
    assert.equal(capture.inferTypeFromText("**粗体**"), "markdown");
    assert.equal(capture.inferTypeFromText("第一行\n第二行"), "markdown");
});

test("text 推断：普通单行文本", () => {
    assert.equal(capture.inferTypeFromText("普通的一句话"), "text");
});

test("门禁：空输入回退 text（不抛异常）", () => {
    assert.equal(capture.inferTypeFromText(""), "text");
    assert.equal(capture.inferTypeFromText("   "), "text");
});
