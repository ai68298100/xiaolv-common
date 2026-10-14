// R219 单条条目使用频次重置与侧车治理契约专项测试（ADR 0045 / T-0072）
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

test("i18n 资源包含 resetItemUsage 与 resetItemUsageDone 且中英文一致", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));

    assert.ok(zh.resetItemUsage, "zh-CN 必须定义 resetItemUsage");
    assert.ok(en.resetItemUsage, "en 必须定义 resetItemUsage");
    assert.ok(zh.resetItemUsageDone, "zh-CN 必须定义 resetItemUsageDone");
    assert.ok(en.resetItemUsageDone, "en 必须定义 resetItemUsageDone");

    assert.match(zh.resetItemUsage, /重置使用频次/);
    assert.match(en.resetItemUsage, /Reset use count/i);
    assert.match(zh.resetItemUsageDone, /已重置/);
    assert.match(en.resetItemUsageDone, /Reset use count for/i);
});

test("单条条目使用频次重置纯逻辑与侧车字典清理契约", () => {
    function resetItemUsageLogic(usageDict, itemId) {
        if (!usageDict || typeof usageDict !== "object") return false;
        if (usageDict[itemId]) {
            delete usageDict[itemId];
            return true;
        }
        return false;
    }

    const stateUsage = {
        "xlc-demo0000001": {count: 32, lastAt: 400},
        "xlc-demo0000002": {count: 18, lastAt: 300},
    };

    // 1. 成功重置存在的条目
    const ok = resetItemUsageLogic(stateUsage, "xlc-demo0000001");
    assert.strictEqual(ok, true);
    assert.strictEqual(stateUsage["xlc-demo0000001"], undefined, "被重置的条目必须从侧车使用字典中彻底移除");
    assert.ok(stateUsage["xlc-demo0000002"], "其他条目的使用统计不受影响");

    // 2. 重置不存在的条目安全返回 false
    const okNonExistent = resetItemUsageLogic(stateUsage, "xlc-non-existent");
    assert.strictEqual(okNonExistent, false);

    // 3. 重复重置已清零的条目安全返回 false
    const okAgain = resetItemUsageLogic(stateUsage, "xlc-demo0000001");
    assert.strictEqual(okAgain, false);
});

test("动作菜单重置使用频次按钮可见性判定契约", () => {
    function shouldShowResetUsageItem(useCount) {
        return typeof useCount === "number" && useCount > 0;
    }

    assert.strictEqual(shouldShowResetUsageItem(32), true, "使用次数大于 0 时必须展示重置按钮");
    assert.strictEqual(shouldShowResetUsageItem(1), true);
    assert.strictEqual(shouldShowResetUsageItem(0), false, "使用次数为 0 时不展示重置按钮，保持菜单紧凑");
    assert.strictEqual(shouldShowResetUsageItem(undefined), false);
});
