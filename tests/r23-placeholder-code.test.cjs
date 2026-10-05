// R23：占位符 × code 条目交叉——代码块中的 {{xlc:…}} 是字面文本，插入/复制绝不能被改写。
const test = require("node:test");
const assert = require("node:assert");
const {commands, placeholders} = {
    commands: require("./.build/entry.cjs").commands,
    placeholders: require("./.build/entry.cjs").placeholders,
};

const NOW = new Date(2026, 9, 6, 14, 5);

function makeItem(itemType) {
    return {
        id: "xlc-code000001", blockId: "20240101120000-abcdefg", libraryDocId: "20240101120001-hijklmn",
        itemType, title: "模板演示", alias: "", tags: [], category: "", summary: "",
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    };
}

function makeKernel(kramdown) {
    return {
        request(endpoint, payload = {}) {
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: payload.id, kramdown});
            if (endpoint === "checkBlocksExist") return Promise.resolve({});
            return Promise.resolve(null);
        },
    };
}

function makeExecutor(host, itemKramdown) {
    const {LibraryService} = require("./.build/entry.cjs").library;
    const library = new LibraryService(makeKernel(itemKramdown));
    library.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    return new commands.ActionExecutor(library, host, () => {}, undefined, {
        enabled: () => true,
        now: () => NOW,
        currentDoc: async () => ({title: "当前文档", path: "/小驴/当前文档"}),
    });
}

const CODE_DEMO = "```text\n今天是 {{xlc:date}}，模板写作：{{xlc:datetime}}\n```";

test("门禁：code 条目插入时占位符保持字面（不进代码改写）", async () => {
    const inserted = [];
    const executor = makeExecutor({
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: (md) => {
            inserted.push(md);
            return true;
        },
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => null,
    }, CODE_DEMO);
    await executor.run(makeItem("code"), "insert");
    assert.equal(inserted[0], CODE_DEMO, "code content must stay literal");
});

test("对照组：markdown 条目同样内容正常替换", async () => {
    const inserted = [];
    const executor = makeExecutor({
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: (md) => {
            inserted.push(md);
            return true;
        },
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => null,
    }, "今天是 {{xlc:date}}");
    await executor.run(makeItem("markdown"), "insert");
    assert.equal(inserted[0], "今天是 2026-10-06");
});

test("code 复制同样保持字面", async () => {
    const clipboard = [];
    const executor = makeExecutor({
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: () => true,
        writeClipboard: async (t) => {
            clipboard.push(t);
            return true;
        },
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => null,
    }, CODE_DEMO);
    await executor.run(makeItem("code"), "copy");
    // 复制载荷 = 剥围栏裸代码；字面保持不变即为目标
    assert.equal(clipboard[0], "今天是 {{xlc:date}}，模板写作：{{xlc:datetime}}");
});
