// R164：Espanso YAML 导入转换器（G2）。锁定映射口径：date/clipboard/random/forms/未知变量保留+issue。
const test = require("node:test");
const assert = require("node:assert");
const {espanso, variables} = {
    espanso: require("./.build/entry.cjs").espanso,
    variables: require("./.build/entry.cjs").variables,
};

const BASE_YAML = `matches:
  - trigger: ":sig"
    replace: "王总 您好"
  - trigger: ":addr"
    replace: |
      第一行
      第二行
`;

test("基础映射：trigger→title/alias，replace→kramdown，tags 标记来源", () => {
    const r = espanso.parseEspansoYaml(BASE_YAML);
    assert.equal(r.items.length, 2);
    assert.equal(r.issues.length, 0);
    assert.equal(r.items[0].title, "sig");
    assert.equal(r.items[0].alias, ":sig");
    assert.equal(r.items[0].kramdown, "王总 您好");
    assert.equal(r.items[0].itemType, "text");
    assert.deepEqual(r.items[0].tags, ["espanso"]);
    // 多行块标量原样保留
    assert.equal(r.items[1].kramdown, "第一行\n第二行");
    // 逻辑 ID：平台规则形（xlc-[0-9a-z]{10,40}）+ 确定性
    assert.match(r.items[0].id, /^xlc-e[0-9a-z]{7,14}$/);
    assert.equal(r.items[0].id, espanso.espansoLogicalId(":sig"));
});

test("date 变量：按格式映射 %Y-%m-%d→{{xlc:date}}、%H:%M→{{xlc:time}}；怪格式降级 date + issue", () => {
    const yaml = `matches:
  - trigger: ":跟进"
    replace: "截止 {{due}} 时间 {{at}}"
    vars:
      - name: due
        type: date
        params: {format: "%Y-%m-%d"}
      - name: at
        type: date
        params: {format: "%H:%M"}
  - trigger: ":怪格式"
    replace: "日 {{d}}"
    vars:
      - name: d
        type: date
        params: {format: "%A %d %B"}
`;
    const r = espanso.parseEspansoYaml(yaml);
    assert.equal(r.items[0].kramdown, "截止 {{xlc:date}} 时间 {{xlc:time}}");
    assert.equal(r.items[1].kramdown, "日 {{xlc:date}}");
    assert.ok(r.issues.some((i) => i.includes("%A %d %B")));
});

test("clipboard 直映；random 内联改写；ask 表单双形态映射", () => {
    const yaml = `matches:
  - trigger: ":clip"
    replace: "{{clipboard}}"
  - trigger: ":抽签"
    replace: "{{random:甲,乙,丙}}"
  - trigger: ":表单"
    replace: "致 [[收件人]]：渠道 [[渠道={邮件,电话}]]"
`;
    const r = espanso.parseEspansoYaml(yaml);
    assert.equal(r.items[0].kramdown, "{{xlc:clipboard}}");
    assert.equal(r.items[1].kramdown, "{{xlc:random|甲,乙,丙}}");
    assert.equal(r.items[2].kramdown, "致 {{xlc:ask:收件人}}：渠道 {{xlc:ask:渠道|邮件,电话}}");
    // 映射产物必须能被本库 ask 解析器识别（口径一致）
    const fields = variables.listAskFields(r.items[2].kramdown);
    assert.deepEqual(fields.map((f) => f.name), ["收件人", "渠道"]);
    assert.equal(fields[1].kind, "select");
    assert.deepEqual(fields[1].options, ["邮件", "电话"]);
});

test("负向：未知变量原样保留 + issue；坏 YAML / 缺 matches / 缺 trigger 均不静默丢", () => {
    const unknown = espanso.parseEspansoYaml(`matches:
  - trigger: ":脚本"
    replace: "运行 {{shell_output}}"
    vars:
      - name: shell_output
        type: script
        params: {args: "ls"}
`);
    assert.equal(unknown.items[0].kramdown, "运行 {{shell_output}}");
    assert.ok(unknown.issues.some((i) => i.includes("shell_output")));

    const bad = espanso.parseEspansoYaml("matches: [ {trigger: \":x\", replace: \"y\"");
    assert.equal(bad.items.length, 0);
    assert.ok(bad.issues[0].includes("YAML 解析失败"));

    const noMatches = espanso.parseEspansoYaml("foo: bar");
    assert.equal(noMatches.items.length, 0);
    assert.ok(noMatches.issues[0].includes("matches"));

    const missing = espanso.parseEspansoYaml("matches:\n  - replace: \"只有正文\"\n  - trigger: \":ok\"\n    replace: \"好\"");
    assert.equal(missing.items.length, 1);
    assert.ok(missing.issues.some((i) => i.includes("缺少 trigger")));
});

test("逻辑 ID：确定性、平台规则形、CJK 触发词不坍缩互撞（R164 真机回归）", () => {
    // 同 trigger → 同 ID（重复导入走冲突策略的前提）
    assert.equal(espanso.espansoLogicalId(":sig"), espanso.espansoLogicalId(":sig"));
    // 平台规则：createItem 只认 ^xlc-[0-9a-z]{10,40}$
    for (const t of [":sig", ":跟进", ":表单", "!!!"]) {
        assert.match(espanso.espansoLogicalId(t), /^xlc-[0-9a-z]{10,40}$/);
    }
    // R164 真机缺陷回归：不同 CJK 触发词必须得到不同 ID（旧净化逻辑把 :跟进/:表单 都坍缩成 espanso-unnamed）
    assert.notEqual(espanso.espansoLogicalId(":跟进"), espanso.espansoLogicalId(":表单"));
    assert.notEqual(espanso.espansoLogicalId(":sig"), espanso.espansoLogicalId(":表单"));
});
