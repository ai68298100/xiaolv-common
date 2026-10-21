// R291 别名完全匹配/前缀匹配/拼音高权重打分专项契约测试（ADR 0084 / T-0144）
const test = require("node:test");
const assert = require("node:assert/strict");
const { search, pinyin, pinyinTiny } = require("./.build/entry.cjs");

const {
    calculateAliasBoost,
    matchEntry,
    searchEntries,
} = search;

const BASE_CTX = {
    favorites: new Set(),
    recents: new Map(),
    now: Date.now(),
};

test("别名加权阶梯契约：完全匹配(+400)、前缀匹配(+200)、拼音完全匹配(+150)、拼音前缀匹配(+100)", () => {
    const adapter = pinyinTiny.createTinyPinyinAdapter();
    pinyin.setPinyinAdapter(adapter);

    const entry = {
        id: "entry-alias-1",
        blockId: "b-1",
        libraryDocId: "doc-1",
        itemType: "markdown",
        title: "关于客户退货的沟通规范",
        alias: "退款",
        tags: ["客服"],
        category: "规范",
        summary: "这是退款指引",
        createdAt: 1000,
        updatedAt: 2000,
    };

    // 1. 别名完全匹配：400
    assert.strictEqual(calculateAliasBoost(entry, "退款", ["退款"]), 400);

    // 2. 别名前缀匹配：200
    assert.strictEqual(calculateAliasBoost(entry, "退", ["退"]), 200);

    // 3. 别名拼音完全匹配 (首字母 tk 或全拼 tuikuan)：150
    assert.strictEqual(calculateAliasBoost(entry, "tk", ["tk"]), 150);
    assert.strictEqual(calculateAliasBoost(entry, "tuikuan", ["tuikuan"]), 150);

    // 4. 别名拼音前缀匹配 (首字母前缀 t，或全拼前缀 tui)：100
    assert.strictEqual(calculateAliasBoost(entry, "t", ["t"]), 100);
    assert.strictEqual(calculateAliasBoost(entry, "tui", ["tui"]), 100);

    // 5. 别名包含但非前缀（例如“款”）：不享受前缀暴击，返回 0
    assert.strictEqual(calculateAliasBoost(entry, "款", ["款"]), 0);

    // 6. 无别名条目：返回 0
    const noAliasEntry = { ...entry, alias: "" };
    assert.strictEqual(calculateAliasBoost(noAliasEntry, "退款", ["退款"]), 0);

    // 7. 多词组合中包含别名匹配：能正确命中加权
    assert.strictEqual(calculateAliasBoost(entry, "tk 规范", ["tk", "规范"]), 150);
    assert.strictEqual(calculateAliasBoost(entry, "退款 规范", ["退款", "规范"]), 400);
});

test("noop 适配器下的降级隔离：无拼音能力时不触发拼音加权", () => {
    const noopAdapter = pinyin.createNoopPinyinAdapter();
    pinyin.setPinyinAdapter(noopAdapter);

    try {
        const entry = {
            id: "entry-alias-noop",
            blockId: "b-2",
            libraryDocId: "doc-2",
            itemType: "markdown",
            title: "退货指引",
            alias: "退款",
            tags: [],
            category: "",
            summary: "",
            createdAt: 1000,
            updatedAt: 2000,
        };

        // 中文字面匹配不受影响
        assert.strictEqual(calculateAliasBoost(entry, "退款", ["退款"]), 400);
        assert.strictEqual(calculateAliasBoost(entry, "退", ["退"]), 200);

        // 拼音命中降级为 0
        assert.strictEqual(calculateAliasBoost(entry, "tk", ["tk"]), 0);
        assert.strictEqual(calculateAliasBoost(entry, "tuikuan", ["tuikuan"]), 0);
    } finally {
        pinyin.setPinyinAdapter(pinyinTiny.createTinyPinyinAdapter());
    }
});

