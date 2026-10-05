// R14：捕获去重防护（纯函数门禁）+ Agent 只读搜索（元数据出域门禁 + 负向验证）。
const test = require("node:test");
const assert = require("node:assert");
const {dedupe, service: serviceModule} = {
    dedupe: require("./.build/entry.cjs").dedupe,
    service: require("./.build/entry.cjs").service,
};

test("门禁：去重——同文命中/大小写与空白归一/短内容不误报/无命中返回 null", () => {
    const entries = [
        {id: "xlc-a000000001", title: "已有条目", summary: "尊敬的王总： 关于本期交付延期"},
        {id: "xlc-b000000001", title: "另一条", summary: "完全不同"},
    ];
    // 同文（含多余空白）
    assert.deepEqual(
        dedupe.findDuplicateByContent("尊敬的王总：\n\n  关于本期交付延期  ", entries),
        {id: "xlc-a000000001", title: "已有条目"},
    );
    // 无命中
    assert.equal(dedupe.findDuplicateByContent("别的完全不一样的内容", entries), null);
    // 过短内容不误报
    assert.equal(dedupe.findDuplicateByContent("ok", entries), null);
    // 空内容
    assert.equal(dedupe.findDuplicateByContent("   ", entries), null);
});

test("Agent 搜索：命中返回元数据四字段（绝无 summary/正文）", async () => {
    const {LibraryService} = require("./.build/entry.cjs").library;
    const {XiaolvCommonService} = require("./.build/entry.cjs").service;
    const {AiAssistant} = require("./.build/entry.cjs").ai;
    const {ProviderRegistry} = require("./.build/entry.cjs").providers;
    const B1 = "20240101120000-aaaaaaa";
    const kernel = {
        request(endpoint, payload = {}) {
            if (endpoint === "getChildBlocks") return Promise.resolve([{id: B1, type: "p"}]);
            if (endpoint === "batchGetBlockAttrs") {
                const out = {};
                for (const id of payload.ids ?? []) out[id] = {"custom-xlc-id": "xlc-agent00001", "custom-xlc-title": "道歉回复模板", "custom-xlc-tags": "客服"};
                return Promise.resolve(out);
            }
            return Promise.resolve(null);
        },
    };
    const library = new LibraryService(kernel);
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const state = {schemaVersion: 2, favorites: [], recents: [], sort: "manual", uiPrefs: {lastTypeFilter: "", lastTagFilter: ""}, providers: [], ai: {enabled: false, shareContent: false}, search: {pinyin: false, placeholders: true}};
    const service = new XiaolvCommonService({
        library,
        executor: {},
        registry: new ProviderRegistry(),
        ai: new AiAssistant({request: async () => null}, state.ai),
        state,
        onStateChange: () => {},
    });
    const out = await service.searchForAgent("道歉");
    assert.ok(out.result.includes("1 条匹配"));
    const items = out.structuredContent.items;
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "道歉回复模板");
    assert.deepEqual(Object.keys(items[0]).sort(), ["id", "itemType", "tags", "title"]);
    // 空结果
    const none = await service.searchForAgent("不存在的关键词xyz");
    assert.ok(none.result.includes("没有匹配"));
    assert.deepEqual(none.structuredContent.items, []);
});
