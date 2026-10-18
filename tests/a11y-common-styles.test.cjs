"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const tokensScss = fs.readFileSync(path.join(root, "src", "styles", "tokens-r187.scss"), "utf8");

test("小驴常用 · 设计令牌声明完整的 forced-colors: active 系统变量映射", () => {
    assert.match(tokensScss, /@media\s*\(forced-colors:\s*active\)/);
    assert.match(tokensScss, /--xlc-canvas:\s*Canvas/);
    assert.match(tokensScss, /--xlc-surface:\s*Canvas/);
    assert.match(tokensScss, /--xlc-ink:\s*CanvasText/);
    assert.match(tokensScss, /--xlc-muted:\s*CanvasText/);
    assert.match(tokensScss, /--xlc-accent:\s*Highlight/);
    assert.match(tokensScss, /--xlc-accent-contrast:\s*HighlightText/);
    assert.match(tokensScss, /--b3-theme-background:\s*Canvas/);
    assert.match(tokensScss, /--b3-theme-primary:\s*Highlight/);
});

test("小驴常用 · forced-colors 模式下核心控件与容器赋予 1px CanvasText 边框", () => {
    assert.match(tokensScss, /border:\s*1px\s+solid\s+CanvasText/);
    assert.match(tokensScss, /\.b3-button/);
    assert.match(tokensScss, /\.b3-text-field/);
    assert.match(tokensScss, /\.xlc-card/);
    assert.match(tokensScss, /\.xlc-chip/);
    assert.match(tokensScss, /\.xlc-search/);
});

test("小驴常用 · forced-colors 模式下弹窗容器强化为 2px CanvasText 边框", () => {
    assert.match(tokensScss, /\.b3-dialog__container[\s\S]*border:\s*2px\s+solid\s+CanvasText/);
});

test("小驴常用 · forced-colors 模式下主按钮与激活态元素使用 Highlight 填充和 HighlightText 文字", () => {
    assert.match(tokensScss, /\.b3-button\.xlc-btn-primary[\s\S]*background:\s*Highlight;\s*color:\s*HighlightText;/);
    assert.match(tokensScss, /\.xlc-row--active/);
    assert.match(tokensScss, /\.xlc-discovery-row--active/);
});

test("小驴常用 · 键盘焦点环 focus-visible 提供规范的 Highlight 颜色与偏移", () => {
    assert.match(tokensScss, /:is\(button,\s*input,\s*select,\s*textarea,\s*a,\s*\[tabindex\]\):focus-visible/);
    assert.match(tokensScss, /outline:\s*2px\s+solid\s+Highlight;/);
    assert.match(tokensScss, /outline-color:\s*Highlight;/);
    assert.match(tokensScss, /outline-offset:\s*2px;/);
});

test("小驴常用 · forced-colors 模式下保护语义标识免受系统覆写 (forced-color-adjust: none)", () => {
    assert.match(tokensScss, /forced-color-adjust:\s*none;/);
    assert.match(tokensScss, /\.xlc-badge/);
    assert.match(tokensScss, /\.xlc-switch::after/);
    assert.match(tokensScss, /\.xlc-row-ordinal/);
});

test("小驴常用 · 声明 prefers-contrast: more 强化聚焦轮廓与粗体区分", () => {
    assert.match(tokensScss, /@media\s*\(prefers-contrast:\s*more\)/);
    assert.match(tokensScss, /outline:\s*3px\s+solid\s+var\(--xlc-accent\);/);
    assert.match(tokensScss, /outline-offset:\s*2px;/);
    assert.match(tokensScss, /font-weight:\s*700;/);
});
