// 内核客户端测试：端点白名单、错误信封、超时、响应形状解析器。
const test = require("node:test");
const assert = require("node:assert");
const client = require("./.build/entry.cjs").client;

function makeStub(responder) {
    return async (url, data) => responder(url, data);
}

test("未知端点被白名单拒绝（不允许临场加路径）", async () => {
    const kernel = client.createKernelClient({syncPost: makeStub(() => ({code: 0, data: null}))});
    await assert.rejects(() => kernel.request("notAnEndpoint"), /not allowlisted/);
});

test("非零 code 抛 KernelError 并带 msg", async () => {
    const kernel = client.createKernelClient({syncPost: makeStub(() => ({code: -1, msg: "no such doc"}))});
    await assert.rejects(() => kernel.request("lsNotebooks", {}), (err) => {
        assert.ok(err instanceof client.KernelError);
        assert.equal(err.message, "no such doc");
        return true;
    });
});

test("超时返回 KernelTimeoutError", async () => {
    const kernel = client.createKernelClient({
        syncPost: () => new Promise(() => {}),
        timeoutMs: 30,
    });
    await assert.rejects(() => kernel.request("lsNotebooks", {}), (err) => {
        assert.equal(err.name, "KernelTimeoutError");
        return true;
    });
});

test("缺失 syncPost 时构造即失败（防裸 fetch 绕过宿主鉴权口径）", () => {
    assert.throws(() => client.createKernelClient({}), /syncPost/);
});

test("解析器：形状不符时返回安全空值", () => {
    assert.deepEqual(client.parseChildBlocks("junk"), []);
    assert.deepEqual(client.parseChildBlocks([{id: "20240101120000-abcdefg", type: "p"}, {bad: true}]).length, 1);
    assert.deepEqual(client.parseAttrs([1, 2]), {});
    assert.deepEqual(client.parseBatchAttrs({a: {x: "1", y: 2}}), {a: {x: "1"}});
    assert.deepEqual(client.parseExistingMap({a: true, b: "no"}), {a: true, b: false});
    assert.equal(client.parseDocId(42), null);
    assert.equal(client.parseKramdown({noId: 1}), null);
});
