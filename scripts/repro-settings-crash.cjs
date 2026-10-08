// 临时压测（用完即删）：设置弹窗随机操作 250 步
const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
let chromium;
try {
    ({chromium} = require("playwright"));
} catch {
    ({chromium} = require(path.join(ROOT, "..", "小驴雷切", "node_modules", "@playwright", "test")));
}
(async () => {
    const udd = path.join(ROOT, "tmp-udd");
    const browser = await chromium.launch({viewport: {width: 1280, height: 900}});
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 200)));
    page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
    });
    const url = "file:///" + path.resolve(ROOT, "docs", "design", "harness.html").split(path.sep).join("/");
    await page.goto(url);
    await page.waitForFunction(() => Boolean(window.XlcHarness));
    await page.evaluate((hideCard) => { if (hideCard >= 0) { const cards = document.querySelectorAll(".xlc-card"); cards[hideCard] && (cards[hideCard].style.display = "none"); }
        const stage = document.getElementById("stage");
        stage.className = "b3-scope light";
        window.XlcHarness.openSettings();
        const d = document.querySelector(".b3-dialog");
        if (d) stage.appendChild(d);
    });
    await page.waitForTimeout(400);

    let seed = 20261009;
    const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    const ops = {
        "toggle-switch": async () => {
            const boxes = await page.$$(".xlc-switch");
            if (boxes.length) await boxes[rand(boxes.length)].click();
        },
        "add-transform": async () => {
            const btn = await page.evaluateHandle(() => Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("添加自定义变换")));
            const el = btn.asElement();
            if (el) await el.click();
        },
        "del-transform": async () => {
            const dels = await page.$$(".xlc-ct-del");
            if (dels.length) await dels[rand(dels.length)].click();
        },
        "edit-transform-name": async () => {
            const names = await page.$$(".xlc-ct-name");
            if (names.length) {
                const el = names[rand(names.length)];
                await el.click({clickCount: 3});
                await el.type("改", {delay: 5});
                await page.keyboard.press("Tab");
            }
        },
        "expand-picker": async () => {
            const btn = await page.evaluateHandle(() => Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("更改内容库")));
            const el = btn.asElement();
            if (el) await el.click();
        },
        "type-picker": async () => {
            const input = await page.$(".xlc-doclist, .b3-text-field");
        },
        "data-button": async () => {
            const labels = ["重建索引", "导出全部条目", "模板包", "清空最近使用", "导入提示词场景包"];
            const label = labels[rand(labels.length)];
            const btn = await page.evaluateHandle((l) => Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes(l)), label);
            const el = btn.asElement();
            if (el) await el.click();
        },
        "type-somewhere": async () => {
            const inputs = await page.$$("input.b3-text-field");
            if (inputs.length) {
                const el = inputs[rand(inputs.length)];
                await el.click({clickCount: 3});
                await el.type("测", {delay: 5});
            }
        },
    };
    const keys = Object.keys(ops);
    const STEPS = Number(process.env.MAX_STEPS || 250);
    const trace = (line) => { fs.appendFileSync("tmp-fuzz-trace.log", line + "\n"); };
    let crashedFlag = false;
    const stderrChunks = [];
    page.on("crash", () => {
        crashedFlag = true;
        trace("[CRASH]");
        setTimeout(() => {
            const tail = stderrChunks.join("").split("\n").filter((l) => /crash|FATAL|ERROR|OOM|memory|CHECK|signature/i.test(l));
            console.log("STDERR_TAIL:", JSON.stringify(tail.slice(-15), null, 1));
            process.exit(2);
        }, 1500);
    });
    for (let i = 0; i < STEPS; i++) {
        const op = keys[rand(keys.length)];
        if ((process.env.SKIP || "").split(",").includes(op)) continue;
        trace(i + ":" + op);
        try {
            await Promise.race([ops[op](), new Promise((r) => setTimeout(r, 3000))]);
        } catch { /* 弹窗/节点消失属预期 */ }
        const heap = await page.evaluate(() => Math.round((performance.memory.usedJSHeapSize) / 1048576)).catch(() => -1);
        if (typeof heap === "number" && heap > 60) trace(i + ":HEAP:" + heap + "MB");
        await page.waitForTimeout(12);
        if (i % 50 === 49) await page.waitForTimeout(300);
    }
    // confirm 对话框可能在等待：全部接受掉
    for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Enter").catch(() => undefined);
        await page.waitForTimeout(80);
    }
    const alive = await page.$(".xlc-form");
    console.log("STEPS:", STEPS);
    console.log("PAGE_ERRORS:", pageErrors.length, JSON.stringify(pageErrors.slice(0, 5)));
    console.log("CONSOLE_ERRORS:", consoleErrors.length, JSON.stringify([...new Set(consoleErrors)].slice(0, 5)));
    console.log("SETTINGS_ALIVE:", Boolean(alive), "CRASHED:", crashedFlag);
    if (crashedFlag) {
        const tail = stderrChunks.join("").split("\n").filter((l) => /crash|FATAL|ERROR|OOM|memory|CHECK/i.test(l));
        console.log("STDERR_TAIL:", JSON.stringify(tail.slice(-12), null, 1));
    }
    const fail = pageErrors.length > 0 || !alive || crashedFlag;
    console.log(fail ? "SETTINGS_FUZZ: FAIL" : "SETTINGS_FUZZ: CLEAN");
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
