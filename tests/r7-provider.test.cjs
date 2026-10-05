// R7：provider 虚拟条目契约——pv: 命名空间与 xlc-* 逻辑 ID 永不冲突（门禁）、上限/截断/过滤。
const test = require("node:test");
const assert = require("node:assert");
const ps = require("./.build/entry.cjs").providerSection;

test("门禁：payload > 100k 整条拒绝（防超长注入，绝不静默截尾）", () => {
    const rows = ps.buildProviderRows([
        {providerId: "p1", providerName: "P1", title: "huge", payload: "x".repeat(100_001)},
        {providerId: "p1", providerName: "P1", title: "ok", payload: "y"},
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].payload, "y");
});

test("门禁：pv: 虚拟 ID 永不与 xlc-* 逻辑 ID 冲突（执行器隔离红线）", () => {
    const rows = ps.buildProviderRows([
        {providerId: "xiaolv-checkin", providerName: "小驴打卡", title: "今日状态", payload: "已完成打卡"},
        {providerId: "xiaolv-speed-switch", providerName: "小驴雷切", title: "工作台", payload: "siyuan://workspace"},
    ]);
    assert.equal(rows.length, 2);
    for (const row of rows) {
        assert.match(row.virtualId, ps.PROVIDER_ID_PATTERN);
        assert.ok(!row.virtualId.startsWith("xlc-"), "virtual id must not collide with logical id namespace");
        assert.match(row.virtualId, /^pv:[A-Za-z0-9_-]+:\d+$/);
    }
    assert.equal(rows[0].virtualId, "pv:xiaolv-checkin:1");
    assert.equal(rows[1].virtualId, "pv:xiaolv-speed-switch:1");
});

test("契约：同提供方序号递增；坏条目过滤；payload 截断与上限 20", () => {
    const hits = [
        {providerId: "p1", providerName: "P1", title: "a", payload: "x"},
        {providerId: "p1", providerName: "P1", title: "b", payload: "y"},
        {providerId: "", providerName: "bad", title: "c", payload: "z"},
        {providerId: "p2", providerName: "P2", title: "d", payload: "   "},
        {providerId: "p2", providerName: "P2", title: "e", payload: "v".repeat(5000)},
    ];
    const rows = ps.buildProviderRows(hits);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].virtualId, "pv:p1:1");
    assert.equal(rows[1].virtualId, "pv:p1:2");
    // R34：payload 完整透传（不静默截尾）；>100k 才整条拒绝
    assert.equal(rows[2].payload.length, 5000);
    // 上限：单提供方 20 条
    const many = Array.from({length: 30}, (_, i) => ({providerId: "bulk", providerName: "B", title: `t${i}`, payload: "p"}));
    assert.equal(ps.buildProviderRows(many).length, 20);
    assert.equal(ps.buildProviderRows(null).length, 0);
});
