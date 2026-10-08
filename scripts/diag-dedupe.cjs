// R146 诊断探针：完整复刻验收 1→7 步后，dump 插件索引中条目的真实 summary，
// 与待存内容比对，定位 7b 去重失配的确切环节（一次性工具）。
const {chromium} = require("playwright");
const DOC = process.env.IT_DOC || "";
const ORIGIN = process.env.IT_ORIGIN || "http://127.0.0.1:6811";
const token = require("D:/思源插件/xiaolv-real-ws5/conf/conf.json").api.token;
(async () => {
    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage({locale: "zh-CN"});
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 250)));
    page.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 200)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(2500);
    // 步骤 6：新建条目并保存
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        p.capture.newManual();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const area = document.querySelector(".xlc-form textarea");
        if (area) { area.value = "真机验收条目甲：这是一条来自真实思源前端的集成测试内容。"; area.dispatchEvent(new Event("input", {bubbles: true})); }
        const input = document.querySelector(".xlc-form input.b3-text-field");
        if (input) { input.value = "真机验收条目甲"; input.dispatchEvent(new Event("input", {bubbles: true})); }
    });
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".xlc-form button")).find((b) => (b.textContent ?? "").includes("保存"));
        btn?.click();
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll(".b3-dialog").forEach((el) => el.remove()));
    // 步骤 7：搜索（触发 ensureIndex 重建）
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "真机验收";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(1500);
    // 诊断：dump 索引中条目甲的 summary 与待存内容的归一化形态
    const dump = await page.evaluate((content) => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        const lib = p.library;
        return lib.ensureIndex().then((idx) => {
            const hit = idx.entries.filter((e) => (e.title ?? "").includes("真机验收"));
            return {
                count: hit.length,
                entries: hit.map((e) => ({title: (e.title ?? "").slice(0, 20), summary: (e.summary ?? "").slice(0, 80), summaryLen: (e.summary ?? "").length})),
                contentEcho: content.slice(0, 60),
            };
        });
    }, "真机验收条目甲：这是一条来自真实思源前端的集成测试内容。");
    console.log("INDEX DUMP:", JSON.stringify(dump, null, 1));
    // 7b 实际保存尝试
    const saveProbe = await page.evaluate(async (content) => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        const dup = await p.deps === undefined ? null : null; // deps 不可达，改走行为验证
        p.capture.newManual();
        await new Promise((r) => setTimeout(r, 600));
        const area = document.querySelector(".xlc-form textarea");
        if (area) { area.value = content; area.dispatchEvent(new Event("input", {bubbles: true})); }
        const btn = Array.from(document.querySelectorAll(".xlc-form button")).find((b) => (b.textContent ?? "").includes("保存"));
        btn?.click();
        await new Promise((r) => setTimeout(r, 1500));
        const ds = document.querySelectorAll(".b3-dialog");
        const last = ds[ds.length - 1];
        return {
            dialogCount: ds.length,
            confirmShown: Boolean(last && (last.textContent ?? "").includes("已存在同文条目")),
            lastText: (last?.textContent ?? "").slice(0, 60),
        };
    }, "真机验收条目甲：这是一条来自真实思源前端的集成测试内容。");
    console.log("SAVE PROBE:", JSON.stringify(saveProbe));
    console.log("--- errors ---");
    logs.filter((l) => /error|PAGEERROR/i.test(l)).slice(0, 6).forEach((l) => console.log(l));
    await browser.close();
})();
