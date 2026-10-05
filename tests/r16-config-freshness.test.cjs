// R16：库配置版本化门禁（未来版本拒绝降级读取）+ 索引 builtAt 新鲜度（SWR 语义）。
const test = require("node:test");
const assert = require("node:assert");
const {storage, library: libModule} = {
    storage: require("./.build/entry.cjs").storage,
    library: require("./.build/entry.cjs").library,
};

test("门禁：库配置未来版本拒绝降级读取（绝不静默改写）", () => {
    // 当前版本（缺省视为 v1）正常归一化，且输出带 configVersion=1
    const okCase = storage.normalizeLibraryConfig({mode: "doc", containerDocIds: ["20240101120000-abcdefg"]});
    assert.ok(okCase);
    assert.equal(okCase.configVersion, 1);
    // 未来版本 → null（UI 提示重新设置，原始数据不被改写）
    const future = {configVersion: 99, mode: "doc", containerDocIds: ["20240101120000-abcdefg"]};
    assert.equal(storage.normalizeLibraryConfig(future), null);
    assert.equal(future.configVersion, 99);
    // notebook 模式同理
    assert.equal(storage.normalizeLibraryConfig({configVersion: 2, mode: "notebook", notebookIds: ["20240101"]}), null);
});

test("门禁：ensureIndex 并发去重——并行调用只构建一次", async () => {
    let builds = 0;
    const kernel = {request: (endpoint) => {
        if (endpoint === "getChildBlocks") {
            builds++;
            return new Promise((resolve) => setTimeout(() => resolve([]), 5));
        }
        return Promise.resolve(null);
    }};
    const service = new libModule.LibraryService(kernel);
    service.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const [a, b, c] = await Promise.all([service.ensureIndex(0), service.ensureIndex(0), service.ensureIndex(0)]);
    assert.equal(a, b);
    assert.equal(b, c);
    assert.equal(builds, 1, `concurrent ensure must build once, got ${builds}`);
});

test("索引 builtAt：每次构建刷新（新鲜度判定依据）", async () => {
    const kernel = {request: (endpoint) => {
        if (endpoint === "getChildBlocks") return Promise.resolve([]);
        return Promise.resolve(null);
    }};
    const service = new libModule.LibraryService(kernel);
    service.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const first = await service.buildIndex();
    assert.ok(first.builtAt > 0);
    await new Promise((r) => setTimeout(r, 5));
    const second = await service.reindex();
    assert.ok(second.builtAt >= first.builtAt);
    // ensureIndex 命中缓存（同一对象）；带 maxAge=0 时（经过真实时间流逝后）强制重建（新对象）
    const cached = await service.ensureIndex();
    assert.equal(cached, second);
    await new Promise((r) => setTimeout(r, 3));
    const refreshed = await service.ensureIndex(0);
    assert.notEqual(refreshed, second);
    assert.ok(refreshed.builtAt >= second.builtAt);
});
