// 思源 3.8.8+ 官方插件核心生命周期契约与编辑器安全插入测试
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {commands, omniSearch} = require("./.build/entry.cjs");

test("plugin.json 官方独立设置窗口声明契约：settingsWindow: true", () => {
    const manifestPath = path.resolve(__dirname, "..", "plugin.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.strictEqual(manifest.settingsWindow, true, "plugin.json 必须声明 settingsWindow: true 以通过 LoadSettingsWindowPetals 加载");
});

test("HostBridge.insertMarkdown：对齐 SiYuan #20566 隐藏/只读编辑器可见性防御", () => {
    const {HostBridge} = commands;
    const bridge = new HostBridge({});

    // 1. 编辑器脱离文档树 (isConnected = false) -> 必须拒绝插入
    const disconnectedEditor = {
        protyle: {
            wysiwyg: {
                element: {
                    isConnected: false,
                    closest: () => null,
                },
            },
        },
        insert: () => {},
    };
    const res1 = bridge.insertMarkdown("测试文本", {editor: disconnectedEditor, handle: null, docId: "doc-1"});
    assert.strictEqual(res1, false, "脱离 DOM 树的编辑器应拒绝插入");

    // 2. 编辑器被 .fn__none 或 [inert] 隐藏 -> 必须拒绝插入
    const hiddenEditor = {
        protyle: {
            wysiwyg: {
                element: {
                    isConnected: true,
                    closest: (selector) => {
                        if (selector.includes(".fn__none")) return {};
                        return null;
                    },
                },
            },
        },
        insert: () => {},
    };
    const res2 = bridge.insertMarkdown("测试文本", {editor: hiddenEditor, handle: null, docId: "doc-1"});
    assert.strictEqual(res2, false, "具有 .fn__none 隐藏类的编辑器应拒绝插入");
});

test("HostBridge.insertMarkdown：正常可见编辑器可顺利插入", () => {
    const {HostBridge} = commands;
    const bridge = new HostBridge({});
    let insertedContent = "";

    const visibleEditor = {
        protyle: {
            block: { rootID: "doc-1" },
            element: { isConnected: true, contains: () => true },
            wysiwyg: {
                element: {
                    isConnected: true,
                    closest: () => null,
                },
            },
            resolveTrackedRange: () => ({
                status: "resolved",
                range: { commonAncestorContainer: {} },
            }),
        },
        focus: () => {},
        insert: (md) => {
            insertedContent = md;
        },
    };

    const prevWindow = global.window;
    global.window = {
        getSelection: () => ({
            removeAllRanges: () => {},
            addRange: () => {},
        }),
    };

    try {
        const res = bridge.insertMarkdown("正常正文", {
            editor: visibleEditor,
            handle: {},
            docId: "doc-1",
        });
        assert.strictEqual(res, true, "正常可见编辑器应成功插入");
        assert.strictEqual(insertedContent, "正常正文");
    } finally {
        global.window = prevWindow;
    }
});

test("omniSearch 全库块检索参数：恪守官方内核原生相关度降序 (orderBy: 7)", async () => {
    let capturedPayload = null;
    const mockKernel = {
        request: async (endpoint, payload) => {
            if (endpoint === "fullTextSearchBlock") {
                capturedPayload = payload;
                return { blocks: [] };
            }
            return null;
        },
    };

    await omniSearch.searchAllNotesBlocks(mockKernel, "财务 预算");
    assert.ok(capturedPayload, "应发起 fullTextSearchBlock 请求");
    assert.strictEqual(capturedPayload.method, 0, "零 SQL 纯关键词检索");
    assert.strictEqual(capturedPayload.orderBy, 7, "必须为相关度降序 7 (对齐 SiYuan kernel/model/search.go)");
});
