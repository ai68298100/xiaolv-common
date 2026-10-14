// R212 拼音检索汉字字符级定位高亮契约专项测试（ADR 0038 / T-0065）
const test = require("node:test");
const assert = require("node:assert/strict");
const {findPinyinMatches} = require("./.build/entry.cjs").pinyinTiny;

test("拼音首字母匹配定位契约（Initials Match）", () => {
    // 1. 标题开头拼音首字母："yq" 匹配 "延期致歉回复" 中的 "延期"
    const m1 = findPinyinMatches("延期致歉回复", "yq");
    assert.deepEqual(m1, [[0, 2]]);

    // 2. 标题中间拼音首字母："zq" 匹配 "延期致歉回复" 中的 "致歉"
    const m2 = findPinyinMatches("延期致歉回复", "zq");
    assert.deepEqual(m2, [[2, 4]]);

    // 3. 标题末尾拼音首字母："hf" 匹配 "延期致歉回复" 中的 "回复"
    const m3 = findPinyinMatches("延期致歉回复", "hf");
    assert.deepEqual(m3, [[4, 6]]);

    // 4. "kp" 匹配 "开票资料" 中的 "开票"
    const m4 = findPinyinMatches("开票资料", "kp");
    assert.deepEqual(m4, [[0, 2]]);

    // 5. 中英混排："fy" 匹配 "SQL 分页查询" 中的 "分页"
    const m5 = findPinyinMatches("SQL 分页查询", "fy");
    assert.deepEqual(m5, [[4, 6]]);
});

test("拼音全拼音节匹配定位契约（Full Pinyin Match）", () => {
    // 1. "yanqi" 连续双字全拼匹配 "延期致歉回复" 中的 "延期"
    const m1 = findPinyinMatches("延期致歉回复", "yanqi");
    assert.deepEqual(m1, [[0, 2]]);

    // 2. "kaipiao" 全拼匹配 "开票资料" 中的 "开票"
    const m2 = findPinyinMatches("开票资料", "kaipiao");
    assert.deepEqual(m2, [[0, 2]]);

    // 3. 单字全拼："zhi" 匹配 "延期致歉回复" 中的 "致"
    const m3 = findPinyinMatches("延期致歉回复", "zhi");
    assert.deepEqual(m3, [[2, 3]]);
});

test("拼音高亮边界保护与优雅降级", () => {
    // 1. 空输入
    assert.deepEqual(findPinyinMatches("", "yq"), []);
    assert.deepEqual(findPinyinMatches("延期", ""), []);

    // 2. 含有非 ASCII 字母的 token（应交由字面匹配，不进行拼音定位）
    assert.deepEqual(findPinyinMatches("延期致歉", "延期"), []);
    assert.deepEqual(findPinyinMatches("延期致歉", "yq123"), []);

    // 3. 未命中的拼音
    assert.deepEqual(findPinyinMatches("延期致歉", "xyz"), []);

    // 4. 大小写不敏感：输入大写 "YQ" 同样定位
    const upper = findPinyinMatches("延期致歉回复", "YQ");
    assert.deepEqual(upper, [[0, 2]]);
});
