// R153 核心旅程真机验收：变量填充完整闭环（真实前端 + 真实内核 + 真实 protyle 编辑器）。
// 创建带 {{xlc:ask}} 变量的条目 → 搜索 → 变量卡 → 填充 → 插入到打开的文档 → 验证替换结果落块。
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
    const page = await browser.newPage({locale: "zh-CN"});
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 200)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3000);

    // 0. 创建带变量的条目（走插件协议 save——真实入库路径）
    const saved = await page.evaluate(async () => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        const r = await p.service.save({
            itemType: "text",
            markdown: "尊敬的{{xlc:ask:客户名称}}：关于补偿方案，我们提供{{xlc:ask:补偿比例|5%,10%}}的减免，另有{{xlc:ask:跟进日期|date}}的安排。",
            title: "变量验收条目",
        });
        return r;
    });
    check("1 协议 save 创建带变量条目", Boolean(saved.ok && saved.data && saved.data.id), JSON.stringify(saved).slice(0, 100));

    // 打开库文档 tab（插入落点）
    await page.evaluate((docId) => {
        const app = window.siyuan.ws.app;
        // 通过文档树点击打开
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
    const protyleOpen = await page.evaluate(() => {
        const protyles = Array.from(document.querySelectorAll(".protyle"));
        return protyles.some((p) => p.getBoundingClientRect().width > 100);
    });
    check("2 库文档在编辑器打开（插入落点就绪）", protyleOpen);

    // 3. 打开搜索弹窗 → 搜索变量条目 → 点击行 → 变量卡出现
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "变量验收";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(1500);
    const rowFound = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        const hit = rows.find((r) => (r.textContent ?? "").includes("变量验收条目"));
        if (hit) { hit.dispatchEvent(new MouseEvent("click", {bubbles: true})); return true; }
        return false;
    });
    check("3 搜索命中并选中变量条目", rowFound);
    await page.waitForTimeout(600);
    const varForm = await page.evaluate(() => Boolean(document.querySelector(".xlc-varform")));
    check("4 变量填充卡出现", varForm);
    await page.screenshot({path: "docs/design/real-varfill-01-form.png"});

    // 4. 填充变量：文本字段 + 下拉（datalist）
    const varFill = await page.evaluate(() => {
        const fields = Array.from(document.querySelectorAll(".xlc-varform input"));
        const named = fields.map((f) => ({ph: f.placeholder, value: f.value, list: f.getAttribute("list")}));
        // 填充：客户名称 → 王总；补偿比例 → 5%
        for (const f of fields) {
            const label = f.closest(".xlc-varform-field")?.querySelector(".xlc-varform-label")?.textContent ?? "";
            if (label.includes("客户名称")) { f.value = "王总"; f.dispatchEvent(new Event("input", {bubbles: true})); }
            else if (label.includes("补偿比例")) { f.value = "5%"; f.dispatchEvent(new Event("input", {bubbles: true})); }
        }
        return named;
    });
    check("5 变量卡字段填充", varFill.length >= 2, JSON.stringify(varFill));

    // 5. 点击插入
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".xlc-varform button")).find((b) => (b.textContent ?? "").includes("插入"));
        btn?.click();
    });
    await page.waitForTimeout(2000);

    // 6. 验证：库文档（活动编辑器落点）中出现替换后的内容，且无变量残留
    const verify = await page.evaluate((docId) => {
        const protyle = Array.from(document.querySelectorAll(".protyle")).find((p) => p.getBoundingClientRect().width > 100);
        const text = protyle ? (protyle.textContent ?? "") : "";
        return {
            has王总: text.includes("王总"),
            has5: text.includes("5%"),
            noVarRemnant: !text.includes("{{xlc:ask"),
            textSample: text.replace(/\s+/g, " ").slice(0, 200),
        };
    }, LIB_DOC);
    check("6 编辑器中出现替换后内容（王总 + 5%）", verify.has王总 && verify.has5, verify.textSample.slice(0, 120));
    // 残留检查只针对插入块：库内源模板条目本身的 {{xlc:ask}} 不算残留（R153）
    const insertedNoVar = await page.evaluate(() => {
        const protyle = Array.from(document.querySelectorAll(".protyle")).find((x) => x.getBoundingClientRect().width > 100);
        const inserted = Array.from(protyle.querySelectorAll("[data-node-id]")).find((el) => (el.textContent ?? "").includes("王总"));
        return inserted ? !(inserted.textContent ?? "").includes("{{xlc:ask") : null;
    });
    check("7 插入块无变量残留", insertedNoVar === true, "insertedNoVar=" + insertedNoVar);
    await page.screenshot({path: "docs/design/real-varfill-02-inserted.png"});

    // 7. 内核侧确认：库文档中的块内容确实含替换文本
    const kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    const inserted = kids.map((k) => k.content ?? "").join("|");
    check("8 内核侧块内容含替换文本", inserted.includes("王总") && inserted.includes("5%"), inserted.slice(0, 120));

    const pass = results.filter((r) => r.ok).length;
    console.log(`\n变量填充真机验收：${pass}/${results.length} 通过`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
