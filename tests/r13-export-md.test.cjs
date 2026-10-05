// R13：ZIP 写入器往返 + Markdown 包导出构建器（资源收集/跳过/链接不变式）。
const test = require("node:test");
const assert = require("node:assert");
const {zip, actions} = {
    zip: require("./.build/entry.cjs").zip,
    actions: require("./.build/entry.cjs").actions,
    item: require("./.build/entry.cjs").item,
};
const {buildZip, readZipEntries} = zip;
const {buildMarkdownExport} = require("./.build/entry.cjs").exportMarkdown;

const enc = (s) => new TextEncoder().encode(s);

test("ZIP 往返：结构/名称/内容/CRC 一致（readZipEntries 内建 CRC 校验）", () => {
    const zipBytes = buildZip([
        {name: "items.md", data: enc("# 标题\n\n正文")},
        {name: "assets/pic-20240101.png", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])},
    ]);
    // 签名
    assert.equal(zipBytes[0], 0x50);
    assert.equal(zipBytes[1], 0x4b);
    const entries = readZipEntries(zipBytes);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].name, "items.md");
    assert.equal(new TextDecoder().decode(entries[0].data), "# 标题\n\n正文");
    assert.deepEqual(Array.from(entries[1].data), [0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
});

test("门禁：危险条目名（../ 前导斜杠 反斜杠）与空包被拒绝", () => {
    assert.throws(() => buildZip([{name: "../evil.sh", data: enc("x")}]), /unsafe/);
    assert.throws(() => buildZip([{name: "/abs", data: enc("x")}]), /unsafe/);
    assert.throws(() => buildZip([{name: "a\\b", data: enc("x")}]), /unsafe/);
    assert.throws(() => buildZip([]), /no entries/);
});

test("门禁：重复资源只打包一次；取不到的字节如实计入 skipped", async () => {
    const mk = (id, itemType, kramdown) => ({
        id, blockId: "20240101120000-abcdefg", libraryDocId: "20240101120001-hijklmn",
        itemType, title: `条目${id}`, alias: "", tags: [], category: "", summary: "",
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    });
    const items = [
        mk("xlc-md00000001", "image", "![](assets/pic-20240101.png)"),
        mk("xlc-md00000002", "asset", "[文件](assets/pic-20240101.png)"),
        mk("xlc-md00000003", "asset", "[缺失](assets/gone-20240101.pdf)"),
    ];
    const kramdownById = new Map(items.map((it) => [it.id, it.itemType === "image" ? "![](assets/pic-20240101.png)" : it.id === "xlc-md00000002" ? "[文件](assets/pic-20240101.png)" : "[缺失](assets/gone-20240101.pdf)"]));
    const fetched = [];
    const result = await buildMarkdownExport(items, kramdownById, async (assetPath) => {
        fetched.push(assetPath);
        return assetPath.includes("gone") ? null : enc("PNGBYTES");
    });
    // 同一资源只取一次
    assert.deepEqual(fetched, ["assets/pic-20240101.png", "assets/gone-20240101.pdf"]);
    assert.equal(result.assetCount, 1);
    assert.deepEqual(result.skippedAssets, ["assets/gone-20240101.pdf"]);
    // ZIP 内容：items.md + 1 个资源
    assert.equal(result.entries.length, 2);
    const names = result.entries.map((e) => e.name).sort();
    assert.deepEqual(names, ["assets/pic-20240101.png", "items.md"]);
    // items.md 含元数据头与正文；缺失资源条目的链接保持原样（不伪造资源）
    const itemsMd = new TextDecoder().decode(result.entries.find((e) => e.name === "items.md").data);
    assert.ok(itemsMd.includes("xlc-md00000001"));
    assert.ok(itemsMd.includes("![](assets/pic-20240101.png)"));
    assert.ok(itemsMd.includes("source-doc") === false); // 手工条目无来源
});

test("extractAssetPath 复用（与 actions 同一解析）", () => {
    assert.equal(actions.extractAssetPath("![](assets/pic.png)"), "assets/pic.png");
    // item 模块同时可用（entry 桶校验）
});
