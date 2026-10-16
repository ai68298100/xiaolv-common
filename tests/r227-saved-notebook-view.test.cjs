const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const Module = require("node:module");
const {buildSync} = require("esbuild");

function loadSource(relativePath) {
    const sourcePath = path.resolve(__dirname, relativePath);
    const built = buildSync({
        entryPoints: [sourcePath], bundle: true, platform: "node", format: "cjs", write: false,
        external: ["siyuan"], alias: {"@": path.resolve(__dirname, "../src")}, loader: {".scss": "empty"},
    });
    const shim = new Module(sourcePath);
    shim.filename = sourcePath;
    shim.paths = Module._nodeModulePaths(path.dirname(sourcePath));
    const originalRequire = shim.require.bind(shim);
    shim.require = (id) => id === "siyuan"
        ? {...require("./stub-siyuan.cjs"), Plugin: class {}}
        : originalRequire(id);
    shim._compile(built.outputFiles[0].text, sourcePath);
    return shim.exports;
}

const Plugin = loadSource("../src/index.ts").default;
const {normalizeSavedDiscoveryViews} = loadSource("../src/model/storage.ts");
const DOC = "20261016000001-aaaaaaa";
const DOC_TWO = "20261016000002-bbbbbbb";
const NOTEBOOK = "20261016000003-ccccccc";
const NOTEBOOK_TWO = "20261016000004-ddddddd";
const makeView = (overrides = {}) => ({
    id: "xlc-view-notebook1", name: "客服话术", tag: "客服", scope: "notebook",
    targetDocId: "", targetNotebookId: NOTEBOOK, pathLabel: "原笔记本", defaultCategory: "客服", ...overrides,
});

function makePlugin() {
    const plugin = new Plugin();
    const opened = [];
    const notices = [];
    let persisted = 0;
    plugin.sidecarReady = true;
    plugin.config = {mode: "doc"};
    plugin.state = {search: {savedDiscoveryViews: []}};
    plugin.discovery = {discoverNotebook: async () => {}};
    // Saved notebook rules must not inspect the current editor or the moved/deleted anchor.
    plugin.host = {currentDocId: () => { throw new Error("unexpected current-document fallback"); }};
    plugin.kernelClient = {request: async () => { throw new Error("unexpected anchor lookup"); }};
    plugin.library = {};
    plugin.showDiscoveryDialog = (...args) => opened.push(args);
    plugin.notify = (kind, message) => notices.push({kind, message});
    plugin.i18nFn = () => (key, ...args) => [key, ...args].join(":");
    plugin.persistSoon = () => { persisted++; };
    return {plugin, opened, notices, get persisted() { return persisted; }};
}

test("笔记本视图保留真实笔记本 ID，固定规则不依赖入口文档", () => {
    const views = normalizeSavedDiscoveryViews([
        makeView({targetDocId: DOC}),
        makeView({id: "xlc-view-notebook2", scope: "selected-notebook", targetNotebookId: NOTEBOOK_TWO}),
        makeView({id: "xlc-view-notebook3", targetNotebookId: "20261016"}),
    ]);
    assert.equal(views.length, 2);
    assert.equal(views[0].targetNotebookId, NOTEBOOK);
    assert.equal(views[0].targetDocId, "");
    assert.equal(views[1].targetNotebookId, NOTEBOOK_TWO);
});

test("旧锚文档笔记本视图保留为可见规则，不猜测其当前笔记本", () => {
    const [legacy] = normalizeSavedDiscoveryViews([makeView({targetDocId: DOC, targetNotebookId: ""})]);
    assert.equal(legacy.targetDocId, DOC);
    assert.equal(legacy.targetNotebookId, "");
    const {plugin, opened, notices} = makePlugin();
    plugin.openSavedDiscoveryView(legacy);
    assert.equal(opened.length, 0);
    assert.deepEqual(notices, [{kind: "error", message: "discoverySavedNotebookUnfixed"}]);
});

