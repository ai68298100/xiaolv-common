/* Real Electron acceptance. Never point this at a daily workspace.
 * Example:
 * node scripts/electron-saved-views-acceptance.cjs --cdp http://127.0.0.1:9356 --workspace C:\\Users\\Admin\\AppData\\Local\\Temp\\xlc-electron-r226-20261016061028
 * Requires a configured dedicated library. Fixtures/evidence remain in the disposable workspace.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const {setTimeout: pause} = require("node:timers/promises");
const {chromium} = require("playwright");

function argumentsForRun(argv) {
    const options = {};
    for (let i = 0; i < argv.length; i += 2) {
        assert(["--cdp", "--workspace"].includes(argv[i]), `Unknown argument: ${argv[i]}`);
        assert(argv[i + 1], `Missing value: ${argv[i]}`);
        options[argv[i].slice(2)] = argv[i + 1];
    }
    assert(options.cdp && options.workspace, "Required: --cdp <loopback URL> --workspace <dedicated temp workspace>");
    const url = new URL(options.cdp);
    assert.equal(url.protocol, "http:", "CDP must use local HTTP");
    assert(["127.0.0.1", "localhost"].includes(url.hostname), "CDP must be loopback");
    assert(url.port && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "Unexpected CDP URL");
    const workspace = fs.realpathSync(options.workspace);
    const temp = fs.realpathSync(os.tmpdir());
    const relative = path.relative(temp, workspace);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Workspace must be inside the current user's temp directory");
    assert(/^xlc-electron-[a-z0-9-]+$/i.test(path.basename(workspace)), "Workspace must be a dedicated xlc-electron-* directory");
    assert(fs.existsSync(path.join(workspace, "data", "plugins", "xiaolv-common", "index.js")), "Missing isolated plugin installation");
    // Verify the matching Electron process before connecting or creating any fixtures.
    assert.equal(process.platform, "win32", "This acceptance script verifies Windows Electron isolation");
    const processes = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-Command",
        "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'SiYuan.exe' } | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress"], {encoding: "utf8"}) || "[]");
    const candidates = (Array.isArray(processes) ? processes : [processes]).filter((entry) =>
        new RegExp(`--remote-debugging-port=${url.port}(?:\\s|$)`).test(entry.CommandLine || "")
        && entry.CommandLine.includes(workspace)
        && !entry.CommandLine.includes("--type="));
    assert.equal(candidates.length, 1, "Expected exactly one Electron process matching CDP and workspace");
    const mirror = fs.realpathSync(path.dirname(candidates[0].ExecutablePath));
    const mirrorRelative = path.relative(temp, mirror);
    assert(mirrorRelative && !mirrorRelative.startsWith("..") && !path.isAbsolute(mirrorRelative), "Electron must run from a disposable temp mirror");
    assert(/^xlc-electron-.*mirror/i.test(path.basename(mirror)), "Expected a dedicated Electron mirror");
    return {cdp: url.origin, workspace, processId: candidates[0].ProcessId};
}

const control = (value) => `[data-xlc-control="${value}"]`;
const action = (value) => `[data-xlc-discovery-action="${value}"]`;

async function main() {
    const options = argumentsForRun(process.argv.slice(2));
    const browser = await chromium.connectOverCDP(options.cdp);
    const report = {task: "T-0079/R226", date: new Date().toISOString(), workspace: options.workspace, cdp: options.cdp, processId: options.processId, checks: [], errors: [], nativeDialogs: [], rendererReloads: [], boundaries: ["Electron native close confirmation is not covered. After a successful sync, reload the real renderer to end its temporary undo session; only reload after saved rules are confirmed in the actual sidecar file."]};
    let page;
    let outputDir;
    let hasSynced = false;
    function check(name, evidence) {
        report.checks.push({name, passed: true, evidence});
        console.log(`PASS ${name}`);
    }
    try {
        const matches = [];
        for (const context of browser.contexts()) {
            for (const candidate of context.pages()) {
                const workspace = await candidate.evaluate(() => window.siyuan?.config?.system?.workspaceDir).catch(() => null);
                if (typeof workspace === "string" && path.resolve(workspace).toLowerCase() === options.workspace.toLowerCase()) matches.push(candidate);
            }
        }
        assert.equal(matches.length, 1, "Expected exactly one renderer for the supplied workspace");
        page = matches[0];
        assert(["127.0.0.1", "localhost"].includes(new URL(page.url()).hostname), "Renderer must use loopback");
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        const identity = await page.evaluate(() => ({workspace: window.siyuan.config.system.workspaceDir, kernel: window.siyuan.config.system.kernelVersion, electron: window.process?.versions?.electron}));
        assert(identity.electron, "This must be an Electron renderer, not a Chromium harness");
        report.host = identity;
        outputDir = path.join(options.workspace, "temp", `saved-view-acceptance-${Date.now()}`);
        fs.mkdirSync(outputDir, {recursive: true});
        check("isolated Electron identity", identity);
        page.on("pageerror", (error) => report.errors.push(String(error.message).slice(0, 1500)));
        page.on("dialog", async (dialog) => {
            const message = dialog.message();
            const closeWarning = "本次发现仍有可撤销的收录批次。关闭会丢失撤销入口；仍要关闭吗？";
            report.nativeDialogs.push({type: dialog.type(), message});
            if (dialog.type() === "confirm" && message === closeWarning) await dialog.accept();
            else await dialog.dismiss();
        });
        await page.reload({waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
        report.rendererReloads.push({reason: "start with a fresh plugin lifecycle and no prior temporary undo session"});

        async function api(endpoint, body = {}) {
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
        const sourceDocuments = new Map([...expectedSourceIds.map((id) => [id, sourceDocId]), ...childBefore.map((block) => [block.id, childDocId])]);
        report.fixture = {notebookId: notebook.id, sourceDocId, childDocId, decoyDocId, libraryDocId, tag};

        async function openDocument(docId) {
            const opened = await page.evaluate((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.openDoc(id), docId);
            assert.equal(opened, true);
            await page.waitForFunction((id) => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").host.currentDocId() === id, docId);
        }
        async function closeDiscovery() {
            if (hasSynced) {
                // Electron's synchronous native confirm is outside CDP's dialog events.
                // A renderer reload ends the temporary undo session and also verifies that
                // saved rules survive a real plugin restart; it does not fabricate UI success.
                await page.reload({waitUntil: "domcontentloaded"});
                await page.waitForFunction(() => window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "xiaolv-common")?.sidecarReady === true);
                report.rendererReloads.push({reason: "end temporary undo session after sync; native close confirmation not covered", savedRuleIds: (await savedViews()).map((view) => view.id)});
                hasSynced = false;
                return;
            }
            if (await page.locator(".xlc-discovery").count()) {
                await page.locator(`.xlc-discovery ${action("close")}`).click();
                await page.locator(".xlc-discovery").waitFor({state: "detached"});
            }
        }
        async function waitScan() {
            await page.waitForFunction(() => {
                const root = document.querySelector(".xlc-discovery");
                return root && root.getAttribute("aria-busy") !== "true" && root.querySelector(".xlc-discovery-row");
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
        async function savedViews() {
            return page.evaluate(() => window.siyuan.ws.app.plugins.find((entry) => entry.name === "xiaolv-common").state.search.savedDiscoveryViews || []);
        }
        async function waitPersistedView(view) {
            const stateFile = path.join(options.workspace, "data", "storage", "petal", "xiaolv-common", "state.json");
            for (let attempt = 0; attempt < 100; attempt++) {
                try {
                    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
                    if (state.search?.savedDiscoveryViews?.some((entry) => entry.id === view.id && entry.tag === view.tag && entry.targetDocId === view.targetDocId)) return;
                } catch { /* the host may be atomically replacing the sidecar */ }
                await pause(100);
            }
            throw new Error("Saved view did not reach the real sidecar file before reload");
        }
        async function saveThroughForm(name, testForm = false) {
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
            await page.screenshot({path: path.join(outputDir, `${name.includes("树") ? "tree" : "document"}-naming.png`)});
            await input.press("Enter");
            await input.waitFor({state: "detached"});
            const view = (await savedViews()).find((entry) => entry.name === name);
            assert(view, "Naming form did not persist a view");
            assert.equal(view.tag, tag);
            assert.equal(view.targetDocId, sourceDocId);
            await waitPersistedView(view);
            return view;
        }
        async function openSaved(viewId) {
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
        assert.deepEqual(await snapshot(sourceDocId), sourceBefore);
        assert.deepEqual(await snapshot(childDocId), childBefore);
        check("source block IDs, bodies and attributes remain unchanged", {sourceIds: sourceBefore.map((block) => block.id), childIds: childBefore.map((block) => block.id)});
        assert.equal(report.errors.length, 0, `Renderer exceptions: ${report.errors.join("; ")}`);
        report.passed = true;
        report.evidenceDir = outputDir;
        await closeDiscovery();
    } catch (error) {
        report.passed = false;
        report.failure = {message: error.message, stack: error.stack};
        if (page && outputDir) await page.screenshot({path: path.join(outputDir, "failure.png")}).catch(() => {});
        throw error;
    } finally {
        if (outputDir) {
            fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(report, null, 2));
            console.log(`Evidence: ${path.join(outputDir, "result.json")}`);
        }
        await browser.close(); // disconnect CDP; do not terminate the Electron process
    }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = {argumentsForRun};
