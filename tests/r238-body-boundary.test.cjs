// Offline production-service contracts. These do not execute SiYuan's Markdown parser.
const test = require("node:test");
const assert = require("node:assert/strict");
const {library: {LibraryService}, importer} = require("./.build/entry.cjs");
const DOC = "20240101120001-hijklmn";
const HEAD = "20240101120002-bbbbbbb";
const TAIL = "20240101120003-ccccccc";
const OTHER = "20240101120004-ddddddd";
const ID = "xlc-boundary00001";

function harness(overrides = {}) {
    const calls = [];
    const attrs = {"custom-xlc-id": ID, "custom-xlc-type": "text"};
    const handlers = {
        getChildBlocks: () => [{id: HEAD, type: "p"}],
        getBlockAttrs: () => attrs,
        batchGetBlockAttrs: () => ({[HEAD]: attrs}),
        getBlockKramdown: ({id}) => ({id, kramdown: "原文"}),
        appendBlock: ({parentID}) => [{doOperations: [{id: TAIL, action: "insert", parentID}]}],
        setBlockAttrs: () => null,
        updateBlock: () => null,
        deleteBlock: () => null,
        ...overrides,
    };
    const service = new LibraryService({async request(endpoint, payload) {
        calls.push({endpoint, payload});
        if (!handlers[endpoint]) throw new Error(`unexpected endpoint ${endpoint}`);
        return handlers[endpoint](payload);
    }});
    service.setConfig({configVersion: 1, mode: "doc", containerDocIds: [DOC], notebookIds: [], createdDocIds: [], configuredAt: 1});
    return {service, calls, attrs};
}
const writes = (calls) => calls.filter(({endpoint}) => ["appendBlock", "setBlockAttrs", "updateBlock", "deleteBlock"].includes(endpoint));

test("B-006: create and single-anchor update reject unsupported bodies before any kernel write", async () => {
    const unsupported = ["甲\n\n乙", "# 标题\n正文", "- 一\n- 二", "甲\r乙", "甲\u2028乙", "{: id=\"20240101120004-ddddddd\"}", "{{{row", "```js\nx\n```\n尾段", "```js\nx", "```js\nx\n```\n```js\ny\n```", "    ```js\nx\n```", "x".repeat(100001)];
    for (const markdown of unsupported) {
        const {service, calls} = harness();
        const created = await service.createItem({itemType: "markdown", markdown});
        assert.equal(created.ok, false, markdown.slice(0, 30));
        assert.equal(calls.length, 0, "create must reject before a kernel request");
        const updated = await service.updateItem(ID, {markdown, title: "不应写入"});
        assert.equal(updated.ok, false);
        assert.equal(writes(calls).length, 0);
    }
});

test("B-006: single-line templates and complete code fences remain writable", async () => {
    for (const markdown of ["demo@example.com", "收件人：{{xlc:ask:姓名}} / 地址：{{xlc:ask:地址}}", "```json\n{\n  \"ok\": true\n}\n```", "~~~~txt\r\n```\r\n\r\n~~~~"]) {
        const {service, calls} = harness();
        const result = await service.createItem({itemType: "text", markdown});
        assert.equal(result.ok, true, result.message);
        assert.equal(calls.find(({endpoint}) => endpoint === "appendBlock").payload.data, markdown);
    }
});

test("B-006: append setAttrs operations never become owned or deleted parts", async () => {
    const {service, calls} = harness({
        appendBlock: ({parentID}) => [{doOperations: [
            {id: TAIL, action: "insert", parentID},
            {id: OTHER, action: "setAttrs"},
        ]}],
        setBlockAttrs: () => { throw new Error("permission denied"); },
    });
    const result = await service.createItem({itemType: "text", markdown: "单行"});
    assert.equal(result.ok, false);
    assert.deepEqual(calls.filter(({endpoint}) => endpoint === "deleteBlock").map(({payload}) => payload.id), [TAIL]);
});

