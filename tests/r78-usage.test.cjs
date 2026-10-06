// R78：F3 使用计数口径——插入成功（含降级/无编辑器）与复制成功都计次；失败不计。
const test = require("node:test");
const assert = require("node:assert");
const {library: libSvc, commands} = require("./.build/entry.cjs");
const {LibraryService} = libSvc;
const {ActionExecutor} = commands;

const DOC = "20240101120001-hijklmn";
const BLOCK = "20240101120000-abcdefg";

function makeItem(itemType = "text") {
    return {
        id: "xlc-usage00001", blockId: BLOCK, libraryDocId: DOC, itemType,
        title: "计次条目", alias: "", tags: [], category: "", summary: "", varCount: 0,
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    };
}

function makeExecutor(host, usedLog) {
    const lib = new LibraryService({
        request(endpoint) {
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: BLOCK, kramdown: "正文内容"});
            if (endpoint === "checkBlocksExist") return Promise.resolve({[DOC]: true, [BLOCK]: true});
            return Promise.resolve(null);
        },
    });
    lib.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    return new ActionExecutor(lib, host, () => {}, (item) => usedLog.push(item.id));
}

const baseHost = {
    isMobile: () => false,
    hasActiveEditor: () => true,
    insertMarkdown: () => true,
    writeClipboard: async () => true,
    openDoc: () => true,
    openAsset: () => true,
    openExternal: () => true,
    currentDocId: () => DOC,
};

test("使用计数：插入成功 +1", async () => {
    const used = [];
    const executor = makeExecutor({...baseHost}, used);
    const r = await executor.run(makeItem(), "insert");
    assert.ok(r.ok);
    assert.deepStrictEqual(used, ["xlc-usage00001"]);
});

test("使用计数：复制成功 +1（F3 口径补全）", async () => {
    const used = [];
    const executor = makeExecutor({...baseHost}, used);
    const r = await executor.run(makeItem(), "copy");
    assert.ok(r.ok);
    assert.deepStrictEqual(used, ["xlc-usage00001"]);
});

test("使用计数：无编辑器降级复制成功 +1", async () => {
    const used = [];
    const host = {...baseHost, hasActiveEditor: () => false};
    const executor = makeExecutor(host, used);
    const r = await executor.run(makeItem(), "insert");
    assert.ok(r.ok && r.downgraded);
    assert.deepStrictEqual(used, ["xlc-usage00001"]);
});

test("使用计数：复制失败不计", async () => {
    const used = [];
    const host = {...baseHost, writeClipboard: async () => false};
    const executor = makeExecutor(host, used);
    const r = await executor.run(makeItem(), "copy");
    assert.strictEqual(r.ok, false);
    assert.deepStrictEqual(used, []);
});

test("使用计数：插入失败不计（无编辑器且复制失败 → ok=true 但 message=fail，计次为空）", async () => {
    const used = [];
    const host = {...baseHost, hasActiveEditor: () => false, writeClipboard: async () => false};
    const executor = makeExecutor(host, used);
    const r = await executor.run(makeItem(), "insert");
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.message, "no-editor-copy-failed");
    assert.deepStrictEqual(used, []);
});
