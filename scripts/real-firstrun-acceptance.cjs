// R164 首跑引导真机验收（此前死区：所有验收环境都预配了库，新用户第一分钟的旅程从未端到端验证）。
// 前置：real-acceptance-prep.cjs --no-config（插件已装已启用、无库配置）。
// 旅程：协议 open → 首跑引导出现 → 新建库文档 → 确认 → 配置落地 → 搜索弹窗自动打开 → 保存/搜索/再开均为正常态。
"use strict";
const {chromium} = require("playwright");
const ORIGIN = process.env.IT_ORIGIN;
const TOKEN = process.env.IT_TOKEN;
const results = [];
const check = (name, ok, detail = "") => { results.push({name, ok: Boolean(ok)}); console.log(`${ok ? "✔" : "✖"} ${name}${detail ? " — " + detail : ""}`); };
async function api(endpoint, payload = {}) {
    const r = await fetch(ORIGIN + endpoint, {method: "POST", headers: {"Content-Type": "application/json", Authorization: `Token ${TOKEN}`}, body: JSON.stringify(payload)});
    return r.json();
}

(async () => {
    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage({viewport: {width: 1280, height: 780}, locale: "zh-CN"});
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 160)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3500);

    // 1. 未配置状态下协议 open → 首跑引导（非搜索弹窗）
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(1200);
    const setupShown = await page.evaluate(() => {
        const mode = document.querySelector("#xlc-setup-mode");
        const search = document.querySelector(".xlc-search-input");
        return {mode: Boolean(mode), search: Boolean(search), label: mode ? (mode.closest(".b3-dialog__container")?.textContent ?? "").includes("库") || true : false};
    });
    check("1 未配置 → 首跑引导出现（非搜索弹窗）", setupShown.mode && !setupShown.search);

    // 2. 填新库名 → 点创建
    await page.evaluate(() => {
        const input = document.querySelector("#xlc-setup-newdoc");
        input.value = "首跑建库文档";
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").trim() === "创建");
        btn?.click();
    });
    await page.waitForTimeout(800);
    // 3. 确认弹窗（siyuan confirm）→ 确定
    const confirmClicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".b3-dialog__button, .b3-button")).find((b) => ["确定", "确认", "OK", "Confirm"].includes((b.textContent ?? "").trim()));
        if (!btn) return false;
        btn.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return true;
    });
    check("2 创建确认弹窗出现并确认", confirmClicked);
    await page.waitForTimeout(3000);

    // 4. onConfigured → 搜索弹窗自动打开（空态引导）
    const searchOpened = await page.evaluate(() => Boolean(document.querySelector(".xlc-search-input")));
    check("3 配置落地后搜索弹窗自动打开", searchOpened);

    // 5. 协议保存条目 → 搜索命中（索引在全新配置上建立）
    const saved = await page.evaluate(async () => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        return p.service.save({itemType: "text", markdown: "首跑验收条目：配置后立即可用", title: "首跑验收条目"});
    });
    check("4 全新配置上协议 save 落库", Boolean(saved?.ok), JSON.stringify(saved).slice(0, 80));
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "首跑验收";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(1500);
    const hit = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        return rows.some((r) => (r.textContent ?? "").includes("首跑验收条目"));
    });
    check("5 搜索命中新库条目", hit);

    // 6. 再开 = 搜索（非引导）：配置已持久化
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(1000);
    const reopen = await page.evaluate(() => {
        const search = Boolean(document.querySelector(".xlc-search-input"));
        const setup = Boolean(document.querySelector("#xlc-setup-mode"));
        return {search, setup};
    });
    check("6 再次打开进入搜索（配置持久化，不再引导）", reopen.search && !reopen.setup);

    // 7. 内核侧：建库文档真实存在
    const docs = await api("/api/filetree/listDocsByPath", {notebook: (await api("/api/notebook/lsNotebooks")).data.notebooks[0].id, path: "/"});
    const docTitles = (docs.data?.files ?? []).map((f) => f.name ?? "").join("|");
    check("7 内核侧建库文档存在", docTitles.includes("首跑建库文档"), docTitles.slice(0, 100));

    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n首跑引导真机验收：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
