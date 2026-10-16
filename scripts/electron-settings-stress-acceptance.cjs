/* B-004 evidence collection against an already running, disposable Electron.
 * Never starts a host, replaces library configuration, removes host DOM, or exits SiYuan.
 * Example (start with --rounds 1 --steps 2 before a complete run):
 * node scripts/electron-settings-stress-acceptance.cjs --cdp http://127.0.0.1:9356 --workspace <temp/xlc-electron-*> --rounds 3 --steps 200
 * Fixtures and complete evidence remain in that disposable workspace.
 * A clean observation does not resolve B-004 or establish its root cause.
 * Process checks only detect observed violations; they cannot prevent a host
 * from starting another workspace. Further host runs require OS-level isolation
 * plus dedicated host config/profile.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const {chromium} = require("playwright");
const {commandLineArgs, switchValues, readWindowsProcessSnapshot, validateElectronIsolation, createIsolationGuard} = require("./electron-isolation.cjs");
const {guardElectronPage, watchElectronTargets} = require("./electron-isolation-playwright.cjs");

function parseOptions(argv) {
    const values = {};
    for (let i = 0; i < argv.length; i += 2) {
        const name = argv[i];
        assert(["--cdp", "--workspace", "--rounds", "--steps"].includes(name), `Unknown argument: ${name}`);
        assert(argv[i + 1] && !argv[i + 1].startsWith("--"), `Missing value: ${name}`);
        assert(!Object.hasOwn(values, name), `Duplicate argument: ${name}`);
        values[name] = argv[i + 1];
    }
    assert(values["--cdp"] && values["--workspace"], "Required: --cdp <loopback HTTP URL> --workspace <dedicated temp workspace>");
    const url = new URL(values["--cdp"]);
    assert.equal(url.protocol, "http:", "CDP must use HTTP");
    assert(["127.0.0.1", "localhost"].includes(url.hostname), "CDP must use loopback");
    assert(url.port && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "Unexpected CDP URL");
    function bounded(name, fallback, max) {
        const raw = values[name] ?? String(fallback);
        assert(/^\d+$/.test(raw), `${name} must be an integer`);
        const value = Number(raw);
        assert(value >= 1 && value <= max, `${name} must be between 1 and ${max}`);
        return value;
    }
    return {cdp: url.origin, workspace: values["--workspace"], rounds: bounded("--rounds", 3, 5), steps: bounded("--steps", 200, 250)};
}

function argumentsForRun(argv) {
    const options = parseOptions(argv);
    assert.equal(process.platform, "win32", "This collector verifies Windows Electron isolation");
    assert(path.isAbsolute(options.workspace), "Workspace must be an explicit absolute path");
    options.workspace = fs.realpathSync(options.workspace);
    const temp = fs.realpathSync(os.tmpdir());
    function insideTemp(target) {
        const relative = path.relative(temp, target);
        assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Target must be strictly inside the current user's temp directory");
    }
    insideTemp(options.workspace);
    assert(/^xlc-electron-[a-z0-9-]+$/i.test(path.basename(options.workspace)), "Expected a dedicated xlc-electron-* workspace");
    assert(fs.existsSync(path.join(options.workspace, "data", "plugins", "xiaolv-common", "index.js")), "Missing isolated plugin installation");
    const processes = readWindowsProcessSnapshot();
    const candidates = processes.filter((entry) => {
        if (entry.Name?.toLowerCase() !== "siyuan.exe") return false;
        try {
            const argv = commandLineArgs(entry.CommandLine);
            const workspaces = switchValues(argv, "workspace");
            return workspaces.length === 1 && !switchValues(argv, "type").length
                && JSON.stringify(switchValues(argv, "remote-debugging-port")) === JSON.stringify([new URL(options.cdp).port])
                && path.resolve(workspaces[0]).toLowerCase() === options.workspace.toLowerCase();
        } catch { return false; }
    });
    assert.equal(candidates.length, 1, "Expected exactly one Electron process matching the workspace and CDP port");
    options.executable = fs.realpathSync(candidates[0].ExecutablePath);
    options.mirror = path.dirname(options.executable);
    insideTemp(options.mirror);
    assert(/^xlc-electron-.*mirror/i.test(path.basename(options.mirror)), "Expected a disposable Electron mirror");
    options.processId = candidates[0].ProcessId;
    // The root alone was insufficient in R229. Verify all descendants and every
    // process from this mirror, including detached/extra workspace kernels.
    const isolation = validateElectronIsolation(options, processes, {resolveExecutable: fs.realpathSync});
    options.rootCreationDate = isolation.rootCreationDate;
    return options;
}

function allFrames(stack) {
    return stack ? [...(stack.callFrames || []), ...allFrames(stack.parent)] : [];
}

function attribution(details, origin) {
    const urls = [details.url, ...allFrames(details.stackTrace).map((frame) => frame.url)].filter(Boolean);
    if (urls.some((url) => /\/plugins\/xiaolv-common\//.test(url))) return "plugin";
    if (urls.length && urls.every((value) => {
        try {
            const url = new URL(value);
            return url.origin === origin && /^\/(?:stage\/build\/(?:desktop|app)\/|app\/)/.test(url.pathname);
        } catch { return false; }
    })) return "host";
    return "unknown";
}

const selector = (value) => `[data-xlc-control=${JSON.stringify(value)}]`;
const settingsRoot = ".xlc-settings-root-host .xlc-settings";
const switchSelector = `${settingsRoot} input[type=checkbox][data-xlc-control^="settings.switch."]`;

async function main() {
    // These identity checks happen before CDP attachment and before all writes.
    const options = argumentsForRun(process.argv.slice(2));
    const outputDir = path.join(options.workspace, "temp", `settings-stress-acceptance-${Date.now()}`);
    fs.mkdirSync(outputDir, {recursive: true});
    const report = {
        task: "T-0082/R229", startedAt: new Date().toISOString(), options, evidenceDir: outputDir,
        passed: false, b004Status: "open", checks: [], rounds: [], exceptions: [], pageErrors: [], consoleErrors: [], nativeDialogs: [],
        isolationChecks: [],
        boundaries: ["Only an existing disposable Electron is attached. No host is launched or shut down.", "Process-tree and mirror-kernel observations are detection guards, not prevention or OS isolation. OS-level isolation plus dedicated host config/profile is required before further host acceptance.", "Library configuration is read and asserted unchanged. Only unique source/target fixtures and one reference item are added.", "Dialog controls are activated normally. Host DOM is never removed or replaced.", "Fast steps invoke actual checkbox/button click handlers and are synthetic pressure; the human-paced group uses pointer input but does not claim human acceptance.", "A successful collector run means valid observations were recorded. A clean run does not establish the B-004 root cause or close the blocker."],
    };
    let browser;
    let page;
    let cdp;
    let stopTargetWatch;
    let activeRound = null;
    let crashed = false;
    let initialConfig;
    let initialSwitches;
    let activeSettingsSnapshot;
    const guard = createIsolationGuard(options, {
        onVerified: (evidence) => { report.isolationChecks.push(evidence); trace("isolation-verified", evidence); },
        onViolation: async (error, reason) => {
            report.passed = false;
            process.exitCode = 1;
            report.isolationViolation = {reason, message: error.message, code: error.code};
            trace("isolation-violation", report.isolationViolation);
            // Do not restore settings, query a workspace, exit the host, or stop
            // any process after a violation. Only disconnect this CDP client.
            await browser?.close().catch(() => {});
        },
    });
    const tracePath = path.join(outputDir, "trace.jsonl");
    function trace(kind, data) {
        fs.appendFileSync(tracePath, JSON.stringify({at: new Date().toISOString(), round: activeRound?.name || null, kind, ...data}) + "\n");
    }
    function check(name, evidence) {
        report.checks.push({name, passed: true, evidence});
        trace("check", {name, evidence});
        console.log(`PASS ${name}`);
    }
    async function stateSnapshot() {
        await guard.verify("state-snapshot");
        return page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common");
            return JSON.parse(JSON.stringify({config: plugin.config, state: plugin.state}));
        });
    }
    async function api(endpoint, body = {}) {
        await guard.verify(`kernel-api:${endpoint}`, {force: true});
        return page.evaluate(async ({endpoint, body}) => {
            const response = await fetch(endpoint, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
            if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
            const result = await response.json();
            if (result.code !== 0) throw new Error(`${endpoint}: ${result.msg || result.code}`);
            return result.data;
        }, {endpoint, body});
    }
    async function documentSnapshot(id) {
        const blocks = await api("/api/block/getChildBlocks", {id});
        const snapshot = [];
        for (const block of blocks) snapshot.push({id: block.id, kramdown: (await api("/api/block/getBlockKramdown", {id: block.id})).kramdown});
        return snapshot;
    }
    async function switchSnapshot() {
        return page.locator(switchSelector).evaluateAll((boxes) => boxes.map((box) => ({control: box.dataset.xlcControl, checked: box.checked, disabled: box.disabled})));
    }
    async function closeDialogContaining(innerSelector) {
        await guard.verify("close-official-dialog", {force: true});
        const dialog = page.locator(".b3-dialog").filter({has: page.locator(innerSelector)});
        assert.equal(await dialog.count(), 1, `Expected one official Dialog containing ${innerSelector}`);
        const close = dialog.locator(".b3-dialog__close:visible");
        // SiYuan can hide the close icon in this layout. Escape still follows the
        // host's actual Dialog destruction path; never force the hidden SVG.
        if (await close.count()) await close.click();
        else {
            // Insertion can return focus to the editor behind a search Dialog.
            // Put keyboard focus back on the real dialog control before Escape.
            const focusable = dialog.locator("input:visible, button:visible, select:visible").first();
            if (await focusable.count()) await focusable.focus();
            await page.keyboard.press("Escape");
        }
        await page.locator(innerSelector).waitFor({state: "detached"});
    }
    async function restoreSwitches(snapshot) {
        await guard.verify("restore-settings", {force: true});
        if (!snapshot || crashed || page.isClosed()) return;
        // The first AI switch enables the second. Restore in DOM order so disabled
        // dependent controls are never forced and AI's share-content reset is honoured.
        for (const before of snapshot) {
            await guard.verify("restore-settings-switch");
            const box = page.locator(`${settingsRoot} ${selector(before.control)}`);
            await box.waitFor({state: "attached"});
            await page.waitForFunction(({root, control}) => {
                const box = [...document.querySelectorAll(`${root} input[type=checkbox]`)].find((element) => element.dataset.xlcControl === control);
                return box && (box.getAttribute("aria-busy") !== "true");
            }, {root: settingsRoot, control: before.control});
            if (await box.isChecked() !== before.checked) {
                assert.equal(await box.isEnabled(), true, `Cannot restore disabled control ${before.control}`);
                await box.setChecked(before.checked);
                trace("restore-switch", {control: before.control, checked: before.checked});
            }
        }
        await page.waitForFunction((root) => !document.querySelector(`${root} input[aria-busy=true]`), settingsRoot);
        const after = await switchSnapshot();
        assert.deepEqual(after.map(({control, checked}) => ({control, checked})), snapshot.map(({control, checked}) => ({control, checked})), "All actual settings changes must be restored");
        await page.waitForTimeout(700); // The real sidecar debounce is 400 ms.
        activeSettingsSnapshot = null;
        return after;
    }
    async function reloadForRound(name) {
        await guard.verify(`round:${name}:before-reload`, {force: true});
        await page.reload({waitUntil: "domcontentloaded"});
        await guard.verify(`round:${name}:after-reload`, {force: true});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        // The host briefly restores/dismisses its own startup Dialog after plugin
        // readiness. Wait for that lifecycle; never remove or click through it.
        await page.waitForFunction(() => [...document.querySelectorAll(".b3-dialog")].every((element) => !element.getClientRects().length || getComputedStyle(element).visibility === "hidden"), null, {timeout: 8000});
        assert.equal(await page.locator(".b3-dialog:visible").count(), 0, "Fresh renderer must not retain a Dialog");
        assert.deepEqual((await stateSnapshot()).config, initialConfig, "Library configuration must remain unchanged");
        trace("renderer-reload", {name});
    }
    try {
        await guard.verify("before-cdp-attachment", {force: true});
        browser = await chromium.connectOverCDP(options.cdp);
        await guard.verify("after-cdp-attachment", {force: true});
        stopTargetWatch = await watchElectronTargets(browser, guard);
        const browserCDP = await browser.newBrowserCDPSession();
        const processes = await browserCDP.send("SystemInfo.getProcessInfo");
        const browserProcess = processes.processInfo.filter((entry) => entry.type === "browser");
        assert.equal(browserProcess.length, 1);
        assert.equal(browserProcess[0].id, options.processId, "CDP browser PID must match the validated mirror process");
        await guard.verify("after-cdp-browser-pid", {force: true});
        report.browser = await browserCDP.send("Browser.getVersion");
        await browserCDP.detach();
        const matches = [];
        for (const context of browser.contexts()) {
            for (const candidate of context.pages()) {
                const workspace = await candidate.evaluate(() => window.siyuan?.config?.system?.workspaceDir).catch(() => null);
                if (typeof workspace === "string" && path.resolve(workspace).toLowerCase() === options.workspace.toLowerCase()) matches.push(candidate);
            }
        }
        assert.equal(matches.length, 1, "Expected exactly one renderer for the validated workspace");
        page = guardElectronPage(matches[0], guard, options);
        const origin = new URL(page.url()).origin;
        assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname), "Renderer must use loopback");
        report.host = await page.evaluate(() => ({workspace: window.siyuan.config.system.workspaceDir, kernel: window.siyuan.config.system.kernelVersion, versions: window.process?.versions, userAgent: navigator.userAgent}));
        assert(report.host.versions?.electron, "A Chromium frontend is not Electron acceptance");
        report.bundle = {};
        for (const file of ["index.js", "index.css"]) {
            const filename = path.join(options.workspace, "data", "plugins", "xiaolv-common", file);
            report.bundle[file] = {sha256: crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex"), bytes: fs.statSync(filename).size};
        }
        page.on("crash", () => { crashed = true; trace("renderer-crash", {}); });
        page.on("pageerror", (error) => {
            const evidence = {round: activeRound?.name || null, at: new Date().toISOString(), message: error.message, stack: error.stack};
            report.pageErrors.push(evidence); trace("pageerror", evidence);
        });
        page.on("console", (message) => {
            if (message.type() !== "error") return;
            const evidence = {round: activeRound?.name || null, at: new Date().toISOString(), message: message.text(), location: message.location()};
            report.consoleErrors.push(evidence); trace("console-error", evidence);
        });
        page.on("dialog", async (dialog) => {
            const evidence = {round: activeRound?.name || null, type: dialog.type(), message: dialog.message()};
            report.nativeDialogs.push(evidence); trace("unexpected-native-dialog", evidence);
            if (!guard.failed) {
                try { await guard.verify("before-native-dialog-dismiss"); await dialog.dismiss(); } catch { /* The sticky guard owns disconnection. */ }
            }
        });
        cdp = await page.context().newCDPSession(page);
        await cdp.send("Runtime.enable");
        cdp.on("Runtime.exceptionThrown", (event) => {
            const details = event.exceptionDetails;
            const evidence = {round: activeRound?.name || null, at: new Date().toISOString(), attribution: attribution(details, origin), ...event};
            report.exceptions.push(evidence); trace("runtime-exception", evidence);
        });
        check("observed Electron renderer, full mirror process tree/kernel workspaces and bundle identity", {host: report.host, processId: options.processId, bundle: report.bundle, isolation: guard.identity});

        await guard.verify("before-initial-reload", {force: true});
        await page.reload({waitUntil: "domcontentloaded"});
        await guard.verify("after-initial-reload", {force: true});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        report.before = await stateSnapshot();
        initialConfig = report.before.config;
        assert(initialConfig?.mode === "doc" && initialConfig.containerDocIds?.length === 1, "Requires one already configured disposable document library; this script never configures a library");
        const runId = Date.now().toString(36);
        const notebook = (await api("/api/notebook/createNotebook", {name: `XLC设置取证${runId}`})).notebook;
        const sourceText = `设置压力来源正文 ${runId}`;
        const title = `设置压力条目${runId}`;
        const sourceDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/设置压力来源${runId}`, markdown: sourceText});
        const sourceBlock = (await api("/api/block/getChildBlocks", {id: sourceDocId}))[0];
        assert(sourceBlock?.id);
        const reference = `((${sourceBlock.id} '${title}'))`;
        await guard.verify("before-reference-service-save", {force: true});
        const saved = await page.evaluate(async ({sourceDocId, sourceBlockId, title, reference}) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.save({itemType: "blockref", markdown: reference, title, category: "验收", tags: ["electron-r229"], source: {sourceDocId, sourceBlockId, sourceType: "block"}}), {sourceDocId, sourceBlockId: sourceBlock.id, title, reference});
        assert.equal(saved.ok, true, JSON.stringify(saved));
        report.fixture = {notebookId: notebook.id, sourceDocId, sourceBlockId: sourceBlock.id, itemId: saved.data.id, libraryDocId: initialConfig.containerDocIds[0], targets: []};
        const sourceBefore = await documentSnapshot(sourceDocId);
        check("unique real reference fixture without replacing the configured library", report.fixture);

        async function fullPrecondition(name) {
            await guard.verify(`full-precondition:${name}`, {force: true});
            const targetTitle = `设置压力目标${runId}-${report.fixture.targets.length + 1}`;
            const targetDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/${targetTitle}`, markdown: "设置压力目标起始段"});
            report.fixture.targets.push(targetDocId);
            await guard.verify("before-target-open", {force: true});
            const opened = await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.openDoc(id), targetDocId);
            assert.equal(opened, true);
            await page.locator('.layout-tab-bar [data-type="tab-header"]').filter({hasText: targetTitle}).last().click();
            await page.locator(`.protyle[data-node-id="${targetDocId}"]:not(.fn__none) .protyle-wysiwyg [contenteditable="true"]`).first().click({position: {x: 20, y: 10}});
            await page.waitForFunction((id) => { const plugin = window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common"); return plugin.host.hasActiveEditor() && plugin.host.currentDocId() === id; }, targetDocId);
            const before = await documentSnapshot(targetDocId);
            await guard.verify("before-search-command", {force: true});
            await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").commands.find((entry) => entry.langKey === "open").callback());
            const input = page.locator(selector("search.input"));
            await input.waitFor({state: "visible"});
            await input.fill(title);
            await page.waitForFunction((title) => { const rows = [...document.querySelectorAll('[data-xlc-control="item.row"]')]; return rows.length === 1 && rows[0].textContent.includes(title); }, title);
            await guard.verify("before-preview-copy", {force: true});
            await page.locator(selector("preview.copy")).click();
            await page.waitForTimeout(300);
            assert.equal(await page.evaluate(() => navigator.clipboard.readText()), sourceText, "Real preview copy must write the source text");
            assert.equal(await page.locator(selector("preview.insert")).textContent(), "插入", "A frozen real editor target is required");
            await guard.verify("before-preview-insert", {force: true});
            await page.locator(selector("preview.insert")).click();
            await page.waitForTimeout(1000);
            const after = await documentSnapshot(targetDocId);
            const added = after.filter((block) => !before.some((entry) => entry.id === block.id));
            assert.equal(added.length, 1, "Real search insertion must add exactly one target block");
            assert.equal(added[0].kramdown.replace(/\n\{:[^\r\n]*\}\s*$/, "").trim(), reference);
            await closeDialogContaining(".xlc-dialog");
            assert.equal(await page.locator(".b3-dialog:visible").count(), 0);
            check(`${name}: real search, copy, target insertion and official Dialog close`, {targetDocId, added});
            return {targetDocId, snapshot: after};
        }

        async function openSettings() {
            await guard.verify("before-settings-open", {force: true});
            await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").openSettings());
            await page.locator(settingsRoot).waitFor({state: "visible"});
            assert.equal(await page.locator(".b3-dialog:visible").count(), 1, "Only the official settings Dialog may remain");
            const switches = await switchSnapshot();
            assert.equal(switches.length, 6, "The known six-switch settings surface is required; review the script when the UI changes");
            assert(switches.filter((box) => !box.disabled).length >= 4, "At least four enabled real settings switches are required");
            assert.equal(new Set(switches.map((box) => box.control)).size, switches.length);
            if (!initialSwitches) initialSwitches = switches;
            assert.deepEqual(switches.map(({control, checked}) => ({control, checked})), initialSwitches.map(({control, checked}) => ({control, checked})), "Each round must start with the original settings");
            activeSettingsSnapshot = switches;
            const change = page.locator(`${settingsRoot} ${selector("settings.library.change")}`);
            assert.equal(await change.getAttribute("aria-expanded"), "false");
            await change.click();
            await page.locator(`${settingsRoot} ${selector("setup.docs.query")}`).waitFor({state: "visible"});
            assert.equal(await change.getAttribute("aria-expanded"), "true");
            trace("settings-preconditions", {switches, pickerExpanded: true});
            return switches;
        }

        async function fastStep(step, seed) {
            await guard.verify("fast-stress-step");
            return page.evaluate(({root, step, seed}) => {
                const form = document.querySelector(root);
                if (!form?.isConnected) throw new Error("Settings form is missing");
                const change = form.querySelector('[data-xlc-control="settings.library.change"]');
                if (!change || change.disabled) throw new Error("Library picker toggle is missing or disabled");
                const boxes = [...form.querySelectorAll('input[type=checkbox][data-xlc-control^="settings.switch."]')];
                const before = boxes.map((box) => ({control: box.dataset.xlcControl, checked: box.checked, disabled: box.disabled}));
                const operations = [];
                const pickerBefore = change.getAttribute("aria-expanded");
                // Same finite trigger domain as R163: mixed settings + repeated picker
                // display/focus. Every selected enabled switch must really change.
                const order = (seed & 1) ? [...boxes].reverse() : boxes;
                const selected = step % 3 === 0 ? order : [order[seed % order.length]];
                for (const box of selected) {
                    if (box.disabled) continue;
                    const was = box.checked;
                    box.click();
                    if (box.checked === was) throw new Error(`Checkbox did not change: ${box.dataset.xlcControl}`);
                    operations.push({control: box.dataset.xlcControl, from: was, to: box.checked});
                }
                // A disabled randomly selected switch must not turn a step into a no-op.
                if (!operations.length) {
                    const box = order.find((entry) => !entry.disabled);
                    if (!box) throw new Error("No enabled settings switch");
                    const was = box.checked;
                    box.click();
                    if (box.checked === was) throw new Error("Fallback switch did not change");
                    operations.push({control: box.dataset.xlcControl, from: was, to: box.checked});
                }
                change.click();
                const pickerAfter = change.getAttribute("aria-expanded");
                if (!['true', 'false'].includes(pickerBefore) || pickerBefore === pickerAfter) throw new Error("Picker did not change visibility");
                if (!form.querySelector('[data-xlc-control="setup.docs.query"]')) throw new Error("Picker DOM was not constructed");
                return {rendererTime: performance.now(), before, operations, pickerBefore, pickerAfter, after: boxes.map((box) => ({control: box.dataset.xlcControl, checked: box.checked, disabled: box.disabled}))};
            }, {root: settingsRoot, step, seed});
        }

        async function humanPacedStep(step) {
            await guard.verify("human-paced-stress-step");
            const before = await switchSnapshot();
            const enabled = before.filter((box) => !box.disabled);
            assert(enabled.length >= 4);
            const chosen = enabled[step % enabled.length];
            const box = page.locator(`${settingsRoot} ${selector(chosen.control)}`);
            await box.click();
            assert.equal(await box.isChecked(), !chosen.checked);
            await page.waitForTimeout(250);
            const change = page.locator(`${settingsRoot} ${selector("settings.library.change")}`);
            const pickerBefore = await change.getAttribute("aria-expanded");
            await change.click();
            const pickerAfter = await change.getAttribute("aria-expanded");
            assert.notEqual(pickerAfter, pickerBefore);
            return {before, operations: [{control: chosen.control, from: chosen.checked, to: !chosen.checked}], pickerBefore, pickerAfter, after: await switchSnapshot()};
        }

        const matrix = [
            {name: "direct-settings-fast-control", precondition: false, speed: "synthetic-fast", steps: options.steps},
            ...Array.from({length: options.rounds}, (_, index) => ({name: `full-precondition-fast-${index + 1}`, precondition: true, speed: "synthetic-fast", steps: options.steps})),
            {name: "full-precondition-human-paced", precondition: true, speed: "human-paced-pointer", steps: Math.min(options.steps, 12)},
        ];
        report.matrix = matrix;
        for (let index = 0; index < matrix.length; index++) {
            const scenario = matrix[index];
            activeRound = {...scenario, startedAt: new Date().toISOString(), exceptionStart: report.exceptions.length, pageErrorStart: report.pageErrors.length, completedSteps: 0, switchActivations: 0, seed: 20261009, intervalMs: scenario.speed === "synthetic-fast" ? 30 : 500};
            report.rounds.push(activeRound);
            console.log(`ROUND ${activeRound.name} (${scenario.steps} steps)`);
            await reloadForRound(activeRound.name);
            const target = scenario.precondition ? await fullPrecondition(activeRound.name) : null;
            const before = await openSettings();
            activeRound.before = await stateSnapshot();
            activeRound.switchesBefore = before;
            let seed = activeRound.seed >>> 0;
            for (let step = 0; step < scenario.steps; step++) {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                const evidence = scenario.speed === "synthetic-fast" ? await fastStep(step, seed) : await humanPacedStep(step);
                activeRound.completedSteps++;
                activeRound.switchActivations += evidence.operations.length;
                trace("stress-step", {step, seed, speed: scenario.speed, ...evidence});
                await page.waitForTimeout(scenario.speed === "synthetic-fast" ? 30 : 250);
            }
            await page.waitForTimeout(1000);
            await guard.verify(`round:${activeRound.name}:after-stress`, {force: true});
            activeRound.alive = !crashed && !page.isClosed() && await page.evaluate(() => Boolean(window.siyuan?.ws?.app));
            assert.equal(activeRound.alive, true, "Renderer must remain alive");
            activeRound.afterStress = await stateSnapshot();
            activeRound.switchesAfterRestore = await restoreSwitches(before);
            await closeDialogContaining(settingsRoot);
            activeRound.visibleDialogsAfterClose = await page.locator(".b3-dialog:visible").count();
            assert.equal(activeRound.visibleDialogsAfterClose, 0);
            assert.deepEqual((await stateSnapshot()).config, initialConfig, "Pressure must never alter library configuration");
            assert.deepEqual(await documentSnapshot(sourceDocId), sourceBefore, "Settings pressure must leave the source unchanged");
            if (target) assert.deepEqual(await documentSnapshot(target.targetDocId), target.snapshot, "Settings pressure must leave the inserted target unchanged");
            activeRound.afterRestore = await stateSnapshot();
            activeRound.finishedAt = new Date().toISOString();
            activeRound.exceptionEnd = report.exceptions.length;
            activeRound.pageErrorEnd = report.pageErrors.length;
            check(`${activeRound.name}: all scheduled activations observed, settings restored, renderer alive`, {steps: activeRound.completedSteps, switchActivations: activeRound.switchActivations, exceptions: activeRound.exceptionEnd - activeRound.exceptionStart, pageErrors: activeRound.pageErrorEnd - activeRound.pageErrorStart});
        }
        report.after = await stateSnapshot();
        assert.deepEqual(report.after.config, initialConfig);
        // Unknown page errors cannot silently disappear when CDP lacks a location.
        report.unattributedPageErrors = report.pageErrors.filter((error) => !report.exceptions.some((event) => event.round === error.round && (event.exceptionDetails.exception?.description || event.exceptionDetails.text || "").includes(error.message)));
        report.consoleErrors = report.consoleErrors.map((event) => ({...event, attribution: attribution({url: event.location.url}, origin)}));
        const nonHostExceptions = report.exceptions.filter((event) => event.attribution !== "host");
        const nonHostConsole = report.consoleErrors.filter((event) => event.attribution !== "host");
        report.observation = {
            crashed, hostExceptions: report.exceptions.filter((event) => event.attribution === "host").length,
            pluginOrUnknownExceptions: nonHostExceptions.length, unattributedPageErrors: report.unattributedPageErrors.length,
            consoleErrors: report.consoleErrors.length, pluginOrUnknownConsoleErrors: nonHostConsole.length,
            styleNullExceptions: report.exceptions.filter((event) => /Cannot read properties of null.*style/.test(event.exceptionDetails.exception?.description || "")).length,
            b004Resolved: false,
        };
        assert.equal(nonHostExceptions.length, 0, "Plugin or unknown runtime exceptions require investigation; inspect complete CDP frames");
        assert.equal(report.unattributedPageErrors.length, 0, "Page errors without matching CDP evidence require investigation");
        assert.equal(nonHostConsole.length, 0, "Plugin or unknown console errors require investigation");
        assert.equal(report.nativeDialogs.length, 0, "Unexpected native dialogs invalidate the planned interaction sequence");
        await guard.verify("before-final-conclusion", {force: true});
        report.passed = true;
        report.conclusion = report.observation.hostExceptions ? "Host-attributed exceptions observed; B-004 remains open." : "No renderer crash or runtime exception observed in this finite matrix; B-004 remains open.";
    } catch (error) {
        report.failure = {message: error.message, stack: error.stack, round: activeRound?.name || null};
        trace("failure", report.failure);
        if (!guard.failed && page && !crashed && !page.isClosed()) await page.screenshot({path: path.join(outputDir, "failure.png")}).catch(() => {});
        process.exitCode = 1;
    } finally {
        if (!guard.failed && activeSettingsSnapshot && page && !crashed && !page.isClosed()) {
            try {
                report.recovery = {switches: await restoreSwitches(activeSettingsSnapshot)};
                await closeDialogContaining(settingsRoot);
            } catch (error) {
                report.recovery = {failure: error.message, preservedFixtures: true};
                report.passed = false;
                process.exitCode = 1;
            }
        }
        report.crashed = crashed;
        report.finishedAt = new Date().toISOString();
        if (!guard.failed && page && !crashed && !page.isClosed()) report.finalState = await stateSnapshot().catch((error) => ({unavailable: error.message}));
        fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(report, null, 2));
        console.log(`Evidence: ${path.join(outputDir, "result.json")}`);
        console.log(report.conclusion || report.failure?.message || "Collection did not complete");
        await cdp?.detach().catch(() => {});
        await stopTargetWatch?.();
        // For a CDP-connected Browser this detaches the client; no host exit API is used.
        await browser?.close().catch(() => {});
    }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = {parseOptions, argumentsForRun, attribution, allFrames};
