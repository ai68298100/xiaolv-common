// R21：导入覆盖策略修复回归——overwrite 必须「更新既有块」，绝不允许同逻辑 ID 双块；createItem 对已存在逻辑 ID 防御性拒绝。
const test = require("node:test");
const assert = require("node:assert");
const {library: libModule} = require("./.build/entry.cjs");
const {validateImport} = require("./.build/entry.cjs").transfer;

const DOC = "20240101120001-hijklmn";
const B_OLD = "20240101120000-aaaaaaa";

function makeKernel() {
    const calls = [];
    return {
        calls,
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            switch (endpoint) {
                case "getChildBlocks":
                    return Promise.resolve([{id: B_OLD, type: "p"}]);
                case "batchGetBlockAttrs": {
                    const overwritten = calls.some((c) => c.endpoint === "updateBlock");
                    const out = {};
                    for (const id of payload.ids ?? []) {
                        out[id] = overwritten
                            ? {"custom-xlc-id": "xlc-dup0000001", "custom-xlc-title": "覆盖后标题"}
                            : {"custom-xlc-id": "xlc-dup0000001", "custom-xlc-title": "原标题"};
                    }
                    return Promise.resolve(out);
                }
                case "getBlockAttrs": {
                    const overwritten = calls.some((c) => c.endpoint === "updateBlock");
                    return Promise.resolve(overwritten
                        ? {"custom-xlc-id": "xlc-dup0000001", "custom-xlc-title": "覆盖后标题"}
                        : {"custom-xlc-id": "xlc-dup0000001", "custom-xlc-title": "原标题"});
                }
                default:
                    return Promise.resolve(null);
            }
        },
    };
}

function makeService(kernel) {
    const service = new libModule.LibraryService(kernel);
    service.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    return service;
}

test("门禁：同逻辑 ID 二次 createItem 被防御性拒绝（conflict），不再静默双块", async () => {
    const kernel = makeKernel();
    const service = makeService(kernel);
    await service.ensureIndex();
    const again = await service.createItem({itemType: "text", markdown: "dup", logicalId: "xlc-dup0000001"});
    assert.equal(again.ok, false);
    assert.equal(again.reason, "conflict");
    assert.ok(!kernel.calls.some((c) => c.endpoint === "appendBlock"), "must not append when logical id already exists");
});

test("修复回归：overwrite 导入经 importer 走 updateBlock 更新既有块（不 appendBlock）", async () => {
    const bundle = {
        protocol: "xiaolv-common", schemaVersion: 1, exportedAt: 1,
        items: [{id: "xlc-dup0000001", itemType: "text", title: "覆盖后标题", kramdown: "覆盖后的正文"}],
    };
    const validation = validateImport(JSON.stringify(bundle));
    assert.ok(validation.ok);
    const {importBundle} = require("./.build/entry.cjs").importer;
    const kernel = makeKernel();
    const service = makeService(kernel);
    await service.ensureIndex();
    // 真实 overwrite 路径（index.importBundleText 的核心循环已抽至 importer.importBundle）
    const receipt = await importBundle(service, validation.parsed, "overwrite");
    assert.equal(receipt.overwritten, 1);
    assert.equal(receipt.failed, 0);
    assert.ok(kernel.calls.some((c) => c.endpoint === "updateBlock"), "must update in place");
    assert.ok(!kernel.calls.some((c) => c.endpoint === "appendBlock"), "must NOT append a duplicate block");
    // 覆盖后索引仍只有一个该 ID 条目
    const idx = await service.reindex();
    assert.equal(idx.entries.filter((e) => e.id === "xlc-dup0000001").length, 1);
});

test("导入冲突：同批两个新 ID 均按一次快照判定为 new", async () => {
    const calls = [];
    const blocks = new Map();
    let sequence = 0;
    const kernel = {
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            if (endpoint === "getChildBlocks") {
                return Promise.resolve(Array.from(blocks.keys()).map((id) => ({id, type: "p"})));
            }
            if (endpoint === "batchGetBlockAttrs") {
                return Promise.resolve(Object.fromEntries((payload.ids ?? []).map((id) => [id, blocks.get(id) ?? {}])));
            }
            if (endpoint === "appendBlock") {
                sequence++;
                const blockId = `202401011200${String(sequence).padStart(2, "0")}-newbbbb`;
                blocks.set(blockId, {});
                return Promise.resolve([{doOperations: [{id: blockId}]}]);
            }
            if (endpoint === "setBlockAttrs") {
                blocks.set(payload.id, {...(blocks.get(payload.id) ?? {}), ...payload.attrs});
                return Promise.resolve(null);
            }
            if (endpoint === "getBlockAttrs") return Promise.resolve(blocks.get(payload.id) ?? {});
            if (endpoint === "getBlockKramdown") return Promise.resolve({kramdown: "正文"});
            return Promise.resolve(null);
        },
    };
    const library = makeService(kernel);
    const {importBundle} = require("./.build/entry.cjs").importer;
    const parsed = {
        schemaVersion: 1,
        unknownTopFields: [],
        items: [
            {id: "xlc-batchnew001", itemType: "text", title: "一", alias: "", tags: [], category: "", kramdown: "一", source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"}, url: "", targetBlockId: "", createdAt: 0, updatedAt: 0},
            {id: "xlc-batchnew002", itemType: "text", title: "二", alias: "", tags: [], category: "", kramdown: "二", source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"}, url: "", targetBlockId: "", createdAt: 0, updatedAt: 0},
        ],
    };
    const receipt = await importBundle(library, parsed, "skip");
    assert.equal(receipt.created, 2);
    assert.equal(receipt.failed, 0);
    assert.equal(calls.filter((call) => call.endpoint === "appendBlock").length, 2);
});
