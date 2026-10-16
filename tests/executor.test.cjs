// 执行层测试：桌面插入 / 无编辑器复制降级 / 移动端诚实降级 / 复制失败 / 打开来源回执。
const test = require("node:test");
const assert = require("node:assert");
const { ActionExecutor } = require("./.build/entry.cjs").commands;
const { LibraryService } = require("./.build/entry.cjs").library;

const DOC = "20240101120001-hijklmn";
const BLOCK = "20240101120000-abcdefg";

function makeItem(overrides = {}) {
    return {
        id: "xlc-exec01", blockId: BLOCK, libraryDocId: DOC, itemType: "text",
        title: "执行条目", alias: "", tags: [], category: "", summary: "",
        source: {sourceDocId: DOC, sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
        ...overrides,
    };
}

function makeKernel() {
    return {
        request(endpoint, payload = {}) {
            switch (endpoint) {
                case "getBlockKramdown":
                    return Promise.resolve({id: payload.id, kramdown: "正文内容"});
                case "checkBlocksExist":
                    return Promise.resolve({[DOC]: true, [BLOCK]: true});
                case "getFile":
                    return Promise.resolve(null);
                default:
                    return Promise.resolve(null);
            }
        },
    };
}

function makeHost(overrides = {}) {
    return {
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: () => true,
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => DOC,
        ...overrides,
    };
}

function makeExecutor(host, onUsed) {
    const library = new LibraryService(makeKernel());
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    return new ActionExecutor(library, host, () => {}, onUsed);
}

test("桌面插入：成功并发出使用记录", async () => {
    let used = null;
    const executor = makeExecutor(makeHost(), (item) => {
        used = item.id;
    });
    const receipt = await executor.run(makeItem(), "insert");
    assert.equal(receipt.ok, true);
    assert.equal(receipt.message, "inserted");
    assert.equal(used, "xlc-exec01");
});

test("无活动编辑器：降级为复制且回执明示（不假装插入成功）", async () => {
    const clipboard = [];
    const executor = makeExecutor(makeHost({hasActiveEditor: () => false, writeClipboard: async (t) => {
        clipboard.push(t);
        return true;
    }}));
    const receipt = await executor.run(makeItem(), "insert");
    assert.equal(receipt.ok, true);
    assert.equal(receipt.downgraded, true);
    assert.equal(receipt.message, "no-editor-copied");
    assert.deepEqual(clipboard, ["正文内容"]);
});

test("无活动编辑器：剪贴板拒绝写入时失败回执为 ok=false", async () => {
    const executor = makeExecutor(makeHost({hasActiveEditor: () => false, writeClipboard: async () => false}));
    const receipt = await executor.run(makeItem(), "insert");
    assert.equal(receipt.ok, false);
    assert.equal(receipt.downgraded, true);
    assert.equal(receipt.message, "no-editor-copy-failed");
});

test("弹窗打开时的插入位置失效：复制降级并给出专属回执", async () => {
    const clipboard = [];
    const target = {editor: {}, handle: {id: "tracked"}, docId: DOC};
    const executor = makeExecutor(makeHost({
        canInsertAtTarget: () => false,
        writeClipboard: async (text) => { clipboard.push(text); return true; },
    }));
    const receipt = await executor.run(makeItem(), "insert", {editorTarget: target});
    assert.equal(receipt.ok, true);
    assert.equal(receipt.downgraded, true);
    assert.equal(receipt.message, "target-unavailable-copied");
    assert.deepEqual(clipboard, ["正文内容"]);
});

test("弹窗打开时的插入位置有效：使用快照目标而非重新读取活动编辑器", async () => {
    const target = {editor: {}, handle: {id: "tracked"}, docId: DOC};
    let insertedTarget = null;
    const executor = makeExecutor(makeHost({
        hasActiveEditor: () => false,
        canInsertAtTarget: (actual) => actual === target,
        insertMarkdown: (_text, actual) => { insertedTarget = actual; return true; },
    }));
    const receipt = await executor.run(makeItem(), "insert", {editorTarget: target});
    assert.equal(receipt.ok, true);
    assert.equal(receipt.message, "inserted");
    assert.equal(insertedTarget, target);
});

test("门禁：移动端插入未验证 → 诚实降级为复制并标注 pendingVerification", async () => {
    const executor = makeExecutor(makeHost({isMobile: () => true}));
    const receipt = await executor.run(makeItem(), "insert");
    assert.equal(receipt.downgraded, true);
    assert.ok(receipt.pendingVerification.includes("mobile-insert-unverified"));
});

test("移动端块引用和嵌入动作也降级为复制，不绕过未验证限制", async () => {
    const copied = [];
    const executor = makeExecutor(makeHost({
        isMobile: () => true,
        writeClipboard: async (text) => { copied.push(text); return true; },
    }));
    const blockRef = makeItem({itemType: "blockref", targetBlockId: BLOCK});
    for (const mode of ["insert-ref", "insert-embed"]) {
        const receipt = await executor.run(blockRef, mode);
        assert.equal(receipt.ok, true);
        assert.equal(receipt.downgraded, true);
        assert.ok(receipt.pendingVerification.includes("mobile-insert-unverified"));
    }
    assert.equal(copied.length, 2);
});

test("移动端降级复制失败：回执仍为失败，不把待验证提示当成成功", async () => {
    const executor = makeExecutor(makeHost({
        isMobile: () => true,
        writeClipboard: async () => false,
    }));
    const receipt = await executor.run(makeItem(), "insert");
    assert.equal(receipt.ok, false);
    assert.equal(receipt.downgraded, true);
    assert.equal(receipt.message, "copy-failed");
    assert.ok(receipt.pendingVerification.includes("mobile-insert-unverified"));
});

test("连续共享目标：第三次目标失效时只复制，不重复写入编辑器", async () => {
    const target = {editor: {}, handle: {id: "tracked"}, docId: DOC};
    const inserted = [];
    const copied = [];
    let insertCount = 0;
    const host = makeHost({
        hasActiveEditor: () => false,
        canInsertAtTarget: () => insertCount < 2,
        insertMarkdown: (text, actual) => {
            assert.equal(actual, target);
            inserted.push(text);
            insertCount += 1;
            return true;
        },
        writeClipboard: async (text) => {
            copied.push(text);
            return true;
        },
    });
    const executor = makeExecutor(host);
    const item = makeItem({
        itemType: "blockref",
        targetBlockId: BLOCK,
        source: {sourceDocId: DOC, sourceBlockId: BLOCK, sourceType: "block"},
    });

    const first = await executor.run(item, "insert-ref", {editorTarget: target});
    const second = await executor.run(item, "insert-embed", {editorTarget: target});
    const third = await executor.run(item, "insert-content", {editorTarget: target});

    assert.equal(first.message, "inserted");
    assert.equal(second.message, "inserted");
    assert.equal(third.ok, true);
    assert.equal(third.downgraded, true);
    assert.equal(third.message, "target-unavailable-copied");
    assert.equal(inserted.length, 2);
    assert.equal(copied.length, 1);
    assert.equal(copied[0], "正文内容");
});

test("共享目标任一失效状态：不调用插入，只走复制降级", async () => {
    const states = ["root-changed", "disabled", "disconnected", "range-invalid"];
    for (const state of states) {
        const target = {
            editor: {
                rootID: state === "root-changed" ? "20240101120002-zzzzzzz" : DOC,
                disabled: state === "disabled",
                connected: state !== "disconnected",
            },
            handle: {id: state === "range-invalid" ? "invalid" : "tracked"},
            docId: DOC,
        };
        let insertCalls = 0;
        let copyCalls = 0;
        const executor = makeExecutor(makeHost({
            hasActiveEditor: () => false,
            canInsertAtTarget: (actual) => actual.editor.rootID === DOC
                && !actual.editor.disabled
                && actual.editor.connected
                && actual.handle.id === "tracked",
            insertMarkdown: () => {
                insertCalls += 1;
                return true;
            },
            writeClipboard: async () => {
                copyCalls += 1;
                return true;
            },
        }));
        const receipt = await executor.run(makeItem(), "insert", {editorTarget: target});
        assert.equal(receipt.ok, true, state);
        assert.equal(receipt.downgraded, true, state);
        assert.equal(receipt.message, "target-unavailable-copied", state);
        assert.equal(insertCalls, 0, state);
        assert.equal(copyCalls, 1, state);
    }
});

test("门禁：复制失败时回执 ok=false（不伪造成功）", async () => {
    const executor = makeExecutor(makeHost({writeClipboard: async () => false}));
    const receipt = await executor.run(makeItem(), "copy");
    assert.equal(receipt.ok, false);
    assert.equal(receipt.message, "copy-failed");
});

test("插入失败（宿主拒绝）回执 ok=false", async () => {
    const executor = makeExecutor(makeHost({insertMarkdown: () => false}));
    const receipt = await executor.run(makeItem(), "insert");
    assert.equal(receipt.ok, false);
    assert.equal(receipt.message, "insert-failed");
});

test("openSource：来源块失效 → source-missing 诚实失败", async () => {
    const library = new LibraryService({
        request(endpoint) {
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: BLOCK, kramdown: "x"});
            if (endpoint === "checkBlocksExist") return Promise.resolve({[DOC]: true, [BLOCK]: false});
            return Promise.resolve(null);
        },
    });
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const executor = new ActionExecutor(library, makeHost(), () => {});
    const receipt = await executor.openSource(makeItem({
        source: {sourceDocId: DOC, sourceBlockId: BLOCK, sourceType: "block"},
    }));
    assert.equal(receipt.ok, false);
    assert.equal(receipt.message, "source-missing");
});

