const test = require("node:test");
const assert = require("node:assert");
const {errors} = require("./.build/entry.cjs");

test("R245：toErrorMessage 统一收敛任意 thrown value 且不会二次抛错", () => {
    assert.equal(errors.toErrorMessage(new Error("boom")), "boom");
    assert.equal(errors.toErrorMessage(null), "null");
    assert.equal(errors.toErrorMessage("底层字符串异常"), "底层字符串异常");
    assert.equal(errors.toErrorMessage({message: "普通对象异常"}), "普通对象异常");
    assert.equal(errors.toErrorMessage({reason: "没有 message 字段"}), '{"reason":"没有 message 字段"}');
    assert.equal(errors.toErrorMessage("", "兜底文本"), "兜底文本");

    const circular = {};
    circular.self = circular;
    assert.equal(errors.toErrorMessage(circular), "[object Object]");

    const hostile = new Proxy({}, {
        getPrototypeOf() { throw new Error("prototype trap"); },
        get() { throw new Error("get trap"); },
        ownKeys() { throw new Error("keys trap"); },
    });
    assert.equal(errors.toErrorMessage(hostile, "安全兜底"), "安全兜底");
    assert.equal(errors.getErrorProperty({name: "KernelTimeoutError"}, "name"), "KernelTimeoutError");
    assert.equal(errors.getErrorProperty(hostile, "name"), undefined);
});
