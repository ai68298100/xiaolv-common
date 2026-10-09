// R168 树模式 + 拼音真实内核行为核对（ROADMAP「真实宿主下拼音与树模式行为核对」——隔离真内核即真内核，先行收口；
// Electron 用户数据面仍随 B-001）。
// 树模式：tree 配置 → 条目块被移入子文档（官方 API 模拟用户移动块）→ 设置→重建索引 → 全树索引仍命中且预览可解析。
// 拼音：中文标题条目以首字母串搜索命中。
"use strict";
const {chromium} = require("playwright");
const fs = require("fs");
const path = require("path");
const ORIGIN = process.env.IT_ORIGIN;
const TOKEN = process.env.IT_TOKEN;
const LIB_DOC = process.env.IT_DOC;
const WS = process.env.IT_WS;
const results = [];
const check = (name, ok, detail = "") => { results.push({name, ok: Boolean(ok)}); console.log(`${ok ? "✔" : "✖"} ${name}${detail ? " — " + detail : ""}`); };
async function api(endpoint, payload = {}, attempt = 0) {
    try {
        const r = await fetch(ORIGIN + endpoint, {method: "POST", headers: {"Content-Type": "application/json", Authorization: `Token ${TOKEN}`}, body: JSON.stringify(payload)});
        const text = await r.text();
        return JSON.parse(text);
    } catch (err) {
        if (attempt < 2) {
            await new Promise((res) => setTimeout(res, 800));
            return api(endpoint, payload, attempt + 1);
        }
        throw new Error(`api ${endpoint}: ${err.message}`);
    }
}

(async () => {
    // 0. 写 tree 模式配置（插件在前端加载时读取；内核不关心 petal 文件）
    const petalDir = path.join(WS, "data", "storage", "petal", "xiaolv-common");
    fs.writeFileSync(path.join(petalDir, "config.json"), JSON.stringify({
        configVersion: 1, mode: "tree", notebookIds: [], containerDocIds: [LIB_DOC], createdDocIds: [LIB_DOC], configuredAt: Date.now(),
    }));

    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage({viewport: {width: 1280, height: 780}, locale: "zh-CN"});
    const logs = [];
    page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 160)));
    await page.goto(ORIGIN, {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => Boolean(window.siyuan), null, {timeout: 30000});
    await page.waitForTimeout(3500);

    // 1. 协议 save：甲（留原地）、乙（稍后移入子文档）、拼音标题条目
    const saved = await page.evaluate(async () => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        return {
            a: await p.service.save({itemType: "text", markdown: "树模式验收甲：留在容器根", title: "树模式验收甲"}),
            b: await p.service.save({itemType: "text", markdown: "树模式验收乙：将被移入子文档", title: "树模式验收乙"}),
            py: await p.service.save({itemType: "text", markdown: "拼音验收正文", title: "拼音验收测试"}),
        };
    });
    check("1 协议 save 三条目（tree 配置生效写入容器根）", Boolean(saved.a?.ok && saved.b?.ok && saved.py?.ok));

    // 2. 内核建子文档 + 移动乙块过去（append 复制内容 + 属性移植 + 删原块 = 官方 API 模拟用户移动）
    const nbId = (await api("/api/notebook/lsNotebooks")).data.notebooks[0].id;
    const child = await api("/api/filetree/createDocWithMd", {notebook: nbId, path: "/常用内容库/子文档甲", markdown: "子文档"});
    const childDocId = String(child.data ?? "");
    const kidsRoot = (await api("/api/block/getChildBlocks", {id: LIB_DOC})).data ?? [];
    let movedOk = false;
    for (const k of kidsRoot) {
        const attrs = (await api("/api/attr/getBlockAttrs", {id: k.id})).data ?? {};
        if (attrs["custom-xlc-title"] === "树模式验收乙") {
            const kd = (await api("/api/block/getBlockKramdown", {id: k.id})).data?.kramdown ?? "";
            // 必须剥掉整行 IAL 标记（{: id="…" custom-…}）：保留会让 Lute 让新块继承旧块 ID，
            // 随后的 deleteBlock(旧 ID) 会把子文档里的新块一并删掉（R168 脚本实证）
            const body = kd.replace(/\n?\{: [^}]*\}\s*$/, "").trim();
            const appended = await api("/api/block/appendBlock", {dataType: "markdown", data: body, parentID: childDocId});
            const newId = appended.data?.[0]?.doOperations?.[0]?.id ?? "";
            const cleanAttrs = {};
            for (const [key, val] of Object.entries(attrs)) if (key.startsWith("custom-xlc-")) cleanAttrs[key] = val;
            await api("/api/attr/setBlockAttrs", {id: newId, attrs: cleanAttrs});
            await api("/api/block/deleteBlock", {id: k.id});
            movedOk = newId.length > 10;
            break;
        }
    }
    check("2 乙块移入子文档（属性移植完成）", movedOk);

    // 3. 设置 → 重建索引（真实按钮）
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.openSettings();
    });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("重建索引"));
        btn?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(5000);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);

    // 4. 全树搜索：甲（根）+ 乙（子文档）均命中
    await page.evaluate(() => {
        const p = window.siyuan.ws.app.plugins.find((x) => x.name === "xiaolv-common");
        void p.protocolCommands["xiaolv.common.open"]();
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "树模式验收";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(2000);
    const found = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        return {a: rows.some((r) => (r.textContent ?? "").includes("树模式验收甲")), b: rows.some((r) => (r.textContent ?? "").includes("树模式验收乙")), total: rows.length};
    });
    check("3 全树索引：根文档条目命中", found.a);
    check("4 全树索引：子文档中已移动条目命中（BFS 生效）", found.b, `rows=${found.total}`);

    // 5. 乙预览可解析（块在新位置正常读取）
    await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        rows.find((r) => (r.textContent ?? "").includes("树模式验收乙"))?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await page.waitForTimeout(1500);
    const previewText = await page.evaluate(() => (document.querySelector(".xlc-pane-body")?.textContent ?? ""));
    check("5 已移动条目预览正常（新块位置解析）", previewText.includes("移入子文档"), previewText.slice(0, 60));

    // 6. 拼音首字母搜索：pyys（拼音验收测试 = pin yin yan shou ce shi 的首字母串）
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.value = "pyys";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(2000);
    const pinyinHit = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".xlc-list .xlc-row"));
        return rows.some((r) => (r.textContent ?? "").includes("拼音验收测试"));
    });
    check("6 拼音首字母搜索命中（pyys → 拼音验收测试）", pinyinHit);

    if (logs.length) console.log("页面错误：", logs.slice(0, 3).join(" | "));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n树模式+拼音真机核对：${pass}/${results.length} 通过`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("驱动异常：", e); process.exit(2); });
