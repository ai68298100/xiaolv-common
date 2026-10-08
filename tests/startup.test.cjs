"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {startup} = require("./.build/entry.cjs");

test("侧车读取成功时返回值", async () => {
    assert.deepEqual(await startup.readWithTimeout(async () => "ok", 50), {ok: true, value: "ok"});
});

test("侧车读取超时不阻塞启动", async () => {
    const result = await startup.readWithTimeout(() => new Promise(() => {}), 5);
    assert.deepEqual(result, {ok: false, reason: "timeout"});
});

test("侧车读取拒绝时降级为错误结果", async () => {
    const result = await startup.readWithTimeout(async () => {
        throw new Error("corrupt");
    }, 50);
    assert.deepEqual(result, {ok: false, reason: "error"});
});
