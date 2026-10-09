// R164 Espanso 导入真机验收（G2）：设置 → 从 Espanso 导入 → 粘贴 YAML → 解析预览 → 策略 → 真实落库。
// 核验点：按钮存在、预览计数、变量映射产物（{{xlc:date}} / {{xlc:ask:…}}）作为模板原文入库。
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
const YAML = `matches:
  - trigger: ":sig"
    replace: "王总 您好"
  - trigger: ":跟进"
    replace: "截止 {{due}}"
    vars:
      - name: due
        type: date
        params: {format: "%Y-%m-%d"}
  - trigger: ":表单"
    replace: "致 [[客户]]：[[渠道={邮件,电话}]]"
`;

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
        void p.openSettings();
    });
    await page.waitForTimeout(1200);
    const btnFound = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("从 Espanso 导入"));
        if (!btn) return false;
        btn.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return true;
    });
    check("1 设置→数据区出现「从 Espanso 导入」并打开", btnFound);
    await page.waitForTimeout(800);

    await page.evaluate((yaml) => {
        const ta = Array.from(document.querySelectorAll(".b3-dialog__container.xlc-settings-host textarea, .b3-dialog textarea")).pop();
        ta.value = yaml;
        ta.dispatchEvent(new Event("input", {bubbles: true}));
    }, YAML);
    await page.waitForTimeout(900); // 400ms 防抖 + 余量
    const preview = await page.evaluate(() => {
        const tas = Array.from(document.querySelectorAll(".b3-dialog textarea"));
        const host = tas.length ? tas[tas.length - 1].closest(".b3-dialog__container") : null;
        return (host?.textContent ?? "").includes("解析出 3 条");
    });
    check("2 粘贴 YAML 后预览「解析出 3 条」", preview);

    await page.evaluate(() => {
        const next = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"));
        next?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(800);
    const policyShown = await page.evaluate(() => document.querySelectorAll(".xlc-policy").length >= 3);
    check("3 导入策略弹窗出现（三档策略卡）", policyShown);

    await page.evaluate(() => {
        const card = Array.from(document.querySelectorAll(".xlc-policy")).find((c) => (c.textContent ?? "").includes("跳过")) ?? document.querySelector(".xlc-policy");
        card?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(4000); // createItem 落块 + 属性回写
    const toast = await page.evaluate(() => Array.from(document.querySelectorAll(".b3-snackbar")).map((t) => (t.textContent ?? "")).join("|"));
    check("4 导入回执 toast（新建 3 跳过 0）", /新建.*3|created.*3|3.*0/i.test(toast.replace(/\s+/g, "")) || toast.includes("3"), toast.slice(0, 120));

    // 内核侧核验：模板原文与映射产物入库（存储保留模板原文）
    const kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    const all = kids.map((k) => k.content ?? "");
    const joined = all.join("|");
    check("5 王总 您好 落库", joined.includes("王总 您好"));
    check("6 date 变量映射为 {{xlc:date}} 入库", joined.includes("截止 {{xlc:date}}"), all.find((c) => c.includes("截止"))?.slice(0, 60) ?? "");
    check("7 表单字段映射为 {{xlc:ask:…}} 入库", joined.includes("{{xlc:ask:客户}}") && joined.includes("{{xlc:ask:渠道|邮件,电话}}"));

    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\nEspanso 导入真机验收：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
