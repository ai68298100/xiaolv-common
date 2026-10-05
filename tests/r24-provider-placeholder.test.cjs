// R24：provider payload 占位符语义统一（xiaolv-common/v1 定案）——插入前渲染，与库条目一致。
const test = require("node:test");
const assert = require("node:assert");
const {commands} = require("./.build/entry.cjs");
const NOW = new Date(2026, 9, 6, 14, 5);

function makeExecutor(hook) {
    const {LibraryService} = require("./.build/entry.cjs").library;
    const library = new LibraryService({request: async () => null});
    library.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const host = {
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: () => true,
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => "20240101120001-hijklmn",
    };
    return new commands.ActionExecutor(library, host, () => {}, undefined, hook);
}

test("门禁：provider payload 插入前渲染占位符（与库条目语义一致）", async () => {
    const executor = makeExecutor({
        enabled: () => true,
        now: () => NOW,
        currentDoc: async () => ({title: "演示文档", path: "/小驴/演示文档"}),
    });
    const rendered = await executor.renderProviderOutput("会议时间：{{xlc:date}} {{xlc:time}}（来自 {{xlc:title}}）");
    assert.equal(rendered, "会议时间：2026-10-06 14:05（来自 演示文档）");
});

test("关闭开关时 provider payload 原样保留；无 currentDoc 时 title/path 渲染为空", async () => {
    const off = makeExecutor({enabled: () => false, now: () => NOW, currentDoc: async () => null});
    assert.equal(await off.renderProviderOutput("{{xlc:date}}"), "{{xlc:date}}");
    const noDoc = makeExecutor({enabled: () => true, now: () => NOW, currentDoc: async () => null});
    assert.equal(await noDoc.renderProviderOutput("来自 {{xlc:title}}"), "来自 ");
});
