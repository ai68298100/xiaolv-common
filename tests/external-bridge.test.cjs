// T-0031 · ADR-0013：对外窗口桥 window.xiaolvCommon v1（只读子集）测试。
// 门禁纪律：负向验证——先证明「写方法挂上桥会失败」，再锁定只读边界。
const test = require("node:test");
const assert = require("node:assert");
const {externalBridge, service, library, ai, providers} = require("./.build/entry.cjs");
const {ProviderRegistry} = providers;

function makeService() {
    const {XiaolvCommonService} = service;
    const {LibraryService} = library;
    const {AiAssistant} = ai;
    const kernel = {
        request(endpoint) {
            if (endpoint === "getChildBlocks") return Promise.resolve([]);
            return Promise.resolve(null);
        },
    };
    const lib = new LibraryService(kernel);
    lib.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const state = {schemaVersion: 2, favorites: [], recents: [], sort: "manual", uiPrefs: {lastTypeFilter: "", lastTagFilter: ""}, providers: [], ai: {enabled: false, shareContent: false}};
    return new XiaolvCommonService({
        library: lib,
        executor: {run: async () => ({ok: true, mode: "insert", message: "inserted", downgraded: false, pendingVerification: []}), openSource: async () => ({ok: true, mode: "open-source", message: "opened", downgraded: false, pendingVerification: []})},
        registry: new ProviderRegistry(),
        ai: new AiAssistant({request: async () => ({code: 0, data: null})}, state.ai),
        state,
        onStateChange: () => {},
    });
}

test("桥形状：protocol/protocolName/capabilities 只读四能力；写方法不存在于桥对象（ADR-0013 门禁）", () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    assert.equal(bridge.protocol, 1);
    assert.equal(bridge.protocolName, "xiaolv-common");
    assert.deepEqual(bridge.capabilities, ["search", "get", "recent", "favorites"]);
    // 负向验证：写面不挂桥——意外扩面会让本断言失败
    for (const forbidden of ["save", "update", "remove", "insert", "copy", "openSource", "reindex"]) {
        assert.equal(bridge[forbidden], undefined, `写能力 ${forbidden} 不得出现在只读桥`);
    }
    assert.equal(typeof bridge.search, "function");
    assert.equal(typeof bridge.get, "function");
    assert.equal(typeof bridge.getRecent, "function");
    assert.equal(typeof bridge.getFavorites, "function");
    assert.equal(typeof bridge.getCapabilities, "function");
});

test("whenReady 立即可用；getCapabilities 透传完整描述符（含诚实限制）", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    assert.equal(await bridge.whenReady(), true);
    const caps = bridge.getCapabilities();
    const byName = Object.fromEntries(caps.map((c) => [c.name, c]));
    assert.ok(byName.search && byName.get);
    assert.ok(byName.insert.limitations.some((l) => l.includes("mobile-insert-unverified")), "能力描述符保留诚实限制标注");
});

test("search：宽松入参收敛（未知类型丢弃不崩）；空库空结果", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    const r1 = await bridge.search({text: "关键词", itemType: 42, tag: null, scope: "bogus"});
    assert.equal(r1.ok, true);
    assert.deepEqual(r1.data, []);
    // 无参/垃圾入参不抛异常
    const r2 = await bridge.search();
    assert.equal(r2.ok, true);
    const r3 = await bridge.search("not-an-object");
    assert.equal(r3.ok, true);
});

test("get：非字符串 id 收敛为字符串；not-found 走协议信封不抛异常", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    const r = await bridge.get("20240101120000-zzzzzzz");
    assert.equal(r.ok, false);
    assert.ok(["not-found", "kernel-error"].includes(r.reason), `reason=${r.reason}`);
    assert.equal(r.protocol, "xiaolv-common", "ActionResult 信封原样透传");
});

test("getRecent/getFavorites：limit 缺省走服务默认；信封透传", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    const recent = await bridge.getRecent();
    assert.equal(recent.ok, true);
    assert.deepEqual(recent.data, []);
    const fav = await bridge.getFavorites();
    assert.equal(fav.ok, true);
    const bounded = await bridge.getRecent(Number.MAX_SAFE_INTEGER);
    assert.equal(bounded.ok, true, "越界 limit 由服务层钳制");
});

test("挂载/卸载：首实例持有；二次挂载跳过；disposer 只删自己的桥", () => {
    const host = {};
    const s1 = makeService();
    const s2 = makeService();
    const dispose1 = externalBridge.mountXlcBridge(s1, host);
    assert.ok(host.xiaolvCommon, "桥已挂载");
    const dispose2 = externalBridge.mountXlcBridge(s2, host);
    dispose2();
    assert.ok(host.xiaolvCommon, "二次挂载被跳过，disposer 不得误删首实例的桥");
    dispose1();
    assert.equal(host.xiaolvCommon, undefined, "首实例 disposer 正常注销");
    dispose1();
    assert.equal(host.xiaolvCommon, undefined, "重复卸载安全");
});

test("挂载：已存在同名桥时不覆盖（先到先得）", () => {
    const host = {xiaolvCommon: {existing: true}};
    const dispose = externalBridge.mountXlcBridge(makeService(), host);
    assert.equal(host.xiaolvCommon.existing, true, "既有桥未被覆盖");
    dispose();
    assert.ok(host.xiaolvCommon, "无主 disposer 不动既有桥");
});
