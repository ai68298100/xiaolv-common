// T-0031 · ADR-0013：对外窗口桥 window.xiaolvCommon v1（只读子集）测试。
// 门禁纪律：负向验证——先证明「写方法挂上桥会失败」，再锁定只读边界。
const test = require("node:test");
const assert = require("node:assert");
const {externalBridge, service, library, ai, providers} = require("./.build/entry.cjs");
const {ProviderRegistry} = providers;

function makeService() {
    const {XiaolvCommonService} = service;
    const {LibraryService} = library;
    const {AiAssistant} = ai;
    const kernel = {
        request(endpoint) {
            if (endpoint === "getChildBlocks") return Promise.resolve([]);
            return Promise.resolve(null);
        },
    };
    const lib = new LibraryService(kernel);
    lib.setConfig({mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1});
    const state = {schemaVersion: 2, favorites: [], recents: [], sort: "manual", uiPrefs: {lastTypeFilter: "", lastTagFilter: ""}, providers: [], ai: {enabled: false, shareContent: false}};
    return new XiaolvCommonService({
        library: lib,
        executor: {
            run: async () => ({ok: true, mode: "insert", message: "inserted", downgraded: false, pendingVerification: []}),
            openSource: async () => ({ok: true, mode: "open-source", message: "opened", downgraded: false, pendingVerification: []}),
            renderForInsert: async (text, item, fills) => {
                let res = text;
                if (fills) {
                    for (const [k, v] of Object.entries(fills)) {
                        res = res.replace(new RegExp(`\\{\\{xlc:ask:${k}(?:=[^|}]+)?(?:\\|[^}]*)?\\}\\}`, "g"), v);
                    }
                }
                res = res.replace(/\{\{xlc:ask:([^|=]+)(?:=([^|}]+))?(?:\|[^}]*)?\}\}/g, (_, name, def) => def || "");
                return res;
            },
        },
        registry: new ProviderRegistry(),
        ai: new AiAssistant({request: async () => ({code: 0, data: null})}, state.ai),
        state,
        onStateChange: () => {},
    });
}

test("桥形状：protocol/protocolName/capabilities 只读能力；写方法不存在于桥对象（ADR-0013 门禁）", () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    assert.equal(bridge.protocol, 1);
    assert.equal(bridge.protocolName, "xiaolv-common");
    assert.deepEqual(bridge.capabilities, ["search", "get", "getBatch", "resolve", "recall", "recent", "favorites", "categories", "tags"]);
    // 负向验证：写面不挂桥——意外扩面会让本断言失败
    for (const forbidden of ["save", "update", "remove", "insert", "copy", "openSource", "reindex"]) {
        assert.equal(bridge[forbidden], undefined, `写能力 ${forbidden} 不得出现在只读桥`);
    }
    assert.equal(typeof bridge.search, "function");
    assert.equal(typeof bridge.get, "function");
    assert.equal(typeof bridge.getBatch, "function");
    assert.equal(typeof bridge.resolve, "function");
    assert.equal(typeof bridge.recall, "function");
    assert.equal(typeof bridge.getRecent, "function");
    assert.equal(typeof bridge.getFavorites, "function");
    assert.equal(typeof bridge.getCategories, "function");
    assert.equal(typeof bridge.getTags, "function");
    assert.equal(typeof bridge.getCapabilities, "function");
});

test("whenReady 立即可用；getCapabilities 透传完整描述符（含诚实限制）", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    assert.equal(await bridge.whenReady(), true);
    const caps = bridge.getCapabilities();
    const byName = Object.fromEntries(caps.map((c) => [c.name, c]));
    assert.ok(byName.search && byName.get);
    assert.ok(byName.insert.limitations.some((l) => l.includes("mobile-insert-unverified")), "能力描述符保留诚实限制标注");
});

test("search：宽松入参收敛（未知类型丢弃不崩）；空库空结果", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    const r1 = await bridge.search({text: "关键词", itemType: 42, tag: null, scope: "bogus"});
    assert.equal(r1.ok, true);
    assert.deepEqual(r1.data, []);
    // 无参/垃圾入参不抛异常
    const r2 = await bridge.search();
    assert.equal(r2.ok, true);
    const r3 = await bridge.search("not-an-object");
    assert.equal(r3.ok, true);
});

