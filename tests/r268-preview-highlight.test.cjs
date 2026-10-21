// R268 专项：详情预览轻量富文本与代码语法安全着色引擎 (G6)
const test = require("node:test");
const assert = require("node:assert");
const {previewRenderer} = require("./.build/entry.cjs");

test("tokenizeCodeLine：代码行关键字、字符串、数字与注释识别", () => {
    // 关键字与字符串
    const tokens1 = previewRenderer.tokenizeCodeLine('const greeting = "hello world";');
    const kwToken = tokens1.find((t) => t.type === "keyword");
    const strToken = tokens1.find((t) => t.type === "string");

    assert.ok(kwToken, "应识别 const 为 keyword");
    assert.strictEqual(kwToken.text, "const");
    assert.ok(strToken, "应识别字符串字面量");
    assert.strictEqual(strToken.text, '"hello world"');

    // 注释与数字
    const tokens2 = previewRenderer.tokenizeCodeLine("let count = 42; // 初始化计数器");
    const numToken = tokens2.find((t) => t.type === "number");
    const commentToken = tokens2.find((t) => t.type === "comment");

    assert.ok(numToken, "应识别数字 42");
    assert.strictEqual(numToken.text, "42");
    assert.ok(commentToken, "应识别行尾双斜杠注释");
    assert.strictEqual(commentToken.text, "// 初始化计数器");
});

test("tokenizeCodeLine：代码内嵌 xlc 变量占位符高优先识别", () => {
    const line = 'const apiEndpoint = "https://api.example.com/{{xlc:ask:env}}";';
    const tokens = previewRenderer.tokenizeCodeLine(line);
    const varToken = tokens.find((t) => t.type === "variable");

    assert.ok(varToken, "代码内嵌的 {{xlc:...}} 应获得 variable 类型高亮");
    assert.strictEqual(varToken.text, "{{xlc:ask:env}}");
});

test("tokenizeMarkdownInlines：粗体、行内代码、链接与变量切分", () => {
    const text = "请填写 **{{xlc:ask:客户姓名}}**，并参考 `README.md` 与 [官方文档](https://docs.siyuan-note.org)。";
    const inlines = previewRenderer.tokenizeMarkdownInlines(text);

    // 粗体
    const boldToken = inlines.find((t) => t.type === "bold");
    assert.ok(boldToken, "应识别粗体");

    // 行内代码
    const codeToken = inlines.find((t) => t.type === "code");
    assert.ok(codeToken, "应识别行内代码");
    assert.strictEqual(codeToken.text, "README.md");

    // 链接
    const linkToken = inlines.find((t) => t.type === "link");
    assert.ok(linkToken, "应识别 Markdown 链接");
    assert.strictEqual(linkToken.text, "官方文档");
    assert.strictEqual(linkToken.url, "https://docs.siyuan-note.org");
});

test("parseMarkdownBlocks：Markdown 多行结构化解析（标题、引用、列表、围栏代码）", () => {
    const md = `# 一级标题
## 二级标题
> 这是重要说明引用块
- 无序清单项 1
- 无序清单项 2
1. 有序清单项 A
---
\`\`\`sql
SELECT * FROM users WHERE active = 1;
\`\`\`
这是普通段落。`;

    const blocks = previewRenderer.parseMarkdownBlocks(md);
    assert.strictEqual(blocks.length, 9);

    assert.strictEqual(blocks[0].type, "h1");
    assert.strictEqual(blocks[0].rawText, "一级标题");

    assert.strictEqual(blocks[1].type, "h2");
    assert.strictEqual(blocks[1].rawText, "二级标题");

    assert.strictEqual(blocks[2].type, "quote");
    assert.strictEqual(blocks[2].rawText, "这是重要说明引用块");

    assert.strictEqual(blocks[3].type, "list-bullet");
    assert.strictEqual(blocks[3].rawText, "无序清单项 1");

    assert.strictEqual(blocks[4].type, "list-bullet");
    assert.strictEqual(blocks[4].rawText, "无序清单项 2");

    assert.strictEqual(blocks[5].type, "list-ordered");
    assert.strictEqual(blocks[5].rawText, "有序清单项 A");

    assert.strictEqual(blocks[6].type, "hr");

    assert.strictEqual(blocks[7].type, "code-fence");
    assert.strictEqual(blocks[7].lang, "sql");
    assert.ok(blocks[7].rawText.includes("SELECT * FROM users"));

    assert.strictEqual(blocks[8].type, "p");
    assert.strictEqual(blocks[8].rawText, "这是普通段落。");
});

test("parseMarkdownBlocks：支持待办任务项复选框解析 (- [ ] 与 - [x])", () => {
    const md = `- [ ] 待审核需求\n- [x] 已上线发布功能`;
    const blocks = previewRenderer.parseMarkdownBlocks(md);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[0].type, "task-item");
    assert.strictEqual(blocks[0].rawText, "待审核需求");
    assert.strictEqual(blocks[0].isDone, false);

    assert.strictEqual(blocks[1].type, "task-item");
    assert.strictEqual(blocks[1].rawText, "已上线发布功能");
    assert.strictEqual(blocks[1].isDone, true);
});

test("renderSafePreview：纯 DOM 零注入安全防护（防 XSS 注入攻击）", () => {
    // 构造轻量虚拟 DOM 节点，用于在 node 单元测试环境下验证绝对无 innerHTML
    class MockNode {
        constructor(type, tag = "") {
            this.nodeType = type;
            this.tagName = tag.toUpperCase();
            this.children = [];
            this.textContent = "";
            this.className = "";
        }
        appendChild(child) {
            this.children.push(child);
            return child;
        }
    }

    const mockDoc = {
        createElement(tag) {
            return new MockNode(1, tag);
        },
        createTextNode(text) {
            const node = new MockNode(3);
            node.textContent = text;
            return node;
        },
    };

    const container = new MockNode(1, "div");
    const maliciousText = '<script>alert("xss")</script><img src=x onerror=alert(1)>';

    // 渲染恶意文本
    previewRenderer.renderSafePreview(container, maliciousText, "text", mockDoc);

    // 递归验证整棵生成树：所有恶意标签必须只能作为文本节点的 textContent 存在，绝不派生出 SCRIPT 或 IMG 元素
    const tags = [];
    const checkTree = (node) => {
        if (node.tagName) tags.push(node.tagName);
        for (const child of node.children) checkTree(child);
    };
    checkTree(container);

    assert.ok(!tags.includes("SCRIPT"), "绝不允许派生出 SCRIPT 元素节点");
    assert.ok(!tags.includes("IMG"), "绝不允许派生出 IMG 元素节点");
});
