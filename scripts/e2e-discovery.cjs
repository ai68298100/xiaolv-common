// 独立思源内核按需发现集成验收：创建临时文档，验证发现、收录与安全撤销。
// 用法：pnpm e2e:discovery:iso（隔离内核）或 SIYUAN_ORIGIN + SIYUAN_TOKEN（本机内核）。
"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const esbuild = require("esbuild");
const {resolveLoopbackOrigin} = require("./e2e-origin.cjs");

const ORIGIN = resolveLoopbackOrigin(process.env.SIYUAN_ORIGIN, "http://127.0.0.1:6806");
const TOKEN = process.env.SIYUAN_TOKEN || "";
const STAMP = `xlc${Date.now().toString(36)}`;
const TITLE = `发现验收 ${STAMP}`;
const BLOCK_ID = /^\d{14}-[0-9a-z]{7}$/;
const ENDPOINTS = {
    lsNotebooks: "/api/notebook/lsNotebooks",
    getBlockInfo: "/api/block/getBlockInfo",
    getBlockKramdown: "/api/block/getBlockKramdown",
    getChildBlocks: "/api/block/getChildBlocks",
    batchGetBlockAttrs: "/api/attr/batchGetBlockAttrs",
    getBlockAttrs: "/api/attr/getBlockAttrs",
    setBlockAttrs: "/api/attr/setBlockAttrs",
    appendBlock: "/api/block/appendBlock",
    updateBlock: "/api/block/updateBlock",
    deleteBlock: "/api/block/deleteBlock",
    checkBlocksExist: "/api/block/checkBlocksExist",
    listDocsByPath: "/api/filetree/listDocsByPath",
    getFullHPathByID: "/api/filetree/getFullHPathByID",
};

if (!TOKEN) {
    console.error("缺少 SIYUAN_TOKEN 环境变量（思源 设置→关于→API 令牌）");
    process.exit(1);
}

