// R67/F1-F3：变量模型（ask 语法/展开/光标标记）、状态（使用计数/插入偏好/frequent 排序/分类面）、
// 执行层（fills 注入 / 插入默认展开 / 复制保模板原样 / code 不处理变量）。
const test = require("node:test");
const assert = require("node:assert");
const {variables, placeholders, storage, search, commands, library} = require("./.build/entry.cjs");
const {ActionExecutor} = commands;
const {LibraryService} = library;

const DOC = "20240101120001-hijklmn";
const BLOCK = "20240101120000-abcdefg";

// ---------- 变量模型 ----------

test("ask 解析：文本/下拉/日期三形态，同名去重", () => {
    const fields = variables.listAskFields(
        "尊敬的 {{xlc:ask:客户名称}}，补偿 {{xlc:ask:补偿比例|5%,10%}}，跟进 {{xlc:ask:跟进日期|date}}，再次 {{xlc:ask:客户名称}}",
    );
    assert.strictEqual(fields.length, 3);
    assert.deepStrictEqual(fields[0], {name: "客户名称", kind: "text", options: []});
    assert.deepStrictEqual(fields[1], {name: "补偿比例", kind: "select", options: ["5%", "10%"]});
    assert.deepStrictEqual(fields[2], {name: "跟进日期", kind: "date", options: []});
});

test("ask 解析：空名/畸形输入安全返回", () => {
    assert.strictEqual(variables.listAskFields("{{xlc:ask:|a,b}}").length, 0);
    assert.strictEqual(variables.listAskFields("没有变量").length, 0);
    assert.strictEqual(variables.listAskFields("").length, 0);
});

test("ask 选项切分：支持中文全角逗号与顿号（[,，、]）归一化", () => {
    // 中文全角逗号
    const fZhComma = variables.parseAskField("方案", "标准版，专业版，旗舰版");
    assert.deepStrictEqual(fZhComma, {name: "方案", kind: "select", options: ["标准版", "专业版", "旗舰版"]});

    // 顿号切分
    const fDun = variables.parseAskField("阶段", "需求澄清、原型确认、研发交付");
    assert.deepStrictEqual(fDun, {name: "阶段", kind: "select", options: ["需求澄清", "原型确认", "研发交付"]});

    // 混用多种分隔符与首尾空格
    const fMixed = variables.parseAskField("付款方式", " 微信 , 支付宝 ， 银行卡 、 对公转账 ");
    assert.deepStrictEqual(fMixed, {name: "付款方式", kind: "select", options: ["微信", "支付宝", "银行卡", "对公转账"]});

    // 全文模板提取
    const fields = variables.listAskFields("选择 {{xlc:ask:套餐|A，B，C}} 与 {{xlc:ask:渠道|线上、线下}}");
    assert.strictEqual(fields.length, 2);
    assert.deepStrictEqual(fields[0].options, ["A", "B", "C"]);
    assert.deepStrictEqual(fields[1].options, ["线上", "线下"]);
});

test("ask 展开：填充值生效、缺失兜底 __名称__、值清洗", () => {
    const tpl = "尊敬的 {{xlc:ask:客户}}：减免 {{xlc:ask:比例|5%,10%}}，{{xlc:cursor}}";
    assert.strictEqual(
        variables.expandAsks(tpl, {客户: "  王总 ", 比例: "5%"}),
        "尊敬的 王总：减免 5%，{{xlc:cursor}}",
    );
    assert.strictEqual(
        variables.expandAsks(tpl, {}),
        "尊敬的 __客户__：减免 __比例__，{{xlc:cursor}}",
    );
    assert.strictEqual(variables.applyAskDefaults(tpl), "尊敬的 __客户__：减免 __比例__，{{xlc:cursor}}");
});

