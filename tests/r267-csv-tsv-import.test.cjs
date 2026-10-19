// R267 专项：通用 CSV / TSV 表格数据批量导入 (G8) 与智能字段映射
const test = require("node:test");
const assert = require("node:assert");
const {csvTsvImport} = require("./.build/entry.cjs");

test("sniffDelimiter：智能嗅探逗号、制表符与分号", () => {
    // 逗号 CSV
    const csv = "标题,内容,分类\n客户致歉,抱歉让您久等了,客服\n产品发货,您的订单已发出,物流";
    assert.strictEqual(csvTsvImport.sniffDelimiter(csv), ",");

    // 制表符 TSV（模拟从 Excel / 飞书表格复制）
    const tsv = "标题\t内容\t分类\n快捷回复1\t您好，请问有什么可以帮您？\t客服\n快捷回复2\t稍后给您答复\t客服";
    assert.strictEqual(csvTsvImport.sniffDelimiter(tsv), "\t");

    // 分号 CSV（欧式习惯）
    const scsv = "Title;Content;Category\nA;Hello world;Work\nB;Thank you;Personal";
    assert.strictEqual(csvTsvImport.sniffDelimiter(scsv), ";");

    // 带 BOM 清洗
    const bomCsv = "\uFEFF标题,内容\nA,B";
    assert.strictEqual(csvTsvImport.sniffDelimiter(bomCsv), ",");

    // 空内容兜底为逗号
    assert.strictEqual(csvTsvImport.sniffDelimiter(""), ",");
});

test("parseDelimitedTable：RFC 4180 规范解析（引号、转义双引号、内联换行）", () => {
    const text = `标题,内容,备注
简单项,纯文本内容,无
"含逗号,项","带,逗号的正文,请注意",常规
"含双引号""项""","正文包含""转义双引号""以及正常文字",重要
"内联换行项","这是第一行
这是第二行
这是第三行",多行
`;
    const {grid, delimiter, issues} = csvTsvImport.parseDelimitedTable(text);
    assert.strictEqual(delimiter, ",");
    assert.strictEqual(grid.length, 5); // 1 行表头 + 4 行数据

    // 检查第 1 行（简单项）
    assert.deepStrictEqual(grid[1], ["简单项", "纯文本内容", "无"]);

    // 检查第 2 行（含逗号）
    assert.deepStrictEqual(grid[2], ["含逗号,项", "带,逗号的正文,请注意", "常规"]);

    // 检查第 3 行（转义双引号 "" -> "）
    assert.deepStrictEqual(grid[3], ['含双引号"项"', '正文包含"转义双引号"以及正常文字', "重要"]);

    // 检查第 4 行（字段内换行）
    assert.strictEqual(grid[4][0], "内联换行项");
    assert.strictEqual(grid[4][1], "这是第一行\n这是第二行\n这是第三行");
    assert.strictEqual(grid[4][2], "多行");
});

test("parseDelimitedTable：CRLF 换行与未闭合双引号容错", () => {
    const text = 'col1,col2\r\nval1,val2\r\nval3,"unclosed quote';
    const {grid, issues} = csvTsvImport.parseDelimitedTable(text);
    assert.strictEqual(grid.length, 3);
    assert.strictEqual(grid[1][0], "val1");
    assert.strictEqual(grid[1][1], "val2");
    assert.strictEqual(grid[2][0], "val3");
    assert.strictEqual(grid[2][1], "unclosed quote");
    assert.ok(issues.some((i) => i.includes("未正常闭合")));
});

test("inferColumnMapping：中文与英文常见表头字段自动识别", () => {
    // 中文表头
    const gridZh = [
        ["分类", "标题", "话术正文", "标签", "快捷键"],
        ["商务", "报价单", "请查收最新报价单", "商务;财务", "alt+b"],
    ];
    const mapZh = csvTsvImport.inferColumnMapping(gridZh);
    assert.strictEqual(mapZh.hasHeaderRow, true);
    assert.strictEqual(mapZh.categoryIndex, 0);
    assert.strictEqual(mapZh.titleIndex, 1);
    assert.strictEqual(mapZh.contentIndex, 2);
    assert.strictEqual(mapZh.tagsIndex, 3);
    assert.strictEqual(mapZh.aliasIndex, 4);

    // 英文表头
    const gridEn = [
        ["Title", "Snippet", "Folder", "Keywords", "URL"],
        ["Doc", "Official docs", "Tech", "doc,manual", "https://example.com"],
    ];
    const mapEn = csvTsvImport.inferColumnMapping(gridEn);
    assert.strictEqual(mapEn.hasHeaderRow, true);
    assert.strictEqual(mapEn.titleIndex, 0);
    assert.strictEqual(mapEn.contentIndex, 1);
    assert.strictEqual(mapEn.categoryIndex, 2);
    assert.strictEqual(mapEn.tagsIndex, 3);
    assert.strictEqual(mapEn.urlIndex, 4);
});

