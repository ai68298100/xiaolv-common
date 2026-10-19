// R271 专项：批量导入 CSV/TSV 字段映射向导 (G13) 与自定义列覆盖
const test = require("node:test");
const assert = require("node:assert");
const {csvTsvImport} = require("./.build/entry.cjs");

test("parseCsvTsvItems：支持 customMapping 显式覆盖列映射", () => {
    // 逆序数据列：第 0 列为分类，第 1 列为内容，第 2 列为标题
    const raw = `商务,这是报价单详细正文,最新报价单
客服,这是退款说明,退款政策`;

    // 1. 无 customMapping 时，按缺省位置推断（col 0 = title, col 1 = content, col 2 = category）
    const defRes = csvTsvImport.parseCsvTsvItems(raw, ",");
    assert.strictEqual(defRes.items.length, 1); // 第二行因缺少必填字段被跳过
    assert.strictEqual(defRes.items[0].title, "客服"); // 第二行才是唯一完整行
    assert.strictEqual(defRes.items[0].category, ""); // 第三列是"退款政策"但无表头时 col 2 不是 category

    // 2. 传入向导自定义映射：显式指定 col 2 为标题，col 1 为正文，col 0 为分类
    const customMapping = {
        titleIndex: 2,
        contentIndex: 1,
        categoryIndex: 0,
        hasHeaderRow: false, // 强制无表头模式
    };
    const customRes = csvTsvImport.parseCsvTsvItems(raw, ",", Date.now(), customMapping);
    assert.strictEqual(customRes.items.length, 2);
    assert.strictEqual(customRes.items[0].title, "最新报价单", "应按向导覆盖将第 2 列映射为标题");
    assert.strictEqual(customRes.items[0].kramdown, "这是报价单详细正文", "应将第 1 列映射为正文");
    assert.strictEqual(customRes.items[0].category, "商务", "应按向导覆盖将第 0 列映射为分类");
});

test("parseCsvTsvItems：向导自定义覆盖 tagsIndex 与 aliasIndex", () => {
    // 4 列数据：标题、正文、别名、标签
    const raw = "常用问答,回答正文,:qa,帮助;客服";
    const customMapping = {
        titleIndex: 0,
        contentIndex: 1,
        aliasIndex: 2,
        tagsIndex: 3,
        hasHeaderRow: false, // 强制无表头模式
    };
    const res = csvTsvImport.parseCsvTsvItems(raw, ",", Date.now(), customMapping);
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].title, "常用问答");
    assert.strictEqual(res.items[0].alias, ":qa");
    assert.deepStrictEqual(res.items[0].tags, ["帮助", "客服"]);
});

test("parseCsvTsvItems：向导自定义映射 urlIndex", () => {
    const raw = "官网文档,https://docs.siyuan-note.org";
    const customMapping = {
        titleIndex: 0,
        urlIndex: 1,
        contentIndex: -1, // 无单独正文列
    };
    const res = csvTsvImport.parseCsvTsvItems(raw, ",", Date.now(), customMapping);
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].title, "官网文档");
    assert.strictEqual(res.items[0].url, "https://docs.siyuan-note.org");
    assert.strictEqual(res.items[0].itemType, "url");
});