test("重开笔记本视图只传冻结 ID，锚文档移动或删除不会改变目标", async (t) => {
    for (const anchor of [DOC, "", "deleted-anchor"]) {
        await t.test(`anchor=${anchor || "none"}`, () => {
            const {plugin, opened, notices} = makePlugin();
            plugin.openSavedDiscoveryView(makeView({targetDocId: anchor}));
            assert.equal(notices.length, 0);
            assert.equal(opened.length, 1);
            const [docId, scope, pathLabel, treeRoot, preset] = opened[0];
            assert.equal(docId, "");
            assert.equal(scope, "notebook");
            assert.equal(pathLabel, "原笔记本");
            assert.equal(treeRoot, undefined);
            assert.deepEqual(preset, {
                initialTag: "客服", initialNotebookId: NOTEBOOK, autoSelectFiltered: true,
                referenceOnly: true, defaultCategory: "客服",
            });
        });
    }
});

test("缺少固定笔记本扫描能力时不回退锚文档的当前笔记本", () => {
    const {plugin, opened, notices} = makePlugin();
    plugin.discovery = {discoverCurrentNotebook: async () => { throw new Error("unsafe anchor fallback"); }};
    plugin.openSavedDiscoveryView(makeView({targetDocId: DOC}));
    assert.equal(opened.length, 0);
    assert.deepEqual(notices, [{kind: "info", message: "discoveryNotebookUnavailable"}]);
});

test("新保存笔记本视图必须固定目标，同笔记本不同入口文档保存保持幂等", () => {
    const harness = makePlugin();
    const {plugin} = harness;
    const first = makeView({targetDocId: DOC});
    delete first.id;
    assert.equal(plugin.saveDiscoveryView(first), true);
    const savedId = plugin.state.search.savedDiscoveryViews[0].id;
    assert.equal(plugin.saveDiscoveryView({...first, targetDocId: DOC_TWO, defaultCategory: "更新分类"}), true);
    const views = plugin.state.search.savedDiscoveryViews;
    assert.equal(views.length, 1);
    assert.equal(views[0].id, savedId);
    assert.equal(views[0].targetDocId, "");
    assert.equal(views[0].targetNotebookId, NOTEBOOK);
    assert.equal(views[0].defaultCategory, "更新分类");
    assert.equal(harness.persisted, 2);
});

test("缺固定 ID 的新笔记本视图返回失败并保留原侧车", () => {
    const harness = makePlugin();
    const before = [makeView()];
    harness.plugin.state.search.savedDiscoveryViews = before;
    const invalid = makeView({targetDocId: DOC, targetNotebookId: ""});
    delete invalid.id;
    assert.equal(harness.plugin.saveDiscoveryView(invalid), false);
    assert.equal(harness.plugin.state.search.savedDiscoveryViews, before);
    assert.equal(harness.persisted, 0);
    assert.deepEqual(harness.notices, [{kind: "error", message: "discoverySaveViewInvalid"}]);
});

test("不同固定笔记本的同名标签视图不会相互覆盖", () => {
    const {plugin} = makePlugin();
    const first = makeView();
    delete first.id;
    assert.equal(plugin.saveDiscoveryView(first), true);
    assert.equal(plugin.saveDiscoveryView({...first, targetNotebookId: NOTEBOOK_TWO}), true);
    assert.equal(plugin.state.search.savedDiscoveryViews.length, 2);
    assert.deepEqual(plugin.state.search.savedDiscoveryViews.map((view) => view.targetNotebookId), [NOTEBOOK_TWO, NOTEBOOK]);
});

test("文档与树视图仍要求合法文档目标，不因笔记本例外放宽", async (t) => {
    for (const scope of ["document", "tree"]) {
        await t.test(scope, () => {
            const {plugin, opened, notices} = makePlugin();
            plugin.discovery.discoverTree = async () => {};
            plugin.library.searchDocs = async () => {};
            plugin.openSavedDiscoveryView(makeView({scope, targetDocId: ""}));
            assert.equal(opened.length, 0);
            assert.deepEqual(notices, [{kind: "error", message: "discoverySourceUnavailable"}]);
        });
    }
});
