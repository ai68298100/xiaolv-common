// 生产 UI 交互审计（R137）：在真实 dist CSS + 生产 dialog/settings 源码装配的 DOM 上，
// 驱动键盘/鼠标交互链路并断言行为结果——补齐 render-production.cjs（静态渲染冒烟）不覆盖的
// 「操作之后状态是否正确」。零业务 mock：复用 harness 桩件（记录 fill/copy 调用）。
// 用法：node scripts/ui-interaction-audit.cjs（需 Playwright Chromium）
// 断言失败或页面异常即退出 1。
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "design");
const STUB = path.join(__dirname, "harness", "stub-dom.cjs");

let chromium;
try {
    ({chromium} = require(path.join(ROOT, "..", "小驴雷切", "node_modules", "@playwright", "test")));
} catch {
    ({chromium} = require("playwright"));
}

// 与 render-production.cjs 同款引导：打包 harness + 组装页面
const bundlePath = path.join(OUT, "harness-bundle.js");
esbuild.buildSync({
    entryPoints: [path.join(__dirname, "harness", "entry.ts")],
    outfile: bundlePath,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2019",
    logLevel: "silent",
    alias: {siyuan: STUB},
});
const prodCss = fs.readFileSync(path.join(ROOT, "dist", "index.css"), "utf8");
const b3Vars = `
.b3-scope { font-family: "PingFang SC", "Microsoft YaHei", -apple-system, "Segoe UI", sans-serif; }
.b3-scope.light {
  --b3-theme-primary: #3575f0; --b3-theme-primary-light: #7f9ff5; --b3-theme-primary-lighter: #c6d5fa;
  --b3-theme-on-primary: #fff; --b3-theme-background: #fff; --b3-theme-surface: #f7f8fa;
  --b3-theme-on-background: #1f2329; --b3-theme-on-surface: #7d8085; --b3-border-color: #e5e7eb;
  --b3-list-hover: #eef1f6; --b3-menu-background: #fff;
}
.b3-dialog__container { background: var(--b3-theme-background); border: 1px solid var(--b3-border-color); border-radius: 12px; }
.b3-select { border: 1px solid var(--b3-border-color); background: var(--b3-theme-surface); color: var(--b3-theme-on-background); }
.b3-text-field { border: 1px solid var(--b3-border-color); background: var(--b3-theme-surface); color: var(--b3-theme-on-background); font-family: inherit; }
.b3-button { border: 1px solid var(--b3-border-color); background: var(--b3-theme-background); color: var(--b3-theme-on-background); border-radius: 8px; cursor: pointer; font-family: inherit; }
body { margin: 0; background: #eceef1; }
`;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>${b3Vars}</style><style>${prodCss}</style></head>
<body><div class="b3-scope light" id="stage"></div>
<script src="${path.basename(bundlePath)}"></script></body></html>`;
fs.writeFileSync(path.join(OUT, "harness.html"), html);

const results = [];
const check = (name, ok, detail = "") => {
    results.push({name, ok: Boolean(ok), detail});
    console.log(`${ok ? "✔" : "✖"} ${name}${ok ? "" : ` — ${detail}`}`);
};

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
        if (msg.type() === "error") pageErrors.push(`console: ${msg.text()}`);
    });
    await page.goto("file:///" + path.join(OUT, "harness.html").replace(/\\/g, "/"));
    await page.waitForFunction(() => Boolean(window.XlcHarness));

    const open = (opts = {}) => page.evaluate((o) => {
        document.querySelectorAll(".b3-dialog, .xlc-dialog").forEach((el) => el.remove());
        return Boolean(window.XlcHarness.openDialog(o));
    }, opts);

    const type = (text) => page.evaluate((q) => {
        const input = document.querySelector(".xlc-search-input");
        input.value = q;
        input.dispatchEvent(new Event("input"));
    }, text);

    const key = (k, mods = {}) => page.evaluate(({k, mods}) => {
        const input = document.querySelector(".xlc-search-input");
        input.dispatchEvent(new KeyboardEvent("keydown", {key: k, bubbles: true, ...mods}));
    }, {k, mods});

    const rows = () => page.evaluate(() => Array.from(document.querySelectorAll(".xlc-list .xlc-row")).map((r) => ({
        title: (r.querySelector(".xlc-row-titletext")?.textContent ?? "").trim(),
        active: r.classList.contains("xlc-row--active"),
    })));

    const sleep = (ms) => page.waitForTimeout(ms);

    // ── A. 变量填充链路：搜索 → Enter（含变量条目）→ 填卡 → 填写 → 插入 → fills 传值 ──
    await open({});
    await sleep(200);
    await type("延期");
    await sleep(250);
    check("A1 搜索出行", (await rows()).length >= 2, JSON.stringify(await rows()));
    await key("Enter");
    await page.waitForSelector(".xlc-varform", {timeout: 3000}).catch(() => {});
    const varFields = await page.evaluate(() => Array.from(document.querySelectorAll("input[data-xlc-var-field]")).map((el) => el.dataset.xlcVarField));
    check("A2 变量卡出现且含 2 字段", varFields.length === 2, JSON.stringify(varFields));
    await page.evaluate(() => {
        for (const input of document.querySelectorAll("input[data-xlc-var-field]")) {
            input.value = input.dataset.xlcVarField === "客户名称" ? "王总" : "5%";
            input.dispatchEvent(new Event("input", {bubbles: true}));
        }
    });
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".xlc-varform button")).find((b) => (b.textContent ?? "").includes("插入"));
        btn?.click();
    });
    await sleep(300);
    const fills = await page.evaluate(() => window.__xlcLastFills);
    check("A3 填写值传入插入动作", fills && fills["客户名称"] === "王总" && fills["补偿比例"] === "5%", JSON.stringify(fills));

    // ── B. 键盘链路：↓ 移动选择；Ctrl+Enter 复制动作分派；Alt+1 直达插入（弹变量卡）──
    await open({});
    await sleep(250);
    const activeFirst = (await rows()).find((r) => r.active);
    await key("ArrowDown");
    await sleep(150);
    const activeSecond = (await rows()).find((r) => r.active);
    check("B1 ArrowDown 激活行下移", activeFirst?.title.includes("延期道歉") && activeSecond?.title.includes("SQL"), `${JSON.stringify(activeFirst)} → ${JSON.stringify(activeSecond)}`);
    await key("Enter", {ctrlKey: true});
    await sleep(300);
    const actions = await page.evaluate(() => window.__xlcActions);
    check("B2 Ctrl+Enter 分派复制动作", Array.isArray(actions) && actions.some((a) => a.id === "xlc-demo0000003" && a.mode === "copy"), JSON.stringify(actions));
    await key("Alt", {});
    await key("1", {altKey: true});
    await page.waitForSelector(".xlc-varform", {timeout: 3000}).catch(() => {});
    check("B3 Alt+1 直达插入弹变量卡", await page.evaluate(() => Boolean(document.querySelector(".xlc-varform"))));
    // 取消走真实接线（varform 取消按钮 → onCancel → 焦点回搜索框，R128/R129）；
    // Esc 在真实宿主由 Dialog 层处理，harness 桩无该机制，不以合成键断言。
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll(".xlc-varform button")).find((b) => (b.textContent ?? "").includes("取消"));
        btn?.click();
    });
    await sleep(250);
    const varFormGone = await page.evaluate(() => !document.querySelector(".xlc-varform") && Boolean(document.querySelector(".xlc-dialog")));
    const focusBack = await page.evaluate(() => document.activeElement?.classList.contains("xlc-search-input") ?? false);
    check("B4 取消变量卡：卡片关、弹窗留、焦点回搜索框", varFormGone && focusBack, `gone=${varFormGone} focusBack=${focusBack}`);

    // ── C. Esc 关闭弹窗 ──
    await key("Escape");
    await sleep(200);
    const gone = await page.evaluate(() => document.querySelector(".xlc-dialog") === null);
    check("C1 Esc 关闭弹窗", gone);

    // ── D. 类型筛选：change → setFilters 持久化 + 重查（筛选逻辑在 service 层，由单测覆盖；
    // UI 契约是「改选即落 setFilters 并触发 refresh」，R118 竞态回归探测点）──
    await open({});
    await sleep(700); // 等异步筛选选项回填触发的重查全部沉降，避免基线计数竞态
    await type("延期"); // 本地查询路径（? 查询走 AI 语义，不计数本地 search）
    await sleep(400);
    const callsBefore = await page.evaluate(() => window.__xlcSearchCalls ?? 0);
    await page.evaluate(() => {
        const sel = document.querySelector(".xlc-type-select");
        sel.value = "code";
        sel.dispatchEvent(new Event("change", {bubbles: true}));
    });
    await sleep(400);
    const dState = await page.evaluate(() => ({
        calls: window.__xlcSearchCalls ?? 0,
        set: window.__xlcSetFilters ?? [],
        value: document.querySelector(".xlc-type-select")?.value ?? "",
    }));
    check("D1 类型改选落 setFilters 并重查", dState.calls > callsBefore && dState.set.some((f) => f.type === "code") && dState.value === "code", JSON.stringify(dState));
    await page.evaluate(() => {
        const sel = document.querySelector(".xlc-type-select");
        if (sel) {
            sel.value = "";
            sel.dispatchEvent(new Event("change", {bubbles: true}));
        }
        const input = document.querySelector(".xlc-search-input");
        if (input) {
            input.value = "";
            input.dispatchEvent(new Event("input", {bubbles: true}));
        }
    });
    await sleep(350);
    check("D2 清除筛选后操作列表恢复", (await rows()).length > 0, JSON.stringify(await rows()));

    // ── E. 排序菜单：弹出四档、点选后关闭 ──
    await page.evaluate(() => document.querySelector(".xlc-sort-chip")?.click());
    await sleep(200);
    const sortMenu = await page.evaluate(() => {
        const menu = document.querySelector(".xlc-menu");
        if (!menu) return {open: false, items: []};
        return {open: true, items: Array.from(menu.querySelectorAll("button, [role=menuitem]")).map((b) => (b.textContent ?? "").trim())};
    });
    check("E1 排序菜单含四档", sortMenu.open && ["手动/置顶", "最近使用", "常用", "标题"].every((t) => sortMenu.items.some((i) => i.includes(t))), JSON.stringify(sortMenu.items));
    await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".xlc-menu button, .xlc-menu [role=menuitem]")).find((b) => (b.textContent ?? "").includes("常用"));
        item?.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
        item?.click();
    });
    await sleep(200);
    const sortClosed = await page.evaluate(() => document.querySelector(".xlc-menu") === null);
    check("E2 点选后菜单关闭", sortClosed);

    // ── F. 动作菜单：右键 → AI 变换 → 结果视图 → 插入原文（原文不被改写路径）──
    await page.evaluate(() => {
        const row = document.querySelector(".xlc-list .xlc-row");
        row.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true}));
    });
    await sleep(250);
    const menuHasAi = await page.evaluate(() => {
        const text = document.querySelector(".xlc-menu")?.textContent ?? "";
        return {hasTransforms: ["润色", "缩短", "正式化", "译为英文", "列表化"].every((t) => text.includes(t)), hasCustom: text.includes("客服话术")};
    });
    check("F1 动作菜单含内置+自定义变换", menuHasAi.hasTransforms && menuHasAi.hasCustom, JSON.stringify(menuHasAi));
    await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".xlc-menu button")).find((b) => (b.textContent ?? "").includes("润色"));
        item?.click();
    });
    await sleep(400);
    const resultView = await page.evaluate(() => {
        const text = document.querySelector(".xlc-menu")?.textContent ?? "";
        return {open: Boolean(document.querySelector(".xlc-menu")), hasResult: text.includes("王总") || text.length > 10, hasOriginal: text.includes("插入原文")};
    });
    check("F2 变换结果视图含「插入原文」", resultView.open && resultView.hasOriginal, JSON.stringify(resultView));
    await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".xlc-menu button")).find((b) => (b.textContent ?? "").includes("插入原文"));
        item?.click();
    });
    await sleep(250);
    const closedAfterOriginal = await page.evaluate(() => !document.querySelector(".xlc-menu") && !document.querySelector(".xlc-dialog"));
    check("F3 插入原文后关闭菜单与弹窗（R137 修复点）", closedAfterOriginal);

    // ── G. 提供方分区：搜「工作台」出现雷切/打卡内容源 ──
    await open({});
    await sleep(200);
    await type("工作台");
    await sleep(350);
    const provider = await page.evaluate(() => {
        const body = document.querySelector(".xlc-dialog")?.textContent ?? "";
        return {header: Boolean(document.querySelector(".xlc-provider-header")), hasLeique: body.includes("小驴雷切"), hasCheckin: body.includes("小驴打卡")};
    });
    check("G1 提供方分区出现两个内容源", provider.header && provider.hasLeique && provider.hasCheckin, JSON.stringify(provider));

    // ── H. 定向插入横幅 ──
    await open({insertTarget: {docId: "20240101120001-hijklmn", hPath: "/常用内容库"}});
    await sleep(300);
    const banner = await page.evaluate(() => (document.querySelector(".xlc-dialog")?.textContent ?? "").includes("插入到：/常用内容库"));
    check("H1 定向插入横幅显示落点", banner);

    // ── I. 设置交互：AI 总开关联动禁用正文开关；展开库选择器即聚焦；添加变换即聚焦 ──
    await page.evaluate(() => {
        document.querySelectorAll(".b3-dialog, .xlc-dialog").forEach((el) => el.remove());
        window.XlcHarness.openSettings();
    });
    await sleep(400);
    const aiLinkage = await page.evaluate(() => {
        // 设置面板卡片序：当前内容库（无勾选框）→ AI 助手（启用/允许读正文）→ 变量与插入 → 搜索
        const boxes = Array.from(document.querySelectorAll("input[type=checkbox]"));
        const [master, share] = boxes;
        if (!master || !share) return {ok: false, detail: `checkbox count=${boxes.length}`};
        master.click();
        const off = {disabled: share.disabled, checked: share.checked};
        master.click();
        // 重开总开关后正文开关恢复可用但保持关（安全默认：重新选入），不自动恢复勾选
        return {ok: off.disabled && !off.checked && !share.disabled && !share.checked, detail: `off=${JSON.stringify(off)} end.disabled=${share.disabled}`};
    });
    check("I1 AI 总开关联动正文开关（关→禁用清零；重开→可用且保持关）", aiLinkage.ok, aiLinkage.detail ?? "");
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("更改内容库"));
        btn?.click();
    });
    await sleep(300);
    const pickerFocus = await page.evaluate(() => {
        const el = document.activeElement;
        return el && el.classList.contains("b3-text-field") && (el.placeholder ?? "").length >= 0;
    });
    check("I2 展开更改内容库后文档搜索框聚焦", pickerFocus, String(await page.evaluate(() => document.activeElement?.className)));
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("添加自定义变换"));
        btn?.click();
    });
    await sleep(300);
    const ctFocus = await page.evaluate(() => Boolean(document.activeElement?.classList.contains("xlc-ct-name")));
    check("I3 添加自定义变换后名称输入聚焦", ctFocus, String(await page.evaluate(() => document.activeElement?.className)));

    // ── I4. 捕获表单 AI 整理与 AI 草稿并发完成后，各自恢复按钮与结果 ──
    await page.evaluate(() => {
        document.querySelectorAll(".b3-dialog, .xlc-dialog").forEach((el) => el.remove());
        window.XlcHarness.openCapture(true, 180);
    });
    await sleep(120);
    const concurrentAi = await page.evaluate(() => {
        const content = document.querySelector(".xlc-form-content");
        if (content) {
            content.value = "客服说明";
            content.dispatchEvent(new Event("input", {bubbles: true}));
        }
        const draftInput = Array.from(document.querySelectorAll(".xlc-form-field input")).find((el) => el.placeholder.includes("描述"));
        if (draftInput) {
            draftInput.value = "欢迎语";
            draftInput.dispatchEvent(new Event("input", {bubbles: true}));
        }
        const buttons = Array.from(document.querySelectorAll(".xlc-form-ai"));
        const tidy = buttons.find((el) => (el.textContent ?? "").includes("AI 整理"));
        const draft = buttons.find((el) => (el.textContent ?? "").includes("描述你想要"));
        tidy?.click();
        if (content) {
            content.value = "";
            content.dispatchEvent(new Event("input", {bubbles: true}));
        }
        draft?.click();
        return {tidy: Boolean(tidy), draft: Boolean(draft)};
    });
    await sleep(350);
    const concurrentAiResult = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll(".xlc-form-ai"));
        const tidy = buttons.find((el) => (el.textContent ?? "").includes("AI 整理"));
        const draft = buttons.find((el) => (el.textContent ?? "").includes("描述你想要"));
        const content = document.querySelector(".xlc-form-content");
        return {
            bothButtonsRestored: Boolean(tidy && draft && !tidy.disabled && !draft.disabled),
            tidyResultShown: getComputedStyle(document.querySelector(".xlc-sugrow")).display !== "none",
            draftResultApplied: content?.value === "草稿（欢迎语）",
        };
    });
    check("I4 并发 AI 整理/草稿各自恢复状态", concurrentAi.tidy && concurrentAi.draft && concurrentAiResult.bothButtonsRestored && concurrentAiResult.tidyResultShown && concurrentAiResult.draftResultApplied, JSON.stringify(concurrentAiResult));

    // ── J. 移动端底部 sheet：选中行 + 插入选中可用 ──
    await open({mobile: true});
    await sleep(350);
    const mobile = await page.evaluate(() => {
        const sheet = document.querySelector(".xlc-sheet");
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("插入选中"));
        const row = document.querySelector(".xlc-list .xlc-row");
        row?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return {sheet: Boolean(sheet), btnEnabled: Boolean(btn && !btn.disabled), newRowActive: Boolean(document.querySelector(".xlc-row--active"))};
    });
    check("J1 移动端 sheet：插入选中可用 + 点行选中", mobile.sheet && mobile.btnEnabled && mobile.newRowActive, JSON.stringify(mobile));

    // ── 全局：页面异常为零 ──
    check("Z1 全程 0 页面异常/控制台错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

    await browser.close();

    const pass = results.filter((r) => r.ok).length;
    const fail = results.length - pass;
    console.log(`\n交互审计汇总：${pass}/${results.length} 通过${fail ? `，${fail} 项失败` : " —— 交互链路全部正常"}`);
    process.exit(fail ? 1 : 0);
})().catch((err) => {
    console.error(`交互审计异常：${err.message}`);
    process.exit(1);
});
