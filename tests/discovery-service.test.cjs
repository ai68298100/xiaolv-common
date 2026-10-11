// Current-document discovery service contract tests; the fake kernel does not stand in for host acceptance.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const esbuild = require("esbuild");

const sourcePath = path.resolve(__dirname, "../src/service/discovery.ts");
const built = esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    write: false,
    logLevel: "silent",
});
const discoveryModule = new Module(sourcePath);
discoveryModule.filename = sourcePath;
discoveryModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
discoveryModule._compile(built.outputFiles[0].text, sourcePath);
const {DiscoveryService} = discoveryModule.exports;

const DOC = "20260101000001-aaaaaaa";
const BLOCK = "20260101000002-bbbbbbb";
const ROOT = "20260101000003-ccccccc";
const NOTEBOOK = "20260101";
const NEW_ITEM_BLOCK = "20260101000004-ddddddd";

const commonItem = (overrides = {}) => ({
    id: "xlc-library00001",
    blockId: NEW_ITEM_BLOCK,
    libraryDocId: ROOT,
    itemType: "text",
    title: "已收录内容",
    alias: "",
    tags: [],
    category: "",
    summary: "正文内容",
    varCount: 0,
    source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
    url: "",
    targetBlockId: "",
    createdAt: 1,
    updatedAt: 1,
    droppedFields: [],
    ...overrides,
});

function makeHarness(options = {}) {
    const calls = [];
    const bodies = new Map(Object.entries(options.bodies ?? {[BLOCK]: "普通正文"}));
    const libraryItems = new Map((options.libraryItems ?? []).map((item) => [item.id, item]));
    const kernel = {
        async request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            if (endpoint === "getFullHPathByID") return "/笔记/当前文档.sy";
            if (endpoint === "getChildBlocks") {
                if (options.getChildBlocks) return options.getChildBlocks(payload, calls);
                return options.children ?? [{id: BLOCK, type: "p", subType: "", content: "普通正文"}];
            }
            if (endpoint === "batchGetBlockAttrs") {
                if (options.batchGetBlockAttrs) return options.batchGetBlockAttrs(payload);
                return Object.fromEntries(payload.ids.map((id) => [id, {}]));
            }
            if (endpoint === "getBlockKramdown") {
                if (options.getBlockKramdown) return options.getBlockKramdown(payload, bodies);
                const kramdown = bodies.get(payload.id);
                return kramdown === undefined ? null : {id: payload.id, kramdown};
            }
            if (endpoint === "getBlockInfo") return options.getBlockInfo ?? {box: NOTEBOOK, path: "/常用根.sy"};
            if (endpoint === "listDocsByPath") {
                if (options.listDocsByPath) return options.listDocsByPath(payload);
                return {box: NOTEBOOK, path: "/", files: [{id: ROOT, path: "/常用根.sy"}]};
            }
            throw new Error(`unexpected endpoint: ${endpoint}`);
        },
    };
    const library = {
        getConfig: () => options.config ?? {
            configVersion: 1,
            mode: "doc",
            notebookIds: [],
            containerDocIds: [ROOT],
            createdDocIds: [],
            configuredAt: 1,
        },
        async reindex() {
            if (options.reindexError) throw options.reindexError;
            return {
                entries: [],
                items: libraryItems,
                truncated: options.indexTruncated === true,
                docsScanned: 1,
                errors: options.indexErrors ?? [],
                builtAt: 1,
            };
        },
        async getItemKramdown(item) {
            if (options.getItemKramdown) return options.getItemKramdown(item);
            const value = options.libraryBodies?.[item.blockId];
            return value === undefined ? {ok: false, reason: "not-found", message: "missing"} : {ok: true, data: value};
        },
        async createItem(input) {
            if (options.createItem) return options.createItem(input);
            calls.push({endpoint: "library.createItem", payload: input});
            return {ok: true, data: {item: commonItem({itemType: input.itemType, title: input.title, source: input.source})}};
        },
    };
    return {service: new DiscoveryService(kernel, library, options.serviceOptions), calls, bodies, libraryItems};
}

