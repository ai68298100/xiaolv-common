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
                root.style.height = "700px";
                root.style.position = "relative";
            }
            const container = document.querySelector(".b3-dialog__container");
            if (container) {
                container.style.margin = "0 auto";
                container.style.maxWidth = "960px";
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
        pinnedGroup: (document.querySelector(".xlc-group-head")?.textContent ?? "").includes("收藏"),
        varBadge: (document.querySelector(".xlc-badge--var")?.textContent ?? "").includes("变量"),
        // R68：行 meta 使用次数（F3 展示）
        rowUseCount: ((document.querySelectorAll(".xlc-row-meta")[0] ?? {textContent: ""}).textContent ?? "").includes("32 次"),
        // R84：搜索清空按钮（有输入时出现，点击清空）
        searchClear: (() => {
            const btn = document.querySelector(".xlc-search-clear");
            return !!btn && btn.classList.contains("xlc-search-clear--on");
        })(),
        // R69：快捷键改为「键帽 + 动作」两层，标题内联 ★ 去重；提示行含光标落点
        kbdAltChips: Array.from(document.querySelectorAll(".xlc-kbd-key")).some((el) => (el.textContent ?? "").includes("1-9")),
        shortcutBar: (() => {
            const bar = document.querySelector(".xlc-kbdrow");
            return !!bar && (bar.textContent ?? "").includes("操作提示") && bar.querySelectorAll(".xlc-kbd-key").length >= 5;
        })(),
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
            return btn !== null && (btn.textContent ?? "").includes("新建条目");
        })(),
        usageGuide: (document.querySelector(".xlc-footer-guide")?.textContent ?? "").includes("使用帮助"),
    }));
    await shoot("desktop-dark", {theme: "dark", aiEnabled: true, missing: false}, () => ({
        rows: document.querySelectorAll(".xlc-row[data-xlc-index]").length >= 3,
        pane: !!document.querySelector(".xlc-pane"),
    }));
    // 虚拟列表键盘/ARIA 回归：活动索引必须使用全局 data-xlc-index，不能按窗口内局部序号匹配。
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({largeResults: true, query: ""});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const root = document.querySelector(".xlc-dialog");
        if (root) {
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
        }
    });
    await page.waitForTimeout(500);
    await page.locator(".xlc-search-input").focus();
    for (let i = 0; i < 99; i++) await page.keyboard.press("ArrowDown");
    const virtualLast = await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        const list = document.querySelector(".xlc-list");
        const last = document.querySelector('.xlc-row[data-xlc-index="99"]');
        return {
            virtualized: list?.classList.contains("xlc-list--virtual") === true,
            renderedRows: list?.querySelectorAll('.xlc-row[data-xlc-index]').length ?? 0,
            activeIndex: document.querySelector('.xlc-row--active')?.getAttribute("data-xlc-index") ?? null,
            selected: last?.getAttribute("aria-selected") === "true",
            activeDescendant: input?.getAttribute("aria-activedescendant") ?? null,
            scrolled: (list?.scrollTop ?? 0) > 0,
        };
    });
    if (!virtualLast.virtualized || virtualLast.renderedRows >= 100
        || virtualLast.activeIndex !== "99" || !virtualLast.selected
        || virtualLast.activeDescendant !== "xlc-result-99" || !virtualLast.scrolled) {
        throw new Error("virtual list last-item keyboard/ARIA smoke failed: " + JSON.stringify(virtualLast));
    }
    for (let i = 0; i < 99; i++) await page.keyboard.press("ArrowUp");
    const virtualFirst = await page.evaluate(() => {
        const input = document.querySelector(".xlc-search-input");
        const first = document.querySelector('.xlc-row[data-xlc-index="0"]');
        return {
            activeIndex: document.querySelector('.xlc-row--active')?.getAttribute("data-xlc-index") ?? null,
            selected: first?.getAttribute("aria-selected") === "true",
            activeDescendant: input?.getAttribute("aria-activedescendant") ?? null,
        };
    });
    if (virtualFirst.activeIndex !== "0" || !virtualFirst.selected || virtualFirst.activeDescendant !== "xlc-result-0") {
        throw new Error("virtual list first-item keyboard/ARIA smoke failed: " + JSON.stringify(virtualFirst));
    }
    console.log(`  smoke ✓ virtual list keyboard/ARIA: ${virtualLast.renderedRows} rendered rows, last/first active states`);
    await shoot("provider-light", {theme: "light", aiEnabled: true, missing: false, query: "工作台"}, () => ({
        providerHeader: (document.querySelector(".xlc-provider-header")?.textContent ?? "").includes("其他插件内容"),
        providerRows: document.querySelectorAll(".xlc-row--provider").length >= 1,
        footerGear: (document.querySelector(".xlc-footer-gear")?.textContent ?? "").includes("设置"),
        // 无本地命中时不保留上一条目的使用徽标或预览。
        paneUsageHidden: (() => {
            const el = document.querySelector(".xlc-pane-usage");
            const body = document.querySelector(".xlc-pane-body");
            return el !== null && el.offsetParent === null && body?.textContent === "选择左侧条目后，这里会显示预览";
        })(),
    }));
    await shoot("auth-error-light", {theme: "light", aiEnabled: true, missing: false, query: "项目延期"}, () => {
        window.XlcHarness.triggerAccessIssue("auth");
        const status = document.querySelector(".xlc-status");
        const card = document.querySelector(".xlc-list .xlc-empty");
        const retry = document.querySelector('[data-xlc-control="access.retry"]');
        return {
            oldRowsCleared: document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length === 0,
            alertVisible: status?.getAttribute("role") === "alert" && (status.textContent ?? "").includes("登录状态"),
            recoveryCard: (card?.textContent ?? "").includes("登录状态") && !!retry,
            failedStateExcludesCreateAction: !Array.from(card?.querySelectorAll("button") ?? []).some((button) => (button.textContent ?? "").includes("新建")),
        };
    });
    const searchesBeforeRetry = await page.evaluate(() => window.__xlcSearchCalls ?? 0);
    await page.locator('[data-xlc-control="access.retry"]').click();
    await page.waitForFunction((previousCount) => (window.__xlcSearchCalls ?? 0) > previousCount, searchesBeforeRetry);
    await page.waitForFunction(() => document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length > 0);
    const authRecovery = await page.evaluate(() => ({
        queryPreserved: document.querySelector(".xlc-search-input")?.value === "项目延期",
        errorCleared: !(document.querySelector(".xlc-status")?.textContent ?? "").includes("登录状态"),
        rowsRestored: document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length > 0,
    }));
    if (Object.values(authRecovery).some((value) => !value)) {
        throw new Error("auth recovery smoke failed: " + JSON.stringify(authRecovery));
    }
    console.log("  smoke ✓ auth recovery: 3 assertions");
    await page.evaluate(() => window.XlcHarness.triggerAccessIssue("permission"));
    const permissionFailure = await page.evaluate(() => {
        const status = document.querySelector(".xlc-status");
        const card = document.querySelector(".xlc-list .xlc-empty");
        return {
            oldRowsCleared: document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length === 0,
            alertVisible: status?.getAttribute("role") === "alert" && (status.textContent ?? "").includes("访问权限不足"),
            queryPreserved: document.querySelector(".xlc-search-input")?.value === "项目延期",
            retryOnly: !!card?.querySelector('[data-xlc-control="access.retry"]')
                && !Array.from(card.querySelectorAll("button")).some((button) => (button.textContent ?? "").includes("新建")),
        };
    });
    if (Object.values(permissionFailure).some((value) => !value)) {
        throw new Error("permission failure smoke failed: " + JSON.stringify(permissionFailure));
    }
    const searchesBeforePermissionRetry = await page.evaluate(() => window.__xlcSearchCalls ?? 0);
    await page.locator('[data-xlc-control="access.retry"]').click();
    await page.waitForFunction((previousCount) => (window.__xlcSearchCalls ?? 0) > previousCount, searchesBeforePermissionRetry);
    await page.waitForFunction(() => document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length > 0);
    const permissionRecovery = await page.evaluate(() => ({
        queryPreserved: document.querySelector(".xlc-search-input")?.value === "项目延期",
        errorCleared: !(document.querySelector(".xlc-status")?.textContent ?? "").includes("访问权限不足"),
        rowsRestored: document.querySelectorAll(".xlc-list .xlc-row[data-xlc-index]").length > 0,
    }));
    if (Object.values(permissionRecovery).some((value) => !value)) {
        throw new Error("permission recovery smoke failed: " + JSON.stringify(permissionRecovery));
    }
    console.log("  smoke ✓ permission failure/recovery: 7 assertions");
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
        sections: ["AI 助手", "搜索", "数据与模板", "其他插件内容"].every((s) => document.body.textContent.includes(s)),
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
        clearUsageDisabledWhenEmpty: (() => {
            const button = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("暂无使用统计"));
            return !!button && button.disabled;
        })(),
        usageRetentionExplained: (document.body.textContent || "").includes("关闭后会保留已有统计"),
        introLocalized: (() => {
            const intro = document.querySelector(".xlc-page-intro");
            const text = intro?.textContent ?? "";
            return !!intro && text.length > 8 && !/^(settingsIntro|captureIntro)$/.test(text);
        })(),
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
    console.log("  smoke ✓ settings: 10 assertions");
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
        const create = document.querySelector("[data-xlc-control='setup.newdoc.create']");
        const next = document.querySelector("[data-xlc-control='setup.next']");
        return {
            hint: text.includes("思源文档") && text.includes("可继续编辑"),
            usageGuide: (() => {
                const guide = Array.from(document.querySelectorAll(".xlc-form-hint"))
                    .find((el) => (el.textContent ?? "").includes("开始使用："));
                return !!guide && getComputedStyle(guide).display === "none";
            })(),
            recommendation: text.includes("分类会保存在每条内容上") && text.includes("模板由你确认后导入"),
            quickStart: (() => {
                const card = document.querySelector(".xlc-setup-quickstart");
                return !!card && getComputedStyle(card).display !== "none"
                    && card.textContent.includes("先放一条内容")
                    && card.textContent.includes("再找到它") && card.textContent.includes("最后使用");
            })(),
            quickStartCompact: (() => {
                const card = document.querySelector(".xlc-setup-quickstart");
                return !!card && getComputedStyle(card).gridTemplateColumns.split(" ").length === 3;
            })(),
            recommendedModeSelected: document.querySelector("[data-xlc-control='setup.mode']")?.value === "new-doc",
            modeControlMapped: !!document.querySelector("[data-xlc-control='setup.mode']"),
            docQueryControlMapped: !!document.querySelector("[data-xlc-control='setup.docs.query']"),
            newDocTitleControlMapped: !!document.querySelector("[data-xlc-control='setup.newdoc.title']"),
            laterControlMapped: !!document.querySelector("[data-xlc-control='setup.later']"),
            notebookRetryControlMapped: !!document.querySelector("[data-xlc-control='setup.notebook.retry']"),
            modeSelect: !!document.querySelector(".xlc-form select"),
            notebook: text.includes("按笔记本"),
            createBtn: text.includes("创建新库文档"),
            createTargetVisible: text.includes("选择已有笔记本（不会新建笔记本）"),
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
    console.log("  smoke ✓ setup: 18 assertions");
    await page.screenshot({path: path.join(OUT, "production-setup-light.png")});
    const setupStepTransition = await page.evaluate(async () => {
        const mode = document.querySelector("[data-xlc-control='setup.mode']");
        mode.value = "doc";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        const input = document.querySelector("[data-xlc-control='setup.docs.query']");
        input.value = "常用内容库";
        input.dispatchEvent(new Event("input", {bubbles: true}));
        await new Promise((resolve) => setTimeout(resolve, 360));
        const doc = document.querySelector("[data-xlc-control='setup.doc.result']");
        doc?.click();
        const next = document.querySelector("[data-xlc-control='setup.next']");
        next?.click();
        const guide = Array.from(document.querySelectorAll(".xlc-form-hint")).find((el) => (el.textContent ?? "").includes("开始使用："));
        const recommendation = document.querySelector(".xlc-setup-recommendation");
        return {
            reachedConfirmStep: document.body.textContent.includes("第 2 步 · 确认落点"),
            hidesFirstStepGuide: !!guide && getComputedStyle(guide).display === "none",
            hidesFirstStepRecommendation: !!recommendation && getComputedStyle(recommendation).display === "none",
        };
    });
    if (Object.values(setupStepTransition).some((v) => !v)) {
        throw new Error("setup step transition smoke failed: " + JSON.stringify(setupStepTransition));
    }
    console.log("  smoke ✓ setup step transition: 3 assertions");
    const setupCompletion = await page.evaluate(() => {
        const back = document.querySelector("[data-xlc-control='setup.back']");
        back?.click();
        const returnedToChoice = document.body.textContent.includes("第 1 步 · 选择库方式")
            && document.querySelector("[data-xlc-control='setup.mode']")?.value === "doc";
        const resultWasSelected = document.querySelector("[data-xlc-control='setup.doc.result']")?.classList.contains("xlc-doclist-item--on") === true;
        document.querySelector("[data-xlc-control='setup.next']")?.click();
        document.querySelector("[data-xlc-control='setup.finish']")?.click();
        const applied = JSON.parse(document.body.dataset.xlcSetupConfig || "null");
        return {
            backReturnsToChoice: !!back && returnedToChoice,
            resultWasSelected,
            configuredDocument: applied?.mode === "doc" && applied?.containerDocIds?.[0] === "20240101120001-hijklmn",
            dialogClosed: !document.querySelector(".b3-dialog.xlc-form-host"),
        };
    });
    if (Object.values(setupCompletion).some((v) => !v)) {
        throw new Error("setup completion smoke failed: " + JSON.stringify(setupCompletion));
    }
    console.log("  smoke ✓ setup completion and saved target: 4 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        delete document.body.dataset.xlcSetupConfig;
        window.XlcHarness.openSetup({
            docSearchDelayByKeyword: {"旧查询": 260, "新查询": 20},
            docSearchPathByKeyword: {"旧查询": "/内容库/旧查询", "新查询": "/内容库/新查询"},
        });
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    const setupSearchRace = await page.evaluate(async () => {
        const mode = document.querySelector("[data-xlc-control='setup.mode']");
        const query = document.querySelector("[data-xlc-control='setup.docs.query']");
        mode.value = "doc";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        query.value = "旧查询";
        query.dispatchEvent(new Event("input", {bubbles: true}));
        query.value = "新查询";
        query.dispatchEvent(new Event("input", {bubbles: true}));
        await new Promise((resolve) => setTimeout(resolve, 320));
        const results = Array.from(document.querySelectorAll("[data-xlc-control='setup.doc.result']"));
        return {
            newestQueryVisible: results.length === 1 && results[0].textContent.includes("新查询"),
            staleQueryDiscarded: results.every((result) => !result.textContent.includes("旧查询")),
        };
    });
    if (Object.values(setupSearchRace).some((v) => !v)) {
        throw new Error("setup search race smoke failed: " + JSON.stringify(setupSearchRace));
    }
    console.log("  smoke ✓ setup document search discards stale response: 2 assertions");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openSetup();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForFunction(() => {
        const notebook = document.querySelector("[data-xlc-control='setup.notebook']");
        return !!notebook && !notebook.disabled && notebook.options.length > 1;
    }, undefined, {timeout: 3000});
    const createLibraryFlow = await page.evaluate(async () => {
        const notebook = document.querySelector("[data-xlc-control='setup.notebook']");
        const title = document.querySelector("[data-xlc-control='setup.newdoc.title']");
        const create = document.querySelector("[data-xlc-control='setup.newdoc.create']");
        notebook.value = "20240101";
        notebook.dispatchEvent(new Event("change", {bubbles: true}));
        title.value = "我的常用库";
        title.dispatchEvent(new Event("input", {bubbles: true}));
        const enabledAfterInputs = !create.disabled;
        window.__xlcAutoConfirm = true;
        create.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        window.__xlcAutoConfirm = false;
        const applied = JSON.parse(document.body.dataset.xlcSetupConfig || "null");
        return {
            enabledAfterInputs,
            createdLibraryConfigApplied: applied?.mode === "doc"
                && applied?.containerDocIds?.[0] === "20240101120001-hijklmn"
                && applied?.createdDocIds?.[0] === "20240101120001-hijklmn",
            dialogClosed: !document.querySelector(".b3-dialog.xlc-form-host"),
        };
    });
    if (Object.values(createLibraryFlow).some((v) => !v)) {
        throw new Error("setup create-library smoke failed: " + JSON.stringify(createLibraryFlow));
    }
    console.log("  smoke ✓ create library confirms and applies its real target: 3 assertions");
    const dismissSetup = await page.evaluate(() => {
        const stage = document.getElementById("stage");
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        delete document.body.dataset.xlcSetupConfig;
        delete document.body.dataset.xlcSetupNotice;
        window.XlcHarness.openSetup();
        const dismiss = document.querySelector("[data-xlc-control='setup.later']");
        dismiss?.click();
        return !!dismiss && !document.querySelector(".b3-dialog.xlc-form-host");
    });
    if (!dismissSetup) throw new Error("setup later action did not dismiss the wizard");
    console.log("  smoke ✓ setup later action dismisses the wizard: 1 assertion");
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
        return !!list?.querySelector("[data-xlc-control='setup.docs.retry']") && (list.textContent ?? "").includes("offline");
    }, undefined, {timeout: 3000});
    const pickerFailure = await page.evaluate(() => {
        const list = document.querySelector(".xlc-doclist");
        return {
            preservesCause: (list?.textContent ?? "").includes("思源接口调用失败：offline"),
            notMisreportedAsEmpty: !(list?.textContent ?? "").includes("没有匹配的文档"),
            retryVisible: !!list?.querySelector("[data-xlc-control='setup.docs.retry']"),
        };
    });
    if (Object.values(pickerFailure).some((v) => !v)) {
        throw new Error("doc-picker failure state smoke failed: " + JSON.stringify(pickerFailure));
    }
    const pickerRetry = await page.evaluate(() => {
        document.querySelector("[data-xlc-control='setup.docs.retry']")?.click();
        const list = document.querySelector(".xlc-doclist");
        return list?.getAttribute("aria-busy") === "true"
            && (list.querySelector(".xlc-doclist-empty")?.textContent ?? "").includes("加载中");
    });
    if (!pickerRetry) throw new Error("doc-picker retry did not restart loading state");
    await page.waitForSelector("[data-xlc-control='setup.doc.result']", {timeout: 3000});
    const pickerRecovered = await page.evaluate(() => {
        const next = document.querySelector("[data-xlc-control='setup.next']");
        return {
            resultRestored: Array.from(document.querySelectorAll("[data-xlc-control='setup.doc.result']")).some((b) => (b.textContent ?? "").includes("常用内容库")),
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
        const mode = document.querySelector("[data-xlc-control='setup.mode']");
        mode.value = "notebook";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        await new Promise((resolve) => setTimeout(resolve, 250));
        const notebook = document.querySelector("[data-xlc-control='setup.notebook']");
        notebook.value = "20240101";
        notebook.dispatchEvent(new Event("change", {bubbles: true}));
        const next = document.querySelector("[data-xlc-control='setup.next']");
        const create = document.querySelector("[data-xlc-control='setup.newdoc.create']");
        next?.click();
        await new Promise((resolve) => setTimeout(resolve, 300));
        return {
            remainsOnStepOne: !document.body.textContent.includes("第 2 步 · 确认落点"),
            explainsEmptyNotebook: document.body.textContent.includes("根目录没有文档")
                || (document.body.dataset.xlcSetupNotice ?? "").includes("根目录没有文档"),
            didNotApplyConfig: !document.body.dataset.xlcSetupConfig,
            createDisabledInNotebookIndexMode: !!create && create.disabled,
            emptyStateDoesNotOfferRetry: document.querySelector("[data-xlc-control='setup.notebook.retry']")?.style.display === "none",
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
        const retry = document.querySelector("[data-xlc-control='setup.notebook.retry']");
        const status = document.querySelector(".xlc-setup-notebook-status");
        const wasError = status?.textContent?.includes("读取失败") && retry?.style.display !== "none";
        retry?.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const notebook = document.querySelector("[data-xlc-control='setup.notebook']");
        const create = document.querySelector("[data-xlc-control='setup.newdoc.create']");
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
        modeRestored: document.querySelector("[data-xlc-control='setup.mode']")?.value === "notebook",
        notebookRestored: document.querySelector("[data-xlc-control='setup.notebook']")?.value === "20240101",
        nextEnabled: !document.querySelector("[data-xlc-control='setup.next']")?.disabled,
        quickStartHiddenForExistingConfig: (() => {
            const card = document.querySelector(".xlc-setup-quickstart");
            return !!card && getComputedStyle(card).display === "none";
        })(),
    }));
    if (Object.values(existingSetup).some((v) => !v)) {
        throw new Error("existing notebook setup smoke failed: " + JSON.stringify(existingSetup));
    }
    console.log("  smoke ✓ existing notebook configuration restored: 4 assertions");
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
        const mode = document.querySelector("[data-xlc-control='setup.mode']");
        mode.value = "notebook";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
        await new Promise((resolve) => setTimeout(resolve, 150));
        const notebook = document.querySelector("[data-xlc-control='setup.notebook']");
        notebook.value = "20240101";
        notebook.dispatchEvent(new Event("change", {bubbles: true}));
        const next = document.querySelector("[data-xlc-control='setup.next']");
        next?.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const retry = document.querySelector("[data-xlc-control='setup.notebook.retry']");
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
        const mode = document.querySelector("[data-xlc-control='setup.mode']");
        mode.value = "notebook";
        mode.dispatchEvent(new Event("change", {bubbles: true}));
    });
    await page.waitForFunction(() => {
        const notebook = document.querySelector("[data-xlc-control='setup.notebook']");
        return notebook && !notebook.disabled && notebook.options.length > 1;
    }, {timeout: 3000});
    const staleSetupValidation = await page.evaluate(async () => {
        const mode = document.querySelector("[data-xlc-control='setup.mode']");
        const notebook = document.querySelector("[data-xlc-control='setup.notebook']");
        const next = document.querySelector("[data-xlc-control='setup.next']");
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
        return text.includes("点按条目尝试插入") && text.includes("复制到剪贴板") && !text.includes("Alt+1~9 直达前九条");
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
            introLocalized: (() => {
                const intro = document.querySelector(".xlc-page-intro");
                const value = intro?.textContent ?? "";
                return !!intro && value.length > 8 && !/^(settingsIntro|captureIntro)$/.test(value);
            })(),
            formHost: (() => {
                const host = document.querySelector(".b3-dialog__container.xlc-form-host");
                const body = host?.querySelector(".b3-dialog__body, .b3-dialog__content");
                return !!host && !!body && parseFloat(getComputedStyle(body).paddingLeft) >= 16;
            })(),
            // R197：标题之后是“别名｜类型”行，具体列顺序由下方断言核对。
            metaRowAfterTitle: !!typeWrap && !!titleWrap && Boolean(titleWrap.compareDocumentPosition(typeWrap) & Node.DOCUMENT_POSITION_FOLLOWING),
            typeControlMapped: !!document.querySelector("[data-xlc-control='capture.type']"),
            contentControlMapped: !!document.querySelector("[data-xlc-control='capture.content']"),
            titleControlMapped: !!document.querySelector("[data-xlc-control='capture.title']"),
            aliasControlMapped: !!document.querySelector("[data-xlc-control='capture.alias']"),
            tagsControlMapped: !!document.querySelector("[data-xlc-control='capture.tags']"),
            categoryControlMapped: !!document.querySelector("[data-xlc-control='capture.category']"),
            saveControlMapped: !!document.querySelector("[data-xlc-control='capture.save']"),
            cancelControlMapped: !!document.querySelector("[data-xlc-control='capture.cancel']"),
        };
    });
    if (Object.values(captureAssertions).some((v) => !v)) {
        throw new Error("capture smoke failed: " + JSON.stringify(captureAssertions));
    }
    console.log(`  smoke ✓ capture: ${Object.keys(captureAssertions).length} assertions`);
    await page.screenshot({path: path.join(OUT, "production-capture-light.png")});

    // 捕获表单核心写入闭环：字段错误定位/清除、提交 payload、成功关闭和取消无写入。
    await page.locator("[data-xlc-control='capture.save']").click();
    const requiredError = await page.evaluate(() => {
        const content = document.querySelector("[data-xlc-control='capture.content']");
        const error = document.getElementById("xlc-capture-content-error");
        return {
            invalid: content?.getAttribute("aria-invalid") === "true",
            described: content?.getAttribute("aria-describedby") === error?.id,
            focused: document.activeElement === content,
            visibleError: error?.hidden === false && error.textContent === "请填写要保存的内容。",
            noWrite: JSON.parse(document.body.dataset.xlcCaptureCreatedItems ?? "[]").length === 0,
        };
    });
    if (Object.values(requiredError).some((v) => !v)) {
        throw new Error("capture required-field validation failed: " + JSON.stringify(requiredError));
    }
    await page.screenshot({path: path.join(OUT, "production-capture-validation-light.png")});

    await page.locator("[data-xlc-control='capture.content']").fill("javascript:alert(1)");
    await page.locator("[data-xlc-control='capture.type']").selectOption("url");
    await page.locator("[data-xlc-control='capture.save']").click();
    const urlError = await page.evaluate(() => {
        const content = document.querySelector("[data-xlc-control='capture.content']");
        const error = document.getElementById("xlc-capture-content-error");
        return content?.getAttribute("aria-invalid") === "true"
            && document.activeElement === content
            && error?.hidden === false
            && error.textContent === "请输入有效的 http 或 https 链接。";
    });
    if (!urlError) throw new Error("capture URL validation did not identify the content field");

    await page.locator("[data-xlc-control='capture.content']").fill("https://example.com");
    const correctedErrorCleared = await page.evaluate(() => {
        const content = document.querySelector("[data-xlc-control='capture.content']");
        const error = document.getElementById("xlc-capture-content-error");
        return !content?.hasAttribute("aria-invalid") && !content?.hasAttribute("aria-describedby")
            && !content?.classList.contains("xlc-input--error") && error?.hidden === true;
    });
    if (!correctedErrorCleared) throw new Error("capture field correction did not clear its error state");

    await page.locator("[data-xlc-control='capture.type']").selectOption("markdown");
    await page.locator("[data-xlc-control='capture.content']").fill("可复用正文\n第二行");
    await page.locator("[data-xlc-control='capture.title']").fill("验收标题");
    await page.locator("[data-xlc-control='capture.alias']").fill("验收别名");
    await page.locator("[data-xlc-control='capture.tags']").fill("模板, 客户");
    await page.locator("[data-xlc-control='capture.category']").fill("客服");
    await page.locator("[data-xlc-control='capture.save']").click();
    await page.waitForFunction(() => {
        const created = JSON.parse(document.body.dataset.xlcCaptureCreatedItems ?? "[]");
        return created.length === 1 && !document.querySelector(".xlc-capture");
    }, undefined, {timeout: 3000});
    const savedPayload = await page.evaluate(() => {
        const created = JSON.parse(document.body.dataset.xlcCaptureCreatedItems ?? "[]");
        const item = created[0];
        return item?.itemType === "markdown"
            && item?.markdown === "可复用正文\n第二行"
            && item?.title === "验收标题"
            && item?.alias === "验收别名"
            && item?.tags?.join("|") === "模板|客户"
            && item?.category === "客服"
            && item?.source?.sourceDocId === "20240101120001-hijklmn"
            && item?.source?.sourceType === "manual";
    });
    if (!savedPayload) throw new Error("capture save payload did not preserve the entered fields");

    await page.evaluate(() => window.XlcHarness.openCapture(false));
    await page.locator("[data-xlc-control='capture.cancel']").click();
    const canceledWithoutWrite = await page.evaluate(() => {
        const created = JSON.parse(document.body.dataset.xlcCaptureCreatedItems ?? "[]");
        return created.length === 1 && !document.querySelector(".xlc-capture");
    });
    if (!canceledWithoutWrite) throw new Error("capture cancel did not close without another write");
    console.log("  smoke ✓ capture core: empty/URL validation, correction, payload, save and cancel");

    // 捕获表单 AI 建议态（点「AI 整理」→ sugrow + 全部采纳 + 主色保存钮）
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.__xlcAutoConfirm = false;
        window.XlcHarness.openCapture(true, 150);
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "560px";
        }
    });
    const tidyInitiallyDisabled = await page.locator("[data-xlc-control='capture.ai.tidy']").isDisabled();
    await page.locator("[data-xlc-control='capture.content']").fill("项目延期通知模板内容");
    const tidyEnabledForContent = !(await page.locator("[data-xlc-control='capture.ai.tidy']").isDisabled());
    await page.locator("[data-xlc-control='capture.ai.tidy']").click();
    const tidyBusyLocked = await page.evaluate(() => {
        const tidy = document.querySelector("[data-xlc-control='capture.ai.tidy']");
        const locked = tidy?.disabled === true && tidy.textContent?.includes("处理中") === true;
        tidy?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return locked;
    });
    await page.waitForFunction(() => {
        const calls = JSON.parse(document.body.dataset.xlcCaptureAiTidyCalls ?? "[]");
        return calls.length === 1 && document.querySelector(".xlc-sugrow")?.offsetParent !== null;
    }, undefined, {timeout: 3000});
    const captureAiAssertions = await page.evaluate(() => {
        const sugrow = document.querySelector(".xlc-sugrow");
        const variableIds = ["ask", "ask.options", "ask.textarea", "snippet", "cursor", "date", "date.offset", "random", "doc", "clipboard"];
        return {
            sugrowVisible: !!sugrow && sugrow.offsetParent !== null && sugrow.textContent.includes("全部采纳"),
            // R70：建议行文案「AI 建议」+ 标题加粗
            sugrowWording: !!sugrow && sugrow.textContent.includes("AI 建议") && !!sugrow.querySelector("b"),
            suggestionMetadataVisible: !!sugrow && sugrow.textContent.includes("AI 别名")
                && sugrow.textContent.includes("标签：AI/模板") && sugrow.textContent.includes("分类：AI 模板"),
            tidyCallUsesEnteredContent: JSON.parse(document.body.dataset.xlcCaptureAiTidyCalls ?? "[]")[0] === "项目延期通知模板内容",
            tidyStableId: !!document.querySelector("[data-xlc-control='capture.ai.tidy']"),
            adoptStableId: !!document.querySelector("[data-xlc-control='capture.ai.suggestion.adopt']"),
            draftDescriptionStableId: !!document.querySelector("[data-xlc-control='capture.ai.draft.description']"),
            draftGenerateStableId: !!document.querySelector("[data-xlc-control='capture.ai.draft.generate']"),
            allVariableTemplatesMapped: variableIds.every((id) => document.querySelector(`[data-xlc-control='capture.variable.${id}']`)),
            twoColRows: document.querySelectorAll(".xlc-form-row").length >= 2,
            captureFieldOrderMatchesPrototype: (() => {
                const fields = Array.from(document.querySelector(".xlc-capture .xlc-form-row")?.querySelectorAll(".xlc-form-field") ?? []);
                return fields[0]?.querySelector(".xlc-form-label")?.textContent === "别名"
                    && fields[1]?.querySelector(".xlc-form-label")?.textContent === "类型"
                    && fields[1]?.querySelector("select[data-xlc-control='capture.type']") !== null;
            })(),
        };
    });
    if (!tidyInitiallyDisabled || !tidyEnabledForContent || !tidyBusyLocked || Object.values(captureAiAssertions).some((v) => !v)) {
        throw new Error("capture-ai smoke failed: " + JSON.stringify({tidyInitiallyDisabled, tidyEnabledForContent, tidyBusyLocked, ...captureAiAssertions}));
    }
    if (await page.evaluate(() => JSON.parse(document.body.dataset.xlcCaptureAiTidyCalls ?? "[]").length) !== 1) {
        throw new Error("capture AI tidy accepted a duplicate request while busy");
    }
    console.log(`  smoke ✓ capture-ai: ${Object.keys(captureAiAssertions).length + 3} assertions`);
    await page.screenshot({path: path.join(OUT, "production-capture-ai-light.png")});

    await page.locator("[data-xlc-control='capture.ai.suggestion.adopt']").click();
    const adoptedSuggestions = await page.evaluate(() => {
        const value = (id) => document.querySelector(`[data-xlc-control='${id}']`)?.value;
        return value("capture.title") === "AI 建议 项目延期通知"
            && value("capture.alias") === "AI 别名"
            && value("capture.tags") === "AI, 模板"
            && value("capture.category") === "AI 模板"
            && value("capture.content") === "项目延期通知模板内容";
    });
    if (!adoptedSuggestions) throw new Error("capture AI suggestion adoption did not update only the suggested metadata: " + JSON.stringify(await page.evaluate(() => Object.fromEntries(["capture.title", "capture.alias", "capture.tags", "capture.category", "capture.content"].map((id) => [id, document.querySelector(`[data-xlc-control='${id}']`)?.value])))));

    const draftInput = page.locator("[data-xlc-control='capture.ai.draft.description']");
    const draftButton = page.locator("[data-xlc-control='capture.ai.draft.generate']");
    if (!(await draftButton.isDisabled())) throw new Error("capture AI draft should be disabled until a description is entered");
    await draftInput.fill("客户延期回复");
    if (await draftButton.isDisabled()) throw new Error("capture AI draft did not enable for a non-empty description");
    await draftButton.click();
    const draftBusyLocked = await page.evaluate(() => {
        const button = document.querySelector("[data-xlc-control='capture.ai.draft.generate']");
        const locked = button?.disabled === true && button.textContent?.includes("处理中") === true;
        button?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        return locked;
    });
    await page.waitForFunction(() => JSON.parse(document.body.dataset.xlcCaptureAiDraftCalls ?? "[]").length === 1, undefined, {timeout: 3000});
    await page.waitForTimeout(200);
    const draftRequestCount = await page.evaluate(() => JSON.parse(document.body.dataset.xlcCaptureAiDraftCalls ?? "[]").length);
    if (!draftBusyLocked || draftRequestCount !== 1 || await draftButton.isDisabled()) {
        throw new Error("capture AI draft busy state did not lock and deduplicate the request: " + JSON.stringify({draftBusyLocked, draftRequestCount}));
    }
    const draftRefusedOverwrite = await page.evaluate(() => document.querySelector("[data-xlc-control='capture.content']")?.value === "项目延期通知模板内容");
    if (!draftRefusedOverwrite) throw new Error("capture AI draft silently overwrote existing content without confirmation");
    await page.evaluate(() => { window.__xlcAutoConfirm = true; });
    await draftButton.click();
    await page.waitForFunction(() => {
        const calls = JSON.parse(document.body.dataset.xlcCaptureAiDraftCalls ?? "[]");
        return calls.length === 2 && document.querySelector("[data-xlc-control='capture.content']")?.value === "草稿（客户延期回复）";
    }, undefined, {timeout: 3000});
    await page.evaluate(() => { window.__xlcAutoConfirm = false; });
    console.log("  smoke ✓ capture-ai adoption and draft overwrite confirmation");

    await page.locator("[data-xlc-control='capture.cancel']").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-xlc-control='capture.save']").length === 0);
    await page.evaluate(() => window.XlcHarness.openCapture(true, 90, {tidyFailureCall: 2, draftFailureCall: 1, draftFailureKind: "throw"}));
    await page.locator("[data-xlc-control='capture.content']").fill("第一版正文");
    await page.locator("[data-xlc-control='capture.ai.tidy']").click();
    await page.waitForFunction(() => document.querySelector("[data-xlc-control='capture.ai.suggestion.adopt']")?.offsetParent !== null, undefined, {timeout: 3000});
    await page.locator("[data-xlc-control='capture.content']").fill("更新后的正文");
    await page.locator("[data-xlc-control='capture.ai.tidy']").click();
    await page.waitForFunction(() => document.querySelector("[data-xlc-control='capture.ai.tidy.retry']")?.offsetParent !== null, undefined, {timeout: 3000});
    const tidyFailureState = await page.evaluate(() => {
        const error = document.querySelector("[data-xlc-control='capture.ai.tidy.error']");
        const row = document.querySelector(".xlc-sugrow");
        const button = document.querySelector("[data-xlc-control='capture.ai.tidy']");
        return {
            readableAlert: error?.getAttribute("role") === "alert" && error?.getAttribute("aria-live") === "assertive"
                && error.textContent.includes("AI 整理请求暂时失败"),
            visibleRetry: document.querySelector("[data-xlc-control='capture.ai.tidy.retry']")?.offsetParent !== null,
            staleSuggestionHidden: getComputedStyle(row).display === "none",
            originalUnlocked: button instanceof HTMLButtonElement && !button.disabled,
        };
    });
    if (Object.values(tidyFailureState).some((value) => !value)) throw new Error("capture AI tidy failure state failed: " + JSON.stringify(tidyFailureState));
    await page.locator("[data-xlc-control='capture.ai.tidy.retry']").click();
    await page.waitForFunction(() => document.querySelector(".xlc-sugrow")?.offsetParent !== null
        && document.querySelector("[data-xlc-control='capture.ai.tidy.retry']")?.offsetParent === null, undefined, {timeout: 3000});
    const tidyRetriedLatest = await page.evaluate(() => JSON.parse(document.body.dataset.xlcCaptureAiTidyCalls ?? "[]").at(-1) === "更新后的正文");
    if (!tidyRetriedLatest) throw new Error("capture AI tidy retry did not use the latest content");

    const draftInputFailure = page.locator("[data-xlc-control='capture.ai.draft.description']");
    await draftInputFailure.fill("首次描述");
    await page.locator("[data-xlc-control='capture.ai.draft.generate']").click();
    await page.waitForFunction(() => document.querySelector("[data-xlc-control='capture.ai.draft.retry']")?.offsetParent !== null, undefined, {timeout: 3000});
    const draftFailureState = await page.evaluate(() => {
        const error = document.querySelector("[data-xlc-control='capture.ai.draft.error']");
        return error?.getAttribute("role") === "alert" && error?.getAttribute("aria-live") === "assertive"
            && error.textContent.includes("AI 草稿请求暂时失败")
            && document.querySelector("[data-xlc-control='capture.ai.draft.retry']")?.offsetParent !== null
            && document.querySelector("[data-xlc-control='capture.ai.draft.generate']")?.disabled === false;
    });
    if (!draftFailureState) throw new Error("capture AI draft failure state did not expose a readable retry");
    await draftInputFailure.fill("修改后的描述");
    await page.evaluate(() => { window.__xlcAutoConfirm = true; });
    await page.locator("[data-xlc-control='capture.ai.draft.retry']").click();
    await page.waitForFunction(() => document.querySelector("[data-xlc-control='capture.content']")?.value === "草稿（修改后的描述）"
        && document.querySelector("[data-xlc-control='capture.ai.draft.retry']")?.offsetParent === null, undefined, {timeout: 3000});
    await page.evaluate(() => { window.__xlcAutoConfirm = false; });
    const draftRetriedLatest = await page.evaluate(() => JSON.parse(document.body.dataset.xlcCaptureAiDraftCalls ?? "[]").at(-1) === "修改后的描述");
    if (!draftRetriedLatest) throw new Error("capture AI draft retry did not use the latest description");
    console.log("  smoke ✓ capture-ai failure: live errors, retry with latest input, stale suggestion removal");

    await page.locator("[data-xlc-control='capture.cancel']").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-xlc-control='capture.save']").length === 0);
    await page.evaluate(() => window.XlcHarness.openCapture(true, 0, {deferTidy: true}));
    await page.locator("[data-xlc-control='capture.content']").fill("旧表单请求");
    await page.locator("[data-xlc-control='capture.ai.tidy']").click();
    await page.waitForFunction(() => document.body.dataset.xlcDeferredTidyPending === "true", undefined, {timeout: 3000});
    await page.locator("[data-xlc-control='capture.cancel']").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-xlc-control='capture.save']").length === 0);
    await page.evaluate(() => window.XlcHarness.openCapture(true));
    await page.evaluate(() => window.XlcHarness.completeDeferredTidy());
    await page.waitForTimeout(30);
    const lateResponseIsolated = await page.evaluate(() => {
        const row = document.querySelector(".xlc-sugrow");
        return !!row && getComputedStyle(row).display === "none"
            && !document.querySelector(".xlc-capture")?.textContent?.includes("迟到的旧建议");
    });
    if (!lateResponseIsolated) throw new Error("closed capture AI response polluted the newly opened form");
    console.log("  smoke ✓ capture-ai close: late response isolated from reopened form");
    await page.locator("[data-xlc-control='capture.cancel']").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-xlc-control='capture.save']").length === 0);
    await page.evaluate(() => window.XlcHarness.openCapture(false));
    await page.locator("[data-xlc-control='capture.save']").click();
    await page.evaluate(() => {
        const content = document.querySelector("[data-xlc-control='capture.content']");
        content.value = "前后";
        content.setSelectionRange(1, 1);
    });
    const variableIds = ["ask", "ask.options", "ask.textarea", "snippet", "cursor", "date", "date.offset", "random", "doc", "clipboard"];
    const variableTexts = [
        "{{xlc:ask:字段}}", "{{xlc:ask:字段|选项A,选项B}}", "{{xlc:ask:字段|textarea}}", "{{xlc:snippet:标题}}",
        "{{xlc:cursor}}", "{{xlc:date}}", "{{xlc:date|+3d}}", "{{xlc:random|选项A,选项B}}", "{{xlc:doc}}", "{{xlc:clipboard}}",
    ];
    for (const id of variableIds) await page.locator(`[data-xlc-control='capture.variable.${id}']`).click();
    const variableInsertion = await page.evaluate((texts) => {
        const content = document.querySelector("[data-xlc-control='capture.content']");
        const body = `前${texts.join("")}后`;
        return content.value === body
            && document.activeElement === content
            && content.selectionStart === body.length - 1
            && content.selectionEnd === body.length - 1
            && !content.hasAttribute("aria-invalid")
            && !content.hasAttribute("aria-describedby")
            && !content.classList.contains("xlc-input--error");
    }, variableTexts);
    if (!variableInsertion) throw new Error("capture variable templates did not insert at the caret and restore the content field state");
    const selectionReplacement = await page.evaluate(() => {
        const content = document.querySelector("[data-xlc-control='capture.content']");
        content.value = "左侧选中文字右侧";
        content.setSelectionRange(2, 6);
        document.querySelector("[data-xlc-control='capture.variable.date.offset']").click();
        return content.value === "左侧{{xlc:date|+3d}}右侧"
            && document.activeElement === content
            && content.selectionStart === 2 + "{{xlc:date|+3d}}".length
            && content.selectionEnd === content.selectionStart;
    });
    if (!selectionReplacement) throw new Error("capture variable template did not replace the selected text while preserving both sides");
    console.log("  smoke ✓ capture variable bar: all 10 templates, caret, focus and error clearing");
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
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
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
            menuWithinHost: (() => {
                const m = document.querySelector(".xlc-menu");
                const host = document.querySelector(".b3-dialog__container");
                if (!m || !host) return false;
                const mr = m.getBoundingClientRect();
                const hr = host.getBoundingClientRect();
                return mr.bottom <= hr.bottom - 2 && m.scrollHeight >= m.clientHeight;
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
    console.log("  smoke ✓ action-menu: 8 assertions");
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
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
        }
    });
    await page.waitForTimeout(800);
    const variableRowReady = await page.evaluate(() => {
        const row = document.querySelector("[data-xlc-control='item.row']");
        row?.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
        return !!row;
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
    if (!variableRowReady || Object.values(varFormAssertions).some((v) => !v)) {
        throw new Error("variable-form smoke failed: " + JSON.stringify({variableRowReady, ...varFormAssertions}));
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
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
        }
    });
    await page.waitForTimeout(500);
    const emptyAssertions = await page.evaluate(() => {
        const empty = document.querySelector(".xlc-empty");
        const footer = document.querySelector(".xlc-footer");
        empty?.querySelector(".xlc-empty-action")?.click();
        return {
            emptyBlock: !!empty && empty.textContent.includes("没有找到匹配内容"),
        emptyHint: !!empty && empty.textContent.includes("AI 依据标题") && empty.textContent.includes("?"),
            emptyNewItem: !!empty && !!empty.querySelector(".xlc-empty-action")
                && (empty.querySelector(".xlc-empty-action")?.textContent ?? "").includes("新建"),
            queryPrefillsTitle: document.body.dataset.xlcNewItemTitle === "不存在的词条",
            previewCleared: document.querySelector(".xlc-pane-body")?.textContent === "选择左侧条目后，这里会显示预览",
            footerClaim: !!footer && footer.textContent.includes("保存到思源文档"),
            footerCount: !!footer && footer.textContent.includes("库内条目：0 条"),
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
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
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
        const button = Array.from(document.querySelectorAll(".xlc-empty-action"))
            .find((el) => (el.textContent ?? "") === expected);
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
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
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
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
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
            root.style.height = "700px";
            root.style.position = "relative";
        }
        const container = document.querySelector(".b3-dialog__container");
        if (container) {
            container.style.margin = "0 auto";
            container.style.maxWidth = "960px";
        }
    });
    await page.waitForTimeout(500);
    const emptyLibraryGuide = await page.evaluate(() => {
        const empty = document.querySelector(".xlc-empty");
        const help = Array.from(empty?.querySelectorAll(".xlc-empty-action") ?? [])
            .find((el) => (el.textContent ?? "").includes("使用帮助"));
        return {
            explainsNextStep: !!empty && empty.textContent.includes("先新建一条"),
            hasHelp: !!help && (help.textContent ?? "").includes("使用帮助"),
        };
    });
    if (Object.values(emptyLibraryGuide).some((v) => !v)) {
        throw new Error("empty-library onboarding smoke failed: " + JSON.stringify(emptyLibraryGuide));
    }
    console.log("  smoke ✓ empty-library onboarding: 2 assertions");
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
            // 移动端直接插入尚未在真实客户端验证，主操作按产品约束降级为复制。
            footButtons: footBtns.length === 2
                && (footBtns[0].textContent ?? "").includes("新建")
                && (footBtns[1].textContent ?? "").includes("复制"),
            mobileCopyDowngradeExplicit: footBtns[1]?.getAttribute("aria-label")?.includes("移动端直接插入尚未验证") === true
                && footBtns[1]?.title?.includes("当前操作会复制到剪贴板") === true,
        };
    });
    if (Object.values(mobileAssertions).some((v) => !v)) {
        throw new Error("mobile smoke failed: " + JSON.stringify(mobileAssertions));
    }
    const actionsBeforeMobileSelection = await page.evaluate(() => (window.__xlcActions ?? []).length);
    await page.locator(".xlc-dialog--mobile .xlc-row[data-xlc-index='1']").click();
    const mobileSelectionOnly = await page.evaluate((before) => {
        const row = document.querySelector(".xlc-row[data-xlc-index='1']");
        const button = document.querySelector("[data-xlc-control='preview.mobile-primary']");
        return row?.getAttribute("aria-selected") === "true"
            && row.classList.contains("xlc-row--active")
            && !button?.disabled
            && (window.__xlcActions ?? []).length === before;
    }, actionsBeforeMobileSelection);
    if (!mobileSelectionOnly) throw new Error("mobile row tap should select an item without running the primary action");
    const mobileActionsBeforeSubmit = await page.evaluate(() => (window.__xlcActions ?? []).length);
    await page.locator("[data-xlc-control='preview.mobile-primary']").click();
    await page.waitForFunction((before) => (window.__xlcActions ?? []).length === before + 1, mobileActionsBeforeSubmit, {timeout: 3000});
    const mobileSelectedAction = await page.evaluate(() => (window.__xlcActions ?? []).at(-1));
    if (mobileSelectedAction?.id !== "xlc-demo0000003" || mobileSelectedAction?.mode !== "copy") {
        throw new Error("mobile primary action did not use the selected item: " + JSON.stringify(mobileSelectedAction));
    }
    await page.waitForTimeout(120);
    console.log("  smoke ✓ mobile: 6 assertions");
    await page.screenshot({path: path.join(OUT, "production-mobile-light.png")});

    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDialog({mobile: true, query: "SQL", insertTarget: {docId: "20240101120001-hijklmn", hPath: "/工作手册/客服话术"}});
        const root = document.querySelector(".b3-dialog");
        if (root) stage.appendChild(root);
        const container = document.querySelector(".b3-dialog__container");
        if (container) container.style.height = "82vh";
    });
    await page.waitForTimeout(300);
    const mobileTargetAction = await page.evaluate(() => {
        const button = document.querySelector("[data-xlc-control='preview.mobile-primary']");
        return button?.textContent?.includes("插入选中") === true
            && !button?.hasAttribute("aria-label")
            && !button?.title?.includes("移动端直接插入尚未验证");
    });
    if (!mobileTargetAction) throw new Error("mobile targeted insertion should show its explicit target action without the no-target copy fallback");
    const targetedActionsBefore = await page.evaluate(() => (window.__xlcDocActions ?? []).length);
    await page.locator("[data-xlc-control='preview.mobile-primary']").click();
    await page.waitForFunction((before) => (window.__xlcDocActions ?? []).length === before + 1, targetedActionsBefore, {timeout: 3000});
    const targetAction = await page.evaluate(() => (window.__xlcDocActions ?? []).at(-1));
    if (targetAction?.id !== "xlc-demo0000003" || targetAction?.docId !== "20240101120001-hijklmn" || targetAction?.hPath !== "/工作手册/客服话术") {
        throw new Error("mobile targeted primary action missed its selected target: " + JSON.stringify(targetAction));
    }
    await page.setViewportSize({width: 1280, height: 720});
    // 按需发现：扫描状态、候选预览、筛选和收录按钮禁用语义
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        document.querySelectorAll(".b3-dialog").forEach((el) => el.remove());
        stage.innerHTML = "";
        window.XlcHarness.openDiscovery();
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    // The initial scan is asynchronous even in the harness. A fixed delay can
    // race the scan completion on a busy CI host, leaving the list/landmarks or
    // final status in their loading state when the smoke assertions run.
    await page.waitForFunction(() => {
        const root = document.querySelector(".xlc-discovery");
        const readyScan = root?.querySelector("[data-xlc-discovery-action='retry-scan']");
        const rows = root?.querySelectorAll(".xlc-discovery-list [role='list'] .xlc-discovery-row").length ?? 0;
        return !!root && root.getAttribute("aria-busy") === "false" && !!readyScan && rows === 2;
    }, undefined, {timeout: 3000});
    const discoveryAssertions = await page.evaluate(() => {
        const root = document.querySelector(".xlc-discovery");
        const rows = Array.from(document.querySelectorAll(".xlc-discovery-row"));
        const batch = document.querySelector("[data-xlc-discovery-action='add-selected']");
        const scope = document.querySelector(".xlc-discovery-scope-select");
        const filters = root?.querySelector(".xlc-discovery-filters");
        const close = document.querySelector("[data-xlc-discovery-action='close']");
        const pager = root?.querySelector(".xlc-discovery-pager");
        const dialogContainer = document.querySelector(".b3-dialog__container");
        const dialogHeader = document.querySelector(".xlc-discovery-host .b3-dialog__header");
        const rootRect = root?.getBoundingClientRect();
        const titleRect = root?.querySelector(".xlc-discovery-heading .xlc-form-title")?.getBoundingClientRect();
        const scopeRect = root?.querySelector(".xlc-discovery-scope-row")?.getBoundingClientRect();
        return {
            root: !!root,
            rows: rows.length === 2,
            discoveryResultsHaveValidLandmarks: root?.querySelector(".xlc-discovery-list")?.getAttribute("role") === "region"
                && root?.querySelector(".xlc-discovery-list [role='list'] .xlc-discovery-row[role='listitem']") !== null
                && (!pager || pager.closest("[role='list']") === null),
            addDisabledWithoutSelection: !!batch && (batch instanceof HTMLButtonElement) && batch.disabled,
            defaultCategoryReady: root?.querySelector("[data-xlc-discovery-action='default-category']")?.value === "待整理",
            candidateCategoryLocked: root?.querySelector("[data-xlc-discovery-action='candidate-category']")?.disabled === true,
            categoryHintVisible: !!root?.querySelector(".xlc-discovery-category-settings .xlc-form-hint")?.textContent?.includes("默认使用此分类"),
            customCloseAvailable: close instanceof HTMLButtonElement && !close.disabled,
            hostCloseDisabled: dialogContainer instanceof HTMLElement && dialogContainer.dataset.disableClose === "true",
            duplicateHostHeaderHidden: !dialogHeader || getComputedStyle(dialogHeader).display === "none",
            headingAndScopeDoNotOverlap: !!titleRect && !!scopeRect && titleRect.bottom <= scopeRect.top + 1,
            headingAndScopeVisible: !!rootRect && !!titleRect && !!scopeRect
                && titleRect.width > 0 && titleRect.height > 0
                && scopeRect.width > 0 && scopeRect.height > 0
                && titleRect.top >= rootRect.top - 1 && titleRect.bottom <= rootRect.bottom + 1
                && scopeRect.top >= rootRect.top - 1 && scopeRect.bottom <= rootRect.bottom + 1,
            discoveryRootDoesNotScroll: root instanceof HTMLElement && root.scrollTop === 0,
            desktopFiltersStayCompact: filters instanceof HTMLElement && filters.getBoundingClientRect().height <= 50,
            statuses: rows.map((row) => row.textContent ?? "").some((text) => text.includes("待收录")) && rows.map((row) => row.textContent ?? "").some((text) => text.includes("内容相同")),
            scopeOptions: scope instanceof HTMLSelectElement
                && scope.options.length === 5
                && Array.from(scope.options).slice(1).every((option) => !option.disabled),
        };
    });
    if (Object.values(discoveryAssertions).some((v) => !v)) {
        throw new Error("discovery smoke failed: " + JSON.stringify(discoveryAssertions));
    }
    await page.locator(".xlc-discovery-filters [data-xlc-control='discovery.filter.text']").fill("无匹配候选");
    const discoveryEmptyList = await page.evaluate(() => {
        const list = document.querySelector(".xlc-discovery-list [role='list']");
        const empty = list?.querySelector(".xlc-discovery-empty");
        return {
            listRole: list?.getAttribute("role"),
            emptyRole: empty?.getAttribute("role"),
            clearAction: empty?.querySelector("[data-xlc-discovery-action='clear-filters']")?.textContent,
        };
    });
    if (discoveryEmptyList.listRole !== "list" || discoveryEmptyList.emptyRole !== "listitem"
        || !discoveryEmptyList.clearAction) {
        throw new Error("discovery filtered-empty list semantics failed: " + JSON.stringify(discoveryEmptyList));
    }
    await page.locator("[data-xlc-discovery-action='clear-filters']").click();
    if (await page.locator(".xlc-discovery-row").count() !== 2) {
        throw new Error("discovery clear-filters action did not restore candidates");
    }
    console.log("  smoke ✓ on-demand discovery empty-list semantics and filter recovery");
    await page.locator(".xlc-discovery-scope-select").selectOption("notebook");
    await page.waitForTimeout(20);
    const notebookProgressAssertion = await page.locator(".xlc-discovery-status-row").textContent();
    if (!notebookProgressAssertion?.includes("扫描文档 1 / 3，已读取 4 个块")) {
        throw new Error("notebook discovery progress smoke failed: " + notebookProgressAssertion);
    }
    await page.locator("[data-xlc-discovery-action='cancel-scan']").click();
    await page.waitForFunction(() => {
        const button = document.querySelector("[data-xlc-discovery-action='cancel-scan']");
        const status = document.querySelector(".xlc-discovery-status-row")?.textContent ?? "";
        return button?.hasAttribute("disabled") === true || status.includes("已停止扫描");
    }, undefined, {timeout: 2000});
    const stopPending = await page.evaluate(() => ({
        busy: document.querySelector(".xlc-discovery")?.getAttribute("aria-busy") === "true",
        disabled: document.querySelector("[data-xlc-discovery-action='cancel-scan']")?.hasAttribute("disabled") === true,
        status: document.querySelector(".xlc-discovery-status-row")?.textContent ?? "",
    }));
    const isWaiting = stopPending.busy && stopPending.disabled && stopPending.status.includes("当前已发出的内核请求结束后");
    const isStopped = stopPending.status.includes("已停止扫描");
    if (!isWaiting && !isStopped) {
        throw new Error("discovery stop should wait for the current request: " + JSON.stringify(stopPending));
    }
    const closeDuringScan = await page.locator("[data-xlc-discovery-action='close']").isDisabled();
    if (closeDuringScan) throw new Error("discovery close should remain available during scanning");
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-status-row")?.textContent?.includes("已停止扫描，保留 2 条候选") === true);
    const notebookScopeAssertion = await page.evaluate(() => {
        const root = document.querySelector(".xlc-discovery");
        const text = root?.textContent ?? "";
        return {
            pass: text.includes("从当前笔记本发现")
                && text.includes("扫描文档 3 个")
                && text.includes("扫描当前文档所属笔记本")
                && !!root?.querySelector(".xlc-discovery-row[data-xlc-discovery-key='candidate-1']"),
            text,
        };
    });
    if (!notebookScopeAssertion.pass) throw new Error("notebook discovery scope smoke failed: " + JSON.stringify(notebookScopeAssertion));
    await page.locator(".xlc-discovery-scope-select").selectOption("tree");
    await page.locator(".xlc-discovery-scope-target input").fill("项目");
    await page.locator(".xlc-discovery-scope-target button").click();
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-scope-target select option[value='20240101120001-hijklmn']"));
    const treeSearchSuccessStatus = await page.locator(".xlc-discovery-status-row").innerText();
    if (!treeSearchSuccessStatus.includes("请先选择或确认扫描目标")) throw new Error("tree search success must ask for a target, not a scope: " + JSON.stringify(treeSearchSuccessStatus));
    await page.locator(".xlc-discovery-scope-target select").selectOption("20240101120001-hijklmn");
    await page.waitForFunction(() => document.body.dataset.xlcDiscoveryTargetDoc === "20240101120001-hijklmn");
    await page.locator(".xlc-discovery-scope-target input").fill("旧项目");
    await page.locator(".xlc-discovery-scope-target button").click();
    await page.locator(".xlc-discovery-scope-target input").fill("新项目");
    await page.locator(".xlc-discovery-scope-target button").click();
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-scope-target select option[value='20240102120001-qrstuvw']"));
    await page.waitForTimeout(150);
    const treeTargetAfterSearch = await page.evaluate(() => ({
        selected: document.querySelector(".xlc-discovery-scope-target select")?.value,
        options: Array.from(document.querySelectorAll(".xlc-discovery-scope-target select option"), (option) => option.value),
        scanDisabled: document.querySelector("[data-xlc-discovery-action='retry-scan']")?.hasAttribute("disabled"),
    }));
    if (treeTargetAfterSearch.selected !== "" || treeTargetAfterSearch.options.join(",") !== ",20240102120001-qrstuvw" || !treeTargetAfterSearch.scanDisabled) {
        throw new Error("new tree search must clear the previous target until the user selects a result: " + JSON.stringify(treeTargetAfterSearch));
    }
    await page.locator(".xlc-discovery-scope-target select").selectOption("20240102120001-qrstuvw");
    await page.waitForFunction(() => document.body.dataset.xlcDiscoveryTargetDoc === "20240102120001-qrstuvw");
    await page.locator(".xlc-discovery-scope-target input").fill("无结果");
    const scanDisabledWhileKeywordChanges = await page.locator("[data-xlc-discovery-action='retry-scan']").isDisabled();
    if (!scanDisabledWhileKeywordChanges) throw new Error("changing the tree query must immediately disable scanning the old root");
    await page.locator(".xlc-discovery-scope-target button").click();
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-status-row")?.textContent?.includes("没有找到匹配的文档"));
    const treeTargetAfterEmptySearch = await page.evaluate(() => ({
        selected: document.querySelector(".xlc-discovery-scope-target select")?.value,
        scanDisabled: document.querySelector("[data-xlc-discovery-action='retry-scan']")?.hasAttribute("disabled"),
        resultsHidden: document.querySelector(".xlc-discovery-scope-target select")?.hasAttribute("hidden"),
    }));
    if (treeTargetAfterEmptySearch.selected !== "" || !treeTargetAfterEmptySearch.scanDisabled || !treeTargetAfterEmptySearch.resultsHidden) {
        throw new Error("empty tree search must clear the previous target and disable scanning: " + JSON.stringify(treeTargetAfterEmptySearch));
    }
    await page.locator(".xlc-discovery-scope-select").selectOption("selected-notebook");
    await page.locator(".xlc-discovery-scope-target select").selectOption("20240102");
    await page.waitForFunction(() => document.body.dataset.xlcDiscoveryScopeUsed === "selected-notebook");
    await page.locator(".xlc-discovery-scope-select").selectOption("all-notebooks");
    const allNotebookWarning = await page.locator(".xlc-discovery-notice").textContent();
    if (!allNotebookWarning?.includes("候选文本累计")
        || !allNotebookWarning.includes("文档和块按顺序读取")
        || !allNotebookWarning.includes("最多 4 路并发")) {
        throw new Error("all-notebooks budget warning is inaccurate: " + allNotebookWarning);
    }
    const allScanInitiallyDisabled = await page.locator("[data-xlc-discovery-action='retry-scan']").isDisabled();
    if (!allScanInitiallyDisabled) throw new Error("all-notebooks scan must require confirmation");
    await page.locator(".xlc-discovery-all-confirm input").check();
    await page.locator("[data-xlc-discovery-action='retry-scan']").click();
    await page.waitForFunction(() => document.body.dataset.xlcDiscoveryScopeUsed === "all-confirmed");
    await page.locator(".xlc-discovery-scope-select").selectOption("document");
    await page.waitForTimeout(100);
    await page.locator(".xlc-discovery-row[data-xlc-discovery-key='candidate-1']").click();
    await page.waitForTimeout(100);
    const discoveryPreview = await page.locator(".xlc-discovery-preview-body").textContent();
    if (!discoveryPreview || !discoveryPreview.includes("交付延期")) {
        throw new Error("discovery preview smoke failed");
    }
    await page.locator("[data-xlc-discovery-action='default-category']").fill("批量分类");
    await page.locator("[data-xlc-discovery-action='candidate-category']").fill("本条分类");
    await page.locator("[data-xlc-discovery-action='category-reset']").click();
    const resetCategory = await page.locator("[data-xlc-discovery-action='candidate-category']").inputValue();
    if (resetCategory !== "批量分类") throw new Error("candidate category reset should follow the default category");
    await page.locator("[data-xlc-discovery-action='candidate-category']").fill("本条分类");
    await page.locator("[data-xlc-discovery-key='candidate-1'] [data-xlc-discovery-action='add-one']").click();
    await page.locator("[data-xlc-discovery-action='undo-batch']").waitFor({state: "visible"});
    const singleCategory = await page.evaluate(() => window.__xlcDiscoveryCategories?.at(-1));
    if (singleCategory?.key !== "candidate-1" || singleCategory.category !== "本条分类") {
        throw new Error("single discovery add should pass the candidate category override: " + JSON.stringify(singleCategory));
    }
    await page.locator("[data-xlc-discovery-action='undo-batch']").click();
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-receipt")?.textContent?.includes("已撤销新增 1 条；已跳过 1 条"));
    await page.locator(".xlc-discovery-row[data-xlc-discovery-key='candidate-1'] input[type='checkbox']").check();
    await page.locator(".xlc-discovery-row[data-xlc-discovery-key='candidate-2'] input[type='checkbox']").check();
    await page.locator(".xlc-discovery-force input[type='checkbox']").check();
    await page.locator("[data-xlc-discovery-action='add-selected']").click();
    await page.waitForFunction(() => document.querySelector("[data-xlc-discovery-action='close']")?.disabled === true);
    const closeDuringAdd = await page.locator("[data-xlc-discovery-action='close']").isDisabled();
    if (!closeDuringAdd) throw new Error("discovery close should be disabled while adding candidates");
    const categoryControlsDisabledDuringAdd = await page.evaluate(() =>
        document.querySelector("[data-xlc-discovery-action='default-category']")?.disabled === true
            && document.querySelector("[data-xlc-discovery-action='candidate-category']")?.disabled === true,
    );
    if (!categoryControlsDisabledDuringAdd) throw new Error("category controls should be locked during batch add");
    await page.waitForFunction(() => (window.__xlcDiscoveryCategories?.length ?? 0) >= 3);
    const batchCategories = await page.evaluate(() => window.__xlcDiscoveryCategories?.slice(-2));
    if (batchCategories?.[0]?.key !== "candidate-1" || batchCategories[0].category !== "本条分类"
        || batchCategories[1]?.key !== "candidate-2" || batchCategories[1].category !== "批量分类") {
        throw new Error("batch discovery should prefer per-candidate categories and use the default otherwise: " + JSON.stringify(batchCategories));
    }
    await page.locator("[data-xlc-discovery-action='undo-batch']").waitFor({state: "visible"});
    // 收录回执与批次令牌在同一微任务中提交；等待关闭锁同步完成，避免把回执出现的瞬间误判为仍在写入。
    await page.waitForFunction(() => document.querySelector("[data-xlc-discovery-action='close']")?.disabled === false);
    if (await page.locator("[data-xlc-discovery-action='close']").isDisabled()) {
        throw new Error("discovery close should be available after adding candidates");
    }
    await page.locator("[data-xlc-discovery-action='undo-batch']").click();
    await page.waitForFunction(() => document.querySelector("[data-xlc-discovery-action='close']")?.disabled === true);
    const closeDuringUndo = await page.locator("[data-xlc-discovery-action='close']").isDisabled();
    if (!closeDuringUndo) throw new Error("discovery close should be disabled while undoing candidates");
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-receipt")?.textContent?.includes("已撤销新增 1 条；已跳过 1 条"));
    const discoveryUndoAssertion = await page.evaluate(() => {
        const deletedRow = document.querySelector(".xlc-discovery-row[data-xlc-discovery-key='candidate-1']");
        const missingRow = document.querySelector(".xlc-discovery-row[data-xlc-discovery-key='candidate-2']");
        return !!deletedRow && deletedRow.textContent?.includes("待收录") === true
            && !!missingRow && missingRow.textContent?.includes("待收录") === true
            && document.querySelector("[data-xlc-discovery-action='close']")?.disabled === false
            && !document.querySelector("[data-xlc-discovery-action='undo-batch']");
    });
    if (!discoveryUndoAssertion) throw new Error("discovery batch undo smoke failed");
    const finalDiscoveryGeometry = await page.evaluate(() => {
        const root = document.querySelector(".xlc-discovery");
        const list = root?.querySelector(".xlc-discovery-list");
        const rows = Array.from(root?.querySelectorAll(".xlc-discovery-row") ?? []);
        const selectors = [".xlc-discovery-heading .xlc-form-title", ".xlc-discovery-scope-row"];
        const rect = (element) => {
            if (!(element instanceof HTMLElement)) return null;
            const {top, right, bottom, left} = element.getBoundingClientRect();
            return {top, right, bottom, left};
        };
        return {
            root: rect(root), rootScrollTop: root?.scrollTop,
            rootOverflow: root ? getComputedStyle(root).overflowY : null,
            title: rect(root?.querySelector(selectors[0])), scope: rect(root?.querySelector(selectors[1])),
            list: rect(list), lastCandidate: rect(rows.at(-1)),
            lastCandidateFullyVisible: !!list && !!rows.at(-1)
                && rows.at(-1).getBoundingClientRect().bottom <= list.getBoundingClientRect().bottom - 1,
            body: rect(document.querySelector(".xlc-discovery-host .b3-dialog__body")),
            bodyScrollTop: document.querySelector(".xlc-discovery-host .b3-dialog__body")?.scrollTop,
            content: rect(document.querySelector(".xlc-discovery-host .b3-dialog__content")),
            contentScrollTop: document.querySelector(".xlc-discovery-host .b3-dialog__content")?.scrollTop,
        };
    });
    const geometryRoot = finalDiscoveryGeometry.root;
    const geometryTitle = finalDiscoveryGeometry.title;
    const geometryScope = finalDiscoveryGeometry.scope;
    let lastCandidateReachable = finalDiscoveryGeometry.lastCandidateFullyVisible;
    if (!lastCandidateReachable) {
        lastCandidateReachable = await page.locator(".xlc-discovery-list").evaluate((list, row) => {
            if (!(list instanceof HTMLElement) || !(row instanceof HTMLElement)) return false;
            list.scrollTop = list.scrollHeight;
            return row.getBoundingClientRect().bottom <= list.getBoundingClientRect().bottom + 1
                && list.scrollTop > 0;
        }, await page.locator(".xlc-discovery-row").last().elementHandle());
    }
    if (!geometryRoot || !geometryTitle || !geometryScope
        || geometryTitle.top < geometryRoot.top - 1 || geometryTitle.bottom > geometryRoot.bottom + 1
        || geometryScope.top < geometryRoot.top - 1 || geometryScope.bottom > geometryRoot.bottom + 1
        || !lastCandidateReachable
        || finalDiscoveryGeometry.rootScrollTop !== 0) {
        throw new Error("discovery heading clipped after add/undo: " + JSON.stringify(finalDiscoveryGeometry));
    }
    await page.screenshot({path: path.join(OUT, "production-discovery-light.png")});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(80);
    const mobileDiscoveryLayout = await page.evaluate(() => {
        const root = document.querySelector(".xlc-discovery");
        const preview = root?.querySelector(".xlc-discovery-preview");
        const list = root?.querySelector(".xlc-discovery-list");
        const settings = root?.querySelector(".xlc-discovery-category-settings");
        const candidateRow = root?.querySelector(".xlc-discovery-candidate-category");
        const defaultInput = settings?.querySelector("[data-xlc-discovery-action='default-category']");
        const controls = [
            candidateRow?.querySelector("[data-xlc-discovery-action='candidate-category']"),
            candidateRow?.querySelector("[data-xlc-discovery-action='category-reset']"),
        ];
        const rect = (element) => element instanceof HTMLElement ? element.getBoundingClientRect() : null;
        const rootRect = rect(root);
        const previewRect = rect(preview);
        const listRect = rect(list);
        const settingsRect = rect(settings);
        const rowRect = rect(candidateRow);
        const controlRects = controls.map(rect);
        const rowStyle = candidateRow ? getComputedStyle(candidateRow) : null;
        const labelStyle = candidateRow?.querySelector(".xlc-form-label") ? getComputedStyle(candidateRow.querySelector(".xlc-form-label")) : null;
        const inputStyle = controls[0] ? getComputedStyle(controls[0]) : null;
        return {
            fitsViewport: !!rootRect && rootRect.left >= -1 && rootRect.right <= window.innerWidth + 1,
            noHorizontalPageOverflow: document.documentElement.scrollWidth <= window.innerWidth,
            categorySettingsVisible: !!settingsRect && settingsRect.width > 0 && settingsRect.right <= window.innerWidth + 1
                && !!rect(defaultInput) && rect(defaultInput).width > 0 && rect(defaultInput).right <= settingsRect.right + 1,
            // 手机端发现采用根滚动；预览不必在首屏完整露出，但正文区域和后续操作必须可滚动到。
            previewVisible: !!previewRect && previewRect.width > 0,
            previewBodyUseful: (() => {
                const body = root?.querySelector(".xlc-discovery-preview-body");
                return !!body && body.getBoundingClientRect().height >= 120;
            })(),
            rootCanReachPreview: !!root && root.scrollHeight > root.clientHeight,
            candidateListVisible: !!listRect && listRect.height >= 120 && root?.querySelectorAll(".xlc-discovery-row").length === 2,
            candidateControlsVisible: !!rowRect && controlRects.every((item) => !!item && item.width > 0 && item.left >= rowRect.left - 1 && item.right <= rowRect.right + 1),
            candidateControlRects: controlRects.map((item) => item && ({left: item.left, right: item.right, width: item.width})),
            candidateRowRect: rowRect && ({left: rowRect.left, right: rowRect.right, width: rowRect.width}),
            candidateFlexStyle: {wrap: rowStyle?.flexWrap, labelBasis: labelStyle?.flexBasis, inputFlex: inputStyle?.flex, inputWidth: inputStyle?.width},
            candidateControlsDoNotOverlap: !!controlRects[0] && !!controlRects[1]
                && controlRects[0].right <= controlRects[1].left + 1,
        };
    });
    if (Object.entries(mobileDiscoveryLayout).some(([key, value]) => key !== "previewVisible" && !value)) {
        throw new Error("mobile discovery category controls overlap or overflow: " + JSON.stringify(mobileDiscoveryLayout));
    }
    await page.screenshot({path: path.join(OUT, "production-discovery-mobile-light.png")});
    await page.setViewportSize({width: 1280, height: 720});
    await page.waitForTimeout(50);
    await page.evaluate(() => { document.body.dataset.xlcDiscoveryCloseConflict = "true"; });
    await page.locator("[data-xlc-discovery-action='close']").click();
    const closeConflictPreservesDialog = await page.evaluate(() =>
        !!document.querySelector(".xlc-discovery")
            && document.querySelector(".xlc-discovery-receipt")?.textContent?.includes("有收录正在写入内容库") === true,
    );
    if (!closeConflictPreservesDialog) throw new Error("discovery close conflict should keep the current dialog and show guidance");
    await page.evaluate(() => {
        document.body.dataset.xlcDiscoveryCloseConflict = "false";
        window.XlcHarness.closeDiscovery();
    });
    const discoveryProgrammaticClose = await page.evaluate(() =>
        !document.querySelector(".xlc-discovery") && document.body.dataset.xlcDiscoverySessionClosed === "true",
    );
    if (!discoveryProgrammaticClose) throw new Error("programmatic discovery close failed with disableClose enabled");
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        stage.innerHTML = "";
        window.XlcHarness.openDiscovery({notebookLoadErrorOnce: true});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.locator(".xlc-discovery-scope-select").selectOption("selected-notebook");
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-status-row")?.textContent?.includes("笔记本列表加载失败：思源请求未完成"));
    const notebookLoadFailure = await page.evaluate(() => ({
        selectDisabled: document.querySelector(".xlc-discovery-scope-target select")?.hasAttribute("disabled"),
        retryVisible: document.querySelector("[data-xlc-discovery-action='retry-notebooks']")?.hasAttribute("hidden") === false,
    }));
    if (!notebookLoadFailure.selectDisabled || !notebookLoadFailure.retryVisible) {
        throw new Error("notebook load failure must preserve an enabled retry action: " + JSON.stringify(notebookLoadFailure));
    }
    await page.locator("[data-xlc-discovery-action='retry-notebooks']").click();
    await page.waitForFunction(() => {
        const select = document.querySelector(".xlc-discovery-scope-target select");
        return select instanceof HTMLSelectElement && !select.disabled && select.options.length === 3;
    });
    const notebookLoadRecovery = await page.evaluate(() => ({
        selectEnabled: document.querySelector(".xlc-discovery-scope-target select")?.hasAttribute("disabled") === false,
        retryHidden: document.querySelector("[data-xlc-discovery-action='retry-notebooks']")?.hasAttribute("hidden"),
    }));
    if (!notebookLoadRecovery.selectEnabled || !notebookLoadRecovery.retryHidden) {
        throw new Error("notebook retry must restore the selectable list: " + JSON.stringify(notebookLoadRecovery));
    }
    await page.locator(".xlc-discovery-scope-target select").selectOption("20240101");
    await page.waitForFunction(() => document.body.dataset.xlcDiscoveryTargetNotebook === "20240101");
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        stage.innerHTML = "";
        window.XlcHarness.openDiscovery({emptyNotebookList: true});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.locator(".xlc-discovery-scope-select").selectOption("selected-notebook");
    await page.waitForFunction(() => document.querySelector(".xlc-discovery-status-row")?.textContent?.includes("当前没有可扫描的笔记本"));
    const emptyNotebookState = await page.evaluate(() => ({
        selectDisabled: document.querySelector(".xlc-discovery-scope-target select")?.hasAttribute("disabled"),
        retryHidden: document.querySelector("[data-xlc-discovery-action='retry-notebooks']")?.hasAttribute("hidden"),
    }));
    if (!emptyNotebookState.selectDisabled || emptyNotebookState.retryHidden) {
        throw new Error("empty notebook list must show its own unavailable state and retry action: " + JSON.stringify(emptyNotebookState));
    }
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        stage.innerHTML = "";
        window.XlcHarness.openDiscovery({initialTreeRoot: true});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    await page.waitForFunction(() => document.body.dataset.xlcDiscoveryScopeUsed === "tree"
        && document.body.dataset.xlcDiscoveryTargetDoc === "20240101120001-hijklmn");
    const initialTreeTarget = await page.evaluate(() => ({
        scope: document.querySelector(".xlc-discovery-scope-select")?.value,
        selected: document.querySelector(".xlc-discovery-scope-target select")?.value,
        title: document.querySelector(".xlc-discovery-heading .xlc-form-title")?.textContent,
        path: document.querySelector(".xlc-discovery-scope")?.textContent,
    }));
    if (initialTreeTarget.scope !== "tree"
        || initialTreeTarget.selected !== "20240101120001-hijklmn"
        || initialTreeTarget.title !== "从此文档发现常用语"
        || !initialTreeTarget.path?.includes("/项目笔记")) {
        throw new Error("document-tree discovery entry must preserve and display the clicked root: " + JSON.stringify(initialTreeTarget));
    }
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    await page.evaluate(() => {
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        stage.innerHTML = "";
        window.XlcHarness.openDiscovery({candidateCount: 205});
        const dialogRoot = document.querySelector(".b3-dialog");
        if (dialogRoot) stage.appendChild(dialogRoot);
    });
    const nextPageButton = page.locator("[data-xlc-control='discovery.page.next']");
    await nextPageButton.focus();
    await page.keyboard.press("Enter");
    const secondDiscoveryPage = await page.evaluate(() => ({
        page: document.querySelector(".xlc-discovery-pager")?.textContent,
        firstTitle: document.querySelector(".xlc-discovery-row-title")?.textContent,
        activeControl: (document.activeElement instanceof HTMLElement ? document.activeElement.dataset.xlcControl : ""),
        pagerRole: document.querySelector(".xlc-discovery-pager")?.getAttribute("role"),
        pagerLabel: document.querySelector(".xlc-discovery-pager")?.getAttribute("aria-label"),
        pageStatusRole: document.querySelector(".xlc-discovery-page-label")?.getAttribute("role"),
        pageStatusLive: document.querySelector(".xlc-discovery-page-label")?.getAttribute("aria-live"),
        pageStatusAtomic: document.querySelector(".xlc-discovery-page-label")?.getAttribute("aria-atomic"),
    }));
    if (!secondDiscoveryPage.page?.includes("第 2 / 3 页")
        || secondDiscoveryPage.firstTitle !== "分页候选 101"
        || secondDiscoveryPage.activeControl !== "discovery.page.next"
        || secondDiscoveryPage.pagerRole !== "navigation"
        || !secondDiscoveryPage.pagerLabel
        || secondDiscoveryPage.pageStatusRole !== "status"
        || secondDiscoveryPage.pageStatusLive !== "polite"
        || secondDiscoveryPage.pageStatusAtomic !== "true") {
        throw new Error("discovery next-page keyboard focus was not preserved: " + JSON.stringify(secondDiscoveryPage));
    }
    await page.keyboard.press("Enter");
    const lastDiscoveryPage = await page.evaluate(() => ({
        page: document.querySelector(".xlc-discovery-pager")?.textContent,
        firstTitle: document.querySelector(".xlc-discovery-row-title")?.textContent,
        previousFocused: document.activeElement instanceof HTMLElement
            && document.activeElement.dataset.xlcControl === "discovery.page.previous",
        nextDisabled: document.querySelector("[data-xlc-control='discovery.page.next']")?.hasAttribute("disabled"),
    }));
    if (!lastDiscoveryPage.page?.includes("第 3 / 3 页")
        || lastDiscoveryPage.firstTitle !== "分页候选 201"
        || !lastDiscoveryPage.previousFocused
        || !lastDiscoveryPage.nextDisabled) {
        throw new Error("discovery last-page focus did not move to the available pager: " + JSON.stringify(lastDiscoveryPage));
    }
    await page.keyboard.press("Enter");
    const previousDiscoveryPage = await page.evaluate(() => ({
        page: document.querySelector(".xlc-discovery-pager")?.textContent,
        firstTitle: document.querySelector(".xlc-discovery-row-title")?.textContent,
        previousFocused: document.activeElement instanceof HTMLElement
            && document.activeElement.dataset.xlcControl === "discovery.page.previous",
    }));
    if (!previousDiscoveryPage.page?.includes("第 2 / 3 页")
        || previousDiscoveryPage.firstTitle !== "分页候选 101"
        || !previousDiscoveryPage.previousFocused) {
        throw new Error("discovery previous-page keyboard focus was not preserved: " + JSON.stringify(previousDiscoveryPage));
    }
    await page.keyboard.press("Enter");
    const firstDiscoveryPage = await page.evaluate(() => ({
        page: document.querySelector(".xlc-discovery-pager")?.textContent,
        firstTitle: document.querySelector(".xlc-discovery-row-title")?.textContent,
        nextFocused: document.activeElement instanceof HTMLElement
            && document.activeElement.dataset.xlcControl === "discovery.page.next",
    }));
    if (!firstDiscoveryPage.page?.includes("第 1 / 3 页")
        || firstDiscoveryPage.firstTitle !== "分页候选 001"
        || !firstDiscoveryPage.nextFocused) {
        throw new Error("discovery first-page focus did not move to the available pager: " + JSON.stringify(firstDiscoveryPage));
    }
    await page.evaluate(() => window.XlcHarness.closeDiscovery());
    console.log("  smoke ✓ on-demand discovery: scope, category, responsive layouts and 4 keyboard pager transitions");
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
    const prototypeParity = await prototypePage.evaluate(() => {
        const sections = Array.from(document.querySelectorAll("body > section"));
        const capture = sections.find((section) => section.querySelector("h2")?.textContent?.includes("屏 3 · 捕获表单"));
        const captureFrames = Array.from(capture?.querySelectorAll(".pair > .frame.t-light, .pair > .frame.t-dark") ?? []);
        const captureFormsMatch = captureFrames.length === 2 && captureFrames.every((frame) => {
            const labels = Array.from(frame.querySelectorAll(".form .fld label")).map((label) => label.textContent ?? "");
            const alias = labels.findIndex((label) => label.includes("别名"));
            const type = labels.findIndex((label) => label.includes("类型"));
            const title = labels.findIndex((label) => label.includes("标题"));
            return title >= 0 && alias > title && type > alias && !!frame.querySelector(".form select");
        });
        const mobile = sections.find((section) => section.querySelector("h2")?.textContent?.includes("屏 7 · 移动端"));
        const phones = Array.from(mobile?.querySelectorAll(".phone") ?? []);
        const mobileThemesMatch = phones.length === 2 && phones.every((phone) =>
            !!phone.querySelector(".sheet")
            && Array.from(phone.querySelectorAll(".sheet-foot button")).some((button) => button.textContent?.includes("复制选中"))
            && phone.textContent.includes("点按选择条目"));
        const aiRecoveryMirrored = capture?.querySelectorAll(".capture-contracts > .capture-contract strong").length >= 14
            && Array.from(capture.querySelectorAll(".capture-contracts")).every((theme) => theme.textContent.includes("失败后重试"));
        const accessRecoveryMirrored = document.querySelectorAll(".access-state-grid .access-state").length === 4
            && document.querySelector(".access-state-grid")?.textContent.includes("登录状态失效")
            && document.querySelector(".access-state-grid")?.textContent.includes("访问权限不足")
            && document.querySelector(".access-state-grid--dark")?.querySelectorAll(".access-state").length === 2;
        return {captureFormsMatch, mobileThemesMatch, aiRecoveryMirrored, accessRecoveryMirrored};
    });
    if (Object.values(prototypeParity).some((value) => !value)) throw new Error("prototype parity smoke failed: " + JSON.stringify(prototypeParity));
    console.log("  smoke ✓ prototype parity: capture fields, mobile selection/copy, AI and access failure recovery");
    for (const [heading, file] of [
        ["屏 1 · 桌面搜索弹窗", "prototype-desktop-dialog.png"],
        ["屏 1 空态 · 未命中", "prototype-empty-state.png"],
        ["屏 5 · 设置", "prototype-settings.png"],
        ["屏 6 · 首跑引导", "prototype-setup.png"],
        ["屏 7 · 移动端", "prototype-mobile-sheet.png"],
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
