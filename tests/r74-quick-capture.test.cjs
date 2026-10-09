// R74：F8 快速捕获剪贴板（无表单一步入库 / 同文去重诚实提示）+ F7 提示词场景包内容完整性。
const test = require("node:test");
const assert = require("node:assert");
const {capture, importMarkdown, variables} = require("./.build/entry.cjs");
const {CaptureDialog} = capture;
const {parseMarkdownPack} = importMarkdown;
const {PROMPT_PACK_MD, PROMPT_PACK_NAME} = require("./.build/entry.cjs").promptPack;

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

test("快速捕获：多行文本使用第一个非空行作为标题", async () => {
    const {dialog, calls} = makeCapture({readClipboardText: async () => "\n  第一行标题  \n正文"});
    await dialog.quickCaptureFromClipboard();
    assert.equal(calls.created?.title, "第一行标题");
    assert.equal(calls.created?.markdown, "第一行标题  \n正文");
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

// ---- 提示词场景包 ----

test("场景包：16 个条目全部可解析（ID/类型合法），清单与包名正确", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    assert.strictEqual(parsed.items.length, 16);
    assert.ok(parsed.items.every((i) => /^xlc-[0-9a-z]{10,40}$/.test(i.id)));
    assert.strictEqual(parsed.pack?.name, PROMPT_PACK_NAME);
    assert.ok((parsed.pack?.vars.length ?? 0) >= 5);
    assert.strictEqual(parsed.issues.length, 0);
});

test("场景包：覆盖三大场景且演示变量系统（ask 与 cursor）", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    const categories = new Set(parsed.items.map((i) => i.category));
    for (const c of ["客服", "提示词", "写作", "开发"]) assert.ok(categories.has(c), `缺少分类 ${c}`);
    const withVars = parsed.items.filter((i) => /\{\{xlc:ask:/.test(i.kramdown));
    const withCursor = parsed.items.filter((i) => i.kramdown.includes("{{xlc:cursor}}"));
    assert.ok(withVars.length >= 7);
    assert.ok(withCursor.length >= 4);
});

test("场景包：包含可直接改写的使用说明、地址与邮箱模板", () => {
    const parsed = parseMarkdownPack(PROMPT_PACK_MD);
    const byTitle = new Map(parsed.items.map((item) => [item.title, item]));
    const guide = byTitle.get("使用说明：三步开始");
    assert.ok(guide, "缺少使用说明条目");
    assert.match(guide.kramdown, /保存|调用|整理/);
    assert.match(guide.kramdown, /xlc:ask/);
    assert.ok(!guide.kramdown.includes("xlc-item"), "条目边界不应把下一条元数据带入使用说明");
    assert.strictEqual(variables.listAskFields(guide.kramdown).length, 0, "使用说明中的语法示例不应触发填写卡");
    assert.ok(parsed.items.some((item) => item.category === "地址" && /xlc:ask:收件人/.test(item.kramdown)));
    assert.ok(parsed.items.some((item) => item.category === "邮箱" && /xlc:ask:邮箱/.test(item.kramdown)));
    assert.ok(parsed.items.some((item) => item.category === "联系方式"));
});
