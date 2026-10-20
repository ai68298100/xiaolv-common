// T-0135 / R282 / G24：模板变量填写卡交互式实时求值与动态预览契约测试
const test = require("node:test");
const assert = require("node:assert");
const {variableForm} = {
    variableForm: require("./.build/entry.cjs").variableForm,
};
const vf = variableForm;

test("renderLivePreviewText: 基础变量展开与未填写兜底", () => {
    const tpl = "尊敬的 {{xlc:ask:客户名称}}，您的工单 {{xlc:ask:工单号}} 处理结果已出。";

    // 1. 全填
    const outFull = vf.renderLivePreviewText(tpl, {
        "客户名称": "王总",
        "工单号": "WO-9988",
    });
    assert.equal(outFull, "尊敬的 王总，您的工单 WO-9988 处理结果已出。");

    // 2. 部分未填 -> 遵循 __字段名__ 兜底规则
    const outPartial = vf.renderLivePreviewText(tpl, {
        "客户名称": "李经理",
    });
    assert.equal(outPartial, "尊敬的 李经理，您的工单 __工单号__ 处理结果已出。");

    // 3. 全未填
    const outEmpty = vf.renderLivePreviewText(tpl, {});
    assert.equal(outEmpty, "尊敬的 __客户名称__，您的工单 __工单号__ 处理结果已出。");
});

test("renderLivePreviewText: 声明默认值与预填展开", () => {
    const tpl = "项目: {{xlc:ask:模块=用户中心}} 截止日: {{xlc:ask:日期|date}}";

    // 未填时自动展示默认值
    const outDef = vf.renderLivePreviewText(tpl, {});
    assert.equal(outDef, "项目: 用户中心 截止日: __日期__");

    // 用户覆盖默认值
    const outOverride = vf.renderLivePreviewText(tpl, {
        "模块": "订单支付中心",
        "日期": "2026-10-31",
    });
    assert.equal(outOverride, "项目: 订单支付中心 截止日: 2026-10-31");
});

test("renderLivePreviewText: 光标标记自动剔除", () => {
    const tpl = "前置说明：\n{{xlc:cursor}}{{xlc:ask:详细备注|textarea}}\n结束。";
    const out = vf.renderLivePreviewText(tpl, {
        "详细备注": "第一点\n第二点",
    });
    // 关键：{{xlc:cursor}} 必须被剥离，不得残留在实时预览中
    assert.ok(!out.includes("{{xlc:cursor}}"));
    assert.equal(out, "前置说明：\n第一点\n第二点\n结束。");
});

test("renderLivePreviewText: 空模板与超长安全截断", () => {
    // 空模板
    assert.equal(vf.renderLivePreviewText("", {}), "");
    assert.equal(vf.renderLivePreviewText(null, {}), "");

    // 超长文本截断（默认 1000 字符，此处用 maxChars 参数测试）
    const longTpl = "A".repeat(500) + " {{xlc:ask:tail}}";
    const outClipped = vf.renderLivePreviewText(longTpl, {tail: "B".repeat(500)}, 100);
    assert.equal(outClipped.length, 101); // 100 + "…"
    assert.ok(outClipped.endsWith("…"));
});
