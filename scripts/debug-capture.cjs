// 调试 capture form 挂载
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
    const page = await browser.newPage({viewport: {width: 1280, height: 720}});
    page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
    const file = path.join(process.cwd(), "docs/design/harness.html").replace(/\\/g, "/");
    await page.goto("file:///" + file);
    await page.waitForTimeout(400);
    const out = await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        window.XlcHarness.openCapture(true);
        const dlg = document.querySelector(".b3-dialog");
        if (dlg) stage.appendChild(dlg);
        return {
            dlg: !!dlg,
            typeSelect: !!document.querySelector(".xlc-form-type"),
            content: !!document.querySelector(".xlc-form-content"),
            title: !!document.querySelector(".xlc-form-title"),
            save: (document.body.textContent || "").includes("保存条目"),
            tidy: (document.body.textContent || "").includes("AI 整理"),
            draft: (document.body.textContent || "").includes("AI 草稿"),
        };
    });
    console.log(JSON.stringify(out));
    await browser.close();
})();
