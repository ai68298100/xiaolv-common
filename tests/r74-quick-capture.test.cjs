// R74：F8 快速捕获剪贴板（无表单一步入库 / 同文去重诚实提示）+ F7 常用内容示例包完整性。
const test = require("node:test");
const assert = require("node:assert");
const {capture, importMarkdown, variables, actions} = require("./.build/entry.cjs");
const {CaptureDialog} = capture;
const {parseMarkdownPack} = importMarkdown;
const {PROMPT_PACK_MD, PROMPT_PACK_NAME} = require("./.build/entry.cjs").promptPack;
const {bodyWriteRestriction} = require("./.build/entry.cjs").kramdown;

function actionContext(kramdown) {
    return {
        surface: "desktop",
        hasActiveEditor: true,
        content: {kramdown, sourceMissing: false, assetMissing: false},
    };
}

function makeCapture(overrides = {}) {
    const calls = {created: null, notified: []};
    const deps = {
        t: (key, ...args) => {
            const map = {
                clipboardReadFailed: "无法读取剪贴板",
                quickCaptureDuplicate: "已存在同文条目「%s」，未重复保存",
                saved: "已保存：%s",
            };
            let text = map[key] ?? key;
            for (const a of args) text = text.replace("%s", a);
            return text;
        },
        getSelectionText: () => ({text: "", blockId: null}),
        currentDocId: () => null,
        readClipboardText: async () => "https://example.com/page",
        createItem: async (input) => {
            calls.created = input;
            return {ok: true, message: "示例标题", itemId: "xlc-new000000001"};
        },
        notify: (kind, message) => {
            calls.notified.push({kind, message});
        },
        getBlockKramdown: async () => null,
        exportDocContent: async () => null,
        aiEnabled: () => false,
        findDuplicate: async () => null,
        ...overrides,
    };
    return {dialog: new CaptureDialog(deps), calls};
}

test("快速捕获：剪贴板为空 → 诚实报错，不落库", async () => {
    const {dialog, calls} = makeCapture({readClipboardText: async () => "   "});
    await dialog.quickCaptureFromClipboard();
    assert.strictEqual(calls.created, null);
    assert.ok(calls.notified.some((n) => n.kind === "error"));
});

test("快速捕获：新内容 → 类型推断入库（URL 识别）+ 保存回执", async () => {
    const {dialog, calls} = makeCapture();
    await dialog.quickCaptureFromClipboard();
    assert.strictEqual(calls.created?.itemType, "url");
    assert.strictEqual(calls.created?.markdown, "https://example.com/page");
    assert.strictEqual(calls.created?.title, "https://example.com/page", "首行应作为快速捕获标题");
    assert.ok(!calls.notified.some((n) => n.message.includes("已保存")), "表单侧不得重复报已保存"); // R138 回执上收到包装层
});

test("快速捕获：受限多行正文明确拒绝，不提交部分内容", async () => {
    const {dialog, calls} = makeCapture({readClipboardText: async () => "\n  第一行标题  \n正文"});
    await dialog.quickCaptureFromClipboard();
    assert.equal(calls.created, null);
    assert.ok(calls.notified.some((notice) => notice.kind === "error" && notice.message === "multiBlockPendingHint"));
});

test("捕获入口：超长内容不截断、不打开草稿、不调用创建", async () => {
    const giant = "A".repeat(100001);
    const {dialog, calls} = makeCapture({
        getSelectionText: () => ({text: giant, blockId: "20240101000000-abcdefg"}),
        currentDocId: () => "20240101000001-hijklmn",
        readClipboardText: async () => giant,
        getBlockKramdown: async () => giant,
        exportDocContent: async () => ({hPath: "/巨型文档", content: giant}),
    });
    const forms = [];
    dialog.openForm = (...args) => forms.push(args);
    await dialog.saveSelection();
    await dialog.captureFromClipboard();
    await dialog.quickCaptureFromClipboard();
    await dialog.captureCurrentBlock();
    await dialog.captureCurrentDoc();
    dialog.newWithContent(giant);
    assert.equal(forms.length, 0);
    assert.equal(calls.created, null);
    assert.equal(calls.notified.filter((notice) => notice.kind === "error" && notice.message === "aiContentTooLong").length, 6);
});

