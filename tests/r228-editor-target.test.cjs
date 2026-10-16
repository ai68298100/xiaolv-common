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

const {HostBridge} = loadSource("../src/service/commands.ts");
const Plugin = loadSource("../src/index.ts").default;
const DOC = "20261016000001-aaaaaaa";
const OTHER_DOC = "20261016000002-bbbbbbb";

function makeTarget(overrides = {}) {
    const ancestor = {};
    return {
        editor: {
            protyle: {
                block: {rootID: overrides.rootID === undefined ? DOC : overrides.rootID},
                disabled: overrides.disabled ?? false,
                element: {
                    isConnected: overrides.connected ?? true,
                    contains: (node) => node === ancestor && overrides.contains !== false,
                },
                resolveTrackedRange: () => ({
                    status: overrides.status ?? "resolved",
                    range: {commonAncestorContainer: ancestor},
                }),
            },
        },
        handle: {id: "tracked-target"},
        docId: overrides.docId === undefined ? DOC : overrides.docId,
    };
}

test("HostBridge 接受文档身份一致且跟踪范围仍在编辑器内的连接目标", () => {
    assert.equal(new HostBridge({}, {}).canInsertAtTarget(makeTarget()), true);
});

test("HostBridge 拒绝文档身份改变或缺失的冻结目标", () => {
    const host = new HostBridge({}, {});
    for (const overrides of [{rootID: OTHER_DOC}, {rootID: null}, {docId: null}]) {
        assert.equal(host.canInsertAtTarget(makeTarget(overrides)), false, JSON.stringify(overrides));
    }
});

test("HostBridge 拒绝已禁用的编辑器目标", () => {
    assert.equal(new HostBridge({}, {}).canInsertAtTarget(makeTarget({disabled: true})), false);
});

test("HostBridge 拒绝已断开连接的编辑器目标", () => {
    assert.equal(new HostBridge({}, {}).canInsertAtTarget(makeTarget({connected: false})), false);
});

test("HostBridge 拒绝无法解析的跟踪范围", () => {
    assert.equal(new HostBridge({}, {}).canInsertAtTarget(makeTarget({status: "invalid"})), false);
});

test("HostBridge 拒绝已不属于原编辑器的跟踪范围", () => {
    assert.equal(new HostBridge({}, {}).canInsertAtTarget(makeTarget({contains: false})), false);
});

test("复制失败回执不被移动端待验证提示覆盖", () => {
    const plugin = new Plugin();
    plugin.i18nFn = () => (key) => key;
    for (const code of ["copy-failed", "no-editor-copy-failed"]) {
        assert.equal(plugin.receiptText(code, "回执条目", ["mobile-insert-unverified"]), "copyFailed", code);
    }
});

test("移动端降级复制成功仍显示移动端待验证提示", () => {
    const plugin = new Plugin();
    plugin.i18nFn = () => (key) => key;
    assert.equal(plugin.receiptText("insert-downgraded-copied", "回执条目", ["mobile-insert-unverified"]), "insertPendingMobile");
});
