// T-0127 / R274 / G16：自定义日期时间格式化与算术组合引擎自动化契约测试
const test = require("node:test");
const assert = require("node:assert");
const {placeholders} = {
    placeholders: require("./.build/entry.cjs").placeholders,
};
const ph = placeholders;

// 基准时间：2026-10-06 14:05:09（周二，下午）
const NOW = new Date(2026, 9, 6, 14, 5, 9);

test("formatDateTime: 基础时间令牌精确映射", () => {
    // 年
    assert.equal(ph.formatDateTime(NOW, "YYYY"), "2026");
    assert.equal(ph.formatDateTime(NOW, "YY"), "26");
    // 月
    assert.equal(ph.formatDateTime(NOW, "MM"), "10");
    assert.equal(ph.formatDateTime(NOW, "M"), "10");
    // 日
    assert.equal(ph.formatDateTime(NOW, "DD"), "06");
    assert.equal(ph.formatDateTime(NOW, "D"), "6");
    // 24小时制
    assert.equal(ph.formatDateTime(NOW, "HH"), "14");
    assert.equal(ph.formatDateTime(NOW, "H"), "14");
    // 12小时制
    assert.equal(ph.formatDateTime(NOW, "hh"), "02");
    assert.equal(ph.formatDateTime(NOW, "h"), "2");
    // 分
    assert.equal(ph.formatDateTime(NOW, "mm"), "05");
    assert.equal(ph.formatDateTime(NOW, "m"), "5");
    // 秒
    assert.equal(ph.formatDateTime(NOW, "ss"), "09");
    assert.equal(ph.formatDateTime(NOW, "s"), "9");
    // 星期
    assert.equal(ph.formatDateTime(NOW, "dddd"), "星期二");
    assert.equal(ph.formatDateTime(NOW, "ddd"), "周二");
    // 时段
    assert.equal(ph.formatDateTime(NOW, "A"), "下午");
    assert.equal(ph.formatDateTime(NOW, "a"), "pm");
});

test("formatDateTime: 上午与 12 小时制边界", () => {
    // 00:00:00 边界（午夜 12 点）
    const midnight = new Date(2026, 9, 6, 0, 0, 0);
    assert.equal(ph.formatDateTime(midnight, "hh:mm:ss A"), "12:00:00 上午");
    assert.equal(ph.formatDateTime(midnight, "h:m a"), "12:0 am");

    // 12:00:00 边界（正午 12 点）
    const noon = new Date(2026, 9, 6, 12, 0, 0);
    assert.equal(ph.formatDateTime(noon, "hh:mm:ss A"), "12:00:00 下午");
    assert.equal(ph.formatDateTime(noon, "h:m a"), "12:0 pm");
});

test("isValidFormatPattern: 模式合法性与未知 token 拒绝", () => {
    // 合法
    assert.equal(ph.isValidFormatPattern("YYYY-MM-DD"), true);
    assert.equal(ph.isValidFormatPattern("YYYY年MM月DD日"), true);
    assert.equal(ph.isValidFormatPattern("HH:mm:ss"), true);
    assert.equal(ph.isValidFormatPattern("YYYY/MM/DD HH:mm"), true);
    assert.equal(ph.isValidFormatPattern("YYYY-MM-DDTHH:mm:ss"), true);
    assert.equal(ph.isValidFormatPattern("hh:mm A"), true);

    // 非法模式（包含未知英文字母或无有效令牌）
    assert.equal(ph.isValidFormatPattern("abc"), false);
    assert.equal(ph.isValidFormatPattern("bogus"), false);
    assert.equal(ph.isValidFormatPattern("test"), false);
    assert.equal(ph.isValidFormatPattern(""), false);
    assert.equal(ph.isValidFormatPattern("   "), false);
    assert.equal(ph.isValidFormatPattern("---"), false);
});

test("calculateTimeOffset: 相对时间偏移运算", () => {
    // +1h
    const plus1h = ph.calculateTimeOffset(NOW, "+1h");
    assert.ok(plus1h);
    assert.equal(plus1h.getHours(), 15);
    assert.equal(plus1h.getMinutes(), 5);

    // -30m
    const minus30m = ph.calculateTimeOffset(NOW, "-30m");
    assert.ok(minus30m);
    assert.equal(minus30m.getHours(), 13);
    assert.equal(minus30m.getMinutes(), 35);

    // +45s
    const plus45s = ph.calculateTimeOffset(NOW, "+45s");
    assert.ok(plus45s);
    assert.equal(plus45s.getSeconds(), 54);

    // 非法
    assert.equal(ph.calculateTimeOffset(NOW, "1h"), null);
    assert.equal(ph.calculateTimeOffset(NOW, "+1x"), null);
});

test("{{xlc:date|...}}: 自定义格式化与算术复合", () => {
    // 纯格式化
    assert.equal(
        ph.applyPlaceholders("今天 {{xlc:date|YYYY年MM月DD日}}", NOW, true),
        "今天 2026年10月06日",
    );
    assert.equal(
        ph.applyPlaceholders("归档 {{xlc:date|YYYYMMDD}}", NOW, true),
        "归档 20261006",
    );
    assert.equal(
        ph.applyPlaceholders("路径 {{xlc:date|YYYY/MM/DD}}", NOW, true),
        "路径 2026/10/06",
    );

    // 相对日算术 + 自定义格式化
    assert.equal(
        ph.applyPlaceholders("三天后是 {{xlc:date|+3d|YYYY年MM月DD日}}", NOW, true),
        "三天后是 2026年10月09日",
    );
    assert.equal(
        ph.applyPlaceholders("明天是 {{xlc:date|明天|YYYY/MM/DD}}", NOW, true),
        "明天是 2026/10/07",
    );
    assert.equal(
        ph.applyPlaceholders("下周一是 {{xlc:date|下周一|YYYY年MM月DD日 dddd}}", NOW, true),
        "下周一是 2026年10月12日 星期一",
    );
});

