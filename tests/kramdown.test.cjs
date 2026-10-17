const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const esbuild = require("esbuild");

const modulePath = path.join(__dirname, "../src/model/kramdown.ts");
const compiled = esbuild.buildSync({entryPoints: [modulePath], bundle: true, write: false, platform: "node", format: "cjs", target: "node18"});
const loadedModule = new Module(modulePath, module);
loadedModule.filename = modulePath;
loadedModule.paths = Module._nodeModulePaths(path.dirname(modulePath));
loadedModule._compile(compiled.outputFiles[0].text, modulePath);
const {normalizeKramdownIal} = loadedModule.exports;

test("四空格缩进代码中的 IAL 样文本保持字面", () => {
    const source = [
        "普通块",
        "",
        "    {: id=\"20260101000001-code001\" custom-xlc-id=\"xlc-code000001\"}",
        "    {: custom-xlc-title=\"样例\"}",
        "",
        "{: id=\"20260101000002-block01\" custom-xlc-id=\"xlc-parent0001\" custom-style=\"keep\"}",
    ].join("\n");
    const expected = [
        "普通块",
        "",
        "    {: id=\"20260101000001-code001\" custom-xlc-id=\"xlc-code000001\"}",
        "    {: custom-xlc-title=\"样例\"}",
        "",
        "{: custom-style=\"keep\"}",
    ].join("\n");

    assert.equal(normalizeKramdownIal(source), expected);
});

test("跨行反引号行内代码中的 IAL 样文本保持字面", () => {
    const source = [
        "前缀 ``跨行",
        "{: id=\"20260101000003-inline1\" custom-xlc-id=\"xlc-inline00001\"}",
        "",
        "后缀`` 后续 {: id=\"20260101000005-block02\" custom-xlc-id=\"xlc-parent0002\" custom-style=\"keep\"}",
    ].join("\n");
    const expected = [
        "前缀 ``跨行",
        "{: id=\"20260101000003-inline1\" custom-xlc-id=\"xlc-inline00001\"}",
        "",
        "后缀`` 后续 {: custom-style=\"keep\"}",
    ].join("\n");

    assert.equal(normalizeKramdownIal(source), expected);
});

test("未闭合反引号不吞掉后续普通块 IAL", () => {
    const source = [
        "未闭合 ` 代码样式",
        "后续块 {: id=\"20260101000009-block04\" custom-xlc-id=\"xlc-parent0004\" custom-style=\"keep\"}",
    ].join("\n");
    const expected = [
        "未闭合 ` 代码样式",
        "后续块 {: custom-style=\"keep\"}",
    ].join("\n");

    assert.equal(normalizeKramdownIal(source), expected);
});

test("现有代码围栏与普通行内代码行为保持不变", () => {
    const source = [
        "```text",
        "{: id=\"20260101000006-fence01\" custom-xlc-id=\"xlc-fence000001\"}",
        "```",
        "普通 `{: id=\"20260101000007-inline2\" custom-xlc-id=\"xlc-inline00002\"}` 行 {: id=\"20260101000008-block03\" custom-xlc-id=\"xlc-parent0003\" custom-style=\"keep\"}",
    ].join("\n");
    const expected = [
        "```text",
        "{: id=\"20260101000006-fence01\" custom-xlc-id=\"xlc-fence000001\"}",
        "```",
        "普通 `{: id=\"20260101000007-inline2\" custom-xlc-id=\"xlc-inline00002\"}` 行 {: custom-style=\"keep\"}",
    ].join("\n");

    assert.equal(normalizeKramdownIal(source), expected);
});

test("反引号长度 1,2,1,2 交错时只保护闭合的行内代码", () => {
    const source = "`代码 ``内部 ` 后续 {: id=\"20260101000010-block05\" custom-xlc-id=\"xlc-parent0005\" custom-style=\"keep\"} 尾部 `` 后续 {: id=\"20260101000011-block06\" custom-xlc-id=\"xlc-parent0006\" custom-style=\"keep\"}";
    const expected = "`代码 ``内部 ` 后续 {: custom-style=\"keep\"} 尾部 `` 后续 {: custom-style=\"keep\"}";

    assert.equal(normalizeKramdownIal(source), expected);
});

test("IAL 属性值中的反引号不参与行内代码配对", () => {
    const source = "前缀 `代码 {: custom-style=\"`\"} 结束` 后续 {: id=\"20260101000011-block06\" custom-xlc-id=\"xlc-parent0006\" custom-style=\"keep\"}";
    const expected = "前缀 `代码 {: custom-style=\"`\"} 结束` 后续 {: custom-style=\"keep\"}";

    assert.equal(normalizeKramdownIal(source), expected);
});
