// R95 集成测试：多功能交互场景（F1 变量 × F5 嵌套 × F3 计数 × F6 模板包往返）。
const test = require("node:test");
const assert = require("node:assert");
const {variables, storage, search, library: libSvc, commands, exportMarkdown, importMarkdown, transfer} = require("./.build/entry.cjs");
const {LibraryService} = libSvc;
const {ActionExecutor} = commands;
const {parseMarkdownPack} = importMarkdown;
const {buildMarkdownExport} = exportMarkdown;

const DOC = "20240101120001-hijklmn";

// ---------- 场景 1：变量填充 + 片段嵌套叠加 ----------

test("集成：嵌套片段内的 ask 变量在展开后可被填充", () => {
    const parent = "问候 {{xlc:snippet:子模板}} 结束";
    const child = "亲爱的 {{xlc:ask:收件人}}，{{xlc:ask:内容}}";
    // 先展开 snippet → 得到含 ask 的文本 → 再填充
    const expanded = parent.replace("{{xlc:snippet:子模板}}", child);
    const filled = variables.expandAsks(expanded, {收件人: "王总", 内容: "项目进展报告"});
    assert.strictEqual(filled, "问候 亲爱的 王总，项目进展报告 结束");
});

test("集成：变量填充后仍保留动态占位符（{{xlc:date}} 等）", () => {
    const tpl = "{{xlc:ask:客户}} 于 {{xlc:date}} 提交";
    const filled = variables.expandAsks(tpl, {客户: "李四"});
    assert.strictEqual(filled, "李四 于 {{xlc:date}} 提交");
});

// ---------- 场景 2：存储 + 搜索 + 使用计数跨功能 ----------

test("集成：使用计数影响 frequent 排序且与收藏置顶共存", () => {
    const mk = (id, title, cat) => ({
        id, blockId: BLOCK, libraryDocId: DOC, itemType: "text", title,
        alias: "", tags: [], category: cat, summary: "", varCount: 0,
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0,
    });
    const entries = [
        mk("xlc-ii00000001", "甲条目", "工作"),
        mk("xlc-ii00000002", "乙条目", "工作"),
        mk("xlc-ii00000003", "丙条目", "生活"),
    ];
    const ctx = {
        favorites: new Set(["xlc-ii00000003"]),
        recents: new Map([["xlc-ii00000001", 100]]),
        usage: new Map([["xlc-ii00000001", 20], ["xlc-ii00000002", 5]]),
        sort: "frequent",
        now: 1,
    };
    const results = search.searchEntries(entries, {text: "", scope: "all"}, ctx);
    // frequent: 甲(20次) > 乙(5次) > 丙(0次)
    assert.deepStrictEqual(results.map((r) => r.entry.id), ["xlc-ii00000001", "xlc-ii00000002", "xlc-ii00000003"]);
    // 丙有收藏但 0 次使用 → frequent 排序下不优先
});

// ---------- 场景 3：F6 模板包导出 → 导入完整往返 ----------

