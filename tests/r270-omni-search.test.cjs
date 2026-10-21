// R270 专项：全域内容搜索终端 (G12) - 当前文档块与全库笔记检索
const test = require("node:test");
const assert = require("node:assert");
const {omniSearch} = require("./.build/entry.cjs");

test("scoreAndFilterBlocks：AND 多关键词命中与权重排序", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: "常报销的财务流程与差旅审批说明"},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "本周工时统计和财务注意事项"},
        {id: "20240101000003-ccccccc", type: "h", kramdown: "常用语库的使用说明"},
        {id: "20240101000004-ddddddd", type: "p", kramdown: "今天天气不错"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务 报销", "doc-1", "财务文档");
    // 应该只命中包含「财务」+「报销」的全部块
    assert.strictEqual(result.length, 1, "应只返回同时包含两个关键词的块");
    assert.strictEqual(result[0].id, "xlc-omni-20240101000001-aaaaaa");
    assert.strictEqual(result[0].category, "财务文档");
    assert.strictEqual(result[0].blockId, "20240101000001-aaaaaa");
    assert.strictEqual(result[0].sourceDocId, "doc-1");
});

test("scoreAndFilterBlocks：空关键词直接返回空数组", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: "常报销的财务流程"},
    ];
    const result = omniSearch.scoreAndFilterBlocks(blocks, "  ", "doc-1", "测试");
    assert.deepStrictEqual(result, []);
});

test("scoreAndFilterBlocks：标题命中得分应高于正文命中", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "h", kramdown: "财务专题"},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "包含财务一词但是普通正文段落"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务", "doc-1");
    assert.strictEqual(result.length, 2);
    // 标题应排在前面（标题命中权重 20 vs 正文 5/10）
    assert.strictEqual(result[0].id, "xlc-omni-20240101000001-aaaaaa");
});

test("scoreAndFilterBlocks：AND 语义严格性，缺一即拒", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: "只包含财务"},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "只包含报销"},
        {id: "20240101000003-ccccccc", type: "p", kramdown: "财务和报销都包含"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务 报销", "doc-1");
    assert.strictEqual(result.length, 1, "AND 严格性应只命中同时包含两词的块");
    assert.ok(result[0].id.includes("ccccccc"));
});

test("scoreAndFilterBlocks：空块内容自动跳过", () => {
    const blocks = [
        {id: "20240101000001-aaaaaa", type: "p", kramdown: ""},
        {id: "20240101000002-bbbbbb", type: "p", kramdown: "   "},
        {id: "20240101000003-ccccccc", type: "p", kramdown: "财务相关内容"},
    ];

    const result = omniSearch.scoreAndFilterBlocks(blocks, "财务", "doc-1");
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].id.includes("ccccccc"));
});

test("cleanSearchHighlight：清除 <mark> 标签并还原 HTML 实体", () => {
    const raw = "这是 <mark>财务</mark> &amp; <mark>报销</mark> &lt;规范&gt; &#39;test&#39; &quot;ok&quot;";
    const cleaned = omniSearch.cleanSearchHighlight(raw);
    assert.strictEqual(cleaned, "这是 财务 & 报销 <规范> 'test' \"ok\"");
});

test("blockHitToSearchEntry：结构化转换为 SearchEntry", () => {
    const hit = {
        id: "20240101120000-abcdefg",
        rootId: "20240101120000-root123",
        content: "### <mark>项目启动会</mark>",
        hPath: "/工作/规划",
        type: "h",
        subType: "h3",
        updated: "1700000000",
    };
    const entry = omniSearch.blockHitToSearchEntry(hit);
    assert.strictEqual(entry.id, "xlc-omni-20240101120000-abcdefg");
    assert.strictEqual(entry.blockId, "20240101120000-abcdefg");
    assert.strictEqual(entry.libraryDocId, "20240101120000-root123");
    assert.strictEqual(entry.title, "项目启动会");
    assert.strictEqual(entry.content, "### 项目启动会");
    assert.strictEqual(entry.isOmni, true);
    assert.strictEqual(entry.tags[0], "全库块");
    assert.strictEqual(entry.updatedAt, 1700000000000, "秒级时间戳应自动归一为毫秒戳");
});

test("searchAllNotesBlocks & searchAllNotesUnified：走 fullTextSearchBlock 端点调用", async () => {
    const calls = [];
    const mockKernel = {
        request: async (endpoint, payload) => {
            calls.push({endpoint, payload});
            if (endpoint === "fullTextSearchBlock") {
                return {
                    blocks: [
                        {
                            id: "20240101120000-blk1111",
                            rootID: "20240101120000-doc1111",
                            content: "<mark>发票</mark>报销审批流程",
                            hPath: "/财务/报销制度",
                            type: "p",
                        },
                    ],
                };
            }
            if (endpoint === "searchDocs") {
                return [
                    {
                        path: "/20240101120000-doc2222.sy",
                        hPath: "/财务/2024发票预算",
                        box: "box-1",
                    },
                ];
            }
            return null;
        },
    };

    const unified = await omniSearch.searchAllNotesUnified(mockKernel, "发票", {maxAllNotesBlocks: 10});
    assert.strictEqual(unified.length, 2, "应包含块检索结果和文档检索结果");
    assert.strictEqual(unified[0].id, "xlc-omni-20240101120000-blk1111");
    assert.strictEqual(unified[0].content, "发票报销审批流程");
    assert.strictEqual(unified[1].id, "xlc-omni-20240101120000-doc2222");

    assert.ok(calls.some((c) => c.endpoint === "fullTextSearchBlock" && c.payload.query === "发票" && c.payload.method === 0));
});

