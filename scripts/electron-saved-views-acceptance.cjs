/* Real Electron acceptance. Never point this at a daily workspace.
 * Requires OS-level isolation plus dedicated host config/profile; neither a
 * copied mirror nor a dedicated profile alone provides OS isolation.
 * Example:
 * node scripts/electron-saved-views-acceptance.cjs --cdp http://127.0.0.1:9356 --workspace C:\\Users\\Admin\\AppData\\Local\\Temp\\xlc-electron-r226-20261016061028
 * Requires a configured dedicated library. Fixtures/evidence remain in the disposable workspace.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {setTimeout: pause} = require("node:timers/promises");
const {chromium} = require("playwright");

const {argumentsForRun: strictElectronArguments} = require("./electron-settings-stress-acceptance.cjs");
const {createIsolationGuard} = require("./electron-isolation.cjs");
const {guardElectronPage, watchElectronTargets} = require("./electron-isolation-playwright.cjs");

function argumentsForRun(argv) {
    for (let index = 0; index < argv.length; index += 2) assert(["--cdp", "--workspace"].includes(argv[index]), `Unknown argument: ${argv[index]}`);
    return strictElectronArguments(argv);
}

const control = (value) => `[data-xlc-control="${value}"]`;
const action = (value) => `[data-xlc-discovery-action="${value}"]`;

async function main() {
    const options = argumentsForRun(process.argv.slice(2));
    let browser;
    let stopWatching;
    const report = {task: "T-0080/R227", date: new Date().toISOString(), workspace: options.workspace, cdp: options.cdp, processId: options.processId, checks: [], errors: [], nativeDialogs: [], rendererReloads: [], boundaries: ["Naming and post-sync close use real host Dialog forms. A fresh renderer reload begins the acceptance run; post-sync close must complete through the actual cancel/confirm controls without reload."]};
    let page;
    const outputDir = path.join(options.workspace, "temp", `saved-view-acceptance-${Date.now()}`);
    fs.mkdirSync(outputDir, {recursive: true});
    let hasSynced = false;
    function check(name, evidence) {
        report.checks.push({name, passed: true, evidence});
        console.log(`PASS ${name}`);
    }
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
        assert.equal(matches.length, 1, "Expected exactly one renderer for the supplied workspace");
        page = guardElectronPage(matches[0], guard, options);
        assert(["127.0.0.1", "localhost"].includes(new URL(page.url()).hostname), "Renderer must use loopback");
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        const identity = await page.evaluate(() => ({workspace: window.siyuan.config.system.workspaceDir, kernel: window.siyuan.config.system.kernelVersion, electron: window.process?.versions?.electron}));
        assert(identity.electron, "This must be an Electron renderer, not a Chromium harness");
        report.host = identity;

        check("isolated Electron identity", identity);
        page.on("pageerror", (error) => report.errors.push(String(error.message).slice(0, 1500)));
        page.on("dialog", async (dialog) => {
            const message = dialog.message();
            report.nativeDialogs.push({type: dialog.type(), message});
            if (!guard.failed) { await guard.verify("native dialog dismissal"); await dialog.dismiss(); }
        });
        await guard.verify("before renderer reload", {force: true});
        await page.reload({waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        report.rendererReloads.push({reason: "start with a fresh plugin lifecycle and no prior temporary undo session"});

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
        const config = await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").config);
        assert(config?.mode === "doc" && config.containerDocIds?.length === 1, "Acceptance requires one dedicated document library");
        const libraryDocId = config.containerDocIds[0];
        const libraryBefore = await api("/api/block/getChildBlocks", {id: libraryDocId});
        const runId = Date.now().toString(36);
        const tag = `客服验收${runId}`;
        const sourceTitle = `视图来源${runId}`;
        const notebook = (await api("/api/notebook/createNotebook", {name: `XLC视图${runId}`})).notebook;
        const sourceDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/${sourceTitle}`, markdown: `延期模板 #${tag}#\n\n邮件跟进 #${tag}# #邮件#\n\n排除项 #${tag}2#`});
        const childDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/${sourceTitle}/子文档`, markdown: `子文档模板 #${tag}#`});
        const decoyDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/非目标${runId}`, markdown: `范围外模板 #${tag}#`});
        const anchorDocId = await api("/api/filetree/createDocWithMd", {notebook: notebook.id, path: `/笔记本入口${runId}`, markdown: "该文档只用于打开笔记本发现，不含匹配标签。"});
        const movedNotebook = (await api("/api/notebook/createNotebook", {name: `XLC移出锚${runId}`})).notebook;
        const sourceBlocks = await api("/api/block/getChildBlocks", {id: sourceDocId});
        assert.equal(sourceBlocks.length, 3);
        const expectedSourceIds = sourceBlocks.slice(0, 2).map((block) => block.id);
        // Custom attributes provide an extra source-integrity witness beyond ID and body.
        for (const block of sourceBlocks) await api("/api/attr/setBlockAttrs", {id: block.id, attrs: {"custom-xlc-acceptance-witness": runId}});
        async function snapshot(docId) {
            const blocks = await api("/api/block/getChildBlocks", {id: docId});
            const values = [];
            for (const block of blocks) values.push({id: block.id, body: await api("/api/block/getBlockKramdown", {id: block.id}), attrs: await api("/api/attr/getBlockAttrs", {id: block.id})});
            return values;
        }
        const sourceBefore = await snapshot(sourceDocId);
        const childBefore = await snapshot(childDocId);
        const decoyBefore = await snapshot(decoyDocId);
        const sourceDocuments = new Map([...expectedSourceIds.map((id) => [id, sourceDocId]), ...childBefore.map((block) => [block.id, childDocId]), ...decoyBefore.map((block) => [block.id, decoyDocId])]);
        report.fixture = {notebookId: notebook.id, sourceDocId, childDocId, decoyDocId, anchorDocId, movedNotebookId: movedNotebook.id, libraryDocId, tag};

        async function openDocument(docId) {
            await guard.verify("openDocument", {force: true});
            const opened = await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.openDoc(id), docId);
            assert.equal(opened, true);
            await page.waitForFunction((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.currentDocId() === id, docId);
        }
        async function closeDiscovery(exercise = false) {
            await guard.verify("closeDiscovery", {force: true});
            if (await page.locator(".xlc-discovery").count()) {
                const entriesBeforeClose = hasSynced ? await referenceEntries() : null;
                await page.locator(`.xlc-discovery ${action("close")}`).click();
                if (hasSynced) {
                    const confirmation = page.locator(".xlc-discovery-close-form");
                    await confirmation.waitFor({state: "visible"});
                    assert.equal(await confirmation.count(), 1, "Only one close confirmation may be open");
                    if (exercise) {
                        // Replay a second close control activation while its confirmation
                        // is present; do not call controller methods or stub host dialogs.
                        await page.evaluate(() => document.querySelector('.xlc-discovery [data-xlc-discovery-action="close"]').click());
                        assert.equal(await confirmation.count(), 1, "Repeated close must reuse the pending confirmation");
                        await page.screenshot({path: path.join(outputDir, "close-confirmation.png")});
                        await page.locator(control("discovery.close.cancel")).click();
                        await confirmation.waitFor({state: "detached"});
                        assert.equal(await page.locator(".xlc-discovery").count(), 1, "Cancel must preserve the discovery window");
                        assert.match((await viewState()).receipt, /撤销本批新增/, "Cancel must preserve the batch undo entry");
                        assert.deepEqual(await referenceEntries(), entriesBeforeClose, "Cancel must preserve the synced references");
                        check("post-sync close cancellation preserves discovery and references", {entries: entriesBeforeClose.map((entry) => entry.id)});
                        await page.locator(`.xlc-discovery ${action("close")}`).click();
                        await confirmation.waitFor({state: "visible"});
                        await page.evaluate(() => {
                            const confirmButton = document.querySelector('[data-xlc-control="discovery.close.confirm"]');
                            confirmButton.click();
                            confirmButton.click();
                        });
                    } else {
                        await page.locator(control("discovery.close.confirm")).click();
                    }
                    await confirmation.waitFor({state: "detached"});
                    hasSynced = false;
                    assert.deepEqual(await referenceEntries(), entriesBeforeClose, "Confirming close must retain all synced references");
                    if (exercise) check("post-sync repeated close/confirm produces one close and retains references", {entries: entriesBeforeClose.map((entry) => entry.id)});
                }
                await page.locator(".xlc-discovery").waitFor({state: "detached"});
            }
        }
        async function waitScan() {
            await page.waitForFunction(() => {
                const root = document.querySelector(".xlc-discovery");
                return root && root.getAttribute("aria-busy") !== "true" && root.querySelector(".xlc-discovery-row, .xlc-discovery-empty");
            });
        }
        async function viewState() {
            return page.evaluate(() => {
                const root = document.querySelector(".xlc-discovery");
                const read = (id) => root?.querySelector(`[data-xlc-control="${id}"]`);
                return {
                    tag: read("discovery.filter.tag")?.value,
                    scope: read("discovery.scope")?.value,
                    target: read("discovery.tree.result")?.value,
                    mode: read("discovery.add-mode")?.value,
                    modeLocked: read("discovery.add-mode")?.disabled,
                    rows: Array.from(root?.querySelectorAll(".xlc-discovery-row") || []).map((row) => ({title: row.querySelector(".xlc-discovery-row-title")?.textContent, selected: row.querySelector("input")?.checked, disabled: row.querySelector("input")?.disabled, status: row.querySelector(".xlc-badge")?.textContent})),
                    button: root?.querySelector('[data-xlc-discovery-action="add-selected"]')?.textContent,
                    buttonDisabled: root?.querySelector('[data-xlc-discovery-action="add-selected"]')?.disabled,
                    receipt: root?.querySelector(".xlc-discovery-receipt")?.textContent,
                    settingsCount: document.querySelectorAll(".xlc-settings").length,
                };
            });
        }
        async function switchDiscoveryWithPendingBatch(targetDocId) {
            await guard.verify("switchDiscoveryWithPendingBatch", {force: true});
            assert.equal(hasSynced, true, "Switch acceptance requires a real undoable sync batch");
            const previous = await viewState();
            const entriesBeforeSwitch = await referenceEntries();
            const previousRoot = await page.locator(".xlc-discovery").elementHandle();
            await openDocument(targetDocId);
            const requestDocument = () => page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").commands.find((entry) => entry.langKey === "discoverCurrentDocument").callback());
            const confirmation = page.locator(".xlc-discovery-close-form");
            await requestDocument();
            await confirmation.waitFor({state: "visible"});
            await page.screenshot({path: path.join(outputDir, "switch-close-confirmation.png")});
            await page.locator(control("discovery.close.cancel")).click();
            await confirmation.waitFor({state: "detached"});
            assert.equal(await previousRoot.evaluate((element) => element.isConnected), true, "Canceling a requested switch must retain the original discovery window");
            assert.deepEqual(await viewState(), previous, "Canceling a requested switch must preserve its scope, candidates and undo receipt");
            assert.deepEqual(await referenceEntries(), entriesBeforeSwitch);
            check("pending view switch cancellation preserves the original view and undo batch", {scope: previous.scope, target: previous.target, entries: entriesBeforeSwitch.map((entry) => entry.id)});
            await requestDocument();
            await confirmation.waitFor({state: "visible"});
            await page.locator(control("discovery.close.confirm")).click();
            await confirmation.waitFor({state: "detached"});
            await page.waitForFunction((element) => !element.isConnected, previousRoot);
            hasSynced = false;
            await waitScan();
            const switched = await viewState();
            assert.equal(switched.scope, "document");
            assert.equal(switched.tag, "");
            assert.equal(switched.rows.length, 1, "Confirmed switch must automatically discover the requested target document");
            assert(switched.rows[0].title.includes("范围外模板"), "Confirmed switch must open the requested sibling document");
            assert.deepEqual(await referenceEntries(), entriesBeforeSwitch, "A confirmed view switch must preserve the old batch's synced references");
            check("confirmed pending view switch automatically opens its requested document", {targetDocId, state: switched, entries: entriesBeforeSwitch.map((entry) => entry.id)});
            await page.screenshot({path: path.join(outputDir, "switch-confirmed-document.png")});
            await previousRoot.dispose();
            await closeDiscovery();
        }
        async function savedViews() {
            return page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").state.search.savedDiscoveryViews || []);
        }
        async function waitPersistedView(view) {
            const stateFile = path.join(options.workspace, "data", "storage", "petal", "xiaolv-common", "state.json");
            for (let attempt = 0; attempt < 100; attempt++) {
                try {
                    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
                    if (state.search?.savedDiscoveryViews?.some((entry) => entry.id === view.id && entry.tag === view.tag && entry.targetDocId === view.targetDocId && entry.targetNotebookId === view.targetNotebookId)) return;
                } catch { /* the host may be atomically replacing the sidecar */ }
                await pause(100);
            }
            throw new Error("Saved view did not reach the real sidecar file before reload");
        }
        async function saveThroughForm(name, testForm = false, target = {docId: sourceDocId, notebookId: ""}) {
            await guard.verify("saveThroughForm", {force: true});
            const beforeCount = (await savedViews()).length;
            await page.locator(action("save-view")).click();
            const input = page.locator(control("discovery.view.name"));
            await input.waitFor({state: "visible"});
            assert.equal(await input.inputValue(), tag);
            if (testForm) {
                await input.fill("   ");
                await page.locator(control("discovery.view.save")).click();
                assert.equal(await input.getAttribute("aria-invalid"), "true");
                assert.equal((await savedViews()).length, beforeCount);
                await input.press("Escape");
                await input.waitFor({state: "detached"});
                assert.equal((await savedViews()).length, beforeCount);
                await page.locator(action("save-view")).click();
                await input.waitFor({state: "visible"});
                await input.fill("取消不会保存");
                await page.locator(control("discovery.view.cancel")).click();
                await input.waitFor({state: "detached"});
                assert.equal((await savedViews()).length, beforeCount);
                await page.locator(action("save-view")).click();
                await input.waitFor({state: "visible"});
                check("naming form rejects blank and cancels via Escape/button", {viewCount: beforeCount});
            }
            await input.fill(name);
            await page.screenshot({path: path.join(outputDir, `${name.includes("笔记本") ? "notebook" : name.includes("树") ? "tree" : "document"}-naming.png`)});
            await input.press("Enter");
            await input.waitFor({state: "detached"});
            const view = (await savedViews()).find((entry) => entry.name === name);
            assert(view, "Naming form did not persist a view");
            assert.equal(view.tag, tag);
            assert.equal(view.targetDocId, target.docId);
            assert.equal(view.targetNotebookId, target.notebookId);
            await waitPersistedView(view);
            return view;
        }
        async function openSaved(viewId) {
            await guard.verify("openSaved", {force: true});
            await closeDiscovery();
            await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").openSettings());
            const row = page.locator(`[data-xlc-saved-view-id="${viewId}"]`);
            await row.waitFor({state: "visible"});
            await row.locator(control("settings.saved-view.open")).click();
            await row.waitFor({state: "detached"});
            await waitScan();
        }
        async function referenceEntries() {
            const children = await api("/api/block/getChildBlocks", {id: libraryDocId});
            const entries = [];
            for (const block of children) {
                if (libraryBefore.some((prior) => prior.id === block.id)) continue;
                entries.push({id: block.id, attrs: await api("/api/attr/getBlockAttrs", {id: block.id}), body: await api("/api/block/getBlockKramdown", {id: block.id})});
            }
            return entries;
        }
        function assertReferenceEntries(entries, expectedIds) {
            assert.equal(entries.length, expectedIds.length);
            assert.deepEqual(entries.map((entry) => entry.attrs["custom-xlc-target"]).sort(), [...expectedIds].sort(), "Reference target IDs must equal the expected source set");
            assert.deepEqual(entries.map((entry) => entry.attrs["custom-xlc-src-block"]).sort(), [...expectedIds].sort(), "Reference source-block IDs must equal the expected source set");
            for (const entry of entries) {
                const target = entry.attrs["custom-xlc-target"];
                assert.equal(entry.attrs["custom-xlc-type"], "blockref");
                assert.equal(entry.attrs["custom-xlc-src-doc"], sourceDocuments.get(target));
                const anchor = entry.attrs["custom-xlc-title"].replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const marker = entry.body.kramdown.replace(/\n\{:[^\r\n]*\}\s*$/, "").trim();
                assert.equal(marker, `((${target} '${anchor}'))`, "Reference entry must contain exactly one marker and no copied source body");
            }
        }
        async function syncSelected() {
            await guard.verify("syncSelected", {force: true});
            await page.locator(action("add-selected")).click();
            await page.waitForFunction(() => {
                const root = document.querySelector(".xlc-discovery");
                return root && root.getAttribute("aria-busy") !== "true" && root.querySelector(".xlc-discovery-receipt")?.textContent;
            });
            hasSynced = true;
        }

        await openDocument(sourceDocId);
        await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").commands.find((entry) => entry.langKey === "discoverCurrentDocument").callback());
        await waitScan();
        await page.locator(control("discovery.filter.tag")).fill(tag);
        const filtered = await viewState();
        assert.equal(filtered.rows.length, 2, "Exact tag must exclude its suffixed neighbour");
        check("exact tag filters real source blocks", filtered);
        const documentView = await saveThroughForm(`客服文档${runId}`, true);
        assert.equal(documentView.scope, "document");
        check("real naming form saves document rule", documentView);
        const countBeforeRepeat = (await savedViews()).length;
        const repeatedView = await saveThroughForm(documentView.name);
        assert.equal(repeatedView.id, documentView.id);
        assert.equal((await savedViews()).length, countBeforeRepeat);
        check("saving same named rule is idempotent", {id: documentView.id, count: countBeforeRepeat});
        await closeDiscovery();
        await openDocument(decoyDocId);
        await openSaved(documentView.id);
        const reopened = await viewState();
        assert.equal(reopened.tag, tag);
        assert.equal(reopened.scope, "document");
        assert.equal(reopened.rows.length, 2);
        assert(reopened.rows.every((row) => row.selected));
        assert.equal(reopened.mode, "reference");
        assert.equal(reopened.modeLocked, true);
        assert.equal(reopened.button, "同步到常用库");
        check("settings opens frozen document with selected candidates and locked reference mode", reopened);
        await page.screenshot({path: path.join(outputDir, "document-reopened.png")});
        await syncSelected();
        const firstEntries = await referenceEntries();
        assertReferenceEntries(firstEntries, expectedSourceIds);
        check("sync writes real block reference entries", {entries: firstEntries, receipt: (await viewState()).receipt});
        await closeDiscovery(true);
        await openSaved(documentView.id);
        const secondState = await viewState();
        assert(secondState.rows.every((row) => !row.selected && row.disabled));
        assert.equal(secondState.buttonDisabled, true);
        const secondEntries = await referenceEntries();
        assert.deepEqual(secondEntries.map((entry) => entry.id), firstEntries.map((entry) => entry.id));
        check("repeat sync detects existing sources and creates no duplicate", secondState);

        await page.locator(control("discovery.scope")).selectOption("tree");
        await page.locator(control("discovery.tree.query")).fill(sourceTitle);
        await page.locator(control("discovery.tree.search")).click();
        await page.waitForFunction((id) => Array.from(document.querySelector('[data-xlc-control="discovery.tree.result"]')?.options || []).some((option) => option.value === id), sourceDocId);
        await page.locator(control("discovery.tree.result")).selectOption(sourceDocId);
        await waitScan();
        const treeView = await saveThroughForm(`客服树${runId}`);
        assert.equal(treeView.scope, "tree");
        await closeDiscovery();
        await openDocument(decoyDocId);
        await openSaved(treeView.id);
        const treeState = await viewState();
        assert.equal(treeState.target, sourceDocId);
        assert.equal(treeState.scope, "tree");
        assert.equal(treeState.rows.length, 3);
        assert.equal(treeState.rows.filter((row) => row.selected).length, 1);
        assert(!treeState.rows.some((row) => row.title.includes("范围外")));
        assert.equal(treeState.mode, "reference");
        assert.equal(treeState.modeLocked, true);
        check("tree view keeps saved root when another document is active", treeState);
        await page.screenshot({path: path.join(outputDir, "tree-reopened.png")});
        await syncSelected();
        const treeEntries = await referenceEntries();
        assertReferenceEntries(treeEntries, [...expectedSourceIds, ...childBefore.map((block) => block.id)]);
        check("tree sync adds only newly discovered child source", {count: treeEntries.length, receipt: (await viewState()).receipt});
        await switchDiscoveryWithPendingBatch(decoyDocId);

        await openDocument(anchorDocId);
        await page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").commands.find((entry) => entry.langKey === "discoverCurrentNotebook").callback());
        await waitScan();
        await page.locator(control("discovery.filter.tag")).fill(tag);
        assert.equal((await viewState()).rows.length, 4);
        const notebookView = await saveThroughForm(`客服笔记本${runId}`, false, {docId: "", notebookId: notebook.id});
        assert.equal(notebookView.scope, "notebook");
        check("real notebook naming form saves an explicit notebook without an anchor dependency", notebookView);
        await closeDiscovery();
        const anchorBeforeMove = await api("/api/block/getBlockInfo", {id: anchorDocId});
        await api("/api/filetree/moveDocs", {fromPaths: [`${notebook.id}${anchorBeforeMove.path}`], toNotebook: movedNotebook.id, toPath: "/"});
        const anchorAfterMove = await api("/api/block/getBlockInfo", {id: anchorDocId});
        assert.equal(anchorAfterMove.box, movedNotebook.id, "Fixture anchor must actually move to the other notebook");
        await guard.verify("before renderer reload", {force: true});
        await page.reload({waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        report.rendererReloads.push({reason: "verify persisted notebook rule after its original anchor moved; all post-sync sessions were closed through real Dialog controls"});
        await openDocument(anchorDocId);
        await openSaved(notebookView.id);
        const notebookState = await viewState();
        assert.equal(notebookState.scope, "notebook");
        assert.equal(notebookState.tag, tag);
        assert.equal(notebookState.rows.length, 4, "Moving the anchor must not retarget the saved notebook");
        assert.equal(notebookState.rows.filter((row) => row.selected).length, 1);
        assert.equal(notebookState.mode, "reference");
        assert.equal(notebookState.modeLocked, true);
        assert(notebookState.rows.some((row) => row.selected && row.title.includes("范围外模板")), "Only the remaining original-notebook source should be selected");
        check("notebook view stays on its saved notebook after anchor move and renderer reload", {view: notebookView, anchorNotebook: anchorAfterMove.box, state: notebookState});
        await page.screenshot({path: path.join(outputDir, "notebook-reopened.png")});
        await syncSelected();
        const notebookEntries = await referenceEntries();
        const notebookSourceIds = [...expectedSourceIds, ...childBefore.map((block) => block.id), ...decoyBefore.map((block) => block.id)];
        assertReferenceEntries(notebookEntries, notebookSourceIds);
        check("notebook sync adds exactly the remaining original-notebook source", {entries: notebookEntries.map((entry) => ({id: entry.id, source: entry.attrs["custom-xlc-src-block"]})), receipt: (await viewState()).receipt});
        await closeDiscovery(true);
        await openSaved(notebookView.id);
        const repeatedNotebookState = await viewState();
        assert.equal(repeatedNotebookState.rows.length, 4);
        assert(repeatedNotebookState.rows.every((row) => !row.selected && row.disabled));
        assert.equal(repeatedNotebookState.buttonDisabled, true);
        assert.deepEqual((await referenceEntries()).map((entry) => entry.id), notebookEntries.map((entry) => entry.id));
        check("notebook view can reopen after confirmed close without duplicate references", repeatedNotebookState);
        assert.deepEqual(await snapshot(sourceDocId), sourceBefore);
        assert.deepEqual(await snapshot(childDocId), childBefore);
        assert.deepEqual(await snapshot(decoyDocId), decoyBefore);
        check("source block IDs, bodies and attributes remain unchanged", {sourceIds: sourceBefore.map((block) => block.id), childIds: childBefore.map((block) => block.id), notebookSourceIds: decoyBefore.map((block) => block.id)});
        assert.equal(report.errors.length, 0, `Renderer exceptions: ${report.errors.join("; ")}`);
        assert.equal(report.nativeDialogs.length, 0, "The saved-view workflow must use host Dialog forms, not native JavaScript dialogs");
        report.passed = true;
        report.evidenceDir = outputDir;
        await closeDiscovery();
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
        await browser?.close(); // disconnect CDP; do not terminate the Electron process
    }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = {argumentsForRun};
