// R151 捕获入口真机验收 v2：全 dispatchEvent 驱动（绕过 Playwright actionability 与多 protyle 干扰）。
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
    const nb = (await api("/api/notebook/lsNotebooks")).data.notebooks.find((n) => !n.closed);
    const targetDoc = await api("/api/filetree/createDocWithMd", {notebook: nb.id, path: "/引用目标", markdown: "引用目标的正文"});
    const targetBlocks = await api("/api/block/getChildBlocks", {id: String(targetDoc.data)});
    const targetBlockId = targetBlocks.data[0].id;
    const richMd = [
        "# 测试文档",
        "",
        "这是第一个段落，用于块捕获与选区捕获测试。",
        "",
        "这是一个 [外部链接](https://siyuan-note.com) 用于链接捕获测试。",
        "",
        `引用测试：((${targetBlockId} '引用文本片段'))`,
    ].join("\n");
    const richDoc = await api("/api/filetree/createDocWithMd", {notebook: nb.id, path: "/测试文档", markdown: richMd});
    const richDocId = String(richDoc.data);

    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage({locale: "zh-CN"});
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 200)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3000);

    // 打开富内容文档：展开笔记本 → 点击文档（dispatchEvent）
    for (let attempt = 0; attempt < 5; attempt++) {
        const opened = await page.evaluate((docId) => {
            const docItem = Array.from(document.querySelectorAll(".b3-list-item[data-node-id]")).find((el) => el.getAttribute("data-node-id") === docId);
            if (!docItem) {
                const nbEl = Array.from(document.querySelectorAll(".b3-list-item")).find((el) => (el.textContent ?? "").includes("XLC验收"));
                nbEl?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
                return false;
            }
            docItem.dispatchEvent(new MouseEvent("click", {bubbles: true}));
            return true;
        }, richDocId);
        if (opened) break;
        await page.waitForTimeout(800);
    }
    await page.waitForTimeout(3000);
    const protyleOpen = await page.evaluate(() => {
        const protyles = Array.from(document.querySelectorAll(".protyle"));
        return protyles.some((p) => p.getBoundingClientRect().width > 100 && (p.textContent ?? "").includes("块捕获与选区捕获测试"));
    });
    check("1 富内容文档在编辑器打开", protyleOpen);
    await page.screenshot({path: "docs/design/real-capture-01-doc.png"});

    // 2. 右键段落 → 菜单含捕获入口
    await page.evaluate(() => {
        const block = Array.from(document.querySelectorAll('.protyle-wysiwyg [data-node-id][data-type="NodeParagraph"]'))
            .find((el) => el.getBoundingClientRect().width > 0);
        block.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: 400, clientY: 300}));
    });
    await page.waitForTimeout(600);
    const menuItems = await page.evaluate(() => Array.from(document.querySelectorAll(".b3-menu .b3-menu__item")).map((b) => (b.textContent ?? "").trim()));
    check("2 右键菜单含捕获入口", ["保存选区", "捕获当前块", "插入常用条目"].every((k) => menuItems.some((t) => t.includes(k))), JSON.stringify(menuItems).slice(0, 150));
    await page.screenshot({path: "docs/design/real-capture-02-menu.png"});
    // 关菜单
    await page.evaluate(() => document.querySelectorAll(".b3-menu").forEach((el) => el.remove()));

    // 3. 选区捕获：程序化选区 → 右键 → 保存选区
    await page.evaluate(() => {
        const p = Array.from(document.querySelectorAll('.protyle-wysiwyg [data-node-id][data-type="NodeParagraph"]'))
            .find((el) => (el.textContent ?? "").includes("第一个段落"));
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        p.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: 400, clientY: 300}));
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".b3-menu .b3-menu__item")).find((b) => (b.textContent ?? "").includes("保存选区"));
        item?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(800);
    const form1 = await page.evaluate(() => Boolean(document.querySelector(".xlc-form")));
    check("3 选区捕获表单打开", form1);
    if (form1) {
        await page.evaluate(() => {
            const input = document.querySelector(".xlc-form input.b3-text-field");
            if (input) { input.value = "选区捕获条目"; input.dispatchEvent(new Event("input", {bubbles: true})); }
        });
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll(".xlc-form button")).find((b) => (b.textContent ?? "").includes("保存"));
            btn?.click();
        });
        await page.waitForTimeout(1200);
        const kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
        check("4 选区捕获真实落库", kids.some((k) => (k.content ?? "").includes("选区捕获条目")), `库块数 ${kids.length}`);
    }

    // 5. 捕获当前块
    await page.evaluate(() => {
        const p = Array.from(document.querySelectorAll('.protyle-wysiwyg [data-node-id][data-type="NodeParagraph"]'))
            .find((el) => (el.textContent ?? "").includes("第一个段落"));
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(p);
        sel.removeAllRanges();
        sel.addRange(range);
        p.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: 400, clientY: 300}));
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".b3-menu .b3-menu__item")).find((b) => (b.textContent ?? "").includes("捕获当前块"));
        item?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(800);
    const form2 = await page.evaluate(() => Boolean(document.querySelector(".xlc-form")));
    check("5 捕获当前块表单打开", form2);
    if (form2) {
        await page.evaluate(() => {
            const input = document.querySelector(".xlc-form input.b3-text-field");
            if (input) { input.value = "块捕获条目"; input.dispatchEvent(new Event("input", {bubbles: true})); }
        });
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll(".xlc-form button")).find((b) => (b.textContent ?? "").includes("保存"));
            btn?.click();
        });
        await page.waitForTimeout(1200);
        const kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
        check("6 块捕获真实落库", kids.some((k) => (k.content ?? "").includes("块捕获")), `库块数 ${kids.length}`);
    }

    // 7. 链接右键捕获
    await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('.protyle-wysiwyg span[data-type="a"]'))
            .find((el) => el.getBoundingClientRect().width > 0);
        link.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: 400, clientY: 300}));
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".b3-menu .b3-menu__item")).find((b) => (b.textContent ?? "").includes("链接"));
        item?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(800);
    const form3 = await page.evaluate(() => Boolean(document.querySelector(".xlc-form")));
    check("7 链接捕获表单打开", form3);
    if (form3) {
        await page.evaluate(() => {
            const input = document.querySelector(".xlc-form input.b3-text-field");
            if (input) { input.value = "链接捕获条目"; input.dispatchEvent(new Event("input", {bubbles: true})); }
        });
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll(".xlc-form button")).find((b) => (b.textContent ?? "").includes("保存"));
            btn?.click();
        });
        await page.waitForTimeout(1200);
        const kids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
        check("8 链接捕获真实落库", kids.some((k) => (k.content ?? "").includes("链接捕获条目")), `库块数 ${kids.length}`);
    }

    // 9. 顶栏图标打开搜索弹窗
    await page.evaluate(() => document.querySelectorAll(".b3-dialog, .xlc-dialog, .xlc-form").forEach((el) => el.remove()));
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("#toolbar button, #toolbar [data-menu], .toolbar [data-menu]"));
        const hit = btns.find((b) => (b.getAttribute("aria-label") ?? b.getAttribute("title") ?? "").includes("小驴常用"));
        hit?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(800);
    check("9 顶栏图标打开搜索弹窗", await page.evaluate(() => Boolean(document.querySelector(".xlc-dialog"))));
    await page.screenshot({path: "docs/design/real-capture-03-dialog.png"});

    const finalKids = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    const allText = finalKids.map((k) => k.content ?? "").join("|");
    check("10 库文档含全部捕获条目", ["选区捕获条目", "块捕获", "链接捕获条目"].every((s) => allText.includes(s)), allText.slice(0, 150));

    const pass = results.filter((r) => r.ok).length;
    console.log(`\n捕获入口真机验收：${pass}/${results.length} 通过`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