test("inferColumnMapping：无表头智能位置降级", () => {
    // 两列无表头：col 0 = title, col 1 = content
    const grid2 = [["致谢", "非常感谢您的支持！"]];
    const map2 = csvTsvImport.inferColumnMapping(grid2);
    assert.strictEqual(map2.hasHeaderRow, false);
    assert.strictEqual(map2.titleIndex, 0);
    assert.strictEqual(map2.contentIndex, 1);

    // 三列无表头：col 0 = title, col 1 = content, col 2 = category
    const grid3 = [["致谢", "非常感谢您的支持！", "客服"]];
    const map3 = csvTsvImport.inferColumnMapping(grid3);
    assert.strictEqual(map3.hasHeaderRow, false);
    assert.strictEqual(map3.titleIndex, 0);
    assert.strictEqual(map3.contentIndex, 1);
    assert.strictEqual(map3.categoryIndex, 2);
});

test("csvTsvLogicalId：生成确定性稳定外部逻辑 ID", () => {
    const id1 = csvTsvImport.csvTsvLogicalId("打卡", "工作", ":dk", "完成打卡任务");
    const id2 = csvTsvImport.csvTsvLogicalId("打卡", "工作", ":dk", "完成打卡任务");
    const id3 = csvTsvImport.csvTsvLogicalId("请假", "工作", ":qj", "今日请假一天");

    assert.strictEqual(id1, id2, "相同元数据应产生相同的确定性 ID（用于冲突策略）");
    assert.notStrictEqual(id1, id3, "不同元数据应产生不同 ID");
    assert.match(id1, /^xlc-t[0-9a-z]{14}$/, "ID 必须满足平台 xlc- 前缀与字符集要求");
});

test("parseCsvTsvItems：完整端到端解析（类型推断、标签清洗、B-006 写前保护）", () => {
    const csvData = `标题,内容,分类,标签,别名
日常打卡,今日已按期完成工作交付。,工作,#打卡#;日常,alt+d
代码片段,"\`\`\`typescript
const greeting = ""hello"";
\`\`\`",研发,ts;code,
在线文档,https://docs.siyuan-note.org,文档,思源;帮助,
多行受限条目,"第一行正文
第二行正文",随笔,草稿,
`;
    const res = csvTsvImport.parseCsvTsvItems(csvData);
    assert.strictEqual(res.delimiter, ",");
    assert.strictEqual(res.items.length, 4);
    assert.strictEqual(res.totalRows, 4);
    assert.strictEqual(res.validRows, 4);

    // 条目 0：文本类型，标签清洗
    const item0 = res.items[0];
    assert.strictEqual(item0.title, "日常打卡");
    assert.strictEqual(item0.kramdown, "今日已按期完成工作交付。");
    assert.strictEqual(item0.category, "工作");
    assert.deepStrictEqual(item0.tags, ["打卡", "日常"]); // 井号被剥离
    assert.strictEqual(item0.alias, "alt+d");
    assert.strictEqual(item0.itemType, "text");

    // 条目 1：代码类型推断
    const item1 = res.items[1];
    assert.strictEqual(item1.title, "代码片段");
    assert.strictEqual(item1.itemType, "code");

    // 条目 2：URL 类型推断
    const item2 = res.items[2];
    assert.strictEqual(item2.title, "在线文档");
    assert.strictEqual(item2.itemType, "url");
    assert.strictEqual(item2.url, "https://docs.siyuan-note.org");

    // 条目 3：多行受限文本，触发 B-006 安全警告 Issue
    const item3 = res.items[3];
    assert.strictEqual(item3.title, "多行受限条目");
    assert.ok(res.issues.some((iss) => iss.includes("正文包含多行或复杂结构")), "应有 B-006 写前安全警示");
});

test("parseCsvTsvItems：从剪贴板 TSV 复制数据的无表头推断与标题自动衍生", () => {
    const tsvData = `快速回复客诉\t非常抱歉为您带来不便，我们正在加急核实处理。\n\t这是没有标题只有正文的内容行，应该自动提取首行作为标题。`;
    const res = csvTsvImport.parseCsvTsvItems(tsvData);
    assert.strictEqual(res.delimiter, "\t");
    assert.strictEqual(res.items.length, 2);

    assert.strictEqual(res.items[0].title, "快速回复客诉");
    assert.strictEqual(res.items[0].kramdown, "非常抱歉为您带来不便，我们正在加急核实处理。");

    assert.ok(res.items[1].title.startsWith("这是没有标题只有正文的内容行"), "无标题时自动从正文衍生标题");
});
