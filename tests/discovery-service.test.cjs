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
const NOTEBOOK = "20260101000009-iiiiiii";
const NOTEBOOK_TWO = "20260101000010-jjjjjjj";
const NEW_ITEM_BLOCK = "20260101000004-ddddddd";
const DOC_TWO = "20260101000005-eeeeeee";
const DOC_THREE = "20260101000006-fffffff";
const BLOCK_TWO = "20260101000007-ggggggg";
const BLOCK_THREE = "20260101000008-hhhhhhh";

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
    const libraryBodies = {...(options.libraryBodies ?? {})};
    const kernel = {
        async request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            if (endpoint === "getFullHPathByID") {
                if (typeof options.getFullHPathByID === "function") return options.getFullHPathByID(payload);
                return "/笔记/当前文档.sy";
            }
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
            if (endpoint === "getBlockInfo") {
                if (typeof options.getBlockInfo === "function") return options.getBlockInfo(payload);
                return options.getBlockInfo ?? {box: NOTEBOOK, path: "/常用根.sy"};
            }
            if (endpoint === "listDocsByPath") {
                if (options.listDocsByPath) return options.listDocsByPath(payload);
                return {box: NOTEBOOK, path: "/", files: [{id: ROOT, path: "/常用根.sy"}]};
            }
            if (endpoint === "lsNotebooks") {
                if (options.lsNotebooks) return options.lsNotebooks(payload);
                return {notebooks: [{id: NOTEBOOK, name: "笔记本一"}, {id: NOTEBOOK_TWO, name: "笔记本二"}]};
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
        async reindex(reindexOptions) {
            if (options.reindex) return options.reindex(reindexOptions);
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
            const value = libraryBodies[item.blockId];
            return value === undefined ? {ok: false, reason: "not-found", message: "missing"} : {ok: true, data: value};
        },
        async createItem(input, libraryDocId, createOptions) {
            if (options.createItem) return options.createItem(input, libraryDocId, createOptions);
            calls.push({endpoint: "library.createItem", payload: input});
            return {ok: true, data: {item: commonItem({itemType: input.itemType, title: input.title, source: input.source})}};
        },
        async removeItemsIfUnchanged(batchToken, inputs) {
            if (options.removeItemsIfUnchanged) return options.removeItemsIfUnchanged(batchToken, inputs, libraryItems);
            return {ok: true, data: inputs.map(({item}) => ({status: "deleted", itemId: item.id, blockId: item.blockId}))};
        },
    };
    return {service: new DiscoveryService(kernel, library, options.serviceOptions), calls, bodies, libraryItems, libraryBodies};
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

test("当前文档发现会排除专用库笔记本中的嵌套文档", async () => {
    const {service, calls} = makeHarness({
        config: {configVersion: 1, mode: "notebook", notebookIds: [NOTEBOOK], containerDocIds: [], createdDocIds: [], configuredAt: 1},
        getBlockInfo: ({id}) => ({box: NOTEBOOK, path: id === DOC ? "/分类/嵌套文档.sy" : "/库首页.sy"}),
    });

    const result = await service.discoverCurrentDocument(DOC);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "library-document");
    assert.equal(calls.some((call) => call.endpoint === "getChildBlocks"), false);
    assert.equal(calls.some((call) => call.endpoint === "listDocsByPath"), false);
});

test("当前笔记本发现从当前文档定位 notebook，BFS 扫描文档并为候选保留各自来源", async () => {
    const paths = new Map([
        [DOC, "/项目/当前文档"],
        [DOC_TWO, "/项目/资料"],
        [DOC_THREE, "/项目/资料/归档"],
    ]);
    const {service, calls} = makeHarness({
        getBlockInfo: ({id}) => ({box: NOTEBOOK, path: id === DOC ? "/项目/当前文档.sy" : paths.get(id)}),
        getChildBlocks: ({id}) => id === DOC
            ? [{id: BLOCK, type: "p", content: "当前文档内容"}]
            : id === DOC_TWO
                ? [{id: BLOCK_TWO, type: "p", content: "资料文档内容"}]
                : [{id: BLOCK_THREE, type: "p", content: "归档文档内容"}],
        listDocsByPath: ({path}) => path === "/"
            ? {files: [{id: DOC, path: "/项目/当前文档.sy"}, {id: DOC_TWO, path: "/项目/资料.sy"}]}
            : path === "/项目/资料.sy"
                ? {files: [{id: DOC_THREE, path: "/项目/资料/归档.sy"}]}
                : {files: []},
        getFullHPathByID: ({id}) => paths.get(id) ?? `/笔记/${id}`,
    });

    const result = await service.discoverCurrentNotebook(DOC);
    assert.equal(result.ok, true);
    assert.equal(result.data.scope, "notebook");
    assert.equal(result.data.scannedDocs, 3);
    assert.equal(result.data.scannedBlocks, 3);
    assert.equal(result.data.truncated, false);
    assert.deepEqual(result.data.candidates.map((candidate) => candidate.sourceDocId), [DOC, DOC_TWO, DOC_THREE]);
    assert.deepEqual(result.data.candidates.map((candidate) => candidate.sourcePath), [
        "/项目/当前文档", "/项目/资料", "/项目/资料/归档",
    ]);
    assert.deepEqual(calls.filter((call) => call.endpoint === "listDocsByPath").map((call) => call.payload.path), [
        "/", "/项目/当前文档.sy", "/项目/资料.sy", "/项目/资料/归档.sy",
    ]);
});

test("当前笔记本发现报告文档枚举及块扫描进度", async () => {
    const progress = [];
    const {service} = makeHarness({
        getChildBlocks: ({id}) => [{id: id === DOC ? BLOCK : BLOCK_TWO, type: "p", content: "正文"}],
        listDocsByPath: ({path}) => path === "/"
            ? {files: [{id: DOC, path: "/当前.sy"}, {id: DOC_TWO, path: "/第二篇.sy"}]}
            : {files: []},
    });
    const result = await service.discoverCurrentNotebook(DOC, {onProgress: (entry) => progress.push(entry)});
    assert.equal(result.ok, true);
    assert.ok(progress.some((entry) => entry.phase === "enumerating" && entry.discoveredDocs === 2));
    assert.deepEqual(progress.filter((entry) => entry.phase === "scanning").map((entry) => [entry.scannedDocs, entry.scannedBlocks]), [
        [0, 0], [1, 1], [2, 2],
    ]);
});

