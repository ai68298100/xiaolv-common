const DOC = "20240101120001-hijklmn";
// R31：Markdown 包解析——与 buildMarkdownExport 严格互逆（元数据注释为界）、占位符字面保持、坏块计数。
const test = require("node:test");
const assert = require("node:assert");
const {exportMarkdown, importMarkdown} = {
    exportMarkdown: require("./.build/entry.cjs").exportMarkdown,
    importMarkdown: require("./.build/entry.cjs").importMarkdown,
};

const SAMPLE_MD = `# 小驴常用 · 条目导出

> 导出自思源插件「小驴常用」，共 2 条。

## 项目延期道歉与补偿方案

<!-- xlc-item
id: xlc-md0000000001
type: markdown
tags: 客户沟通,模板
category: 客服
source-doc: 20240101120001-hijklmn
-->

尊敬的王总：

关于本期交付延期，我们深表歉意。

## 延期简短版（IM 用）

<!-- xlc-item
id: xlc-md0000000002
type: text
-->

您好，本次迭代因联调超期，上线推迟 2 天。`;

test("门禁：解析结果与导出格式严格互逆（id/类型/标签/正文逐字段一致）", () => {
    const result = importMarkdown.parseMarkdownPack(SAMPLE_MD);
    assert.equal(result.issues.length, 0);
    assert.equal(result.items.length, 2);
    const first = result.items[0];
    assert.equal(first.id, "xlc-md0000000001");
    assert.equal(first.itemType, "markdown");
    assert.equal(first.title, "项目延期道歉与补偿方案");
    assert.deepEqual(first.tags, ["客户沟通", "模板"]);
    assert.equal(first.category, "客服");
    assert.equal(first.source.sourceDocId, "20240101120001-hijklmn");
    assert.ok(first.kramdown.includes("尊敬的王总"));
    const second = result.items[1];
    assert.equal(second.itemType, "text");
    assert.ok(second.kramdown.includes("联调超期"));
});

test("门禁：正文含 ## 标题不误切（元数据注释才是条目边界）", () => {
    const md = `## 条目一

<!-- xlc-item
id: xlc-md0000000003
type: markdown
-->

正文首行

## 正文内的二级标题

正文尾行`;
    const result = importMarkdown.parseMarkdownPack(md);
    assert.equal(result.items.length, 1);
    assert.ok(result.items[0].kramdown.includes("## 正文内的二级标题"));
    assert.ok(result.items[0].kramdown.includes("正文尾行"));
});

test("坏块计数：坏 ID / 未闭合注释计入 issues 不阻断其余", () => {
    const md = `## 好条目

<!-- xlc-item
id: xlc-md0000000004
type: text
-->

内容

## 坏 ID

<!-- xlc-item
id: not-valid
type: text
-->

内容

<!-- xlc-item
id: xlc-md0000000005`;
    const result = importMarkdown.parseMarkdownPack(md);
    assert.equal(result.items.length, 1);
    assert.equal(result.issues.length, 2);
});

test("R61：md 包 overwrite 同类型更新走 updateBlock（不删旧建新）", async () => {
    const {importMarkdownBundle} = importMarkdown;
    const {LibraryService} = require("./.build/entry.cjs").library;
    const DOC = "20240101120001-hijklmn";
    const B_OLD = "20240101120000-aaaaaaa";
    const calls = [];
    let liveBlocks = [B_OLD];
    const blocks = {
        [B_OLD]: {"custom-xlc-id": "xlc-md0000000001", "custom-xlc-title": "原标题", "custom-xlc-type": "text"},
    };
    const kernel = {
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            switch (endpoint) {
                case "getChildBlocks":
                    return Promise.resolve(liveBlocks.map((id) => ({id, type: "p"})));
                case "batchGetBlockAttrs": {
                    const out = {};
                    for (const id of payload.ids ?? []) out[id] = blocks[id] ?? {};
                    return Promise.resolve(out);
                }
                case "getBlockAttrs":
                    return Promise.resolve(blocks[payload.id] ?? {"custom-xlc-id": "xlc-md0000000001", "custom-xlc-title": "原标题"});
                case "appendBlock": {
                    const n = calls.filter((c) => c.endpoint === "appendBlock").length;
                    const newId = "202401011200" + String(n).padStart(2, "0") + "-newb" + String(n).padStart(3, "0");
                    blocks[newId] = {"custom-xlc-id": "xlc-new" + String(n).padStart(8, "0")};
                    liveBlocks.push(newId);
                    return Promise.resolve([{doOperations: [{id: newId}]}]);
                }
                case "deleteBlock":
                    liveBlocks = liveBlocks.filter((id) => id !== payload.id);
                    return Promise.resolve(null);
                default:
                    return Promise.resolve(null);
            }
        },
    };
    const library = new LibraryService(kernel);
    library.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    await library.ensureIndex();
    const mdText = [
        "## 覆盖后标题",
        "",
        "<!-- xlc-item",
        "id: xlc-md0000000001",
        "type: text",
        "-->",
        "",
        "覆盖后的正文",
    ].join("\n");
    const parsed = importMarkdown.parseMarkdownPack(mdText);
    const receipt = await importMarkdownBundle(library, parsed.items, "overwrite");
    assert.equal(receipt.overwritten, 1);
    assert.equal(receipt.failed, 0);
    // 同类型 overwrite：updateBlock 原地更新，不删旧建新（appendBlock 零调用）
    assert.ok(calls.some((c) => c.endpoint === "updateBlock"), "same-type overwrite must updateBlock");
    assert.ok(!calls.some((c) => c.endpoint === "appendBlock"), "same-type overwrite must NOT append");
    const idx = await library.reindex();
    const ids = idx.entries.filter((e) => e.id === "xlc-md0000000001").length;
    assert.equal(ids, 1, "exactly one block per logical id");
});