test("openSource：URL 条目走外链且仅允许 http/https", async () => {
    let opened = "";
    const executor = makeExecutor(makeHost({openExternal: (url) => {
        opened = url;
        return true;
    }}));
    const okReceipt = await executor.openSource(makeItem({itemType: "url", url: "https://example.com"}));
    assert.equal(okReceipt.ok, true);
    assert.equal(opened, "https://example.com");
    const bad = await executor.openSource(makeItem({itemType: "url", url: "javascript:alert(1)"}));
    assert.equal(bad.ok, false);
});

test("openSource：外链宿主拒绝时保持失败回执（不伪造打开成功）", async () => {
    const executor = makeExecutor(makeHost({openExternal: () => false}));
    const receipt = await executor.openSource(makeItem({itemType: "url", url: "https://example.com"}));
    assert.equal(receipt.ok, false);
    assert.equal(receipt.message, "open-failed");
});

test("openSource：来源文档失效即失败，即使条目仍在库文档中", async () => {
    const library = new LibraryService({
        request(endpoint) {
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: BLOCK, kramdown: "x"});
            if (endpoint === "checkBlocksExist") return Promise.resolve({[DOC]: false});
            return Promise.resolve(null);
        },
    });
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const executor = new ActionExecutor(library, makeHost(), () => {});
    const receipt = await executor.openSource(makeItem({
        source: {sourceDocId: DOC, sourceBlockId: "", sourceType: "doc-fragment"},
    }));
    assert.equal(receipt.ok, false);
    assert.equal(receipt.message, "source-missing");
});

test("内核内容获取失败 → 明确失败（不用缓存摘要冒充正文）", async () => {
    const library = new LibraryService({
        request: () => Promise.reject(new Error("kernel down")),
    });
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const executor = new ActionExecutor(library, makeHost(), () => {});
    const receipt = await executor.run(makeItem(), "insert");
    assert.equal(receipt.ok, false);
    assert.match(receipt.message, /kernel-error/);
});
