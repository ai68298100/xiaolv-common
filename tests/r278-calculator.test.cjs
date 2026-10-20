// T-0131 / R278 / G20：安全内联算术计算求值引擎契约测试
const test = require("node:test");
const assert = require("node:assert");
const {calculator, placeholders} = {
    calculator: require("./.build/entry.cjs").calculator,
    placeholders: require("./.build/entry.cjs").placeholders,
};
const calc = calculator;
const ph = placeholders;

const NOW = new Date(2026, 9, 20, 14, 0, 0);

test("evaluateMathExpression: 基础四则运算与运算符优先级", () => {
    assert.equal(calc.evaluateMathExpression("2 + 3 * 4"), "14");
    assert.equal(calc.evaluateMathExpression("(2 + 3) * 4"), "20");
    assert.equal(calc.evaluateMathExpression("100 - 20 - 10"), "70");
    assert.equal(calc.evaluateMathExpression("100 - (20 - 10)"), "90");
    assert.equal(calc.evaluateMathExpression("10 / 2 * 5"), "25");
    assert.equal(calc.evaluateMathExpression("10 % 3"), "1");
});

test("evaluateMathExpression: 小数浮点数精度与一元符号", () => {
    // 浮点乘法精度修剪（避免 112.99999999999999）
    assert.equal(calc.evaluateMathExpression("100 * 1.13"), "113");
    assert.equal(calc.evaluateMathExpression("0.1 + 0.2"), "0.3");

    // 一元负号
    assert.equal(calc.evaluateMathExpression("-5 + 10"), "5");
    assert.equal(calc.evaluateMathExpression("-(10 + 5) * 2"), "-30");
    assert.equal(calc.evaluateMathExpression("+5 + 3"), "8");
});

test("evaluateMathExpression: 内置安全数学函数 (round, floor, ceil, abs)", () => {
    assert.equal(calc.evaluateMathExpression("round(10.555, 2)"), "10.56");
    assert.equal(calc.evaluateMathExpression("round(10.555)"), "11");
    assert.equal(calc.evaluateMathExpression("floor(10.9)"), "10");
    assert.equal(calc.evaluateMathExpression("ceil(10.1)"), "11");
    assert.equal(calc.evaluateMathExpression("abs(-42)"), "42");
    assert.equal(calc.evaluateMathExpression("abs(42)"), "42");

    // 组合嵌套
    assert.equal(calc.evaluateMathExpression("round((50 + 70) * 0.85, 1)"), "102");
});

test("{{xlc:calc|...}}: 占位符解析与业务场景应用", () => {
    // 商务报价含税计算
    assert.equal(
        ph.applyPlaceholders("应付金额: {{xlc:calc|100 * 1.13}} 元", NOW, true),
        "应付金额: 113 元",
    );

    // 人均分摊四舍五入
    assert.equal(
        ph.applyPlaceholders("人均费用: {{xlc:calc|round(100 / 3, 2)}} 元", NOW, true),
        "人均费用: 33.33 元",
    );

    // 折扣核算
    assert.equal(
        ph.applyPlaceholders("活动特惠: {{xlc:calc|(199 + 99) * 0.8}} 元", NOW, true),
        "活动特惠: 238.4 元",
    );
});

test("listPlaceholders: 识别 calc 占位符", () => {
    const list = ph.listPlaceholders("税前 {{xlc:calc|100*1.13}} 日期 {{xlc:date}}");
    assert.deepEqual(list, ["calc", "date"]);
});

test("负向安全与防崩溃：除零、语法错误与未知标识符原样保留", () => {
    // 除以零
    assert.equal(ph.applyPlaceholders("{{xlc:calc|10 / 0}}", NOW, true), "{{xlc:calc|10 / 0}}");
    assert.equal(ph.applyPlaceholders("{{xlc:calc|10 % 0}}", NOW, true), "{{xlc:calc|10 % 0}}");

    // 括号未闭合
    assert.equal(ph.applyPlaceholders("{{xlc:calc|(10 + 5}}", NOW, true), "{{xlc:calc|(10 + 5}}");
    assert.equal(ph.applyPlaceholders("{{xlc:calc|10 + 5)}}", NOW, true), "{{xlc:calc|10 + 5)}}");

    // 缺少操作数
    assert.equal(ph.applyPlaceholders("{{xlc:calc|10 +}}", NOW, true), "{{xlc:calc|10 +}}");
    assert.equal(ph.applyPlaceholders("{{xlc:calc|* 5}}", NOW, true), "{{xlc:calc|* 5}}");

    // 试图调用非白名单函数（防代码注入）
    assert.equal(ph.applyPlaceholders("{{xlc:calc|alert(1)}}", NOW, true), "{{xlc:calc|alert(1)}}");
    assert.equal(ph.applyPlaceholders("{{xlc:calc|eval('1+1')}}", NOW, true), "{{xlc:calc|eval('1+1')}}");

    // 空表达式
    assert.equal(ph.applyPlaceholders("{{xlc:calc}}", NOW, true), "{{xlc:calc}}");
    assert.equal(ph.applyPlaceholders("{{xlc:calc|}}", NOW, true), "{{xlc:calc|}}");
});