test("笔记本发现候选预览和收录沿用各自来源文档", async () => {
    const {service, calls} = makeHarness({
        bodies: {[BLOCK]: "当前", [BLOCK_TWO]: "第二文档正文"},
        getChildBlocks: ({id}) => id === DOC
            ? [{id: BLOCK, type: "p", content: "当前"}]
            : [{id: BLOCK_TWO, type: "p", content: "第二文档正文"}],
        listDocsByPath: ({path}) => path === "/"
            ? {files: [{id: DOC, path: "/当前.sy"}, {id: DOC_TWO, path: "/第二篇.sy"}]}
            : {files: []},
        getFullHPathByID: ({id}) => id === DOC_TWO ? "/项目/第二篇" : "/项目/当前",
    });
    const scan = await service.discoverCurrentNotebook(DOC);
    assert.equal(scan.ok, true);
    const candidate = scan.data.candidates.find((entry) => entry.sourceDocId === DOC_TWO);
    assert.ok(candidate);
    assert.equal(candidate.sourcePath, "/项目/第二篇");
    const preview = await service.previewCandidate(scan.data.id, candidate.key);
    assert.equal(preview.ok, true);
    assert.equal(preview.data.markdown, "第二文档正文");
    const added = await service.addCandidate(scan.data.id, candidate.key);
    assert.equal(added.ok, true);
    assert.deepEqual(calls.find((call) => call.endpoint === "library.createItem").payload.source, {
        sourceDocId: DOC_TWO,
        sourceBlockId: BLOCK_TWO,
        sourceType: "block",
    });
});

test("发现收录缺省分类为待整理，显式分类和空分类按调用方传入", async () => {
    const run = async (category) => {
        const createdInputs = [];
        const {service} = makeHarness({
            createItem: async (input) => {
                createdInputs.push(input);
                return {ok: true, data: {item: commonItem({itemType: input.itemType, title: input.title, category: input.category, source: input.source})}};
            },
        });
        const scan = await service.discoverCurrentDocument(DOC);
        assert.equal(scan.ok, true);
        const candidate = scan.data.candidates[0];
        assert.equal((await service.previewCandidate(scan.data.id, candidate.key)).ok, true);
        const result = await service.addCandidate(scan.data.id, candidate.key, category === undefined ? {} : {category});
        assert.equal(result.ok, true);
        return createdInputs[0].category;
    };

    assert.equal(await run(undefined), "待整理");
    assert.equal(await run("自定义分类"), "自定义分类");
    assert.equal(await run(""), "");
});

