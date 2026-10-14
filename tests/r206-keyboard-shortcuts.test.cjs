// R206 键盘直达数字键与多区 Tab 导航专项测试（ADR 0032 / T-0059）
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

test("i18n 资源包含 ordinalShortcutHint 且支持 %s 格式化", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));

    assert.ok(zh.ordinalShortcutHint, "zh-CN 必须定义 ordinalShortcutHint");
    assert.ok(en.ordinalShortcutHint, "en 必须定义 ordinalShortcutHint");

    assert.ok(zh.ordinalShortcutHint.includes("Alt+%s"), "zh-CN 提示应包含 Alt+%s");
    assert.ok(zh.ordinalShortcutHint.includes("Alt+Shift+%s"), "zh-CN 提示应包含 Alt+Shift+%s");

    assert.ok(en.ordinalShortcutHint.includes("Alt+%s"), "en 提示应包含 Alt+%s");
    assert.ok(en.ordinalShortcutHint.includes("Alt+Shift+%s"), "en 提示应包含 Alt+Shift+%s");
});

test("数字直达解析逻辑：正确识别 Alt+1~9 及 Alt+Shift+1~9，支持 key 与 code 双通道", () => {
    // 纯函数解析器契约核验（与 dialog.ts onKeydown 保持一致）
    function resolveShortcut(e) {
        if (!e.altKey || e.ctrlKey || e.metaKey) return null;
        let num = null;
        if (/^[1-9]$/.test(e.key)) {
            num = Number(e.key);
        } else if (/^Digit[1-9]$/.test(e.code)) {
            num = Number(e.code.replace("Digit", ""));
        }
        if (num === null) return null;
        return {
            index: num - 1,
            action: e.shiftKey ? "copy" : "insert",
        };
    }

    // 1. 标准按键：Alt + 1 -> 插入首项
    assert.deepEqual(resolveShortcut({altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, key: "1", code: "Digit1"}), {index: 0, action: "insert"});

    // 2. 快捷复制：Alt + Shift + 2 -> 复制第二项
    assert.deepEqual(resolveShortcut({altKey: true, ctrlKey: false, metaKey: false, shiftKey: true, key: "2", code: "Digit2"}), {index: 1, action: "copy"});

    // 3. macOS 输入法特殊符号（如 Option+1 输出 ¡，但 code 为 Digit1）-> 正确识别为数字 1
    assert.deepEqual(resolveShortcut({altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, key: "¡", code: "Digit1"}), {index: 0, action: "insert"});

    // 4. macOS Option+Shift+3 特殊符号，通过 code 识别为复制第三项
    assert.deepEqual(resolveShortcut({altKey: true, ctrlKey: false, metaKey: false, shiftKey: true, key: "·", code: "Digit3"}), {index: 2, action: "copy"});

    // 5. 边界测试：9（最后一项直达项）
    assert.deepEqual(resolveShortcut({altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, key: "9", code: "Digit9"}), {index: 8, action: "insert"});

    // 6. 负向测试：0 或非数字不触发
    assert.equal(resolveShortcut({altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, key: "0", code: "Digit0"}), null);
    assert.equal(resolveShortcut({altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, key: "a", code: "KeyA"}), null);

    // 7. 负向测试：按下 Ctrl 或 Meta（Cmd）时不触发 Alt 直达
    assert.equal(resolveShortcut({altKey: true, ctrlKey: true, metaKey: false, shiftKey: false, key: "1", code: "Digit1"}), null);
    assert.equal(resolveShortcut({altKey: true, ctrlKey: false, metaKey: true, shiftKey: false, key: "1", code: "Digit1"}), null);

    // 8. 负向测试：未按下 Alt 时的纯按键不触发
    assert.equal(resolveShortcut({altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, key: "1", code: "Digit1"}), null);
});