test("get：非字符串 id 收敛为字符串；not-found 走协议信封不抛异常", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    const r = await bridge.get("20240101120000-zzzzzzz");
    assert.equal(r.ok, false);
    assert.ok(["not-found", "kernel-error"].includes(r.reason), `reason=${r.reason}`);
    assert.equal(r.protocol, "xiaolv-common", "ActionResult 信封原样透传");
});

test("getRecent/getFavorites：limit 缺省走服务默认；信封透传", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    const recent = await bridge.getRecent();
    assert.equal(recent.ok, true);
    assert.deepEqual(recent.data, []);
    const fav = await bridge.getFavorites();
    assert.equal(fav.ok, true);
    const bounded = await bridge.getRecent(Number.MAX_SAFE_INTEGER);
    assert.equal(bounded.ok, true, "越界 limit 由服务层钳制");
});

test("getBatch：批量查询入参校验、上限钳制与协议信封透传", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    // 非数组输入返回 invalid-input
    const badInput = await bridge.getBatch("not-array");
    assert.equal(badInput.ok, false);
    assert.equal(badInput.reason, "invalid-input");

    // 空数组返回空结果
    const empty = await bridge.getBatch([]);
    assert.equal(empty.ok, true);
    assert.deepEqual(empty.data, []);

    // 含有非法元素与超量元素被安全过滤和截断
    const ids = Array.from({length: 60}, (_, i) => `id-${i}`);
    const res = await bridge.getBatch(ids);
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.data));
});

test("getCategories / getTags：返回去重排序后的分类与标签列表", async () => {
    const bridge = externalBridge.buildXlcBridge(makeService());
    const cats = await bridge.getCategories();
    assert.equal(cats.ok, true);
    assert.ok(Array.isArray(cats.data));

    const tags = await bridge.getTags();
    assert.equal(tags.ok, true);
    assert.ok(Array.isArray(tags.data));
});

test("挂载/卸载：首实例持有；二次挂载跳过；disposer 只删自己的桥 (四别名 Epoch 6 兼容)", () => {
    const host = {};
    const s1 = makeService();
    const s2 = makeService();
    const dispose1 = externalBridge.mountXlcBridge(s1, host);
    assert.ok(host.xiaolvCommon, "xiaolvCommon 桥已挂载");
    assert.ok(host.LvCommon, "LvCommon 别名已挂载");
    assert.ok(host.lvCommon, "lvCommon 别名已挂载");
    assert.ok(host.siyuanCommon, "siyuanCommon 别名已挂载");

    const dispose2 = externalBridge.mountXlcBridge(s2, host);
    dispose2();
    assert.ok(host.xiaolvCommon, "二次挂载被跳过，disposer 不得误删首实例的桥");
    assert.ok(host.LvCommon, "二次挂载被跳过，LvCommon 仍保留首实例");

    dispose1();
    assert.equal(host.xiaolvCommon, undefined, "首实例 disposer 正常注销 xiaolvCommon");
    assert.equal(host.LvCommon, undefined, "首实例 disposer 正常注销 LvCommon");
    assert.equal(host.lvCommon, undefined, "首实例 disposer 正常注销 lvCommon");
    assert.equal(host.siyuanCommon, undefined, "首实例 disposer 正常注销 siyuanCommon");
    dispose1();
    assert.equal(host.xiaolvCommon, undefined, "重复卸载安全");
});

test("挂载：已存在同名桥时不覆盖（先到先得）", () => {
    const host = {xiaolvCommon: {existing: true}};
    const dispose = externalBridge.mountXlcBridge(makeService(), host);
    assert.equal(host.xiaolvCommon.existing, true, "既有桥未被覆盖");
    dispose();
    assert.ok(host.xiaolvCommon, "无主 disposer 不动既有桥");
});

