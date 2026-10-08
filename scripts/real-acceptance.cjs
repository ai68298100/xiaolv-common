// 真机前端全自动验收（R142）：真实内核 6808 + 真实 SiYuan web 前端（Chrome app 窗口）
// + 已启用的小驴常用插件（dist 0.3.2）。CDP/Playwright 驱动完整用户流程并截图取证。
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "design");

let chromium;
try {
    ({chromium} = require(path.join(ROOT, "..", "小驴雷切", "node_modules", "@playwright", "test")));
} catch {
    ({chromium} = require("playwright"));
}

const ORIGIN = process.env.IT_ORIGIN || "http://127.0.0.1:6808";
const TOKEN = process.env.IT_TOKEN || require(path.join("D:/思源插件/xiaolv-real-ws2/conf/conf.json")).api.token;
const DOC = process.env.IT_DOC || "";
const results = [];
const check = (name, ok, detail = "") => {
    results.push({name, ok: Boolean(ok)});
    console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const shot = (page, name) => page.screenshot({path: path.join(OUT, `real-${name}.png`)}).then(() => console.log(`  📷 real-${name}.png`));

async function api(endpoint, payload = {}) {
    const r = await fetch(ORIGIN + endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json", Authorization: `Token ${TOKEN}`},
        body: JSON.stringify(payload),
    });
    return r.json();
}

