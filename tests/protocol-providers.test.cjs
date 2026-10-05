// 协议能力协商 + provider 注册/卸载/恢复测试。
const test = require("node:test");
const assert = require("node:assert");
const protocol = require("./.build/entry.cjs").protocol;
const { ProviderRegistry } = require("./.build/entry.cjs").providers;

test("negotiateProtocol：同版本兼容；未知字段保留不阻断", () => {
    const result = protocol.negotiateProtocol(
        {protocol: "xiaolv-common", protocolVersion: 1, futureThing: {x: 1}},
        ["protocol", "protocolVersion"],
    );
    assert.equal(result.compatible, true);
    assert.deepEqual(result.unknownFields, ["futureThing"]);
});

test("门禁：协议名不符 / 更高主版本明确拒绝", () => {
    assert.equal(protocol.negotiateProtocol({protocol: "other", protocolVersion: 1}, []).reason, "name-mismatch");
    assert.equal(protocol.negotiateProtocol({protocol: "xiaolv-common", protocolVersion: 2}, []).reason, "major-version-mismatch");
    assert.equal(protocol.negotiateProtocol({protocol: "xiaolv-common"}, []).reason, "major-version-mismatch");
});

test("getCapabilities：能力清单完整且诚实标注移动端限制", () => {
    const service = makeService();
    const caps = service.getCapabilities();
    const byName = Object.fromEntries(caps.map((c) => [c.name, c]));
    for (const name of ["search", "get", "save", "update", "remove", "insert", "copy", "openSource", "reindex", "recent", "favorites"]) {
        assert.ok(byName[name], `capability ${name} declared`);
    }
    assert.equal(byName.insert.mobileSafe, false);
    assert.ok(byName.insert.limitations.some((l) => l.includes("mobile-insert-unverified")));
    assert.ok(byName.copy.limitations.some((l) => l.includes("bitmap-clipboard-unverified")));
});

test("provider 注册：记录合法 / 拒绝更高主版本 / unregister / restore", () => {
    const registry = new ProviderRegistry();
    assert.equal(registry.register({protocol: "xiaolv-common", protocolVersion: 1, pluginId: "xiaolv-checkin", displayName: "小驴打卡"}).ok, true);
    assert.equal(registry.register({protocol: "xiaolv-common", protocolVersion: 9, pluginId: "future"}).ok, false);
    assert.equal(registry.register({protocol: "xiaolv-common", protocolVersion: 1, pluginId: ""}).ok, false);
    assert.equal(registry.list().length, 1);

    registry.unregister("xiaolv-checkin");
    assert.equal(registry.list().length, 0);

    // 重载恢复：持久化记录恢复为"无 runtime"，可执行列表为空但记录还在
    registry.register({protocol: "xiaolv-common", protocolVersion: 1, pluginId: "xiaolv-checkin", displayName: "小驴打卡"});
    const records = JSON.parse(JSON.stringify(registry.toRecords()));
    const restored = new ProviderRegistry();
    restored.restore(records);
    assert.equal(restored.list().length, 1);
    assert.equal(restored.listExecutable().length, 0);
    assert.ok(restored.get("xiaolv-checkin"));
});

test("provider 持久化只含标量（不把函数回调写进存储）", () => {
    const registry = new ProviderRegistry();
    registry.register(
        {protocol: "xiaolv-common", protocolVersion: 1, pluginId: "p1", displayName: "P1"},
        {search: async () => []},
    );
    const records = registry.toRecords();
    assert.equal(records.length, 1);
    assert.equal(Object.values(records[0]).filter((v) => typeof v === "function").length, 0);
    assert.ok(!("runtime" in records[0]));
});

function makeService() {
    const { XiaolvCommonService } = require("./.build/entry.cjs").service;
    const { LibraryService } = require("./.build/entry.cjs").library;
    const kernel = {
        request(endpoint) {
            if (endpoint === "getChildBlocks") return Promise.resolve([]);
            return Promise.resolve(null);
        },
    };
    const library = new LibraryService(kernel);
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const state = {schemaVersion: 2, favorites: [], recents: [], sort: "manual", uiPrefs: {lastTypeFilter: "", lastTagFilter: ""}, providers: []};
    return new XiaolvCommonService({
        library,
        executor: {run: async () => ({ok: true, mode: "insert", message: "inserted", downgraded: false, pendingVerification: []}), openSource: async () => ({ok: true, mode: "open-source", message: "opened", downgraded: false, pendingVerification: []})},
        registry: new ProviderRegistry(),
        state,
        onStateChange: () => {},
    });
}

test("service：search 空库返回空数组；favorites 入口可用", async () => {
    const service = makeService();
    const results = await service.search({text: "", scope: "all"});
    assert.equal(results.ok, true);
    assert.deepEqual(results.data, []);
    const favs = await service.getFavorites();
    assert.equal(favs.ok, true);
});

test("service：toggleFavorite / touchRecent 容量与去重", () => {
    const service = makeService();
    assert.equal(service.toggleFavorite("xlc-a"), true);
    assert.equal(service.toggleFavorite("xlc-a"), false);
    service.touchRecent("xlc-a");
    service.touchRecent("xlc-a");
    assert.equal(service.state.recents.length, 1);
});

test("service：save 校验非法输入（协议红线：正文必带）", async () => {
    const service = makeService();
    const bad = await service.save({itemType: "text", markdown: ""});
    assert.equal(bad.ok, false);
    assert.equal(bad.reason, "invalid-input");
    const notObject = await service.save("junk");
    assert.equal(notObject.ok, false);
});

test("service：registerProvider 带未知字段仍成功（协商层忽略未知）", () => {
    const service = makeService();
    const result = service.registerProvider({
        protocol: "xiaolv-common", protocolVersion: 1,
        pluginId: "xiaolv-checkin", displayName: "打卡", brandNewField: 1,
    });
    assert.equal(result.ok, true);
});