async function api(endpoint, payload = {}) {
    const response = await fetch(`${ORIGIN}${endpoint}`, {
        method: "POST",
        headers: {"Content-Type": "application/json", Authorization: `Token ${TOKEN}`},
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} @ ${endpoint}`);
    const body = await response.json();
    if (body && typeof body === "object" && "code" in body && body.code !== 0) {
        throw new Error(`kernel code ${body.code}: ${body.msg} @ ${endpoint}`);
    }
    return body && typeof body === "object" && "data" in body ? body.data : body;
}

function makeServices() {
    const entry = path.resolve(__dirname, "discovery-e2e-entry.ts");
    const built = esbuild.buildSync({
        entryPoints: [entry],
        bundle: true,
        format: "cjs",
        platform: "node",
        target: "node18",
        write: false,
        logLevel: "silent",
    });
    const filename = path.join(__dirname, ".discovery-e2e-bundle.cjs");
    const module = new Module(filename);
    module.filename = filename;
    module.paths = Module._nodeModulePaths(__dirname);
    module._compile(built.outputFiles[0].text, filename);
    const kernel = {
        request(endpoint, payload = {}) {
            const url = ENDPOINTS[endpoint];
            if (!url) throw new Error(`endpoint not allowed by E2E harness: ${endpoint}`);
            return api(url, payload);
        },
    };
    return {kernel, LibraryService: module.exports.LibraryService, DiscoveryService: module.exports.DiscoveryService};
}

function firstBlockId(response) {
    const ops = Array.isArray(response) ? response.flatMap((entry) => entry?.doOperations ?? []) : [];
    return ops.find((operation) => /^\d{14}-[0-9a-z]{7}$/.test(operation?.id ?? ""))?.id ?? "";
}

async function main() {
    const notebooksResponse = await api("/api/notebook/lsNotebooks");
    const notebooks = (notebooksResponse?.notebooks ?? []).filter((notebook) => !notebook.closed);
    assert.ok(notebooks.length, "an open notebook is required");
    const notebook = notebooks[0].id;
    const docs = [];
    const sourceBlocks = [];
    let sourceNestedBlockId = "";
    const libraryBlocks = [];
    let discovery;
    let sessionId = "";
    let batchId = "";
    const cleanupErrors = [];
    const residue = [];

    try {
        const libraryDocId = String(await api("/api/filetree/createDocWithMd", {
            notebook,
            path: `/${TITLE} 专用库`,
            markdown: "专用库",
        }));
        docs.push(libraryDocId);
        assert.match(libraryDocId, BLOCK_ID);
        const sourceDocId = String(await api("/api/filetree/createDocWithMd", {
            notebook,
            path: `/${TITLE} 来源文档`,
            markdown: "来源文档",
        }));
        docs.push(sourceDocId);
        assert.match(sourceDocId, BLOCK_ID);

        for (const suffix of ["保留", "编辑后保留"]) {
            const sourceMarkdown = `${TITLE} ${suffix}`;
            const id = firstBlockId(await api("/api/block/appendBlock", {
                data: sourceMarkdown,
                dataType: "markdown",
                parentID: sourceDocId,
            }));
            assert.ok(id, "source block append returned an id");
            sourceBlocks.push(id);
        }
        const structureId = firstBlockId(await api("/api/block/appendBlock", {
            data: `- ${TITLE} 嵌套结构\n  - ${TITLE} 嵌套子项`,
            dataType: "markdown",
            parentID: sourceDocId,
        }));
        assert.ok(structureId, "nested structure append returned an id");
        sourceBlocks.push(structureId);
        const sourceStructure = await api("/api/block/getBlockKramdown", {id: structureId});
        const nestedIds = Array.from(sourceStructure.kramdown.matchAll(/\bid=[\"'](\d{14}-[0-9a-z]{7})[\"']/g), (match) => match[1])
            .filter((id) => id !== structureId);
        sourceNestedBlockId = nestedIds[0] ?? "";
        assert.ok(sourceNestedBlockId, `fixture must contain a real nested block IAL: ${sourceStructure.kramdown}`);
        assert.notEqual(structureId, sourceNestedBlockId, "structure and nested child must have separate physical IDs");
        assert.equal((await api("/api/block/checkBlocksExist", {ids: [sourceNestedBlockId]}))[sourceNestedBlockId], true, "source nested block should exist");

        const {kernel, LibraryService, DiscoveryService} = makeServices();
        const library = new LibraryService(kernel);
        library.setConfig({
            configVersion: 1,
            mode: "doc",
            notebookIds: [],
            containerDocIds: [libraryDocId],
            createdDocIds: [libraryDocId],
            configuredAt: Date.now(),
        });
        discovery = new DiscoveryService(kernel, library);

        const treeScan = await discovery.discoverTree(sourceDocId);
        assert.equal(treeScan.ok, true, treeScan.ok ? "" : treeScan.message);
        assert.equal(treeScan.data.scope, "tree");
        assert.ok(sourceBlocks.every((id) => treeScan.data.candidates.some((candidate) => candidate.sourceBlockId === id)));
        discovery.closeSession(treeScan.data.id);
        console.log("✔ 指定文档树范围只返回所选树中的来源块");

        const selectedNotebook = await discovery.discoverNotebook(notebook);
        assert.equal(selectedNotebook.ok, true, selectedNotebook.ok ? "" : selectedNotebook.message);
        assert.equal(selectedNotebook.data.scope, "notebook");
        assert.ok(selectedNotebook.data.candidates.every((candidate) => candidate.sourceDocId !== libraryDocId));
        discovery.closeSession(selectedNotebook.data.id);
        console.log("✔ 指定笔记本范围保留来源并排除专用库");

        const unconfirmedAll = await discovery.discoverAllNotebooks();
        assert.equal(unconfirmedAll.ok, false);
        assert.equal(unconfirmedAll.reason, "invalid-input");
        const allNotebooks = await discovery.discoverAllNotebooks({confirmed: true});
        assert.equal(allNotebooks.ok, true, allNotebooks.ok ? "" : allNotebooks.message);
        assert.equal(allNotebooks.data.scope, "all-notebooks");
        assert.ok(allNotebooks.data.candidates.every((candidate) => candidate.sourceDocId !== libraryDocId));
        discovery.closeSession(allNotebooks.data.id);
        console.log("✔ 全部笔记本需显式确认，且专用库不进入候选");

        const scan = await discovery.discoverCurrentNotebook(sourceDocId);
        assert.equal(scan.ok, true, scan.ok ? "" : scan.message);
        sessionId = scan.data.id;
        assert.equal(scan.data.scope, "notebook");
        assert.equal(scan.data.scannedDocs, 1, "the configured library document must be excluded from scan counts");
        const candidates = scan.data.candidates.filter((candidate) => sourceBlocks.includes(candidate.sourceBlockId));
        assert.equal(candidates.length, 3, "both text blocks and the nested structure should be discovered");
        assert.ok(scan.data.candidates.every((candidate) => candidate.sourceDocId !== libraryDocId), "dedicated library must be excluded");
        console.log(`✔ 当前笔记本发现：扫描 ${scan.data.scannedDocs} 个文档，专用库已排除`);

        const batch = discovery.beginAddBatch(sessionId);
        assert.equal(batch.ok, true, batch.ok ? "" : batch.message);
        batchId = batch.data.batchId;
        for (const candidate of candidates) {
            const preview = await discovery.previewCandidate(sessionId, candidate.key);
            assert.equal(preview.ok, true, preview.ok ? "" : preview.message);
            const added = await discovery.addCandidate(sessionId, candidate.key, {batchId});
            assert.equal(added.ok, true, added.ok ? "" : added.message);
            assert.equal(added.data.status, "added");
            libraryBlocks.push(added.data.item.blockId);
            if (candidate.sourceBlockId === structureId) {
                const copied = await api("/api/block/getBlockKramdown", {id: added.data.item.blockId});
                assert.ok(!copied.kramdown.includes(sourceNestedBlockId), `copied structure reused nested ID ${sourceNestedBlockId}: ${copied.kramdown}`);
                const copiedAttrs = await api("/api/attr/getBlockAttrs", {id: added.data.item.blockId});
                assert.equal(copiedAttrs["custom-xlc-src-block"], structureId, "structure copy should retain its source backlink");
                console.log("✔ 结构收录为嵌套块重新生成物理 ID，保留来源回链");
            }
        }
        console.log("✔ 三个候选均通过预览后复制到专用库，并保留来源回链");
        assert.ok(libraryBlocks.every((id) => !sourceBlocks.includes(id)), "library copies must receive new physical block IDs");

        const finished = discovery.finishAddBatch(sessionId, batchId);
        assert.equal(finished.ok, true, finished.ok ? "" : finished.message);
        assert.equal(finished.data.added, candidates.length);
        assert.equal(finished.data.discarded, false);

        const attrs = await api("/api/attr/getBlockAttrs", {id: libraryBlocks[0]});
        assert.equal(attrs["custom-xlc-src-doc"], sourceDocId);
        assert.ok(sourceBlocks.includes(attrs["custom-xlc-src-block"]));
        const editableBody = await api("/api/block/getBlockKramdown", {id: libraryBlocks[1]});
        const editedAttrs = await api("/api/attr/getBlockAttrs", {id: libraryBlocks[1]});
        const editedMarkdown = editableBody.kramdown.replace(`${TITLE} 编辑后保留`, `${TITLE} 用户编辑过`);
        assert.notEqual(editedMarkdown, editableBody.kramdown, "edited copy fixture must change its body");
        await api("/api/block/updateBlock", {
            id: libraryBlocks[1],
            data: editedMarkdown,
            dataType: "markdown",
        });
        const attrsAfterEdit = await api("/api/attr/getBlockAttrs", {id: libraryBlocks[1]});
        assert.equal(attrsAfterEdit["custom-xlc-id"], editedAttrs["custom-xlc-id"], "editing fixture must preserve discovery metadata");

        const undone = await discovery.undoBatch(sessionId, batchId);
        assert.equal(undone.ok, true, undone.ok ? "" : undone.message);
        assert.equal(undone.data.deleted, 2, JSON.stringify(undone.data));
        assert.equal(undone.data.skipped.length, 1);
        assert.equal(undone.data.skipped[0].reason, "edited");
        const sourceExistence = await api("/api/block/checkBlocksExist", {ids: [...sourceBlocks, sourceNestedBlockId]});
        const copyExistence = await api("/api/block/checkBlocksExist", {ids: libraryBlocks});
        assert.ok(sourceBlocks.every((id) => sourceExistence[id] === true), "undo must preserve original notes");
        assert.equal(copyExistence[libraryBlocks[0]], false, "unchanged copy should be removed");
        assert.equal(copyExistence[libraryBlocks[1]], true, "edited copy must be preserved");
        assert.equal(copyExistence[libraryBlocks[2]], false, "unchanged structure copy should be removed");
        console.log("✔ 安全撤销：删除未编辑副本，保留用户改过的副本和全部原文");

        const repeated = await discovery.undoBatch(sessionId, batchId);
        assert.equal(repeated.ok, true);
        assert.equal(repeated.data.deleted, 0);
        assert.equal(repeated.data.skipped.length, 1);
        console.log("✔ 重复撤销不会再次删除已撤销副本");
    } finally {
        if (discovery && sessionId) discovery.closeSession(sessionId);

        const blockIds = [...new Set([...sourceBlocks, ...libraryBlocks])].filter((id) => BLOCK_ID.test(id));
        const docIds = [...new Set(docs)].filter((id) => BLOCK_ID.test(id));
        if (docIds.length !== docs.length) cleanupErrors.push("无法安全清理响应 ID 无效的临时文档");

        let beforeCleanup = null;
        if (blockIds.length) {
            try {
                beforeCleanup = await api("/api/block/checkBlocksExist", {ids: blockIds});
            } catch (error) {
                cleanupErrors.push(`pre-cleanup verification: ${error.message}`);
            }
        }
        for (const id of blockIds) {
            if (beforeCleanup?.[id] === false) continue;
            try { await api("/api/block/deleteBlock", {id}); }
            catch (error) { cleanupErrors.push(`delete block ${id}: ${error.message}`); }
        }
        for (const id of docIds.reverse()) {
            try { await api("/api/filetree/removeDoc", {notebook, path: `/${id}.sy`}); }
            catch (error) { cleanupErrors.push(`remove document ${id}: ${error.message}`); }
        }
        const ids = [...new Set([...blockIds, ...docIds])];
        if (ids.length) {
            try {
                const existing = await api("/api/block/checkBlocksExist", {ids});
                const remaining = ids.filter((id) => existing[id] !== false);
                residue.push(...remaining.map((id) => `临时块或文档仍存在/无法核验：${id}`));
            } catch (error) {
                cleanupErrors.push(`cleanup verification: ${error.message}`);
            }
        }
        if (cleanupErrors.length) {
            for (const error of cleanupErrors) console.error(`CLEANUP: ${error}`);
        }
        if (residue.length) {
            for (const error of residue) console.error(`RESIDUE: ${error}`);
        }
        if (cleanupErrors.length || residue.length) {
            process.exitCode = 1;
        }
    }
}

main().catch((error) => {
    console.error(`✖ 发现集成验收失败：${error.stack || error}`);
    process.exitCode = 1;
});
