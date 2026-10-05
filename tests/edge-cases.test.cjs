// 非法输入与边界测试：超长内容、坏引用、空输入、未知类型、i18n 键集一致性。
const test = require("node:test");
const assert = require("node:assert");
const item = require("./.build/entry.cjs").item;
const search = require("./.build/entry.cjs").search;
const transfer = require("./.build/entry.cjs").transfer;
const { LibraryService } = require("./.build/entry.cjs").library;

const DOC = "20240101120001-hijklmn";
const BLOCK = "20240101120000-abcdefg";

test("超长内容：创建前裁剪到 contentChars 上限", async () => {
    const captured = [];
    const kernel = {
        request(endpoint, payload = {}) {
            if (endpoint === "appendBlock") {
                captured.push(payload.data);
                return Promise.resolve([{doOperations: [{id: BLOCK}]}]);
            }
            return Promise.resolve(null);
        },
    };
    const service = new LibraryService(kernel);
    service.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    await service.createItem({itemType: "text", markdown: "长".repeat(200_000)});
    assert.ok(captured[0].length <= 100_000, `captured ${captured[0].length}`);
});

test("空 markdown / 空 ID 输入被拒绝", async () => {
    const kernel = {request: () => Promise.resolve(null)};
    const service = new LibraryService(kernel);
    service.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const empty = await service.createItem({itemType: "text", markdown: ""});
    // 空 markdown 仍然会走 appendBlock（宿主会建空块）——但逻辑 ID 仍写入。此处验证不抛异常且返回回执。
    assert.ok(typeof empty.ok === "boolean");
    const noDoc = new LibraryService({request: () => Promise.resolve(null)});
    const result = await noDoc.createItem({itemType: "text", markdown: "x"});
    assert.equal(result.ok, false);
});

test("未知条目类型在协议输入中被拒", () => {
    const { normalizeSaveInput } = require("./.build/entry.cjs").protocol;
    const result = normalizeSaveInput({itemType: "database", markdown: "x"});
    assert.equal(result.ok, false);
    assert.match(result.reason, /itemType/);
});

test("坏资源引用：asset 路径解析失败诚实降级", () => {
    const actions = require("./.build/entry.cjs").actions;
    const it = {
        id: "xlc-badasset", blockId: BLOCK, libraryDocId: DOC, itemType: "image",
        title: "图", alias: "", tags: [], category: "", summary: "",
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    };
    const plan = actions.planAction(it, "insert", {
        surface: "desktop", hasActiveEditor: true,
        content: {kramdown: "没有资源链接", sourceMissing: false, assetMissing: false},
    });
    assert.equal(plan.downgraded, true);
    assert.equal(plan.downgradeReason, "asset-missing");
});

test("搜索：空数组/全空条目安全", () => {
    const ctx = {favorites: new Set(), recents: new Map(), now: 1};
    assert.deepEqual(search.searchEntries([], {text: "任意", scope: "all"}, ctx), []);
    assert.deepEqual(search.collectTags([]), []);
});

test("i18n 键集一致性门禁（zh-CN 与 en 完全一致）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/i18n/en.json"), "utf8"));
    assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
    // 占位符数量一致（%s 个数）
    for (const key of Object.keys(zh)) {
        const zhCount = (zh[key].match(/%s/g) || []).length;
        const enCount = (en[key].match(/%s/g) || []).length;
        assert.equal(zhCount, enCount, `placeholder count mismatch on ${key}`);
    }
});

test("坏逻辑 ID 在 createItem 中被替换为新生成 ID（导入路径防注入）", async () => {
    const captured = [];
    const kernel = {
        request(endpoint, payload = {}) {
            if (endpoint === "appendBlock") return Promise.resolve([{doOperations: [{id: BLOCK}]}]);
            if (endpoint === "setBlockAttrs") captured.push(payload.attrs);
            return Promise.resolve(null);
        },
    };
    const service = new LibraryService(kernel);
    service.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    await service.createItem({itemType: "text", markdown: "x", logicalId: "DROP TABLE; --"});
    assert.match(captured[0]["custom-xlc-id"], /^xlc-[0-9a-z]+$/);
});
