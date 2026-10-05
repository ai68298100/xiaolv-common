// AI 助手门禁测试：默认关、正文出域开关、空响应诚实失败、语义找仅元数据、结果解析容错。
const test = require("node:test");
const assert = require("node:assert");
const {storage, ai, client} = {
    storage: require("./.build/entry.cjs").storage,
    ai: require("./.build/entry.cjs").ai,
    client: require("./.build/entry.cjs").client,
};

function makeTransport(responder) {
    const calls = [];
    return {
        calls,
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            return Promise.resolve(responder(endpoint, payload));
        },
    };
}

test("门禁：AI 任何输入下默认关（enabled/shareContent 均为 false）", () => {
    assert.equal(storage.normalizeState(null).ai.enabled, false);
    assert.equal(storage.normalizeState(null).ai.shareContent, false);
    assert.equal(storage.normalizeState({ai: {enabled: true, shareContent: "yes"}}).ai.shareContent, false);
    const migrated = storage.migrateState({schemaVersion: 1, pinnedIds: []});
    assert.equal(migrated.state.ai.enabled, false);
    // 损坏输入（ai: "junk"）也必须保持关闭
    assert.equal(storage.normalizeState({ai: "junk"}).ai.enabled, false);
});

test("门禁：未开启 shareContent 时 tidy/draft/transform 拒绝出域", async () => {
    const assistant = new ai.AiAssistant(makeTransport(() => "{}"), {enabled: true, shareContent: false});
    await assert.rejects(() => assistant.tidy("客户回复正文"), (err) => err.reason === "content-not-allowed");
    await assert.rejects(() => assistant.draft("写个模板"), (err) => err.reason === "content-not-allowed");
    await assert.rejects(() => assistant.transform("polish", "正文"), (err) => err.reason === "content-not-allowed");
});

test("门禁：总开关关闭时一切 AI 调用拒绝且不发出网络请求", async () => {
    const transport = makeTransport(() => ({code: 0, data: "x"}));
    const assistant = new ai.AiAssistant(transport, {enabled: false, shareContent: true});
    await assert.rejects(() => assistant.tidy("x"), (err) => err.reason === "disabled");
    // 空清单短路是合理行为（无需 AI）；非空清单必须被总开关拦下
    await assert.rejects(() => assistant.semanticPick("任意", [
        {id: "xlc-a000000001", title: "t", alias: "", tags: [], category: "", summary: "", itemType: "text"},
    ]), (err) => err.reason === "disabled");
    assert.equal(transport.calls.length, 0);
});

test("preflight：未启用=disabled；模型清单空=not-configured；有模型=ok", async () => {
    const off = new ai.AiAssistant(makeTransport(() => []), {enabled: false, shareContent: false});
    assert.equal((await off.preflight()).reason, "disabled");
    const noModel = new ai.AiAssistant(makeTransport(() => []), {enabled: true, shareContent: false});
    assert.equal((await noModel.preflight()).reason, "not-configured");
    const transportError = new ai.AiAssistant(makeTransport(() => { throw new Error("down"); }), {enabled: true, shareContent: false});
    assert.equal((await transportError.preflight()).reason, "not-configured");
    const okCase = new ai.AiAssistant(makeTransport(() => [{id: "m"}]), {enabled: true, shareContent: false});
    assert.equal((await okCase.preflight()).ok, true);
});

test("tidy：解析围栏 JSON 并裁剪字段；空响应诚实报错", async () => {
    const good = new ai.AiAssistant(makeTransport(() => "```json\n{\"title\":\"延期通知模板\",\"tags\":[\"客服\",\"模板\"],\"category\":\"客服\",\"summary\":\"s\"}\n```"), {enabled: true, shareContent: true});
    const result = await good.tidy("正文");
    assert.equal(result.title, "延期通知模板");
    assert.deepEqual(result.tags, ["客服", "模板"]);
    const empty = new ai.AiAssistant(makeTransport(() => ""), {enabled: true, shareContent: true});
    await assert.rejects(() => empty.tidy("正文"), (err) => err.reason === "empty-response");
    const junk = new ai.AiAssistant(makeTransport(() => "抱歉我无法处理"), {enabled: true, shareContent: true});
    await assert.rejects(() => junk.tidy("正文"), (err) => err.reason === "empty-response");
});

test("语义找条目：仅元数据出域（prompt 无来源块 ID）；解析行号并按序映射", async () => {
    const entries = [
        {id: "xlc-a000000001", title: "道歉回复", alias: "", tags: [], category: "客服", summary: "s1", itemType: "markdown"},
        {id: "xlc-b000000001", title: "SQL 模板", alias: "", tags: [], category: "", summary: "s2", itemType: "code"},
        {id: "xlc-c000000001", title: "会议纪要", alias: "", tags: [], category: "", summary: "s3", itemType: "text"},
    ];
    let captured = "";
    const transport = makeTransport((_ep, payload) => {
        captured = payload.msg;
        return "[1,3]";
    });
    const assistant = new ai.AiAssistant(transport, {enabled: true, shareContent: false});
    const picked = await assistant.semanticPick("给客户的道歉", entries);
    assert.deepEqual(picked.map((e) => e.id), ["xlc-a000000001", "xlc-c000000001"]);
    // 元数据出域边界：prompt 不含正文级别字段，更不含来源块 ID（SearchMetaEntry 本身不带）
    assert.ok(captured.includes("道歉回复"));
    assert.ok(!captured.includes("sourceBlockId"));
    // 越界行号被过滤
    const bounded = new ai.AiAssistant(makeTransport(() => "[1,99,-2]"), {enabled: true, shareContent: false});
    const few = await bounded.semanticPick("q", entries);
    assert.deepEqual(few.map((e) => e.id), ["xlc-a000000001"]);
    // 坏 JSON → 空结果（诚实无兜底）
    const bad = new ai.AiAssistant(makeTransport(() => "说不出"), {enabled: true, shareContent: false});
    assert.deepEqual(await bad.semanticPick("q", entries), []);
    // 空清单直接短路（不请求）
    const skip = makeTransport(() => "[]");
    const skipAssistant = new ai.AiAssistant(skip, {enabled: true, shareContent: false});
    assert.deepEqual(await skipAssistant.semanticPick("q", []), []);
    assert.equal(skip.calls.length, 0);
});

test("transform：prompt 含指令与版本号；结果原样返回（不回写由调用方保证）", async () => {
    const transport = makeTransport(() => "Transformed text");
    const assistant = new ai.AiAssistant(transport, {enabled: true, shareContent: true});
    const out = await assistant.transform("shorten", "很长很长的原文");
    assert.equal(out, "Transformed text");
    const prompt = transport.calls[0].payload.msg;
    assert.ok(prompt.includes("prompt v1"));
    assert.ok(prompt.includes("压缩"));
});

test("端点白名单覆盖 AI 端点", () => {
    assert.equal(client.ENDPOINTS.chatGPT, "/api/ai/chatGPT");
    assert.equal(client.ENDPOINTS.listModels, "/api/ai/listModels");
});

test("设置运行时更新生效（updateSettings）", async () => {
    const transport = makeTransport(() => "{\"title\":\"T\"}");
    const assistant = new ai.AiAssistant(transport, {enabled: false, shareContent: false});
    await assert.rejects(() => assistant.tidy("x"), (err) => err.reason === "disabled");
    assistant.updateSettings({enabled: true, shareContent: true});
    const result = await assistant.tidy("正文内容");
    assert.ok(result);
});
