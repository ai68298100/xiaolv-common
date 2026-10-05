// 生产 UI 效果渲染：真实 dist/index.css + 生产 dialog.ts 装配的 DOM（假数据驱动）→ 截图。
// 这是「生产达到原型质感」的证据链：DOM 与样式均来自构建产物，非原型 HTML。
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
.b3-dialog__header { padding: 12px 16px 4px; font-weight: 600; }
.b3-button { border: 1px solid var(--b3-border-color); background: var(--b3-theme-background); color: var(--b3-theme-on-background); border-radius: 8px; padding: 4px 12px; font-size: 12.5px; cursor: pointer; }
.b3-button--small { padding: 2px 8px; }
.b3-button--text { border-color: transparent; background: transparent; }
.b3-select { border: 1px solid var(--b3-border-color); background: var(--b3-theme-surface); color: var(--b3-theme-on-background); }
.b3-text-field { border: none; background: transparent; color: var(--b3-theme-on-background); outline: none; font-family: inherit; }
.xlc-dialog { position: relative; }
.xlc-dialog .xlc-menu { position: fixed; right: 180px; bottom: 120px; left: auto; width: 320px; }
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
        panePreview: (document.querySelector(".xlc-pane-body")?.textContent ?? "").includes("王总"),
        sourceWarn: (document.querySelector(".xlc-pane-warn")?.textContent ?? "").includes("来源"),
        aiBanner: (document.querySelector(".xlc-ai-banner")?.textContent ?? "").includes("3"),
        ordinals: document.querySelectorAll(".xlc-row-ordinal").length >= 3,
    }));
    await shoot("desktop-dark", {theme: "dark", aiEnabled: true, missing: false}, () => ({
        rows: document.querySelectorAll(".xlc-row[data-xlc-index]").length >= 3,
        pane: !!document.querySelector(".xlc-pane"),
    }));
    await shoot("provider-light", {theme: "light", aiEnabled: true, missing: false, query: "工作台"}, () => ({
        providerHeader: (document.querySelector(".xlc-provider-header")?.textContent ?? "").includes("提供方内容"),
        providerRows: document.querySelectorAll(".xlc-row--provider").length >= 1,
        footerGear: (document.querySelector(".xlc-footer-gear")?.textContent ?? "").includes("设置"),
    }));
    // 窄容器（<620px）：单列降级（预览隐藏）
    await page.setViewportSize({width: 420, height: 720});
    await shoot("narrow-light", {theme: "light", aiEnabled: true, missing: false}, () => ({
        singleColumn: (() => {
            const pane = document.querySelector(".xlc-pane");
            return !pane || getComputedStyle(pane).display === "none";
        })(),
        rows: document.querySelectorAll(".xlc-row[data-xlc-index]").length >= 1,
    }));
    await page.setViewportSize({width: 1280, height: 720});
    await browser.close();
    console.log("production renders done:", fs.readdirSync(OUT).filter((f) => f.startsWith("production-")).join(", "));
})();
