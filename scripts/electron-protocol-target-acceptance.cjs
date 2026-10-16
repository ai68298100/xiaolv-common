/* T-0083: freeze public service.insert's target before its real item lookup.
 * Attach only after the other Electron collector hands over the disposable host.
 * Requires OS-level isolation plus dedicated host config/profile; a profile alone
 * or this observer is not sufficient. Do not reuse the R231 incident environment.
 * No host launch/exit, service/editor stubs, synthetic responses, or DOM deletion.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {chromium} = require("playwright");
const {argumentsForRun: strictElectronArguments} = require("./electron-settings-stress-acceptance.cjs");
const {createIsolationGuard} = require("./electron-isolation.cjs");
const {guardElectronPage, watchElectronTargets} = require("./electron-isolation-playwright.cjs");

function argumentsForRun(argv) {
    for (let index = 0; index < argv.length; index += 2) {
        assert(["--cdp", "--workspace"].includes(argv[index]), `Unknown argument: ${argv[index]}`);
    }
    return strictElectronArguments(argv);
}

async function main() {
    const options = argumentsForRun(process.argv.slice(2));
    const outputDir = path.join(options.workspace, "temp", `protocol-target-acceptance-${Date.now()}`);
    fs.mkdirSync(outputDir, {recursive: true});
    const report = {
        task: "T-0083/R230", date: new Date().toISOString(), options, evidenceDir: outputDir,
        passed: false, checks: [], cases: [], errors: [], nativeDialogs: [],
        boundaries: [
            "A route delays exactly one real item getBlockAttrs request; it continues the original request without replacing the response.",
            "The public service.insert and real editor APIs are unchanged. Tab switches, text selection, and tab closure use actual controls.",
            "The old deployed product is expected to fail these unchanged A/B snapshot assertions; a failing sample is not a successful target-freeze result.",
        ],
    };
    let browser;
    let page;
    let activeGate;
    let stopWatching;
    const guard = createIsolationGuard(options, {
        onVerified: (identity) => { report.isolation = identity; },
        onViolation: async (error, reason) => {
            report.passed = false;
            process.exitCode = 1;
            report.isolationFailure = {message: error.message, reason};
            await activeGate?.abort();
            await browser?.close().catch(() => {});
        },
    });
    const check = (name, evidence) => {
        report.checks.push({name, passed: true, evidence});
        console.log(`PASS ${name}`);
    };
    const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
    try {
        // Reuse the collector's exact process/workspace/mirror checks before CDP.
        await guard.verify("before-cdp", {force: true});
        browser = await chromium.connectOverCDP(options.cdp);
        stopWatching = await watchElectronTargets(browser, guard);
        const browserCDP = await browser.newBrowserCDPSession();
        try {
            const processes = await browserCDP.send("SystemInfo.getProcessInfo");
            const browserProcesses = processes.processInfo.filter((entry) => entry.type === "browser");
            assert.equal(browserProcesses.length, 1);
            assert.equal(browserProcesses[0].id, options.processId, "CDP browser PID must match the validated mirror process");
            report.browser = {processId: browserProcesses[0].id, version: await browserCDP.send("Browser.getVersion")};
        } finally {
            await browserCDP.detach();
        }
        const matches = [];
        for (const context of browser.contexts()) {
            for (const candidate of context.pages()) {
                const workspace = await candidate.evaluate(() => window.siyuan?.config?.system?.workspaceDir).catch(() => null);
                if (typeof workspace === "string" && path.resolve(workspace).toLowerCase() === options.workspace.toLowerCase()) matches.push(candidate);
            }
        }
        assert.equal(matches.length, 1, "Exactly one renderer must match the verified temporary workspace");
        page = guardElectronPage(matches[0], guard, options);
        page.setDefaultTimeout(8000);
        await page.reload({waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        await page.waitForTimeout(1000);
        report.host = await page.evaluate(() => ({workspace: window.siyuan.config.system.workspaceDir, kernel: window.siyuan.config.system.kernelVersion, electron: window.process?.versions?.electron}));
        assert(report.host.electron, "The matched renderer must be Electron");
        const initialConfig = await page.evaluate(() => JSON.parse(JSON.stringify(window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").config)));
        const deployed = path.join(options.workspace, "data", "plugins", "xiaolv-common");
        report.build = ["index.js", "index.css"].map((name) => {
            const local = fs.readFileSync(path.join(__dirname, "..", "dist", name));
            const actual = fs.readFileSync(path.join(deployed, name));
            assert(local.equals(actual), `${name} deployment must equal current dist byte-for-byte`);
            return {name, bytes: actual.length, sha256: sha256(actual), deployedEqualsDist: true};
        });
        fs.writeFileSync(path.join(outputDir, "build-identity.json"), JSON.stringify({host: report.host, files: report.build}, null, 2));
        page.on("pageerror", (error) => report.errors.push({message: error.message, stack: error.stack}));
        page.on("dialog", async (dialog) => {
            report.nativeDialogs.push({type: dialog.type(), message: dialog.message()});
            if (!guard.failed) { await guard.verify("native dialog dismissal"); await dialog.dismiss(); }
        });
        check("strict disposable Electron identity and deployed build", {host: report.host, build: report.build});

        async function api(endpoint, body = {}) {
            await guard.verify(`kernel API ${endpoint}`, {force: true});
            return page.evaluate(async ({endpoint, body}) => {
                const response = await fetch(endpoint, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
                if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
                const result = await response.json();
                if (result.code !== 0) throw new Error(`${endpoint}: ${result.msg || result.code}`);
                return result.data;
            }, {endpoint, body});
        }
        async function documentSnapshot(docId) {
            const children = await api("/api/block/getChildBlocks", {id: docId});
            const snapshot = [];
            for (const child of children) {
                snapshot.push({
                    id: child.id,
                    kramdown: (await api("/api/block/getBlockKramdown", {id: child.id})).kramdown,
                    attrs: await api("/api/attr/getBlockAttrs", {id: child.id}),
                });
            }
            return snapshot;
        }
        async function selectionState(docId) {
            return page.evaluate((docId) => {
                const host = window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host;
                const selection = getSelection();
                const editor = document.querySelector(`.protyle[data-node-id="${docId}"]:not(.fn__none)`);
                return {docId: host.currentDocId(), hasEditor: host.hasActiveEditor(), rangeCount: selection?.rangeCount || 0, inside: !!editor?.contains(selection?.anchorNode), textAnchor: selection?.anchorNode?.nodeType === Node.TEXT_NODE && !!selection.anchorNode.textContent?.replace(/[\s\u200b]/g, ""), anchor: selection?.anchorNode?.parentElement?.outerHTML?.slice(0, 1000)};
            }, docId);
        }
        async function selectEditor(docId, title) {
            await guard.verify(`select editor ${docId}`, {force: true});
            await page.locator('.layout-tab-bar [data-type="tab-header"]').filter({hasText: title}).last().click();
            const paragraph = page.locator(`.protyle[data-node-id="${docId}"]:not(.fn__none) .protyle-wysiwyg [contenteditable="true"]`).first();
            await paragraph.waitFor({state: "visible"});
            await paragraph.click({position: {x: 20, y: 10}});
            await page.waitForFunction((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.currentDocId() === id, docId);
            const state = await selectionState(docId);
            assert.equal(state.docId, docId);
            assert.equal(state.hasEditor, true);
            assert(state.rangeCount > 0 && state.inside, "Actual text selection must be inside the activated editor");
            assert.equal(state.textAnchor, true, "The real selection must be anchored in paragraph text, not an editor cursor placeholder");
            return state;
        }
        async function openEditor(docId, title) {
            assert.equal(await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.openDoc(id), docId), true);
            return selectEditor(docId, title);
        }

        const runId = Date.now().toString(36);
        const notebook = (await api("/api/notebook/createNotebook", {name: `XLC协议目标${runId}`})).notebook;
        const sourceDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/协议来源${runId}`, markdown: `协议源正文 ${runId}`});
        const sourceBlock = (await api("/api/block/getChildBlocks", {id: sourceDocId}))[0];
        const title = `协议目标条目${runId}`;
        const expected = `((${sourceBlock.id} '${title}'))`;
        await guard.verify("before public save", {force: true});
        const saved = await page.evaluate(({sourceDocId, sourceBlockId, expected, title}) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.save({
            itemType: "blockref", markdown: expected, title, tags: ["electron-r230"], category: "验收",
            source: {sourceDocId, sourceBlockId, sourceType: "block"},
        }), {sourceDocId, sourceBlockId: sourceBlock.id, expected, title});
        assert.equal(saved.ok, true, JSON.stringify(saved));
        const itemId = saved.data.id;
        const got = await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.get(id), itemId);
        assert.equal(got.ok, true);
        const itemBlockId = got.data.blockId;
        assert.match(itemBlockId, /^\d{14}-[a-z0-9]{7}$/);
        report.fixture = {notebookId: notebook.id, sourceDocId, sourceBlockId: sourceBlock.id, itemId, itemBlockId, expected};
        const sourceBefore = await documentSnapshot(sourceDocId);
        check("public save/get and exact real source fixture", report.fixture);

        async function holdNextItemLookup() {
            let release;
            let held;
            const released = new Promise((resolve) => { release = resolve; });
            const intercepted = new Promise((resolve) => { held = resolve; });
            let heldRoute;
            const gate = {release, intercepted, matches: [], armed: true, abort: async () => { if (heldRoute) await heldRoute.abort("aborted").catch(() => {}); }};
            gate.handler = async (route) => {
                if (guard.failed) return route.abort("aborted");
                const request = route.request();
                let body;
                try { body = request.postDataJSON(); } catch { /* Not this JSON lookup. */ }
                if (!gate.armed || request.method() !== "POST" || body?.id !== itemBlockId) return route.continue();
                gate.armed = false;
                heldRoute = route;
                gate.matches.push({url: request.url(), method: request.method(), body, heldAt: new Date().toISOString()});
                held();
                await released;
                if (guard.failed) return route.abort("aborted").catch(() => {});
                gate.matches[0].releasedAt = new Date().toISOString();
                await guard.verify("before continuing held item lookup", {force: true});
                await route.continue();
            };
            await page.route("**/api/attr/getBlockAttrs", gate.handler);
            activeGate = gate;
            return gate;
        }
        async function waitForHeldLookup(gate) {
            let timeout;
            try {
                await Promise.race([gate.intercepted, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("The real item's getBlockAttrs request was not held")), 10000); })]);
            } finally { clearTimeout(timeout); }
        }
        const stripIal = (text) => text.replace(/\n\{:[^\r\n]*\}\s*$/, "").trim();
        for (const closeOriginal of [false, true]) {
            await guard.verify("before protocol race case", {force: true});
            const name = closeOriginal ? "close-original" : "switch-current";
            const sample = {name, closeOriginal, passed: false};
            report.cases.push(sample);
            let pending;
            let gate;
            try {
                const titleA = `协议A-${name}-${runId}`;
                const titleB = `协议B-${name}-${runId}`;
                const docA = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/${titleA}`, markdown: `原始目标A ${name}`});
                const docB = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/${titleB}`, markdown: `后来目标B ${name}`});
                sample.docA = docA;
                sample.docB = docB;
                await openEditor(docB, titleB);
                sample.selectionBefore = await openEditor(docA, titleA);
                sample.before = {a: await documentSnapshot(docA), b: await documentSnapshot(docB)};
                await page.evaluate((text) => navigator.clipboard.writeText(text), `xlc-r230-before-${name}-${runId}`);
                gate = await holdNextItemLookup();
                // Keep the real public call pending while the browser performs actual UI input.
                await guard.verify("before public protocol insert", {force: true});
                pending = page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.insert(id, {mode: "insert-ref"}), itemId)
                    .then((receipt) => ({receipt}), (error) => ({error: error.message}));
                await waitForHeldLookup(gate);
                sample.lookup = gate.matches;
                if (closeOriginal) {
                    await page.locator('.layout-tab-bar [data-type="tab-header"]').filter({hasText: titleA}).last().locator(".item__close").click();
                    await page.waitForFunction((id) => !document.querySelector(`.protyle[data-node-id="${id}"]`), docA);
                    sample.originalEditorDestroyed = true;
                }
                sample.selectionAfterSwitch = await selectEditor(docB, titleB);
                sample.switchedBeforeReleaseAt = new Date().toISOString();
                await guard.verify("before releasing pending insert lookup", {force: true});
                gate.release();
                const completed = await pending;
                assert(!completed.error, completed.error);
                sample.receipt = completed.receipt;
                await page.unroute("**/api/attr/getBlockAttrs", gate.handler);
                activeGate = null;
                await page.waitForTimeout(1100);
                sample.after = {a: await documentSnapshot(docA), b: await documentSnapshot(docB)};
                sample.clipboard = await page.evaluate(() => navigator.clipboard.readText());
                await page.waitForTimeout(500);
                sample.delayed = {a: await documentSnapshot(docA), b: await documentSnapshot(docB)};
                // Test the redirected destination first: an old bundle naturally fails here.
                assert.deepEqual(sample.after.b, sample.before.b, `${name}: later active B must not receive the pending insert`);
                assert.deepEqual(sample.delayed.b, sample.before.b, `${name}: B must remain unchanged after delayed kernel flush`);
                assert.equal(sample.receipt.ok, true, JSON.stringify(sample.receipt));
                assert.equal(sample.receipt.data.mode, "insert-ref");
                if (closeOriginal) {
                    assert.equal(sample.receipt.data.downgraded, true, "Closing A during lookup must downgrade to copying");
                    assert.deepEqual(sample.after.a, sample.before.a, "Closed A must never receive an insert");
                    assert.deepEqual(sample.delayed.a, sample.before.a, "Closed A must remain unchanged after delayed flush");
                    assert.equal(sample.clipboard, expected, "Closed-target fallback must copy the exact reference");
                } else {
                    assert.equal(sample.receipt.data.downgraded, false, "A connected captured editor must receive the real insertion");
                    const added = sample.after.a.filter((block) => !sample.before.a.some((before) => before.id === block.id));
                    assert.equal(added.length, 1, "Original A must gain exactly one block");
                    assert.equal(sample.after.a.length, sample.before.a.length + 1);
                    assert.equal(stripIal(added[0].kramdown), expected, "Original A must receive the exact reference");
                    assert.deepEqual(sample.after.a.filter((block) => sample.before.a.some((before) => before.id === block.id)), sample.before.a, "A's existing blocks must remain unchanged");
                    assert.deepEqual(sample.delayed.a, sample.after.a, "A must receive no delayed duplicate");
                }
                assert.deepEqual(await documentSnapshot(sourceDocId), sourceBefore, "Protocol actions must leave the source unchanged");
                sample.passed = true;
                check(`${name}: real lookup delay preserves the original target contract`, sample);
            } catch (error) {
                sample.failure = {message: error.message, stack: error.stack};
                console.error(`FAIL ${name}: ${error.message}`);
                if (guard.failed) throw guard.failure;
            } finally {
                if (guard.failed) await gate?.abort();
                else {
                    gate?.release();
                    if (pending) await pending.catch(() => {});
                    if (gate) await page.unroute("**/api/attr/getBlockAttrs", gate.handler).catch(() => {});
                    await page.screenshot({path: path.join(outputDir, `${name}.png`)}).catch(() => {});
                }
                activeGate = null;
            }
        }
        await guard.verify("before final configuration snapshot", {force: true});
        assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify(window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").config))), initialConfig, "The protocol collector must never change library configuration");
        assert.equal(report.errors.length, 0, "Renderer exceptions invalidate acceptance");
        assert.equal(report.nativeDialogs.length, 0, "Unexpected native dialogs invalidate the interaction sequence");
        assert(report.cases.every((sample) => sample.passed), "At least one protocol target race violated A/B snapshots or receipt semantics");
        report.passed = true;
    } catch (error) {
        report.failure = {message: error.message, stack: error.stack};
        process.exitCode = 1;
    } finally {
        if (guard.failed) await activeGate?.abort();
        else activeGate?.release();
        report.finishedAt = new Date().toISOString();
        fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(report, null, 2));
        console.log(`Evidence: ${path.join(outputDir, "result.json")}`);
        await stopWatching?.();
        await browser?.close().catch(() => {});
    }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = {argumentsForRun};
