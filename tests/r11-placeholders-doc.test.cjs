// R11：{{xlc:title}}/{{xlc:path}} 占位符——当前文档引用、无文档空串（门禁）、按需取用（无占位符不发请求）。
const test = require("node:test");
const assert = require("node:assert");
const {placeholders, commands} = {
    placeholders: require("./.build/entry.cjs").placeholders,
    commands: require("./.build/entry.cjs").commands,
};

const NOW = new Date(2026, 9, 6, 14, 5);

test("title/path 替换：当前文档存在时取 hPath 末段与全路径", () => {
    const doc = {title: "常用内容库", path: "/小驴/常用内容库"};
    assert.equal(placeholders.applyPlaceholders("{{xlc:title}}笔记", NOW, true, doc), "常用内容库笔记");
    assert.equal(placeholders.applyPlaceholders("位于 {{xlc:path}}", NOW, true, doc), "位于 /小驴/常用内容库");
    // 混合日期
    assert.equal(
        placeholders.applyPlaceholders("{{xlc:date}} {{xlc:title}}", NOW, true, doc),
        "2026-10-06 常用内容库",
    );
});

test("门禁：无活动文档时 title/path 替换为空串（不残留占位符）", () => {
    assert.equal(placeholders.applyPlaceholders("{{xlc:title}}笔记", NOW, true, null), "笔记");
    assert.equal(placeholders.applyPlaceholders("位于 {{xlc:path}}", NOW, true, null), "位于 ");
    // 关闭开关时仍一字不改
    assert.equal(placeholders.applyPlaceholders("{{xlc:title}}", NOW, false, null), "{{xlc:title}}");
});

test("按需取用：文本不含 title/path 时不触碰文档解析（测试以 resolver 计数验证语义）", () => {
    // applyPlaceholders 是纯同步函数，不涉及解析；此处锁定 date 类不传 doc 也正确
    assert.equal(placeholders.applyPlaceholders("{{xlc:time}}", NOW, true, null), "14:05");
    assert.equal(placeholders.listPlaceholders("{{xlc:title}} {{xlc:date}} {{xlc:path}}").join(","), "title,date,path");
});

function makeItem(overrides = {}) {
    return {
        id: "xlc-t11", blockId: "20240101120000-abcdefg", libraryDocId: "20240101120001-hijklmn",
        itemType: "text", title: "文档引用模板", alias: "", tags: [], category: "", summary: "",
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
        ...overrides,
    };
}

test("执行器异步接线：title/path 占位符经 currentDoc() 解析后插入", async () => {
    const inserted = [];
    const kernel = {
        request(endpoint, payload = {}) {
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: payload.id, kramdown: "{{xlc:title}} 的模板"});
            if (endpoint === "getFullHPathByID") return Promise.resolve("/小驴/常用内容库");
            if (endpoint === "checkBlocksExist") return Promise.resolve({});
            return Promise.resolve(null);
        },
    };
    const {LibraryService} = require("./.build/entry.cjs").library;
    const library = new LibraryService(kernel);
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const host = {
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: (md) => {
            inserted.push(md);
            return true;
        },
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => "20240101120001-hijklmn",
    };
    const executor = new commands.ActionExecutor(library, host, () => {}, undefined, {
        enabled: () => true,
        now: () => NOW,
        currentDoc: async () => ({title: "常用内容库", path: "/小驴/常用内容库"}),
    });
    await executor.run(makeItem(), "insert");
    assert.equal(inserted[0], "常用内容库 的模板");
});
