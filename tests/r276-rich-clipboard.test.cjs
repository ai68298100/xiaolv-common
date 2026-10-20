// T-0129 / R276 / G18：跨应用富文本剪贴板双载荷输出契约测试
const test = require("node:test");
const assert = require("node:assert");
const {clipboard, commands, item} = {
    clipboard: require("./.build/entry.cjs").clipboard,
    commands: require("./.build/entry.cjs").commands,
    item: require("./.build/entry.cjs").item,
};
const cb = clipboard;

test("escapeHtml: 基础实体转义", () => {
    assert.equal(cb.escapeHtml("a & b < c > d \"e\" 'f'"), "a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;");
});

test("isMarkdownFormattingPresent: 格式标记感知判断", () => {
    assert.equal(cb.isMarkdownFormattingPresent("这是普通的纯文本没有任何符号"), false);
    assert.equal(cb.isMarkdownFormattingPresent(""), false);
    assert.equal(cb.isMarkdownFormattingPresent("   "), false);

    assert.equal(cb.isMarkdownFormattingPresent("请注意 **重要通知**"), true);
    assert.equal(cb.isMarkdownFormattingPresent("删除 ~~已废弃项~~"), true);
    assert.equal(cb.isMarkdownFormattingPresent("按 `Ctrl+C` 复制"), true);
    assert.equal(cb.isMarkdownFormattingPresent("```ts\nconst a = 1;\n```"), true);
    assert.equal(cb.isMarkdownFormattingPresent("# 一级标题"), true);
    assert.equal(cb.isMarkdownFormattingPresent("> 这是引用说明"), true);
    assert.equal(cb.isMarkdownFormattingPresent("- 第一项\n- 第二项"), true);
    assert.equal(cb.isMarkdownFormattingPresent("1. 第一步\n2. 第二步"), true);
    assert.equal(cb.isMarkdownFormattingPresent("点击访问 [官网](https://siyuan-note.org)"), true);
});

test("renderSafeHtmlFromMarkdown: 粗体、斜体、删除线与链接渲染", () => {
    const md = "尊敬的 **张经理**，关于您的订单 ~~#1001~~，请点击 [查看详情](https://example.com/order) 确认。";
    const html = cb.renderSafeHtmlFromMarkdown(md);

    assert.ok(html.includes("<strong>张经理</strong>"));
    assert.ok(html.includes("<del>#1001</del>"));
    assert.ok(html.includes("<a href=\"https://example.com/order\" target=\"_blank\" rel=\"noopener noreferrer\""));
    assert.ok(html.includes("查看详情</a>"));
});

test("renderSafeHtmlFromMarkdown: 列表与块引用结构渲染", () => {
    const md = "> 💡 提示：退货需保留原包装。\n\n售后流程：\n- 提交申请\n- 等待审核\n- 寄回商品";
    const html = cb.renderSafeHtmlFromMarkdown(md);

    assert.ok(html.includes("<blockquote style="));
    assert.ok(html.includes("💡 提示：退货需保留原包装。"));
    assert.ok(html.includes("<ul style="));
    assert.ok(html.includes("<li style="));
    assert.ok(html.includes("提交申请</li>"));
    assert.ok(html.includes("寄回商品</li>"));
});

test("renderSafeHtmlFromMarkdown: 代码块与行内代码安全高亮", () => {
    const md = "使用 `npm install` 安装，示例脚本：\n\n```javascript\nconsole.log(\"Hello <world>\");\n```";
    const html = cb.renderSafeHtmlFromMarkdown(md);

    assert.ok(html.includes("<code style="));
    assert.ok(html.includes("npm install</code>"));
    assert.ok(html.includes("<pre data-language=\"javascript\""));
    // 关键：代码块内的 <world> 必须被严格转义为 &lt;world&gt;
    assert.ok(html.includes("&lt;world&gt;"));
    assert.ok(!html.includes("<world>"));
});

