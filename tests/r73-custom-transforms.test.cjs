// R73/F7：自定义 AI 变换——状态归一化（形状/上限/去重/默认空）+ 提示构建（指令与正文截断、外层约束一致）。
const test = require("node:test");
const assert = require("node:assert");
const {storage, ai} = require("./.build/entry.cjs");

test("normalizeState：自定义变换逐条校验（坏形状丢弃、去重、上限 10、默认空列表）", () => {
    const good = {id: "xltf-abcd1234", name: "客服话术", prompt: "改写为客服话术："};
    const state = storage.normalizeState({
        ai: {
            enabled: true,
            customTransforms: [
                good,
                {id: "xltf-bad1", name: "坏 ID"},
                {id: "xltf-dup00001", name: "重复", prompt: "p"},
                {id: "xltf-dup00001", name: "重复2", prompt: "p2"},
                {id: "xltf-empty00", name: "", prompt: "p"},
                {id: "xltf-empty01", name: "n", prompt: ""},
                "not-an-object",
            ],
        },
    });
    assert.deepStrictEqual(state.ai.customTransforms, [
        good,
        {id: "xltf-dup00001", name: "重复", prompt: "p"},
    ]);
    const capped = {id: "xltf-cap00001", name: "n", prompt: "p"};
    const many = Array.from({length: 12}, (_, i) => ({id: `xltf-cap${String(i).padStart(6, "0")}`, name: `n${i}`, prompt: "p"}));
    assert.strictEqual(storage.normalizeState({ai: {customTransforms: many}}).ai.customTransforms.length, 10);
    assert.deepStrictEqual(storage.normalizeState(null).ai.customTransforms, []);
    assert.ok(capped);
});

test("normalizeState：名称/指令截断到上限（20/500）", () => {
    const state = storage.normalizeState({
        ai: {customTransforms: [{id: "xltf-trunc0001", name: "x".repeat(50), prompt: "y".repeat(800)}]},
    });
    assert.strictEqual(state.ai.customTransforms[0].name.length, 20);
    assert.strictEqual(state.ai.customTransforms[0].prompt.length, 500);
});

test("buildCustomTransformPrompt：指令与正文截断、外层约束与内置一致", () => {
    const prompt = ai.buildCustomTransformPrompt("  改写为客服话术：  ", "正文内容");
    assert.match(prompt, /直接输出变换结果本体/);
    assert.match(prompt, /改写为客服话术：/);
    assert.match(prompt, /正文内容/);
    const longInstruction = "z".repeat(600);
    const built = ai.buildCustomTransformPrompt(longInstruction, "c");
    assert.ok(built.includes("z".repeat(500)));
    assert.ok(!built.includes("z".repeat(501)));
});
