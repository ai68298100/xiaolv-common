// 原型图渲染：docs/design/prototype.html → docs/design/*.png
// Playwright 借用兄弟仓库安装（只读）；浏览器在 ms-playwright 缓存。
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "design");
let chromium;
try {
    ({chromium} = require(path.join(OUT, "..", "..", "..", "小驴雷切", "node_modules", "@playwright", "test")));
} catch {
    ({chromium} = require("playwright"));
}

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 1600, height: 1400}, deviceScaleFactor: 2});
    await page.goto("file:///" + path.join(OUT, "prototype.html").replace(/\\/g, "/"));
    await page.waitForTimeout(400);
    // 整页总览
    await page.screenshot({path: path.join(OUT, "prototype-all.png"), fullPage: true});
    // 单屏：按 section 裁剪
    const sections = await page.locator("body > section").all();
    const names = ["desktop-dialog", "action-menu", "capture-form", "mobile-sheet", "settings"];
    for (let i = 0; i < sections.length && i < names.length; i++) {
        await sections[i].screenshot({path: path.join(OUT, `prototype-${names[i]}.png`)});
    }
    await browser.close();
    const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png"));
    console.log("rendered:", files.join(", "));
})();
