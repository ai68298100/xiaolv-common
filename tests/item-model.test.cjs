// 数据模型归一化测试：未知字段丢弃、上限裁剪、非法输入降级、类型推断。
const test = require("node:test");
const assert = require("node:assert");
const item = require("./.build/entry.cjs").item;

const VALID_BLOCK_ID = "20240101120000-abcdefg";
const VALID_DOC_ID = "20240101120001-hijklmn";

function baseAttrs(extra = {}) {
    return {
        "custom-xlc-id": "xlc-test123456",
        ...extra,
    };
}

test("normalizeCommonItem：合法输入产出完整条目", () => {
    const result = item.normalizeCommonItem({
        blockId: VALID_BLOCK_ID,
        libraryDocId: VALID_DOC_ID,
        attrs: baseAttrs({
            "custom-xlc-type": "url",
            "custom-xlc-title": "官网",
            "custom-xlc-tags": "工作,常用、置顶",
            "custom-xlc-url": "https://example.com",
            "custom-xlc-src-doc": VALID_DOC_ID,
        }),
        blockType: "p",
        kramdown: "官网 https://example.com",
    });
    assert.ok(result);
    assert.equal(result.itemType, "url");
    assert.equal(result.title, "官网");
    assert.deepEqual(result.tags, ["工作", "常用", "置顶"]);
    assert.equal(result.url, "https://example.com");
    assert.equal(result.source.sourceDocId, VALID_DOC_ID);
    assert.equal(result.droppedFields.length, 0);
});

test("normalizeCommonItem：未知 xlc 字段被丢弃并计数（前向兼容）", () => {
    const result = item.normalizeCommonItem({
        blockId: VALID_BLOCK_ID,
        libraryDocId: VALID_DOC_ID,
        attrs: baseAttrs({"custom-xlc-futurefield": "x", "unrelated": "y"}),
    });
    assert.ok(result);
    assert.deepEqual(result.droppedFields, ["custom-xlc-futurefield"]);
});

test("normalizeCommonItem：非法块 ID / 缺逻辑 ID 返回 null", () => {
    assert.equal(item.normalizeCommonItem({blockId: "bad", libraryDocId: VALID_DOC_ID, attrs: baseAttrs()}), null);
    assert.equal(item.normalizeCommonItem({blockId: VALID_BLOCK_ID, libraryDocId: VALID_DOC_ID, attrs: {}}), null);
});

test("normalizeCommonItem：超长标题/别名被裁剪到上限", () => {
    const longTitle = "标".repeat(2000);
    const result = item.normalizeCommonItem({
        blockId: VALID_BLOCK_ID,
        libraryDocId: VALID_DOC_ID,
        attrs: baseAttrs({"custom-xlc-title": longTitle, "custom-xlc-alias": "别".repeat(999)}),
    });
    assert.ok(result);
    assert.equal(result.title.length, 512);
    assert.equal(result.alias.length, 256);
});

test("标签列表：去重、逐项裁剪、数量上限 32", () => {
    const tags = item.cleanTagList(Array.from({length: 50}, (_, i) => `tag${i}`));
    assert.equal(tags.length, 32);
    assert.equal(item.cleanTagList(["a", "a", " b "]).length, 2);
    assert.equal(item.cleanTagList("x,y、z").join("|"), "x|y|z");
});

test("inferItemType：代码/图片/附件/结构", () => {
    assert.equal(item.inferItemType("c", "", ""), "code");
    assert.equal(item.inferItemType("p", "", `![](assets/foo-20240101.png)`), "image");
    assert.equal(item.inferItemType("p", "", `[文档](assets/foo.pdf)`), "asset");
    assert.equal(item.inferItemType("super", "s", ""), "structure");
    assert.equal(item.inferItemType("p", "", "普通文字"), "text");
});

test("deriveTitle：别名 > 首行 > 类型兜底", () => {
    assert.equal(item.deriveTitle("hello\nworld", "text", {"custom-xlc-alias": "别名"}), "别名");
    assert.equal(item.deriveTitle("# 标题行\n正文", "markdown", {}), "标题行");
    assert.equal(item.deriveTitle("", "code", {}), "Code");
});

test("deriveSummary：有界摘要（≤240）且纯文本化", () => {
    const md = "# 标题\n\n" + "长".repeat(500);
    const summary = item.deriveSummary(md);
    assert.ok(summary.length <= 240);
    assert.ok(!summary.includes("# "));
});

test("normalizeUnknownItem：协议输入的宽松归一化", () => {
    const okCase = item.normalizeUnknownItem({
        id: "xlc-fromproto1",
        blockId: VALID_BLOCK_ID,
        libraryDocId: VALID_DOC_ID,
        itemType: "markdown",
        title: "协议条目",
        source: {sourceDocId: VALID_DOC_ID},
    });
    assert.ok(okCase);
    assert.equal(okCase.itemType, "markdown");
    assert.equal(item.normalizeUnknownItem(null), null);
    assert.equal(item.normalizeUnknownItem({id: "not-xlc"}), null);
});
