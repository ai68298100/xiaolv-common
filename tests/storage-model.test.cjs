// 侧车存储模型测试：归一化上限、v1→v2 迁移、未来版本拒绝（门禁）、损坏输入降级。
const test = require("node:test");
const assert = require("node:assert");
const storage = require("./.build/entry.cjs").storage;

test("normalizeState：空输入产出安全默认值", () => {
    const state = storage.normalizeState(null);
    assert.equal(state.schemaVersion, 2);
    assert.deepEqual(state.favorites, []);
    assert.deepEqual(state.recents, []);
    assert.equal(state.sort, "manual");
    assert.deepEqual(state.providers, []);
});

test("normalizeState：收藏去重 + 容量上限；recents 保序去重", () => {
    const favorites = Array.from({length: 600}, (_, i) => `xlc-fav${i}`);
    favorites.push("xlc-fav0"); // 重复
    const state = storage.normalizeState({favorites, recents: [
        {id: "xlc-a", usedAt: 1}, {id: "xlc-a", usedAt: 2}, {id: "xlc-b", usedAt: 3}, {id: "bad", usedAt: 4}, {id: "xlc-c", usedAt: "x"},
    ]});
    assert.equal(state.favorites.length, 500);
    assert.deepEqual(state.recents.map((r) => r.id), ["xlc-a", "xlc-b"]);
});

test("migrateState：v1（pinnedIds/recentIds/settings）→ v2", () => {
    const result = storage.migrateState({
        schemaVersion: 1,
        pinnedIds: ["xlc-p1", "xlc-p2"],
        recentIds: ["xlc-r1"],
        settings: {typeFilter: "code", tagFilter: "工作"},
    });
    assert.ok("state" in result);
    assert.deepEqual(result.state.favorites, ["xlc-p1", "xlc-p2"]);
    assert.equal(result.state.recents[0].id, "xlc-r1");
    assert.equal(result.state.uiPrefs.lastTypeFilter, "code");
    assert.equal(result.state.uiPrefs.lastTagFilter, "工作");
});

test("门禁：未来版本状态被拒绝且不降级改写", () => {
    const future = {schemaVersion: 99, favorites: ["xlc-x"]};
    const result = storage.migrateState(future);
    assert.ok("rejected" in result);
    assert.equal(result.observedVersion, 99);
    // 原始对象未被篡改（诚实保留等待升级）
    assert.equal(future.schemaVersion, 99);
});

test("migrateState：损坏输入（数组/原始类型）安全降级", () => {
    assert.ok("state" in storage.migrateState([1, 2]));
    assert.ok("state" in storage.migrateState("junk"));
});

test("normalizeLibraryConfig：三种模式与非法配置", () => {
    assert.ok(storage.normalizeLibraryConfig({mode: "doc", containerDocIds: ["20240101120000-abcdefg"]}));
    assert.ok(storage.normalizeLibraryConfig({mode: "notebook", notebookIds: ["20240101"]}));
    assert.equal(storage.normalizeLibraryConfig({mode: "doc", containerDocIds: []}), null);
    assert.equal(storage.normalizeLibraryConfig({mode: "notebook", notebookIds: []}), null);
    assert.equal(storage.normalizeLibraryConfig({mode: "galaxy"}), null);
    assert.equal(storage.normalizeLibraryConfig(null), null);
});
