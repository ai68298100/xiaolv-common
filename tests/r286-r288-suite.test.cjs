// T-0139~T-0141 / R286~R288 综合契约测试套件
// 包含 G27 唯一别名直达、G28 使用热力透视与打字节省时间计算、G29 模板包依赖图谱分析
const test = require("node:test");
const assert = require("node:assert");
const {search, usageInsights, importMarkdown} = {
    search: require("./.build/entry.cjs").search,
    usageInsights: require("./.build/entry.cjs").usageInsights,
    importMarkdown: require("./.build/entry.cjs").importMarkdown,
};

// ── 1. G27 / T-0139: 唯一别名精确匹配快捷直达 ──
test("findExactAliasMatch: 唯一别名精准匹配与去歧义隔离", () => {
    const entries = [
        {id: "1", title: "延期道歉信", alias: "yp", tags: []},
        {id: "2", title: "退款操作指引", alias: "tk", tags: []},
        {id: "3", title: "退卡流程", alias: "tk", tags: []}, // 同别名条目 1
        {id: "4", title: "发票开具资料", alias: "FP", tags: []}, // 大写别名
    ];

    // 1. 唯一精准匹配
    const match1 = search.findExactAliasMatch(entries, "yp");
    assert.ok(match1);
    assert.equal(match1.id, "1");

    // 2. 首尾空格与大小写不敏感
    const match2 = search.findExactAliasMatch(entries, "  fp  ");
    assert.ok(match2);
    assert.equal(match2.id, "4");

    // 3. 存在歧义（多个同名别名 "tk"）时必须返回 null，绝不冒失直达
    const ambiguous = search.findExactAliasMatch(entries, "tk");
    assert.equal(ambiguous, null);

    // 4. 无匹配或空输入返回 null
    assert.equal(search.findExactAliasMatch(entries, "none"), null);
    assert.equal(search.findExactAliasMatch(entries, ""), null);
    assert.equal(search.findExactAliasMatch(entries, "   "), null);
});

// ── 2. G28 / T-0140: 使用热力透视与时间节省计算看板 ──
test("calculateUsageInsights: 击键量估算、打字时间换算与 7 天活跃统计", () => {
    const now = 1700000000000;
    const usage = {
        "item-1": {count: 10, lastAt: now - 1000}, // 最近活跃
        "item-2": {count: 5, lastAt: now - 10 * 86400000}, // 超过 7 天
        "item-3": {count: 20, lastAt: now - 3600000}, // 最近活跃
    };
    const items = [
        {id: "item-1", title: "长模板", contentLength: 56}, // 单次节省 56 - 6 = 50
        {id: "item-2", title: "中模板", contentLength: 26}, // 单次节省 26 - 6 = 20
        {id: "item-3", title: "高频模板", contentLength: 36}, // 单次节省 36 - 6 = 30
    ];

    const result = usageInsights.calculateUsageInsights(usage, items, now);

    // 1. 累计调用总数: 10 + 5 + 20 = 35
    assert.equal(result.totalCalls, 35);

    // 2. 累计节省按键量: (10*50) + (5*20) + (20*30) = 500 + 100 + 600 = 1200
    assert.equal(result.totalSavedKeystrokes, 1200);

    // 3. 估算节省时间 (按 200 字符/分钟): 1200 / 200 = 6.0 分钟
    assert.equal(result.estimatedMinutesSaved, 6);
    assert.equal(result.formattedTimeSaved, "6 分钟");

    // 4. 7天活跃条目数: item-1 与 item-3 符合
    assert.equal(result.activeItems7Days, 2);

    // 5. Top 5 榜单排序 (按 count 降序: item-3(20) > item-1(10) > item-2(5))
    assert.equal(result.topItems.length, 3);
    assert.equal(result.topItems[0].id, "item-3");
    assert.equal(result.topItems[1].id, "item-1");
    assert.equal(result.topItems[2].id, "item-2");
});

test("formatSavedTime: 时间区间人类易读展示", () => {
    assert.equal(usageInsights.formatSavedTime(0.5), "< 1 分钟");
    assert.equal(usageInsights.formatSavedTime(25.4), "25 分钟");
    assert.equal(usageInsights.formatSavedTime(60), "1 小时");
    assert.equal(usageInsights.formatSavedTime(150), "2.5 小时");
});

// ── 3. G29 / T-0141: 模板包片段依赖关系树形分析 ──
test("buildPackDependencyMap: 条目依赖图谱分析与代码块排除", () => {
    const items = [
        {
            id: "xlc-main",
            title: "商务主邮件",
            itemType: "markdown",
            kramdown: "尊敬的客户：\n\n{{xlc:snippet:致辞页眉}}\n\n感谢配合。\n\n{{xlc:snippet:联系签名}}",
        },
        {
            id: "xlc-sub",
            title: "致辞页眉",
            itemType: "markdown",
            kramdown: "祝商祺！\n{{xlc:snippet:公司标语}}",
        },
        {
            id: "xlc-code",
            title: "代码片段演示",
            itemType: "code",
            kramdown: "const s = '{{xlc:snippet:字面文本}}';", // 代码块不作为依赖关系
        },
    ];

    const map = importMarkdown.buildPackDependencyMap(items);

    assert.ok(map["商务主邮件"]);
    assert.deepEqual(map["商务主邮件"], ["致辞页眉", "联系签名"]);

    assert.ok(map["致辞页眉"]);
    assert.deepEqual(map["致辞页眉"], ["公司标语"]);

    // 代码块条目被正确排除
    assert.equal(map["代码片段演示"], undefined);
});