test("同一发现候选并发收录串行化，不重复创建物理块", async () => {
    let createdCount = 0;
    let stored = null;
    const {service} = makeHarness({
        createItem: async (input) => {
            createdCount++;
            await new Promise((resolve) => setTimeout(resolve, 20));
            stored = commonItem({id: "xlc-discovery-idempotent", itemType: input.itemType, title: input.title, source: input.source});
            return {ok: true, data: {item: stored}};
        },
        reindex: async () => ({
            entries: [], items: stored ? new Map([[stored.id, stored]]) : new Map(),
            truncated: false, docsScanned: 1, errors: [], builtAt: Date.now(),
        }),
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const candidate = scan.data.candidates[0];
    assert.equal((await service.previewCandidate(scan.data.id, candidate.key)).ok, true);
    const [first, second] = await Promise.all([
        service.addCandidate(scan.data.id, candidate.key),
        service.addCandidate(scan.data.id, candidate.key),
    ]);
    assert.equal(createdCount, 1);
    assert.equal([first, second].filter((result) => result.ok && result.data.status === "added").length, 1);
    assert.equal([first, second].filter((result) => result.ok && result.data.status === "already-in-library").length, 1);
});

test("当前笔记本发现限制文档数并在达到上限时标记截断", async () => {
    const {service} = makeHarness({
        serviceOptions: {maxDocs: 2},
        getChildBlocks: ({id}) => [{
            id: id === DOC ? BLOCK : BLOCK_TWO,
            type: "p",
            content: `来自 ${id}`,
        }],
        listDocsByPath: ({path}) => path === "/"
            ? {files: [
                {id: DOC, path: "/当前.sy"},
                {id: DOC_TWO, path: "/第二篇.sy"},
                {id: DOC_THREE, path: "/第三篇.sy"},
            ]}
            : {files: []},
    });
    const result = await service.discoverCurrentNotebook(DOC);
    assert.equal(result.ok, true);
    assert.equal(result.data.scannedDocs, 2);
    assert.equal(result.data.truncated, true);
    assert.ok(result.data.truncationReasons.includes("documents"));
    assert.equal(result.data.truncationReasons.includes("scope-document-depth"), false);
    assert.deepEqual(new Set(result.data.candidates.map((candidate) => candidate.sourceDocId)), new Set([DOC, DOC_TWO]));
});

test("文档枚举超出时间预算时报告时间上限而非范围或深度上限", async () => {
    const realNow = Date.now;
    let now = 10_000;
    Date.now = () => now;
    try {
        const {service} = makeHarness({
            serviceOptions: {maxDurationMs: 1_000},
            listDocsByPath: ({path: docPath}) => {
                if (docPath === "/") now += 1_001;
                return {files: [{id: DOC, path: "/当前.sy"}, {id: DOC_TWO, path: "/第二篇.sy"}]};
            },
        });
        const result = await service.discoverCurrentNotebook(DOC);
        assert.equal(result.ok, true);
        assert.equal(result.data.truncated, true);
        assert.ok(result.data.truncationReasons.includes("time"));
        assert.equal(result.data.truncationReasons.includes("scope-document-depth"), false);
    } finally {
        Date.now = realNow;
    }
});

test("停止专用库边界遍历后不再发起后续目录请求", async () => {
    let releaseListing;
    let listingStarted;
    const listingGate = new Promise((resolve) => { releaseListing = resolve; });
    const started = new Promise((resolve) => { listingStarted = resolve; });
    let listingCalls = 0;
    const {service, calls} = makeHarness({
        config: {configVersion: 1, mode: "tree", notebookIds: [], containerDocIds: [ROOT, DOC_THREE], createdDocIds: [], configuredAt: 1},
        getBlockInfo: async ({id}) => id === DOC
            ? {box: NOTEBOOK, path: "/待扫描.sy"}
            : {box: NOTEBOOK, path: `/${id}.sy`},
        listDocsByPath: async () => {
            listingCalls++;
            if (listingCalls === 1) {
                listingStarted();
                await listingGate;
            }
            return {files: []};
        },
    });
    const scanning = service.discoverTree(DOC);
    await started;
    assert.equal(service.requestScanStop(), true);
    releaseListing();
    const result = await scanning;
    assert.equal(result.ok, false);
    assert.equal(result.reason, "cancelled");
    assert.equal(listingCalls, 1);
    assert.equal(calls.some((call) => call.endpoint === "getChildBlocks"), false);
});

test("当前笔记本发现限制块数并在后续文档尚未扫描时标记截断", async () => {
    const {service} = makeHarness({
        serviceOptions: {maxBlocks: 1},
        getChildBlocks: ({id}) => [{id: id === DOC ? BLOCK : BLOCK_TWO, type: "p", content: `来自 ${id}`}],
        listDocsByPath: ({path}) => path === "/"
            ? {files: [{id: DOC, path: "/当前.sy"}, {id: DOC_TWO, path: "/第二篇.sy"}]}
            : {files: []},
    });
    const result = await service.discoverCurrentNotebook(DOC);
    assert.equal(result.ok, true);
    assert.equal(result.data.scannedBlocks, 1);
    assert.equal(result.data.scannedDocs, 1);
    assert.equal(result.data.truncated, true);
    assert.deepEqual(result.data.candidates.map((candidate) => candidate.sourceDocId), [DOC]);
});

test("取消笔记本发现后，当前内核请求完成即停止后续文档扫描", async () => {
    let releaseFirstRead;
    let firstReadStarted;
    const started = new Promise((resolve) => { firstReadStarted = resolve; });
    const firstRead = new Promise((resolve) => { releaseFirstRead = resolve; });
    const {service, calls} = makeHarness({
        getChildBlocks: async ({id}) => {
            if (id === DOC) {
                firstReadStarted();
                await firstRead;
            }
            return [{id: id === DOC ? BLOCK : BLOCK_TWO, type: "p", content: "正文"}];
        },
        listDocsByPath: ({path}) => path === "/"
            ? {files: [{id: DOC, path: "/当前.sy"}, {id: DOC_TWO, path: "/第二篇.sy"}]}
            : {files: []},
    });
    const pending = service.discoverCurrentNotebook(DOC);
    await started;
    service.closeSession();
    releaseFirstRead();
    const result = await pending;
    assert.equal(result.ok, false);
    assert.equal(result.reason, "cancelled");
    assert.deepEqual(calls.filter((call) => call.endpoint === "getChildBlocks").map((call) => call.payload.id), [DOC]);
});

test("当前笔记本发现拒绝无法识别的范围并阻止扫描专用库笔记本", async (t) => {
    await t.test("box/path 缺失", async () => {
        const {service, calls} = makeHarness({getBlockInfo: {box: "", path: "/文档.sy"}});
        const result = await service.discoverCurrentNotebook(DOC);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "invalid-response");
        assert.equal(calls.some((call) => call.endpoint === "listDocsByPath"), false);
    });
    await t.test("当前笔记本已配置为专用库", async () => {
        const {service, calls} = makeHarness({
            config: {configVersion: 1, mode: "notebook", notebookIds: [NOTEBOOK], containerDocIds: [], createdDocIds: [], configuredAt: 1},
        });
        const result = await service.discoverCurrentNotebook(DOC);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "library-document");
        assert.equal(calls.some((call) => call.endpoint === "getChildBlocks"), false);
        assert.equal(calls.some((call) => call.endpoint === "listDocsByPath"), false);
    });
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
            getBlockInfo: {box: NOTEBOOK_TWO, path: "/文档.sy"},
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

test("批量收录生成绑定批次回执；撤销只调用同一批次的安全删除并支持部分重试", async () => {
    const blockB = "20260101000009-iiiiiii";
    const firstBlockId = NEW_ITEM_BLOCK;
    const secondBlockId = "20260101000010-jjjjjjj";
    let createCount = 0;
    let undoCount = 0;
    const created = [];
    const undoCalls = [];
    const {service, libraryItems, libraryBodies} = makeHarness({
        children: [
            {id: BLOCK, type: "p", subType: "", content: "第一条批次内容"},
            {id: blockB, type: "p", subType: "", content: "第二条批次内容"},
        ],
        bodies: {[BLOCK]: "第一条批次内容", [blockB]: "第二条批次内容"},
        createItem: async (input, _libraryDocId, createOptions) => {
            createCount++;
            const item = commonItem({
                id: `xlc-batchitem000${createCount}`,
                blockId: createCount === 1 ? firstBlockId : secondBlockId,
                itemType: input.itemType,
                title: input.title,
                summary: input.markdown,
                source: input.source,
            });
            created.push({item, markdown: input.markdown, batchToken: createOptions.batchToken});
            libraryItems.set(item.id, item);
            libraryBodies[item.blockId] = input.markdown;
            return {ok: true, data: {item}};
        },
        removeItemsIfUnchanged: async (batchToken, inputs) => {
            undoCalls.push({batchToken, inputs});
            undoCount++;
            if (undoCount === 1) return {ok: true, data: [
                {status: "deleted", itemId: inputs[0].item.id, blockId: inputs[0].item.blockId},
                {status: "skipped", itemId: inputs[1].item.id, blockId: inputs[1].item.blockId, reason: "edited"},
            ]};
            return {ok: true, data: [
                {status: "deleted", itemId: inputs[0].item.id, blockId: inputs[0].item.blockId},
            ]};
        },
    });

    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const keys = scan.data.candidates.map((candidate) => candidate.key);
    for (const key of keys) assert.equal((await service.previewCandidate(scan.data.id, key)).ok, true);

    const begun = service.beginAddBatch(scan.data.id);
    assert.equal(begun.ok, true);
    for (const key of keys) {
        const add = await service.addCandidate(scan.data.id, key, {batchId: begun.data.batchId});
        assert.equal(add.ok, true);
        assert.equal(add.data.status, "added");
        assert.equal(add.data.batchId, begun.data.batchId);
    }
    assert.deepEqual(created.map((entry) => entry.batchToken), [begun.data.batchId, begun.data.batchId]);
    assert.deepEqual(service.finishAddBatch(scan.data.id, begun.data.batchId), {
        ok: true,
        data: {batchId: begun.data.batchId, added: 2, discarded: false},
    });

    const firstUndo = await service.undoBatch(scan.data.id, begun.data.batchId);
    assert.equal(firstUndo.ok, true);
    assert.equal(firstUndo.data.deleted, 1);
    assert.deepEqual(firstUndo.data.deletedItems, [{itemId: created[0].item.id, title: created[0].item.title}]);
    assert.deepEqual(firstUndo.data.skipped, [{itemId: created[1].item.id, title: created[1].item.title, reason: "edited"}]);
    assert.equal(undoCalls[0].batchToken, begun.data.batchId);
    assert.deepEqual(undoCalls[0].inputs.map((entry) => entry.item.id), created.map((entry) => entry.item.id));

    const retry = await service.undoBatch(scan.data.id, begun.data.batchId);
    assert.equal(retry.ok, true);
    assert.equal(retry.data.deleted, 1);
    assert.deepEqual(undoCalls[1].inputs.map((entry) => entry.item.id), [created[1].item.id]);
    const repeated = await service.undoBatch(scan.data.id, begun.data.batchId);
    assert.equal(repeated.ok, true);
    assert.equal(repeated.data.alreadyUndone, true);
});

test("单条收录也有独立的一项撤销批次；批次空收录会释放令牌", async () => {
    const created = [];
    const {service} = makeHarness({
        createItem: async (input, _libraryDocId, createOptions) => {
            const item = commonItem({id: "xlc-singlebatch001", title: input.title, source: input.source});
            created.push({item, batchToken: createOptions.batchToken});
            return {ok: true, data: {item}};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    const candidate = scan.data.candidates[0];
    await service.previewCandidate(scan.data.id, candidate.key);
    const add = await service.addCandidate(scan.data.id, candidate.key);
    assert.equal(add.ok, true);
    assert.equal(add.data.status, "added");
    assert.equal(add.data.batchId, created[0].batchToken);
    const undo = await service.undoBatch(scan.data.id, add.data.batchId);
    assert.equal(undo.ok, true);
    assert.equal(undo.data.deleted, 1);

    const scanAgain = await service.discoverCurrentDocument(DOC);
    const emptyBatch = service.beginAddBatch(scanAgain.data.id);
    assert.equal(emptyBatch.ok, true);
    assert.deepEqual(service.finishAddBatch(scanAgain.data.id, emptyBatch.data.batchId), {
        ok: true,
        data: {batchId: emptyBatch.data.batchId, added: 0, discarded: true},
    });
    assert.equal((await service.undoBatch(scanAgain.data.id, emptyBatch.data.batchId)).reason, "not-found");
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

test("预览与收录会移除来源块的 IAL，防止复制复用来源物理 ID", async () => {
    const sourceMarkdown = `普通正文\n{: id="${BLOCK}" custom-xlc-id="xlc-sourceitem001"}`;
    let createdInput;
    let createdItem;
    const {service} = makeHarness({
        getBlockKramdown: ({id}) => ({id, kramdown: sourceMarkdown}),
        createItem: async (input, _libraryDocId, createOptions) => {
            createdInput = input;
            createdItem = commonItem({
                id: "xlc-discoverycopy001",
                blockId: NEW_ITEM_BLOCK,
                title: input.title,
                source: input.source,
            });
            return {ok: true, data: {item: createdItem}};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const candidate = scan.data.candidates[0];
    const preview = await service.previewCandidate(scan.data.id, candidate.key);
    assert.equal(preview.ok, true);
    assert.equal(preview.data.markdown, "普通正文");

    const added = await service.addCandidate(scan.data.id, candidate.key);
    assert.equal(added.ok, true);
    assert.equal(added.data.status, "added");
    assert.equal(createdInput.markdown, "普通正文");
    assert.notEqual(createdItem.blockId, candidate.sourceBlockId);
    assert.equal(createdInput.source.sourceBlockId, candidate.sourceBlockId);
});

test("收录结构块会清理嵌套物理 ID，保留其他 IAL 属性和代码示例", async () => {
    const nestedId = "20260101000010-jjjjjjj";
    const sourceMarkdown = [
        "父项",
        `  - {: id=\"${nestedId}\" updated=\"20260101000011\" custom-xlc-id=\"xlc-nesteditem001\" custom-style=\"keep\"}子项`,
        "```text",
        `{: id=\"${nestedId}\"}`,
        "```",
        `{: id=\"${BLOCK}\" custom-xlc-id=\"xlc-sourceitem001\"}`,
    ].join("\n");
    let createdInput;
    const {service} = makeHarness({
        children: [{id: BLOCK, type: "s", subType: "", content: "父项 子项"}],
        getBlockKramdown: ({id}) => ({id, kramdown: sourceMarkdown}),
        createItem: async (input) => {
            createdInput = input;
            return {ok: true, data: {item: commonItem({
                id: "xlc-discoverycopy002",
                blockId: NEW_ITEM_BLOCK,
                itemType: input.itemType,
                title: input.title,
                source: input.source,
            })}};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const candidate = scan.data.candidates[0];
    assert.equal((await service.previewCandidate(scan.data.id, candidate.key)).ok, true);
    const added = await service.addCandidate(scan.data.id, candidate.key);
    assert.equal(added.ok, true);
    const structuralMarkdown = createdInput.markdown.split("```text")[0];
    const codeMarkdown = createdInput.markdown.split("```text")[1];
    assert.match(structuralMarkdown, /\{: custom-style="keep"\}子项/);
    assert.equal(structuralMarkdown.includes(BLOCK), false);
    assert.equal(structuralMarkdown.includes(nestedId), false);
    assert.doesNotMatch(structuralMarkdown, /custom-xlc-/);
    assert.ok(codeMarkdown.includes(`\n{: id="${nestedId}"}\n\`\`\``));
});

test("关闭发现会话后，等待中的收录不会再开始写入专用库", async () => {
    let releaseIndex;
    let reindexStarted;
    const indexStarted = new Promise((resolve) => { reindexStarted = resolve; });
    const indexGate = new Promise((resolve) => { releaseIndex = resolve; });
    let pauseNextIndex = false;
    let createCount = 0;
    const {service} = makeHarness({
        reindex: async () => {
            if (pauseNextIndex) {
                pauseNextIndex = false;
                reindexStarted();
                await indexGate;
            }
            return {entries: [], items: new Map(), truncated: false, docsScanned: 1, errors: [], builtAt: 1};
        },
        createItem: async () => {
            createCount++;
            return {ok: true, data: {item: commonItem()}};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    const candidate = scan.data.candidates[0];
    assert.equal((await service.previewCandidate(scan.data.id, candidate.key)).ok, true);

    pauseNextIndex = true;
    const adding = service.addCandidate(scan.data.id, candidate.key);
    await indexStarted;
    service.closeSession(scan.data.id);
    releaseIndex();
    const result = await adding;

    assert.equal(result.ok, false);
    assert.equal(result.reason, "session-expired");
    assert.equal(createCount, 0);
});

test("关闭发生在 createItem 期间时保留批次，完成后可撤销并显式关闭", async () => {
    let releaseCreate;
    let createStarted;
    const started = new Promise((resolve) => { createStarted = resolve; });
    const createGate = new Promise((resolve) => { releaseCreate = resolve; });
    let createCount = 0;
    const removeCalls = [];
    const {service} = makeHarness({
        createItem: async (input, _libraryDocId, createOptions) => {
            createCount++;
            createStarted();
            await createGate;
            return {ok: true, data: {item: commonItem({
                id: "xlc-close-race0001",
                title: input.title,
                source: input.source,
            }), batchToken: createOptions.batchToken}};
        },
        removeItemsIfUnchanged: async (batchToken, inputs) => {
            removeCalls.push({batchToken, inputs});
            return {ok: true, data: inputs.map(({item}) => ({status: "deleted", itemId: item.id, blockId: item.blockId}))};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    const candidate = scan.data.candidates[0];
    assert.equal((await service.previewCandidate(scan.data.id, candidate.key)).ok, true);
    const batch = service.beginAddBatch(scan.data.id);
    assert.equal(batch.ok, true);

    const adding = service.addCandidate(scan.data.id, candidate.key, {batchId: batch.data.batchId});
    await started;
    const closePending = service.closeSession(scan.data.id);
    assert.equal(closePending.ok, false);
    assert.equal(closePending.reason, "conflict");
    assert.match(closePending.message, /undo it if needed/);
    assert.equal(service.beginAddBatch(scan.data.id).reason, "conflict");
    assert.equal((await service.addCandidate(scan.data.id, candidate.key)).reason, "conflict");
    assert.equal((await service.discoverCurrentDocument(DOC)).reason, "conflict");
    assert.equal(createCount, 1);

    releaseCreate();
    const added = await adding;
    assert.equal(added.ok, true);
    assert.equal(added.data.batchId, batch.data.batchId);
    const finished = service.finishAddBatch(scan.data.id, batch.data.batchId);
    assert.deepEqual(finished, {ok: true, data: {batchId: batch.data.batchId, added: 1, discarded: false}});
    const undone = await service.undoBatch(scan.data.id, batch.data.batchId);
    assert.equal(undone.ok, true);
    assert.equal(undone.data.deleted, 1);
    assert.equal(removeCalls[0].batchToken, batch.data.batchId);

    assert.deepEqual(service.closeSession(scan.data.id), {ok: true, data: {closed: true, activeWrites: 0}});
    assert.equal((await service.discoverCurrentDocument(DOC)).ok, true);
});

test("卸载等待在途收录并仅补偿该次新建副本；重复 shutdown 不重复删除", async () => {
    let releaseCreate;
    let createStarted;
    const started = new Promise((resolve) => { createStarted = resolve; });
    const createGate = new Promise((resolve) => { releaseCreate = resolve; });
    const removeCalls = [];
    const {service} = makeHarness({
        createItem: async (input, _libraryDocId, createOptions) => {
            createStarted();
            await createGate;
            return {ok: true, data: {item: commonItem({
                id: "xlc-shutdown-new001",
                title: input.title,
                source: input.source,
            }), batchToken: createOptions.batchToken}};
        },
        removeItemsIfUnchanged: async (batchToken, inputs) => {
            removeCalls.push({batchToken, inputs});
            return {ok: true, data: inputs.map(({item}) => ({status: "deleted", itemId: item.id, blockId: item.blockId}))};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    const candidate = scan.data.candidates[0];
    await service.previewCandidate(scan.data.id, candidate.key);
    const batch = service.beginAddBatch(scan.data.id);
    const adding = service.addCandidate(scan.data.id, candidate.key, {batchId: batch.data.batchId});
    await started;

    let shutdownDone = false;
    const shutdownPromise = service.shutdown();
    const shuttingDown = shutdownPromise.then((result) => {
        shutdownDone = true;
        return result;
    });
    assert.equal(service.shutdown(), shutdownPromise);
    assert.equal(shutdownDone, false);
    assert.equal((await service.discoverCurrentDocument(DOC)).reason, "conflict");

    releaseCreate();
    assert.equal((await adding).reason, "conflict");
    const result = await shuttingDown;
    assert.equal(shutdownDone, true);
    assert.deepEqual(result.compensatedItemIds, ["xlc-shutdown-new001"]);
    assert.deepEqual(result.unresolved, []);
    assert.equal(removeCalls.length, 1);
    assert.equal(removeCalls[0].batchToken, batch.data.batchId);
    assert.deepEqual(removeCalls[0].inputs.map(({item}) => item.id), ["xlc-shutdown-new001"]);
});

test("卸载不补偿此前已完成并返回回执的批次", async () => {
    let removeCount = 0;
    const {service} = makeHarness({
        createItem: async (input) => ({ok: true, data: {item: commonItem({title: input.title, source: input.source})}}),
        removeItemsIfUnchanged: async (_batchToken, inputs) => {
            removeCount++;
            return {ok: true, data: inputs.map(({item}) => ({status: "deleted", itemId: item.id, blockId: item.blockId}))};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    const candidate = scan.data.candidates[0];
    await service.previewCandidate(scan.data.id, candidate.key);
    const added = await service.addCandidate(scan.data.id, candidate.key);
    assert.equal(added.ok, true);

    const result = await service.shutdown();
    assert.deepEqual(result, {compensatedItemIds: [], unresolved: []});
    assert.equal(removeCount, 0);
});

test("卸载条件补偿跳过已编辑副本并将其报告为未解决", async () => {
    let releaseCreate;
    let createStarted;
    const started = new Promise((resolve) => { createStarted = resolve; });
    const createGate = new Promise((resolve) => { releaseCreate = resolve; });
    const {service} = makeHarness({
        createItem: async (input) => {
            createStarted();
            await createGate;
            return {ok: true, data: {item: commonItem({id: "xlc-shutdown-edit001", title: input.title, source: input.source})}};
        },
        removeItemsIfUnchanged: async (_batchToken, inputs) => ({ok: true, data: inputs.map(({item}) => ({
            status: "skipped", itemId: item.id, blockId: item.blockId, reason: "edited",
        }))}),
    });
    const scan = await service.discoverCurrentDocument(DOC);
    const candidate = scan.data.candidates[0];
    await service.previewCandidate(scan.data.id, candidate.key);
    const adding = service.addCandidate(scan.data.id, candidate.key);
    await started;
    const shutdown = service.shutdown();
    releaseCreate();
    await adding;
    const result = await shutdown;
    assert.deepEqual(result.compensatedItemIds, []);
    assert.equal(result.unresolved.length, 1);
    assert.match(result.unresolved[0].batchId, /^discovery-batch-/);
    assert.deepEqual({
        itemId: result.unresolved[0].itemId,
        title: result.unresolved[0].title,
        message: result.unresolved[0].message,
    }, {
        itemId: "xlc-shutdown-edit001",
        title: candidate.title,
        message: "conditional removal skipped: edited",
    });
});

test("关闭冲突保留撤销回执时，新发现扫描不能覆盖该会话", async () => {
    let releaseCreate;
    let createStarted;
    const started = new Promise((resolve) => { createStarted = resolve; });
    const createGate = new Promise((resolve) => { releaseCreate = resolve; });
    const {service} = makeHarness({
        createItem: async (input) => {
            createStarted();
            await createGate;
            return {ok: true, data: {item: commonItem({id: "xlc-close-pending001", title: input.title, source: input.source})}};
        },
    });
    const scan = await service.discoverCurrentDocument(DOC);
    const candidate = scan.data.candidates[0];
    await service.previewCandidate(scan.data.id, candidate.key);
    const adding = service.addCandidate(scan.data.id, candidate.key);
    await started;
    assert.equal(service.closeSession(scan.data.id).reason, "conflict");
    releaseCreate();
    const added = await adding;
    assert.equal(added.ok, true);
    assert.equal((await service.discoverCurrentDocument(DOC)).reason, "conflict");
    assert.equal((await service.undoBatch(scan.data.id, added.data.batchId)).data.deleted, 1);
    assert.equal(service.closeSession(scan.data.id).ok, true);
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

test("预览和收录会重新核对来源仍在扫描范围且不属于库边界", async (t) => {
    await t.test("来源文档移入配置的树库后，预览拒绝继续", async () => {
        let sourceInLibraryTree = false;
        const createCalls = [];
        const {service} = makeHarness({
            config: {configVersion: 1, mode: "tree", notebookIds: [], containerDocIds: [ROOT], createdDocIds: [], configuredAt: 1},
            getBlockInfo: ({id}) => id === ROOT
                ? {box: NOTEBOOK, path: "/常用库.sy"}
                : {box: NOTEBOOK, path: "/其他文档.sy"},
            listDocsByPath: ({path}) => path === "/常用库.sy"
                ? {files: sourceInLibraryTree ? [{id: DOC, path: "/常用库.sy/其他文档.sy"}] : []}
                : {files: []},
            createItem: async (input) => {
                createCalls.push(input);
                return {ok: true, data: {item: commonItem({source: input.source})}};
            },
        });
        const scan = await service.discoverCurrentDocument(DOC);
        assert.equal(scan.ok, true);
        const candidate = scan.data.candidates[0];
        sourceInLibraryTree = true;

        const preview = await service.previewCandidate(scan.data.id, candidate.key);
        assert.equal(preview.ok, false);
        assert.equal(preview.reason, "library-document");
        assert.equal(createCalls.length, 0);
    });

    await t.test("笔记本候选移出原笔记本后，收录拒绝写入", async () => {
        let sourceMoved = false;
        const createCalls = [];
        const {service} = makeHarness({
            getBlockInfo: ({id}) => ({
                box: id === DOC_TWO && sourceMoved ? NOTEBOOK_TWO : NOTEBOOK,
                path: id === DOC_TWO ? "/项目/资料.sy" : "/项目/当前.sy",
            }),
            getChildBlocks: ({id}) => id === DOC_TWO
                ? [{id: BLOCK_TWO, type: "p", subType: "", content: "第二文档正文"}]
                : [],
            listDocsByPath: ({path}) => path === "/"
                ? {files: [{id: DOC, path: "/项目/当前.sy"}, {id: DOC_TWO, path: "/项目/资料.sy"}]}
                : {files: []},
            bodies: {[BLOCK_TWO]: "第二文档正文"},
            createItem: async (input) => {
                createCalls.push(input);
                return {ok: true, data: {item: commonItem({source: input.source})}};
            },
        });
        const scan = await service.discoverCurrentNotebook(DOC);
        assert.equal(scan.ok, true);
        const candidate = scan.data.candidates.find((entry) => entry.sourceDocId === DOC_TWO);
        assert.ok(candidate);
        assert.equal((await service.previewCandidate(scan.data.id, candidate.key)).ok, true);
        sourceMoved = true;

        const added = await service.addCandidate(scan.data.id, candidate.key);
        assert.equal(added.ok, false);
        assert.equal(added.reason, "source-changed");
        assert.equal(createCalls.length, 0);
    });
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
        assert.ok(scan.data.errors.some((error) => error.sourcePath === "专用内容库" && error.message.includes("doc unavailable")));
        const add = await service.addCandidate(scan.data.id, scan.data.candidates[0].key);
        assert.equal(add.ok, false);
        assert.equal(add.reason, "library-check-incomplete");
        assert.equal(calls.some((call) => call.endpoint === "library.createItem"), false);
    });
});

test("指定文档树只扫描根文档及其后代，预览时再次验证树范围", async () => {
    const treeRoot = DOC;
    const nestedDoc = DOC_TWO;
    let moved = false;
    const {service} = makeHarness({
        getBlockInfo: ({id}) => id === treeRoot
            ? {box: NOTEBOOK, path: "/项目/树根.sy"}
            : {box: NOTEBOOK, path: moved ? "/其他/移动.sy" : "/项目/树根.sy/子文档.sy"},
        listDocsByPath: ({path}) => path === "/项目/树根.sy"
            ? {files: [{id: nestedDoc, path: "/项目/树根.sy/子文档.sy"}]}
            : {files: []},
        getChildBlocks: ({id}) => [{id: id === treeRoot ? BLOCK : BLOCK_TWO, type: "p", content: `来自 ${id}`}],
        bodies: {[BLOCK]: "树根内容", [BLOCK_TWO]: "子文档内容"},
    });
    const scan = await service.discoverTree(treeRoot);
    assert.equal(scan.ok, true);
    assert.equal(scan.data.scope, "tree");
    assert.deepEqual(scan.data.candidates.map((candidate) => candidate.sourceDocId), [treeRoot, nestedDoc]);
    const child = scan.data.candidates.find((candidate) => candidate.sourceDocId === nestedDoc);
    assert.ok(child);
    moved = true;
    const preview = await service.previewCandidate(scan.data.id, child.key);
    assert.equal(preview.ok, false);
    assert.equal(preview.reason, "source-changed");
});

test("全部笔记本要求显式确认，并在单笔记本枚举失败时保留其他结果", async () => {
    const {service, calls} = makeHarness({
        lsNotebooks: () => ({notebooks: [
            {id: NOTEBOOK, name: "笔记本一"},
            {id: NOTEBOOK_TWO, name: "笔记本二"},
        ]}),
        listDocsByPath: ({notebook}) => {
            if (notebook === NOTEBOOK_TWO) throw new Error("notebook temporarily unavailable");
            return {files: [{id: DOC, path: "/项目/内容.sy"}]};
        },
        getBlockInfo: ({id}) => ({box: id === DOC ? NOTEBOOK : NOTEBOOK_TWO, path: "/项目/内容.sy"}),
        getChildBlocks: () => [{id: BLOCK, type: "p", content: "可保留内容"}],
    });
    const unconfirmed = await service.discoverAllNotebooks();
    assert.equal(unconfirmed.ok, false);
    assert.equal(calls.some((call) => call.endpoint === "lsNotebooks"), false);
    const scan = await service.discoverAllNotebooks({confirmed: true});
    assert.equal(scan.ok, true);
    assert.equal(scan.data.scope, "all-notebooks");
    assert.equal(scan.data.candidates.length, 1);
    assert.equal(scan.data.errors.length, 1);
    assert.match(scan.data.errors[0].message, /temporarily unavailable/);
});

test("请求停止后保留已完整扫描文档的候选，关闭会话仍丢弃迟到结果", async (t) => {
    await t.test("停止保留部分结果且后续收录会重新核验", async () => {
        let releaseSecondDoc;
        let secondDocStarted;
        const secondDocGate = new Promise((resolve) => { releaseSecondDoc = resolve; });
        const started = new Promise((resolve) => { secondDocStarted = resolve; });
        let createCount = 0;
        const {service, calls} = makeHarness({
            listDocsByPath: ({path: docPath}) => docPath === "/"
                ? {files: [{id: DOC, path: "/一.sy"}, {id: DOC_TWO, path: "/二.sy"}, {id: DOC_THREE, path: "/三.sy"}]}
                : {files: []},
            getChildBlocks: async ({id}) => {
                if (id === DOC_TWO) {
                    secondDocStarted();
                    await secondDocGate;
                    return [{id: BLOCK_TWO, type: "p", content: "不应纳入正在扫描的文档"}];
                }
                if (id === DOC_THREE) return [{id: BLOCK_THREE, type: "p", content: "停止后的文档"}];
                return [{id: BLOCK, type: "p", content: "保留的已完成文档"}];
            },
            bodies: {[BLOCK]: "保留的已完成文档"},
            createItem: async (input) => {
                createCount++;
                return {ok: true, data: {item: commonItem({title: input.title, source: input.source})}};
            },
        });
        const scanning = service.discoverCurrentNotebook(DOC);
        await started;
        assert.equal(service.requestScanStop(), true);
        releaseSecondDoc();
        const scan = await scanning;
        assert.equal(scan.ok, true);
        assert.equal(scan.data.stopped, true);
        assert.equal(scan.data.truncated, true);
        assert.ok(scan.data.truncationReasons.includes("cancelled"));
        assert.deepEqual(scan.data.candidates.map((candidate) => candidate.sourceDocId), [DOC]);
        assert.equal(scan.data.candidates[0].status, "library-unverified");
        assert.equal(calls.some((call) => call.endpoint === "getChildBlocks" && call.payload.id === DOC_THREE), false);

        const candidate = scan.data.candidates[0];
        assert.equal((await service.previewCandidate(scan.data.id, candidate.key)).ok, true);
        const added = await service.addCandidate(scan.data.id, candidate.key);
        assert.equal(added.ok, true);
        assert.equal(createCount, 1);
    });

    await t.test("关闭期间停止的扫描不会重新创建会话", async () => {
        let releaseSecondDoc;
        let secondDocStarted;
        const secondDocGate = new Promise((resolve) => { releaseSecondDoc = resolve; });
        const started = new Promise((resolve) => { secondDocStarted = resolve; });
        const {service} = makeHarness({
            listDocsByPath: ({path: docPath}) => docPath === "/"
                ? {files: [{id: DOC, path: "/一.sy"}, {id: DOC_TWO, path: "/二.sy"}]}
                : {files: []},
            getChildBlocks: async ({id}) => {
                if (id === DOC_TWO) {
                    secondDocStarted();
                    await secondDocGate;
                }
                return [{id: id === DOC ? BLOCK : BLOCK_TWO, type: "p", content: "内容"}];
            },
        });
        const scanning = service.discoverCurrentNotebook(DOC);
        await started;
        service.closeSession();
        releaseSecondDoc();
        const result = await scanning;
        assert.equal(result.ok, false);
        assert.equal(result.reason, "cancelled");
    });
});

test("停止重复核验时等待当前请求并将候选标为待确认", async () => {
    let releaseReindex;
    let reindexStarted;
    const reindexGate = new Promise((resolve) => { releaseReindex = resolve; });
    const started = new Promise((resolve) => { reindexStarted = resolve; });
    let stopObserved = false;
    const {service} = makeHarness({
        reindex: async (options) => {
            reindexStarted();
            await reindexGate;
            stopObserved = options.shouldStop();
            return {entries: [], items: new Map(), truncated: stopObserved, stopped: stopObserved, docsScanned: 1, errors: [], builtAt: 1};
        },
    });
    const scanning = service.discoverCurrentDocument(DOC);
    await started;
    assert.equal(service.requestScanStop(), true);
    releaseReindex();
    const result = await scanning;

    assert.equal(result.ok, true);
    assert.equal(stopObserved, true);
    assert.equal(result.data.stopped, true);
    assert.equal(result.data.candidates.length, 1);
    assert.equal(result.data.candidates[0].status, "library-unverified");
    assert.ok(result.data.truncationReasons.includes("cancelled"));
    assert.ok(result.data.errors.some((error) => error.sourcePath === "专用内容库"));
});

test("扫描候选、正文字符和单块长度预算并保留被跳过原因", async () => {
    const longText = "x".repeat(1_001);
    const {service} = makeHarness({
        serviceOptions: {maxCandidates: 10, maxCharacters: 1_000, maxBlockCharacters: 1_000},
        children: [
            {id: BLOCK, type: "p", content: longText},
            {id: BLOCK_TWO, type: "p", content: "a".repeat(800)},
            {id: BLOCK_THREE, type: "p", content: "b".repeat(300)},
        ],
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    assert.equal(scan.data.skippedLong, 1);
    assert.equal(scan.data.candidates.length, 1);
    assert.equal(scan.data.truncated, true);
    assert.ok(scan.data.truncationReasons.includes("characters"));
    assert.equal(scan.data.truncationReasons.includes("candidates"), false);
});

test("重复索引超出时间预算时标记截断并把候选降级为待确认", async () => {
    const realNow = Date.now;
    let now = 10_000;
    Date.now = () => now;
    try {
        const {service} = makeHarness({
            serviceOptions: {maxDurationMs: 1_000},
            reindex: async () => {
                now += 1_001;
                return {entries: [], items: new Map(), truncated: false, docsScanned: 1, errors: [], builtAt: now};
            },
        });
        const scan = await service.discoverCurrentDocument(DOC);
        assert.equal(scan.ok, true);
        assert.equal(scan.data.truncated, true);
        assert.ok(scan.data.truncationReasons.includes("time"));
        assert.equal(scan.data.candidates[0].status, "library-unverified");
        assert.ok(scan.data.errors.some((error) => error.message.includes("exceeded the discovery time limit")));
    } finally {
        Date.now = realNow;
    }
});

test("达到候选上限后剩余空块不会误报候选截断", async () => {
    const {service} = makeHarness({
        serviceOptions: {maxCandidates: 1},
        children: [
            {id: BLOCK, type: "p", content: "唯一候选"},
            {id: BLOCK_TWO, type: "p", content: "   "},
        ],
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    assert.equal(scan.data.candidates.length, 1);
    assert.equal(scan.data.skippedEmpty, 1);
    assert.equal(scan.data.truncated, false);
    assert.equal(scan.data.truncationReasons.includes("candidates"), false);
});

test("超过候选数预算时保留前序结果并报告候选截断", async () => {
    const {service} = makeHarness({
        serviceOptions: {maxCandidates: 1},
        children: [
            {id: BLOCK, type: "p", content: "第一条"},
            {id: BLOCK_TWO, type: "p", content: "第二条"},
        ],
    });
    const scan = await service.discoverCurrentDocument(DOC);
    assert.equal(scan.ok, true);
    assert.deepEqual(scan.data.candidates.map((candidate) => candidate.title), ["第一条"]);
    assert.equal(scan.data.truncated, true);
    assert.ok(scan.data.truncationReasons.includes("candidates"));
});

test("笔记本内单文档读取失败不会丢弃此前成功发现的候选", async () => {
    const {service} = makeHarness({
        listDocsByPath: ({path}) => path === "/"
            ? {files: [{id: DOC, path: "/成功.sy"}, {id: DOC_TWO, path: "/失败.sy"}]}
            : {files: []},
        getChildBlocks: ({id}) => {
            if (id === DOC_TWO) throw new Error("one document failed");
            return [{id: BLOCK, type: "p", content: "保留的结果"}];
        },
    });
    const scan = await service.discoverCurrentNotebook(DOC);
    assert.equal(scan.ok, true);
    assert.equal(scan.data.candidates.length, 1);
    assert.equal(scan.data.candidates[0].sourceDocId, DOC);
    assert.equal(scan.data.errors.length, 1);
    assert.match(scan.data.errors[0].message, /one document failed/);
});