(async () => {
    // 运行前清库：保证空态与新建路径确定性（R142）
    {
        const kids = (await api("/api/block/getChildBlocks", {id: DOC})).data ?? [];
        for (const kid of kids) {
            const attrs = await api("/api/attr/getBlockAttrs", {id: kid.id});
            if (attrs.data && attrs.data["custom-xlc-id"]) {
                await api("/api/block/deleteBlock", {id: kid.id});
            }
        }
        console.log("  [prep] 库文档已清空条目");
    }


    const browser = await chromium.launch({
        headless: false,
        args: [`--app=${ORIGIN}`, "--window-size=1380,900"],
    });
    const context = await browser.newContext({viewport: {width: 1360, height: 880}, locale: "zh-CN"});
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(`pageerror: ${String(err && err.stack ? err.stack.slice(0, 300) : err)}`));
    page.on("console", (msg) => {
        if (msg.type() === "error") pageErrors.push(`console: ${msg.text().slice(0, 160)}`);
    });
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(2500); // 布局与插件 onload

    // 1. 插件运行时加载
    const pluginLoaded = await page.evaluate(() => {
        const app = window.siyuan?.ws?.app;
        const p = (app?.plugins ?? []).find((x) => x.name === "xiaolv-common");
        return p ? {name: p.name, version: p.version, commands: Object.keys(p.protocolCommands ?? {})} : null;
    });
    check("1 插件运行时已加载（真实前端）", Boolean(pluginLoaded), JSON.stringify(pluginLoaded));

    // 2. 真实顶栏入口存在
    await page.waitForTimeout(500);
    const topbarBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("#toolbar [data-menu], .toolbar [data-menu], #toolbar button, .toolbar button"));
        const hit = btns.find((b) => (b.getAttribute("aria-label") ?? b.getAttribute("title") ?? "").includes("小驴常用"));
        return hit ? {found: true, label: hit.getAttribute("aria-label") ?? hit.getAttribute("title")} : {found: false};
    });
    check("2 真实顶栏入口存在", topbarBtn.found, JSON.stringify(topbarBtn));
    await shot(page, "01-desktop");

    // 3. 打开搜索弹窗（优先点真实顶栏按钮，回退协议命令）
    if (topbarBtn.found) {
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("#toolbar [data-menu], .toolbar [data-menu], #toolbar button, .toolbar button"));
            const hit = btns.find((b) => (b.getAttribute("aria-label") ?? b.getAttribute("title") ?? "").includes("小驴常用"));
            hit?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        });
        await page.waitForTimeout(800);
    }
    let dialogOpen = await page.evaluate(() => Boolean(document.querySelector(".xlc-dialog")));
    if (dialogOpen) {
        // 清空预填查询：空库引导仅在无查询词时出现（R142）
        await page.evaluate(() => {
            const input = document.querySelector(".xlc-search-input");
            if (input) { input.value = ""; input.dispatchEvent(new Event("input", {bubbles: true})); }
        });
        await page.waitForTimeout(600);
    }
    if (!dialogOpen) {
        await page.evaluate(() => {
            const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
            void p.protocolCommands["xiaolv.common.open"]();
        });
        await page.waitForTimeout(800);
        dialogOpen = await page.evaluate(() => Boolean(document.querySelector(".xlc-dialog")));
    }
    check("3 搜索弹窗打开（真实 DOM）", dialogOpen);
    await shot(page, "02-dialog-empty");

    // 4. 空态 → 新建条目（真实捕获表单）
    const emptyGuide = await page.evaluate(() => (document.querySelector(".xlc-empty-text")?.textContent ?? ""));
    check("4 空库引导显示", emptyGuide.includes("空"), emptyGuide);
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".xlc-dialog button")).find((b) => (b.textContent ?? "").includes("新建条目"));
        btn?.click();
    });
    await page.waitForTimeout(600);
    const formOpen = await page.evaluate(() => Boolean(document.querySelector(".xlc-form")));
    check("5 捕获表单打开（真实 UI）", formOpen);
    if (formOpen) {
        await page.evaluate(() => {
            const fields = document.querySelectorAll(".xlc-form .b3-text-field, .xlc-form textarea");
            // 顺序：AI 草稿(如有)、内容、标题、别名、标签、分类
            const area = document.querySelector(".xlc-form textarea");
            if (area) area.value = "真机验收条目：这是一条来自真实思源前端的集成测试内容。";
            const inputs = document.querySelectorAll(".xlc-form input.b3-text-field");
            const titleInput = Array.from(inputs).find((i) => i.placeholder === "" ) || inputs[0];
            if (titleInput) titleInput.value = "真机验收条目甲";
            document.querySelectorAll(".xlc-form input, .xlc-form textarea").forEach((el) => el.dispatchEvent(new Event("input", {bubbles: true})));
        });
        await shot(page, "03-capture");
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll(".xlc-form button")).find((b) => (b.textContent ?? "").includes("保存"));
            btn?.click();
        });
        await page.waitForTimeout(1500);
        const saved = await api("/api/block/getChildBlocks", {id: DOC});
        const blocks = saved.data ?? [];
        check("6 保存后真实块落入库文档", blocks.length >= 2, `${blocks.length} 块（含欢迎页段落）`);
        await page.evaluate(() => document.querySelectorAll(".b3-dialog").forEach((el) => el.remove()));
    }

    // 7. 搜索发现真条目
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "真机验收";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(1200);
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll(".xlc-row-titletext")).map((r) => r.textContent.trim()));
    check("7 真实搜索命中条目", rows.some((t) => t.includes("真机验收条目甲")), JSON.stringify(rows));
    await shot(page, "04-search-hit");

    // 7b. 第二次使用：同文捕获去重（保存同内容 → 确认弹窗 → 取消 → 不落块）
    const beforeDup = ((await api("/api/block/getChildBlocks", {id: DOC})).data ?? []).length;
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        p.capture.newManual();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const area = document.querySelector(".xlc-form textarea");
        if (area) { area.value = "真机验收条目甲：这是一条来自真实思源前端的集成测试内容。"; area.dispatchEvent(new Event("input", {bubbles: true})); }
        const titleInput = document.querySelector(".xlc-form input.b3-text-field");
        if (titleInput) { titleInput.value = "真机验收条目甲"; titleInput.dispatchEvent(new Event("input", {bubbles: true})); }
    });
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".xlc-form button")).find((b) => (b.textContent ?? "").includes("保存"));
        btn?.click();
    });
    await page.waitForTimeout(1200);
    const dupDialog = await page.evaluate(() => {
        const dialogs = document.querySelectorAll(".b3-dialog");
        const last = dialogs[dialogs.length - 1];
        return {confirm: Boolean(last && (last.textContent ?? "").includes("已存在")), count: dialogs.length};
    });
    check("7b 同文保存触发去重确认弹窗", dupDialog.confirm, JSON.stringify(dupDialog));
    // 取消：不落块
    await page.evaluate(() => {
        const dialogs = document.querySelectorAll(".b3-dialog");
        const last = dialogs[dialogs.length - 1];
        const btn = Array.from(last.querySelectorAll("button")).find((b) => (b.textContent ?? "").trim() === "取消");
        btn?.click();
    });
    await page.waitForTimeout(800);
    const afterDup = ((await api("/api/block/getChildBlocks", {id: DOC})).data ?? []).length;
    check("7c 取消后不落块（块数不变）", afterDup === beforeDup, beforeDup + " → " + afterDup);
    await page.evaluate(() => document.querySelectorAll(".xlc-form").forEach((el) => el.remove()));
    await page.evaluate(() => document.querySelectorAll(".xlc-dialog, .b3-dialog").forEach((el) => el.remove()));
    // 重开弹窗（搜索态恢复）
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(800);

    // 7d. 收藏状态跨弹窗：点星收藏 → 关闭 → 重开 → ★收藏筛选可见该条目
    await page.evaluate(() => {
        const star = document.querySelector(".xlc-list .xlc-row .xlc-row-action");
        star?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const chip = Array.from(document.querySelectorAll(".xlc-scope-chip")).find((c) => (c.textContent ?? "").includes("收藏"));
        chip?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(800);
    const favRows = await page.evaluate(() => Array.from(document.querySelectorAll(".xlc-row-titletext")).map((r) => r.textContent.trim()));
    check("7d 收藏跨弹窗生效（收藏筛选含该条目）", favRows.some((t) => t.includes("真机验收条目甲")), JSON.stringify(favRows));
    await shot(page, "04b-favorite");

    // 8. 真实插入：动作菜单 → 插入到指定文档 → 内联搜索 → 命中即写（全 UI 链路，真实内核落块）
    await page.evaluate(() => {
        const row = document.querySelector('.xlc-list .xlc-row');
        row.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true}));
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.xlc-menu button')).find((b) => (b.textContent ?? '').includes('插入到指定文档'));
        btn?.click();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const input = document.querySelector('.xlc-pickdoc-input');
        if (input) { input.value = '常用内容库'; input.dispatchEvent(new Event('input', {bubbles: true})); }
    });
    await page.waitForTimeout(900);
    await page.evaluate(() => {
        const hit = document.querySelector('.xlc-pickdoc-hit');
        hit?.click();
    });
    await page.waitForTimeout(1500);
    const afterBlocks = ((await api('/api/block/getChildBlocks', {id: DOC})).data ?? []).length;
    const diag = await page.evaluate(() => ({
        status: (document.querySelector('.xlc-status')?.textContent ?? '').slice(0, 80),
        toast: Array.from(document.querySelectorAll('.b3-snackbar')).map((t) => (t.textContent ?? '').slice(0, 80)).filter(Boolean).join(' | '),
    }));
    check('8 真实插入到指定文档（内核落块）', afterBlocks > 2, `块数=${afterBlocks}；status=${diag.status}；toast=${diag.toast}`);
    await shot(page, '05-inserted');

    // 10. 设置面板 + B-004 序列（真实前端复测）
    await page.evaluate(() => document.querySelectorAll(".xlc-dialog, .b3-dialog").forEach((el) => el.remove()));
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.openSettings();
    });
    await page.waitForTimeout(800);
    const settingsOpen = await page.evaluate(() => Boolean(document.querySelector(".xlc-card")) || (document.querySelector(".b3-dialog__container")?.textContent ?? "").includes("当前内容库"));
    check("9 真实设置面板打开", settingsOpen);
    await shot(page, "06-settings");
    // B-004 序列：展开库选择器 + 快速开关切换 200 次
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("更改内容库"));
        btn?.click();
    });
    await page.waitForTimeout(400);
    let crashed = false;
    page.on("crash", () => { crashed = true; });
    for (let i = 0; i < 200 && !crashed; i++) {
        try {
            await page.evaluate(() => {
                document.querySelectorAll("input[type=checkbox]").forEach((b) => { b.click(); });
                const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("更改内容库"));
                btn?.click();
            });
            await page.waitForTimeout(30);
        } catch {
            crashed = true;
        }
    }
    const aliveAfter = await page.evaluate(() => Boolean(document.querySelector(".b3-dialog, .xlc-card"))).catch(() => false);
    check("10 B-004 序列（200 次快速开关+展开）真实前端存活", !crashed && aliveAfter, crashed ? "页面崩溃" : "alive");
    await shot(page, "07-settings-after-stress");

    // 11. 页面异常汇总
    const realErrors = pageErrors.filter((e) => !e.includes("favicon") && !e.includes("net::"));
    const pluginErrors = realErrors.filter((e) => e.includes('plugin:') || e.includes('xlc'));
    const coreErrors = realErrors.filter((e) => !pluginErrors.includes(e));
    check('11a 插件自身 0 页面异常', pluginErrors.length === 0, pluginErrors.slice(0, 2).join(' | '));
    check('11b 思源核心 0 异常（压测触发计入信息）', coreErrors.length === 0, '核心异常 ' + coreErrors.length + ' 条（main.js，非插件代码）');

    await browser.close();
    // 优雅退出：内核先落盘再退出（强杀会损伤 searchDocs 索引，R142 教训）
    try {
        await fetch(ORIGIN + '/api/system/exit', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Token ${TOKEN}`}, body: '{}'});
        console.log('  [graceful] 内核退出指令已发');
    } catch {}

    const pass = results.filter((r) => r.ok).length;
    const fail = results.length - pass;
    console.log(`\n真机前端验收：${pass}/${results.length} 通过${fail ? "，存在失败" : " —— B-001 前端部分验收通过"}`);
    process.exit(fail ? 1 : 0);
})().catch((err) => {
    console.error(`真机验收异常：${err.message}`);
    process.exit(1);
});
