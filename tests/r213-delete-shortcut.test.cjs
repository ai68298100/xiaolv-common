// R213 列表条目快捷删除与二次确认契约专项测试（ADR 0039 / T-0066）
const test = require("node:test");
const assert = require("node:assert/strict");

test("快捷删除按键解析器契约与输入框防误触隔离", () => {
    function resolveDeleteAction(e, hasSelection, isProvider, activeElementTag) {
        if (!hasSelection || isProvider) return null;
        if (e.repeat) return null;
        const isEditingInput = activeElementTag === "INPUT" || activeElementTag === "TEXTAREA";

        // 1. 显式意图：Alt + Delete / Alt + Backspace（在输入框或列表均可触发）
        const isAltDelete = e.altKey && (e.key === "Delete" || e.key === "Backspace");
        if (isAltDelete) return "delete";

        // 2. 纯 Delete：仅在非编辑控件生效
        const isPureDelete = !e.ctrlKey && !e.metaKey && !e.altKey && e.key === "Delete" && !isEditingInput;
        if (isPureDelete) return "delete";

        return null;
    }

    // 1. 显式意图快捷删除：Alt+Delete 与 Alt+Backspace
    assert.strictEqual(resolveDeleteAction({altKey: true, key: "Delete"}, true, false, "INPUT"), "delete");
    assert.strictEqual(resolveDeleteAction({altKey: true, key: "Backspace"}, true, false, "DIV"), "delete");

    // 2. 列表焦点下纯 Delete
    assert.strictEqual(resolveDeleteAction({key: "Delete"}, true, false, "DIV"), "delete");
    assert.strictEqual(resolveDeleteAction({key: "Delete"}, true, false, "BODY"), "delete");

    // 3. 输入框防误触红线：在 INPUT / TEXTAREA 内部单独按 Delete 或 Backspace 严格不触发删除
    assert.strictEqual(resolveDeleteAction({key: "Delete"}, true, false, "INPUT"), null);
    assert.strictEqual(resolveDeleteAction({key: "Delete"}, true, false, "TEXTAREA"), null);
    assert.strictEqual(resolveDeleteAction({key: "Backspace"}, true, false, "INPUT"), null);

    // 4. 防长按保护：repeat 为 true 时严格不触发
    assert.strictEqual(resolveDeleteAction({altKey: true, key: "Delete", repeat: true}, true, false, "DIV"), null);

    // 5. 虚拟 Provider 条目保护：严禁删除第三方虚拟条目
    assert.strictEqual(resolveDeleteAction({altKey: true, key: "Delete"}, true, true, "DIV"), null);

    // 6. 无选中条目保护
    assert.strictEqual(resolveDeleteAction({altKey: true, key: "Delete"}, false, false, "DIV"), null);
});
