// R142 验收脚本补丁 3b：替换第 8/9 步为「插入到指定文档」全 UI 流程（一次性工具）
const fs = require("fs");
const p = "scripts/real-acceptance.cjs";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("    // 8. 打开库文档 tab（插入落点）");
const endMark = "    // 9. 设置面板";
const end = s.indexOf(endMark);
if (start < 0 || end < 0) { console.error("anchors missing", start, end); process.exit(1); }
const newBlock = [
    "    // 8. 真实插入：动作菜单 → 插入到指定文档 → 内联搜索 → 命中即写（全 UI 链路，真实内核落块）",
    "    await page.evaluate(() => {",
    "        const row = document.querySelector('.xlc-list .xlc-row');",
    "        row.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true}));",
    "    });",
    "    await page.waitForTimeout(400);",
    "    await page.evaluate(() => {",
    "        const btn = Array.from(document.querySelectorAll('.xlc-menu button')).find((b) => (b.textContent ?? '').includes('插入到指定文档'));",
    "        btn?.click();",
    "    });",
    "    await page.waitForTimeout(300);",
    "    await page.evaluate(() => {",
    "        const input = document.querySelector('.xlc-pickdoc-input');",
    "        if (input) { input.value = '常用内容库'; input.dispatchEvent(new Event('input', {bubbles: true})); }",
    "    });",
    "    await page.waitForTimeout(900);",
    "    await page.evaluate(() => {",
    "        const hit = document.querySelector('.xlc-pickdoc-hit');",
    "        hit?.click();",
    "    });",
    "    await page.waitForTimeout(1500);",
    "    const afterBlocks = ((await api('/api/block/getChildBlocks', {id: DOC})).data ?? []).length;",
    "    const diag = await page.evaluate(() => ({",
    "        status: (document.querySelector('.xlc-status')?.textContent ?? '').slice(0, 80),",
    "        toast: Array.from(document.querySelectorAll('.b3-snackbar')).map((t) => (t.textContent ?? '').slice(0, 80)).filter(Boolean).join(' | '),",
    "    }));",
    "    check('8 真实插入到指定文档（内核落块）', afterBlocks > 2, `块数=${afterBlocks}；status=${diag.status}；toast=${diag.toast}`);",
    "    await shot(page, '05-inserted');",
    "",
    "",
].join("\n");
s = s.slice(0, start) + newBlock + s.slice(end);
fs.writeFileSync(p, s);
console.log("insert flow rewritten");
