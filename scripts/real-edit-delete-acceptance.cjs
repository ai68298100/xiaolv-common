// R165 编辑/删除条目流真机验收（主验收 15 项未覆盖的死区）：
// 协议 save → 搜索 → 行右键菜单 ✎ 编辑 → 改标题保存 → 列表反映 → 🗑 删除 → 确认 → 行移除 + 内核侧块消失。
"use strict";
const {chromium} = require("playwright");
const ORIGIN = process.env.IT_ORIGIN;
const TOKEN = process.env.IT_TOKEN;
const LIB_DOC = process.env.IT_DOC;
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

    // 1. 协议 save 建条目
    const saved = await page.evaluate(async () => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        return p.service.save({itemType: "text", markdown: "编辑删除验收正文", title: "编辑删除验收"});
    });
    check("1 协议 save 建条目", Boolean(saved?.ok));

    // 2. 搜索命中
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "编辑删除验收";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(1500);
    const rowHandle = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        const hit = rows.find((r) => (r.textContent ?? "").includes("编辑删除验收"));
        if (!hit) return false;
        hit.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true}));
        return true;
    });
    check("2 搜索命中并右键打开动作菜单", rowHandle);
    await page.waitForTimeout(600);

    // 3. 菜单点 ✎ 编辑 → 编辑弹窗出现
    const editOpened = await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".xlc-menu button, .xlc-menu [role=menuitem]")).find((b) => (b.textContent ?? "").includes("编辑"));
        if (!item) return false;
        item.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return true;
    });
    await page.waitForTimeout(1200);
    const formReady = await page.evaluate(() => {
        const title = Array.from(document.querySelectorAll(".xlc-form .xlc-form-field input")).find((i) => i.value === "编辑删除验收");
        return Boolean(title);
    });
    check("3 编辑弹窗打开且标题字段载入原值", editOpened && formReady);

    // 4. 改标题 + 改正文 → 保存
    await page.evaluate(() => {
        const title = Array.from(document.querySelectorAll(".xlc-form .xlc-form-field input")).find((i) => i.value === "编辑删除验收");
        title.value = "编辑删除验收·改";
        title.dispatchEvent(new Event("input", {bubbles: true}));
        const save = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").trim() === "保存");
        save?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(2500);
    // 5. 列表反映新标题（编辑后搜索弹窗自动刷新；若被关掉则重开重搜）
    let updated = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        const hasNew = rows.some((r) => (r.textContent ?? "").includes("编辑删除验收·改"));
        const hasOld = rows.some((r) => (r.textContent ?? "").includes("编辑删除验收") && !(r.textContent ?? "").includes("·改"));
        return {hasNew, hasOld};
    });
    if (!updated.hasNew) {
        await page.evaluate(() => {
            const input = document.querySelector(".xlc-search-input");
            if (!input) return;
            input.value = "编辑删除验收·改";
            input.dispatchEvent(new Event("input", {bubbles: true}));
        });
        await page.waitForTimeout(1500);
        updated = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
            return {hasNew: rows.some((r) => (r.textContent ?? "").includes("编辑删除验收·改")), hasOld: rows.some((r) => (r.textContent ?? "").includes("编辑删除验收") && !(r.textContent ?? "").includes("·改"))};
        });
    }
    check("4 编辑保存后列表反映新标题", updated.hasNew && !updated.hasOld);

    // 6. 内核侧标题属性已更新
    const kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    let kernelTitle = "";
    for (const k of kids) {
        const attrs = (await api("/api/attr/getBlockAttrs", {id: k.id})).data ?? {};
        if (attrs["custom-xlc-title"] === "编辑删除验收·改") { kernelTitle = String(attrs["custom-xlc-title"]); break; }
    }
    check("5 内核侧 custom-xlc-title 已更新", kernelTitle === "编辑删除验收·改");

    // 7. 右键菜单 🗑 删除 → 确认
    await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        const hit = rows.find((r) => (r.textContent ?? "").includes("编辑删除验收·改"));
        hit?.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true}));
    });
    await page.waitForTimeout(600);
    const delClicked = await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".xlc-menu button")).find((b) => (b.textContent ?? "").includes("删除"));
        if (!item) return false;
        item.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return true;
    });
    await page.waitForTimeout(800);
    const confirmed = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".b3-dialog__button, .b3-button")).find((b) => ["确定", "确认", "OK"].includes((b.textContent ?? "").trim()));
        if (!btn) return false;
        btn.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return true;
    });
    check("6 删除确认弹窗出现并确认", delClicked && confirmed);
    await page.waitForTimeout(2500);
    const gone = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        return !rows.some((r) => (r.textContent ?? "").includes("编辑删除验收·改"));
    });
    check("7 列表移除已删行", gone);
    // 8. 内核侧：custom-xlc-id 块已删除
    const kids2 = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    let stillThere = 0;
    for (const k of kids2) {
        const attrs = (await api("/api/attr/getBlockAttrs", {id: k.id})).data ?? {};
        if (attrs["custom-xlc-title"] === "编辑删除验收·改") stillThere++;
    }
    check("8 内核侧条目块已删除", stillThere === 0, `残留=${stillThere}`);

    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n编辑/删除流真机验收：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
