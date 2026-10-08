// R163 B-004 伴随异常聚焦复现：设置面板 200 次快速开关+展开序列中 main.js 的 null.style 页面异常。
// 目标：抓完整堆栈与出错文件/行列，判定属插件代码还是思源核心（B-004 同族取证）。
"use strict";
const {chromium} = require("playwright");
const ORIGIN = process.env.IT_ORIGIN;

(async () => {
    const browser = await chromium.launch({headless: false, args: [`--app=${ORIGIN}`, "--window-size=1380,900"]});
    const context = await browser.newContext({viewport: {width: 1360, height: 880}, locale: "zh-CN"});
    const page = await context.newPage();
    let count = 0;
    page.on("pageerror", (err) => {
        count++;
        console.log(`\n===== PAGEERROR #${count} =====`);
        console.log("message:", String(err?.message ?? err));
        console.log("stack:", err?.stack ?? "(no stack)");
    });
    page.on("console", (msg) => {
        if (msg.type() === "error") {
            const loc = msg.location();
            console.log(`\n===== CONSOLE-ERROR ===== ${msg.text().slice(0, 200)}`);
            console.log("location:", JSON.stringify(loc));
        }
    });
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.openSettings();
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("更改内容库"));
        btn?.click();
    });
    await page.waitForTimeout(400);
    for (let i = 0; i < 200; i++) {
        try {
            await page.evaluate(() => {
                document.querySelectorAll("input[type=checkbox]").forEach((b) => { b.click(); });
                const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("更改内容库"));
                btn?.click();
            });
            await page.waitForTimeout(30);
        } catch { console.log("evaluate failed at", i); break; }
    }
    await page.waitForTimeout(1500);
    console.log(`\n复现完成：共捕获 ${count} 条页面异常`);
    await browser.close();
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
