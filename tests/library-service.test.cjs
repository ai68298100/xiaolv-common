// 内容库服务测试：索引构建（无 SQL 遍历）、CRUD 回执与回滚、来源失效检测。
// 用受控行为的假内核客户端，不冒充真实宿主（真实宿主验收单独记录）。
const test = require("node:test");
const assert = require("node:assert");
const { LibraryService } = require("./.build/entry.cjs").library;

const DOC = "20240101120001-hijklmn";
const B1 = "20240101120000-aaaaaaa";
const B2 = "20240101120002-bbbbbbb";

function makeKernel(overrides = {}) {
    const calls = [];
    const base = {
        getChildBlocks: () => [{id: B1, type: "p"}, {id: B2, type: "p"}],
        batchGetBlockAttrs: ({ids}) => Object.fromEntries(ids.map((id) => [id, {
            "custom-xlc-id": `xlc-${id.slice(-10)}`,
            "custom-xlc-title": `条目 ${id}`,
        }])),
        getBlockAttrs: () => ({"custom-xlc-id": `xlc-${B1.slice(-10)}`}),
        appendBlock: () => [{doOperations: [{id: "20240101120003-ccccccc"}]}],
        setBlockAttrs: () => null,
        updateBlock: () => null,
        deleteBlock: () => null,
        checkBlocksExist: ({ids}) => Object.fromEntries(ids.map((id) => [id, true])),
        getBlockKramdown: () => ({id: B1, kramdown: "内容"}),
        getFile: () => null,
        getBlockInfo: () => ({box: "nb", path: "/x"}),
        listDocsByPath: () => ({files: []}),
        lsNotebooks: () => [{id: "20240101", name: "笔记"}],
        createDocWithMd: () => "20240101120004-ddddddd",
    };
    const handlers = {...base, ...overrides};
    return {
        calls,
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            const handler = handlers[endpoint];
            if (!handler) return Promise.reject(new Error(`no handler for ${endpoint}`));
            return Promise.resolve(handler(payload));
        },
    };
}