test("ask 默认值与语法回显：等号语法、单选项回退默认值与默认值优先展开", () => {
    // 等号语法解析默认值
    const f1 = variables.parseAskField("币种=CNY", undefined);
    assert.deepStrictEqual(f1, {name: "币种", kind: "text", options: [], defaultValue: "CNY"});
    assert.strictEqual(variables.askFieldTag(f1), "{{xlc:ask:币种=CNY}}");

    // 单选项作为默认值
    const f2 = variables.parseAskField("数量", "1");
    assert.deepStrictEqual(f2, {name: "数量", kind: "text", options: [], defaultValue: "1"});

    // date/textarea 依然是对应类型，且支持等号默认值
    const fDate = variables.parseAskField("截止=2026-10-19", "date");
    assert.deepStrictEqual(fDate, {name: "截止", kind: "date", options: [], defaultValue: "2026-10-19"});
    const fTextarea = variables.parseAskField("备注=无", "textarea");
    assert.deepStrictEqual(fTextarea, {name: "备注", kind: "textarea", options: [], defaultValue: "无"});

    // 下拉选项结合等号默认值
    const fSelect = variables.parseAskField("城市=北京", "上海,北京,广州");
    assert.deepStrictEqual(fSelect, {name: "城市", kind: "select", options: ["上海", "北京", "广州"], defaultValue: "北京"});

    // 默认值展开：未提供填充值时优先采用 defaultValue，无默认值才落 __名称__
    const tpl = "付款：{{xlc:ask:币种=CNY}} {{xlc:ask:数量|1}} 到 {{xlc:ask:客户}}";
    assert.strictEqual(
        variables.expandAsks(tpl, {}),
        "付款：CNY 1 到 __客户__",
    );
    // 用户显式填充优先于默认值
    assert.strictEqual(
        variables.expandAsks(tpl, {币种: "USD", 数量: "5"}),
        "付款：USD 5 到 __客户__",
    );
});

test("光标标记：插入路径移除，检测可用", () => {
    assert.strictEqual(variables.stripCursorToken("A{{xlc:cursor}}B{{xlc:cursor}}"), "AB");
    assert.strictEqual(variables.hasCursorToken("A{{xlc:cursor}}"), true);
    assert.strictEqual(variables.hasCursorToken("AB"), false);
});

test("填充值含变量语法不再二次展开（防套娃注入：单遍替换不回卷扫描替换结果）", () => {
    const out = variables.expandAsks("值：{{xlc:ask:字段}}", {字段: "{{xlc:ask:嵌套}}"});
    assert.strictEqual(out, "值：{{xlc:ask:嵌套}}");
});

// ---------- 占位符 v2：doc 别名 ----------

test("{{xlc:doc}} 与 {{xlc:title}} 同义（当前文档名）", () => {
    const doc = {title: "客户沟通手册", path: "/工作/客户沟通手册"};
    assert.strictEqual(placeholders.renderPlaceholder("doc", new Date(), doc), "客户沟通手册");
    const applied = placeholders.applyPlaceholders("见 {{xlc:doc}} / {{xlc:title}}", new Date(), true, doc);
    assert.strictEqual(applied, "见 客户沟通手册 / 客户沟通手册");
});

// ---------- 状态：使用计数 / 插入偏好 / frequent 排序 ----------

test("normalizeState：使用计数归一化（坏形状丢弃、超限截断、显式关闭才关偏好）", () => {
    const state = storage.normalizeState({
        usage: {
            "xlc-a": {count: 3, lastAt: 30},
            "xlc-b": {count: -1, lastAt: 20},
            "xlc-c": {count: 1.5, lastAt: 10},
            bad: {count: 1, lastAt: 5},
            "xlc-d": {count: 2},
        },
        insert: {promptVariables: false},
        uiPrefs: {lastCategoryFilter: "客服"},
        sort: "frequent",
    });
    assert.deepStrictEqual(state.usage, {"xlc-a": {count: 3, lastAt: 30}});
    assert.strictEqual(state.insert.promptVariables, false);
    assert.strictEqual(state.insert.recordUsage, true);
    assert.strictEqual(state.uiPrefs.lastCategoryFilter, "客服");
    assert.strictEqual(state.sort, "frequent");
    const defaults = storage.normalizeState(null);
    assert.strictEqual(defaults.insert.promptVariables, true);
    assert.strictEqual(defaults.insert.recordUsage, true);
    assert.deepStrictEqual(defaults.usage, {});
});

