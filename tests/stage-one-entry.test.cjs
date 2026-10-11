// T-0032 Stage 1: capture entry preconditions, host failures, and user-facing action semantics.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {CaptureDialog} = require("./.build/entry.cjs").capture;

function makeCapture(overrides = {}) {
    const calls = {selection: 0, currentDoc: 0, clipboard: 0, block: 0, export: 0, configured: 0, setup: 0, notified: [], forms: []};
    const deps = {
        t: (key, ...args) => {
            const messages = {
                captureBusy: "正在读取内容，请稍候",
                captureSelectionEmpty: "当前没有选中内容，请先选中文本；如需保存当前块，请使用“保存当前块”",
                captureBlockNone: "光标不在块内，无法定位当前块",
                captureBlockFailed: "读取当前块内容失败，请重试",
                captureDocEmpty: "当前文档没有可保存内容",
                captureDocFailed: "读取文档内容失败，请重试",
                relinkNoDoc: "当前没有活动文档，无法指定来源",
                kernelError: "思源接口调用失败：%s",
            };
            return (messages[key] ?? key).replace("%s", args[0] ?? "");
        },
        getSelectionText: () => { calls.selection++; return {text: "", blockId: null}; },
        currentDocId: () => { calls.currentDoc++; return "20240101120001-hijklmn"; },
        readClipboardText: async () => { calls.clipboard++; return "clipboard"; },
        createItem: async () => ({ok: true, message: "ok"}),
        notify: (kind, message) => calls.notified.push({kind, message}),
        getBlockKramdown: async () => { calls.block++; return null; },
        exportDocContent: async () => { calls.export++; return null; },
        aiEnabled: () => false,
        aiTidy: async () => ({ok: false, message: "disabled"}),
        aiDraft: async () => ({ok: false, message: "disabled"}),
        findDuplicate: async () => null,
        isConfigured: () => { calls.configured++; return true; },
        onNotConfigured: () => { calls.setup++; },
        ...overrides,
    };
    const dialog = new CaptureDialog(deps);
    dialog.openForm = (...args) => calls.forms.push(args);
    return {dialog, calls};
}

test("未配置内容库时，捕获入口打开设置且不读取选区、剪贴板、块或文档", async () => {
    const {dialog, calls} = makeCapture({isConfigured: () => false});
    await dialog.saveSelection();
    await dialog.captureFromClipboard();
    await dialog.quickCaptureFromClipboard();
    await dialog.captureCurrentBlock();
    await dialog.captureCurrentDoc();

    assert.equal(calls.setup, 5);
    assert.equal(calls.selection, 0);
    assert.equal(calls.clipboard, 0);
    assert.equal(calls.block, 0);
    assert.equal(calls.export, 0);
    assert.equal(calls.forms.length, 0);
});

test("空选区给出选区专属提示，不静默改为读取剪贴板", async () => {
    const {dialog, calls} = makeCapture();
    await dialog.saveSelection();

    assert.equal(calls.clipboard, 0);
    assert.equal(calls.forms.length, 0);
    assert.ok(calls.notified.some((n) => n.message.includes("当前没有选中内容")));
});

test("保存当前块：无块位置和读取失败均有失败回执", async () => {
    const missing = makeCapture();
    await missing.dialog.captureCurrentBlock();
    assert.ok(missing.calls.notified.some((n) => n.message.includes("光标不在块内")));

    const failed = makeCapture({
        getSelectionText: () => ({text: "", blockId: "20240101120000-abcdefg"}),
        getBlockKramdown: async () => { throw new Error("kernel down"); },
    });
    await failed.dialog.captureCurrentBlock();
    assert.ok(failed.calls.notified.some((n) => n.kind === "error" && n.message.includes("kernel down")));
    assert.equal(failed.calls.forms.length, 0);
});

test("保存整篇文档：无活动文档、读取失败和空文档都不打开空表单", async () => {
    const noDoc = makeCapture({currentDocId: () => null});
    await noDoc.dialog.captureCurrentDoc();
    assert.ok(noDoc.calls.notified.some((n) => n.message.includes("当前没有活动文档")));
    assert.equal(noDoc.calls.export, 0);
    assert.equal(noDoc.calls.forms.length, 0);

    const failed = makeCapture({exportDocContent: async () => { throw new Error("export failed"); }});
    await failed.dialog.captureCurrentDoc();
    assert.ok(failed.calls.notified.some((n) => n.kind === "error" && n.message.includes("export failed")));
    assert.equal(failed.calls.forms.length, 0);

    const empty = makeCapture({exportDocContent: async () => ({hPath: "根/空白文档", content: " \n "})});
    await empty.dialog.captureCurrentDoc();
    assert.ok(empty.calls.notified.some((n) => n.message.includes("没有可保存内容")));
    assert.equal(empty.calls.forms.length, 0);
});

test("同一读取入口忙碌时拒绝重入并给出反馈", async () => {
    let resolveRead;
    let readCount = 0;
    const {dialog, calls} = makeCapture({
        getSelectionText: () => ({text: "", blockId: "20240101120000-abcdefg"}),
        getBlockKramdown: () => {
            readCount++;
            return new Promise((resolve) => { resolveRead = resolve; });
        },
    });
    const first = dialog.captureCurrentBlock();
    await Promise.resolve();
    const second = dialog.captureCurrentBlock();
    await second;
    assert.equal(readCount, 1);
    assert.ok(calls.notified.some((n) => n.message.includes("正在读取内容")));
    resolveRead("块内容");
    await first;
    assert.equal(calls.forms.length, 1);
});

test("阶段一动作文案区分保存选中内容、当前块和整篇文档，不把整篇保存称为发现", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    assert.equal(zh.saveSelection, "保存选中内容");
    assert.equal(zh.captureBlock, "保存当前块");
    assert.equal(zh.captureDoc, "保存整篇文档为条目");
    assert.doesNotMatch(zh.captureDoc, /发现/);
    assert.match(zh.captureSelectionEmpty, /保存当前块/);

    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));
    assert.equal(en.saveSelection, "Save selected content");
    assert.equal(en.captureBlock, "Save current block");
    assert.equal(en.captureDoc, "Save entire document as item");
});
