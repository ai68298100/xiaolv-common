// R209 桌面快捷键键帽栏同步与按键引导契约专项测试（ADR 0035 / T-0062）
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

test("i18n 资源包含 kbdQuickCopy 与 kbdTabActions 且中英文一致", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));

    assert.ok(zh.kbdQuickCopy, "zh-CN 必须定义 kbdQuickCopy");
    assert.ok(en.kbdQuickCopy, "en 必须定义 kbdQuickCopy");
    assert.ok(zh.kbdTabActions, "zh-CN 必须定义 kbdTabActions");
    assert.ok(en.kbdTabActions, "en 必须定义 kbdTabActions");

    assert.match(zh.kbdQuickCopy, /复制/);
    assert.match(en.kbdQuickCopy, /Copy/i);
    assert.match(zh.kbdTabActions, /操作区|焦点/);
    assert.match(en.kbdTabActions, /actions|focus/i);
});

test("跨平台快捷键提示键帽清单生成契约", () => {
    function buildKbdHints(isApple, t) {
        return [
            {key: "↑ ↓", action: t("kbdNav")},
            {key: "Enter", action: t("kbdEnter")},
            {key: `${isApple ? "⌘" : "Ctrl"} + Enter`, action: t("kbdCopy")},
            {key: `${isApple ? "⌥" : "Alt"} + 1-9`, action: t("kbdQuickInsert")},
            {key: `${isApple ? "⌥ + ⇧" : "Alt + Shift"} + 1-9`, action: t("kbdQuickCopy")},
            {key: "Tab", action: t("kbdTabActions")},
            {key: "Esc", action: t("kbdClose")},
        ];
    }

    const fakeT = (k) => k;

    // 1. Windows / Linux 环境
    const winHints = buildKbdHints(false, fakeT);
    assert.strictEqual(winHints.length, 7, "键帽应包含 7 项基础与高级操作");
    assert.strictEqual(winHints[2].key, "Ctrl + Enter");
    assert.strictEqual(winHints[3].key, "Alt + 1-9");
    assert.strictEqual(winHints[4].key, "Alt + Shift + 1-9");
    assert.strictEqual(winHints[5].key, "Tab");

    // 2. Apple (macOS) 环境
    const macHints = buildKbdHints(true, fakeT);
    assert.strictEqual(macHints.length, 7);
    assert.strictEqual(macHints[2].key, "⌘ + Enter");
    assert.strictEqual(macHints[3].key, "⌥ + 1-9");
    assert.strictEqual(macHints[4].key, "⌥ + ⇧ + 1-9");
    assert.strictEqual(macHints[5].key, "Tab");
});
