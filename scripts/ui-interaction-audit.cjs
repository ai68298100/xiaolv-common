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
        const input = document.querySelector("[data-xlc-control='search.input']");
        input.value = q;
        input.dispatchEvent(new Event("input"));
    }, text);

    const key = (k, mods = {}) => page.evaluate(({k, mods}) => {
        const input = document.querySelector("[data-xlc-control='search.input']");
        input.dispatchEvent(new KeyboardEvent("keydown", {key: k, bubbles: true, ...mods}));
    }, {k, mods});

    const rows = () => page.evaluate(() => Array.from(document.querySelectorAll("[data-xlc-control='item.row']")).map((r) => ({
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

    // ── B. 键盘链路：↓ 移动选择；Ctrl+Enter 复制动作分派；Alt+1 直达插入；Alt+Shift+2 直达复制；Tab 导航与角标提示 ──
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

    // B5: 序号角标带有精确的快捷键提示（title 和 aria-label）
    const ordinalHintDetail = await page.evaluate(() => {
        const ord = document.querySelector(".xlc-row-ordinal");
        if (!ord) return {ok: false, detail: "ord is null"};
        const title = ord.getAttribute("title") ?? "";
        const aria = ord.getAttribute("aria-label") ?? "";
        const ok = title.includes("Alt+1") && title.includes("Alt+Shift+1") && aria.includes("Alt+1");
        return {ok, detail: `title=${JSON.stringify(title)}, aria=${JSON.stringify(aria)}`};
    });
    check("B5 序号角标包含 Alt+1 插入与 Alt+Shift+1 复制提示", ordinalHintDetail.ok, ordinalHintDetail.detail);

    // B6: Alt + Shift + 2 快捷直达复制第二项
    await page.evaluate(() => { window.__xlcActions = []; });
    await key("2", {altKey: true, shiftKey: true});
    await sleep(250);
    const copyActions = await page.evaluate(() => window.__xlcActions);
    check("B6 Alt+Shift+2 直达复制对应项", Array.isArray(copyActions) && copyActions.some((a) => a.id === "xlc-demo0000003" && a.mode === "copy"), JSON.stringify(copyActions));

    // B7: 搜索框焦点下按 Tab 键聚焦到预览操作区
    await page.focus(".xlc-search-input");
    await key("Tab");
    await sleep(150);
    const tabFocusedAction = await page.evaluate(() => {
        const act = document.activeElement;
        return Boolean(act?.closest(".xlc-pane-foot") || act?.closest(".xlc-pane-body"));
    });
    check("B7 Tab 键从搜索框聚焦到预览操作区", tabFocusedAction);

    // B8: 非输入框区域（列表聚焦）按粘贴分派 newWithContent 捕获草稿
    await page.evaluate(() => {
        window.__xlcNewWithContentCalls = [];
        const list = document.querySelector(".xlc-list");
        list?.focus();
        const ev = new Event("paste", {bubbles: true});
        Object.defineProperty(ev, "clipboardData", {
            value: {getData: (type) => (type === "text/plain" ? "https://github.com/ai68298100/xiaolv-common" : "")},
        });
        list?.dispatchEvent(ev);
    });
    await sleep(250);
    const pasteCallOk = await page.evaluate(() => {
        const calls = window.__xlcNewWithContentCalls;
        return Array.isArray(calls) && calls.length > 0 && calls[0].content === "https://github.com/ai68298100/xiaolv-common";
    });
    check("B8 非输入区快捷粘贴识别并唤起捕获草稿", pasteCallOk);

    // B9: 拖拽进入展示蒙层、离开移除蒙层
    await open({});
    await sleep(250);
    const overlayShown = await page.evaluate(() => {
        const root = document.querySelector(".xlc-dialog");
        const dt = {types: ["text/plain"]};
        const enterEv = new Event("dragenter", {bubbles: true});
        Object.defineProperty(enterEv, "dataTransfer", {value: dt});
        root?.dispatchEvent(enterEv);
        return Boolean(document.querySelector(".xlc-drop-overlay"));
    });
    const overlayRemoved = await page.evaluate(() => {
        const root = document.querySelector(".xlc-dialog");
        const leaveEv = new Event("dragleave", {bubbles: true});
        root?.dispatchEvent(leaveEv);
        return document.querySelector(".xlc-drop-overlay") === null;
    });
    check("B9 拖拽进入出现放置提示层且离开时移除", overlayShown && overlayRemoved, `shown=${overlayShown} removed=${overlayRemoved}`);

    // B10: Ctrl+D 快捷复制当前选中条目副本
    await page.evaluate(() => { window.__xlcDuplicatedItems = []; });
    await key("d", {ctrlKey: true});
    await sleep(250);
    const dupOk = await page.evaluate(() => {
        const dups = window.__xlcDuplicatedItems;
        return Array.isArray(dups) && dups.includes("xlc-demo0000001");
    });
    check("B10 Ctrl+D 快捷复制选中条目副本", dupOk);

    // B11: Ctrl+E 快捷编辑当前选中条目（并关闭搜索面板）
    await page.evaluate(() => { window.__xlcEditedItems = []; });
    await key("e", {ctrlKey: true});
    await sleep(250);
    const editOk = await page.evaluate(() => {
        const edits = window.__xlcEditedItems;
        const dialogGone = document.querySelector(".xlc-dialog") === null;
        return Array.isArray(edits) && edits.includes("xlc-demo0000001") && dialogGone;
    });
    check("B11 Ctrl+E 快捷编辑选中条目并关闭搜索面板", editOk);

    // B12: Alt+Delete 快捷删除分派当前选中条目
    await open({});
    await sleep(400);
    await page.evaluate(() => { window.__xlcDeletedItems = []; });
    await key("Delete", {altKey: true});
    await sleep(250);
    const delDebug = await page.evaluate(() => ({
        dels: window.__xlcDeletedItems,
        hasDialog: Boolean(document.querySelector(".xlc-dialog")),
        rows: document.querySelectorAll("[data-xlc-control='item.row']").length,
    }));
    const delOk = Array.isArray(delDebug.dels) && delDebug.dels.includes("xlc-demo0000001");
    check("B12 Alt+Delete 快捷删除分派对应条目", delOk, JSON.stringify(delDebug));

    // B13: Alt+F 快捷切换选中条目收藏状态
    await open({});
    await sleep(250);
    await page.evaluate(() => { window.__xlcFavoriteToggles = []; });
    await key("f", {altKey: true});
    await sleep(250);
    const favOk = await page.evaluate(() => {
        const toggles = window.__xlcFavoriteToggles;
        return Array.isArray(toggles) && toggles.includes("xlc-demo0000001");
    });
    check("B13 Alt+F 快捷切换条目收藏状态", favOk);

    // B14: 空搜索框聚焦时按 Alt+ArrowUp 成功回填最近搜索历史词
    await page.evaluate(() => {
        const input = document.querySelector("[data-xlc-control='search.input']");
        if (input) {
            input.value = "";
            input.dispatchEvent(new Event("input", {bubbles: true}));
            input.focus();
        }
    });
    await sleep(300);
    await key("ArrowUp", {altKey: true});
    await sleep(250);
    const historyRestored = await page.evaluate(() => {
        const input = document.querySelector("[data-xlc-control='search.input']");
        const history = window.XlcHarness ? (window.__xlcRecentQueries ?? []) : [];
        return {
            val: input?.value ?? "",
            expected: history[0] ?? "",
        };
    });
    check("B14 空输入框按 ArrowUp 回填最近搜索历史", historyRestored.val && historyRestored.val === historyRestored.expected, JSON.stringify(historyRestored));

    // B15: 点击列表行标签胶囊直选筛选，再次点击反选取消恢复
    await open({});
    await sleep(400);
    const pillDebug = await page.evaluate(() => {
        const pill = document.querySelector("[data-xlc-control='row.filter.tag']");
        return {
            hasPill: Boolean(pill),
            text: pill?.textContent,
            title: pill?.title,
            parentMeta: pill?.parentElement?.className,
        };
    });
    const tagPillClicked = await page.evaluate(() => {
        const pill = document.querySelector("[data-xlc-control='row.filter.tag']");
        if (!pill) return false;
        pill.click();
        return true;
    });
    await sleep(300);
    const filterApplied = await page.evaluate(() => {
        const sel = document.querySelector("[data-xlc-control='filter.tag']");
        return {
            val: sel?.value,
            options: Array.from(sel?.options ?? []).map((o) => o.value),
        };
    });
    // 再次点击同一标签反选恢复全部
    await page.evaluate(() => {
        const pill = document.querySelector("[data-xlc-control='row.filter.tag']");
        pill?.click();
    });
    await sleep(300);
    const filterCleared = await page.evaluate(() => {
        const sel = document.querySelector("[data-xlc-control='filter.tag']");
        return sel?.value === "";
    });
    check("B15 点击行标签胶囊直选过滤且再次点击反选取消", tagPillClicked && Boolean(filterApplied.val) && filterCleared, `pill=${JSON.stringify(pillDebug)} applied=${JSON.stringify(filterApplied)} cleared=${filterCleared}`);

    // B16: 条目动作菜单中展示重置使用频次选项并成功派发清零
    await open({});
    await sleep(300);
    await page.evaluate(() => {
        window.__xlcResetUsageItems = [];
        const row = document.querySelector("[data-xlc-control='item.row']");
        // 触发右键上下文菜单（长按/右键菜单）
        row?.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: 200, clientY: 200}));
    });
    await sleep(250);
    const resetBtnClicked = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll(".xlc-menu-item"));
        const resetBtn = items.find((el) => (el.textContent ?? "").includes("重置使用频次"));
        if (!resetBtn) return false;
        resetBtn.click();
        return true;
    });
    await sleep(250);
    const resetDispatched = await page.evaluate(() => {
        const calls = window.__xlcResetUsageItems;
        return Array.isArray(calls) && calls.length > 0 && calls.includes("xlc-demo0000001");
    });
    check("B16 动作菜单展示重置使用频次并成功分派清零", resetBtnClicked && resetDispatched, `btn=${resetBtnClicked} dispatched=${resetDispatched}`);

    // B17/B18: 先输入查询再收窄范围（输入会依 R138 回到全库），验证收藏与最近范围回退。
    const verifyScopeFallback = async (scope) => {
        await open({});
        await type("SQL");
        await sleep(300);
        await page.locator(`[data-xlc-control='filter.scope.${scope}']`).click();
        await page.waitForSelector("[data-xlc-control='empty.scope-fallback']", {timeout: 3000});
        const emptyState = await page.evaluate(() => {
            const btn = document.querySelector("[data-xlc-control='empty.scope-fallback']");
            const create = document.querySelector("[data-xlc-control='empty.new-item']");
            return {
                hasBtn: Boolean(btn),
                action: btn?.getAttribute("data-xlc-action"),
                text: btn?.textContent,
                label: btn?.getAttribute("aria-label"),
                primary: btn?.classList.contains("xlc-btn-primary"),
                createGhost: create?.classList.contains("xlc-btn-ghost"),
                rowCount: document.querySelectorAll("[data-xlc-control='item.row']").length,
            };
        });
        await page.locator("[data-xlc-control='empty.scope-fallback']").click();
        await page.waitForFunction(() => {
            const rows = Array.from(document.querySelectorAll("[data-xlc-control='item.row']"));
            return rows.some((row) => row.textContent?.includes("SQL"))
                && !document.querySelector("[data-xlc-control='filter.scope.favorites']")?.classList.contains("xlc-chip--on")
                && !document.querySelector("[data-xlc-control='filter.scope.recent']")?.classList.contains("xlc-chip--on");
        }, undefined, {timeout: 3000});
        const recovered = await page.evaluate(() => ({
            hasSql: Array.from(document.querySelectorAll("[data-xlc-control='item.row']"))
                .some((row) => row.textContent?.includes("SQL")),
            query: document.querySelector("[data-xlc-control='search.input']")?.value,
            queryScope: window.__xlcQueries?.at(-1)?.scope,
            focused: document.activeElement?.matches("[data-xlc-control='search.input']"),
        }));
        return {emptyState, recovered};
    };
    const favoriteFallback = await verifyScopeFallback("favorites");
    check("B17 收藏范围空态提供全库回退和次级新建，回退保留查询、命中并恢复焦点",
        favoriteFallback.emptyState.hasBtn
            && favoriteFallback.emptyState.action === "scope-all"
            && favoriteFallback.emptyState.text?.includes("在全部内容中搜索「SQL」")
            && favoriteFallback.emptyState.label?.includes("SQL")
            && favoriteFallback.emptyState.primary
            && favoriteFallback.emptyState.createGhost
            && favoriteFallback.emptyState.rowCount === 0
            && favoriteFallback.recovered.hasSql
            && favoriteFallback.recovered.query === "SQL"
            && favoriteFallback.recovered.queryScope === "all"
            && favoriteFallback.recovered.focused,
        JSON.stringify(favoriteFallback));
    const recentFallback = await verifyScopeFallback("recent");
    check("B18 最近范围空态提供全库回退并恢复 SQL 命中",
        recentFallback.emptyState.hasBtn && recentFallback.emptyState.rowCount === 0
            && recentFallback.recovered.hasSql && recentFallback.recovered.queryScope === "all",
        JSON.stringify(recentFallback));

    // B19/B20：标签发现视图保存与重开。规则只保存标签/范围元数据，重开自动选中并锁定引用模式。
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        delete document.body.dataset.xlcDiscoverySavedView;
        document.body.dataset.xlcDiscoverySaveViewCalls = "0";
        window.XlcHarness.openDiscovery();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForFunction(() => document.querySelector(".xlc-discovery")?.getAttribute("aria-busy") === "false"
        && document.querySelectorAll(".xlc-discovery-row").length === 2, undefined, {timeout: 3000});
    await page.locator("[data-xlc-control='discovery.filter.tag']").fill("客服");
    await page.locator("[data-xlc-discovery-action='save-view']").click();
    await page.locator("[data-xlc-control='discovery.view.name']").fill("客服话术");
    await page.locator("[data-xlc-control='discovery.view.save']").click();
    await page.waitForFunction(() => Boolean(document.body.dataset.xlcDiscoverySavedView));
    const savedView = await page.evaluate(() => ({
        rule: JSON.parse(document.body.dataset.xlcDiscoverySavedView ?? "null"),
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls),
        formClosed: !document.querySelector(".xlc-save-view-form"),
    }));
    check("B19 标签筛选后通过命名表单保存一次并保留规则元数据",
        savedView.rule?.name === "客服话术" && savedView.rule?.tag === "客服" && savedView.rule?.scope === "document"
            && !Object.hasOwn(savedView.rule ?? {}, "content") && savedView.calls === 1 && savedView.formClosed,
        JSON.stringify(savedView));
    await page.evaluate(() => {
        window.XlcHarness.closeDiscovery();
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDiscovery({initialTag: "客服", autoSelectFiltered: true, referenceOnly: true});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForFunction(() => document.querySelector(".xlc-discovery")?.getAttribute("aria-busy") === "false"
        && document.querySelector("[data-xlc-control='discovery.filter.tag']")?.value === "客服", undefined, {timeout: 3000});
    const reopened = await page.evaluate(() => ({
        tag: document.querySelector("[data-xlc-control='discovery.filter.tag']")?.value,
        selected: Array.from(document.querySelectorAll(".xlc-discovery-footer .xlc-form-hint"), (el) => el.textContent ?? "").find((text) => text.includes("已选")),
        syncLabel: document.querySelector("[data-xlc-discovery-action='add-selected']")?.textContent?.includes("同步到常用库"),
        modeLocked: document.querySelector("[data-xlc-control='discovery.add-mode']")?.disabled === true,
        mode: document.querySelector("[data-xlc-control='discovery.add-mode']")?.value,
        checkedTitles: Array.from(document.querySelectorAll(".xlc-discovery-row"))
            .filter((row) => row.querySelector("[data-xlc-control='discovery.candidate.select']")?.checked)
            .map((row) => row.querySelector(".xlc-discovery-row-title")?.textContent),
    }));
    check("B20 打开保存视图后自动选中并锁定引用模式",
        reopened.tag === "客服" && reopened.selected?.includes("已选 1 项") && reopened.syncLabel && reopened.modeLocked && reopened.mode === "reference"
            && reopened.checkedTitles.length === 1 && reopened.checkedTitles[0] === "客户延期回复",
        JSON.stringify(reopened));

    // R226：使用真实命名 DOM，原生 prompt 的桩不能覆盖 Electron 兼容边界。
    await page.locator("[data-xlc-discovery-action='save-view']").click();
    await page.locator("[data-xlc-control='discovery.view.name']").fill("取消后不应保存");
    const cancelPending = await page.locator("[data-xlc-control='discovery.view.cancel']").evaluate((button) => {
        const form = button.closest("form");
        window.__xlcDeferDialogDestroy = true;
        button.click();
        // Official Dialog destruction includes an animation; a pending Enter/submit
        // during that interval must already be settled as cancelled.
        form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
        window.__xlcDeferDialogDestroy = false;
        return {calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls), stillConnected: form.isConnected};
    });
    await page.waitForFunction(() => !document.querySelector(".xlc-save-view-form"));
    const cancelledView = await page.evaluate(() => ({
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls),
        formClosed: !document.querySelector(".xlc-save-view-form"),
        parentOpen: Boolean(document.querySelector(".xlc-discovery")),
        focusRestored: document.activeElement?.matches("[data-xlc-discovery-action='save-view']"),
    }));
    await page.locator("[data-xlc-discovery-action='save-view']").click();
    await page.locator("[data-xlc-control='discovery.view.name']").fill("   ");
    await page.locator("[data-xlc-control='discovery.view.save']").click();
    const blankView = await page.evaluate(() => ({
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls),
        formOpen: Boolean(document.querySelector(".xlc-save-view-form")),
        error: document.querySelector(".xlc-save-view-error")?.textContent,
        invalid: document.querySelector("[data-xlc-control='discovery.view.name']")?.getAttribute("aria-invalid"),
    }));
    check("B21 取消命名不保存并恢复焦点，空名称阻断保存并显示错误",
        cancelPending.calls === 1 && cancelPending.stillConnected
            && cancelledView.calls === 1 && cancelledView.formClosed && cancelledView.parentOpen && cancelledView.focusRestored
            && blankView.calls === 1 && blankView.formOpen && blankView.error?.includes("未保存") && blankView.invalid === "true",
        JSON.stringify({cancelPending, cancelledView, blankView}));
    if (await page.locator("[data-xlc-control='discovery.view.cancel']").count()) {
        await page.locator("[data-xlc-control='discovery.view.cancel']").click();
    }

    await page.locator("[data-xlc-discovery-action='save-view']").click();
    await page.locator("[data-xlc-control='discovery.view.name']").fill("输入法确认后的视图");
    const imeForm = await page.$(".xlc-save-view-form");
    const composingEnterPrevented = await page.evaluate(() => {
        const input = document.querySelector("[data-xlc-control='discovery.view.name']");
        const legacyEnterPrevented = !input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", keyCode: 229, bubbles: true, cancelable: true}));
        input.dispatchEvent(new CompositionEvent("compositionstart", {bubbles: true}));
        return legacyEnterPrevented
            && !input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", isComposing: true, bubbles: true, cancelable: true}));
    });
    await page.keyboard.press("Enter");
    await imeForm.evaluate((form) => form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    const composingView = await page.evaluate(() => ({
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls),
        formOpen: Boolean(document.querySelector(".xlc-save-view-form")),
    }));
    if (composingView.formOpen) {
        await page.locator("[data-xlc-control='discovery.view.name']").dispatchEvent("compositionend");
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => !document.querySelector(".xlc-save-view-form"));
    }
    // A delayed submit from the detached form must not save a second time.
    await imeForm.evaluate((form) => form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    await imeForm.dispose();
    const keyboardView = await page.evaluate(() => ({
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls),
        rule: JSON.parse(document.body.dataset.xlcDiscoverySavedView ?? "null"),
    }));
    check("B22 输入法确认不误提交，组合结束后 Enter 保存一次且忽略迟到提交",
        composingEnterPrevented && composingView.calls === 1 && composingView.formOpen
            && keyboardView.calls === 2 && keyboardView.rule?.name === "输入法确认后的视图",
        JSON.stringify({composingEnterPrevented, composingView, keyboardView}));

    await page.locator("[data-xlc-discovery-action='save-view']").click();
    await page.locator("[data-xlc-control='discovery.view.name']").fill("关闭父窗后不应保存");
    const orphanForm = await page.$(".xlc-save-view-form");
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    await orphanForm.evaluate((form) => form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    await orphanForm.dispose();
    const closedView = await page.evaluate(() => ({
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls),
        parentClosed: !document.querySelector(".xlc-discovery"),
        namingClosed: !document.querySelector(".xlc-save-view-form"),
        sessionClosed: document.body.dataset.xlcDiscoverySessionClosed === "true",
    }));
    check("B23 关闭发现父窗清理命名窗并阻断残留表单保存",
        closedView.calls === 2 && closedView.parentClosed && closedView.namingClosed && closedView.sessionClosed,
        JSON.stringify(closedView));

    const openDiscoveryForAudit = async (options = {}) => {
        await page.evaluate((options) => {
            document.body.dataset.xlcDiscoveryCloseConflict = "false";
            window.XlcHarness.closeDiscovery(true);
            document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
            const stage = document.getElementById("stage");
            stage.innerHTML = "";
            document.body.dataset.xlcDiscoveryCloseAttempts = "0";
            document.body.dataset.xlcDiscoveryCloseSuccesses = "0";
            document.body.dataset.xlcDiscoveryCloseCallbacks = "{}";
            document.body.dataset.xlcDiscoverySaveViewCalls = "0";
            delete document.body.dataset.xlcDiscoveryNotice;
            delete document.body.dataset.xlcDiscoverySessionClosed;
            delete document.body.dataset.xlcDiscoverySavedView;
            delete document.body.dataset.xlcDiscoveryScopeUsed;
            delete document.body.dataset.xlcDiscoveryTargetNotebook;
            window.XlcHarness.openDiscovery(options);
            stage.appendChild(document.querySelector(".b3-dialog"));
        }, options);
        await page.waitForFunction(() => document.querySelector(".xlc-discovery")?.getAttribute("aria-busy") === "false");
    };
    const openDiscoveryWithBatch = async () => {
        await openDiscoveryForAudit({candidateCount: 3});
        await page.locator("[data-xlc-discovery-key='page-candidate-0001'] [data-xlc-discovery-action='add-one']").click();
        await page.waitForFunction(() => Boolean(document.querySelector("[data-xlc-discovery-action='undo-batch']"))
            && document.querySelector("[data-xlc-discovery-action='close']")?.disabled === false);
    };
    const discoveryCloseState = () => page.evaluate(() => ({
        parentOpen: Boolean(document.querySelector(".xlc-discovery")),
        undoAvailable: Boolean(document.querySelector("[data-xlc-discovery-action='undo-batch']")),
        confirmations: document.querySelectorAll(".xlc-discovery-close-form").length,
        attempts: Number(document.body.dataset.xlcDiscoveryCloseAttempts ?? 0),
        successes: Number(document.body.dataset.xlcDiscoveryCloseSuccesses ?? 0),
        closed: document.body.dataset.xlcDiscoverySessionClosed === "true",
        pendingReceipt: document.querySelector(".xlc-discovery-receipt")?.textContent?.includes("有收录正在写入内容库") === true,
    }));

    await openDiscoveryWithBatch();
    const deferredClose = await page.evaluate(() => [window.XlcHarness.closeDiscovery(), window.XlcHarness.closeDiscovery()]);
    await page.locator(".xlc-discovery-close-form").waitFor({state: "visible"});
    const singleConfirmation = await discoveryCloseState();
    const cancelledCloseForm = await page.$(".xlc-discovery-close-form");
    const cancelledWhileClosing = await page.locator("[data-xlc-control='discovery.close.cancel']").evaluate((button) => {
        const form = button.closest("form");
        window.__xlcDeferDialogDestroy = true;
        try {
            button.click();
            form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
            return {connected: form.isConnected, attempts: Number(document.body.dataset.xlcDiscoveryCloseAttempts ?? 0)};
        } finally { window.__xlcDeferDialogDestroy = false; }
    });
    await page.waitForFunction(() => !document.querySelector(".xlc-discovery-close-form"));
    await cancelledCloseForm.evaluate((form) => form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    await cancelledCloseForm.dispose();
    const cancelledClose = await discoveryCloseState();
    let escapedClose = null;
    if (cancelledClose.parentOpen) {
        await page.evaluate(() => window.XlcHarness.closeDiscovery());
        await page.locator("[data-xlc-control='discovery.close.cancel']").focus();
        await page.keyboard.press("Escape");
        escapedClose = await discoveryCloseState();
    }
    check("B24 批次关闭同步返回false且只开一窗，取消/Esc和迟到提交保留会话与撤销",
        deferredClose.every((result) => result === false) && singleConfirmation.confirmations === 1
            && cancelledWhileClosing.connected && cancelledWhileClosing.attempts === 0
            && cancelledClose.parentOpen && cancelledClose.undoAvailable && cancelledClose.attempts === 0 && !cancelledClose.closed
            && escapedClose?.parentOpen && escapedClose.undoAvailable && escapedClose.confirmations === 0 && escapedClose.attempts === 0,
        JSON.stringify({deferredClose, singleConfirmation, cancelledWhileClosing, cancelledClose, escapedClose}));

    await openDiscoveryWithBatch();
    await page.evaluate(() => {
        window.XlcHarness.closeDiscovery();
        document.body.dataset.xlcDiscoveryCloseConflict = "true";
    });
    await page.locator("[data-xlc-control='discovery.close.confirm']").click();
    const pendingClose = await discoveryCloseState();
    await openDiscoveryWithBatch();
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    const busyClose = await page.evaluate(() => {
        // An action can begin after the confirmation is shown. Drive the real
        // asynchronous add handler and submit within the same event turn.
        document.querySelector("[data-xlc-discovery-key='page-candidate-0002'] [data-xlc-discovery-action='add-one']").click();
        const wasBusy = document.querySelector("[data-xlc-discovery-action='close']")?.disabled === true;
        document.querySelector("[data-xlc-control='discovery.close.confirm']").click();
        return {wasBusy, parentOpen: Boolean(document.querySelector(".xlc-discovery")), attempts: Number(document.body.dataset.xlcDiscoveryCloseAttempts ?? 0)};
    });
    await page.waitForFunction(() => !document.querySelector(".xlc-discovery")
        || document.querySelector("[data-xlc-discovery-action='close']")?.disabled === false);
    const afterBusyClose = await discoveryCloseState();
    check("B25 确认关闭重查service写入冲突和actionBusy并保留父窗与撤销",
        pendingClose.parentOpen && pendingClose.undoAvailable && pendingClose.pendingReceipt
            && pendingClose.attempts === 1 && pendingClose.successes === 0 && !pendingClose.closed
            && busyClose.wasBusy && busyClose.parentOpen && busyClose.attempts === 0 && afterBusyClose.parentOpen && afterBusyClose.undoAvailable,
        JSON.stringify({pendingClose, busyClose, afterBusyClose}));

    await openDiscoveryWithBatch();
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    const acceptedCloseForm = await page.$(".xlc-discovery-close-form");
    await page.locator("[data-xlc-control='discovery.close.confirm']").click();
    await acceptedCloseForm.evaluate((form) => {
        form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
        form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    });
    await acceptedCloseForm.dispose();
    const acceptedClose = await discoveryCloseState();
    check("B26 明确确认关闭父窗并只成功结束一次会话，重复提交无效",
        !acceptedClose.parentOpen && acceptedClose.confirmations === 0 && acceptedClose.attempts === 1
            && acceptedClose.successes === 1 && acceptedClose.closed,
        JSON.stringify(acceptedClose));

    await openDiscoveryWithBatch();
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    const hostClosedForm = await page.$(".xlc-discovery-close-form");
    await page.evaluate(() => document.querySelector(".xlc-discovery").closest(".b3-dialog").__xlcHarnessDestroyDialog());
    await hostClosedForm.evaluate((form) => form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    await hostClosedForm.dispose();
    const hostClosed = await discoveryCloseState();
    check("B27 宿主销毁父窗清理确认窗并忽略残留提交",
        !hostClosed.parentOpen && hostClosed.confirmations === 0 && hostClosed.closed && hostClosed.attempts === 1 && hostClosed.successes === 1,
        JSON.stringify(hostClosed));

    await openDiscoveryForAudit();
    await page.locator(".xlc-discovery-scope-select").selectOption("notebook");
    await page.waitForFunction(() => document.querySelector(".xlc-discovery")?.getAttribute("aria-busy") === "false");
    await page.locator("[data-xlc-control='discovery.filter.tag']").fill("客服");
    await page.locator("[data-xlc-discovery-action='save-view']").click();
    await page.locator("[data-xlc-control='discovery.view.name']").fill("客服笔记本视图");
    await page.locator("[data-xlc-control='discovery.view.save']").click();
    const notebookRule = await page.evaluate(() => JSON.parse(document.body.dataset.xlcDiscoverySavedView ?? "null"));
    await openDiscoveryForAudit({initialNotebookId: notebookRule?.targetNotebookId, initialTag: "客服", autoSelectFiltered: true, referenceOnly: true});
    const notebookReopened = await page.evaluate(() => ({
        dispatch: document.body.dataset.xlcDiscoveryScopeUsed,
        target: document.body.dataset.xlcDiscoveryTargetNotebook,
        scope: document.querySelector(".xlc-discovery-scope-select")?.value,
        checked: document.querySelectorAll("[data-xlc-control='discovery.candidate.select']:checked").length,
    }));
    check("B28 笔记本视图冻结笔记本ID且重开严格调用discoverNotebook",
        notebookRule?.scope === "notebook" && notebookRule?.targetNotebookId === "20240101120000-notebk1" && notebookRule?.targetDocId === ""
            && notebookReopened.dispatch === "selected-notebook" && notebookReopened.target === notebookRule.targetNotebookId
            && notebookReopened.scope === "notebook" && notebookReopened.checked === 1,
        JSON.stringify({notebookRule, notebookReopened}));

    const closeCallbacks = () => page.evaluate(() => JSON.parse(document.body.dataset.xlcDiscoveryCloseCallbacks ?? "{}"));
    const submitCloseForm = (form) => form.evaluate((element) => element.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    await openDiscoveryForAudit();
    const immediateReturns = await page.evaluate(() => [window.XlcHarness.requestCloseDiscovery("immediate"), window.XlcHarness.requestCloseDiscovery("already-closed")]);
    const immediateCallbacks = await closeCallbacks();
    await openDiscoveryWithBatch();
    const continuationReturns = await page.evaluate(() => [window.XlcHarness.requestCloseDiscovery("first"), window.XlcHarness.requestCloseDiscovery("duplicate")]);
    const continuationForm = await page.$(".xlc-discovery-close-form");
    const beforeConfirmationCallbacks = await closeCallbacks();
    await page.evaluate(() => { document.body.dataset.xlcDiscoveryCloseConflict = "true"; });
    await submitCloseForm(continuationForm);
    const rejectedCallbacks = await closeCallbacks();
    const rejectedContinuation = await discoveryCloseState();
    if (rejectedContinuation.parentOpen) {
        await page.evaluate(() => { document.body.dataset.xlcDiscoveryCloseConflict = "false"; });
        await submitCloseForm(continuationForm);
    }
    await submitCloseForm(continuationForm);
    await continuationForm.dispose();
    const confirmedCallbacks = await closeCallbacks();
    await openDiscoveryWithBatch();
    await page.evaluate(() => window.XlcHarness.requestCloseDiscovery("cancelled"));
    const cancelledContinuationForm = await page.$(".xlc-discovery-close-form");
    await page.locator("[data-xlc-control='discovery.close.cancel']").evaluate((button) => {
        window.__xlcDeferDialogDestroy = true;
        try {
            button.click();
            button.closest("form").dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
        } finally { window.__xlcDeferDialogDestroy = false; }
    });
    await page.waitForFunction(() => !document.querySelector(".xlc-discovery-close-form"));
    await submitCloseForm(cancelledContinuationForm);
    await cancelledContinuationForm.dispose();
    const cancelledCallbacks = await closeCallbacks();
    const cancelledContinuation = await discoveryCloseState();
    await openDiscoveryWithBatch();
    await page.evaluate(() => window.XlcHarness.requestCloseDiscovery("abandoned"));
    const forcedContinuationForm = await page.$(".xlc-discovery-close-form");
    const forcedReturn = await page.evaluate(() => window.XlcHarness.requestCloseDiscovery("force", true));
    await submitCloseForm(forcedContinuationForm);
    await forcedContinuationForm.dispose();
    const forcedCallbacks = await closeCallbacks();
    const forcedContinuation = await discoveryCloseState();
    check("B29 关闭continuation仅成功后一次执行，取消/迟到/卸载丢弃旧回调",
        immediateReturns.every(Boolean) && immediateCallbacks.immediate === 1 && immediateCallbacks["already-closed"] === 1
            && continuationReturns.every((result) => result === false) && Object.keys(beforeConfirmationCallbacks).length === 0
            && Object.keys(rejectedCallbacks).length === 0 && rejectedContinuation.parentOpen
            && confirmedCallbacks.first === 1 && !confirmedCallbacks.duplicate
            && Object.keys(cancelledCallbacks).length === 0 && cancelledContinuation.parentOpen && cancelledContinuation.undoAvailable
            && forcedReturn === true && forcedCallbacks.force === 1 && !forcedCallbacks.abandoned && !forcedContinuation.parentOpen,
        JSON.stringify({immediateReturns, immediateCallbacks, continuationReturns, beforeConfirmationCallbacks, rejectedCallbacks, rejectedContinuation, confirmedCallbacks, cancelledCallbacks, cancelledContinuation, forcedReturn, forcedCallbacks, forcedContinuation}));

    await openDiscoveryForAudit({initialTag: "客服", saveViewRejected: true});
    await page.locator("[data-xlc-discovery-action='save-view']").click();
    await page.locator("[data-xlc-control='discovery.view.name']").fill("保存失败后重试");
    const rejectedSaveForm = await page.$(".xlc-save-view-form");
    await page.locator("[data-xlc-control='discovery.view.save']").click();
    const rejectedSave = await page.evaluate(() => ({
        formOpen: Boolean(document.querySelector(".xlc-save-view-form")),
        error: document.querySelector(".xlc-save-view-error")?.textContent,
        saved: document.body.dataset.xlcDiscoverySavedView,
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls ?? 0),
        saysSaved: document.querySelector(".xlc-discovery-receipt")?.textContent?.includes("已保存") === true,
    }));
    await page.evaluate(() => { document.body.dataset.xlcDiscoverySaveViewRejected = "false"; });
    if (rejectedSave.formOpen) await page.locator("[data-xlc-control='discovery.view.save']").click();
    await rejectedSaveForm.evaluate((form) => form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    await rejectedSaveForm.dispose();
    const retriedSave = await page.evaluate(() => ({
        formOpen: Boolean(document.querySelector(".xlc-save-view-form")),
        saved: JSON.parse(document.body.dataset.xlcDiscoverySavedView ?? "null"),
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls ?? 0),
    }));
    await openDiscoveryForAudit({initialTag: "客服", unknownSourceNotebook: true});
    await page.locator(".xlc-discovery-scope-select").selectOption("notebook");
    await page.waitForFunction(() => document.querySelector(".xlc-discovery")?.getAttribute("aria-busy") === "false");
    await page.locator("[data-xlc-discovery-action='save-view']").click();
    const unknownNotebookSave = await page.evaluate(() => ({
        formOpen: Boolean(document.querySelector(".xlc-save-view-form")),
        saved: document.body.dataset.xlcDiscoverySavedView,
        calls: Number(document.body.dataset.xlcDiscoverySaveViewCalls ?? 0),
        receipt: document.querySelector(".xlc-discovery-receipt")?.textContent,
    }));
    check("B30 保存回调拒绝保留命名表单且可重试，未知笔记本真源阻断保存",
        rejectedSave.formOpen && Boolean(rejectedSave.error) && !rejectedSave.saved && rejectedSave.calls === 1 && !rejectedSave.saysSaved
            && !retriedSave.formOpen && retriedSave.saved?.name === "保存失败后重试" && retriedSave.calls === 2
            && !unknownNotebookSave.formOpen && !unknownNotebookSave.saved && unknownNotebookSave.calls === 0 && Boolean(unknownNotebookSave.receipt),
        JSON.stringify({rejectedSave, retriedSave, unknownNotebookSave}));
    await page.evaluate(() => window.XlcHarness.closeDiscovery());

    // ── C. Esc 关闭弹窗 ──
    await open({});
    await sleep(200);
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
        const sel = document.querySelector("[data-xlc-control='filter.type']");
        sel.value = "code";
        sel.dispatchEvent(new Event("change", {bubbles: true}));
    });
    await sleep(400);
    const dState = await page.evaluate(() => ({
        calls: window.__xlcSearchCalls ?? 0,
        set: window.__xlcSetFilters ?? [],
        value: document.querySelector("[data-xlc-control='filter.type']")?.value ?? "",
    }));
    check("D1 类型改选落 setFilters 并重查", dState.calls > callsBefore && dState.set.some((f) => f.type === "code") && dState.value === "code", JSON.stringify(dState));
    await page.evaluate(() => {
        const sel = document.querySelector("[data-xlc-control='filter.type']");
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
    await page.evaluate(() => document.querySelector("[data-xlc-control='sort.open']")?.click());
    await sleep(200);
    const sortMenu = await page.evaluate(() => {
        const menu = document.querySelector(".xlc-menu");
        if (!menu) return {open: false, items: []};
        return {open: true, items: Array.from(menu.querySelectorAll("button, [role=menuitem]")).map((b) => (b.textContent ?? "").trim())};
    });
    check("E1 排序菜单含四档", sortMenu.open && ["默认排序（收藏优先）", "最近使用在前", "使用频次", "按标题排序"].every((t) => sortMenu.items.some((i) => i.includes(t))), JSON.stringify(sortMenu.items));
    await page.evaluate(() => {
        const item = Array.from(document.querySelectorAll(".xlc-menu button, .xlc-menu [role=menuitem]")).find((b) => (b.textContent ?? "").includes("使用频次"));
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

    // ── H2. 当前落点与无编辑器降级：面板必须说明实际主动作 ──
    await open({activeEditor: false, query: "延期"});
    await sleep(300);
    const noEditor = await page.evaluate(() => {
        const root = document.querySelector(".xlc-dialog");
        const insert = root?.querySelector('[data-xlc-pane-act="insert"]');
        const target = root?.querySelector(".xlc-target-banner");
        return {
            banner: target?.textContent ?? "",
            action: insert?.textContent ?? "",
            hint: insert?.getAttribute("title") ?? "",
            enabled: Boolean(insert && !insert.disabled),
        };
    });
    check("H2 无活动编辑器时显示复制降级语义", noEditor.banner.includes("没有活动编辑器") && noEditor.action.includes("复制") && noEditor.hint.includes("复制") && noEditor.enabled, JSON.stringify(noEditor));

    await open({activeEditor: true, insertTargetAvailable: false, query: "延期"});
    await sleep(300);
    const staleTarget = await page.evaluate(() => {
        const root = document.querySelector(".xlc-dialog");
        const insert = root?.querySelector('[data-xlc-pane-act="insert"]');
        const target = root?.querySelector(".xlc-target-banner");
        return {banner: target?.textContent ?? "", action: insert?.textContent ?? "", hint: insert?.getAttribute("title") ?? "", enabled: Boolean(insert && !insert.disabled)};
    });
    check("H2b 插入位置失效时不改投其他编辑器", staleTarget.banner.includes("原插入位置不可用") && staleTarget.action.includes("复制") && staleTarget.hint.includes("原插入位置已失效") && staleTarget.enabled, JSON.stringify(staleTarget));

    // 执行期间锁住主动作，避免双击/重复 Enter 产生两次写入。
    await open({actionDelayMs: 300, query: "SLA"});
    await sleep(300);
    const busy = await page.evaluate(() => {
        const btn = document.querySelector('[data-xlc-pane-act="insert"]');
        btn?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return {disabled: Boolean(btn?.disabled), busy: btn?.getAttribute("aria-busy")};
    });
    check("H3 执行期间禁用主动作并标记忙态", busy.disabled && busy.busy === "true", JSON.stringify(busy));
    await sleep(400);
    const readyAfterBusy = await page.evaluate(() => {
        const btn = document.querySelector('[data-xlc-pane-act="insert"]');
        return {disabled: Boolean(btn?.disabled), busy: btn?.getAttribute("aria-busy")};
    });
    check("H4 主动作完成后恢复可用", !readyAfterBusy.disabled && readyAfterBusy.busy === "false", JSON.stringify(readyAfterBusy));

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
    const actionsBeforeMobileSelection = await page.evaluate(() => (window.__xlcActions ?? []).length);
    const mobile = await page.evaluate(() => {
        const sheet = document.querySelector(".xlc-sheet");
        const btn = document.querySelector(".xlc-mobile-insert");
        const row = document.querySelector(".xlc-list .xlc-row[data-xlc-index='1']");
        row?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return {
            sheet: Boolean(sheet),
            copyFallback: (btn?.textContent ?? "").includes("复制"),
            selectedRow: row?.getAttribute("aria-selected") === "true" && row.classList.contains("xlc-row--active"),
            buttonAvailable: Boolean(btn && !btn.disabled),
        };
    });
    const actionsAfterMobileSelection = await page.evaluate(() => (window.__xlcActions ?? []).length);
    check("J1 移动端点按只选择条目，不提前执行复制", mobile.sheet && mobile.selectedRow && mobile.buttonAvailable && mobile.copyFallback && actionsAfterMobileSelection === actionsBeforeMobileSelection, JSON.stringify(mobile));
    await page.locator("[data-xlc-control='preview.mobile-primary']").click();
    await sleep(100);
    const mobileSelectedAction = await page.evaluate(() => window.__xlcActions?.at(-1));
    check("J2 移动端底栏主按钮执行当前选中条目", mobileSelectedAction?.id === "xlc-demo0000003" && mobileSelectedAction.mode === "copy", JSON.stringify(mobileSelectedAction));

    await open({mobile: true, empty: true, query: "不存在的条目"});
    await sleep(200);
    const mobileEmpty = await page.evaluate(() => {
        const btn = document.querySelector(".xlc-mobile-insert");
        return {buttonExists: Boolean(btn), disabledWithoutResults: Boolean(btn?.disabled)};
    });
    check("J3 移动端无搜索结果时禁用插入选中", mobileEmpty.buttonExists && mobileEmpty.disabledWithoutResults, JSON.stringify(mobileEmpty));

    // ── K. 搜索主面板控件清点：稳定 control id → 可观察动作结果 ──
    await open({query: "延期"});
    await sleep(350);
    await page.locator("[data-xlc-control='search.clear']").click();
    await sleep(350);
    const clearResult = await page.evaluate(() => ({
        query: document.querySelector("[data-xlc-control='search.input']")?.value ?? "",
        focused: document.activeElement?.matches("[data-xlc-control='search.input']") ?? false,
        results: document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length,
        hidden: !document.querySelector("[data-xlc-control='search.clear']")?.classList.contains("xlc-search-clear--on"),
    }));
    check("K1 清空按钮清除查询、恢复结果并将焦点放回搜索框", clearResult.query === "" && clearResult.focused && clearResult.results > 0 && clearResult.hidden, JSON.stringify(clearResult));

    await open({query: "延期"});
    await sleep(250);
    await page.locator("[data-xlc-control='search.new']").click();
    const newItemResult = await page.evaluate(() => ({
        calls: Number(document.body.dataset.xlcNewItemCalls ?? 0),
        captureOpened: Boolean(document.querySelector(".xlc-capture")),
    }));
    check("K2 常驻新建按钮打开新建表单", newItemResult.calls === 1 && newItemResult.captureOpened, JSON.stringify(newItemResult));

    await open({query: "延期"});
    await sleep(300);
    await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]"))
            .find((el) => (el.textContent ?? "").includes("延期简短版"));
        row?.querySelector("[data-xlc-control='item.favorite']")?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
    await sleep(350);
    const favoriteResult = await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]"))
            .find((el) => (el.textContent ?? "").includes("延期简短版"));
        const star = row?.querySelector("[data-xlc-control='item.favorite']");
        return {
            id: window.__xlcFavoriteToggles?.at(-1),
            icon: star?.textContent,
            label: star?.getAttribute("aria-label"),
        };
    });
    check("K3 条目收藏按钮切换状态并更新图标和可访问名称", favoriteResult.id === "xlc-demo0000002" && favoriteResult.icon === "★" && favoriteResult.label === "取消收藏", JSON.stringify(favoriteResult));

    await open({query: "项目延期"});
    await sleep(300);
    await page.locator("[data-xlc-control='preview.copy']").click();
    await sleep(100);
    const copyAction = await page.evaluate(() => (window.__xlcActions ?? []).at(-1));
    check("K4 详情复制按钮调用当前条目的复制动作", copyAction?.id === "xlc-demo0000001" && copyAction.mode === "copy", JSON.stringify(copyAction));

    await open({query: "项目延期"});
    await sleep(300);
    await page.locator("[data-xlc-control='preview.source']").click();
    await sleep(100);
    const sourceId = await page.evaluate(() => window.__xlcOpenedSources?.at(-1));
    check("K5 打开来源按钮传递当前条目 ID", sourceId === "xlc-demo0000001", String(sourceId));

    await open({query: "项目延期"});
    await sleep(300);
    await page.locator("[data-xlc-control='preview.edit']").click();
    await sleep(100);
    const editId = await page.evaluate(() => window.__xlcEditedItems?.at(-1));
    check("K6 编辑按钮传递当前条目 ID", editId === "xlc-demo0000001", String(editId));

    await open({query: "延期"});
    await page.waitForFunction(() => {
        const select = document.querySelector("[data-xlc-control='filter.tag']");
        return select instanceof HTMLSelectElement && !select.disabled;
    });
    await page.locator("[data-xlc-control='filter.tag']").selectOption("客户沟通");
    await sleep(250);
    const tagFilter = await page.evaluate(() => ({
        value: document.querySelector("[data-xlc-control='filter.tag']")?.value,
        saved: window.__xlcSetFilters?.at(-1)?.tag,
        query: window.__xlcQueries?.at(-1)?.tag,
    }));
    check("K7 标签筛选保存选项并按标签重查", tagFilter.value === "客户沟通" && tagFilter.saved === "客户沟通" && tagFilter.query === "客户沟通", JSON.stringify(tagFilter));

    await open({query: "延期"});
    await page.waitForFunction(() => {
        const select = document.querySelector("[data-xlc-control='filter.category']");
        return select instanceof HTMLSelectElement && !select.disabled;
    });
    await page.locator("[data-xlc-control='filter.category']").selectOption("客服");
    await sleep(250);
    const categoryFilter = await page.evaluate(() => ({
        value: document.querySelector("[data-xlc-control='filter.category']")?.value,
        saved: window.__xlcSetFilters?.at(-1)?.category,
        query: window.__xlcQueries?.at(-1)?.category,
    }));
    check("K8 分类筛选保存选项并按分类重查", categoryFilter.value === "客服" && categoryFilter.saved === "客服" && categoryFilter.query === "客服", JSON.stringify(categoryFilter));

    await open({query: "延期"});
    await sleep(250);
    await page.locator("[data-xlc-control='filter.scope.favorites']").click();
    await sleep(250);
    const favoritesScope = await page.evaluate(() => ({
        selected: document.querySelector("[data-xlc-control='filter.scope.favorites']")?.classList.contains("xlc-chip--on"),
        scope: window.__xlcQueries?.at(-1)?.scope,
    }));
    check("K9 收藏范围切换后更新状态并按收藏范围搜索", favoritesScope.selected && favoritesScope.scope === "favorites", JSON.stringify(favoritesScope));

    await page.locator("[data-xlc-control='filter.scope.recent']").click();
    await sleep(250);
    const recentScope = await page.evaluate(() => ({
        selected: document.querySelector("[data-xlc-control='filter.scope.recent']")?.classList.contains("xlc-chip--on"),
        favoritesOff: !document.querySelector("[data-xlc-control='filter.scope.favorites']")?.classList.contains("xlc-chip--on"),
        scope: window.__xlcQueries?.at(-1)?.scope,
    }));
    check("K10 最近范围替换收藏范围并更新查询", recentScope.selected && recentScope.favoritesOff && recentScope.scope === "recent", JSON.stringify(recentScope));

    await open({});
    const helpReachable = await page.evaluate(() => {
        const button = document.querySelector("[data-xlc-control='footer.help']");
        const rect = button?.getBoundingClientRect();
        return Boolean(button && !button.disabled && rect && rect.top >= 0 && rect.bottom <= innerHeight);
    });
    check("K11 使用帮助入口处于当前视口且可用", helpReachable);
    if (helpReachable) await page.locator("[data-xlc-control='footer.help']").click();
    const guideOpened = await page.locator(".xlc-guide").isVisible();
    check("K12 使用帮助入口打开帮助内容", helpReachable && guideOpened);

    await open({});
    const settingsReachable = await page.evaluate(() => {
        const button = document.querySelector("[data-xlc-control='footer.settings']");
        const rect = button?.getBoundingClientRect();
        return Boolean(button && !button.disabled && rect && rect.top >= 0 && rect.bottom <= innerHeight);
    });
    check("K13 设置入口处于当前视口且可用", settingsReachable);
    if (settingsReachable) await page.locator("[data-xlc-control='footer.settings']").click();
    const settingsOpened = await page.locator(".xlc-settings").isVisible();
    check("K14 设置入口离开搜索面板并打开设置", settingsReachable && settingsOpened && !(await page.locator(".xlc-dialog").count()));

    await open({mobile: true, query: "项目延期"});
    await sleep(300);
    await page.locator("[data-xlc-control='preview.mobile-primary']").click();
    await sleep(150);
    const mobilePrimary = await page.evaluate(() => window.__xlcActions?.at(-1));
    check("K15 移动端底栏主操作交给服务层处理插入并由宿主能力降级", mobilePrimary?.id === "xlc-demo0000001" && mobilePrimary.mode === "copy", JSON.stringify(mobilePrimary));

    await open({mobile: true, query: "延期"});
    await page.locator("[data-xlc-control='search.new']").click();
    const mobileNew = await page.evaluate(() => ({
        calls: Number(document.body.dataset.xlcNewItemCalls ?? 0),
        captureOpened: Boolean(document.querySelector(".xlc-capture")),
    }));
    check("K16 移动端新建入口打开捕获表单", mobileNew.calls >= 1 && mobileNew.captureOpened, JSON.stringify(mobileNew));

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
