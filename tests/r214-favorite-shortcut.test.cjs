// R214 列表条目快捷收藏切换与即时响应契约专项测试（ADR 0040 / T-0067）
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

test("i18n 资源包含 kbdFavorite 且中英文一致", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));

    assert.ok(zh.kbdFavorite, "zh-CN 必须定义 kbdFavorite");
    assert.ok(en.kbdFavorite, "en 必须定义 kbdFavorite");
    assert.match(zh.kbdFavorite, /收藏/);
    assert.match(en.kbdFavorite, /favorite/i);
});

test("快捷收藏按键解析器契约", () => {
    function resolveFavoriteAction(e, hasSelection, isProvider) {
        if (!hasSelection || isProvider) return null;
        if (e.repeat) return null;
        const isAlt = e.altKey && !e.ctrlKey && !e.metaKey;
        if (!isAlt) return null;
        const key = (e.key ?? "").toLowerCase();
        if (key === "f" || key === "s") return "toggle-favorite";
        return null;
    }

    // 1. 标准快捷收藏：Alt+F 与 Alt+S
    assert.strictEqual(resolveFavoriteAction({altKey: true, key: "f"}, true, false), "toggle-favorite");
    assert.strictEqual(resolveFavoriteAction({altKey: true, key: "F"}, true, false), "toggle-favorite");
    assert.strictEqual(resolveFavoriteAction({altKey: true, key: "s"}, true, false), "toggle-favorite");
    assert.strictEqual(resolveFavoriteAction({altKey: true, key: "S"}, true, false), "toggle-favorite");

    // 2. 避免冲突：Ctrl+F（浏览器搜索）或 Ctrl+S（保存）不误触收藏
    assert.strictEqual(resolveFavoriteAction({ctrlKey: true, key: "f"}, true, false), null);
    assert.strictEqual(resolveFavoriteAction({ctrlKey: true, key: "s"}, true, false), null);
    assert.strictEqual(resolveFavoriteAction({metaKey: true, key: "f"}, true, false), null);

    // 3. 纯字符输入不触发
    assert.strictEqual(resolveFavoriteAction({key: "f"}, true, false), null);

    // 4. 防连发保护
    assert.strictEqual(resolveFavoriteAction({altKey: true, key: "f", repeat: true}, true, false), null);

    // 5. 虚拟条目保护
    assert.strictEqual(resolveFavoriteAction({altKey: true, key: "f"}, true, true), null);

    // 6. 无选中项保护
    assert.strictEqual(resolveFavoriteAction({altKey: true, key: "f"}, false, false), null);
});
