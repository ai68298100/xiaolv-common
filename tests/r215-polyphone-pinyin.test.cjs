// R215 高频多音词拼音检索修正与智能注音契约专项测试（ADR 0041 / T-0068）
const test = require("node:test");
const assert = require("node:assert/strict");
const {
    POLYPHONE_PHRASES,
    extractCharPinyins,
    createTinyPinyinAdapter,
    findPinyinMatches,
} = require("./.build/entry.cjs").pinyinTiny;

test("高频多音词词表完整性与发音规范", () => {
    assert.ok(POLYPHONE_PHRASES["银行"], "必须包含「银行」");
    assert.deepEqual(POLYPHONE_PHRASES["银行"], ["yin", "hang"]);

    assert.ok(POLYPHONE_PHRASES["开户行"], "必须包含「开户行」");
    assert.deepEqual(POLYPHONE_PHRASES["开户行"], ["kai", "hu", "hang"]);

    assert.ok(POLYPHONE_PHRASES["重新"], "必须包含「重新」");
    assert.deepEqual(POLYPHONE_PHRASES["重新"], ["chong", "xin"]);

    assert.ok(POLYPHONE_PHRASES["会计"], "必须包含「会计」");
    assert.deepEqual(POLYPHONE_PHRASES["会计"], ["kuai", "ji"]);

    assert.ok(POLYPHONE_PHRASES["调整"], "必须包含「调整」");
    assert.deepEqual(POLYPHONE_PHRASES["调整"], ["tiao", "zheng"]);
});

test("extractCharPinyins 词组前瞻多音字修正契约", () => {
    // 1. 银行：多音字「行」精准修正为 hang/h（绝非 xing/x）
    const charsBank = extractCharPinyins("开户银行账号", 80);
    const yin = charsBank.find((c) => c.char === "银");
    const hang = charsBank.find((c) => c.char === "行");
    assert.ok(yin && hang);
    assert.strictEqual(hang.py, "hang");
    assert.strictEqual(hang.initial, "h");

    // 2. 重新 vs 重要：「重」分别精准映射为 chong 与 zhong
    const charsChong = extractCharPinyins("重新评估", 80);
    assert.strictEqual(charsChong[0].char, "重");
    assert.strictEqual(charsChong[0].py, "chong");
    assert.strictEqual(charsChong[0].initial, "c");

    const charsZhong = extractCharPinyins("重要说明", 80);
    assert.strictEqual(charsZhong[0].char, "重");
    assert.strictEqual(charsZhong[0].py, "zhong");
    assert.strictEqual(charsZhong[0].initial, "z");

    // 3. 会计：「会」精准映射为 kuai/k（绝非 hui/h）
    const charsKuaiji = extractCharPinyins("财务会计", 80);
    const kuai = charsKuaiji.find((c) => c.char === "会");
    assert.ok(kuai);
    assert.strictEqual(kuai.py, "kuai");
    assert.strictEqual(kuai.initial, "k");
});

test("tinyPinyin 适配器 annotate 索引期多音字注解契约", () => {
    const adapter = createTinyPinyinAdapter();
    const annotation = adapter.annotate({title: "开户银行资料", alias: ""});
    assert.ok(annotation);

    // 1. 开户银行：pyi 必须为 "khyhzl"（包含 hang 的首字母 h，而不是 xing 的 x）
    assert.match(annotation.pyi, /khyhzl/);
    assert.match(annotation.py, /kaihuyinhangziliao/);

    // 2. 开户行：pyi 必须为 "khhzl"，py 为 "kaihuhangziliao"
    const annotation2 = adapter.annotate({title: "开户行资料", alias: ""});
    assert.ok(annotation2);
    assert.match(annotation2.pyi, /khhzl/);
    assert.match(annotation2.py, /kaihuhangziliao/);
});

test("findPinyinMatches 在多音词场景下的精准汉字物理区间定位", () => {
    // 1. "yh" 搜 "开户银行账号" -> 精准命中 "银行" [2, 4]
    const mBank = findPinyinMatches("开户银行账号", "yh");
    assert.deepEqual(mBank, [[2, 4]]);

    // 2. "hang" 全拼搜 "开户银行账号" -> 精准命中 "行" [3, 4]
    const mHang = findPinyinMatches("开户银行账号", "hang");
    assert.deepEqual(mHang, [[3, 4]]);

    // 3. "cx" 搜 "重新评估方案" -> 精准命中 "重新" [0, 2]
    const mChong = findPinyinMatches("重新评估方案", "cx");
    assert.deepEqual(mChong, [[0, 2]]);

    // 4. "kj" 搜 "财务会计审核" -> 精准命中 "会计" [2, 4]
    const mKuai = findPinyinMatches("财务会计审核", "kj");
    assert.deepEqual(mKuai, [[2, 4]]);
});
