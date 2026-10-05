// R5：拼音搜索（tiny-pinyin 注解 + 匹配）、默认开关、noop 零开销门禁、大库性能基准。
const test = require("node:test");
const assert = require("node:assert");
const {pinyin, pinyinTiny, storage, search, library: libModule} = {
    pinyin: require("./.build/entry.cjs").pinyin,
    pinyinTiny: require("./.build/entry.cjs").pinyinTiny,
    storage: require("./.build/entry.cjs").storage,
    search: require("./.build/entry.cjs").search,
    library: require("./.build/entry.cjs").library,
};

function makeEntry(overrides = {}) {
    return {
        id: "xlc-py00000001", blockId: "20240101120000-abcdefg", libraryDocId: "20240101120001-hijklmn",
        itemType: "text", title: "常用语", alias: "", tags: [], category: "", summary: "",
        createdAt: 0, updatedAt: 0, ...overrides,
    };
}

test("门禁：拼音搜索默认开；显式关闭保留；坏输入回默认", () => {
    assert.equal(storage.normalizeState(null).search.pinyin, true);
    assert.equal(storage.normalizeState({search: {pinyin: false}}).search.pinyin, false);
    assert.equal(storage.normalizeState({search: {pinyin: "yes"}}).search.pinyin, true);
    assert.equal(storage.normalizeState({search: null}).search.pinyin, true);
    const migrated = storage.migrateState({schemaVersion: 1, pinnedIds: []});
    assert.equal(migrated.state.search.pinyin, true);
});

test("tiny 适配器：全拼/首字母注解；混合文本跳过非汉字", () => {
    const adapter = pinyinTiny.createTinyPinyinAdapter();
    assert.equal(adapter.capabilities.initials, true);
    const anno = adapter.annotate({title: "常用语", alias: ""});
    assert.ok(anno);
    assert.equal(anno.py, "changyongyu");
    assert.equal(anno.pyi, "cyy");
    const mixed = adapter.annotate({title: "SQL 常用", alias: ""});
    assert.ok(mixed);
    assert.equal(mixed.py, "changyong");
    assert.equal(mixed.pyi, "cy");
    assert.equal(adapter.annotate({title: "", alias: ""}), null);
});

test("拼音匹配：cy 命中首字母；changyong 命中全拼；拼音权重低于中文标题", () => {
    const adapter = pinyinTiny.createTinyPinyinAdapter();
    pinyin.setPinyinAdapter(adapter);
    try {
        const entry = makeEntry();
        const annotated = {...entry, ...adapter.annotate({title: "常用语", alias: ""})};
        const hitInitials = search.matchEntry(annotated, "cyy");
        assert.ok(hitInitials);
        assert.equal(hitInitials.matchedBy, "pinyin-initials");
        assert.ok(search.matchEntry(annotated, "changyo"));
        // 中文原词仍走标题通道（权重 8 > 拼音 3）
        const hanzi = search.matchEntry(annotated, "常用");
        assert.equal(hanzi.matchedBy, "title");
        assert.ok(hanzi.score > hitInitials.score);
        // 无注解条目（noop 产物）：拼音查询不命中
        assert.equal(search.matchEntry(entry, "cyy"), null);
    } finally {
        pinyin.setPinyinAdapter(pinyin.createNoopPinyinAdapter());
    }
});

test("门禁：noop 适配器注解为 null 且不产生任何拼音字段（零开销承诺）", async () => {
    const adapter = pinyin.createNoopPinyinAdapter();
    assert.equal(adapter.annotate({title: "常用语", alias: ""}), null);
    assert.equal(adapter.capabilities.initials, false);
    // buildIndex 全链路：noop 下索引条目不得携带 py/pyi
    const kernel = {
        request(endpoint, payload = {}) {
            if (endpoint === "getChildBlocks") return Promise.resolve([{id: payload.id, type: "p"}]);
            const out = {};
            for (const id of payload.ids ?? []) out[id] = {"custom-xlc-id": `xlc-${id.slice(-7).padStart(10, "0")}`, "custom-xlc-title": "常用语"};
            return Promise.resolve(out);
        },
    };
    const service = new libModule.LibraryService(kernel);
    service.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const idx = await service.buildIndex();
    assert.equal(idx.entries.length, 1);
    assert.ok(!("py" in idx.entries[0]));
    assert.ok(!("pyi" in idx.entries[0]));
});

test("buildIndex 接线 tiny 适配器：索引携带拼音注解", async () => {
    pinyin.setPinyinAdapter(pinyinTiny.createTinyPinyinAdapter());
    try {
        const kernel = {
            request(endpoint, payload = {}) {
                if (endpoint === "getChildBlocks") return Promise.resolve([{id: payload.id, type: "p"}]);
                const out = {};
                for (const id of payload.ids ?? []) out[id] = {"custom-xlc-id": `xlc-${id.slice(-7).padStart(10, "0")}`, "custom-xlc-title": "常用语"};
                return Promise.resolve(out);
            },
        };
        const service = new libModule.LibraryService(kernel);
        service.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
        const idx = await service.buildIndex();
        assert.equal(idx.entries[0].py, "changyongyu");
        assert.equal(idx.entries[0].pyi, "cyy");
    } finally {
        pinyin.setPinyinAdapter(pinyin.createNoopPinyinAdapter());
    }
});

test("性能基准：2000 条注解索引单词搜索 < 50ms（best-of-3，雷切告警线）", () => {
    const adapter = pinyinTiny.createTinyPinyinAdapter();
    const entries = [];
    for (let i = 0; i < 2000; i++) {
        const title = `条目${i}常用语模板`;
        const anno = adapter.annotate({title, alias: ""});
        entries.push(makeEntry({id: `xlc-p${String(i).padStart(9, "0")}`, title, py: anno?.py, pyi: anno?.pyi}));
    }
    const ctx = {favorites: new Set(), recents: new Map(), sort: "manual", now: 1};
    const queries = ["常用", "cyy", "changyong", "模板1999"];
    let best = Infinity;
    for (let round = 0; round < 3; round++) {
        const start = process.hrtime.bigint();
        for (const q of queries) search.searchEntries(entries, {text: q, scope: "all"}, ctx, 100);
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        best = Math.min(best, ms);
    }
    assert.ok(best < 50, `2000-entry search best-of-3 took ${best.toFixed(2)}ms (budget 50ms)`);
});