test("{{xlc:time|...}}: 自定义格式化与时间偏移", () => {
    // 默认输出 HH:mm
    assert.equal(ph.applyPlaceholders("时间 {{xlc:time}}", NOW, true), "时间 14:05");

    // 格式化带秒
    assert.equal(ph.applyPlaceholders("带秒 {{xlc:time|HH:mm:ss}}", NOW, true), "带秒 14:05:09");
    assert.equal(ph.applyPlaceholders("中文 {{xlc:time|HH点mm分ss秒}}", NOW, true), "中文 14点05分09秒");
    assert.equal(ph.applyPlaceholders("12小时制 {{xlc:time|hh:mm A}}", NOW, true), "12小时制 02:05 下午");

    // 时间偏移
    assert.equal(ph.applyPlaceholders("1小时后 {{xlc:time|+1h}}", NOW, true), "1小时后 15:05");
    assert.equal(ph.applyPlaceholders("30分钟前 {{xlc:time|-30m}}", NOW, true), "30分钟前 13:35");

    // 时间偏移 + 复合格式化
    assert.equal(
        ph.applyPlaceholders("会议截止 {{xlc:time|+2h|HH:mm:ss}}", NOW, true),
        "会议截止 16:05:09",
    );
});

test("{{xlc:datetime|...}}: 自定义格式化与算术组合", () => {
    // 默认
    assert.equal(ph.applyPlaceholders("当前 {{xlc:datetime}}", NOW, true), "当前 2026-10-06 14:05");

    // 完整时间戳格式化
    assert.equal(
        ph.applyPlaceholders("生成于 {{xlc:datetime|YYYY-MM-DD HH:mm:ss}}", NOW, true),
        "生成于 2026-10-06 14:05:09",
    );
    assert.equal(
        ph.applyPlaceholders("斜杠日期时间 {{xlc:datetime|YYYY/MM/DD HH:mm}}", NOW, true),
        "斜杠日期时间 2026/10/06 14:05",
    );

    // 日期偏移 + 自定义完整格式
    assert.equal(
        ph.applyPlaceholders("明日此时 {{xlc:datetime|明天|YYYY-MM-DD HH:mm:ss}}", NOW, true),
        "明日此时 2026-10-07 14:05:09",
    );
    assert.equal(
        ph.applyPlaceholders("三天后通知 {{xlc:datetime|+3d|YYYY/MM/DD HH:mm:ss}}", NOW, true),
        "三天后通知 2026/10/09 14:05:09",
    );
});

test("{{xlc:weekday|...}}: 完整中文与英文星期支持", () => {
    // 默认
    assert.equal(ph.applyPlaceholders("今天 {{xlc:weekday}}", NOW, true), "今天 周二");
    // full / dddd
    assert.equal(ph.applyPlaceholders("今天 {{xlc:weekday|full}}", NOW, true), "今天 星期二");
    assert.equal(ph.applyPlaceholders("今天 {{xlc:weekday|dddd}}", NOW, true), "今天 星期二");
    // ddd / short
    assert.equal(ph.applyPlaceholders("今天 {{xlc:weekday|short}}", NOW, true), "今天 周二");
    assert.equal(ph.applyPlaceholders("今天 {{xlc:weekday|ddd}}", NOW, true), "今天 周二");
    // en
    assert.equal(ph.applyPlaceholders("Today is {{xlc:weekday|en}}", NOW, true), "Today is Tuesday");
    // en_short
    assert.equal(ph.applyPlaceholders("Today is {{xlc:weekday|en_short}}", NOW, true), "Today is Tue");
});

test("负向安全：未知参数与非法表达式原样保留，绝不吞噬内容", () => {
    // 非法日期
    assert.equal(ph.applyPlaceholders("{{xlc:date|bogus}}", NOW, true), "{{xlc:date|bogus}}");
    assert.equal(ph.applyPlaceholders("{{xlc:date|+3d|bogus}}", NOW, true), "{{xlc:date|+3d|bogus}}");

    // 非法时间
    assert.equal(ph.applyPlaceholders("{{xlc:time|abc}}", NOW, true), "{{xlc:time|abc}}");
    assert.equal(ph.applyPlaceholders("{{xlc:time|bogus}}", NOW, true), "{{xlc:time|bogus}}");
    assert.equal(ph.applyPlaceholders("{{xlc:time|+1h|bogus}}", NOW, true), "{{xlc:time|+1h|bogus}}");

    // 非法 datetime
    assert.equal(ph.applyPlaceholders("{{xlc:datetime|invalid}}", NOW, true), "{{xlc:datetime|invalid}}");
    assert.equal(ph.applyPlaceholders("{{xlc:datetime|明天|invalid}}", NOW, true), "{{xlc:datetime|明天|invalid}}");

    // 非法 weekday
    assert.equal(ph.applyPlaceholders("{{xlc:weekday|invalid}}", NOW, true), "{{xlc:weekday|invalid}}");
    assert.equal(ph.applyPlaceholders("{{xlc:weekday|123}}", NOW, true), "{{xlc:weekday|123}}");
});