test("search：frequent 排序 = 次数 > 最近使用；collectCategories 去空排序", () => {
    const mk = (id, title) => ({
        id, blockId: BLOCK, libraryDocId: DOC, itemType: "text", title, alias: "",
        tags: [], category: id === "xlc-2" ? "客服" : "", summary: "", createdAt: 0, updatedAt: 0,
    });
    const entries = [mk("xlc-1", "甲"), mk("xlc-2", "乙"), mk("xlc-3", "丙")];
    const ctx = {
        favorites: new Set(),
        recents: new Map([["xlc-3", 99]]),
        usage: new Map([["xlc-2", 7], ["xlc-1", 7]]),
        sort: "frequent",
        now: 1,
    };
    const ids = search.searchEntries(entries, {text: ""}, ctx).map((r) => r.entry.id);
    // xlc-1 与 xlc-2 同 7 次：比最近使用（xlc-3 有一条但 0 次）——0 次排最后
    assert.deepStrictEqual(ids, ["xlc-1", "xlc-2", "xlc-3"]);
    assert.deepStrictEqual(search.collectCategories(entries), ["客服"]);
});

// ---------- 执行层：fills 注入 / 插入默认展开 / 复制保模板 ----------

function makeItem(itemType) {
    return {
        id: "xlc-var000001", blockId: BLOCK, libraryDocId: DOC, itemType,
        title: "延期模板", alias: "", tags: [], category: "", summary: "", varCount: 2,
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    };
}

function makeKernel(kramdown) {
    return {
        request(endpoint, payload = {}) {
            if (endpoint === "getChildBlocks") return Promise.resolve([{id: "20240101120000-abcdefg", type: "p"}]);
            if (endpoint === "getBlockKramdown") return Promise.resolve({id: payload.id, kramdown});
            if (endpoint === "checkBlocksExist") return Promise.resolve({[DOC]: true, [BLOCK]: true});
            return Promise.resolve(null);
        },
    };
}

function makeHost() {
    return {
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: (md) => {
            host.lastInserted = md;
            return true;
        },
        writeClipboard: async (text) => {
            host.lastCopied = text;
            return true;
        },
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => DOC,
    };
}

const host = makeHost();

function makeExecutor(kramdown, placeholderHook) {
    const lib = new LibraryService(makeKernel(kramdown));
    return new ActionExecutor(lib, host, () => {}, undefined, placeholderHook);
}

const HOOK = {
    enabled: () => true,
    now: () => new Date(2026, 9, 7, 10, 0),
    currentDoc: async () => ({title: "客户沟通手册", path: "/工作/客户沟通手册"}),
    clipboard: async () => "剪贴板内容",
};

test("executor：fills 随插入生效，{{xlc:doc}}/{{xlc:clipboard}} 替换，光标标记移除", async () => {
    const kramdown = "尊敬的 {{xlc:ask:客户}}：见 {{xlc:doc}}，附件 {{xlc:clipboard}}，{{xlc:cursor}}";
    const executor = makeExecutor(kramdown, HOOK);
    const receipt = await executor.run(makeItem("markdown"), "insert", {fills: {客户: "王总"}});
    assert.strictEqual(receipt.ok, true);
    assert.strictEqual(
        host.lastInserted,
        "尊敬的 王总：见 客户沟通手册，附件 剪贴板内容，",
    );
});

test("executor：插入未填充 ask 兜底 __名称__；复制保持模板原样（不展开 ask/不删光标标记）", async () => {
    const kramdown = "{{xlc:ask:客户}} 模板 {{xlc:cursor}}";
    const executor = makeExecutor(kramdown, HOOK);
    await executor.run(makeItem("markdown"), "insert");
    assert.strictEqual(host.lastInserted, "__客户__ 模板 ");
    await executor.run(makeItem("markdown"), "copy");
    assert.strictEqual(host.lastCopied, "{{xlc:ask:客户}} 模板 {{xlc:cursor}}");
});

test("executor：code 条目完全不做变量处理（r23 语义延伸到 fills）", async () => {
    const kramdown = "```sql\nSELECT '{{xlc:ask:表}}' {{xlc:cursor}}\n```";
    const executor = makeExecutor(kramdown, HOOK);
    await executor.run(makeItem("code"), "insert", {fills: {表: "t1"}});
    assert.match(host.lastInserted, /\{\{xlc:ask:表\}\}/);
    assert.match(host.lastInserted, /\{\{xlc:cursor\}\}/);
});

test("executor：renderForInsert 带 fills（定向插入路径同语义）", async () => {
    const executor = makeExecutor("{{xlc:ask:工单}} 处理", HOOK);
    const out = await executor.renderForInsert("工单 {{xlc:ask:工单}} 已建", makeItem("text"), {工单: "T-1"});
    assert.strictEqual(out, "工单 T-1 已建");
});
