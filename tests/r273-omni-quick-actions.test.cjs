// R273 专项：全域内容搜索动作闭环与就地安全编辑测试 (G14 / T-0126)
const test = require("node:test");
const assert = require("node:assert");
const {omniSearch, commands, quickEdit} = require("./.build/entry.cjs");

test("validateOmniBlockUpdate：单行正文与完整代码围栏允许写入 (B-006 屏障)", () => {
    // 单行普通正文
    const res1 = omniSearch.validateOmniBlockUpdate("这是一条用于快速编辑的单行块正文");
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.error, undefined);

    // 完整封闭的代码围栏
    const fencedCode = "```javascript\nconsole.log('hello omni');\n```";
    const res2 = omniSearch.validateOmniBlockUpdate(fencedCode);
    assert.strictEqual(res2.valid, true);
    assert.strictEqual(res2.error, undefined);
});

test("validateOmniBlockUpdate：未封闭围栏或破坏块层级的多行内容应严格拒绝", () => {
    // 普通多行文本（未用代码围栏包裹，B-006 禁止直接改写）
    const multiline = "第一行内容\n第二行内容\n第三行内容";
    const res1 = omniSearch.validateOmniBlockUpdate(multiline);
    assert.strictEqual(res1.valid, false);
    assert.ok(res1.error, "多行正文应返回拒绝原因");

    // 未封闭的代码块
    const unclosedCode = "```typescript\nconst a = 1;";
    const res2 = omniSearch.validateOmniBlockUpdate(unclosedCode);
    assert.strictEqual(res2.valid, false);
    assert.ok(res2.error, "未封闭代码块应返回拒绝原因");
});

test("updateDocBlock：块 ID 格式非法时静默前置拦截，不向内核发包", async () => {
    let kernelCalled = false;
    const fakeKernel = {
        request: async () => {
            kernelCalled = true;
            return {};
        },
    };

    const res = await omniSearch.updateDocBlock(fakeKernel, "invalid-id-xyz", "合法单行正文");
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, "invalid block ID");
    assert.strictEqual(kernelCalled, false, "非法块 ID 不应调用 kernel");
});

test("updateDocBlock：内容违背 B-006 时前置拦截，不向内核发包", async () => {
    let kernelCalled = false;
    const fakeKernel = {
        request: async () => {
            kernelCalled = true;
            return {};
        },
    };

    const res = await omniSearch.updateDocBlock(fakeKernel, "20261020010000-abcdef1", "第一行\n第二行");
    assert.strictEqual(res.success, false);
    assert.ok(res.error);
    assert.strictEqual(kernelCalled, false, "违规正文不应调用 kernel");
});

test("updateDocBlock：合法块 ID 与合法单行正文应正确发包并返回成功", async () => {
    const calls = [];
    const fakeKernel = {
        request: async (cmd, params) => {
            calls.push({cmd, params});
            return {code: 0, msg: "ok"};
        },
    };

    const blockId = "20261020010000-abcdef1";
    const content = "合法单行更新内容";
    const res = await omniSearch.updateDocBlock(fakeKernel, blockId, content);

    assert.strictEqual(res.success, true);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].cmd, "updateBlock");
    assert.strictEqual(calls[0].params.id, blockId);
    assert.strictEqual(calls[0].params.dataType, "markdown");
    assert.strictEqual(calls[0].params.data, content);
});

test("OmniSearchService：包装类 updateBlockContent 贯通测试", async () => {
    const calls = [];
    const fakeKernel = {
        request: async (cmd, params) => {
            calls.push({cmd, params});
            return {};
        },
    };

    const service = new omniSearch.OmniSearchService(fakeKernel, () => ({
        docId: "20261020010000-doc0001",
        hPath: "测试文档",
    }));

    const res = await service.updateBlockContent("20261020010000-abcdef1", "新内容测试");
    assert.strictEqual(res.success, true);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].cmd, "updateBlock");
});

test("HostBridge：无活动编辑器时 currentDocInfo 安全返回 null 不崩溃", () => {
    const host = new commands.HostBridge({}, {});
    const info = host.currentDocInfo();
    assert.strictEqual(info, null);
});
