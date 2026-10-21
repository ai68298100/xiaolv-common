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

test("cleanTagList：中英文逗号、顿号、分号、空格分割与 # 前缀清洗", () => {
    // 1. 中文全角逗号切分（修复原 /[,,、]/ 错写两遍半角逗号导致无法切分中文逗号的缺陷）
    assert.deepEqual(item.cleanTagList("工作，客服，模板"), ["工作", "客服", "模板"]);

    // 2. 顿号与中英文分号
    assert.deepEqual(item.cleanTagList("开发、测试;运维；部署"), ["开发", "测试", "运维", "部署"]);

    // 3. 空白字符（空格、制表符、连续混合空白）切分
    assert.deepEqual(item.cleanTagList("tag1  tag2 \t tag3"), ["tag1", "tag2", "tag3"]);

    // 4. 思源原生 # 标签前缀与后缀清洗
    assert.deepEqual(item.cleanTagList("#工作 #客服# #模板"), ["工作", "客服", "模板"]);

    // 5. 混用多维标点、井号与空白
    assert.deepEqual(
        item.cleanTagList("工作， #客服 ; #运维# 、 部署 \t #日常 "),
        ["工作", "客服", "运维", "部署", "日常"],
    );
});

test("blockref 目标解析：显式 target 优先，旧记录回退 sourceBlockId", () => {
    assert.equal(item.resolveBlockRefTarget({itemType: "blockref", targetBlockId: VALID_BLOCK_ID, source: {sourceBlockId: VALID_DOC_ID}}), VALID_BLOCK_ID);
    assert.equal(item.resolveBlockRefTarget({itemType: "blockref", targetBlockId: "", source: {sourceBlockId: VALID_DOC_ID}}), VALID_DOC_ID);
    assert.equal(item.resolveBlockRefTarget({itemType: "text", targetBlockId: VALID_BLOCK_ID, source: {sourceBlockId: VALID_DOC_ID}}), "");
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

test("deriveSmartSummary：智能上下文窗口截取，长文本关键词后部命中自动居中截取", () => {
    // 1. 短文本：直接完整返回
    const shortText = "短文本简介";
    assert.strictEqual(item.deriveSmartSummary(shortText, ["文本"]), "短文本简介");

    // 2. 长文本且关键词在前部：从头截取并带省略号
    const prefixLong = "关于退款审批流程的详细说明，" + "后面的补充正文内容".repeat(15);
    const sum1 = item.deriveSmartSummary(prefixLong, ["退款"], 60);
    assert.ok(sum1.startsWith("关于退款审批流程"));
    assert.ok(sum1.endsWith("…"));

    // 3. 长文本且关键词在深处（如第 150 字符处）：以关键词为中心前后开窗
    const deepLong = "前面是无关的开场白和冗长背景说明".repeat(10) + "此处是核心财务报销审核要点规范" + "后面的注意事项和结尾".repeat(10);
    const sum2 = item.deriveSmartSummary(deepLong, ["财务报销"], 50);
    assert.ok(sum2.includes("财务报销"), "摘要中必须包含命中关键词");
    assert.ok(sum2.startsWith("…"), "前方截断应包含前置省略号");
    assert.ok(sum2.endsWith("…"), "后方截断应包含后置省略号");
});
