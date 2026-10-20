// T-0136 / R283 / G25：正则提取与文本动态替换安全过滤器契约测试
const test = require("node:test");
const assert = require("node:assert");
const {placeholders} = {
    placeholders: require("./.build/entry.cjs").placeholders,
};
const ph = placeholders;

const NOW = new Date(2026, 9, 20, 16, 0, 0);

test("isDangerousRegex: 拦截 ReDoS 灾难性回溯特征与超长正则", () => {
    // 危险嵌套量词拦截
    assert.equal(ph.isDangerousRegex("(a+)+"), true);
    assert.equal(ph.isDangerousRegex("(a*)*"), true);
    assert.equal(ph.isDangerousRegex("([a-z]+)*"), true);
    assert.equal(ph.isDangerousRegex("a++"), true);
    assert.equal(ph.isDangerousRegex("a*+"), true);

    // 超长正则拦截 (>64 字符)
    assert.equal(ph.isDangerousRegex("a".repeat(65)), true);

    // 安全合法正则放行
    assert.equal(ph.isDangerousRegex("\\d{6,12}"), false);
    assert.equal(ph.isDangerousRegex("^([^@]+)@"), false);
    assert.equal(ph.isDangerousRegex("(\\d{3})\\d{4}(\\d{4})"), false);
    assert.equal(ph.isDangerousRegex("[a-zA-Z0-9_-]+"), false);
});

test("applyRegexFilter: 正则提取 (extract)", () => {
    // 1. 无分组时提取全匹配
    const res1 = ph.applyRegexFilter("extract", "\\d{6}", "流水单号: 20261020-ABC");
    assert.equal(res1, "202610");

    // 2. 有捕获组时提取第一捕获组
    const res2 = ph.applyRegexFilter("extract", "order_([a-z0-9]+)", "处理记录: order_xyz8899_finish");
    assert.equal(res2, "xyz8899");

    // 3. 邮箱提取用户名
    const res3 = ph.applyRegexFilter("extract", "^([^@]+)", "zhangsan@example.com");
    assert.equal(res3, "zhangsan");

    // 4. 无匹配时返回空串
    const res4 = ph.applyRegexFilter("extract", "\\d{4}", "没有数字");
    assert.equal(res4, "");
});

test("applyRegexFilter: 正则全局替换 (replace)", () => {
    // 1. 空白替换为下划线
    const res1 = ph.applyRegexFilter("replace", "\\s+", "hello   world   test", "_");
    assert.equal(res1, "hello_world_test");

    // 2. 手机号脱敏 (分组引用 $1, $2)
    const res2 = ph.applyRegexFilter("replace", "(\\d{3})\\d{4}(\\d{4})", "联系电话: 13812345678", "$1****$2");
    assert.equal(res2, "联系电话: 138****5678");

    // 3. 剔除特殊符号
    const res3 = ph.applyRegexFilter("replace", "[^a-zA-Z0-9]", "Token: #abc-123!", "");
    assert.equal(res3, "Tokenabc123");
});

test("{{xlc:regex|...}}: 管道语法与占位符展开", () => {
    // 提取单号
    const out1 = ph.applyPlaceholders("单号: {{xlc:regex|extract|\\d{8}|ID: 202610209999}}", NOW, true);
    assert.equal(out1, "单号: 20261020");

    // 分组提取
    const out2 = ph.applyPlaceholders("用户: {{xlc:regex|extract|^([^@]+)|alice@siyuan.org}}", NOW, true);
    assert.equal(out2, "用户: alice");

    // 正则替换
    const out3 = ph.applyPlaceholders("脱敏: {{xlc:regex|replace|(\\d{3})\\d{4}(\\d{4})|$1****$2|13912345678}}", NOW, true);
    assert.equal(out3, "脱敏: 139****5678");
});

test("{{xlc:regex:...}}: 兼容冒号子命令语法", () => {
    // extract
    const out1 = ph.applyPlaceholders("提取: {{xlc:regex:extract|\\d+|ABC123XYZ}}", NOW, true);
    assert.equal(out1, "提取: 123");

    // replace
    const out2 = ph.applyPlaceholders("替换: {{xlc:regex:replace|-|_|a-b-c}}", NOW, true);
    assert.equal(out2, "替换: a_b_c");
});

test("listPlaceholders: 正确识别 regex 种类", () => {
    const list1 = ph.listPlaceholders("{{xlc:regex|extract|\\d+|text}} {{xlc:date}}");
    assert.deepEqual(list1, ["regex", "date"]);

    const list2 = ph.listPlaceholders("{{xlc:regex:replace|a|b|text}}");
    assert.deepEqual(list2, ["regex"]);
});

test("负向安全：非法正则与未知动作原样保留，绝不吞噬内容", () => {
    // 危险 ReDoS 正则 -> 拒绝执行并原样保留
    const dangerous = "{{xlc:regex|extract|(a+)+|aaaa}}";
    assert.equal(ph.applyPlaceholders(dangerous, NOW, true), dangerous);

    // 畸形正则语法 -> 安全返回 null 并保留原文
    const invalidRe = "{{xlc:regex|extract|[a-z|text}}";
    assert.equal(ph.applyPlaceholders(invalidRe, NOW, true), invalidRe);

    // 未知动作
    const unknownAction = "{{xlc:regex|bogus|pattern|text}}";
    assert.equal(ph.applyPlaceholders(unknownAction, NOW, true), unknownAction);

    // 缺少参数
    assert.equal(ph.applyPlaceholders("{{xlc:regex}}", NOW, true), "{{xlc:regex}}");
    assert.equal(ph.applyPlaceholders("{{xlc:regex|extract}}", NOW, true), "{{xlc:regex|extract}}");
});
