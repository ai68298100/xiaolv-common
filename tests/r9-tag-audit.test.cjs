// R9：AI 标签体检——仅标签清单出域（prompt 元数据门禁）、解析容错、短路语义。
const test = require("node:test");
const assert = require("node:assert");
const ai = require("./.build/entry.cjs").ai;

test("门禁：标签体检 prompt 只含标签清单，绝不含正文/来源/摘要", () => {
    const prompt = ai.buildTagAuditPrompt(["工作", "客户沟通", "模板"]);
    assert.ok(prompt.includes("工作, 客户沟通, 模板"));
    assert.ok(!prompt.includes("summary"));
    assert.ok(!prompt.includes("sourceBlockId"));
    assert.ok(!prompt.includes("正文"));
    assert.match(prompt, /prompt v1/);
});

test("解析：合法建议/坏形状过滤/上限 10/字段截断", () => {
    const raw = JSON.stringify([
        {type: "merge", tags: ["工作", "上班"], suggestion: "合并为: 工作", reason: "同义"},
        {type: "rename", tags: ["客护"], suggestion: "改为: 客户", reason: "错字"},
        {type: "delete", tags: ["x"], suggestion: "s"},            // 未知类型 → 丢弃
        {type: "merge", tags: [], suggestion: "s"},                 // 空 tags → 丢弃
        {type: "merge", tags: ["a"], suggestion: ""},               // 空 suggestion → 丢弃
        "junk",
    ]);
    const out = ai.parseTagAudit(raw);
    assert.equal(out.length, 2);
    assert.equal(out[0].type, "merge");
    assert.deepEqual(out[0].tags, ["工作", "上班"]);
    // 上限 10
    const many = JSON.stringify(Array.from({length: 15}, (_, i) => ({type: "rename", tags: [`t${i}`], suggestion: `s${i}`, reason: "r"})));
    assert.equal(ai.parseTagAudit(many).length, 10);
    // 非 JSON → []
    assert.deepEqual(ai.parseTagAudit("说不出"), []);
});

test("AiAssistant.tagAudit：少于 2 个标签短路（不发请求）；空响应诚实报错", async () => {
    const calls = [];
    const transport = {
        request(endpoint, payload) {
            calls.push({endpoint, payload});
            return Promise.resolve("[]");
        },
    };
    const assistant = new ai.AiAssistant(transport, {enabled: true, shareContent: false});
    // 少于 2 个：短路且不需要 shareContent（元数据出域）
    assert.deepEqual(await assistant.tagAudit(["工作"]), []);
    assert.equal(calls.length, 0);
    // 正常：无需正文权限
    const out = await assistant.tagAudit(["工作", "模板"]);
    assert.deepEqual(out, []);
    assert.equal(calls[0].endpoint, "chatGPT");
    // 空响应 → 诚实报错
    const empty = new ai.AiAssistant({request: async () => ""}, {enabled: true, shareContent: false});
    await assert.rejects(() => empty.tagAudit(["a", "b"]), (err) => err.reason === "empty-response");
});
