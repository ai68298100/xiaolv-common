// T-0134 / R281 / G23：光标选区包裹模式与 {{xlc:selection}} 占位符契约测试
const test = require("node:test");
const assert = require("node:assert");
const {placeholders, commands, item} = {
    placeholders: require("./.build/entry.cjs").placeholders,
    commands: require("./.build/entry.cjs").commands,
    item: require("./.build/entry.cjs").item,
};
const ph = placeholders;

const NOW = new Date(2026, 9, 20, 15, 0, 0);

test("applyPlaceholders: 有活动选区时直接展开", () => {
    const docWithSel = {
        title: "开发日志",
        path: "/研发/开发日志",
        selection: "const token = 'xyz123';",
    };

    // 基础包裹
    const out1 = ph.applyPlaceholders("选中文本: [{{xlc:selection}}]", NOW, true, docWithSel);
    assert.equal(out1, "选中文本: [const token = 'xyz123';]");

    // 代码块包裹场景 (Surround with Code Block)
    const tpl = "```typescript\n{{xlc:selection}}\n```";
    const out2 = ph.applyPlaceholders(tpl, NOW, true, docWithSel);
    assert.equal(out2, "```typescript\nconst token = 'xyz123';\n```");

    // 引用块包裹场景 (Surround with Blockquote)
    const quoteTpl = "> 📌 引用：\n> {{xlc:selection}}";
    const out3 = ph.applyPlaceholders(quoteTpl, NOW, true, docWithSel);
    assert.equal(out3, "> 📌 引用：\n> const token = 'xyz123';");
});

test("applyPlaceholders: 无活动选区时的默认值回退与空串兜底", () => {
    const docNoSel = {
        title: "开发日志",
        path: "/研发/开发日志",
        selection: "",
    };

    // 1. 无选区但指定了默认回退内容 {{xlc:selection|默认文本}}
    const outWithDef = ph.applyPlaceholders("执行指令: {{xlc:selection|echo 'hello'}}", NOW, true, docNoSel);
    assert.equal(outWithDef, "执行指令: echo 'hello'");

    // 2. 无选区且未指定默认内容 -> 诚实降级为空串，绝不把 {{xlc:selection}} 残留在正文里
    const outEmpty = ph.applyPlaceholders("前缀-{{xlc:selection}}-后缀", NOW, true, docNoSel);
    assert.equal(outEmpty, "前缀--后缀");

    // 3. doc 对象完全不存在时（无活动文档） -> 同样安全降级
    const outNullDoc = ph.applyPlaceholders("包裹 [{{xlc:selection|待输入}}] 与 [{{xlc:selection}}]", NOW, true, null);
    assert.equal(outNullDoc, "包裹 [待输入] 与 []");
});

test("applyPlaceholders: 有选区时优先采用选区（忽略默认参数）", () => {
    const docWithSel = {
        title: "文档",
        path: "/文档",
        selection: "真实的选中内容",
    };
    const out = ph.applyPlaceholders("内容: {{xlc:selection|默认回退内容}}", NOW, true, docWithSel);
    assert.equal(out, "内容: 真实的选中内容");
});

test("listPlaceholders: 正确识别 selection 占位符", () => {
    const kinds1 = ph.listPlaceholders("包裹 {{xlc:selection}} 日期 {{xlc:date}}");
    assert.deepEqual(kinds1, ["selection", "date"]);

    const kinds2 = ph.listPlaceholders("带参 {{xlc:selection|TODO}}");
    assert.deepEqual(kinds2, ["selection"]);
});

test("ActionExecutor: 执行层选区捕获与展开集成验证", async () => {
    let lastCopiedText = null;

    const mockHost = {
        hasActiveEditor: () => true,
        insertMarkdown: () => true,
        captureInsertTarget: () => ({editor: null, handle: null, docId: null}),
        canInsertAtTarget: () => true,
        releaseInsertTarget: () => {},
        writeClipboard: async (text) => {
            lastCopiedText = text;
            return true;
        },
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => "doc-1",
        isMobile: () => false,
    };

    const mockLibrary = {
        checkSourceHealth: async () => ({ok: true, data: {blockMissing: false, docMissing: false, assetMissing: false}}),
        getItemKramdown: async () => ({ok: true, data: "```javascript\n{{xlc:selection|// 无选区代码}}\n```"}),
        expandSnippetRefs: async (text) => text,
    };

    const placeholderHook = {
        enabled: () => true,
        now: () => NOW,
        currentDoc: async () => ({title: "测试文档", path: "/测试文档"}),
        selection: () => "console.log('from selection');",
    };

    const executor = new commands.ActionExecutor(mockLibrary, mockHost, () => {}, undefined, placeholderHook);

    const testItem = item.normalizeCommonItem({
        blockId: "20261020150000-abcdefg",
        libraryDocId: "20261020150001-hijklmn",
        attrs: {
            "custom-xlc-id": "xlc-test12345678",
            "custom-xlc-type": "markdown",
            "custom-xlc-title": "代码包裹模板",
        },
        blockType: "p",
        kramdown: "```javascript\n{{xlc:selection|// 无选区代码}}\n```",
    });
    assert.ok(testItem);

    const receipt = await executor.run(testItem, "copy");
    assert.equal(receipt.ok, true);
    assert.ok(lastCopiedText.includes("console.log('from selection');"));
    assert.ok(!lastCopiedText.includes("// 无选区代码"));
});