test("renderSafeHtmlFromMarkdown: 严格免疫 XSS 脚本与伪协议注入", () => {
    // 1. 尝试注入 script 标签
    const xssScript = "你好 <script>alert('xss')</script>";
    const htmlScript = cb.renderSafeHtmlFromMarkdown(xssScript);
    assert.ok(!htmlScript.includes("<script>"));
    assert.ok(htmlScript.includes("&lt;script&gt;"));

    // 2. 尝试注入 img onerror
    const xssImg = "图片 <img src=x onerror=alert(1)>";
    const htmlImg = cb.renderSafeHtmlFromMarkdown(xssImg);
    assert.ok(!htmlImg.includes("<img"));
    assert.ok(htmlImg.includes("&lt;img"));

    // 3. 尝试注入 javascript: 伪协议链接
    const xssLink = "点我 [恶意链接](javascript:alert(1))";
    const htmlLink = cb.renderSafeHtmlFromMarkdown(xssLink);
    assert.ok(!htmlLink.includes("<a href=\"javascript:"));
});

test("writeRichClipboard: 双载荷桩写入与回退机制", async () => {
    let writeCalledWith = null;
    let writeTextCalledWith = null;

    const mockClipboard = {
        write: async (items) => {
            writeCalledWith = items;
        },
        writeText: async (t) => {
            writeTextCalledWith = t;
        },
    };

    // 1. 提供 html 时优先 write 双载荷（在 node 测试环境 ClipboardItem 未定义，应平滑回退至 writeText）
    const ok = await cb.writeRichClipboard("hello text", "<p>hello html</p>", {
        clipboard: mockClipboard,
        isSecure: true,
    });
    assert.equal(ok, true);
    assert.equal(writeTextCalledWith, "hello text");
});

test("ActionExecutor: 复制条目透明传递安全富文本 HTML 载荷", async () => {
    let lastCopiedText = null;
    let lastCopiedHtml = null;

    const mockHost = {
        hasActiveEditor: () => true,
        insertMarkdown: () => true,
        captureInsertTarget: () => ({editor: null, handle: null, docId: null}),
        canInsertAtTarget: () => true,
        releaseInsertTarget: () => {},
        writeClipboard: async (text, html) => {
            lastCopiedText = text;
            lastCopiedHtml = html;
            return true;
        },
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => "doc-1",
        isMobile: () => false,
    };

    const mockLibrary = {
        checkSourceHealth: async () => ({ok: true, data: {blockMissing: false, docMissing: false, assetMissing: false}}),
        getItemKramdown: async () => ({ok: true, data: "亲爱的顾客：\n\n您的退款申请 **已审核通过**，详情请访问 [订单中心](https://example.com/orders)。"}),
        expandSnippetRefs: async (text) => text,
    };

    const executor = new commands.ActionExecutor(mockLibrary, mockHost, () => {});

    const testItem = item.normalizeCommonItem({
        blockId: "20261020120000-abcdefg",
        libraryDocId: "20261020120001-hijklmn",
        attrs: {
            "custom-xlc-id": "xlc-test12345678",
            "custom-xlc-type": "markdown",
            "custom-xlc-title": "客服退款模板",
        },
        blockType: "p",
        kramdown: "亲爱的顾客：\n\n您的退款申请 **已审核通过**，详情请访问 [订单中心](https://example.com/orders)。",
    });
    assert.ok(testItem);

    const receipt = await executor.run(testItem, "copy");
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mode, "copy");

    // 验证传递到 host.writeClipboard 的文本与 HTML 双载荷
    assert.ok(lastCopiedText.includes("亲爱的顾客"));
    assert.ok(lastCopiedText.includes("**已审核通过**"));

    assert.ok(lastCopiedHtml !== null, "复制 Markdown 条目时必须产出 HTML 载荷");
    assert.ok(lastCopiedHtml.includes("<strong>已审核通过</strong>"));
    assert.ok(lastCopiedHtml.includes("<a href=\"https://example.com/orders\""));
});