function makeService(kernelOverrides = {}, config) {
    const kernel = makeKernel(kernelOverrides);
    const service = new LibraryService(kernel);
    service.setConfig(config ?? {mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    return {kernel, service};
}

test("索引构建：只收带 custom-xlc-id 的顶层块（普通内容混排安全）", async () => {
    const {service} = makeService({
        batchGetBlockAttrs: ({ids}) => Object.fromEntries(ids.map((id) => [id, id === B1 ? {"custom-xlc-id": "xlc-first00001"} : {}])),
    });
    const idx = await service.buildIndex();
    assert.equal(idx.entries.length, 1);
    assert.equal(idx.entries[0].id, "xlc-first00001");
    assert.equal(idx.truncated, false);
});

test("索引摘要：从真实块正文派生摘要供正文关键词搜索使用", async () => {
    const {kernel, service} = makeService({
        getChildBlocks: () => [{id: B1, type: "p"}],
        batchGetBlockAttrs: () => ({[B1]: {"custom-xlc-id": "xlc-summary00001", "custom-xlc-title": "独立标题"}}),
        getBlockKramdown: ({id}) => ({id, kramdown: "这段正文可搜索并生成摘要。"}),
    });
    const idx = await service.buildIndex();
    assert.equal(idx.entries.length, 1);
    assert.ok(idx.entries[0].summary.includes("正文可搜索"));
    assert.ok(kernel.calls.some((c) => c.endpoint === "getBlockKramdown" && c.payload.id === B1));
});

test("门禁：条目超过上限截断并标记 truncated（不静默丢数据）", async () => {
    const many = Array.from({length: 50}, (_, i) => ({id: `2024010112${String(i).padStart(4, "0")}-xxxxxxx`, type: "p"}));
    const {service} = makeService({
        getChildBlocks: () => many,
        batchGetBlockAttrs: ({ids}) => Object.fromEntries(ids.map((id, i) => [id, {"custom-xlc-id": `xlc-bulk${String(i).padStart(8, "0")}`}]))
    });
    // 上限可注入（生产默认 LIMITS.maxItems=2000；此处用 10 验证截断语义）
    const idx = await service.buildIndex(10);
    assert.equal(idx.truncated, true);
    assert.equal(idx.entries.length, 10);
});

test("createItem：appendBlock + setBlockAttrs，返回条目回执", async () => {
    const {kernel, service} = makeService();
    const result = await service.createItem({itemType: "text", markdown: "hello", title: "新条目", tags: ["a"]});
    assert.ok(result.ok);
    assert.match(result.data.item.id, /^xlc-/);
    assert.equal(result.data.item.title, "新条目");
    const setAttrs = kernel.calls.find((c) => c.endpoint === "setBlockAttrs");
    assert.equal(setAttrs.payload.id, "20240101120003-ccccccc");
    assert.equal(setAttrs.payload.attrs["custom-xlc-tags"], "a");
});

test("URL 写入：仅接受 http/https；清空 URL 仍允许", async () => {
    const {service} = makeService();
    const unsafe = await service.createItem({itemType: "url", markdown: "javascript:alert(1)", url: "javascript:alert(1)"});
    assert.equal(unsafe.ok, false);
    assert.equal(unsafe.reason, "invalid-input");
    const safe = await service.createItem({itemType: "url", markdown: "https://example.com", url: "https://example.com"});
    assert.equal(safe.ok, true);
});

test("门禁：属性写入失败时回滚已插入块（失败不落半条数据）", async () => {
    const {kernel, service} = makeService({setBlockAttrs: () => { throw new Error("attrs denied"); }});
    const result = await service.createItem({itemType: "text", markdown: "hello"});
    assert.equal(result.ok, false);
    const del = kernel.calls.find((c) => c.endpoint === "deleteBlock");
    assert.ok(del, "orphan block must be rolled back");
    assert.equal(del.payload.id, "20240101120003-ccccccc");
});

test("createItem：appendBlock 未返回块 ID → 明确失败（不写属性）", async () => {
    const {kernel, service} = makeService({appendBlock: () => []});
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.equal(result.ok, false);
    assert.ok(!kernel.calls.some((c) => c.endpoint === "setBlockAttrs"));
});

test("来源失效检测：块/文档/资源三态", async () => {
    const {service} = makeService({checkBlocksExist: ({ids}) => Object.fromEntries(ids.map((id) => [id, false]))});
    const item = {
        id: "xlc-src1", blockId: B1, libraryDocId: DOC, itemType: "markdown",
        source: {sourceDocId: DOC, sourceBlockId: B2, sourceType: "block"},
    };
    const health = await service.checkSourceHealth(item);
    assert.ok(health.ok);
    assert.equal(health.data.docMissing, true);
    assert.equal(health.data.blockMissing, true);

    // 图片条目资源缺失（getFile 失败 → assetMissing）
    const imgKernel = makeKernel({
        getBlockKramdown: () => ({id: B1, kramdown: "![](assets/missing.png)"}),
        getFile: () => { throw new Error("404"); },
    });
    const imgService = new LibraryService(imgKernel, {
        probeAsset: async (path) => {
            try {
                await imgKernel.request("getFile", {path});
                return true;
            } catch {
                return false;
            }
        },
    });
    imgService.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const imgHealth = await imgService.checkSourceHealth({...item, itemType: "image"});
    assert.equal(imgHealth.data.assetMissing, true);
});

test("relinkSource：非法来源 ID 拒绝", async () => {
    const {service} = makeService();
    const created = await service.createItem({itemType: "text", markdown: "x"});
    const relink = await service.relinkSource(created.data.item.id, {sourceDocId: "bad"});
    assert.equal(relink.ok, false);
    assert.equal(relink.reason, "invalid-input");
});

test("reindex 强制重建（缓存可丢弃）", async () => {
    const {kernel, service} = makeService();
    await service.ensureIndex();
    const first = kernel.calls.filter((c) => c.endpoint === "getChildBlocks").length;
    await service.ensureIndex(); // 命中缓存
    assert.equal(kernel.calls.filter((c) => c.endpoint === "getChildBlocks").length, first);
    await service.reindex();
    assert.ok(kernel.calls.filter((c) => c.endpoint === "getChildBlocks").length > first);
});

test("无库配置时 CRUD 明确失败（不静默写错地方）", async () => {
    const kernel = makeKernel();
    const service = new LibraryService(kernel);
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid-input");
});

test("notebook 模式：从笔记本根解析首个文档作为写入落点", async () => {
    const {kernel, service} = makeService({
        listDocsByPath: () => ({files: [{id: "20240101120009-nbdoc01", name: "库"}]}),
    }, {mode: "notebook", notebookIds: ["20240101120008-nbook01"], containerDocIds: [], createdDocIds: [], configuredAt: 1});
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.ok(result.ok, result.ok ? "" : result.message);
    const append = kernel.calls.find((c) => c.endpoint === "appendBlock");
    assert.equal(append.payload.parentID, "20240101120009-nbdoc01");
});

test("notebook 模式：笔记本没有文档时明确拒绝写入", async () => {
    const {service} = makeService({listDocsByPath: () => ({files: []})}, {mode: "notebook", notebookIds: ["20240101120008-nbook01"], containerDocIds: [], createdDocIds: [], configuredAt: 1});
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid-input");
});