test("块引用捕获：草稿包含真实目标引用语法，不以空正文提交", () => {
    const {dialog} = makeCapture();
    let form;
    dialog.openForm = (...args) => { form = args; };
    const target = "20240101000000-abcdefg";
    dialog.captureBlockRef(target, "需求模板");
    assert.equal(form[0], `((${target}))`);
    assert.equal(form[1], "blockref");
    assert.equal(form[3].targetBlockId, target);
});

test("快速捕获：同文已存在 → 诚实提示不重复写入（不弹确认打断）", async () => {
    const {dialog, calls} = makeCapture({
        findDuplicate: async () => ({id: "xlc-dup00000001", title: "已有条目"}),
    });
    await dialog.quickCaptureFromClipboard();
    assert.strictEqual(calls.created, null);
    const info = calls.notified.find((n) => n.message.includes("未重复保存"));
    assert.ok(info && info.message.includes("已有条目"));
});

test("保存选中内容：空选区明确提示，不偷偷读取剪贴板", async () => {
    let clipboardReads = 0;
    const {dialog, calls} = makeCapture({
        getSelectionText: () => ({text: "", blockId: null}),
        readClipboardText: async () => {
            clipboardReads += 1;
            return "clipboard";
        },
        t: (key, ...args) => {
            const map = {captureSelectionEmpty: "当前没有选中内容"};
            let text = map[key] ?? key;
            for (const a of args) text = text.replace("%s", a);
            return text;
        },
    });
    await dialog.saveSelection();
    assert.equal(clipboardReads, 0);
    assert.ok(calls.notified.some((n) => n.message.includes("没有选中内容")));
});

test("保存整篇文档：空文档明确提示，不打开空表单", async () => {
    const {dialog, calls} = makeCapture({
        currentDocId: () => "20240101000000-abcdefg",
        exportDocContent: async () => ({hPath: "/笔记本/空文档", content: "  "}),
        t: (key, ...args) => {
            const map = {captureDocEmpty: "当前文档没有可保存内容"};
            let text = map[key] ?? key;
            for (const a of args) text = text.replace("%s", a);
            return text;
        },
    });
    await dialog.captureCurrentDoc();
    assert.ok(calls.notified.some((n) => n.message.includes("没有可保存内容")));
});

test("未配置内容库：保存入口先打开设置，不读取剪贴板或当前块", async () => {
    let reads = 0;
    let setupOpens = 0;
    const {dialog} = makeCapture({
        isConfigured: () => false,
        onNotConfigured: () => { setupOpens += 1; },
        readClipboardText: async () => { reads += 1; return "text"; },
        getSelectionText: () => { reads += 1; return {text: "", blockId: "20240101000000-abcdefg"}; },
    });
    await dialog.captureFromClipboard();
    await dialog.quickCaptureFromClipboard();
    await dialog.captureCurrentBlock();
    await dialog.captureCurrentDoc();
    assert.equal(setupOpens, 4);
    assert.equal(reads, 0);
});

test("保存当前块：异步读取异常转换为可见错误回执", async () => {
    const {dialog, calls} = makeCapture({
        getSelectionText: () => ({text: "", blockId: "20240101000000-abcdefg"}),
        getBlockKramdown: async () => { throw new Error("block unavailable"); },
        t: (key, ...args) => {
            const map = {kernelError: "读取失败：%s"};
            let text = map[key] ?? key;
            for (const a of args) text = text.replace("%s", a);
            return text;
        },
    });
    await dialog.captureCurrentBlock();
    assert.ok(calls.notified.some((n) => n.kind === "error" && n.message.includes("block unavailable")));
});

test("快速捕获：剪贴板来源不错误绑定当前活动文档", async () => {
    let savedSource;
    const {dialog} = makeCapture({
        currentDocId: () => "20240101000000-abcdefg",
        readClipboardText: async () => {
            return "clipboard content";
        },
        createItem: async (input) => {
            savedSource = input.source;
            return {ok: true, message: "saved"};
        },
    });
    await dialog.quickCaptureFromClipboard();
    assert.deepEqual(savedSource, {sourceType: "clipboard"});
});