test("Raycast / Alfred 启动器体验契约：别名匹配条目稳居搜索第 1 位", () => {
    const adapter = pinyinTiny.createTinyPinyinAdapter();
    pinyin.setPinyinAdapter(adapter);

    const entryAliasMatch = {
        id: "entry-a",
        blockId: "b-a",
        libraryDocId: "doc-1",
        itemType: "markdown",
        title: "关于客户沟通的通用注意事项与指引清单",
        alias: "退款",
        tags: ["客服"],
        category: "通用",
        summary: "处理客户纠纷",
        createdAt: 1000,
        updatedAt: 1000,
    };

    const entryTitlePrefixMatch = {
        id: "entry-b",
        blockId: "b-b",
        libraryDocId: "doc-1",
        itemType: "markdown",
        title: "退款流程与审核标准规范",
        alias: "",
        tags: ["客服"],
        category: "通用",
        summary: "这是退款流程",
        createdAt: 2000,
        updatedAt: 2000,
    };

    const entryTitleContainsMatch = {
        id: "entry-c",
        blockId: "b-c",
        libraryDocId: "doc-1",
        itemType: "markdown",
        title: "大额订单客户退款特别审批程序",
        alias: "",
        tags: ["客服"],
        category: "通用",
        summary: "审批标准",
        createdAt: 3000,
        updatedAt: 3000,
    };

    const entries = [entryTitleContainsMatch, entryTitlePrefixMatch, entryAliasMatch];

    // 1. 搜索 "退款"：条目 A (alias="退款") 凭借 +400 分绝对第一
    const resExact = searchEntries(entries, { text: "退款" }, BASE_CTX);
    assert.strictEqual(resExact.length, 3);
    assert.strictEqual(resExact[0].entry.id, "entry-a", "别名完全匹配必须排在首位");
    assert.ok(resExact[0].score > 400);

    // 2. 搜索 "tk"：条目 A (alias="退款" 拼音首字母 tk) 凭借 +150 分排在首位
    const resPinyin = searchEntries(entries, { text: "tk" }, BASE_CTX);
    assert.ok(resPinyin.length > 0);
    assert.strictEqual(resPinyin[0].entry.id, "entry-a", "别名拼音完全匹配必须排在首位");
    assert.ok(resPinyin[0].score > 150);

    // 3. 搜索 "退"：条目 A (alias 前缀) 凭借 +200 分排在首位
    const resPrefix = searchEntries(entries, { text: "退" }, BASE_CTX);
    assert.strictEqual(resPrefix[0].entry.id, "entry-a", "别名前缀匹配必须排在首位");
    assert.ok(resPrefix[0].score > 200);
});

test("calculateTitlePinyinBoost：标题首字母缩写(+120/+80)与全拼(+100/+60)专属打分加权契约", () => {
    const adapter = pinyinTiny.createTinyPinyinAdapter();
    pinyin.setPinyinAdapter(adapter);

    const entry = {
        id: "entry-title-py",
        blockId: "b-title",
        libraryDocId: "doc-1",
        itemType: "markdown",
        title: "财务报销审批流",
        alias: "",
        tags: ["财务"],
        category: "通用",
        summary: "这是审批流说明",
        createdAt: 1000,
        updatedAt: 2000,
    };

    const { calculateTitlePinyinBoost } = search;

    // 1. 标题首字母缩写完全匹配 (cwbxspl) -> 1.5
    assert.strictEqual(calculateTitlePinyinBoost(entry, "cwbxspl", ["cwbxspl"]), 1.5);

    // 2. 标题首字母缩写前缀匹配 (cwbx, 前缀>=2) -> 0.8
    assert.strictEqual(calculateTitlePinyinBoost(entry, "cwbx", ["cwbx"]), 0.8);

    // 3. 标题全拼完全匹配 (caiwubaoxiaoshenpiliu) -> 1.0
    assert.strictEqual(calculateTitlePinyinBoost(entry, "caiwubaoxiaoshenpiliu", ["caiwubaoxiaoshenpiliu"]), 1.0);

    // 4. 标题全拼前缀匹配 (caiwu, 前缀>=3) -> 0.5
    assert.strictEqual(calculateTitlePinyinBoost(entry, "caiwu", ["caiwu"]), 0.5);

    // 5. 单字母前缀不享受前缀加权（防过度误伤）
    assert.strictEqual(calculateTitlePinyinBoost(entry, "c", ["c"]), 0);
});
