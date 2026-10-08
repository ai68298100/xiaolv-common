// R160：日期算术 {{xlc:date:+3d}} / {{xlc:date:next_monday}}、随机选择 {{xlc:random:a,b,c}}、
// 多行文本变量 {{xlc:ask:字段|textarea}}（解析/回显/展开口径）。
// 负向锁定：非法表达式与裸 random 一律原样保留（不吞内容，与「未知占位符原样保留」同一条诚实性原则）。
const test = require("node:test");
const assert = require("node:assert");
const {placeholders, variables} = {
    placeholders: require("./.build/entry.cjs").placeholders,
    variables: require("./.build/entry.cjs").variables,
};
const ph = placeholders;
const vars = variables;

const NOW = new Date(2026, 9, 6, 14, 5); // 2026-10-06 14:05 周二

test("日期算术：日/周偏移", () => {
    assert.equal(ph.applyPlaceholders("截止 {{xlc:date:+3d}}", NOW, true), "截止 2026-10-09");
    assert.equal(ph.applyPlaceholders("回顾 {{xlc:date:-1w}}", NOW, true), "回顾 2026-09-29");
    assert.equal(ph.resolveDateArg(NOW, "+30d"), "2026-11-05");
});

test("日期算术：月/年进位按日历钳制（1/31+1m→2/28；闰年 2/29+1y→2/28）", () => {
    assert.equal(ph.resolveDateArg(new Date(2026, 0, 31), "+1m"), "2026-02-28");
    assert.equal(ph.resolveDateArg(new Date(2024, 1, 29), "+1y"), "2025-02-28");
    assert.equal(ph.resolveDateArg(new Date(2026, 9, 6), "+2m"), "2026-12-06");
    // 跨年
    assert.equal(ph.resolveDateArg(new Date(2026, 11, 31), "+1d"), "2027-01-01");
});

test("日期算术：next_星期取严格未来最近一天（当天不算）", () => {
    // 2026-10-06 是周二 → next_tuesday 是下 7 天
    assert.equal(ph.resolveDateArg(NOW, "next_tuesday"), "2026-10-13");
    assert.equal(ph.resolveDateArg(NOW, "next_wednesday"), "2026-10-07");
    // 周一已过：下一个是 6 天后
    assert.equal(ph.resolveDateArg(NOW, "next_monday"), "2026-10-12");
    // 周日（getDay=0 分支）
    assert.equal(ph.resolveDateArg(NOW, "next_sunday"), "2026-10-11");
});

test("日期算术：大小写与空白宽容（参数 trim + 小写化）", () => {
    assert.equal(ph.resolveDateArg(NOW, " +3D "), "2026-10-09");
    assert.equal(ph.resolveDateArg(NOW, "NEXT_MONDAY"), "2026-10-12");
});

test("负向：非法日期表达式原样保留，不吞内容", () => {
    const raw = "{{xlc:date:bogus}} {{xlc:date:+3x}} {{xlc:date:monday}}";
    assert.equal(ph.applyPlaceholders(raw, NOW, true), raw);
    // 合法边界：+0d 即当天
    assert.equal(ph.applyPlaceholders("{{xlc:date:+0d}}", NOW, true), "2026-10-06");
    // 基础 kind 不接受参数：静默忽略参数等于偷偷改语义，也保留
    assert.equal(ph.applyPlaceholders("{{xlc:time:abc}}", NOW, true), "{{xlc:time:abc}}");
    // 裸 random（无选项）无意义，保留
    assert.equal(ph.applyPlaceholders("{{xlc:random}}", NOW, true), "{{xlc:random}}");
    assert.equal(ph.applyPlaceholders("{{xlc:random: , ,}}", NOW, true), "{{xlc:random: , ,}}");
});

test("随机选择：结果必在选项集中；选项去空白；多次取值有覆盖", () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
        const out = ph.applyPlaceholders("{{xlc:random: 甲 , 乙 , 丙 }}", NOW, true);
        assert.match(out, /^甲$|^乙$|^丙$/);
        seen.add(out);
    }
    assert.ok(seen.size >= 2, `200 次只出现 ${seen.size} 种，随机性可疑`);
    assert.equal(ph.applyPlaceholders("{{xlc:random:唯一}}", NOW, true), "唯一");
});

test("listPlaceholders 识别带参形态", () => {
    assert.deepEqual(ph.listPlaceholders("{{xlc:date:+3d}}{{xlc:random:a,b}}"), ["date", "random"]);
    assert.deepEqual(ph.listPlaceholders("{{xlc:date}} {{xlc:date:next_monday}}"), ["date"]);
});

test("textarea 变量：解析为 textarea 字段；大小写不敏感", () => {
    const field = vars.parseAskField("备注", "textarea");
    assert.deepEqual(field, {name: "备注", kind: "textarea", options: []});
    assert.equal(vars.parseAskField("备注", "TextArea")?.kind, "textarea");
    assert.equal(vars.listAskFields("{{xlc:ask:备注|textarea}} {{xlc:ask:客户}}")[0]?.kind, "textarea");
});

test("textarea 变量：展开支持多行填充值（trim 不伤内部换行）", () => {
    const out = vars.expandAsks("结论：{{xlc:ask:备注|textarea}}", {备注: "第一行\n第二行\n"});
    assert.equal(out, "结论：第一行\n第二行");
    // 未填充兜底 __名称__
    assert.equal(vars.applyAskDefaults("结论：{{xlc:ask:备注|textarea}}"), "结论：__备注__");
});

test("askFieldTag：四类字段回显与解析口径一致", () => {
    assert.equal(vars.askFieldTag({name: "客户", kind: "text", options: []}), "{{xlc:ask:客户}}");
    assert.equal(vars.askFieldTag({name: "跟进日期", kind: "date", options: []}), "{{xlc:ask:跟进日期|date}}");
    assert.equal(vars.askFieldTag({name: "备注", kind: "textarea", options: []}), "{{xlc:ask:备注|textarea}}");
    assert.equal(
        vars.askFieldTag({name: "渠道", kind: "select", options: ["邮件", "电话"]}),
        "{{xlc:ask:渠道|邮件,电话}}",
    );
    // 回显再解析 = 恒等（textarea 此前会回显成 |+空选项串，口径漂移）
    for (const field of vars.listAskFields("{{xlc:ask:a}} {{xlc:ask:b|date}} {{xlc:ask:c|textarea}} {{xlc:ask:d|x,y}}")) {
        const roundTrip = vars.listAskFields(vars.askFieldTag(field));
        assert.equal(roundTrip.length, 1);
        assert.deepEqual(roundTrip[0], field);
    }
});
