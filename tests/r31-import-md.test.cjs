// R31：Markdown 包解析——与 buildMarkdownExport 严格互逆（元数据注释为界）、占位符字面保持、坏块计数。
const test = require("node:test");
const assert = require("node:assert");
const {exportMarkdown, importMarkdown} = {
    exportMarkdown: require("./.build/entry.cjs").exportMarkdown,
    importMarkdown: require("./.build/entry.cjs").importMarkdown,
};

const SAMPLE_MD = `# 小驴常用 · 条目导出

> 导出自思源插件「小驴常用」，共 2 条。

## 项目延期道歉与补偿方案

<!-- xlc-item
id: xlc-md0000000001
type: markdown
tags: 客户沟通,模板
category: 客服
source-doc: 20240101120001-hijklmn
-->

尊敬的王总：

关于本期交付延期，我们深表歉意。

## 延期简短版（IM 用）

<!-- xlc-item
id: xlc-md0000000002
type: text
-->

您好，本次迭代因联调超期，上线推迟 2 天。`;

test("门禁：解析结果与导出格式严格互逆（id/类型/标签/正文逐字段一致）", () => {
    const result = importMarkdown.parseMarkdownPack(SAMPLE_MD);
    assert.equal(result.issues.length, 0);
    assert.equal(result.items.length, 2);
    const first = result.items[0];
    assert.equal(first.id, "xlc-md0000000001");
    assert.equal(first.itemType, "markdown");
    assert.equal(first.title, "项目延期道歉与补偿方案");
    assert.deepEqual(first.tags, ["客户沟通", "模板"]);
    assert.equal(first.category, "客服");
    assert.equal(first.source.sourceDocId, "20240101120001-hijklmn");
    assert.ok(first.kramdown.includes("尊敬的王总"));
    const second = result.items[1];
    assert.equal(second.itemType, "text");
    assert.ok(second.kramdown.includes("联调超期"));
});

test("门禁：正文含 ## 标题不误切（元数据注释才是条目边界）", () => {
    const md = `## 条目一

<!-- xlc-item
id: xlc-md0000000003
type: markdown
-->

正文首行

## 正文内的二级标题

正文尾行`;
    const result = importMarkdown.parseMarkdownPack(md);
    assert.equal(result.items.length, 1);
    assert.ok(result.items[0].kramdown.includes("## 正文内的二级标题"));
    assert.ok(result.items[0].kramdown.includes("正文尾行"));
});

test("坏块计数：坏 ID / 未闭合注释计入 issues 不阻断其余", () => {
    const md = `## 好条目

<!-- xlc-item
id: xlc-md0000000004
type: text
-->

内容

## 坏 ID

<!-- xlc-item
id: not-valid
type: text
-->

内容

<!-- xlc-item
id: xlc-md0000000005`;
    const result = importMarkdown.parseMarkdownPack(md);
    assert.equal(result.items.length, 1);
    assert.equal(result.issues.length, 2);
});

test("无元数据注释的外来 Markdown 一律忽略（不吞外来文本）", () => {
    assert.deepEqual(importMarkdown.parseMarkdownPack("# 随便一篇笔记\n\n正文"), {items: [], issues: []});
    assert.deepEqual(importMarkdown.parseMarkdownPack(""), {items: [], issues: []});
});

test("renderItemMetadata 与解析器互逆", () => {
    const item = {
        id: "xlc-roundtrip001", itemType: "markdown", title: "RT", alias: "别名",
        tags: ["a"], category: "c", kramdown: "正文",
        source: {sourceDocId: "20240101120001-hijklmn", sourceBlockId: "", sourceType: "external"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0,
    };
    const meta = importMarkdown.renderItemMetadata(item);
    const parsed = importMarkdown.parseMarkdownPack(`## RT\n\n${meta}\n\n正文`);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].id, "xlc-roundtrip001");
    assert.deepEqual(parsed.items[0].tags, ["a"]);
    assert.equal(parsed.items[0].source.sourceDocId, "20240101120001-hijklmn");
});
