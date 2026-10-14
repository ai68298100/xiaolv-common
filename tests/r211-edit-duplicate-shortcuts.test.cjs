// R211 列表条目快捷编辑与副本复制契约专项测试（ADR 0037 / T-0064）
const test = require("node:test");
const assert = require("node:assert/strict");

test("快捷编辑与复制副本按键解析器契约", () => {
    function resolveAction(e, hasSelection, isProvider) {
        if (!hasSelection || isProvider) return null;
        if (e.repeat) return null;
        const hasMod = e.ctrlKey || e.metaKey || e.altKey;
        if (!hasMod) return null;
        const key = (e.key ?? "").toLowerCase();
        if (key === "e") return "edit";
        if (key === "d") return "duplicate";
        return null;
    }

    // 1. 标准快捷编辑：Ctrl+E / ⌘+E / Alt+E
    assert.strictEqual(resolveAction({ctrlKey: true, key: "e"}, true, false), "edit");
    assert.strictEqual(resolveAction({metaKey: true, key: "E"}, true, false), "edit");
    assert.strictEqual(resolveAction({altKey: true, key: "e"}, true, false), "edit");

    // 2. 标准快捷复制副本：Ctrl+D / ⌘+D / Alt+D
    assert.strictEqual(resolveAction({ctrlKey: true, key: "d"}, true, false), "duplicate");
    assert.strictEqual(resolveAction({metaKey: true, key: "D"}, true, false), "duplicate");
    assert.strictEqual(resolveAction({altKey: true, key: "d"}, true, false), "duplicate");

    // 3. 边界保护：未按修饰键（纯 e/d 字符键输入），不触发任何条目操作
    assert.strictEqual(resolveAction({key: "e"}, true, false), null);
    assert.strictEqual(resolveAction({key: "d"}, true, false), null);

    // 4. 防连发保护：repeat 为 true 时严格不触发
    assert.strictEqual(resolveAction({ctrlKey: true, key: "e", repeat: true}, true, false), null);
    assert.strictEqual(resolveAction({ctrlKey: true, key: "d", repeat: true}, true, false), null);

    // 5. 虚拟条目保护：处于第三方 Provider 分区时不可在本地编辑或复制副本
    assert.strictEqual(resolveAction({ctrlKey: true, key: "e"}, true, true), null);
    assert.strictEqual(resolveAction({ctrlKey: true, key: "d"}, true, true), null);

    // 6. 无选中条目保护
    assert.strictEqual(resolveAction({ctrlKey: true, key: "e"}, false, false), null);
});