test("扫描仅读取当前文档直接子块，严格使用 subType 且不在扫描阶段取全文", async () => {
    const {service, calls} = makeHarness({
        children: [
            {id: BLOCK, type: "c", subType: "code", content: "console.log(1)"},
            {id: "20260101000005-eeeeeee", type: "p", content: "   "},
            {id: "20260101000006-fffffff", type: "h", subType: ""},
        ],
    });
    const result = await service.discoverCurrentDocument(DOC);
    assert.equal(result.ok, true);
    assert.equal(result.data.scannedBlocks, 3);
    assert.equal(result.data.skippedEmpty, 2);
    assert.equal(result.data.candidates.length, 1);
    assert.equal(result.data.candidates[0].itemType, "code");
    assert.equal(result.data.candidates[0].summary, "console.log(1)");
    assert.equal(calls.filter((call) => call.endpoint === "getChildBlocks").length, 1);
    assert.equal(calls.some((call) => call.endpoint === "getBlockKramdown"), false);
    assert.equal(calls.some((call) => call.payload.id === BLOCK && call.endpoint === "getChildBlocks"), false);
});

test("getChildBlocks 畸形顶层响应与畸形 subType 显式失败", async (t) => {
    await t.test("非数组响应", async () => {
        const {service} = makeHarness({getChildBlocks: () => ({blocks: []})});
        const result = await service.discoverCurrentDocument(DOC);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "invalid-response");
        assert.match(result.message, /not an array/);
    });
    await t.test("错误字段类型", async () => {
        const {service} = makeHarness({children: [{id: BLOCK, type: "c", subType: 3}]});
        const result = await service.discoverCurrentDocument(DOC);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "invalid-response");
        assert.match(result.message, /subType/);
    });
});

test("配置的内容库文档不会进入发现扫描", async () => {
    const {service, calls} = makeHarness({
        config: {configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [ROOT], configuredAt: 1},
    });
    const result = await service.discoverCurrentDocument(DOC);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "library-document");
    assert.equal(calls.some((call) => call.endpoint === "getChildBlocks"), false);
});

test("notebook 根文档身份可确认并排除；根枚举失败时 fail-closed", async (t) => {
    await t.test("当前文档是已配置笔记本根文档", async () => {
        const {service, calls} = makeHarness({
            config: {configVersion: 1, mode: "notebook", notebookIds: [NOTEBOOK], containerDocIds: [], createdDocIds: [], configuredAt: 1},
            listDocsByPath: () => ({files: [{id: DOC, path: "/当前文档.sy"}]}),
        });
        const result = await service.discoverCurrentDocument(DOC);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "library-document");
        assert.equal(calls.some((call) => call.endpoint === "getChildBlocks"), false);
    });
    await t.test("无法列出根文档时不扫描当前文档", async () => {
        const {service, calls} = makeHarness({
            config: {configVersion: 1, mode: "notebook", notebookIds: [NOTEBOOK], containerDocIds: [], createdDocIds: [], configuredAt: 1},
            listDocsByPath: () => { throw new Error("notebook unavailable"); },
        });
        const result = await service.discoverCurrentDocument(DOC);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "library-boundary-unknown");
        assert.equal(calls.some((call) => call.endpoint === "getChildBlocks"), false);
    });
});