test("选区、当前块和整篇文档均冻结触发时来源文档", async () => {
    let activeDoc = "20240101000000-abcdefg";
    const openedForms = [];
    const deps = {
        t: (key) => key,
        getSelectionText: () => ({text: "选区内容", blockId: "20240101000001-hijklmn"}),
        currentDocId: () => activeDoc,
        readClipboardText: async () => "clipboard",
        createItem: async () => ({ok: true, message: "saved"}),
        notify: () => {},
        getBlockKramdown: async () => "块内容",
        exportDocContent: async () => ({hPath: "/笔记本/文档", content: "文档内容"}),
        aiEnabled: () => false,
        aiTidy: async () => ({ok: false, message: "disabled"}),
        aiDraft: async () => ({ok: false, message: "disabled"}),
        findDuplicate: async () => null,
        isConfigured: () => true,
    };
    const dialog = new CaptureDialog(deps);
    dialog.openForm = (...args) => openedForms.push(args);

    await dialog.saveSelection();
    activeDoc = "20240101000002-opqrstu";
    await dialog.captureCurrentBlock();
    activeDoc = "20240101000003-vwxyz12";
    await dialog.captureCurrentDoc();

    assert.deepEqual(openedForms.map((args) => args[3]), [
        {docId: "20240101000000-abcdefg", sourceType: "selection"},
        {docId: "20240101000002-opqrstu", sourceType: "block"},
        {title: "文档", docId: "20240101000003-vwxyz12", sourceType: "doc-fragment"},
    ]);
});

// ---- 常用内容示例包 ----

test("常用内容示例：25 个条目全部可解析（ID/类型合法），清单与包名正确", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    assert.strictEqual(parsed.items.length, 25);
    assert.match(PROMPT_PACK_MD, /items: 25/);
    assert.ok(parsed.items.every((i) => /^xlc-[0-9a-z]{10,40}$/.test(i.id)));
    assert.strictEqual(parsed.pack?.name, PROMPT_PACK_NAME);
    assert.ok((parsed.pack?.vars.length ?? 0) >= 10);
    assert.strictEqual(parsed.issues.length, 0);
    const ids = new Set(parsed.items.map((item) => item.id));
    for (let n = 1; n <= 20; n++) assert.ok(ids.has(`xlc-pack${String(n).padStart(8, "0")}`), `原有 ID ${n} 不应变化`);
    for (let n = 21; n <= 25; n++) assert.ok(ids.has(`xlc-pack${String(n).padStart(8, "0")}`), `新增 ID ${n} 缺失`);
});

test("场景包：覆盖商务、客服、提示词、写作、开发场景且演示变量系统（ask 与 cursor）", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    const categories = new Set(parsed.items.map((i) => i.category));
    for (const c of ["商务", "客服", "提示词", "写作", "开发"]) assert.ok(categories.has(c), `缺少分类 ${c}`);
    const withVars = parsed.items.filter((i) => /\{\{xlc:ask:/.test(i.kramdown));
    const withCursor = parsed.items.filter((i) => i.kramdown.includes("{{xlc:cursor}}"));
    assert.ok(withVars.length >= 10);
    assert.ok(withCursor.length >= 7);
});

test("场景包：包含可直接改写的使用说明、地址、开票与退换模板", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    const byTitle = new Map(parsed.items.map((item) => [item.title, item]));
    const guide = byTitle.get("使用说明：三步开始");
    assert.ok(guide, "缺少使用说明条目");
    assert.match(guide.kramdown, /保存|调用|整理/);
    assert.match(guide.kramdown, /xlc:ask/);
    assert.match(guide.kramdown, /注释|说明/);
    assert.match(guide.kramdown, /Alt|Tab/);
    assert.ok(!guide.kramdown.includes("xlc-item"), "条目边界不应把下一条元数据带入使用说明");
    assert.strictEqual(variables.listAskFields(guide.kramdown).length, 0, "使用说明中的语法示例不应触发填写卡");
    assert.ok(parsed.items.some((item) => item.category === "地址" && /xlc:ask:收件人/.test(item.kramdown)));
    assert.ok(parsed.items.some((item) => item.category === "邮箱" && /xlc:ask:邮箱/.test(item.kramdown)));
    assert.ok(parsed.items.some((item) => item.category === "商务" && /xlc:ask:纳税人识别号/.test(item.kramdown)));
    assert.ok(parsed.items.some((item) => item.category === "客服" && /xlc:ask:退换类型/.test(item.kramdown)));
    assert.ok(parsed.items.some((item) => item.category === "联系方式"));
});

