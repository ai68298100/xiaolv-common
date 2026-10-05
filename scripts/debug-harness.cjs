// 调试 harness 页 DOM 状态
const path = require("node:path");
let chromium;
try {
    ({chromium} = require(path.join("D:/AI/思源笔记插件开发/插件探索/小驴雷切/node_modules/@playwright/test")));
} catch (e) {
    console.log("pw load fail", e.message);
    process.exit(1);
}
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on("console", (m) => console.log("[console]", m.text().slice(0, 200)));
    page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
    const file = path.join(process.cwd(), "docs/design/harness.html").replace(/\\/g, "/");
    await page.goto("file:///" + file);
    await page.waitForTimeout(500);
    const has = await page.evaluate(() => Boolean(window.XlcHarness));
    console.log("XlcHarness:", has);
    const out = await page.evaluate(() => {
        try {
            const stage = document.getElementById("stage");
            window.XlcHarness.openDialog({theme: "light"});
            const dlg = document.querySelector(".b3-dialog");
            if (dlg) stage.appendChild(dlg);
            const content = document.querySelector(".b3-dialog__content");
            return {
                dlgFound: Boolean(dlg),
                contentChildren: content ? content.children.length : -1,
                rows: document.querySelectorAll(".xlc-row").length,
                bodyLen: document.body.innerHTML.length,
            };
        } catch (e) {
            return {error: String(e).slice(0, 300)};
        }
    });
    console.log(JSON.stringify(out));
    await page.waitForTimeout(600);
    const rows = await page.evaluate(() => document.querySelectorAll(".xlc-row").length);
    console.log("rows after wait:", rows);
    await browser.close();
})();
