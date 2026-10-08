// R159 诊断：axe 残留违规的精确色彩数据
const {chromium} = require("playwright");
(async () => {
    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage({locale: "zh-CN"});
    await page.goto("http://127.0.0.1:6812", {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3000);
    await page.addScriptTag({path: "node_modules/axe-core/axe.min.js"});
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(1000);
    const detail = await page.evaluate(async () => {
        const result = await window.axe.run(document.querySelector(".xlc-dialog"), {resultTypes: ["violations"]});
        return result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => {
                const data = n.any && n.any[0] && n.any[0].data ? n.any[0].data : {};
                return {
                    target: n.target.join(">").slice(0, 100),
                    fg: data.fgColor || "?",
                    bg: data.bgColor || "?",
                    ratio: data.contrastRatio || "?",
                };
            }),
        }));
    });
    console.log(JSON.stringify(detail, null, 1));
    await browser.close();
})();
