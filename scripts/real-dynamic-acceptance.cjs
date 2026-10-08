// R160 真机验收：日期算术 / 随机选择 / 多行文本变量三特性在真实前端 + 真实内核的完整闭环。
// 前置：real-acceptance-prep.cjs 已起隔离内核并注入 IT_ORIGIN / IT_TOKEN / IT_DOC。
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
// 与 placeholders.ts 同语义的期望值（同机同时区；跨午夜窗口可忽略）
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus3 = new Date(); plus3.setDate(plus3.getDate() + 3);
const wed = new Date(); wed.setDate(wed.getDate() + ((3 - wed.getDay() + 7) % 7 || 7));
const EXP_PLUS3 = fmt(plus3);
const EXP_WED = fmt(wed);

(async () => {
    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage({locale: "zh-CN"});
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 200)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3000);

    // 0. 三条目走协议 save 真实入库
    const saved = await page.evaluate(async () => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        const mk = (title, markdown) => p.service.save({itemType: "text", markdown, title});
        return {
            multi: await mk("动态验收多行", "结论：{{xlc:ask:结论}} 备注：{{xlc:ask:备注|textarea}}"),
            date: await mk("动态验收日期", "截止 {{xlc:date|+3d}} 复盘 {{xlc:date|next_wednesday}}"),
            random: await mk("动态验收随机", "问候：{{xlc:random|你好,早上好,下午好}}"),
        };
    });
    check("1 协议 save 创建三条验收条目", Boolean(saved.multi?.ok && saved.date?.ok && saved.random?.ok), JSON.stringify(saved).slice(0, 120));

    // 打开库文档 tab（插入落点）
    await page.evaluate((docId) => {
        const tryOpen = () => {
            const docItem = Array.from(document.querySelectorAll(".b3-list-item[data-node-id]")).find((el) => el.getAttribute("data-node-id") === docId);
            if (docItem) { docItem.dispatchEvent(new MouseEvent("click", {bubbles: true})); return true; }
            const nbEl = Array.from(document.querySelectorAll(".b3-list-item")).find((el) => (el.textContent ?? "").includes("XLC验收"));
            if (nbEl) { nbEl.dispatchEvent(new MouseEvent("click", {bubbles: true})); return false; }
            return false;
        };
        let attempts = 0;
        const timer = setInterval(() => { if (tryOpen() || attempts++ > 8) clearInterval(timer); }, 500);
    }, LIB_DOC);
    await page.waitForTimeout(5000);
    const protyleOpen = await page.evaluate(() => Array.from(document.querySelectorAll(".protyle")).some((p) => p.getBoundingClientRect().width > 100));
    check("2 库文档在编辑器打开（插入落点就绪）", protyleOpen);

    const searchAndPick = async (keyword) => {
        await page.evaluate(() => {
            const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
            void p.protocolCommands["xiaolv.common.open"]();
        });
        await page.waitForTimeout(800);
        await page.evaluate((kw) => {
            const input = document.querySelector(".xlc-search-input");
            input.value = kw;
            input.dispatchEvent(new Event("input", {bubbles: true}));
        }, keyword);
        await page.waitForTimeout(1500);
        return page.evaluate((kw) => {
            const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
            const hit = rows.find((r) => (r.textContent ?? "").includes(kw)) ?? rows.find((r) => (r.textContent ?? "").includes("动态验收"));
            if (hit) { hit.dispatchEvent(new MouseEvent("click", {bubbles: true})); return true; }
            return false;
        }, keyword);
    };

    // ===== A. 多行文本变量：变量卡渲染 textarea，填充换行值 =====
    check("3A 搜索命中并选中多行条目", await searchAndPick("动态验收多行"));
    await page.waitForTimeout(600);
    const taRender = await page.evaluate(() => {
        const ta = document.querySelector(".xlc-varform textarea");
        if (!ta) return {ok: false, detail: "no textarea in varform"};
        const label = ta.closest(".xlc-varform-field")?.querySelector(".xlc-varform-label")?.textContent ?? "";
        return {ok: label.includes("备注"), detail: label};
    });
    check("4A 备注字段渲染为 textarea（非 input）", taRender.ok, taRender.detail);
    await page.screenshot({path: "docs/design/real-dynamic-01-textarea.png"});
    await page.evaluate(() => {
        for (const el of document.querySelectorAll(".xlc-varform textarea, .xlc-varform input")) {
            const label = el.closest(".xlc-varform-field")?.querySelector(".xlc-varform-label")?.textContent ?? "";
            if (label.includes("结论")) { el.value = "通过"; el.dispatchEvent(new Event("input", {bubbles: true})); }
            if (label.includes("备注")) { el.value = "第一行\n第二行"; el.dispatchEvent(new Event("input", {bubbles: true})); }
        }
        const btn = Array.from(document.querySelectorAll(".xlc-varform button")).find((b) => (b.textContent ?? "").includes("插入"));
        btn?.click();
    });
    await page.waitForTimeout(2500);
    const multiDom = await page.evaluate(() => {
        const protyle = Array.from(document.querySelectorAll(".protyle")).find((p) => p.getBoundingClientRect().width > 100);
        const inserted = Array.from(protyle?.querySelectorAll("[data-node-id]") ?? []).find((el) => (el.textContent ?? "").includes("第一行"));
        return inserted ? {text: inserted.textContent ?? "", hasVar: inserted.textContent.includes("{{xlc:ask")} : null;
    });
    check("5A 多行插入块含两行文本且无变量残留", Boolean(multiDom && multiDom.text.includes("第一行") && multiDom.text.includes("第二行") && !multiDom.hasVar), (multiDom?.text ?? "null").slice(0, 100));
    // 内核侧：kramdown 含真实换行
    const multiKernel = await page.evaluate(async (docId) => {
        const kids = (await fetch("/api/block/getChildBlocks", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({id: docId})}).then((r) => r.json())).data ?? [];
        const hit = kids.find((k) => (k.content ?? "").includes("第一行"));
        if (!hit) return null;
        const kd = (await fetch("/api/block/getBlockKramdown", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({id: hit.id})}).then((r) => r.json())).data?.kramdown ?? "";
        return kd;
    }, LIB_DOC);
    check("6A 内核侧 kramdown 含真实换行（第一行\\n第二行）", Boolean(multiKernel && multiKernel.includes("第一行\n第二行")), (multiKernel ?? "").slice(0, 100));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // ===== B. 日期算术：无 ask 字段 → 选中即插入 =====
    check("3B 搜索命中并选中日期条目", await searchAndPick("动态验收日期"));
    await page.waitForTimeout(2500);
    const dateDom = await page.evaluate(() => {
        const protyle = Array.from(document.querySelectorAll(".protyle")).find((p) => p.getBoundingClientRect().width > 100);
        const inserted = Array.from(protyle?.querySelectorAll("[data-node-id]") ?? []).find((el) => (el.textContent ?? "").includes("截止 "));
        const card = document.querySelector(".xlc-varform");
        return {text: inserted?.textContent ?? "", hasCard: Boolean(card)};
    });
    check("4B 无变量卡直接插入（无 ask 字段不弹卡）", dateDom.hasCard === false);
    check("5B 插入块含 +3d 与 next_wednesday 期望日期且无残留", dateDom.text.includes(`截止 ${EXP_PLUS3}`) && dateDom.text.includes(`复盘 ${EXP_WED}`) && !dateDom.text.includes("{{xlc:date"), dateDom.text.slice(0, 120));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // ===== C. 随机选择：结果落在选项集 =====
    check("3C 搜索命中并选中随机条目", await searchAndPick("动态验收随机"));
    await page.waitForTimeout(2500);
    const randomDom = await page.evaluate(() => {
        const protyle = Array.from(document.querySelectorAll(".protyle")).find((p) => p.getBoundingClientRect().width > 100);
        const inserted = Array.from(protyle?.querySelectorAll("[data-node-id]") ?? []).find((el) => (el.textContent ?? "").includes("问候："));
        return inserted?.textContent ?? "";
    });
    check("4C 随机结果落在选项集且无残留", /问候：(你好|早上好|下午好)/.test(randomDom) && !randomDom.includes("{{xlc:random"), randomDom.slice(0, 80));

    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n动态特性真机验收：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
