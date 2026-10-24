"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const {buildBlockRef} = require("./.build/entry.cjs").actions;
const {variables} = require("./.build/entry.cjs");

test("buildBlockRef: 块引用语法构建与特殊字符防截断", () => {
    const blockId = "20241024120000-abcdefg";
    const anchor = "客户满意度调查 (Q3)";
    const ref = buildBlockRef(blockId, anchor);
    assert.equal(ref, "((20241024120000-abcdefg '客户满意度调查 (Q3)'))");

    // 单引号转义
    const singleQuote = buildBlockRef(blockId, "Tom's Project");
    assert.equal(singleQuote, "((20241024120000-abcdefg 'Tom\\'s Project'))");

    // 非法 blockId 校验拒绝
    assert.throws(() => buildBlockRef("bad-id", "test"), /invalid block id/);
});

test("variables: multi 多选变量语法与展开往返契约", () => {
    // 语法 1：|multi 声明
    const f1 = variables.parseAskField("权限列表", "读取,写入,执行,审计|multi");
    assert.equal(f1.name, "权限列表");
    assert.equal(f1.kind, "multi");
    assert.deepEqual(f1.options, ["读取", "写入", "执行", "审计"]);

    // 语法 2：多选: 前缀
    const f2 = variables.parseAskField("涉及端", "多选:桌面端、移动端、网页端");
    assert.equal(f2.name, "涉及端");
    assert.equal(f2.kind, "multi");
    assert.deepEqual(f2.options, ["桌面端", "移动端", "网页端"]);

    // askFieldTag 回显口径一致
    const tag1 = variables.askFieldTag(f1);
    assert.equal(tag1, "{{xlc:ask:权限列表|读取,写入,执行,审计|multi}}");

    // 展开填充求值
    const tpl = "配置：{{xlc:ask:权限列表|读取,写入,执行,审计|multi}}";
    const out = variables.expandAsks(tpl, {"权限列表": "读取、写入"});
    assert.equal(out, "配置：读取、写入");
});

test("dialog.ts: 窗口固定 (Alt+P) 与块引用复制 (Alt+R) 快捷键契约存在性", () => {
    const dialogSrc = fs.readFileSync(path.join(__dirname, "../src/ui/dialog.ts"), "utf8");

    // 验证 Alt+P 窗口固定快捷键存在
    assert.ok(dialogSrc.includes('e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "p" || e.key === "P")'));
    assert.ok(dialogSrc.includes('togglePinWindow'));

    // 验证 Alt+R 复制块引用快捷键存在
    assert.ok(dialogSrc.includes('e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "r" || e.key === "R")'));
    assert.ok(dialogSrc.includes('buildBlockRef'));

    // 验证 Alt+D 打开来源定位快捷键存在
    assert.ok(dialogSrc.includes('e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "d" || e.key === "D")'));

    // 验证 Shift+Enter 嵌入同步块 (insert-embed) 快捷键存在
    assert.ok(dialogSrc.includes('e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey'));
    assert.ok(dialogSrc.includes('"insert-embed"'));

    // 验证 Alt+Enter 插入块引用 (insert-ref) 快捷键存在
    assert.ok(dialogSrc.includes('e.key === "Enter" && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey'));
    assert.ok(dialogSrc.includes('"insert-ref"'));

    // 验证 Alt+M 复制原始 Markdown 快捷键存在
    assert.ok(dialogSrc.includes('e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "m" || e.key === "M")'));

    // 验证 Alt+H 块层级路径探针快捷键存在
    assert.ok(dialogSrc.includes('e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "h" || e.key === "H")'));

    // 验证 Alt+Shift+C 复制纯文本快捷键存在
    assert.ok(dialogSrc.includes('e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === "c" || e.key === "C")'));
    assert.ok(dialogSrc.includes('kramdownToPlainText'));
});