test("预览现场读取完整正文，精确比较去重并要求明确允许重复后再收录", async () => {
    const existing = commonItem({id: "xlc-existing0001", blockId: NEW_ITEM_BLOCK, summary: "完整模板内容"});
    const {service, calls} = makeHarness({
        bodies: {[BLOCK]: "完整模板内容"},
        children: [{id: BLOCK, type: "p", subType: "", content: "完整模板内容"}],
        libraryItems: [existing],
        libraryBodies: {[NEW_ITEM_BLOCK]: "完整模板内容"},
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const key = scan.data.candidates[0].key;
    const preview = await service.previewCandidate(scan.data.id, key);
    assert.equal(preview.ok, true);
    assert.equal(preview.data.markdown, "完整模板内容");
    assert.equal(preview.data.candidate.status, "same-content");

    const blocked = await service.addCandidate(scan.data.id, key);
    assert.deepEqual(blocked, {ok: true, data: {status: "same-content", itemId: existing.id, title: existing.title}});
    assert.equal(calls.some((call) => call.endpoint === "library.createItem"), false);

    const added = await service.addCandidate(scan.data.id, key, {allowSameContent: true});
    assert.equal(added.ok, true);
    assert.equal(added.data.status, "added");
    const write = calls.find((call) => call.endpoint === "library.createItem");
    assert.equal(write.payload.markdown, "完整模板内容");
    assert.deepEqual(write.payload.source, {sourceDocId: DOC, sourceBlockId: BLOCK, sourceType: "block"});
});

test("来源块已通过 sourceBlockId 收录时跳过，不创建第二个副本", async () => {
    const existing = commonItem({id: "xlc-existing0002", source: {sourceDocId: DOC, sourceBlockId: BLOCK, sourceType: "block"}});
    const {service, calls} = makeHarness({libraryItems: [existing], libraryBodies: {[NEW_ITEM_BLOCK]: "普通正文"}});
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    assert.equal(scan.data.candidates[0].status, "already-in-library");
    const preview = await service.previewCandidate(scan.data.id, scan.data.candidates[0].key);
    assert.equal(preview.ok, true);
    assert.equal(preview.data.candidate.status, "already-in-library");
    const add = await service.addCandidate(scan.data.id, scan.data.candidates[0].key);
    assert.equal(add.ok, true);
    assert.equal(add.data.status, "already-in-library");
    assert.equal(calls.some((call) => call.endpoint === "library.createItem"), false);
});

test("预览后来源块内容变化时拒绝写入", async () => {
    let body = "预览内容";
    const {service, bodies} = makeHarness({
        bodies: {[BLOCK]: "预览内容"},
        getBlockKramdown: ({id}) => ({id, kramdown: bodies.get(id)}),
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const key = scan.data.candidates[0].key;
    assert.equal((await service.previewCandidate(scan.data.id, key)).ok, true);
    body = "来源已更新";
    bodies.set(BLOCK, body);
    const add = await service.addCandidate(scan.data.id, key);
    assert.equal(add.ok, false);
    assert.equal(add.reason, "source-changed");
});

test("预览后来源块类型变化时拒绝写入", async () => {
    let reads = 0;
    const {service} = makeHarness({
        children: [{id: BLOCK, type: "p", subType: "", content: "正文"}],
        getChildBlocks: () => {
            reads++;
            return reads <= 2
                ? [{id: BLOCK, type: "p", subType: "", content: "正文"}]
                : [{id: BLOCK, type: "c", subType: "code", content: "正文"}];
        },
        bodies: {[BLOCK]: "正文"},
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const key = scan.data.candidates[0].key;
    assert.equal((await service.previewCandidate(scan.data.id, key)).ok, true);
    const add = await service.addCandidate(scan.data.id, key);
    assert.equal(add.ok, false);
    assert.equal(add.reason, "source-changed");
});

test("释放会话后候选正文不可再预览，库索引不完整时不允许收录", async (t) => {
    await t.test("关闭会话", async () => {
        const {service} = makeHarness();
        const scan = await service.discoverCurrentDocument(DOC);
        assert.equal(scan.ok, true);
        service.closeSession(scan.data.id);
        const result = await service.previewCandidate(scan.data.id, scan.data.candidates[0].key);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "session-expired");
    });
    await t.test("索引不完整", async () => {
        const {service, calls} = makeHarness({indexErrors: ["doc unavailable"]});
        const scan = await service.discoverCurrentDocument(DOC);
        assert.equal(scan.ok, true);
        const preview = await service.previewCandidate(scan.data.id, scan.data.candidates[0].key);
        assert.equal(preview.ok, true);
        assert.equal(preview.data.candidate.status, "library-unverified");
        const add = await service.addCandidate(scan.data.id, scan.data.candidates[0].key);
        assert.equal(add.ok, false);
        assert.equal(add.reason, "library-check-incomplete");
        assert.equal(calls.some((call) => call.endpoint === "library.createItem"), false);
    });
});
