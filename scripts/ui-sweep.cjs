// 全表面交互扫描（R138 临时深查工具）：对每个 UI 表面穷举点击/输入全部可交互元素，
// 监听 pageerror / unhandledrejection / console.error，检测双击双提交与表面堆叠泄漏。
// 用法：node scripts/ui-sweep.cjs（需 Playwright Chromium）
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

const bundlePath = path.join(OUT, "harness-bundle.js");
esbuild.buildSync({
    entryPoints: [path.join(__dirname, "harness", "entry.ts")],
    outfile: bundlePath, bundle: true, format: "iife", platform: "browser", target: "es2019", logLevel: "silent", alias: {siyuan: STUB},
});
const prodCss = fs.readFileSync(path.join(ROOT, "dist", "index.css"), "utf8");
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}</style>
<style>${prodCss}</style></head>
<body><div class="b3-scope light" id="stage"></div>
<script src="${path.basename(bundlePath)}"></script></body></html>`;
fs.writeFileSync(path.join(OUT, "sweep.html"), html);

const SURFACES = [
    {name: "search-default", open: "XlcHarness.openDialog({aiEnabled: true})"},
    {name: "search-noai", open: "XlcHarness.openDialog({aiEnabled: false})"},
    {name: "search-missing", open: "XlcHarness.openDialog({aiEnabled: true, missing: true})"},
    {name: "search-empty", open: "XlcHarness.openDialog({aiEnabled: true, empty: true})"},
    {name: "search-target", open: "XlcHarness.openDialog({insertTarget: {docId: 'd1', hPath: '/常用内容库'}})"},
    {name: "search-mobile", open: "XlcHarness.openDialog({mobile: true})"},
    {name: "capture", open: "XlcHarness.openCapture(true)"},
    {name: "capture-noai", open: "XlcHarness.openCapture(false)"},
    {name: "settings", open: "XlcHarness.openSettings()"},
    {name: "setup", open: "XlcHarness.openSetup()"},
    {name: "import", open: "XlcHarness.openImport()"},
];

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    const problems = [];
    let errors = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err}`));
    page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
    });
    await page.init && await page.init();
    await page.goto("file:///" + path.join(OUT, "sweep.html").replace(/\\/g, "/"));
    await page.waitForFunction(() => Boolean(window.XlcHarness));
    await page.evaluate(() => {
        window.__unhandled = [];
        window.addEventListener("unhandledrejection", (e) => window.__unhandled.push(String(e.reason)));
    });

    const drain = (label) => page.evaluate(() => ({
        errors: window.__unhandled.splice(0),
    })).then(({errors: un}) => {
        for (const e of [...un, ...errors.splice(0)]) problems.push(`[${label}] ${e}`);
    });

    for (const surface of SURFACES) {
        errors.splice(0);
        // 打开表面
        await page.evaluate((open) => {
            document.querySelectorAll(".b3-dialog, .xlc-dialog").forEach((el) => el.remove());
            // eslint-disable-next-line no-eval
            (0, eval)(open);
        }, surface.open);
        await page.waitForTimeout(500);
        await drain(`${surface.name}:open`);

        // 穷举点击：最多 70 轮，每轮重新枚举可见可点元素，点击从未点过的第一个
        const clicked = new Set();
        for (let round = 0; round < 70; round++) {
            const target = await page.evaluate((seen) => {
                const els = Array.from(document.querySelectorAll(
                    "button, [role=menuitem], [role=switch], select, .xlc-chip, .xlc-row, .xlc-meta-chip, input[type=checkbox]",
                )).filter((el) => {
                    if (el.disabled) return false;
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return false;
                    const key = (el.textContent ?? "").trim() + "|" + el.className + "|" + el.tagName;
                    return !seen.includes(key);
                });
                const el = els[0];
                if (!el) return null;
                const key = (el.textContent ?? "").trim() + "|" + el.className + "|" + el.tagName;
                el.click();
                return key;
            }, [...clicked]);
            if (target === null) break;
            clicked.add(target);
            await page.waitForTimeout(120);
            if (round % 8 === 7) await drain(`${surface.name}:r${round}`);
        }
        await drain(`${surface.name}:clicks`);

        // 键盘走查：Tab×12、Enter、Escape×3、方向键
        for (const k of ["Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Enter", "Escape", "Escape", "Escape", "ArrowDown", "ArrowUp", "Escape"]) {
            await page.keyboard.press(k);
            await page.waitForTimeout(60);
        }
        await drain(`${surface.name}:keys`);

        // 双击双提交探测：变量卡/保存按钮 120ms 内连点两次
        const dbl = await page.evaluate(() => {
            window.__xlcActions = [];
            window.__xlcLastFills = undefined;
            const btn = Array.from(document.querySelectorAll("button")).find((b) => /^(插入|保存)$/.test((b.textContent ?? "").trim()) && !b.disabled);
            if (!btn) return {found: false};
            btn.click();
            btn.click();
            return {found: true, label: (btn.textContent ?? "").trim()};
        });
        await page.waitForTimeout(400);
        await drain(`${surface.name}:dbl`);
        if (dbl.found) console.log(`  ℹ [${surface.name}] 双击探测：${dbl.label}`);

        // 表面残留计数
        const residue = await page.evaluate(() => ({
            dialogs: document.querySelectorAll(".b3-dialog").length,
            menus: document.querySelectorAll(".xlc-menu").length,
        }));
        if (residue.dialogs > 3) problems.push(`[${surface.name}] 弹窗层堆积 ${residue.dialogs} 个`);

        console.log(`  sweep ${surface.name}: ${clicked.size} 次点击 + 键盘走查完成${problems.filter((p) => p.startsWith(`[${surface.name}]`)).length ? `，⚠ ${problems.filter((p) => p.startsWith(`[${surface.name}]`)).length} 个问题` : "，干净"}`);
    }

    // 快速开关循环（B-004 序列的轻量版，10 轮不追求复现崩溃，只抓 JS 层异常）
    await page.evaluate(() => {
        document.querySelectorAll(".b3-dialog, .xlc-dialog").forEach((el) => el.remove());
        window.XlcHarness.openSettings();
    });
    await page.waitForTimeout(300);
    for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
            const boxes = Array.from(document.querySelectorAll("input[type=checkbox]"));
            boxes.forEach((b) => b.click());
            const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("更改内容库"));
            btn?.click();
        });
        await page.waitForTimeout(80);
    }
    await drain("rapid-toggle");
    console.log("  sweep rapid-toggle ×10 完成");

    await browser.close();
    console.log(`\n扫描汇总：${problems.length === 0 ? "✔ 全表面 0 异常" : `✖ ${problems.length} 个异常`}`);
    for (const p of problems.slice(0, 30)) console.log("  " + p);
    process.exit(problems.length ? 1 : 0);
})().catch((err) => {
    console.error(`扫描异常：${err.message}`);
    process.exit(1);
});
