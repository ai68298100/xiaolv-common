const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const {buildSync} = require("esbuild");

const root = path.resolve(__dirname, "..");
function loadSource(relative, extra = "") {
    const sourcePath = path.join(root, relative);
    const built = buildSync({
        stdin: {contents: fs.readFileSync(sourcePath, "utf8") + extra, resolveDir: path.dirname(sourcePath), sourcefile: sourcePath, loader: "ts"},
        bundle: true, platform: "node", format: "cjs", write: false,
        external: ["siyuan"], alias: {"@": path.join(root, "src")}, loader: {".scss": "empty"}, logLevel: "silent",
    });
    const loaded = new Module(sourcePath);
    loaded.filename = sourcePath;
    loaded.paths = Module._nodeModulePaths(root);
    const originalRequire = loaded.require.bind(loaded);
    loaded.require = (id) => id === "siyuan" ? {...require("./stub-siyuan.cjs"), Plugin: class {}} : originalRequire(id);
    loaded._compile(built.outputFiles[0].text, sourcePath);
    return loaded.exports;
}
const Plugin = loadSource("src/index.ts").default;
const {buildMarkdownExport} = loadSource("src/service/export-markdown.ts");
const {collectKramdown, openPackExportDialog, formatExportError, ExportIntegrityError: SettingsExportError} = loadSource("src/ui/settings-dialog.ts", "\nexport {collectKramdown, openPackExportDialog, formatExportError, ExportIntegrityError};");

const items = ["xlc-exportaudit01", "xlc-exportaudit02", "xlc-exportaudit03"].map((id) => ({
    id, blockId: "20261018000001-aaaaaaa", libraryDocId: "20261018000002-bbbbbbb", itemType: "markdown",
    title: id, alias: "", tags: [], category: "", summary: "", source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
    url: "", targetBlockId: "", createdAt: 1, updatedAt: 1, droppedFields: [],
}));
const completeIndex = () => ({items: new Map(items.map((item) => [item.id, item])), entries: [], truncated: false, errors: []});

async function startedPlugin(rawState, readError = false) {
    const plugin = new Plugin();
    const writes = [];
    plugin.name = "xiaolv-common";
    plugin.addIcons = () => {};
    plugin.registerEntries = () => {};
    plugin.registerCommands = () => {};
    plugin.applyPinyinAdapter = () => {};
    plugin.i18nFn = () => (key) => key;
    plugin.bootServices = () => {
        plugin.registry = {restore() {}};
        plugin.ai = {updateSettings() {}};
        plugin.library = {setConfig() {}};
    };
    plugin.loadData = async (key) => {
        if (key !== "state.json") return null;
        if (readError) throw new Error("read failed");
        return rawState;
    };
    plugin.saveData = async (key, value) => { writes.push({key, value: structuredClone(value)}); };
    await plugin.onload();
    return {plugin, writes};
}

test("R234 未来版本侧车：偏好保存与卸载均不覆盖原始数据", async () => {
    const raw = {schemaVersion: 99, favorites: ["future-id"], unknownFutureField: "retain"};
    const {plugin, writes} = await startedPlugin(raw);
    plugin.persistSidecar("state.json", plugin.state);
    await plugin.onunload();
    assert.deepEqual(writes, []);
    assert.equal(raw.unknownFutureField, "retain");
});

test("R234 侧车读取失败或尚未读取：卸载不保存空默认值", async () => {
    const {plugin, writes} = await startedPlugin(undefined, true);
    await plugin.onunload();
    assert.deepEqual(writes, []);
    const early = new Plugin();
    early.i18nFn = () => (key) => key;
    early.saveData = async () => { throw new Error("must not write before read"); };
    early.persistSidecar("state.json", {});
});

test("R234 兼容侧车及首次空侧车：允许正常偏好保存", async () => {
    for (const raw of [null, {schemaVersion: 2, favorites: ["xlc-exportaudit01"]}]) {
        const {plugin, writes} = await startedPlugin(raw);
        plugin.persistSidecar("state.json", plugin.state);
        assert.equal(writes.length, 1);
        assert.equal(writes[0].value.schemaVersion, 2);
        plugin.persistSidecar("config.json", {mode: "doc"});
        assert.equal(writes[1].key, "config.json");
    }
});

test("R234 JSON 导出：正文读取失败时拒绝生成缺项备份", async () => {
    const plugin = new Plugin();
    plugin.library = {ensureIndex: async () => completeIndex(), getStoredItemKramdown: async (item) => item === items[1]
        ? {ok: false, reason: "timeout", message: "read timeout"} : {ok: true, data: "body"}};
    await assert.rejects(plugin.exportBundle(), /export-item-unreadable.*read timeout/);
});

test("R234 JSON 和模板包导出：索引截断、扫描错误或停止均不报完整成功", async () => {
    for (const bad of [{truncated: true}, {errors: ["one document failed"]}, {stopped: true}]) {
        const library = {ensureIndex: async () => ({...completeIndex(), ...bad})};
        const plugin = new Plugin();
        plugin.library = library;
        await assert.rejects(plugin.exportBundle(), /export-index-incomplete/);
        await assert.rejects(openPackExportDialog({t: (key) => key, library}), /export-index-incomplete/);
    }
});

test("R234 JSON 导出：所有条目及合法空正文完整保留", async () => {
    const plugin = new Plugin();
    plugin.library = {ensureIndex: async () => completeIndex(), getStoredItemKramdown: async (item) => ({ok: true, data: item === items[1] ? "" : "body"})};
    const result = JSON.parse(await plugin.exportBundle());
    assert.equal(result.items.length, items.length);
    assert.equal(result.items[1].kramdown, "");
});

test("R234 模板包正文采集：读取失败不会被转换为空正文", async () => {
    const ctx = {library: {getStoredItemKramdown: async () => ({ok: false, message: "read timeout"})}};
    await assert.rejects(collectKramdown(ctx, items), /export-item-unreadable.*read timeout/);
});

test("R234 Markdown 构建器：缺正文拒绝导出，合法空正文可往返", async () => {
    await assert.rejects(buildMarkdownExport(items, new Map(), async () => null), /export-body-missing/);
    const result = await buildMarkdownExport(items, new Map(items.map((item) => [item.id, ""])), async () => null, {name: "完整包"});
    const markdown = new TextDecoder().decode(result.entries[0].data);
    assert.equal(result.itemCount, items.length);
    assert.equal((markdown.match(/<!-- xlc-item/g) || []).length, items.length);
    assert.match(markdown, /items: 3/);
});

test("R234 Markdown 构建器：超限整包拒绝，不返回虚报条数的截断包", async () => {
    await assert.rejects(buildMarkdownExport(items, new Map(items.map((item) => [item.id, "x".repeat(40000)])), async () => null), /export-too-large: 100000/);
});

test("R234 导出完整性错误在设置页使用对应本地化文案", () => {
    const calls = [];
    const ctx = {t: (...args) => { calls.push(args); return args[0]; }};
    for (const reason of ["index-incomplete", "item-unreadable", "body-missing", "too-large"]) {
        formatExportError(ctx, new SettingsExportError(reason, "条目", "详情"));
    }
    assert.deepEqual(calls, [["exportIncompleteIndex"], ["exportItemReadFailed", "条目", "详情"], ["exportBodyMissing", "条目"], ["exportTooLarge", "详情"]]);
});
