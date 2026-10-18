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
    assert.deepEqual(client.parseBatchKramdowns({"20240101120000-abcdefg": "<span data-type=\"tag\">hi</span>", bad: 2}), {"20240101120000-abcdefg": "<span data-type=\"tag\">hi</span>"});
    assert.deepEqual(client.parseExistingMap({a: true, b: "no"}), {a: true, b: false});
    assert.equal(client.parseDocId(42), null);
    assert.equal(client.parseKramdown({noId: 1}), null);
    assert.equal(client.parseNotebookId({notebook: {id: "20240101123456", name: "独立库"}}), "20240101123456");
    assert.equal(client.parseNotebookId({notebook: null}), null);
    assert.equal(client.parseNotebookId({notebook: {id: "not-a-notebook"}}), null);
    assert.equal(client.parseNotebookId("20240101123456"), null);
    assert.equal(client.parseVoid(null), true);
    assert.equal(client.parseVoid({}), false);
});

test("独立笔记本端点已登记且写请求按原样发送", async () => {
    const calls = [];
    const kernel = client.createKernelClient({syncPost: async (url, data, context) => {
        calls.push({url, data, context});
        if (url.endsWith("createNotebook")) return {code: 0, data: {notebook: {id: "20240101123456", name: data.name}}};
        return {code: 0, data: null};
    }});
    const created = await kernel.request("createNotebook", {name: "独立库"}, {idempotencyKey: "issue1-create-1"});
    const removed = await kernel.request("removeNotebook", {notebook: "20240101123456"}, {idempotencyKey: "issue1-remove-1"});
    assert.deepEqual(created, {notebook: {id: "20240101123456", name: "独立库"}});
    assert.equal(removed, null);
    assert.deepEqual(calls.map((call) => [call.url, call.data]), [
        ["/api/notebook/createNotebook", {name: "独立库"}],
        ["/api/notebook/removeNotebook", {notebook: "20240101123456"}],
    ]);
    assert.equal(calls[0].context.attempt, 0);
    assert.equal(calls[1].context.attempt, 0);
});

test("独立笔记本写端点网络失败不自动重试", async () => {
    let calls = 0;
    const kernel = client.createKernelClient({syncPost: async () => {
        calls += 1;
        throw new Error("network offline");
    }});
    await assert.rejects(() => kernel.request("createNotebook", {name: "库"}), (err) => err.kind === "network");
    await assert.rejects(() => kernel.request("removeNotebook", {notebook: "20240101123456"}), (err) => err.kind === "network");
    assert.equal(calls, 2);
});

test("同一在途读取请求去重，键序不同也只触发一次传输", async () => {
    let calls = 0;
    let release;
    const kernel = client.createKernelClient({
        syncPost: async () => {
            calls += 1;
            await new Promise((resolve) => { release = resolve; });
            return {code: 0, data: {ok: true}};
        },
    });
    const first = kernel.request("searchDocs", {k: "abc", options: {limit: 5}});
    const second = kernel.request("searchDocs", {options: {limit: 5}, k: "abc"});
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls, 1);
    release();
    assert.deepEqual(await Promise.all([first, second]), [{ok: true}, {ok: true}]);
});

test("网络失败按上限重试，成功后返回最后一次结果", async () => {
    let calls = 0;
    const kernel = client.createKernelClient({
        syncPost: async () => {
            calls += 1;
            if (calls < 3) throw new Error("network offline");
            return {code: 0, data: "recovered"};
        },
    });
    assert.equal(await kernel.request("searchDocs", {k: "retry"}), "recovered");
    assert.equal(calls, 3);
});

test("写端点默认不重试，避免重复写入", async () => {
    let calls = 0;
    const kernel = client.createKernelClient({
        syncPost: async () => {
            calls += 1;
            throw new Error("network offline");
        },
    });
    await assert.rejects(() => kernel.request("appendBlock", {parentID: "20240101120000-abcdefg", data: "x", dataType: "markdown"}), (err) => {
        assert.equal(err.kind, "network");
        return true;
    });
    assert.equal(calls, 1);
});

test("latest raceKey 会取消旧请求，旧响应不会覆盖新请求", async () => {
    const calls = [];
    const kernel = client.createKernelClient({
        syncPost: (url, data, context) => new Promise((resolve, reject) => {
            calls.push(data.k);
            const timer = setTimeout(() => resolve({code: 0, data: data.k}), data.k === "old" ? 60 : 5);
            context.signal.addEventListener("abort", () => {
                clearTimeout(timer);
                reject(new Error("aborted"));
            }, {once: true});
        }),
    });
    const old = kernel.request("searchDocs", {k: "old"}, {latest: true, raceKey: "search"});
    await new Promise((resolve) => setTimeout(resolve, 1));
    const latest = kernel.request("searchDocs", {k: "new"}, {latest: true, raceKey: "search"});
    await assert.rejects(() => old, (err) => err.kind === "cancelled");
    assert.equal(await latest, "new");
    assert.deepEqual(calls, ["old", "new"]);
});

test("超时会向传输层发出 AbortSignal，并暴露 timeout 分类", async () => {
    let aborted = false;
    const kernel = client.createKernelClient({
        timeoutMs: 10,
        syncPost: (_url, _data, context) => new Promise(() => {
            context.signal.addEventListener("abort", () => { aborted = true; }, {once: true});
        }),
    });
    await assert.rejects(() => kernel.request("listModels", {}), (err) => err.name === "KernelTimeoutError");
    assert.equal(aborted, true);
});

test("错误分类区分鉴权、权限和校验", async () => {
    for (const [code, kind] of [[401, "auth"], [403, "permission"], [422, "validation"]]) {
        const kernel = client.createKernelClient({syncPost: async () => ({code, msg: "failure"})});
        await assert.rejects(() => kernel.request("version", {}), (err) => err.kind === kind);
    }
});

test("鉴权和权限失败走统一回调，去重请求只通知一次", async () => {
    let transportCalls = 0;
    const authFailures = [];
    const permissionFailures = [];
    const kernel = client.createKernelClient({
        syncPost: async () => {
            transportCalls += 1;
            await new Promise((resolve) => setImmediate(resolve));
            return {code: 401, msg: "expired token"};
        },
        onAuthFailure: (err) => authFailures.push(err),
        onPermissionFailure: (err) => permissionFailures.push(err),
    });
    const first = kernel.request("version", {});
    const second = kernel.request("version", {});
    await Promise.all([assert.rejects(first), assert.rejects(second)]);
    assert.equal(transportCalls, 1);
    assert.equal(authFailures.length, 1);
    assert.equal(authFailures[0].kind, "auth");
    assert.equal(permissionFailures.length, 0);
});

test("权限失败触发权限回调；回调异常不会覆盖原始内核错误", async () => {
    let permissionFailures = 0;
    const kernel = client.createKernelClient({
        syncPost: async () => ({code: 403, msg: "access denied"}),
        onAuthFailure: () => assert.fail("auth callback must not run"),
        onPermissionFailure: (err) => {
            permissionFailures += 1;
            assert.equal(err.kind, "permission");
            throw new Error("notification failed");
        },
    });
    await assert.rejects(() => kernel.request("version", {}), (err) => {
        assert.ok(err instanceof client.KernelError);
        assert.equal(err.kind, "permission");
        assert.equal(err.message, "access denied");
        return true;
    });
    assert.equal(permissionFailures, 1);
});
