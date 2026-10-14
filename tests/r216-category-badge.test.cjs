// R216 场景分类语义彩色徽标与确定性色系映射契约专项测试（ADR 0042 / T-0069）
const test = require("node:test");
const assert = require("node:assert/strict");
const {getCategoryColorVariant} = require("./.build/entry.cjs").item;

test("核心场景分类的语义颜色变体映射契约", () => {
    // 1. 商务财务类 -> business
    assert.strictEqual(getCategoryColorVariant("商务"), "business");
    assert.strictEqual(getCategoryColorVariant("财务"), "business");
    assert.strictEqual(getCategoryColorVariant("发票资料"), "business");
    assert.strictEqual(getCategoryColorVariant("银行账号"), "business");
    assert.strictEqual(getCategoryColorVariant("合同协议"), "business");

    // 2. 客服支持类 -> support
    assert.strictEqual(getCategoryColorVariant("客服"), "support");
    assert.strictEqual(getCategoryColorVariant("售后退换"), "support");
    assert.strictEqual(getCategoryColorVariant("技术支持"), "support");
    assert.strictEqual(getCategoryColorVariant("客户咨询"), "support");

    // 3. 研发技术类 -> dev
    assert.strictEqual(getCategoryColorVariant("开发"), "dev");
    assert.strictEqual(getCategoryColorVariant("代码片段"), "dev");
    assert.strictEqual(getCategoryColorVariant("SQL 查询"), "dev");
    assert.strictEqual(getCategoryColorVariant("技术架构"), "dev");

    // 4. 写作日常类 -> writing
    assert.strictEqual(getCategoryColorVariant("写作"), "writing");
    assert.strictEqual(getCategoryColorVariant("周报"), "writing");
    assert.strictEqual(getCategoryColorVariant("会议纪要"), "writing");
    assert.strictEqual(getCategoryColorVariant("日计划"), "writing");

    // 5. AI 与提示词类 -> ai
    assert.strictEqual(getCategoryColorVariant("提示词"), "ai");
    assert.strictEqual(getCategoryColorVariant("AI 助手"), "ai");
    assert.strictEqual(getCategoryColorVariant("Prompt 库"), "ai");
});

test("自定义分类确定性哈希与安全边界契约", () => {
    // 1. 任意自定义分类具备确定性（相同输入多次调用结果恒定）
    const customA1 = getCategoryColorVariant("生活缴费");
    const customA2 = getCategoryColorVariant("生活缴费");
    assert.strictEqual(customA1, customA2);
    assert.ok(["business", "support", "dev", "writing", "ai"].includes(customA1));

    const customB1 = getCategoryColorVariant("游戏攻略");
    const customB2 = getCategoryColorVariant("游戏攻略");
    assert.strictEqual(customB1, customB2);
    assert.ok(["business", "support", "dev", "writing", "ai"].includes(customB1));

    // 2. 空输入与空白字符串安全兜底
    assert.strictEqual(getCategoryColorVariant(""), "business");
    assert.strictEqual(getCategoryColorVariant("   "), "business");
    assert.strictEqual(getCategoryColorVariant(null), "business");
    assert.strictEqual(getCategoryColorVariant(undefined), "business");
});