test("B-006: unverified append actions and wrong parents never trigger attribute writes or deletion", async () => {
    for (const operation of [{id: OTHER}, {id: OTHER, action: "delete", parentID: DOC}, {id: OTHER, action: "insert", parentID: OTHER}]) {
        const {service, calls} = harness({appendBlock: () => [{doOperations: [operation]}]});
        const result = await service.createItem({itemType: "text", markdown: "单行"});
        assert.equal(result.ok, false);
        assert.match(result.message, /inspect library document/);
        assert.equal(writes(calls).length, 1, "only the already-issued append is allowed");
    }
});

test("B-006: parts outside the anchor document or overlapping another item are rejected before reading tail bodies", async () => {
    for (const state of ["outside", "reordered", "gap", "owned", "missing-attrs"]) {
        const attrs = {"custom-xlc-id": ID, "custom-xlc-parts": `${HEAD},${TAIL}`};
        const {service, calls} = harness({
            getChildBlocks: () => (state === "outside" ? [HEAD] : state === "reordered" ? [TAIL, HEAD] : state === "gap" ? [HEAD, OTHER, TAIL] : [HEAD, TAIL]).map((id) => ({id, type: "p"})),
            batchGetBlockAttrs: () => ({[HEAD]: attrs, ...(state === "missing-attrs" ? {} : {[TAIL]: state === "owned" ? {"custom-xlc-id": "xlc-another00001"} : {}})}),
        });
        const item = {id: ID, blockId: HEAD, libraryDocId: DOC, partBlockIds: [HEAD, TAIL]};
        const result = await service.getStoredItemKramdown(item);
        assert.equal(result.ok, false, state);
        assert.equal(calls.some(({endpoint}) => endpoint === "getBlockKramdown"), false, state);
    }
});

test("B-006: overwrite import rejects unsupported incoming or unrestorable backup before deletion", async () => {
    const incoming = {id: ID, itemType: "code", kramdown: "```js\nx\n```", title: "", alias: "", category: "", tags: [], source: {}};
    for (const state of ["incoming", "backup"]) {
        const {service, calls} = harness({getBlockKramdown: ({id}) => ({id, kramdown: state === "backup" ? "旧首段\n\n旧尾段" : "旧单行"})});
        const result = await importer.applyOverwriteImport(service, {...incoming, ...(state === "incoming" ? {kramdown: "新首段\n\n新尾段"} : {})}, ID);
        assert.equal(result, false);
        assert.equal(writes(calls).length, 0, state);
    }
});

test("B-006: cached single anchors moved out of the indexed document cannot be read, updated, or deleted", async () => {
    let moved = false;
    const {service, calls} = harness({getChildBlocks: () => moved ? [] : [{id: HEAD, type: "p"}]});
    const item = (await service.ensureIndex()).items.get(ID);
    moved = true;
    const read = await service.getStoredItemKramdown(item);
    const update = await service.updateItem(ID, {title: "不应改库外块"});
    const remove = await service.removeItem(ID);
    assert.equal(read.ok, false);
    assert.equal(update.ok, false);
    assert.equal(remove.ok, false);
    assert.equal(writes(calls).length, 0);
});

test("B-006: body editing requires a readable and restorable old body before writing metadata", async () => {
    for (const kramdown of [undefined, "旧首段\n\n旧尾段", "x".repeat(100001)]) {
        const {service, calls} = harness({getBlockKramdown: ({id}) => ({id, kramdown})});
        const result = await service.updateItem(ID, {title: "新元数据", markdown: "新单行"});
        assert.equal(result.ok, false);
        assert.match(result.message, /safely restored/);
        assert.equal(writes(calls).length, 0);
    }
});

test("B-006: import receipt names the body restriction and leaves skip policy unchanged", async () => {
    const item = {id: ID, itemType: "text", kramdown: "多段\n\n正文", title: "多段", tags: [], source: {}};
    const {service, calls} = harness();
    const rejected = await importer.importBundle(service, {items: [item]}, "overwrite");
    assert.equal(rejected.failed, 1);
    assert.match(rejected.lines[0].error, /B-006/);
    assert.equal(writes(calls).length, 0);
    const skipped = await importer.importBundle(service, {items: [item]}, "skip");
    assert.equal(skipped.skipped, 1);
    assert.equal(skipped.failed, 0);
});
