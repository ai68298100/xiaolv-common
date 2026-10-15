const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const {buildSync} = require("esbuild");

const source = path.resolve(__dirname, "../src/model/discovery-facets.ts");
const built = buildSync({entryPoints: [source], bundle: true, platform: "node", format: "cjs", write: false});
const moduleShim = {exports: {}};
new Function("module", "exports", built.outputFiles[0].text)(moduleShim, moduleShim.exports);
const {buildDiscoveryTagFacets, matchesDiscoveryTag} = moduleShim.exports;

const storageSource = path.resolve(__dirname, "../src/model/storage.ts");
const storageBuilt = buildSync({entryPoints: [storageSource], bundle: true, platform: "node", format: "cjs", write: false});
const storageShim = {exports: {}};
new Function("module", "exports", storageBuilt.outputFiles[0].text)(storageShim, storageShim.exports);
const {normalizeSavedDiscoveryViews} = storageShim.exports;

test("发现标签面板按条目去重计数、频次优先并限制数量", () => {
    const facets = buildDiscoveryTagFacets([
        {tags: ["客服", "模板", "客服"]},
        {tags: ["客服", "开发"]},
        {tags: ["模板"]},
    ], 3);
    assert.deepEqual(facets, [
        {tag: "客服", count: 2},
        {tag: "模板", count: 2},
        {tag: "开发", count: 1},
    ]);
});

test("发现标签面板忽略空值和非法标签容器", () => {
    assert.deepEqual(buildDiscoveryTagFacets([
        {tags: ["", "  ", 1]},
        {},
        {tags: ["A"]},
    ]), [{tag: "A", count: 1}]);
});

test("发现标签面板负向：错误计数必须失败", () => {
    assert.throws(() => assert.equal(buildDiscoveryTagFacets([{tags: ["客服"]}])[0].count, 99));
});

test("保存标签视图归一化限制字段、范围和数量", () => {
    const views = normalizeSavedDiscoveryViews([
        {id: "xlc-view-abcdef", name: "客服", tag: "常用", scope: "document", targetDocId: "20240101120001-abcdefg", pathLabel: "文档", defaultCategory: "客服"},
        {id: "xlc-view-abcdef", name: "重复", tag: "常用", scope: "document", targetDocId: "20240101120001-abcdefg"},
        {id: "xlc-view-bad", name: "坏范围", tag: "常用", scope: "bogus", targetDocId: "20240101120001-abcdefg"},
        {id: "xlc-view-fedcba", name: "无目标", tag: "常用", scope: "document"},
    ]);
    assert.equal(views.length, 1);
    assert.equal(views[0].name, "客服");
});

test("保存标签视图使用精确标签匹配，不把常用误匹配为常用2", () => {
    assert.equal(matchesDiscoveryTag(["常用2"], "常用"), false);
    assert.equal(matchesDiscoveryTag(["常用"], "常用"), true);
});
