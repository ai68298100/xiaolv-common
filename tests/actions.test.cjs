// 插入语义分派测试：每种内容类型的插入/复制/打开语义，块引用与嵌入的明确区分，失效降级。
const test = require("node:test");
const assert = require("node:assert");
const actions = require("./.build/entry.cjs").actions;

const BLOCK = "20240101120000-abcdefg";
const DOC = "20240101120001-hijklmn";

function makeItem(overrides = {}) {
    return {
        id: "xlc-item1", blockId: BLOCK, libraryDocId: DOC,
        itemType: "text", title: "标题", alias: "", tags: [], category: "",
        summary: "", source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
        ...overrides,
    };
}

function ctx(overrides = {}) {
    return {surface: "desktop", hasActiveEditor: true, content: {kramdown: "", sourceMissing: false, assetMissing: false}, ...overrides};
}

test("text：插入=段落文本；复制=纯文本", () => {
    const plan = actions.planAction(makeItem(), "insert", ctx({content: {kramdown: "你好世界", sourceMissing: false, assetMissing: false}}));
    assert.equal(plan.markdown, "你好世界");
    const copy = actions.planAction(makeItem(), "copy", ctx({content: {kramdown: "你好世界", sourceMissing: false, assetMissing: false}}));
    assert.equal(copy.clipboardText, "你好世界");
    assert.equal(copy.clipboardKind, "text");
});

test("code：插入保留语言围栏；复制=裸代码", () => {
    const kramdown = "```js\nconsole.log(1);\n```";
    const insert = actions.planAction(makeItem({itemType: "code"}), "insert", ctx({content: {kramdown, sourceMissing: false, assetMissing: false}}));
    assert.equal(insert.markdown, kramdown);
    const copy = actions.planAction(makeItem({itemType: "code"}), "copy", ctx({content: {kramdown, sourceMissing: false, assetMissing: false}}));
    assert.equal(copy.clipboardText, "console.log(1);");
    assert.equal(copy.clipboardKind, "code");
});

test("url：open=外链目标；复制=裸 URL；插入=标题链接", () => {
    const it = makeItem({itemType: "url", url: "https://example.com", title: "示例"});
    assert.deepEqual(actions.planAction(it, "open", ctx()).open, {kind: "url", url: "https://example.com"});
    assert.equal(actions.planAction(it, "copy", ctx()).clipboardText, "https://example.com");
    assert.equal(actions.planAction(it, "insert", ctx()).markdown, "[示例](https://example.com)");
});

test("image/asset：插入资源块；资源缺失时诚实降级", () => {
    const it = makeItem({itemType: "image"});
    const kd = `![](assets/pic-20240101.png)`;
    const okPlan = actions.planAction(it, "insert", ctx({content: {kramdown: kd, sourceMissing: false, assetMissing: false}}));
    assert.equal(okPlan.markdown, "![](assets/pic-20240101.png)");
    const missing = actions.planAction(it, "insert", ctx({content: {kramdown: kd, sourceMissing: false, assetMissing: true}}));
    assert.equal(missing.downgraded, true);
    assert.ok(missing.warnings.includes("asset-missing"));
    // 复制仍可用（Markdown 链接），并声明位图待验证
    const copy = actions.planAction(it, "copy", ctx({content: {kramdown: kd, sourceMissing: false, assetMissing: false}}));
    assert.ok(copy.clipboardText.includes("](assets/pic-20240101.png)"));
    assert.ok(copy.pendingVerification.includes("bitmap-clipboard-unverified"));
});

test("块引用：默认插入=引用语法（绝不误克隆为文本）；三种模式明确分派", () => {
    const it = makeItem({itemType: "blockref", targetBlockId: DOC, title: "目标块"});
    const def = actions.planAction(it, "insert", ctx());
    assert.equal(def.markdown, `((${DOC} '目标块'))`);
    const ref = actions.planAction(it, "insert-ref", ctx());
    assert.equal(ref.markdown, `((${DOC} '目标块'))`);
    const embed = actions.planAction(it, "insert-embed", ctx());
    assert.equal(embed.markdown, `{{select * from blocks where id='${DOC}'}}`);
    const copyContent = actions.planAction(it, "copy-content", ctx({content: {kramdown: "原始内容", sourceMissing: false, assetMissing: false}}));
    assert.equal(copyContent.clipboardText, "原始内容");
    assert.equal(copyContent.mode, "copy-content");
});

test("块引用：目标 ID 非法时诚实降级（不产出坏语法）", () => {
    const it = makeItem({itemType: "blockref", targetBlockId: "not-a-block-id"});
    const plan = actions.planAction(it, "insert-ref", ctx());
    assert.equal(plan.downgraded, true);
    assert.ok(!plan.markdown);
});

test("buildBlockRef：锚文本单引号转义；ID 校验拒绝", () => {
    assert.equal(actions.buildBlockRef(BLOCK, "it's"), `((${BLOCK} 'it\\'s'))`);
    assert.throws(() => actions.buildBlockRef("bad id", "x"));
    assert.throws(() => actions.buildEmbedBlock("../etc"));
});

test("structure：多块结构原样插入（superblock 剥壳由库层保证）", () => {
    const kd = "{{{row\n段落一\n段落二\n}}}";
    const plan = actions.planAction(makeItem({itemType: "structure"}), "insert", ctx({content: {kramdown: kd, sourceMissing: false, assetMissing: false}}));
    assert.equal(plan.markdown, kd);
});

test("planOpenSource：URL > 资源 > 来源块 > 来源文档 > 库文档 的回退链", () => {
    const kdOf = (it, kramdown) => ({kramdown, sourceMissing: false, assetMissing: false});
    assert.equal(actions.planOpenSource(makeItem({itemType: "url", url: "https://a.b"}), kdOf({}, "")).target.kind, "url");
    const img = makeItem({itemType: "image"});
    assert.equal(actions.planOpenSource(img, kdOf(img, "![](assets/x.png)")).target.kind, "asset");
    assert.equal(actions.planOpenSource(img, {...kdOf(img, ""), assetMissing: true}).failure, "asset-missing");
    const withSrc = makeItem({itemType: "markdown", source: {sourceDocId: DOC, sourceBlockId: BLOCK, sourceType: "block"}});
    assert.equal(actions.planOpenSource(withSrc, kdOf(withSrc, "x")).target.kind, "block");
    assert.equal(actions.planOpenSource(withSrc, {...kdOf(withSrc, "x"), sourceMissing: true}).failure, "source-missing");
    const docOnly = makeItem({itemType: "markdown", source: {sourceDocId: DOC, sourceBlockId: "", sourceType: "block"}});
    assert.equal(actions.planOpenSource(docOnly, kdOf(docOnly, "x")).target.kind, "doc");
    assert.equal(actions.planOpenSource(makeItem(), kdOf({}, "x")).target.docId, DOC);
});

test("open 模式在来源失效时降级且不产出 open 目标", () => {
    const it = makeItem({itemType: "markdown", source: {sourceDocId: DOC, sourceBlockId: BLOCK, sourceType: "block"}});
    const plan = actions.planAction(it, "open", ctx({content: {kramdown: "x", sourceMissing: true, assetMissing: false}}));
    assert.equal(plan.downgraded, true);
    assert.ok(!plan.open);
});
