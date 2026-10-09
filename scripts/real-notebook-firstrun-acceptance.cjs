// R165 笔记本模式首跑真机验收（R164 lsNotebooks 信封修复后此路径首次真正可用）：
// --no-config 环境 → 首跑引导 → 按笔记本 → 选笔记本（下拉有值=修复生效）→ 下一步 → 完成设置
// → 搜索自开 → 协议 save 落到笔记本根下首个文档 → 内核侧核验。
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

    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(1200);
    // 切到「按笔记本」
    await page.evaluate(() => {
        const sel = document.querySelector("#xlc-setup-mode");
        sel.value = "notebook";
        sel.dispatchEvent(new Event("change", {bubbles: true}));
    });
    await page.waitForTimeout(1500); // listNotebooks 异步填充
    const nb = await page.evaluate(() => {
        const sel = document.querySelector("#xlc-setup-notebook");
        return {options: sel ? sel.options.length : -1, value: sel?.value ?? "", visible: sel?.closest(".xlc-form-field")?.style.display !== "none"};
    });
    check("1 笔记本下拉已填充（R164 修复生效）且有选中值", nb.options > 0 && Boolean(nb.value) && nb.visible, `options=${nb.options}`);

    await page.evaluate(() => {
        const next = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"));
        next?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(600);
    const step2 = await page.evaluate(() => {
        const finish = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("完成设置"));
        return Boolean(finish);
    });
    check("2 第 2 步确认落点出现", step2);

    await page.evaluate(() => {
        const finish = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("完成设置"));
        finish?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(2500);
    const opened = await page.evaluate(() => Boolean(document.querySelector(".xlc-search-input")));
    check("3 完成设置后搜索弹窗自动打开", opened);

    // 协议 save → notebook 模式写入根下首个文档
    const saved = await page.evaluate(async () => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        return p.service.save({itemType: "text", markdown: "笔记本模式验收正文", title: "笔记本模式验收"});
    });
    check("4 笔记本模式协议 save 落库", Boolean(saved?.ok), JSON.stringify(saved).slice(0, 80));
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "笔记本模式验收";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(1500);
    const hit = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        return rows.some((r) => (r.textContent ?? "").includes("笔记本模式验收"));
    });
    check("5 搜索命中（笔记本全库索引）", hit);

    // 内核侧：条目块落在笔记本根下某个文档
    const nbId = (await api("/api/notebook/lsNotebooks")).data.notebooks[0].id;
    const root = (await api("/api/filetree/listDocsByPath", {notebook: nbId, path: "/"})).data;
    let found = false;
    for (const f of root.files ?? []) {
        const kids = (await api("/api/block/getChildBlocks", {id: f.id})).data ?? [];
        if (kids.some((k) => (k.content ?? "").includes("笔记本模式验收正文"))) { found = true; break; }
    }
    check("6 内核侧条目块落在笔记本内文档", found);

    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n笔记本模式首跑真机验收：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
