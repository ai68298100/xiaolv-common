// R220 搜索结果空态智能诊断与范围回退引导契约专项测试（ADR 0046 / T-0073）
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {emptyState} = require("./.build/entry.cjs");

test("i18n 资源包含 searchAllScopeAction 且中英文一致", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));

    assert.ok(zh.searchAllScopeAction, "zh-CN 必须定义 searchAllScopeAction");
    assert.ok(en.searchAllScopeAction, "en 必须定义 searchAllScopeAction");

    assert.match(zh.searchAllScopeAction, /在全部内容中搜索/);
    assert.match(en.searchAllScopeAction, /Search .* in all items/i);
});

test("空态受限范围回退按钮展示决策纯函数契约", () => {
    const {shouldShowScopeFallback} = emptyState;

    assert.strictEqual(shouldShowScopeFallback(" 发票 ", "favorites"), true);
    assert.strictEqual(shouldShowScopeFallback("SQL", "recent"), true);
    assert.strictEqual(shouldShowScopeFallback("延期", "all"), false);
    assert.strictEqual(shouldShowScopeFallback("", "favorites"), false);
    assert.strictEqual(shouldShowScopeFallback("   ", "recent"), false);
});

test("范围回退按钮标题截断与格式化契约", () => {
    const {formatScopeFallbackQuery} = emptyState;
    assert.strictEqual(formatScopeFallbackQuery(" 发票资料 "), "发票资料");

    const longQuery = "这".repeat(25);
    assert.strictEqual(formatScopeFallbackQuery(longQuery), "这".repeat(20) + "…");
    assert.strictEqual(Array.from(formatScopeFallbackQuery("😀".repeat(25))).length, 21, "截断不能拆开代理对");
});
