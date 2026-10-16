/* Real Electron acceptance for editor fallback and consecutive action selection.
 * Never point this at a daily workspace.
 * Requires OS-level isolation plus dedicated host config/profile. A mirror,
 * profile, or process observer alone cannot prevent workspace escape.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

const {argumentsForRun: strictElectronArguments} = require("./electron-settings-stress-acceptance.cjs");
const {createIsolationGuard} = require("./electron-isolation.cjs");
const {guardElectronPage, watchElectronTargets} = require("./electron-isolation-playwright.cjs");

function argumentsForRun(argv) {
    for (let index = 0; index < argv.length; index += 2) assert(["--cdp", "--workspace"].includes(argv[index]), `Unknown argument: ${argv[index]}`);
    return strictElectronArguments(argv);
}

const control = (value) => `[data-xlc-control="${value}"]`;

async function main() {
    const options = argumentsForRun(process.argv.slice(2));
    let browser;
    let stopWatching;
    const report = {
        task: "T-0081/R228",
        date: new Date().toISOString(),
        workspace: options.workspace,
        cdp: options.cdp,
        processId: options.processId,
        checks: [],
        errors: [],
        nativeDialogs: [],
        boundaries: ["This run uses a real Electron renderer and host APIs. It does not stub active editor or selection and does not remove host DOM nodes.", "The continuous sequence calls the public service protocol against one real target document; it records each real receipt and kernel result. It does not claim that one search dialog's frozen target survives between separate protocol calls.", "A host selection failure remains a failure boundary rather than being converted to success."],
    };
    let page;
    const outputDir = path.join(options.workspace, "temp", `editor-actions-acceptance-${Date.now()}`);
    fs.mkdirSync(outputDir, {recursive: true});
    const check = (name, evidence) => {
        report.checks.push({name, passed: true, evidence});
        console.log(`PASS ${name}`);
    };
    const guard = createIsolationGuard(options, {
        onVerified: (identity) => { report.isolation = identity; },
        onViolation: async (error, reason) => {
            report.passed = false;
            process.exitCode = 1;
            report.isolationFailure = {message: error.message, reason};
            await browser?.close().catch(() => {});
        },
    });
    try {
        await guard.verify("before-cdp", {force: true});
        browser = await chromium.connectOverCDP(options.cdp);
        stopWatching = await watchElectronTargets(browser, guard);
        const browserCDP = await browser.newBrowserCDPSession();
        try {
            const main = (await browserCDP.send("SystemInfo.getProcessInfo")).processInfo.filter((entry) => entry.type === "browser");
            assert.equal(main.length, 1);
            assert.equal(main[0].id, options.processId, "CDP PID must match the validated mirror");
        } finally { await browserCDP.detach(); }
        const matches = [];
        for (const context of browser.contexts()) {
            for (const candidate of context.pages()) {
                const workspace = await candidate.evaluate(() => window.siyuan?.config?.system?.workspaceDir).catch(() => null);
                if (typeof workspace === "string" && path.resolve(workspace).toLowerCase() === options.workspace.toLowerCase()) matches.push(candidate);
            }
        }
        assert.equal(matches.length, 1);
        page = guardElectronPage(matches[0], guard, options);
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        report.host = await page.evaluate(() => ({workspace: window.siyuan.config.system.workspaceDir, kernel: window.siyuan.config.system.kernelVersion, electron: window.process?.versions?.electron}));
        assert(report.host.electron);
        await guard.verify("before renderer reload", {force: true});
        await page.reload({waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        report.rendererReload = "fresh renderer lifecycle before fixture and real tab closure";

        page.on("pageerror", (error) => report.errors.push(String(error.message).slice(0, 1500)));
        page.on("dialog", async (dialog) => { report.nativeDialogs.push({type: dialog.type(), message: dialog.message()}); if (!guard.failed) { await guard.verify("native dialog dismissal"); await dialog.dismiss(); } });

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
        const libraryDocId = await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").config.containerDocIds[0]);
        const runId = Date.now().toString(36);
        const notebook = (await api("/api/notebook/createNotebook", {name: `XLC动作${runId}`})).notebook;
        const sourceDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/动作来源${runId}`, markdown: `连续动作源正文 ${runId}`});
        const sourceBlock = (await api("/api/block/getChildBlocks", {id: sourceDocId}))[0];
        const targetDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/动作目标${runId}`, markdown: "连续动作目标文档"});
        await guard.verify("before public save", {force: true});
        const item = await page.evaluate(async ({sourceDocId, sourceBlock, runId}) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.save({
            itemType: "blockref",
            markdown: `((${sourceBlock.id} '连续动作条目${runId}'))`,
            title: `连续动作条目${runId}`,
            tags: ["electron-r228"],
            category: "验收",
            source: {sourceDocId, sourceBlockId: sourceBlock.id, sourceType: "block"},
        }), {sourceDocId, sourceBlock, runId});
        assert.equal(item.ok, true, JSON.stringify(item));
        const itemId = item.data.id;
        report.fixture = {notebookId: notebook.id, sourceDocId, sourceBlockId: sourceBlock.id, targetDocId, itemId, libraryDocId};
        check("isolated Electron identity and real fixture", report.host);

        async function closeAllDocuments() {
            let closed = 0;
            while (await page.locator('.layout-tab-bar [data-type="tab-header"]').count()) {
                const before = await page.locator('.layout-tab-bar [data-type="tab-header"]').count();
                await page.locator('.layout-tab-bar [data-type="tab-header"]').first().locator('.item__close').click();
                await page.waitForFunction((count) => document.querySelectorAll('.layout-tab-bar [data-type="tab-header"]').length < count, before);
                closed++;
            }
            return closed;
        }
        const closedTabs = await closeAllDocuments();
        const noEditor = await page.evaluate((closedTabs) => { const x = window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common"); return {closedTabs, hasActiveEditor: x.host.hasActiveEditor(), currentDocId: x.host.currentDocId()}; }, closedTabs);
        assert.equal(noEditor.hasActiveEditor, false);
        assert.equal(noEditor.currentDocId, null);
        check("real host has no active editor after closing every document", noEditor);
        const noEditorSourceBefore = await documentSnapshot(sourceDocId);
        const noEditorTargetBefore = await documentSnapshot(targetDocId);

        // The isolated workspace may retain a prior acceptance dialog. Close it through
        // each visible host close control before opening the new real search session.
        while (await page.locator('.b3-dialog__close:visible').count()) {
            await page.locator('.b3-dialog__close:visible').last().click();
            await page.waitForTimeout(100);
        }
        await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").commands.find((entry) => entry.langKey === "open").callback());
        const searchInput = page.locator(control("search.input")).last();
        await searchInput.waitFor();
        await searchInput.fill(`连续动作条目${runId}`);
        await page.waitForFunction((title) => { const rows = [...document.querySelectorAll('[data-xlc-control="item.row"]')]; return rows.length === 1 && rows[0].textContent.includes(title); }, `连续动作条目${runId}`);
        const fallbackState = await page.evaluate(() => ({
            banner: document.querySelector(".xlc-target-banner")?.textContent || "",
            primary: document.querySelector('[data-xlc-control="preview.insert"]')?.textContent || "",
            label: document.querySelector('[data-xlc-control="preview.insert"]')?.getAttribute("aria-label") || "",
            title: document.querySelector('[data-xlc-control="preview.insert"]')?.getAttribute("title") || "",
            rows: document.querySelectorAll('[data-xlc-control="item.row"]').length,
        }));
        assert.match(fallbackState.banner, /没有活动编辑器/);
        assert.equal(fallbackState.primary, "复制");
        assert.match(fallbackState.label, /主操作会复制到剪贴板/);
        assert.equal(fallbackState.title, "当前没有活动编辑器，主操作会复制到剪贴板");
        assert.equal(fallbackState.rows, 1);
        await page.locator(control("item.row")).filter({hasText: `连续动作条目${runId}`}).last().waitFor({state: "visible"});
        await page.evaluate((text) => navigator.clipboard.writeText(text), `xlc-r228-before-no-editor-${runId}`);
        await page.locator(control("preview.insert")).last().click();
        await page.waitForTimeout(500);
        const fallbackClipboard = await page.evaluate(() => navigator.clipboard.readText());
        const fallbackReceipt = await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.insert(id, {mode: "insert-ref"}), itemId);
        const fallbackAfter = await page.evaluate(() => ({notice: Array.from(document.querySelectorAll(".b3-snackbar, .b3-snackbar__content")).map((e) => e.textContent).filter(Boolean).slice(-5), primary: document.querySelector('[data-xlc-control="preview.insert"]')?.textContent, banner: document.querySelector(".xlc-target-banner")?.textContent}));
        assert.equal(fallbackClipboard, `((${sourceBlock.id} '连续动作条目${runId}'))`);
        assert.equal(fallbackReceipt.ok, true);
        assert.equal(fallbackReceipt.data.downgraded, true);
        assert.equal(fallbackReceipt.data.mode, "insert-ref");
        check("no-editor insert visibly downgrades and copies through the real host", {state: fallbackState, clipboard: fallbackClipboard, receipt: fallbackReceipt, notices: fallbackAfter.notice});
        await page.locator(control("preview.copy")).last().click();
        await page.waitForTimeout(300);
        const copyClipboard = await page.evaluate(() => navigator.clipboard.readText());
        const copyReceipt = await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.copy(id), itemId);
        assert.equal(copyClipboard, `连续动作源正文 ${runId}`);
        assert.equal(copyReceipt.ok, true);
        assert.deepEqual(await documentSnapshot(sourceDocId), noEditorSourceBefore, "No-editor actions must leave source blocks unchanged");
        assert.deepEqual(await documentSnapshot(targetDocId), noEditorTargetBefore, "No-editor actions must leave target blocks unchanged");
        check("no-editor copy action writes the real system clipboard", {clipboard: copyClipboard, receipt: copyReceipt});
        await page.keyboard.press("Escape");

        // Close any nested search surface via a real renderer lifecycle before the
        // continuous sequence; the target editor itself is opened normally below.
        await guard.verify("before renderer reload", {force: true});
        await page.reload({waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        await page.waitForTimeout(1000);
        report.continuousSequenceSetup = "fresh renderer after real no-editor UI actions; same target document opened once for all three protocol modes";
        const opened = await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.openDoc(id), targetDocId);
        assert.equal(opened, true);
        await page.locator('.layout-tab-bar [data-type="tab-header"]').filter({hasText: `动作目标${runId}`}).last().click();
        const targetEditor = page.locator(`.protyle[data-node-id="${targetDocId}"]:not(.fn__none) .protyle-wysiwyg [contenteditable="true"]`).first();
        await targetEditor.waitFor({state: "visible"});
        await targetEditor.click({position: {x: 20, y: 10}});
        await page.waitForFunction((id) => { const x = window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common"); return x.host.hasActiveEditor() && x.host.currentDocId() === id; }, targetDocId);
        const before = await api("/api/block/getChildBlocks", {id: targetDocId});
        const sequence = [];
        const expected = {
            "insert-ref": `((${sourceBlock.id} '连续动作条目${runId}'))`,
            "insert-embed": `{{select * from blocks where id='${sourceBlock.id}'}}`,
            "insert-content": `连续动作源正文 ${runId}`,
        };
        const stripIal = (text) => text.replace(/\n\{:[^\r\n]*\}\s*$/, "").trim();
        async function documentSnapshot(docId) {
            const blocks = await api("/api/block/getChildBlocks", {id: docId});
            const snapshot = [];
            for (const block of blocks) snapshot.push({id: block.id, kramdown: (await api("/api/block/getBlockKramdown", {id: block.id})).kramdown});
            return snapshot;
        }
        async function selectionState() {
            return page.evaluate(() => { const x = window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common"); const selection = getSelection(); return {hasEditor: x.host.hasActiveEditor(), docId: x.host.currentDocId(), rangeCount: selection?.rangeCount, anchor: selection?.anchorNode?.parentElement?.outerHTML?.slice(0, 1000)}; });
        }
        for (const mode of ["insert-ref", "insert-embed", "insert-content"]) {
            const prior = await documentSnapshot(targetDocId);
            const selection = await selectionState();
            await guard.verify("before public insert", {force: true});
            const receipt = await page.evaluate(({id, mode}) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").service.insert(id, {mode}), {id: itemId, mode});
            await page.waitForTimeout(1000);
            const after = await documentSnapshot(targetDocId);
            const added = after.filter((block) => !prior.some((entry) => entry.id === block.id));
            const step = {mode, receipt, childCount: after.length, added, selection};
            sequence.push(step);
            report.continuousSequence = {before: before.map((block) => block.id), steps: sequence};
            assert.equal(receipt.ok, true, `${mode} receipt failed: ${JSON.stringify(receipt)}`);
            assert.equal(receipt.data?.mode, mode, `${mode} receipt mode mismatch`);
            if (receipt.data?.downgraded === true) {
                assert.deepEqual(after, prior, `${mode} fallback must not change any target block`);
                step.clipboard = await page.evaluate(() => navigator.clipboard.readText());
                assert.equal(step.clipboard, expected[mode], `${mode} fallback clipboard mismatch`);
                step.selectionBoundary = true;
            } else {
                assert.equal(receipt.data?.downgraded, false);
                assert.equal(added.length, 1, `${mode} must add exactly one kernel block`);
                assert.equal(after.length, prior.length + 1);
                assert.equal(stripIal(added[0].kramdown), expected[mode], `${mode} kernel kramdown mismatch`);
            }
        }
        report.continuousSequence = {before: before.map((block) => block.id), steps: sequence};
        check("same-editor protocol actions either insert exact blocks or safely copy without target changes", report.continuousSequence);

        const uiTargetDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/冻结目标${runId}`, markdown: "冻结目标起始段"});
        report.fixture.uiTargetDocId = uiTargetDocId;
        assert.equal(await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.openDoc(id), uiTargetDocId), true);
        await page.locator('.layout-tab-bar [data-type="tab-header"]').filter({hasText: `冻结目标${runId}`}).last().click();
        await page.locator(`.protyle[data-node-id="${uiTargetDocId}"]:not(.fn__none) .protyle-wysiwyg [contenteditable="true"]`).first().click({position: {x: 20, y: 10}});
        await page.waitForFunction((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.currentDocId() === id, uiTargetDocId);
        await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").commands.find((entry) => entry.langKey === "open").callback());
        const frozenInput = page.locator(control("search.input"));
        await frozenInput.waitFor({state: "visible"});
        const frozenInputHandle = await frozenInput.elementHandle();
        await frozenInput.fill(`连续动作条目${runId}`);
        await page.waitForFunction((title) => { const rows = [...document.querySelectorAll('[data-xlc-control="item.row"]')]; return rows.length === 1 && rows[0].textContent.includes(title); }, `连续动作条目${runId}`);
        const beforeUiInsert = await documentSnapshot(uiTargetDocId);
        assert.equal(await page.locator(control("preview.insert")).textContent(), "插入");
        await page.locator(control("preview.insert")).click();
        await page.waitForTimeout(1000);
        const afterUiInsert = await documentSnapshot(uiTargetDocId);
        const uiAdded = afterUiInsert.filter((block) => !beforeUiInsert.some((entry) => entry.id === block.id));
        assert.equal(uiAdded.length, 1, "A real search primary activation must insert one reference into its frozen target");
        assert.equal(stripIal(uiAdded[0].kramdown), expected["insert-ref"]);
        check("one search dialog inserts one reference into its captured editor", {uiTargetDocId, added: uiAdded});

        await page.keyboard.press("Control+w");
        await page.waitForFunction((id) => !document.querySelector(`.protyle[data-node-id="${id}"]`), uiTargetDocId);
        assert.equal(await frozenInputHandle.evaluate((element) => element.isConnected), true, "Closing the target tab must retain the same search dialog");
        await page.locator(control("preview.source")).click();
        await page.locator(`.protyle[data-node-id="${sourceDocId}"]:not(.fn__none)`).waitFor({state: "visible"});
        await page.waitForFunction((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.currentDocId() === id, sourceDocId);
        await frozenInput.fill(`连续动作条目${runId} `);
        await frozenInput.fill(`连续动作条目${runId}`);
        await page.waitForTimeout(350);
        assert.equal(await frozenInputHandle.evaluate((element) => element === document.querySelector('[data-xlc-control="search.input"]')), true, "Source navigation must keep the original search input instance");
        const frozenState = await page.evaluate(() => ({banner: document.querySelector(".xlc-target-banner")?.textContent, primary: document.querySelector('[data-xlc-control="preview.insert"]')?.textContent, title: document.querySelector('[data-xlc-control="preview.insert"]')?.getAttribute("title")}));
        assert.equal(frozenState.primary, "复制");
        assert.match(frozenState.banner, /原插入位置不可用/);
        const frozenTargetBeforeFallback = await documentSnapshot(uiTargetDocId);
        const sourceBeforeFallback = await documentSnapshot(sourceDocId);
        await page.evaluate((text) => navigator.clipboard.writeText(text), `xlc-r228-before-frozen-copy-${runId}`);
        await page.locator(control("preview.insert")).click();
        await page.waitForTimeout(500);
        const frozenClipboard = await page.evaluate(() => navigator.clipboard.readText());
        assert.equal(frozenClipboard, expected["insert-ref"]);
        assert.deepEqual(await documentSnapshot(uiTargetDocId), frozenTargetBeforeFallback, "Invalid frozen target must not be written");
        assert.deepEqual(await documentSnapshot(sourceDocId), sourceBeforeFallback, "The newly opened source must not receive a redirected insert");
        await page.waitForTimeout(1000);
        assert.deepEqual(await documentSnapshot(uiTargetDocId), frozenTargetBeforeFallback, "Invalid frozen target must remain unchanged after delayed kernel flush");
        assert.deepEqual(await documentSnapshot(sourceDocId), sourceBeforeFallback, "Opened source must remain unchanged after delayed kernel flush");
        const frozenNotice = await page.evaluate(() => [...document.querySelectorAll(".b3-snackbar, .b3-snackbar__content")].map((element) => element.textContent).filter(Boolean));
        assert(frozenNotice.some((text) => text.includes("原插入位置已失效") && text.includes("已复制到剪贴板")), "Invalid-target copy must display its completion notice");
        check("same search dialog copies after its captured tab closes and never redirects to the opened source", {state: frozenState, clipboard: frozenClipboard, notice: frozenNotice, target: frozenTargetBeforeFallback, source: sourceBeforeFallback});
        await page.screenshot({path: path.join(outputDir, "frozen-target-copied.png")});
        await frozenInputHandle.dispose();
        assert.equal(report.errors.length, 0, `Renderer exceptions: ${report.errors.join("; ")}`);
        assert.equal(report.nativeDialogs.length, 0);
        report.passed = true;
        report.evidenceDir = outputDir;
    } catch (error) {
        report.passed = false;
        report.failure = {message: error.message, stack: error.stack};
        if (!guard.failed && page && outputDir) await page.screenshot({path: path.join(outputDir, "failure.png")}).catch(() => {});
        throw error;
    } finally {
        if (outputDir) {
            fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(report, null, 2));
            console.log(`Evidence: ${path.join(outputDir, "result.json")}`);
        }
        await stopWatching?.();
        await browser?.close();
    }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = {argumentsForRun};
