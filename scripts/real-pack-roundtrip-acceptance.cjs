// R167 模板包导出→导入全旅程真机验收（F6 分享闭环首次真机覆盖）：
// 建条目 → 设置→模板包 → 命名导出（Playwright 捕获下载）→ 验证 .md 含清单+条目
// → 导入同一文件（filechooser）→ 策略弹窗含包徽标 → 覆盖导入 → 回执与内核侧数量守恒核验。
"use strict";
const {chromium} = require("playwright");
const os = require("os");
const path = require("path");
const fs = require("fs");
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
    const context = await browser.newContext({viewport: {width: 1280, height: 780}, locale: "zh-CN", acceptDownloads: true});
    const page = await context.newPage();
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 160)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3500);

    // 1. 两条目（同分类）走协议 save
    const saved = await page.evaluate(async () => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        return {
            a: await p.service.save({itemType: "text", markdown: "打包验收甲的正文", title: "打包验收甲", category: "验收分类"}),
            b: await p.service.save({itemType: "text", markdown: "打包验收乙的正文", title: "打包验收乙", category: "验收分类"}),
        };
    });
    check("1 两条目协议 save 落库", Boolean(saved.a?.ok && saved.b?.ok));

    // 2. 打开设置 → 模板包弹窗
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.openSettings();
    });
    await page.waitForTimeout(1200);
    const packDialog = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("模板包"));
        if (!btn) return false;
        btn.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return true;
    });
    await page.waitForTimeout(1000);
    check("2 模板包导出弹窗打开", packDialog);

    // 3. 命名 + 导出 → 捕获下载
    const downloadPath = path.join(os.tmpdir(), `xlc-pack-r167-${Date.now()}.md`);
    const [download] = await Promise.all([
        page.waitForEvent("download", {timeout: 15000}),
        page.evaluate(() => {
            const nameInput = Array.from(document.querySelectorAll(".b3-dialog input")).find((i) => i.value === "" || (i.closest(".xlc-form-field")?.textContent ?? "").includes("包名称"));
            if (nameInput) {
                nameInput.value = "验收包";
                nameInput.dispatchEvent(new Event("input", {bubbles: true}));
            }
            const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("导出 .md 包"));
            btn?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        }),
    ]);
    await download.saveAs(downloadPath);
    const exported = fs.readFileSync(downloadPath, "utf8");
    check("3 导出下载 .md 包", exported.length > 100, `${exported.length} 字节`);
    check("4 包内容含 xlc-pack 清单与两条目", exported.includes("xlc-pack") && exported.includes("打包验收甲") && exported.includes("打包验收乙") && exported.includes("验收分类"));

    // 4. 关闭弹窗 → 导入同一文件
    // 注意：fileInput.click() 需要 transient activation（合成 dispatchEvent 不带激活态，Chromium 抑制选择器），
    // 此处必须用 Playwright 真实点击（数据区按钮无遮挡，可满足 actionability）。
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser", {timeout: 10000}),
        page.getByRole("button", {name: /导入 JSON/}).click({timeout: 8000}),
    ]);
    await fileChooser.setFiles(downloadPath);
    await page.waitForTimeout(1500);
    const policyShown = await page.evaluate(() => {
        const cards = document.querySelectorAll(".xlc-policy");
        const meta = document.querySelector(".xlc-import-meta")?.textContent ?? "";
        return cards.length >= 3 && meta.includes("验收包");
    });
    check("5 策略弹窗出现且显示包名徽标", policyShown);

    // 5. 覆盖策略导入
    await page.evaluate(() => {
        const card = Array.from(document.querySelectorAll(".xlc-policy")).find((c) => (c.textContent ?? "").includes("覆盖"));
        card?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(2000); // 回执 toast 约 3s 自动消失：先读回执，再做内核侧核验
    const toast = await page.evaluate(() => Array.from(document.querySelectorAll(".b3-snackbar")).map((t) => (t.textContent ?? "").replace(/\s+/g, ""))).then((arr) => arr.join("|"));
    check("6 覆盖导入回执（覆盖 2 失败 0）", /覆盖2/.test(toast) && !/失败[1-9]/.test(toast), toast.slice(0, 100));
    await page.waitForTimeout(2500);

    // 6. 内核侧数量守恒：甲/乙 各只有一个条目块
    const kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    let countA = 0;
    let countB = 0;
    for (const k of kids) {
        const attrs = (await api("/api/attr/getBlockAttrs", {id: k.id})).data ?? {};
        if (attrs["custom-xlc-title"] === "打包验收甲") countA++;
        if (attrs["custom-xlc-title"] === "打包验收乙") countB++;
    }
    check("7 内核侧数量守恒（甲乙各 1，无重复块）", countA === 1 && countB === 1, `甲=${countA} 乙=${countB}`);

    fs.unlinkSync(downloadPath);
    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n模板包往返真机验收：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