test("常用内容示例：新增邮箱、地址、无效身份占位、网址和 JSON 均符合当前写入边界", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    const added = parsed.items.filter((item) => Number(item.id.slice(-2)) >= 21);
    assert.strictEqual(added.length, 5);
    assert.strictEqual(parsed.items.filter((item) => bodyWriteRestriction(item.kramdown) === undefined).length, 8, "当前包应有 8 条可直接写入示例");
    for (const item of added) {
        assert.strictEqual(bodyWriteRestriction(item.kramdown), undefined, `${item.title} 应可直接导入`);
    }
    const byId = new Map(added.map((item) => [item.id, item]));
    assert.equal(byId.get("xlc-pack00000021")?.itemType, "text");
    assert.match(byId.get("xlc-pack00000021")?.kramdown ?? "", /邮箱/);
    assert.equal(byId.get("xlc-pack00000022")?.category, "地址");
    assert.match(byId.get("xlc-pack00000023")?.kramdown ?? "", /无效占位/);
    assert.match(byId.get("xlc-pack00000023")?.kramdown ?? "", /000000000000000000/);
    assert.equal(byId.get("xlc-pack00000024")?.itemType, "url");
    assert.equal(byId.get("xlc-pack00000024")?.url, "https://example.com/docs");
    assert.equal(byId.get("xlc-pack00000025")?.itemType, "code");
    assert.match(byId.get("xlc-pack00000025")?.kramdown ?? "", /^```json[\s\S]*\n```$/);
});

test("常用内容示例：导入回执按写入限制统计，重复导入按 skip 且不重写", async () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    const stored = new Map();
    let createCalls = 0;
    const library = {
        ensureIndex: async () => ({items: new Map(stored), entries: []}),
        createItem: async (input) => {
            createCalls++;
            stored.set(input.logicalId, {id: input.logicalId});
            return {ok: true, itemId: input.logicalId};
        },
        reindex: async () => ({items: new Map(stored), entries: []}),
    };
    const first = await importMarkdown.importMarkdownBundle(library, parsed.items, "skip");
    assert.deepEqual(
        {total: first.total, created: first.created, skipped: first.skipped, overwritten: first.overwritten, renamed: first.renamed, failed: first.failed},
        {total: 25, created: 8, skipped: 0, overwritten: 0, renamed: 0, failed: 17},
    );
    assert.equal(createCalls, 8, "仅 8 条安全正文应进入 createItem");
    const second = await importMarkdown.importMarkdownBundle(library, parsed.items, "skip");
    assert.deepEqual(
        {total: second.total, created: second.created, skipped: second.skipped, overwritten: second.overwritten, renamed: second.renamed, failed: second.failed},
        {total: 25, created: 0, skipped: 8, overwritten: 0, renamed: 0, failed: 17},
    );
    assert.equal(createCalls, 8, "skip 重复项不应再次写入");
    assert.equal(second.lines.filter((line) => line.action === "skip" && line.ok).length, 8);
    assert.equal(second.lines.filter((line) => line.action === "new" && !line.ok).length, 17);
});

test("常用内容示例：预览正文与复制/插入载荷保持类型语义", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    const byId = new Map(parsed.items.map((item) => [item.id, item]));
    const email = byId.get("xlc-pack00000021");
    assert.equal(email?.title, "邮箱地址（单行示例）");
    assert.deepEqual(email?.tags, ["邮箱", "单行示例"]);
    assert.equal(email?.kramdown, "邮箱：{{xlc:ask:邮箱}}");
    assert.equal(actions.planAction(email, "copy", actionContext(email.kramdown)).clipboardText, email.kramdown);
    assert.equal(actions.planAction(email, "insert", actionContext(email.kramdown)).markdown, email.kramdown);

    const url = byId.get("xlc-pack00000024");
    assert.equal(actions.planAction(url, "copy", actionContext(url.kramdown)).clipboardText, "https://example.com/docs");
    assert.equal(actions.planAction(url, "insert", actionContext(url.kramdown)).markdown, "[常用网址（单行示例）](https://example.com/docs)");

    const code = byId.get("xlc-pack00000025");
    const copy = actions.planAction(code, "copy", actionContext(code.kramdown));
    assert.equal(copy.clipboardKind, "code");
    assert.equal(copy.clipboardText, '{\n  "name": "example",\n  "enabled": true,\n  "tags": ["common", "template"]\n}');
    assert.equal(actions.planAction(code, "insert", actionContext(code.kramdown)).markdown, code.kramdown);
});
