// R208 面板拖拽放置与粘贴捕获契约专项测试（ADR 0034 / T-0061）
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {inferTypeFromText} = require("./.build/entry.cjs").capture;

test("i18n 资源包含 dropToAdd 且中英文一致", () => {
    const zh = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/zh-CN.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/i18n/en.json"), "utf8"));

    assert.ok(zh.dropToAdd, "zh-CN 必须定义 dropToAdd");
    assert.ok(en.dropToAdd, "en 必须定义 dropToAdd");
    assert.match(zh.dropToAdd, /松开|添加/);
    assert.match(en.dropToAdd, /Drop|add/i);
});

test("拖拽/粘贴内容类型推断与标题衍生契约", () => {
    function deriveMeta(rawText) {
        const text = (rawText ?? "").trim();
        const safeText = text.slice(0, 100_000);
        const inferredType = inferTypeFromText(safeText);
        const derivedTitle = inferredType === "url"
            ? safeText
            : (safeText.split("\n")[0] || "").slice(0, 60).trim();
        return {type: inferredType, title: derivedTitle, length: safeText.length};
    }

    // 1. URL 链接
    const urlMeta = deriveMeta("https://github.com/ai68298100/xiaolv-common");
    assert.strictEqual(urlMeta.type, "url");
    assert.strictEqual(urlMeta.title, "https://github.com/ai68298100/xiaolv-common");

    // 2. 代码块
    const codeMeta = deriveMeta("```typescript\nconst a = 1;\nconsole.log(a);\n```");
    assert.strictEqual(codeMeta.type, "code");

    // 3. Markdown 结构
    const mdMeta = deriveMeta("## 架构演进说明\n\n- 第一阶段完成\n- 第二阶段进行中");
    assert.strictEqual(mdMeta.type, "markdown");
    assert.strictEqual(mdMeta.title, "## 架构演进说明");

    // 4. 纯文本单行
    const textMeta = deriveMeta("这是一段普通的客户回复常用语");
    assert.strictEqual(textMeta.type, "text");
    assert.strictEqual(textMeta.title, "这是一段普通的客户回复常用语");

    // 5. 普通多行文本（包含换行符推断为 markdown 结构）
    const multilineMeta = deriveMeta("首行常用语说明\n第二行跟进内容");
    assert.strictEqual(multilineMeta.type, "markdown");
    assert.strictEqual(multilineMeta.title, "首行常用语说明");

    // 6. 超长文本截断安全保护
    const giant = "A".repeat(150_000);
    const giantMeta = deriveMeta(giant);
    assert.strictEqual(giantMeta.length, 100_000);
});

test("面板快捷粘贴拦截判定：仅在非文本编辑控件上激活，保护搜索框输入", () => {
    function shouldInterceptPaste(activeTagName, isContentEditable) {
        if (!activeTagName) return true;
        const tag = activeTagName.toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || isContentEditable) {
            return false;
        }
        return true;
    }

    // 焦点在搜索框内部：严格不拦截（用户粘贴关键词）
    assert.strictEqual(shouldInterceptPaste("INPUT", false), false);
    assert.strictEqual(shouldInterceptPaste("TEXTAREA", false), false);
    assert.strictEqual(shouldInterceptPaste("DIV", true), false);

    // 焦点在列表行、背景容器或按钮：安全拦截并分派新建草稿
    assert.strictEqual(shouldInterceptPaste("DIV", false), true);
    assert.strictEqual(shouldInterceptPaste("BUTTON", false), true);
    assert.strictEqual(shouldInterceptPaste("BODY", false), true);
    assert.strictEqual(shouldInterceptPaste(null, false), true);
});
