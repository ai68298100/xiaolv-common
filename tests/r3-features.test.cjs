// R3：LRU 有界缓存、索引并发构建（顺序确定性）、文档搜索解析、排序切换、内容编辑分派。
const test = require("node:test");
const assert = require("node:assert");
const {lru, library: libModule, search: searchModule, client} = {
    lru: require("./.build/entry.cjs").lru,
    library: require("./.build/entry.cjs").library,
    search: require("./.build/entry.cjs").search,
    client: require("./.build/entry.cjs").client,
};

test("门禁：LRU 容量硬上限（超容淘汰最久未用）", () => {
    const cache = new lru.LruCache(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a"); // 刷新 a
    cache.set("d", 4); // 淘汰 b
    assert.equal(cache.size, 3);
    assert.equal(cache.get("a"), 1);
    assert.equal(cache.get("b"), undefined);
    assert.equal(cache.get("c"), 3);
    assert.equal(cache.get("d"), 4);
    cache.clear();
    assert.equal(cache.size, 0);
    assert.throws(() => new lru.LruCache(0), /capacity/);
});

test("索引并发构建：结果保持原 doc 顺序（确定性），请求数 = 每文档 2", async () => {
    const docs = ["20240101120001-aaaaaaa", "20240101120002-bbbbbbb", "20240101120003-ccccccc", "20240101120004-ddddddd", "20240101120005-eeeeeee"];
    let inFlight = 0;
    let maxInFlight = 0;
    const kernel = {
        request(endpoint, payload = {}) {
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            return new Promise((resolve) => {
                setTimeout(() => {
                    inFlight--;
                    if (endpoint === "getChildBlocks") {
                        resolve([{id: payload.id, type: "p"}]);
                    } else {
                        // batchGetBlockAttrs：{ids: [...]}
                        const out = {};
                        for (const id of payload.ids ?? []) out[id] = {"custom-xlc-id": `xlc-${id.slice(-7).padStart(10, "0")}`};
                        resolve(out);
                    }
                }, 5);
            });
        },
    };
    const service = new libModule.LibraryService(kernel);
    service.setConfig({mode: "doc", notebookIds: [], containerDocIds: docs, createdDocIds: [], configuredAt: 1});
    const idx = await service.buildIndex();
    assert.equal(idx.entries.length, docs.length);
    // 顺序与容器文档顺序一致（并发不乱序）；xlc- 后缀须 ≥10 位（逻辑 ID 规则）
    assert.deepEqual(idx.entries.map((e) => e.id), docs.map((d) => `xlc-${d.slice(-7).padStart(10, "0")}`));
    assert.ok(maxInFlight <= 4, `max concurrency ${maxInFlight}`);
    assert.ok(maxInFlight > 1, "should actually run concurrently");
});

test("searchDocs 解析：ID 从 .sy path 提取；坏条目丢弃；上限 30", () => {
    const hits = client.parseDocSearch([
        {path: "/20240101120000-abcdefg.sy", hPath: "/常用库", box: "nb", name: "常用库"},
        {path: "/folder/20240101120001-hijklmn.sy", hPath: "/子/库", box: "nb"},
        {path: "/junk.sy", hPath: "/坏", box: "nb"},
        "junk",
    ]);
    assert.deepEqual(hits.map((h) => h.id), ["20240101120000-abcdefg", "20240101120001-hijklmn"]);
    assert.equal(hits[0].hPath, "/常用库");
    assert.equal(client.parseDocSearch(null).length, 0);
    assert.equal(client.parseDocSearch([{path: "/x.sy"}]).length, 0);
});

test("排序切换：title 仅无关键词浏览生效；manual 仍按收藏序；关键词优先相关度", () => {
    const {searchEntries} = searchModule;
    const entry = (id, title) => ({
        id, blockId: "20240101120000-abcdefg", libraryDocId: "20240101120001-hijklmn",
        itemType: "text", title, alias: "", tags: [], category: "", summary: "", createdAt: 0, updatedAt: 0,
    });
    const entries = [entry("xlc-a000000001", "Alpha"), entry("xlc-c000000001", "中文")];
    // zh-Hans 排序中汉字先于拉丁字母 → 期望标题序与插入序相反（有鉴别力）
    const ctxTitle = {favorites: new Set(), recents: new Map(), sort: "title", now: 1};
    const byTitle = searchEntries(entries, {text: "", scope: "all"}, ctxTitle);
    assert.deepEqual(byTitle.map((r) => r.entry.title), ["中文", "Alpha"]);
    // 默认 manual：保持插入序（无收藏置顶时）
    const ctxDefault = {favorites: new Set(), recents: new Map(), sort: "manual", now: 1};
    assert.deepEqual(searchEntries(entries, {text: "", scope: "all"}, ctxDefault).map((r) => r.entry.title), ["Alpha", "中文"]);
    // manual：置顶（收藏序）优先于标题
    const ctxManual = {favorites: new Set(["xlc-c000000001"]), recents: new Map(), sort: "manual", manualOrder: new Map([["xlc-c000000001", 0]]), now: 1};
    const byManual = searchEntries(entries, {text: "", scope: "all"}, ctxManual);
    assert.equal(byManual[0].entry.id, "xlc-c000000001");
    // 关键词搜索：相关度优先于标题序
    const kw = searchEntries(
        [entry("xlc-z000000001", "Alpha 后缀"), entry("xlc-a000000001", "Alpha")],
        {text: "Alpha", scope: "all"},
        {favorites: new Set(), recents: new Map(), sort: "title", now: 1},
    );
    assert.equal(kw[0].entry.id, "xlc-a000000001"); // 同分时标题稳定序，但都命中 Alpha
});

test("updateItem：markdown 变更走 updateBlock（内容编辑链路）", async () => {
    const calls = [];
    const B1 = "20240101120000-aaaaaaa";
    const kernel = {
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            if (endpoint === "getChildBlocks") return Promise.resolve([{id: B1, type: "p"}]);
            if (endpoint === "batchGetBlockAttrs") return Promise.resolve({[B1]: {"custom-xlc-id": "xlc-edititem01"}});
            if (endpoint === "getBlockAttrs") return Promise.resolve({"custom-xlc-id": "xlc-edititem01"});
            return Promise.resolve(null);
        },
    };
    const service = new libModule.LibraryService(kernel);
    service.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const result = await service.updateItem("xlc-edititem01", {title: "新题", markdown: "```js\nx()\n```"});
    assert.ok(result.ok);
    const upd = calls.find((c) => c.endpoint === "updateBlock");
    assert.ok(upd, "updateBlock must be called");
    assert.match(upd.payload.data, /```js/);
});

test("exportDocContent：形状校验与非法 ID 拒绝", async () => {
    const kernel = {
        request(endpoint, payload = {}) {
            if (endpoint === "exportMdContent") return Promise.resolve({hPath: "/库", content: "# 内容"});
            return Promise.resolve(null);
        },
    };
    const service = new libModule.LibraryService(kernel);
    const okCase = await service.exportDocContent("20240101120001-hijklmn");
    assert.ok(okCase.ok);
    assert.equal(okCase.data.content, "# 内容");
    const bad = await service.exportDocContent("junk");
    assert.equal(bad.ok, false);
});

test("R4：appendToDoc 走 appendBlock；空内容/非法 ID 拒绝", async () => {
    const calls = [];
    const kernel = {
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            return Promise.resolve([{doOperations: [{id: "20240101120009-xxxxxxxx"}]}]);
        },
    };
    const service = new libModule.LibraryService(kernel);
    const okCase = await service.appendToDoc("hello", "20240101120001-hijklmn");
    assert.equal(okCase, true);
    assert.equal(calls[0].endpoint, "appendBlock");
    assert.equal(calls[0].payload.parentID, "20240101120001-hijklmn");
    assert.equal(await service.appendToDoc("   ", "20240101120001-hijklmn"), false);
    assert.equal(await service.appendToDoc("hello", "junk"), false);
    assert.equal(calls.length, 1, "rejected inputs must not hit kernel");
});

test("R4：searchDocs 服务（空关键词短路；解析走 parseDocSearch）", async () => {
    const calls = [];
    const kernel = {
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            return Promise.resolve([{path: "/20240101120000-abcdefg.sy", hPath: "/库", box: "nb", name: "库"}]);
        },
    };
    const service = new libModule.LibraryService(kernel);
    const empty = await service.searchDocs("  ");
    assert.deepEqual(empty.data, []);
    assert.equal(calls.length, 0, "empty keyword must short-circuit");
    const okCase = await service.searchDocs("常用");
    assert.equal(okCase.data[0].id, "20240101120000-abcdefg");
    assert.equal(calls[0].payload.k, "常用");
});