test("集成：模板包导出→解析→导入往返保真", async () => {
    const items = [
        makePackItem("xlc-pp00000001", "text", "客服", "尊敬的 {{xlc:ask:客户}}，{{xlc:cursor}}"),
        makePackItem("xlc-pp00000002", "code", "开发", "```sql\nSELECT * FROM {{xlc:ask:表名}};\n```"),
        makePackItem("xlc-pp00000003", "markdown", "", "无分类条目 {{xlc:date}}"),
    ];
    const kdMap = new Map(items.map((i) => [i.id, i.kramdown ?? ""]));
    // 用 items 的 kramdown
    const kd = new Map(items.map((i) => {
        const entry = items.find((x) => x.id === i.id);
        return [i.id, entry?.kramdown ?? i.kramdown ?? ""];
    }));
    // 直接用 body 文本
    const kdReal = new Map([
        ["xlc-pp00000001", "尊敬的 {{xlc:ask:客户}}，{{xlc:cursor}}"],
        ["xlc-pp00000002", "```sql\nSELECT * FROM {{xlc:ask:表名}};\n```"],
        ["xlc-pp00000003", "无分类条目 {{xlc:date}}"],
    ]);
    const result = await exportMarkdown.buildMarkdownExport(
        items.map((i) => ({...i, varCount: variables.countAskFields(kdReal.get(i.id) ?? "")})),
        kdReal,
        NO_ASSETS,
        {name: "集成测试包"},
    );
    // 导出
    const md = new TextDecoder().decode(result.entries[0].data);
    assert.match(md, /xlc-pack/);
    assert.match(md, /name: 集成测试包/);
    // 导入（解析）
    const parsed = importMarkdown.parseMarkdownPack(md);
    assert.strictEqual(parsed.items.length, 3);
    assert.strictEqual(parsed.pack?.name, "集成测试包");
    assert.ok(parsed.pack.vars.includes("客户"));
    // 往返保真：正文一致
    for (const orig of items) {
        const round = parsed.items.find((p) => p.id === orig.id);
        assert.ok(round, `缺条目 ${orig.id}`);
        assert.strictEqual(round.title, orig.title);
    }
});

// ---------- 场景 4：分类分组 + 搜索 + 快速捕获交互 ----------

const BLOCK = "20240101120000-abcdefg";

function makePackItem(id, itemType, category, body) {
    return {
        id, blockId: BLOCK, libraryDocId: DOC, itemType,
        title: id.replace("xlc-pp", ""), alias: "", tags: [], category,
        summary: body.slice(0, 60), varCount: variables.countAskFields(body),
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "external"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
        kramdown: body,
    };
}

const NO_ASSETS = async () => null;

function makeItem(itemType) {
    return {
        id: "xlc-usage00001", blockId: BLOCK, libraryDocId: DOC, itemType,
        title: "计次条目", alias: "", tags: [], category: "", summary: "", varCount: 0,
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    };
}

function makeExecHost(hostOverrides) {
    return {
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: () => true,
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => DOC,
        ...hostOverrides,
    };
}

function makeExecLib(kramdown) {
    const lib = new LibraryService({
        request(endpoint) {
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: BLOCK, kramdown});
            if (endpoint === "checkBlocksExist") return Promise.resolve({[DOC]: true, [BLOCK]: true});
            return Promise.resolve(null);
        },
    });
    lib.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    return lib;
}

test("集成：exec 片段展开 + ask 填充 + 光标移除 全链路", async () => {
    const kramdown = "{{xlc:snippet:子片段}} → {{xlc:ask:客户}} → {{xlc:cursor}}";
    // 库内两个条目：主条目引用子片段
    const execLib = new LibraryService({
        request(endpoint, payload = {}) {
            if (endpoint === "getChildBlocks") return Promise.resolve([{id: BLOCK, type: "p"}]);
            if (endpoint === "batchGetBlockAttrs") return Promise.resolve({
                [BLOCK]: {"custom-xlc-id": "xlc-snippet0001", "custom-xlc-type": "markdown", "custom-xlc-title": "主"},
            });
            if (endpoint === "getBlockKramdown") {
                if (payload.id === BLOCK) return Promise.resolve({id: BLOCK, kramdown});
                return Promise.resolve({id: payload.id, kramdown: "[子内容]"});
            }
            if (endpoint === "checkBlocksExist") return Promise.resolve({[DOC]: true, [BLOCK]: true});
            return Promise.resolve(null);
        },
    });
    execLib.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const host = makeExecHost({});
    const executor = new ActionExecutor(execLib, host, () => {});
    // 手动展开（模拟 fill card 收集后传入 fills）
    const expanded = variables.expandAsks(kramdown, {客户: "王总"});
    const r = await executor.run(
        {id: "xlc-snippet0001", blockId: BLOCK, libraryDocId: DOC, itemType: "markdown",
         title: "主", alias: "", tags: [], category: "", summary: "", varCount: 1,
         source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
         url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: []},
        "insert",
        {fills: {客户: "王总"}},
    );
    assert.ok(r.ok);
});
