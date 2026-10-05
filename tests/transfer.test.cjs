// 导入导出测试：bundle 形状、导入校验门禁、冲突分类、往返恢复。
const test = require("node:test");
const assert = require("node:assert");
const transfer = require("./.build/entry.cjs").transfer;
const item = require("./.build/entry.cjs").item;

const DOC = "20240101120001-hijklmn";
const BLOCK = "20240101120000-abcdefg";

function makeItem(id, kramdown = "内容") {
    return {
        id, blockId: BLOCK, libraryDocId: DOC, itemType: "text",
        title: `标题${id}`, alias: "", tags: ["工作"], category: "",
        summary: "内容", source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 1, updatedAt: 2, droppedFields: [],
        kramdownForTest: kramdown,
    };
}

test("buildBundle：只含标量字段，不嵌函数回调（协议红线）", () => {
    const it = makeItem("xlc-export001");
    const bundle = transfer.buildBundle([it], new Map([["xlc-export001", "正文"]]), 12345);
    assert.equal(bundle.protocol, "xiaolv-common");
    assert.equal(bundle.schemaVersion, 1);
    assert.equal(bundle.items[0].kramdown, "正文");
    const json = JSON.stringify(bundle);
    assert.ok(!json.includes("function"), "bundle must not carry callbacks");
});

test("validateImport：坏 JSON / 协议不符 / 版本不符 / items 非数组 全部拒绝", () => {
    assert.equal(transfer.validateImport("{bad json").ok, false);
    assert.equal(transfer.validateImport(JSON.stringify({protocol: "other", schemaVersion: 1, items: []})).reason, "protocol-mismatch");
    assert.equal(transfer.validateImport(JSON.stringify({protocol: "xiaolv-common", schemaVersion: 2, items: []})).reason, "schema-version-unsupported");
    assert.equal(transfer.validateImport(JSON.stringify({protocol: "xiaolv-common", schemaVersion: 1, items: {}})).reason, "items-not-array");
});

test("validateImport：非法条目计入 issues，不阻断其余条目", () => {
    const bundle = {
        protocol: "xiaolv-common", schemaVersion: 1, exportedAt: 1,
        items: [
            {id: "xlc-good00001", itemType: "text", kramdown: "ok"},
            {id: "bad-id", itemType: "text", kramdown: "x"},
            null,
        ],
    };
    const result = transfer.validateImport(JSON.stringify(bundle));
    assert.ok(result.ok);
    assert.equal(result.parsed.items.length, 1);
    assert.equal(result.issues.length, 2);
});

test("门禁：未知顶层字段保留透传不阻断（前向兼容）", () => {
    const bundle = {protocol: "xiaolv-common", schemaVersion: 1, items: [], futureMeta: {a: 1}};
    const result = transfer.validateImport(JSON.stringify(bundle));
    assert.ok(result.ok);
    assert.deepEqual(result.parsed.unknownTopFields, ["futureMeta"]);
});

test("classifyConflict：new/skip/overwrite/rename", () => {
    const rand = () => 0.42;
    assert.equal(transfer.classifyConflict("xlc-new", false, "skip", rand).kind, "new");
    assert.equal(transfer.classifyConflict("xlc-dup", true, "skip", rand).kind, "skip");
    assert.equal(transfer.classifyConflict("xlc-dup", true, "overwrite", rand).kind, "overwrite");
    const rename = transfer.classifyConflict("xlc-dup", true, "rename", rand);
    assert.equal(rename.kind, "rename");
    assert.match(rename.newId, /^xlc-[0-9a-z]+$/);
    assert.notEqual(rename.newId, "xlc-dup");
});

test("导出→导入往返：校验通过且条目一致", () => {
    const it = makeItem("xlc-roundtrip");
    const bundle = transfer.buildBundle([it], new Map([["xlc-roundtrip", "往返正文"]]), 999);
    const json = JSON.stringify(bundle, null, 2);
    const validation = transfer.validateImport(json);
    assert.ok(validation.ok);
    assert.equal(validation.parsed.items.length, 1);
    assert.equal(validation.parsed.items[0].kramdown, "往返正文");
    assert.equal(validation.parsed.items[0].id, "xlc-roundtrip");
    assert.deepEqual(validation.parsed.items[0].tags, ["工作"]);
});

test("normalizeUnknownItem 与导出条目互认", () => {
    const it = makeItem("xlc-unknown001");
    const bundle = transfer.buildBundle([it], new Map([["xlc-unknown001", "x"]]), 1);
    const normalized = item.normalizeUnknownItem({
        id: bundle.items[0].id,
        blockId: BLOCK,
        libraryDocId: DOC,
        itemType: bundle.items[0].itemType,
        title: bundle.items[0].title,
        tags: bundle.items[0].tags,
    });
    assert.ok(normalized);
    assert.equal(normalized.id, "xlc-unknown001");
});
