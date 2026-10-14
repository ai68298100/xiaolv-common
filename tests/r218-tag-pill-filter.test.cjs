// R218 条目标签胶囊渲染与即时筛选联动契约专项测试（ADR 0044 / T-0071）
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

test("i18n 资源包含 filterByThisTag 与 clearThisTagFilter 且中英文一致", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));

    assert.ok(zh.filterByThisTag, "zh-CN 必须定义 filterByThisTag");
    assert.ok(en.filterByThisTag, "en 必须定义 filterByThisTag");
    assert.ok(zh.clearThisTagFilter, "zh-CN 必须定义 clearThisTagFilter");
    assert.ok(en.clearThisTagFilter, "en 必须定义 clearThisTagFilter");

    assert.match(zh.filterByThisTag, /点击按此标签筛选/);
    assert.match(en.filterByThisTag, /Click to filter by tag/i);
    assert.match(zh.clearThisTagFilter, /点击取消标签筛选/);
    assert.match(en.clearThisTagFilter, /Click to clear tag filter/i);
});

test("标签筛选与反选状态机纯函数契约", () => {
    function toggleTagFilter(currentTag, clickedTag) {
        if (!clickedTag) return currentTag;
        return currentTag === clickedTag ? "" : clickedTag;
    }

    // 1. 当前无标签筛选时，点击某个标签 -> 激活该标签筛选
    assert.strictEqual(toggleTagFilter("", "发票"), "发票");

    // 2. 当前已筛选“发票”，再次点击“发票” -> 反选清空恢复全部
    assert.strictEqual(toggleTagFilter("发票", "发票"), "");

    // 3. 当前已筛选“发票”，点击另一个标签“客服” -> 切换为“客服”
    assert.strictEqual(toggleTagFilter("发票", "客服"), "客服");
});

test("标签胶囊列表展现截断契约（前 3 个展现，超出 +N）", () => {
    function computeShownTags(tags, maxVisible = 3) {
        const cleanTags = (tags || []).filter(Boolean);
        const shown = cleanTags.slice(0, maxVisible);
        const moreCount = cleanTags.length - shown.length;
        return {shown, moreCount};
    }

    // 1. 少于等于 3 个标签：全部展现，moreCount 为 0
    const t1 = computeShownTags(["客服", "模板"]);
    assert.deepEqual(t1.shown, ["客服", "模板"]);
    assert.strictEqual(t1.moreCount, 0);

    const t2 = computeShownTags(["商务", "财务", "发票"]);
    assert.deepEqual(t2.shown, ["商务", "财务", "发票"]);
    assert.strictEqual(t2.moreCount, 0);

    // 2. 超过 3 个标签：截断前 3 个，剩余计入 moreCount
    const t3 = computeShownTags(["开发", "前端", "TS", "Webpack", "Sass"]);
    assert.deepEqual(t3.shown, ["开发", "前端", "TS"]);
    assert.strictEqual(t3.moreCount, 2);

    // 3. 空标签与坏数据过滤
    const t4 = computeShownTags(["", null, "有效标签", undefined]);
    assert.deepEqual(t4.shown, ["有效标签"]);
    assert.strictEqual(t4.moreCount, 0);
});