test("normalizeBlockKramdown：代码块、标题与引述结构保真规范化", () => {
    // 1. 代码块补齐语言围栏
    const codeNorm = omniSearch.normalizeBlockKramdown("c", "typescript", "const x = 1;");
    assert.strictEqual(codeNorm, "```typescript\nconst x = 1;\n```");

    // 2. 已有围栏不重复包裹
    const codeExisting = omniSearch.normalizeBlockKramdown("c", "js", "```js\nconsole.log(1);\n```");
    assert.strictEqual(codeExisting, "```js\nconsole.log(1);\n```");

    // 3. 标题块补齐层级
    const h2Norm = omniSearch.normalizeBlockKramdown("h", "h2", "二级标题");
    assert.strictEqual(h2Norm, "## 二级标题");

    // 4. 引述块补齐引用符号
    const bNorm = omniSearch.normalizeBlockKramdown("b", "", "这是重要结论");
    assert.strictEqual(bNorm, "> 这是重要结论");

    // 5. 数学公式块
    const mNorm = omniSearch.normalizeBlockKramdown("m", "", "E = mc^2");
    assert.strictEqual(mNorm, "$$\nE = mc^2\n$$");
});

test("deriveOmniItemMetadata：智能从多层文档路径推导分类与溯源标签", () => {
    const entry1 = {
        id: "omni-1",
        title: "接口鉴权方案",
        category: "/工作/技术规范/微服务指南.sy",
        tags: ["后端", "全库块"],
    };
    const meta1 = omniSearch.deriveOmniItemMetadata(entry1);
    assert.strictEqual(meta1.category, "微服务指南", "应提取末级文档名作为分类");
    assert.ok(meta1.tags.includes("思源收录"), "应包含基础收录标签");
    assert.ok(meta1.tags.includes("后端"), "应继承原有效标签");
    assert.ok(!meta1.tags.includes("全库块"), "应过滤内部临时全库块标签");

    const entry2 = {
        id: "omni-2",
        title: "随笔",
        category: "",
        tags: [],
    };
    const meta2 = omniSearch.deriveOmniItemMetadata(entry2);
    assert.strictEqual(meta2.category, "思源收录", "空路径安全兜底");
    assert.deepStrictEqual(meta2.tags, ["思源收录"]);
});

test("parseOmniQueryScope：支持 in:路径 / path:路径 / book:笔记本 语法提取", () => {
    // 1. in:路径 提取
    const r1 = omniSearch.parseOmniQueryScope("in:工作/项目 架构设计方案");
    assert.strictEqual(r1.keyword, "架构设计方案");
    assert.deepStrictEqual(r1.paths, ["/工作/项目"]);
    assert.strictEqual(r1.notebook, undefined);

    // 2. path:路径 与 book:笔记本 组合
    const r2 = omniSearch.parseOmniQueryScope("book:日记本 path:/2026/10月 总结");
    assert.strictEqual(r2.keyword, "总结");
    assert.deepStrictEqual(r2.paths, ["/2026/10月"]);
    assert.strictEqual(r2.notebook, "日记本");

    // 3. 无修饰符时原样保留
    const r3 = omniSearch.parseOmniQueryScope("普通 搜索 词");
    assert.strictEqual(r3.keyword, "普通 搜索 词");
    assert.deepStrictEqual(r3.paths, []);
    assert.strictEqual(r3.notebook, undefined);
});

test("parseSiYuanTimestamp：14位 YYYYMMDDHHmmss、毫秒戳与秒级戳安全归一", () => {
    // 1. 14 位 YYYYMMDDHHmmss
    const ts14 = omniSearch.parseSiYuanTimestamp("20261021123045");
    assert.ok(ts14 > 1700000000000, "14 位时间字符串应成功转换为毫秒时间戳");
    const d = new Date(ts14);
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 9); // 10月为 index 9
    assert.strictEqual(d.getDate(), 21);

    // 2. 毫秒时间戳保持
    const now = Date.now();
    assert.strictEqual(omniSearch.parseSiYuanTimestamp(String(now)), now);

    // 3. 秒级时间戳自动乘 1000
    const sec = 1700000000;
    assert.strictEqual(omniSearch.parseSiYuanTimestamp(String(sec)), sec * 1000);

    // 4. 空值与非法输入安全返回 0
    assert.strictEqual(omniSearch.parseSiYuanTimestamp(""), 0);
    assert.strictEqual(omniSearch.parseSiYuanTimestamp(undefined), 0);
    assert.strictEqual(omniSearch.parseSiYuanTimestamp("invalid"), 0);
});
