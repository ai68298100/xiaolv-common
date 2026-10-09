// R166 来源失效诚实降级 + 多类型条目真机验收（核心约束 #5 与 P4 媒体类型首次真机覆盖）：
// ① 带来源条目：来源块存活时无警告；内核删除来源块后——条目仍在列表（不静默消失）+ 行级 ⚠ 来源失效 + 预览横幅。
// ② url/code 条目：搜索 → 插入 → 内核落块核验（链接块 / 带语言代码块）。
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
    // 0. 内核造一个来源块（挂库文档下，来源失效检测只关心块 ID 存在性）
    const appended = await api("/api/block/appendBlock", {dataType: "markdown", data: "这是被追踪的来源段落", parentID: LIB_DOC});
    const sourceBlockId = appended.data?.[0]?.doOperations?.[0]?.id ?? "";
    check("0 内核创建来源块", /^\d{14}-[0-9a-z]{7}$/.test(sourceBlockId), sourceBlockId);

    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage({viewport: {width: 1280, height: 780}, locale: "zh-CN"});
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 160)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3500);

    // 1. 协议 save 三条目（带来源 / url / code；代码正文以参数传入保真实换行）
    const CODE_MD = "```js\nconsole.log(1)\n```";
    const saved = await page.evaluate(async ([srcBlock, codeMd]) => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        return {
            src: await p.service.save({itemType: "text", markdown: "来源失效验收正文", title: "失效验收条目", source: {sourceDocId: "", sourceBlockId: srcBlock, sourceType: "block"}}),
            url: await p.service.save({itemType: "url", markdown: "示例站点", url: "https://example.com/x", title: "链接验收条目"}),
            code: await p.service.save({itemType: "code", markdown: codeMd, title: "代码验收条目"}),
        };
    }, [sourceBlockId, CODE_MD]);
    check("1 协议 save 三类型条目", Boolean(saved.src?.ok && saved.url?.ok && saved.code?.ok), JSON.stringify(saved).slice(0, 100));

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

    const searchAndCount = async (kw) => {
        await page.evaluate(() => {
            const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
            void p.protocolCommands["xiaolv.common.open"]();
        });
        await page.waitForTimeout(800);
        await page.evaluate((k) => {
            const input = document.querySelector(".xlc-search-input");
            input.value = k;
            input.dispatchEvent(new Event("input", {bubbles: true}));
        }, kw);
        await page.waitForTimeout(2000); // 搜索 + 来源健康预取
    };

    // 2. 来源存活：行无 ⚠
    await searchAndCount("失效验收");
    const healthy = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        const hit = rows.find((r) => (r.textContent ?? "").includes("失效验收条目"));
        return hit ? {found: true, warn: Boolean(hit.querySelector(".xlc-row-warn"))} : {found: false};
    });
    check("2 来源存活：条目在列且无失效警告", healthy.found && !healthy.warn);

    // 3. 插入 url 条目 → 内核落链接块
    await searchAndCount("链接验收");
    await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        rows.find((r) => (r.textContent ?? "").includes("链接验收条目"))?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(2500);
    let kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    const hasLink = kids.some((k) => (k.markdown ?? k.content ?? "").includes("example.com/x"));
    check("3 url 条目插入落链接块", hasLink, kids.map((k) => k.markdown ?? "").join("§").slice(0, 100));

    // 4. 插入 code 条目 → 内核落代码块（含语言）
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await searchAndCount("代码验收");
    await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        rows.find((r) => (r.textContent ?? "").includes("代码验收条目"))?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(2500);
    kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    const hasCode = kids.some((k) => k.subType === "code" || (k.markdown ?? "").includes("```"));
    check("4 code 条目插入落代码块", hasCode);

    // 5. 内核删除来源块 → 重新搜索 → 条目仍在 + 行级 ⚠（预检节流 ≤5s + 喂完重绘，轮询等待）
    await api("/api/block/deleteBlock", {id: sourceBlockId});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await searchAndCount("失效验收");
    let degraded = {found: false, warn: false};
    for (let i = 0; i < 10; i++) {
        degraded = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
            const hit = rows.find((r) => (r.textContent ?? "").includes("失效验收条目"));
            if (!hit) return {found: false, warn: false};
            return {found: true, warn: Boolean(hit.querySelector(".xlc-row-warn"))};
        });
        if (degraded.warn) break;
        // 触发一次新的搜索推动预检窗口滚动
        await page.evaluate(() => {
            const input = document.querySelector(".xlc-search-input");
            if (input) {
                input.value = "失效验收 ";
                input.dispatchEvent(new Event("input", {bubbles: true}));
            }
        });
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            const input = document.querySelector(".xlc-search-input");
            if (input) {
                input.value = "失效验收";
                input.dispatchEvent(new Event("input", {bubbles: true}));
            }
        });
        await page.waitForTimeout(1200);
    }
    check("5 来源删除后：条目不静默消失", degraded.found);
    check("6 行级 ⚠ 来源失效标记出现", degraded.warn === true);
    await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        rows.find((r) => (r.textContent ?? "").includes("失效验收条目"))?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(1000);
    const paneWarn = await page.evaluate(() => {
        const pane = document.querySelector(".xlc-pane-warn");
        return pane ? pane.getBoundingClientRect().height > 0 && (pane.textContent ?? "").includes("⚠") : false;
    });
    check("7 预览窗格失效横幅出现", paneWarn);

    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\\n来源失效+多类型真机验收：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