test("无元数据注释的外来 Markdown 一律忽略（不吞外来文本）", () => {
    assert.deepEqual(importMarkdown.parseMarkdownPack("# 随便一篇笔记\n\n正文"), {items: [], issues: []});
    assert.deepEqual(importMarkdown.parseMarkdownPack(""), {items: [], issues: []});
});

test("renderItemMetadata 与解析器互逆", () => {
    const item = {
        id: "xlc-roundtrip001", itemType: "markdown", title: "RT", alias: "别名",
        tags: ["a"], category: "c", kramdown: "正文",
        source: {sourceDocId: "20240101120001-hijklmn", sourceBlockId: "", sourceType: "external"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0,
    };
    const meta = importMarkdown.renderItemMetadata(item);
    const parsed = importMarkdown.parseMarkdownPack(`## RT\n\n${meta}\n\n正文`);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].id, "xlc-roundtrip001");
    assert.deepEqual(parsed.items[0].tags, ["a"]);
    assert.equal(parsed.items[0].source.sourceDocId, "20240101120001-hijklmn");
});

test("R35：ZIP 条目名=完整相对路径（子目录资源不重名）+ 确定性输出", async () => {
    const enc = (str) => new TextEncoder().encode(str);
    const mk = (id, kramdown) => ({
        id, blockId: "20240101120000-aaaaaaa", libraryDocId: DOC, itemType: "image",
        title: id, alias: "", tags: [], category: "", summary: "",
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    });
    const items = [
        mk("xlc-z0000000001", "![](assets/a/pic.png)"),
        mk("xlc-z0000000002", "![](assets/b/pic.png)"),
    ];
    const kd = new Map([["xlc-z0000000001", "![](assets/a/pic.png)"], ["xlc-z0000000002", "![](assets/b/pic.png)"]]);
    const result = await exportMarkdown.buildMarkdownExport(items, kd, async (p) => enc(p.includes("a/") ? "BIN" : "BIN2"));
    const names = result.entries.map((e) => e.name).sort();
    assert.deepEqual(names, ["assets/a/pic.png", "assets/b/pic.png", "items.md"], "full relative paths, no collision");
    // 确定性：同输入两次构建，条目名与字节完全一致（固定 DOS 时间戳）
    const again = await exportMarkdown.buildMarkdownExport(items, kd, async (p) => enc(p.includes("a/") ? "BIN" : "BIN2"));
    assert.equal(again.entries.length, result.entries.length);
    for (let i = 0; i < result.entries.length; i++) {
        assert.equal(again.entries[i].name, result.entries[i].name);
        assert.deepEqual(Array.from(again.entries[i].data), Array.from(result.entries[i].data));
    }
});

test("R32：importMarkdownBundle 全字段保真（tags/category/source 不再丢弃）", async () => {
    const {LibraryService} = require("./.build/entry.cjs").library;
    const B1 = "20240101120000-aaaaaaa";
    const calls = [];
    const kernel = {
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            if (endpoint === "getChildBlocks") return Promise.resolve([]);
            if (endpoint === "appendBlock") return Promise.resolve([{doOperations: [{id: B1}]}]);
            return Promise.resolve(null);
        },
    };
    const library = new LibraryService(kernel);
    library.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const items = [{
        id: "xlc-full0000001", title: "全字段", itemType: "text", kramdown: "正文",
        tags: ["工作", "常用"], category: "客服",
        source: {sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120000-aaaaaaa"},
    }];
    const receipt = await importMarkdown.importMarkdownBundle(library, items, "skip");
    assert.equal(receipt.created, 1);
    const setCall = calls.find((c) => c.endpoint === "setBlockAttrs");
    assert.ok(setCall, "setBlockAttrs must be called");
    assert.equal(setCall.payload.attrs["custom-xlc-tags"], "工作,常用");
    assert.equal(setCall.payload.attrs["custom-xlc-category"], "客服");
    assert.equal(setCall.payload.attrs["custom-xlc-src-doc"], "20240101120001-hijklmn");
    assert.equal(setCall.payload.attrs["custom-xlc-src-block"], "20240101120000-aaaaaaa");
});