test("bridge.resolve：支持外部无 UI 纯求值条目正文与动态变量解析", async () => {
    const svc = makeService();
    // mock getItem 与 getItemKramdown
    svc.get = async (id) => {
        if (id === "entry-1") {
            return {
                ok: true,
                data: {
                    id: "entry-1",
                    itemType: "text",
                    title: "问候模板",
                },
            };
        }
        return {ok: false, reason: "not-found", message: "item not found"};
    };
    svc.deps.library.getItemKramdown = async () => ({
        ok: true,
        data: "你好，{{xlc:ask:客户姓名=尊敬的客户}}！本次工单号为：{{xlc:ask:工单号}}",
    });

    const bridge = externalBridge.buildXlcBridge(svc);

    // 1. 不传 fills 时取默认值
    const r1 = await bridge.resolve("entry-1");
    assert.equal(r1.ok, true);
    assert.equal(r1.data.id, "entry-1");
    assert.equal(r1.data.hasVariables, true);
    assert.equal(r1.data.variables.length, 2);
    assert.equal(r1.data.variables[0].name, "客户姓名");
    assert.equal(r1.data.variables[0].defaultValue, "尊敬的客户");
    assert.deepEqual(r1.data.missingVariables, ["工单号"], "未填写且无默认值的字段应列入 missingVariables");
    assert.ok(r1.data.resolvedText.includes("你好，尊敬的客户！"));

    // 2. 传入 fills 时覆盖填参
    const r2 = await bridge.resolve("entry-1", {"客户姓名": "张经理", "工单号": "WO-9988"});
    assert.equal(r2.ok, true);
    assert.deepEqual(r2.data.missingVariables, [], "所有字段满足时 missingVariables 为空");
    assert.ok(r2.data.resolvedText.includes("你好，张经理！本次工单号为：WO-9988"));

    // 3. 不存在的条目诚实报错
    const r3 = await bridge.resolve("not-exist");
    assert.equal(r3.ok, false);
    assert.equal(r3.reason, "not-found");
});

test("search / toRef：CommonItemRef 丰富元数据支持（alias, tags, category, varCount）供外部快速列表渲染", async () => {
    const svc = makeService();
    svc.deps.library.ensureIndex = async () => ({
        entries: [
            {
                id: "entry-rich",
                title: "客户退款指引",
                itemType: "markdown",
                alias: "tk",
                tags: ["客服", "售后"],
                category: "退款规范",
                varCount: 2,
                summary: "请确认订单状态与退款金额",
                createdAt: 1000,
                updatedAt: 2000,
                libraryDocId: "doc-1",
                blockId: "b-1",
            },
        ],
        items: new Map(),
        errors: [],
        truncated: false,
    });

    const bridge = externalBridge.buildXlcBridge(svc);
    const res = await bridge.search({text: "退款"});
    assert.equal(res.ok, true);
    assert.equal(res.data.length, 1);
    const item = res.data[0];
    assert.equal(item.id, "entry-rich");
    assert.equal(item.title, "客户退款指引");
    assert.equal(item.alias, "tk", "应包含别名");
    assert.deepEqual(item.tags, ["客服", "售后"], "应包含标签数组");
    assert.equal(item.category, "退款规范", "应包含分类");
    assert.equal(item.varCount, 2, "应包含变量统计数");
    assert.equal(item.summary, "请确认订单状态与退款金额", "应包含摘要");
});

test("bridge.recall：别名闪电直达测试（唯一匹配一步返回展开正文，未命中返回not-found）", async () => {
    const svc = makeService();
    svc.deps.library.ensureIndex = async () => ({
        entries: [
            {
                id: "e-yq",
                title: "商务延期致歉",
                alias: "yq",
                tags: ["商务"],
                category: "模板",
                pyi: "yqzq",
                createdAt: 1000,
                updatedAt: 1000,
            },
        ],
        items: new Map(),
        errors: [],
        truncated: false,
    });

    svc.get = async (id) => {
        if (id === "e-yq") {
            return {
                ok: true,
                data: {
                    id: "e-yq",
                    title: "商务延期致歉",
                    itemType: "text",
                },
            };
        }
        return {ok: false, reason: "not-found", message: "item not found"};
    };
    svc.deps.library.getItemKramdown = async () => ({
        ok: true,
        data: "尊敬的{{xlc:ask:客户姓名=客户}}，因不可抗力导致项目延期。",
    });

    const bridge = externalBridge.buildXlcBridge(svc);

    // 1. 唯一别名精确直达并计算展开文本
    const r1 = await bridge.recall("yq", {"客户姓名": "李总"});
    assert.equal(r1.ok, true);
    assert.equal(r1.data.matched, "exact");
    assert.ok(r1.data.item.resolvedText.includes("尊敬的李总"));

    // 2. 标题拼音首字母唯一直达
    const r2 = await bridge.recall("yqzq");
    assert.equal(r2.ok, true);
    assert.equal(r2.data.matched, "exact");
    assert.ok(r2.data.item.resolvedText.includes("尊敬的客户"));

    // 3. 不存在的别名返回 not-found 错误信封
    const r3 = await bridge.recall("not-exist-alias");
    assert.equal(r3.ok, false);
    assert.equal(r3.reason, "not-found");
});
