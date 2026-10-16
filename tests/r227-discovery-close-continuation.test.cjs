const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const Module = require("node:module");
const {buildSync} = require("esbuild");

const sourcePath = path.resolve(__dirname, "../src/index.ts");
const built = buildSync({
    entryPoints: [sourcePath], bundle: true, platform: "node", format: "cjs", write: false,
    external: ["siyuan", "./ui/discovery-dialog"],
    alias: {"@": path.resolve(__dirname, "../src")}, loader: {".scss": "empty"},
});
const shim = new Module(sourcePath);
shim.filename = sourcePath;
shim.paths = Module._nodeModulePaths(path.dirname(sourcePath));
const originalRequire = shim.require.bind(shim);
shim.require = (id) => {
    if (id === "siyuan") return {...require("./stub-siyuan.cjs"), Plugin: class {}};
    if (id === "./ui/discovery-dialog") return {
        openDiscoveryDialog(deps, options) {
            const controller = {close: () => true};
            deps.service.opened.push({options, controller});
            return controller;
        },
    };
    return originalRequire(id);
};
shim._compile(built.outputFiles[0].text, sourcePath);
const Plugin = shim.exports.default;
const DOC = "20261016000001-aaaaaaa";
const DOC_TWO = "20261016000002-bbbbbbb";
const NOTEBOOK = "20261016000003-ccccccc";

function makePlugin(close) {
    const plugin = new Plugin();
    const old = {close};
    const opened = [];
    plugin.discoveryDialog = old;
    plugin.discovery = {opened};
    plugin.library = {};
    plugin.state = {search: {savedDiscoveryViews: []}};
    plugin.i18nFn = () => (key) => key;
    return {plugin, old, opened};
}

test("同步关闭成功只打开一次新视图并保留完整目标预设", () => {
    let closes = 0;
    const {plugin, opened} = makePlugin((force, onClosed) => {
        assert.equal(force, false);
        closes++;
        onClosed?.();
        return true;
    });
    const preset = {initialTag: "客服", initialNotebookId: NOTEBOOK, referenceOnly: true, autoSelectFiltered: true};
    plugin.showDiscoveryDialog("", "notebook", "冻结笔记本", undefined, preset);
    assert.equal(closes, 1);
    assert.equal(opened.length, 1);
    assert.equal(plugin.discoveryDialog, opened[0].controller);
    assert.deepEqual(opened[0].options, {
        docId: "", scope: "notebook", sourcePath: "冻结笔记本", initialTreeRootId: undefined,
        title: undefined, ...preset,
    });
});

test("延迟确认成功后继续打开请求的树视图，迟到重复回调不双开", () => {
    let completeClose;
    const {plugin, old, opened} = makePlugin((force, onClosed) => {
        assert.equal(force, false);
        completeClose = onClosed;
        return false;
    });
    plugin.showDiscoveryDialog(DOC, "tree", "目标树", DOC, {initialTag: "模板"});
    assert.equal(opened.length, 0);
    assert.equal(plugin.discoveryDialog, old);
    assert.equal(typeof completeClose, "function");
    completeClose();
    completeClose();
    assert.equal(opened.length, 1);
    assert.equal(opened[0].options.docId, DOC);
    assert.equal(opened[0].options.initialTreeRootId, DOC);
    assert.equal(opened[0].options.scope, "tree");
    assert.equal(opened[0].options.initialTag, "模板");
});

test("取消或拒绝关闭时不提前打开替代视图", () => {
    const {plugin, old, opened} = makePlugin(() => false);
    plugin.showDiscoveryDialog(DOC, "document");
    assert.equal(opened.length, 0);
    assert.equal(plugin.discoveryDialog, old);
});

test("关闭确认完成前插件卸载，不再打开新视图", () => {
    let completeClose;
    const {plugin, opened} = makePlugin((_force, onClosed) => {
        completeClose = onClosed;
        return false;
    });
    plugin.showDiscoveryDialog(DOC, "document");
    plugin.unloading = true;
    completeClose();
    assert.equal(opened.length, 0);
});

test("旧关闭回调迟到时不会替换已经属于另一控制器的窗口", () => {
    let completeClose;
    const {plugin, opened} = makePlugin((_force, onClosed) => {
        completeClose = onClosed;
        return false;
    });
    plugin.showDiscoveryDialog(DOC, "document");
    const replacement = {close: () => true};
    plugin.discoveryDialog = replacement;
    completeClose();
    assert.equal(opened.length, 0);
    assert.equal(plugin.discoveryDialog, replacement);
});

test("同一确认过程重复请求时只延续控制器接受的第一个请求", () => {
    let completeClose;
    const {plugin, opened} = makePlugin((_force, onClosed) => {
        completeClose ??= onClosed;
        return false;
    });
    plugin.showDiscoveryDialog(DOC, "document", "第一个目标");
    plugin.showDiscoveryDialog(DOC_TWO, "document", "第二个目标");
    assert.equal(opened.length, 0);
    completeClose();
    assert.equal(opened.length, 1);
    assert.equal(opened[0].options.docId, DOC);
    assert.equal(opened[0].options.sourcePath, "第一个目标");
});
