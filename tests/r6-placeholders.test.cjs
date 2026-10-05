// R6：动态占位符（替换语义/关闭保留/未知保留/命名空间不误伤思源模板）+ 执行器接线 + 默认开关。
const test = require("node:test");
const assert = require("node:assert");
const {placeholders, storage, commands} = {
    placeholders: require("./.build/entry.cjs").placeholders,
    storage: require("./.build/entry.cjs").storage,
    commands: require("./.build/entry.cjs").commands,
};
// placeholders 模块从 entry 导出（entry.ts R6 增补）
const ph = placeholders;

const NOW = new Date(2026, 9, 6, 14, 5); // 2026-10-06 14:05 周二

test("门禁：占位符默认开；显式关闭保留", () => {
    assert.equal(storage.normalizeState(null).search.placeholders, true);
    assert.equal(storage.normalizeState({search: {placeholders: false}}).search.placeholders, false);
});

test("替换语义：date/time/datetime/weekday", () => {
    assert.equal(ph.applyPlaceholders("今天 {{xlc:date}} 汇报", NOW, true), "今天 2026-10-06 汇报");
    assert.equal(ph.applyPlaceholders("{{xlc:time}} 开会", NOW, true), "14:05 开会");
    assert.equal(ph.applyPlaceholders("{{xlc:datetime}}", NOW, true), "2026-10-06 14:05");
    assert.equal(ph.applyPlaceholders("周历：{{xlc:weekday}}", NOW, true), "周历：周二");
});

test("关闭时一字不改；未知占位符原样保留", () => {
    const raw = "{{xlc:date}} {{xlc:unknown}} {{date}}";
    assert.equal(ph.applyPlaceholders(raw, NOW, false), raw);
    assert.equal(ph.applyPlaceholders(raw, NOW, true), "2026-10-06 {{xlc:unknown}} {{date}}");
});

test("不误伤思源模板语法（无 xlc: 命名空间的花括号不动）", () => {
    const tpl = "{{select * from blocks}} {{ title }}";
    assert.equal(ph.applyPlaceholders(tpl, NOW, true), tpl);
});

test("listPlaceholders 诊断", () => {
    assert.deepEqual(ph.listPlaceholders("{{xlc:date}}{{xlc:time}}{{xlc:date}}"), ["date", "time"]);
    assert.deepEqual(ph.listPlaceholders("无占位符"), []);
});

function makeItem(overrides = {}) {
    return {
        id: "xlc-ph00000001", blockId: "20240101120000-abcdefg", libraryDocId: "20240101120001-hijklmn",
        itemType: "text", title: "日报开头", alias: "", tags: [], category: "", summary: "",
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
        ...overrides,
    };
}

function makeKernel() {
    return {
        request(endpoint, payload = {}) {
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: payload.id, kramdown: "日报 {{xlc:date}}"});
            if (endpoint === "checkBlocksExist") return Promise.resolve({[payload.ids?.[0] ?? "x"]: true});
            return Promise.resolve(null);
        },
    };
}

function makeHost(overrides = {}) {
    return {
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: () => true,
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => null,
        ...overrides,
    };
}

function makeExecutor(host, placeholderHook) {
    const {LibraryService} = require("./.build/entry.cjs").library;
    const library = new LibraryService(makeKernel());
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    return new commands.ActionExecutor(library, host, () => {}, undefined, placeholderHook);
}

test("执行器接线：插入载荷替换占位符（存储与库内容不受影响）", async () => {
    const inserted = [];
    const executor = makeExecutor(makeHost({insertMarkdown: (md) => {
        inserted.push(md);
        return true;
    }}), {enabled: () => true, now: () => NOW});
    await executor.run(makeItem(), "insert");
    assert.equal(inserted[0], "日报 2026-10-06");

    const clipboard = [];
    const copyExecutor = makeExecutor(makeHost({writeClipboard: async (t) => {
        clipboard.push(t);
        return true;
    }}), {enabled: () => true, now: () => NOW});
    await copyExecutor.run(makeItem(), "copy");
    assert.equal(clipboard[0], "日报 2026-10-06");
});

test("执行器接线：开关关闭时原样插入（模板原文）", async () => {
    const inserted = [];
    const executor = makeExecutor(makeHost({insertMarkdown: (md) => {
        inserted.push(md);
        return true;
    }}), {enabled: () => false, now: () => NOW});
    await executor.run(makeItem(), "insert");
    assert.equal(inserted[0], "日报 {{xlc:date}}");
});
