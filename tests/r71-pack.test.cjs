// R71/F6：模板包清单——导出首部 xlc-pack 注释（name/items/vars）、解析提取 pack 字段、
// 旧格式（无清单）解析不受影响、清单对旧解析透明（条目数不变）。
const test = require("node:test");
const assert = require("node:assert");
const {library: libSvc, exportMarkdown, importMarkdown, variables} = require("./.build/entry.cjs");

const DOC = "20240101120001-hijklmn";

function makeItem(id, itemType, category) {
    return {
        id, blockId: "20240101120000-abcdefg", libraryDocId: DOC, itemType,
        title: `条目 ${id}`, alias: "", tags: [], category: category ?? "", summary: "", varCount: 0,
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    };
}

const NO_ASSETS = async () => null;

test("导出：包名注入首部 xlc-pack 清单（name/items/vars 聚合去重）", async () => {
    const items = [makeItem("xlc-a000000001", "markdown"), makeItem("xlc-b00000001", "markdown")];
    const kd = new Map([
        ["xlc-a000000001", "尊敬的 {{xlc:ask:客户}}：{{xlc:cursor}}"],
        ["xlc-b00000001", "工单 {{xlc:ask:工单号}}，客户 {{xlc:ask:客户}}"],
    ]);
    const result = await exportMarkdown.buildMarkdownExport(items, kd, NO_ASSETS, {name: "客服话术包"});
    const md = new TextDecoder().decode(result.entries[0].data);
    assert.match(md, /<!-- xlc-pack/);
    assert.match(md, /name: 客服话术包/);
    assert.match(md, /items: 2/);
    assert.match(md, /vars: 客户,工单号/);
    assert.deepStrictEqual(result.varNames.sort(), ["客户", "工单号"]);
});

test("导出：无包名时不产生清单（旧格式兼容）", async () => {
    const items = [makeItem("xlc-a000000001", "text")];
    const kd = new Map([["xlc-a000000001", "正文"]]);
    const result = await exportMarkdown.buildMarkdownExport(items, kd, NO_ASSETS);
    const md = new TextDecoder().decode(result.entries[0].data);
    assert.strictEqual(md.includes("xlc-pack"), false);
});

test("解析：从清单提取 pack.name / vars；条目数不受清单影响", () => {
    const md = [
        "<!-- xlc-pack",
        "name: 客服话术包",
        "items: 1",
        "vars: 客户,工单号",
        "-->",
        "# 小驴常用（内测版） · 条目导出",
        "",
        "## 条目一",
        "",
        "<!-- xlc-item",
        `id: xlc-a000000001`,
        "type: text",
        "-->",
        "正文内容",
    ].join("\n");
    const parsed = importMarkdown.parseMarkdownPack(md);
    assert.strictEqual(parsed.items.length, 1);
    assert.strictEqual(parsed.items[0].kramdown, "正文内容");
    assert.deepStrictEqual(parsed.pack, {name: "客服话术包", vars: ["客户", "工单号"]});
});

test("解析：旧格式（无清单）pack 为空；清单位置在条目之后无效", () => {
    const oldMd = [
        "# 导出",
        "## 条目一",
        "<!-- xlc-item",
        "id: xlc-a000000001",
        "type: text",
        "-->",
        "正文",
    ].join("\n");
    assert.strictEqual(importMarkdown.parseMarkdownPack(oldMd).pack, undefined);

    // 清单出现在首个条目之后 → 不视为包清单
    const lateMd = oldMd + "\n\n<!-- xlc-pack\nname: 迟到包\n-->";
    const parsed = importMarkdown.parseMarkdownPack(lateMd);
    assert.strictEqual(parsed.pack, undefined);
    assert.strictEqual(parsed.items.length, 1);
});

test("清单 vars 与 listAskFields 口径一致（date 字段进清单）", () => {
    const fields = variables.listAskFields("{{xlc:ask:跟进日期|date}} {{xlc:ask:客户}}");
    assert.strictEqual(fields.length, 2);
});
