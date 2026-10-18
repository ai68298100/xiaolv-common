"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {kramdown} = require("./.build/entry.cjs");
const {bodyWriteRestriction} = kramdown;

test("bodyWriteRestriction：合法单行文本与行内语法均放行", () => {
    assert.equal(bodyWriteRestriction("这是一个普通的常用短语"), undefined);
    assert.equal(bodyWriteRestriction("请运行 `pnpm test` 查看结果"), undefined);
    assert.equal(bodyWriteRestriction("您好，订单号为：{{xlc:ask:订单号}}"), undefined);
    assert.equal(bodyWriteRestriction("今天日期：{{xlc:date|+1d}}"), undefined);
    assert.equal(bodyWriteRestriction("https://example.com/api/v1"), undefined);
});

test("bodyWriteRestriction：合法代码围栏及首尾包含带空格空白行安全清洗放行", () => {
    assert.equal(bodyWriteRestriction("```js\nconst a = 1;\n```"), undefined);
    assert.equal(bodyWriteRestriction("````ts\nconst b: number = 2;\n````"), undefined);
    assert.equal(bodyWriteRestriction("~~~python\nprint(1)\n~~~"), undefined);
    assert.equal(bodyWriteRestriction("\n\n```js\nconst x = 1;\n```\n\n"), undefined);
    // 包含纯空格与制表符的空白行清洗
    assert.equal(bodyWriteRestriction("  \n\t \n```js\nconst x = 1;\n```\n  \n\t"), undefined);
});

test("bodyWriteRestriction：单行结构标记拦截，防止思源派生多块或容器结构", () => {
    const errorPattern = /multi-line or structured body writing is unavailable pending B-006 host verification/;
    // 引用块
    assert.match(bodyWriteRestriction("> 这是一个单行引用"), errorPattern);
    assert.match(bodyWriteRestriction("  > 缩进引用块"), errorPattern);
    // 无序列表
    assert.match(bodyWriteRestriction("- 列表项 1"), errorPattern);
    assert.match(bodyWriteRestriction("* 列表项 2"), errorPattern);
    assert.match(bodyWriteRestriction("+ 列表项 3"), errorPattern);
    assert.match(bodyWriteRestriction("   - 缩进列表项"), errorPattern);
    // 有序列表
    assert.match(bodyWriteRestriction("1. 有序第一项"), errorPattern);
    assert.match(bodyWriteRestriction("99. 有序第99项"), errorPattern);
    // 任务列表
    assert.match(bodyWriteRestriction("- [ ] 待办任务"), errorPattern);
    assert.match(bodyWriteRestriction("* [x] 已完成任务"), errorPattern);
    // 表格
    assert.match(bodyWriteRestriction("| 表头1 | 表头2 |"), errorPattern);
    assert.match(bodyWriteRestriction("  | 缩进表格 |"), errorPattern);
    // 分割线
    assert.match(bodyWriteRestriction("---"), errorPattern);
    assert.match(bodyWriteRestriction("***"), errorPattern);
    assert.match(bodyWriteRestriction("- - - "), errorPattern);
    // 思源块级 IAL 标记与超级块分界
    assert.match(bodyWriteRestriction("段落文本 {: id=20240101-abcdef}"), errorPattern);
    assert.match(bodyWriteRestriction("{{{ 展开超级块"), errorPattern);
    assert.match(bodyWriteRestriction("}}}"), errorPattern);
});

test("bodyWriteRestriction：非围栏多行、未闭合围栏与超限拒绝", () => {
    // 空文本与纯空白
    assert.equal(bodyWriteRestriction(""), "body is empty");
    assert.equal(bodyWriteRestriction("   \n\t  "), "body is empty");
    // 多行未包装段落
    assert.match(bodyWriteRestriction("第一行\n第二行"), /multi-line or structured body writing is unavailable/);
    // 未闭合代码围栏
    assert.match(bodyWriteRestriction("```js\nconsole.log(1);"), /multi-line or structured body writing is unavailable/);
    // 围栏符号不匹配
    assert.match(bodyWriteRestriction("```js\nconsole.log(1);\n~~~"), /multi-line or structured body writing is unavailable/);
    // 闭合后有尾随内容
    assert.match(bodyWriteRestriction("```js\nconsole.log(1);\n```\n尾随内容"), /multi-line or structured body writing is unavailable/);
    // 控制字符
    assert.match(bodyWriteRestriction("行内\u2028换行"), /multi-line body writing is unavailable/);
    // 超限
    assert.equal(bodyWriteRestriction("a".repeat(102401)), "body exceeds the supported size; nothing was written");
});
