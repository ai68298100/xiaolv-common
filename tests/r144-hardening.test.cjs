// R144 加固项测试：代理对截断、导入时间戳/来源类型守卫、协议版本下界、侧车 ID 长度上界。
const test = require("node:test");
const assert = require("node:assert");
const transfer = require("./.build/entry.cjs").transfer;
const item = require("./.build/entry.cjs").item;
const protocol = require("./.build/entry.cjs").protocol;
const storage = require("./.build/entry.cjs").storage;

const BLOCK = "20240101120000-abcdefg";
const DOC = "20240101120001-hijklmn";

test("cleanString 代理对安全：截断不产生尾部孤立代理项", () => {
    // 511 个 a + 1 个 emoji（2 码元）：slice(0,512) 恰切出孤立高位代理项
    const raw = "a".repeat(511) + "😀";
    const normalized = item.normalizeCommonItem({
        blockId: BLOCK,
        libraryDocId: DOC,
        attrs: {"custom-xlc-id": "xlc-surrogate001", "custom-xlc-title": raw, "custom-xlc-type": "text"},
        blockType: "p",
        kramdown: "k",
    });
    assert.ok(normalized, "合法输入应产出条目");
    const title = normalized.title;
    assert.ok(!/[\uD800-\uDBFF]$/.test(title), "标题末尾不得是孤立高位代理项");
    assert.ok(title.length <= 512, "长度仍在上限内");
});

test("validateImport 时间戳守卫：负数与 Infinity 归 0（JSON 往返保真）", () => {
    const it = {
        id: "xlc-ts00000001", blockId: BLOCK, libraryDocId: DOC, itemType: "text",
        title: "T", alias: "", tags: [], category: "", summary: "S",
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: -999, updatedAt: 1e999, kramdown: "k",
    };
    const bundle = transfer.buildBundle([it], new Map([["xlc-ts00000001", "k"]]), 12345);
    const v = transfer.validateImport(JSON.stringify(bundle));
    assert.ok(v.ok, "校验应通过");
    const imported = v.parsed.items[0];
    assert.strictEqual(imported.createdAt, 0, "负时间戳应归 0");
    assert.strictEqual(imported.updatedAt, 0, "Infinity 应归 0");
});

test("validateImport 来源类型守卫：非法枚举归 external", () => {
    const it = {
        id: "xlc-st00000001", blockId: BLOCK, libraryDocId: DOC, itemType: "text",
        title: "T", alias: "", tags: [], category: "", summary: "S",
        source: {sourceDocId: DOC, sourceBlockId: BLOCK, sourceType: "totally-bogus"},
        url: "", targetBlockId: "", createdAt: 1, updatedAt: 2, kramdown: "k",
    };
    const bundle = transfer.buildBundle([it], new Map([["xlc-st00000001", "k"]]), 12345);
    const v = transfer.validateImport(JSON.stringify(bundle));
    assert.ok(v.ok, "校验应通过");
    const imported = v.parsed.items[0];
    assert.strictEqual(imported.source.sourceType, "external", "非法枚举应归 external");
});

test("validateImport 扩展字段 null 原型：__proto__ 键不污染原型", () => {
    const malicious = JSON.parse('{"protocol":"xiaolv-common","schemaVersion":1,"items":[{"id":"xlc-proto000001","itemType":"text","kramdown":"k","__proto__":{"polluted":true}}]}');
    const v = transfer.validateImport(JSON.stringify(malicious));
    assert.ok(v.ok, "含 __proto__ 键的导入应通过校验");
    assert.strictEqual(({}).polluted, undefined, "Object.prototype 不得被污染");
});

test("negotiateProtocol 版本下界：负版本/0 判不兼容", () => {
    const neg = protocol.negotiateProtocol({protocol: "xiaolv-common", protocolVersion: -5}, ["protocol", "protocolVersion"]);
    assert.strictEqual(neg.compatible, false);
    const zero = protocol.negotiateProtocol({protocol: "xiaolv-common", protocolVersion: 0}, ["protocol", "protocolVersion"]);
    assert.strictEqual(zero.compatible, false);
    const okOne = protocol.negotiateProtocol({protocol: "xiaolv-common", protocolVersion: 1}, ["protocol", "protocolVersion"]);
    assert.strictEqual(okOne.compatible, true);
});

test("normalizeState 侧车 ID 长度上界：超长 ID 逐条丢弃", () => {
    const hugeId = "xlc-" + "y".repeat(5000);
    const state = storage.normalizeState({
        schemaVersion: 2,
        favorites: [hugeId, "xlc-good0000001"],
        recents: [{id: hugeId, usedAt: 5}, {id: "xlc-good0000002", usedAt: 4}],
        usage: {[hugeId]: {count: 3, lastAt: 1}, "xlc-good0000003": {count: 1, lastAt: 2}},
        sort: "manual",
    });
    assert.ok(!state.favorites.includes(hugeId), "超长 ID 不得进入收藏");
    assert.ok(state.favorites.includes("xlc-good0000001"), "正常 ID 保留");
    assert.ok(state.recents.every((r) => r.id.length <= 48), "最近使用同样受上界约束");
    assert.ok(!Object.keys(state.usage).some((k) => k.length > 48), "使用计数同样受上界约束");
});
