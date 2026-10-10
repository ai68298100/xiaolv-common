// 生产 UI 效果渲染：真实 dist/index.css + 生产 dialog.ts 装配的 DOM（假数据驱动）→ 截图。
// 这是「生产达到原型质感」的证据链：DOM 与样式均来自构建产物，非原型 HTML。
const path = require("node:path");
const fs = require("node:fs");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "design");
const STUB = path.join(__dirname, "harness", "stub-dom.cjs");
const enI18n = require(path.join(ROOT, "src", "i18n", "en.json"));

let chromium;
try {
    ({chromium} = require(path.join(ROOT, "..", "小驴雷切", "node_modules", "@playwright", "test")));
} catch {
    ({chromium} = require("playwright"));
}

// 1) 打包 harness 入口（生产源码 + siyuan DOM 桩）
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

// 2) 组装 harness 页面：b3 变量（亮/暗）+ 生产 index.css + bundle
const prodCss = fs.readFileSync(path.join(ROOT, "dist", "index.css"), "utf8");
const b3Vars = `
.b3-scope { font-family: "PingFang SC", "Microsoft YaHei", -apple-system, "Segoe UI", sans-serif; }
.b3-dialog textarea.b3-text-field { min-height: 110px; resize: vertical; font-family: inherit; }
.b3-scope.light {
  --b3-theme-primary: #3575f0; --b3-theme-primary-light: #7f9ff5; --b3-theme-primary-lighter: #c6d5fa;
  --b3-theme-on-primary: #fff; --b3-theme-background: #fff; --b3-theme-surface: #f7f8fa;
  --b3-theme-on-background: #1f2329; --b3-theme-on-surface: #7d8085; --b3-border-color: #e5e7eb;
  --b3-list-hover: #eef1f6; --b3-menu-background: #fff;
  --b3-dialog-shadow: 0 8px 32px rgba(31,35,41,.14), 0 2px 8px rgba(31,35,41,.08);
}
.b3-scope.dark {
  --b3-theme-primary: #5a8af2; --b3-theme-primary-light: #3d4a66; --b3-theme-primary-lighter: #2c3a55;
  --b3-theme-on-primary: #fff; --b3-theme-background: #1e1e1f; --b3-theme-surface: #26262a;
  --b3-theme-on-background: #dcdcdc; --b3-theme-on-surface: #8a8a93; --b3-border-color: #36363a;
  --b3-list-hover: #2c2c31; --b3-menu-background: #26262a;
  --b3-dialog-shadow: 0 8px 32px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.35);
}
body { margin: 0; background: #eceef1; }
/* 宿主 chrome 模拟（与思源 Dialog 容器一致）：白底/圆角/描边/双层阴影/内边距 */
.b3-dialog__container {
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 12px;
  box-shadow: var(--b3-dialog-shadow);
  overflow: hidden;
}
.b3-dialog__header { padding: 14px 16px 0; font-size: 15px; font-weight: 600; }
.b3-dialog__content { padding: 16px 20px 20px; }
.b3-button { border: 1px solid var(--b3-border-color); background: var(--b3-theme-background); color: var(--b3-theme-on-background); border-radius: 8px; padding: 4px 12px; font-size: 12.5px; cursor: pointer; }
.b3-button--small { padding: 2px 8px; }
.b3-button--text { border-color: transparent; background: transparent; }
.b3-select { border: 1px solid var(--b3-border-color); background: var(--b3-theme-surface); color: var(--b3-theme-on-background); }
.b3-text-field { border: 1px solid var(--b3-border-color); background: var(--b3-theme-surface); color: var(--b3-theme-on-background); outline: none; font-family: inherit; padding: 4px 8px; border-radius: 4px; box-sizing: border-box; }
.b3-dialog .xlc-search .b3-text-field { border: none; background: transparent; padding: 0; }
`;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>${b3Vars}</style><style>${prodCss}</style></head>
<body><div class="b3-scope light" id="stage"></div>
<script src="${path.basename(bundlePath)}"></script></body></html>`;
fs.writeFileSync(path.join(OUT, "harness.html"), html);

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 1280, height: 720}, deviceScaleFactor: 2});
    await page.goto("file:///" + path.join(OUT, "harness.html").replace(/\\/g, "/"));
    await page.waitForFunction(() => Boolean(window.XlcHarness));

    const shoot = async (name, opts, assertions) => {
        await page.evaluate((o) => {
            const stage = document.getElementById("stage");
            stage.className = "b3-scope " + o.theme;
            // 清掉上一轮的 dialog（stub 自挂载在 body）
            document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
            stage.innerHTML = "";
            window.XlcHarness.openDialog(o);
            const dialogRoot = document.querySelector(".b3-dialog");
            if (dialogRoot) stage.appendChild(dialogRoot);
            const root = document.querySelector(".xlc-dialog");
            if (root) {
                root.style.height = "560px";
                root.style.position = "relative";
            }
            const container = document.querySelector(".b3-dialog__container");
            if (container) {
                container.style.margin = "0 auto";
                container.style.maxWidth = "760px";
            }
        }, opts);
        await page.waitForTimeout(800);
        if (assertions) {
            const results = await page.evaluate(assertions);
            const failed = Object.entries(results).filter(([, ok]) => !ok);
            if (failed.length > 0) {
                throw new Error(`UI smoke FAILED on ${name}: ${failed.map(([k]) => k).join(", ")}`);
            }
            console.log(`  smoke ✓ ${name}: ${Object.keys(results).length} assertions`);
        }
        await page.screenshot({path: path.join(OUT, `production-${name}.png`)});
    };

    await shoot("desktop-light", {theme: "light", aiEnabled: true, missing: true}, () => ({
        rows: document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length >= 3,
        badges: document.querySelectorAll(".xlc-badge").length >= 3,
        panePreview: (document.querySelector(".xlc-pane-body")?.textContent ?? "").includes("会员系统"),
        sourceWarn: (document.querySelector(".xlc-pane-warn")?.textContent ?? "").includes("来源"),
        aiBanner: (document.querySelector(".xlc-ai-banner")?.textContent ?? "").includes("3"),
        ordinals: document.querySelectorAll(".xlc-row-ordinal").length >= 3,
        // R67：分组头（置顶/全部）+ 行变量徽标 + 预览变量提示行
        groupHeads: document.querySelectorAll(".xlc-group-head").length >= 2,
        pinnedGroup: (document.querySelector(".xlc-group-head")?.textContent ?? "").includes("置顶"),
        varBadge: (document.querySelector(".xlc-badge--var")?.textContent ?? "").includes("变量"),
        // R68：行 meta 使用次数（F3 展示）
        rowUseCount: ((document.querySelectorAll(".xlc-row-meta")[0] ?? {textContent: ""}).textContent ?? "").includes("32 次"),
        // R84：搜索清空按钮（有输入时出现，点击清空）
        searchClear: (() => {
            const btn = document.querySelector(".xlc-search-clear");
            return !!btn && btn.classList.contains("xlc-search-clear--on");
        })(),
        // R69：kbd 补 ⌥1-9；标题内联 ★ 去重；提示行含光标落点
        kbdAltChips: Array.from(document.querySelectorAll(".xlc-kbd")).some((el) => (el.textContent ?? "").includes("1-9")),
        favmarkGone: document.querySelectorAll(".xlc-row-favmark").length === 0,
        paneVars: (() => {
            const el = document.querySelector(".xlc-pane-vars");
            const text = el?.textContent ?? "";
            return el !== null && el.offsetParent !== null && text.includes("变量") && text.includes("客户名称");
        })(),
        paneVarsCursor: (document.querySelector(".xlc-pane-vars")?.textContent ?? "").includes("光标落点"),
        // R169：桌面顶栏常驻新增入口 + 底栏使用说明入口
        topNewItem: (() => {
            const btn = document.querySelector(".xlc-top-new");
            return btn !== null && (btn.textContent ?? "").includes("新建");
        })(),
        usageGuide: (document.querySelector(".xlc-footer-guide")?.textContent ?? "").includes("使用说明"),
    }));
    await shoot("desktop-dark", {theme: "dark", aiEnabled: true, missing: false}, () => ({
        rows: document.querySelectorAll(".xlc-row[data-xlc-index]").length >= 3,
        pane: !!document.querySelector(".xlc-pane"),
    }));
    await shoot("provider-light", {theme: "light", aiEnabled: true, missing: false, query: "工作台"}, () => ({
        providerHeader: (document.querySelector(".xlc-provider-header")?.textContent ?? "").includes("提供方内容"),
        providerRows: document.querySelectorAll(".xlc-row--provider").length >= 1,
        footerGear: (document.querySelector(".xlc-footer-gear")?.textContent ?? "").includes("设置"),
        // 无本地命中时不保留上一条目的使用徽标或预览。
        paneUsageHidden: (() => {
            const el = document.querySelector(".xlc-pane-usage");
            const body = document.querySelector(".xlc-pane-body");
            return el !== null && el.offsetParent === null && body?.textContent === "当前没有可预览的条目";
        })(),
    }));
    // 窄容器（<620px）：单列降级（预览隐藏）
    await page.setViewportSize({width: 420, height: 720});
    await shoot("narrow-light", {theme: "light", aiEnabled: true, missing: false}, () => ({
        singleColumn: (() => {
            const pane = document.querySelector(".xlc-pane");
            return !pane || getComputedStyle(pane).display === "none";
        })(),
        rows: document.querySelectorAll(".xlc-row[data-xlc-index]").length >= 1,
        // R69：窄容器隐藏 kbd 行（避免换行挤压）
        kbdHidden: (() => {
            const el = document.querySelector(".xlc-kbdrow");
            return !el || el.offsetParent === null;
        })(),
    }));
    await page.setViewportSize({width: 1280, height: 720});
    // 设置对话框（生产 settings-dialog DOM）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSettings();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "620px";
        }
    });
    await page.waitForTimeout(400);
    const settingsAssertions = await page.evaluate(() => ({
        sections: ["AI 助手", "搜索", "数据与模板", "提供方内容"].every((s) => document.body.textContent.includes(s)),
        toggles: document.querySelectorAll(".xlc-setting-row input[type=checkbox]").length >= 3,
        providerRow: (document.body.textContent || "").includes("小驴打卡"),
        dataButtons: (document.body.textContent || "").includes("重建索引") && (document.body.textContent || "").includes("导出"),
        formHost: (() => {
            const host = document.querySelector(".b3-dialog__container.xlc-form-host");
            const body = host?.querySelector(".b3-dialog__body, .b3-dialog__content");
            return !!host && !!body && parseFloat(getComputedStyle(body).paddingLeft) >= 16;
        })(),
        // R70：开关说明拆为标题+副文本
        switchSubs: (document.body.textContent || "").includes("插件不保存密钥") && (document.body.textContent || "").includes("全拼/首字母本地匹配"),
        // R73：自定义变换编辑器（列表行输入值 + 添加按钮；input value 不出现在 textContent）
        customTransforms: (document.body.textContent || "").includes("自定义变换")
            && (document.querySelector(".xlc-ct-name")?.value ?? "") === "客服话术"
            && (document.body.textContent || "").includes("添加自定义变换"),
        // R74：提示词场景包入口
        promptPack: (document.body.textContent || "").includes("导入内置分类模板"),
        promptPackInDataSection: (() => {
            const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("导入内置分类模板"));
            return !!btn && (btn.closest(".xlc-card")?.querySelector(".xlc-form-label")?.textContent ?? "").includes("数据与模板");
        })(),
    }));
    if (Object.values(settingsAssertions).some((v) => !v)) {
        throw new Error("settings smoke failed: " + JSON.stringify(settingsAssertions));
    }
    console.log("  smoke ✓ settings: 7 assertions");
    await page.screenshot({path: path.join(OUT, "production-settings-light.png")});
    // 模板包导出对话框（R71/F6，原型屏 8 右帧：分类筛选 / 包名 / 内容清单）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSettings();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "620px";
        }
        const packBtn = Array.from(document.querySelectorAll(".b3-button")).find((b) => b.textContent === "导出模板包");
        if (packBtn) packBtn.click();
    });
    await page.waitForTimeout(600);
    // harness 伪影修正：新开的模板包 Dialog 自挂载 body（无 b3 变量作用域会透明），移入 stage
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.body.querySelectorAll(":scope > .b3-dialog").forEach((el) => stage.appendChild(el));
    });
    const packAssertions = await page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll(".b3-dialog__container"));
        const packDialog = dialogs.find((c) => (c.querySelector(".b3-dialog__header")?.textContent ?? "").includes("模板包"));
        return {
            open: !!packDialog,
            nameDefault: (packDialog?.querySelector(".b3-text-field")?.value ?? "") === "小驴常用（内测版）模板包",
            categoryOptions: packDialog ? packDialog.querySelectorAll("select option").length >= 3 : false,
            badges: (packDialog?.textContent ?? "").includes("条目") && (packDialog?.textContent ?? "").includes("含变量"),
            contentsHint: (packDialog?.textContent ?? "").includes("assets"),
            exportBtn: Array.from(packDialog?.querySelectorAll("button") ?? []).some((b) => (b.textContent ?? "").includes("导出")),
            formHost: (() => {
                const body = packDialog?.querySelector(".b3-dialog__body, .b3-dialog__content");
                return !!packDialog?.classList.contains("xlc-form-host")
                    && !!body && parseFloat(getComputedStyle(body).paddingLeft) >= 16;
            })(),
            // R76 性能门禁：打开对话框零 kramdown 预取（正文延迟到点导出时才取）
            noPrefetch: ((window).__xlcKdCalls ?? 0) === 0,
        };
    });
    if (Object.values(packAssertions).some((v) => !v)) {
        throw new Error("pack-export smoke failed: " + JSON.stringify(packAssertions));
    }
    console.log("  smoke ✓ pack-export: 8 assertions");
    await page.screenshot({path: path.join(OUT, "production-pack-export-light.png")});
    // 首跑引导（库选择器，全新安装第一屏）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "560px";
        }
    });
    await page.waitForTimeout(400);
    const setupAssertions = await page.evaluate(() => {
        const text = document.body.textContent || "";
        const create = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("创建"));
        const next = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"));
        return {
            hint: text.includes("真实块"),
            usageGuide: text.includes("开始使用：") && !text.includes("setupUsageGuide"),
            recommendation: text.includes("分类是条目属性") && text.includes("模板由你确认后导入"),
            recommendedModeSelected: document.querySelector("#xlc-setup-mode")?.value === "new-doc",
            modeSelect: !!document.querySelector(".xlc-form select"),
            notebook: text.includes("按笔记本"),
            createBtn: text.includes("创建新库文档"),
            createTargetVisible: text.includes("新建文档所在笔记本"),
            createDisabledUntilNotebookSelection: !!create && create.disabled,
            nextDisabledWithoutDoc: !!next && next.disabled,
            docPicker: (document.querySelector("input[placeholder]")?.getAttribute("placeholder") ?? "").includes("选择库文档") || !!document.querySelector(".xlc-doclist"),
            formHost: (() => {
                const host = document.querySelector(".b3-dialog__container.xlc-form-host");
                const body = host?.querySelector(".b3-dialog__body, .b3-dialog__content");
                return !!host && !!body && parseFloat(getComputedStyle(body).paddingLeft) >= 16;
            })(),
        };
    });
    if (Object.values(setupAssertions).some((v) => !v)) {
        throw new Error("setup smoke failed: " + JSON.stringify(setupAssertions));
    }
    console.log("  smoke ✓ setup: 11 assertions");
    await page.screenshot({path: path.join(OUT, "production-setup-light.png")});
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup({existingMode: "doc", docSearchErrorOnce: true, docSearchDelayMs: 350});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForFunction(() => document.querySelector(".xlc-doclist")?.getAttribute("aria-busy") === "true", undefined, {timeout: 3000});
    const pickerLoading = await page.evaluate(() => {
        const list = document.querySelector(".xlc-doclist");
        return list?.getAttribute("aria-busy") === "true"
            && (list.querySelector(".xlc-doclist-empty")?.textContent ?? "").includes("加载中");
    });
    if (!pickerLoading) throw new Error("doc-picker loading state missing");
    await page.waitForFunction(() => {
        const list = document.querySelector(".xlc-doclist");
        return !!list?.querySelector(".xlc-doclist-retry") && (list.textContent ?? "").includes("offline");
    }, undefined, {timeout: 3000});
    const pickerFailure = await page.evaluate(() => {
        const list = document.querySelector(".xlc-doclist");
        return {
            preservesCause: (list?.textContent ?? "").includes("思源接口调用失败：offline"),
            notMisreportedAsEmpty: !(list?.textContent ?? "").includes("没有匹配的文档"),
            retryVisible: !!list?.querySelector(".xlc-doclist-retry"),
        };
    });
    if (Object.values(pickerFailure).some((v) => !v)) {
        throw new Error("doc-picker failure state smoke failed: " + JSON.stringify(pickerFailure));
    }
    const pickerRetry = await page.evaluate(() => {
        document.querySelector(".xlc-doclist-retry")?.click();
        const list = document.querySelector(".xlc-doclist");
        return list?.getAttribute("aria-busy") === "true"
            && (list.querySelector(".xlc-doclist-empty")?.textContent ?? "").includes("加载中");
    });
    if (!pickerRetry) throw new Error("doc-picker retry did not restart loading state");
    await page.waitForSelector(".xlc-doclist-item", {timeout: 3000});
    const pickerRecovered = await page.evaluate(() => {
        const next = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"));
        return {
            resultRestored: Array.from(document.querySelectorAll(".xlc-doclist-item")).some((b) => (b.textContent ?? "").includes("常用内容库")),
            nextEnabled: !!next && !next.disabled,
            busyCleared: document.querySelector(".xlc-doclist")?.getAttribute("aria-busy") !== "true",
        };
    });
    if (Object.values(pickerRecovered).some((v) => !v)) {
        throw new Error("doc-picker retry recovery smoke failed: " + JSON.stringify(pickerRecovered));
    }
    console.log("  smoke ✓ doc-picker loading, failure cause, retry and recovery: 8 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup({emptyNotebook: true});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForTimeout(500);
    const emptyNotebook = await page.evaluate(async () => {
        const mode = document.querySelector("#xlc-setup-mode");
        mode.value = "notebook";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        await new Promise((resolve) => setTimeout(resolve, 250));
        const notebook = document.querySelector("#xlc-setup-notebook");
        notebook.value = "20240101";
        notebook.dispatchEvent(new Event("change", {bubbles: true}));
        const next = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"));
        const create = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("创建"));
        next?.click();
        await new Promise((resolve) => setTimeout(resolve, 300));
        return {
            remainsOnStepOne: !document.body.textContent.includes("第 2 步 · 确认落点"),
            explainsEmptyNotebook: document.body.textContent.includes("根目录没有文档")
                || (document.body.dataset.xlcSetupNotice ?? "").includes("根目录没有文档"),
            didNotApplyConfig: !document.body.dataset.xlcSetupConfig,
            createDisabledInNotebookIndexMode: !!create && create.disabled,
            rootCheckRequiresRetry: !!next && next.disabled
                && document.querySelector(".xlc-setup-notebook-retry")?.style.display !== "none",
        };
    });
    if (Object.values(emptyNotebook).some((v) => !v)) {
        throw new Error("empty-notebook setup smoke failed: " + JSON.stringify(emptyNotebook));
    }
    console.log("  smoke ✓ empty-notebook setup: 5 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup({notebookLoadError: true});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForTimeout(150);
    const retrySetup = await page.evaluate(async () => {
        const retry = document.querySelector(".xlc-setup-notebook-retry");
        const status = document.querySelector(".xlc-setup-notebook-status");
        const wasError = status?.textContent?.includes("读取失败") && retry?.style.display !== "none";
        retry?.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const notebook = document.querySelector("#xlc-setup-notebook");
        const create = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("创建"));
        const selectReady = !notebook?.disabled && notebook?.options.length === 2;
        notebook.value = "20240101";
        notebook.dispatchEvent(new Event("change", {bubbles: true}));
        return {
            showsRetryableError: !!wasError,
            retryLoadsNotebooks: !!selectReady && status?.textContent?.includes("已加载"),
            createEnabledAfterSelection: !!create && !create.disabled,
        };
    });
    if (Object.values(retrySetup).some((v) => !v)) {
        throw new Error("notebook retry setup smoke failed: " + JSON.stringify(retrySetup));
    }
    console.log("  smoke ✓ notebook load failure and retry: 3 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup({existingMode: "notebook"});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForTimeout(150);
    const existingSetup = await page.evaluate(() => ({
        modeRestored: document.querySelector("#xlc-setup-mode")?.value === "notebook",
        notebookRestored: document.querySelector("#xlc-setup-notebook")?.value === "20240101",
        nextEnabled: !Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"))?.disabled,
    }));
    if (Object.values(existingSetup).some((v) => !v)) {
        throw new Error("existing notebook setup smoke failed: " + JSON.stringify(existingSetup));
    }
    console.log("  smoke ✓ existing notebook configuration restored: 3 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup({notebookDocsCheckError: true});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForTimeout(150);
    const notebookDocsRetry = await page.evaluate(async () => {
        const mode = document.querySelector("#xlc-setup-mode");
        mode.value = "notebook";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        await new Promise((resolve) => setTimeout(resolve, 150));
        const notebook = document.querySelector("#xlc-setup-notebook");
        notebook.value = "20240101";
        notebook.dispatchEvent(new Event("change", {bubbles: true}));
        const next = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"));
        next?.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const retry = document.querySelector(".xlc-setup-notebook-retry");
        const status = document.querySelector(".xlc-setup-notebook-status");
        const failure = status?.textContent?.includes("检查笔记本根目录失败") && retry?.style.display !== "none";
        retry?.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        return {
            showsRootCheckFailure: !!failure,
            retriesRootCheck: document.body.textContent.includes("第 2 步 · 确认落点"),
        };
    });
    if (Object.values(notebookDocsRetry).some((v) => !v)) {
        throw new Error("notebook root-doc retry smoke failed: " + JSON.stringify(notebookDocsRetry));
    }
    console.log("  smoke ✓ notebook root-doc check retry: 2 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup({notebookDocsDelayMs: 250, existingMode: "doc"});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const mode = document.querySelector("#xlc-setup-mode");
        mode.value = "notebook";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
    });
    await page.waitForFunction(() => {
        const notebook = document.querySelector("#xlc-setup-notebook");
        return notebook && !notebook.disabled && notebook.options.length > 1;
    }, {timeout: 3000});
    const staleSetupValidation = await page.evaluate(async () => {
        const mode = document.querySelector("#xlc-setup-mode");
        const notebook = document.querySelector("#xlc-setup-notebook");
        const next = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("下一步"));
        mode.value = "notebook";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        notebook.value = "20240101";
        notebook.dispatchEvent(new Event("change", {bubbles: true}));
        const nextWasEnabled = !!next && !next.disabled;
        next?.click();
        const validationStarted = document.querySelector(".xlc-setup-notebook-status")?.textContent?.includes("正在检查") ?? false;
        mode.value = "new-doc";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        await new Promise((resolve) => setTimeout(resolve, 320));
        return {
            validationStarted: nextWasEnabled && validationStarted,
            modeRemainsNewDoc: mode.value === "new-doc",
            noStaleConfirmationStep: !document.body.textContent.includes("第 2 步 · 确认落点"),
            noInvalidConfigApplied: !document.body.dataset.xlcSetupConfig,
            nextHiddenAndDisabled: !!next && next.style.display === "none" && next.disabled,
        };
    });
    if (Object.values(staleSetupValidation).some((v) => !v)) {
        throw new Error("stale notebook validation smoke failed: " + JSON.stringify(staleSetupValidation));
    }
    console.log("  smoke ✓ stale notebook validation after mode change: 4 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSettings("tree");
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForTimeout(100);
    const treeLibraryLabels = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll(".xlc-setting-text, .xlc-form-hint"))
            .filter((el) => (el.textContent ?? "").includes("文档树 · 1 个根文档"));
        return labels.length >= 2 && document.body.textContent.includes("/常用内容库");
    });
    if (!treeLibraryLabels) throw new Error("tree library labels or path are inconsistent");
    console.log("  smoke ✓ tree library labels and path: 2 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({filters: {type: "asset", tag: "", category: ""}});
        const input = document.querySelector(".xlc-search-input");
        input.value = "";
        input.dispatchEvent(new Event("input", {bubbles: true}));
    });
    await page.waitForTimeout(150);
    await page.screenshot({path: path.join(OUT, "production-empty-filtered-light.png")});
    const filteredEmpty = await page.evaluate(async () => {
        const empty = document.querySelector(".xlc-empty");
        const clear = Array.from(empty?.querySelectorAll("button") ?? []).find((b) => (b.textContent ?? "").includes("清除筛选"));
        const add = Array.from(empty?.querySelectorAll("button") ?? []).find((b) => (b.textContent ?? "").includes("新建条目"));
        clear?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
            explainsFilteredEmpty: empty?.textContent?.includes("当前筛选下没有匹配条目"),
            hasClearAndAdd: !!clear && !!add,
            clearRestoresRows: (document.querySelectorAll(".xlc-row").length > 0),
        };
    });
    if (Object.values(filteredEmpty).some((v) => !v)) {
        throw new Error("filtered-empty recovery smoke failed: " + JSON.stringify(filteredEmpty));
    }
    console.log("  smoke ✓ filtered empty recovery: 3 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({mobile: true});
        const guide = document.querySelector(".xlc-footer-guide");
        guide?.click();
    });
    const mobileGuide = await page.evaluate(() => {
        const text = document.body.textContent ?? "";
        return text.includes("点按条目插入") && !text.includes("Alt+1~9 直达前九条");
    });
    if (!mobileGuide) throw new Error("mobile usage guide contains desktop-only shortcuts");
    console.log("  smoke ✓ mobile usage guide: 2 assertions");
    // 捕获表单（生产 CaptureDialog DOM）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openCapture(true);
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "560px";
        }
    });
    await page.waitForTimeout(400);
    const captureAssertions = await page.evaluate(() => {
        const text = document.body.textContent || "";
        const typeWrap = document.querySelector(".xlc-form-type")?.closest(".xlc-form-field");
        const titleWrap = document.querySelector(".xlc-form-title")?.closest(".xlc-form-field");
        return {
            typeSelect: !!document.querySelector(".xlc-form-type"),
            contentArea: !!document.querySelector(".xlc-form-content"),
            titleField: !!document.querySelector(".xlc-form-title"),
            saveBtn: text.includes("保存"),
            aiTidy: !!document.querySelector(".xlc-form-ai") && text.includes("AI 整理"),
            aiDraft: text.includes("草稿"),
            formHost: (() => {
                const host = document.querySelector(".b3-dialog__container.xlc-form-host");
                const body = host?.querySelector(".b3-dialog__body, .b3-dialog__content");
                return !!host && !!body && parseFloat(getComputedStyle(body).paddingLeft) >= 16;
            })(),
            // R70：原型屏 3 顺序 —— 类型|别名 行在标题之下
            metaRowAfterTitle: !!typeWrap && !!titleWrap && Boolean(titleWrap.compareDocumentPosition(typeWrap) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
    });
    if (Object.values(captureAssertions).some((v) => !v)) {
        throw new Error("capture smoke failed: " + JSON.stringify(captureAssertions));
    }
    console.log("  smoke ✓ capture: 8 assertions");
    await page.screenshot({path: path.join(OUT, "production-capture-light.png")});
    // 捕获表单 AI 建议态（点「AI 整理」→ sugrow + 全部采纳 + 主色保存钮）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openCapture(true);
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "560px";
        }
        const tidyBtn = Array.from(document.querySelectorAll(".xlc-form-ai")).find((b) => b.textContent.includes("AI 整理"));
        const content = document.querySelector(".xlc-form-content");
        const disabledUntilContent = !!tidyBtn && tidyBtn.disabled;
        if (content) {
            content.value = "项目延期通知模板内容";
            content.dispatchEvent(new Event("input", {bubbles: true}));
        }
        document.body.dataset.xlcTidyGate = `${disabledUntilContent}:${!!tidyBtn && !tidyBtn.disabled}`;
        if (tidyBtn) tidyBtn.click();
    });
    await page.waitForTimeout(400);
    const captureAiAssertions = await page.evaluate(() => {
        const sugrow = document.querySelector(".xlc-sugrow");
        const save = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "保存");
        return {
            sugrowVisible: !!sugrow && sugrow.offsetParent !== null && sugrow.textContent.includes("全部采纳"),
            // R70：建议行文案「AI 建议」+ 标题加粗
            sugrowWording: !!sugrow && sugrow.textContent.includes("AI 建议") && !!sugrow.querySelector("b"),
            tidyRequiresContent: document.body.dataset.xlcTidyGate === "true:true",
            savePrimary: !!save && save.classList.contains("xlc-btn-primary"),
            twoColRows: document.querySelectorAll(".xlc-form-row").length >= 2,
        };
    });
    if (Object.values(captureAiAssertions).some((v) => !v)) {
        throw new Error("capture-ai smoke failed: " + JSON.stringify(captureAiAssertions));
    }
    console.log("  smoke ✓ capture-ai: 4 assertions");
    await page.screenshot({path: path.join(OUT, "production-capture-ai-light.png")});
    // 动作菜单（生产 showActionMenu DOM：右键第二行触发；图标列 + 标题 + AI 分区）
    await page.setViewportSize({width: 1280, height: 720});
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({aiEnabled: true, missing: false, query: "延期"});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "560px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "760px";
        }
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]"))
            .find((el) => (el.textContent ?? "").includes("延期简短版")) ?? document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]")[0];
        row.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true}));
    });
    await page.waitForTimeout(600);
    const menuAssertions = await page.evaluate(() => {
        const menu = document.querySelector(".xlc-menu");
        const text = menu ? menu.textContent : "";
        return {
            menuOpen: !!menu,
            menuTitle: text.includes("延期简短版") && text.includes("动作"),
            coreActions: text.includes("插入") && text.includes("复制"),
            aiSection: text.includes("润色") && text.includes("译为英文"),
            // R73：自定义变换并列出现在菜单 ✦ 区
            customItem: text.includes("客服话术"),
            iconColumns: menu ? menu.querySelectorAll(".xlc-menu-ic").length >= 6 : false,
            previewBoxSized: (() => {
                const p = document.querySelector(".xlc-menu-preview");
                return !!p && p.getBoundingClientRect().height >= 36;
            })(),
            // R76 键盘导航：菜单内 ArrowDown 把焦点移到菜单项
            kbNavFocus: (() => {
                const m = document.querySelector(".xlc-menu");
                if (!m) return false;
                m.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown", bubbles: true, cancelable: true}));
                const active = document.activeElement;
                return !!active && active.classList.contains("xlc-menu-item");
            })(),
        };
    });
    if (Object.values(menuAssertions).some((v) => !v)) {
        throw new Error("action-menu smoke failed: " + JSON.stringify(menuAssertions));
    }
    console.log("  smoke ✓ action-menu: 7 assertions");
    // 默认视图证据（R106）：预览盒在分区之后 + 删除项危险色；变换视图截图在守门点击之后
    await page.screenshot({path: path.join(OUT, "production-action-menu-default-light.png")});
    // R77：自定义变换「客服话术」→ 变换视图（结果未就绪时插/复制禁用，防空块）→ 就绪后复制变换结果本体
    await page.evaluate(() => {
        (window).__xlcCopied = undefined;
        (window).__xlcInsertDisabledBefore = null;
        const custom = Array.from(document.querySelectorAll(".xlc-menu-item")).find((b) => (b.textContent ?? "").includes("客服话术"));
        if (!custom) throw new Error("custom transform item missing");
        custom.click();
        // rebuild 同步完成：此刻 AI 结果未回，结果类按钮必须处于禁用态
        const insert = Array.from(document.querySelectorAll(".xlc-menu-item")).find((b) => (b.textContent ?? "").includes("插入变换结果"));
        (window).__xlcInsertDisabledBefore = !!insert && insert.disabled;
    });
    await page.waitForTimeout(400);
    const r77 = await page.evaluate(() => {
        const insert = Array.from(document.querySelectorAll(".xlc-menu-item")).find((b) => (b.textContent ?? "").includes("插入变换结果"));
        const save = Array.from(document.querySelectorAll(".xlc-menu-item")).find((b) => (b.textContent ?? "").includes("存为新条目"));
        const ready = !!insert && !insert.disabled && !!save && !save.disabled;
        const copyBtn = Array.from(document.querySelectorAll(".xlc-menu-item")).find((b) => (b.textContent ?? "").includes("复制变换结果"));
        if (copyBtn) copyBtn.click();
        return {disabledBefore: (window).__xlcInsertDisabledBefore, ready};
    });
    await page.waitForTimeout(200);
    const r77Copy = await page.evaluate(() => ({copiedTransformed: (window).__xlcCopied === "客服话术结果示例"}));
    if (!r77.disabledBefore || !r77.ready || !r77Copy.copiedTransformed) {
        throw new Error("transform-result-guard failed: " + JSON.stringify({...r77, ...r77Copy}));
    }
    console.log("  smoke ✓ transform-result-guard: 3 assertions");
    await page.screenshot({path: path.join(OUT, "production-action-menu-light.png")});
    // 变量填充卡片（F1，原型屏 4）：活动条目含 ask → Enter 触发填充卡
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({aiEnabled: true, missing: false, query: "延期"}); // R137 起桩件按查询词真实过滤，须用可命中条目的查询
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "560px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "760px";
        }
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true, cancelable: true}));
    });
    await page.waitForTimeout(600);
    // harness 伪影修正：填充卡 Dialog 自挂载在 body（不在 .b3-scope 内 → b3 变量失效透明）；
    // 真实宿主变量在 :root 无此问题——截图前把它也移入 stage
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.body.querySelectorAll(":scope > .b3-dialog").forEach((el) => stage.appendChild(el));
    });
    const varFormAssertions = await page.evaluate(() => {
        const form = document.querySelector(".xlc-varform");
        return {
            formOpen: !!form,
            formTitle: (form?.querySelector(".xlc-varform-title")?.textContent ?? "").includes("项目延期"),
            fieldCount: form ? form.querySelectorAll(".xlc-varform-field").length : 0,
            fieldTagged: (form?.querySelector(".xlc-varform-tag")?.textContent ?? "").includes("xlc:ask"),
            hasInsertBtn: (form?.querySelector(".xlc-btn-primary")?.textContent ?? "") === "插入",
        };
    });
    if (Object.values(varFormAssertions).some((v) => !v)) {
        throw new Error("variable-form smoke failed: " + JSON.stringify(varFormAssertions));
    }
    console.log("  smoke ✓ variable-form: 5 assertions");
    await page.screenshot({path: path.join(OUT, "production-variable-form-light.png")});
    // 空状态（无结果：大空态 + 语义找提示；footer 计数 + 真源声明）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({empty: true, query: "不存在的词条"});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "560px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "760px";
        }
    });
    await page.waitForTimeout(500);
    const emptyAssertions = await page.evaluate(() => {
        const empty = document.querySelector(".xlc-empty");
        const footer = document.querySelector(".xlc-footer");
        empty?.querySelector(".xlc-empty-action")?.click();
        return {
            emptyBlock: !!empty && empty.textContent.includes("AI 语义搜索"),
            emptyHint: !!empty && empty.textContent.includes("?"),
            emptyNewItem: !!empty && !!empty.querySelector(".xlc-empty-action")
                && (empty.querySelector(".xlc-empty-action")?.textContent ?? "").includes("新建"),
            queryPrefillsTitle: document.body.dataset.xlcNewItemTitle === "不存在的词条",
            previewCleared: document.querySelector(".xlc-pane-body")?.textContent === "当前没有可预览的条目",
            footerClaim: !!footer && footer.textContent.includes("思源块真源"),
            footerCount: !!footer && footer.textContent.includes("共 0 条"),
        };
    });
    if (Object.values(emptyAssertions).some((v) => !v)) {
        throw new Error("empty-state smoke failed: " + JSON.stringify(emptyAssertions));
    }
    console.log("  smoke ✓ empty-state: 7 assertions");
    await page.screenshot({path: path.join(OUT, "production-empty-light.png")});
    // 语义查询只用于找内容，不能静默变成新条目的标题。
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({empty: true, aiEnabled: true, query: "?空结果"});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "560px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "760px";
        }
    });
    await page.waitForTimeout(500);
    const semanticEmptyTitle = await page.evaluate(() => {
        document.querySelector(".xlc-empty-action")?.click();
        return document.body.dataset.xlcNewItemTitle ?? "missing";
    });
    if (semanticEmptyTitle !== "") {
        throw new Error(`semantic query must not prefill a title: ${semanticEmptyTitle}`);
    }
    console.log("  smoke ✓ semantic-empty-title: query not carried over");
    await page.evaluate((label) => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({empty: true, query: "", newItemAction: label});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    }, enI18n.newItemAction);
    await page.waitForTimeout(400);
    const englishEmptyAction = await page.evaluate((expected) => {
        const button = document.querySelector(".xlc-empty-action");
        return button?.textContent === expected && !button.textContent.includes("新建");
    }, enI18n.newItemAction);
    if (!englishEmptyAction) throw new Error("empty-state new-item action did not use the English localized label");
    console.log("  smoke ✓ empty-state action localization: 2 assertions");
    // R107 证据：搜索命中高亮（延期 命中前两行标题；纯截图，不新增断言）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({aiEnabled: true, missing: false, query: "延期"});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "560px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "760px";
        }
    });
    await page.waitForTimeout(700);
    await page.screenshot({path: path.join(OUT, "production-highlight-light.png")});
    // R110 证据：排序直选菜单（chip 点击弹 4 档、当前档 ✓ 加粗）
    await page.evaluate(() => {
        document.querySelector(".xlc-sort-chip").click();
    });
    await page.waitForTimeout(400);
    await page.screenshot({path: path.join(OUT, "production-sort-menu-light.png")});
    await page.evaluate(() => {
        document.querySelectorAll(".xlc-menu").forEach((el) => el.remove());
    });
    // R116 证据：定向插入模式横幅（文档树入口 → 明示落点）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({aiEnabled: true, missing: false, query: "延期", insertTarget: {docId: "20240101120001-hijklmn", hPath: "/工作手册/客服话术"}});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "560px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "760px";
        }
    });
    await page.waitForTimeout(700);
    await page.screenshot({path: path.join(OUT, "production-target-banner-light.png")});
    // R107 证据：空库态（无查询 + 总量 0 → 空库文案 + 就地新建按钮）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({empty: true, query: ""});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "560px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "760px";
        }
    });
    await page.waitForTimeout(500);
    await page.screenshot({path: path.join(OUT, "production-empty-library-light.png")});
    // 移动端 sheet（390×844 触控形态：圆角卡片行 + 点按提示）
    await page.setViewportSize({width: 390, height: 844});
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({mobile: true, missing: false});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.height = "82vh";
        }
    });
    await page.waitForTimeout(500);
    const mobileAssertions = await page.evaluate(() => {
        const root = document.querySelector(".xlc-dialog--mobile");
        const footBtns = document.querySelectorAll(".xlc-mobile-foot .b3-button");
        return {
            mobileRoot: !!root,
            rows: document.querySelectorAll(".xlc-row[data-xlc-index]").length >= 3,
            cardRows: !!document.querySelector(".xlc-dialog--mobile .xlc-row"),
            kbdHidden: !document.querySelector(".xlc-kbdrow") || document.querySelector(".xlc-kbdrow").offsetParent === null,
            // R68：移动端操作钮行（＋新建 / 插入选中）
            footButtons: footBtns.length === 2
                && (footBtns[0].textContent ?? "").includes("新建")
                && (footBtns[1].textContent ?? "").includes("插入选中"),
        };
    });
    if (Object.values(mobileAssertions).some((v) => !v)) {
        throw new Error("mobile smoke failed: " + JSON.stringify(mobileAssertions));
    }
    console.log("  smoke ✓ mobile: 5 assertions");
    await page.screenshot({path: path.join(OUT, "production-mobile-light.png")});
    await page.setViewportSize({width: 1280, height: 720});
    // 导入策略卡（R69，原型屏 8：三选 + 推荐档 + 逐项回执提示）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openImport();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "40px auto";
            container.style.maxWidth = "460px";
        }
    });
    await page.waitForTimeout(400);
    const importAssertions = await page.evaluate(() => {
        const cards = document.querySelectorAll(".xlc-policy");
        const recommended = document.querySelector(".xlc-policy--recommended");
        return {
            cards: cards.length === 3,
            recommended: !!recommended && (recommended.textContent ?? "").includes("重名并存"),
            descs: (document.querySelector(".xlc-policy-desc")?.textContent ?? "").length > 0,
            receiptHint: (document.body.textContent ?? "").includes("逐项回执"),
            badges: (document.body.textContent ?? "").includes("18 条目"),
            formHost: (() => {
                const host = document.querySelector(".b3-dialog__container.xlc-form-host");
                const body = host?.querySelector(".b3-dialog__body, .b3-dialog__content");
                return !!host && !!body && parseFloat(getComputedStyle(body).paddingLeft) >= 16;
            })(),
        };
    });
    if (Object.values(importAssertions).some((v) => !v)) {
        throw new Error("import-policy smoke failed: " + JSON.stringify(importAssertions));
    }
    console.log("  smoke ✓ import-policy: 6 assertions");
    await page.screenshot({path: path.join(OUT, "production-import-policy-light.png")});
    // 设置暗色
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope dark";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSettings();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "620px";
        }
    });
    await page.waitForTimeout(300);
    await page.screenshot({path: path.join(OUT, "production-settings-dark.png")});
    const prototypePage = await browser.newPage({viewport: {width: 3040, height: 1400}, deviceScaleFactor: 1});
    await prototypePage.goto("file:///" + path.join(OUT, "prototype.html").replace(/\\/g, "/"));
    await prototypePage.waitForLoadState("load");
    for (const [heading, file] of [
        ["屏 1 · 桌面搜索弹窗", "prototype-desktop-dialog.png"],
        ["屏 1 空态 · 未命中", "prototype-empty-state.png"],
        ["屏 5 · 设置", "prototype-settings.png"],
        ["屏 6 · 首跑引导", "prototype-setup.png"],
    ]) {
        const section = prototypePage.locator("section").filter({hasText: heading}).first();
        await section.screenshot({path: path.join(OUT, file), animations: "disabled"});
    }
    await prototypePage.screenshot({path: path.join(OUT, "prototype-all.png"), fullPage: true, animations: "disabled"});
    await prototypePage.close();
    await browser.close();
    console.log("production renders done:", fs.readdirSync(OUT).filter((f) => f.startsWith("production-")).join(", "));
    console.log("prototype snapshots updated: desktop, empty-state, settings, setup, all");
})();
