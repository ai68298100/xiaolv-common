const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const Module = require("node:module");
const {buildSync} = require("esbuild");

// Load the actual service, executor and library together without relying on a stale
// tests/.build bundle. Only kernel I/O and host capabilities are fixtures.
const root = path.resolve(__dirname, "..");
const built = buildSync({
    stdin: {
        contents: 'export {ActionExecutor} from "./src/service/commands"; export {XiaolvCommonService} from "./src/service/service"; export {LibraryService} from "./src/service/library";',
        resolveDir: root, sourcefile: "r230-real-service.ts", loader: "ts",
    },
    bundle: true, platform: "node", format: "cjs", write: false,
    alias: {siyuan: path.join(__dirname, "stub-siyuan.cjs")}, logLevel: "silent",
});
const loaded = new Module(path.join(root, "r230-real-service.cjs"));
loaded.filename = path.join(root, "r230-real-service.cjs");
loaded.paths = Module._nodeModulePaths(root);
loaded._compile(built.outputFiles[0].text, loaded.filename);
const {ActionExecutor, XiaolvCommonService, LibraryService} = loaded.exports;

const ITEM = "xlc-r230target001";
const BLOCK = "20261016000001-aaaaaaa";
const LIBRARY = "20261016000002-bbbbbbb";
const A = "20261016000003-ccccccc";
const B = "20261016000004-ddddddd";
const C = "20261016000005-eeeeeee";

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return {promise, resolve};
}

async function fixture({itemType = "text", kramdown = "R230 source body"} = {}) {
    const events = [];
    const captures = [];
    const releases = [];
    const inserted = [];
    const copied = [];
    const released = new Set();
    const control = {activeDoc: A, beforeAttrs: null, beforeBody: null, attrs: true, body: true, clipboard: true, insert: true};
    const attrs = {"custom-xlc-id": ITEM, "custom-xlc-type": itemType, "custom-xlc-title": "R230 target", "custom-xlc-src-doc": LIBRARY};
    const kernel = {request: async (endpoint, payload = {}) => {
        events.push(`kernel:${endpoint}`);
        if (endpoint === "getChildBlocks") return [{id: BLOCK, type: "p"}];
        if (endpoint === "batchGetBlockAttrs") return {[BLOCK]: attrs};
        if (endpoint === "getBlockAttrs") {
            if (control.beforeAttrs) await control.beforeAttrs();
            return control.attrs ? attrs : {};
        }
        if (endpoint === "getBlockKramdown") {
            if (control.beforeBody) await control.beforeBody();
            return control.body ? {id: payload.id, kramdown} : null;
        }
        if (endpoint === "checkBlocksExist") return {[LIBRARY]: true, [BLOCK]: true};
        return null;
    }};
    const library = new LibraryService(kernel);
    library.setConfig({mode: "doc", notebookIds: [], containerDocIds: [LIBRARY], createdDocIds: [], configuredAt: 1});
    await library.reindex();
    assert.equal(library.getIndex().items.get(ITEM)?.id, ITEM);
    events.length = 0;
    const host = {
        isMobile: () => false,
        hasActiveEditor: () => Boolean(control.activeDoc),
        captureInsertTarget: () => {
            const target = {editor: control.activeDoc ? {} : null, handle: control.activeDoc ? {id: captures.length + 1} : null, docId: control.activeDoc};
            captures.push(target);
            events.push(`capture:${target.docId}`);
            return target;
        },
        canInsertAtTarget: (target) => Boolean(target?.editor && target.handle && !released.has(target)),
        releaseInsertTarget: (target) => {
            assert(!released.has(target), "a target must be released exactly once");
            released.add(target);
            releases.push(target);
            events.push(`release:${target?.docId}`);
        },
        insertMarkdown: (markdown, target) => {
            assert(target && !released.has(target), "insertion must retain its captured target");
            inserted.push({markdown, docId: target.docId});
            events.push(`insert:${target.docId}`);
            return control.insert;
        },
        writeClipboard: async (text) => { copied.push(text); return control.clipboard; },
        openDoc: () => true, openAsset: () => true, openExternal: () => true,
        currentDocId: () => control.activeDoc,
    };
    const executor = new ActionExecutor(library, host, () => {});
    const service = new XiaolvCommonService({library, executor, state: {}, onStateChange: () => {}});
    return {control, events, captures, releases, inserted, copied, library, executor, service, host};
}

test("R230 协议查询条目期间切页仍写入调用开始的目标", async () => {
    const f = await fixture();
    const reading = deferred();
    const resume = deferred();
    f.control.beforeAttrs = async () => { reading.resolve(); await resume.promise; };
    const pending = f.service.insert(ITEM, {mode: "insert"});
    assert.equal(f.captures.length, 1, "capture must happen synchronously before the first lookup await");
    await reading.promise;
    f.control.activeDoc = B;
    assert.equal(f.releases.length, 0);
    resume.resolve();
    const receipt = await pending;
    assert.equal(receipt.ok, true);
    assert.equal(receipt.data.downgraded, false);
    assert.deepEqual(f.inserted, [{markdown: "R230 source body", docId: A}]);
    assert.deepEqual(f.releases, f.captures);
    assert.equal(f.events[0], `capture:${A}`);
});

test("R230 调用时无编辑器不会改投查询期间新开的编辑器", async () => {
    const f = await fixture();
    f.control.activeDoc = null;
    const reading = deferred();
    const resume = deferred();
    f.control.beforeAttrs = async () => { reading.resolve(); await resume.promise; };
    const pending = f.service.insert(ITEM, {mode: "insert-content"});
    await reading.promise;
    f.control.activeDoc = B;
    resume.resolve();
    const receipt = await pending;
    assert.equal(receipt.ok, true);
    assert.equal(receipt.data.downgraded, true);
    assert.deepEqual(f.inserted, []);
    assert.deepEqual(f.copied, ["R230 source body"]);
    assert.equal(f.captures.length, 1);
    assert.deepEqual(f.releases, f.captures);
});

test("R230 空目标不会按undefined重新捕获后来活动编辑器", async () => {
    const f = await fixture();
    f.control.activeDoc = null;
    f.host.captureInsertTarget = () => { f.captures.push(null); return null; };
    const reading = deferred();
    const resume = deferred();
    f.control.beforeAttrs = async () => { reading.resolve(); await resume.promise; };
    const pending = f.service.insert(ITEM, {mode: "insert"});
    assert.deepEqual(f.captures, [null]);
    await reading.promise;
    f.control.activeDoc = B;
    resume.resolve();
    const receipt = await pending;
    assert.equal(receipt.ok, true);
    assert.equal(receipt.data.downgraded, true);
    assert.deepEqual(f.inserted, []);
    assert.deepEqual(f.copied, ["R230 source body"]);
    assert.deepEqual(f.captures, [null]);
    assert.deepEqual(f.releases, [null]);

    const borrowed = await fixture();
    const item = borrowed.library.getIndex().items.get(ITEM);
    const result = await borrowed.executor.run(item, "insert", {editorTarget: null});
    assert.equal(result.ok, true);
    assert.equal(result.downgraded, true);
    assert.deepEqual(borrowed.inserted, []);
    assert.deepEqual(borrowed.captures, []);
    assert.deepEqual(borrowed.releases, []);
});

test("R230 幂等锁前冻结每次调用目标，失败重试不改投等待期间的页签", async () => {
    const f = await fixture();
    const reading = deferred();
    const resume = deferred();
    const retryReading = deferred();
    const retryResume = deferred();
    let first = true;
    f.control.beforeAttrs = async () => {
        if (first) { first = false; reading.resolve(); await resume.promise; }
        else { retryReading.resolve(); await retryResume.promise; }
    };
    f.control.insert = false;
    const options = {mode: "insert", idempotencyKey: "r230-queue-retry-001"};
    const initial = f.service.insert(ITEM, options);
    await reading.promise;
    f.control.activeDoc = B;
    const retry = f.service.insert(ITEM, options);
    assert.equal(f.captures.length, 2, "the queued call must capture before waiting on the lock");
    f.control.activeDoc = C;
    resume.resolve();
    const firstReceipt = await initial;
    assert.equal(firstReceipt.ok, false);
    await retryReading.promise;
    f.control.insert = true;
    retryResume.resolve();
    const secondReceipt = await retry;
    assert.equal(secondReceipt.ok, true);
    assert.deepEqual(f.inserted.map((entry) => entry.docId), [A, B]);
    assert.equal(f.captures.length, 2);
    assert.deepEqual(f.releases, f.captures);
});

test("R230 并发幂等成功只写一次，等待和缓存命中各自释放句柄", async () => {
    const f = await fixture();
    const reading = deferred();
    const resume = deferred();
    f.control.beforeAttrs = async () => { reading.resolve(); await resume.promise; };
    const options = {mode: "insert", idempotencyKey: "r230-cache-hit-001"};
    const first = f.service.insert(ITEM, options);
    await reading.promise;
    f.control.activeDoc = B;
    const waiting = f.service.insert(ITEM, options);
    assert.equal(f.captures.length, 2);
    resume.resolve();
    const [initial, duplicate] = await Promise.all([first, waiting]);
    assert.equal(initial.ok, true);
    assert.deepEqual(duplicate, initial);
    f.control.activeDoc = C;
    const cached = await f.service.insert(ITEM, options);
    assert.deepEqual(cached, initial);
    assert.deepEqual(f.inserted, [{markdown: "R230 source body", docId: A}]);
    assert.equal(f.captures.length, 3);
    assert.deepEqual(f.releases, f.captures);
});

test("R230 查询早退、正文失败和剪贴板拒绝均释放外层目标一次", async () => {
    for (const failure of ["missing-item", "missing-body", "clipboard-refused"]) {
        const f = await fixture();
        if (failure === "missing-item") f.control.attrs = false;
        if (failure === "missing-body") f.control.body = false;
        if (failure === "clipboard-refused") { f.control.activeDoc = null; f.control.clipboard = false; }
        const receipt = await f.service.insert(ITEM, {mode: "insert"});
        assert.equal(receipt.ok, false, failure);
        assert.equal(f.captures.length, 1, failure);
        assert.deepEqual(f.releases, f.captures, failure);
        assert.equal(f.inserted.length, 0, failure);
    }
});

test("R230 查询或执行抛错时释放目标且不吞原错误", async () => {
    for (const failure of ["lookup", "execute"]) {
        const f = await fixture();
        const error = new Error(`R230 ${failure}`);
        if (failure === "lookup") f.service.get = async () => { throw error; };
        else f.host.insertMarkdown = () => { throw error; };
        await assert.rejects(f.service.insert(ITEM, {mode: "insert"}), (actual) => actual === error);
        assert.equal(f.captures.length, 1, failure);
        assert.deepEqual(f.releases, f.captures, failure);
    }
});

test("R230 异步读取正文和执行完成前句柄持续有效", async () => {
    const f = await fixture();
    const reading = deferred();
    const resume = deferred();
    f.control.beforeBody = async () => { reading.resolve(); await resume.promise; };
    const pending = f.service.insert(ITEM, {mode: "insert"});
    await reading.promise;
    assert.equal(f.captures.length, 1);
    assert.equal(f.releases.length, 0, "an outer scope must await the complete executor action");
    resume.resolve();
    assert.equal((await pending).ok, true);
    assert.equal(f.events.at(-1), `release:${A}`);
    assert.deepEqual(f.releases, f.captures);
});

test("R230 显式借用的搜索窗口目标不由执行器捕获或释放", async () => {
    const f = await fixture();
    const borrowed = {editor: {}, handle: {id: "dialog-owned"}, docId: A};
    const item = f.library.getIndex().items.get(ITEM);
    const receipt = await f.executor.run(item, "insert", {editorTarget: borrowed});
    assert.equal(receipt.ok, true);
    assert.deepEqual(f.inserted, [{markdown: "R230 source body", docId: A}]);
    assert.deepEqual(f.captures, []);
    assert.deepEqual(f.releases, []);
});

test("R230 复制与打开协议动作不捕获或释放编辑器目标", async () => {
    for (const mode of ["copy", "copy-content", "open"]) {
        const f = await fixture(mode === "open" ? {itemType: "url", kramdown: "https://example.com/r230"} : {});
        assert.equal((await f.service.insert(ITEM, {mode})).ok, true, mode);
        assert.deepEqual(f.captures, [], mode);
        assert.deepEqual(f.releases, [], mode);
    }
});

test("R230 旧执行器没有scope方法时保留兼容调用与幂等语义", async () => {
    let calls = 0;
    const executor = {run: async (_item, mode) => {
        calls++;
        return {ok: true, mode, message: "inserted", downgraded: false, pendingVerification: []};
    }};
    const f = await fixture();
    const service = new XiaolvCommonService({library: f.library, executor, state: {}, onStateChange: () => {}});
    const options = {mode: "insert", idempotencyKey: "r230-legacy-stub-001"};
    const first = await service.insert(ITEM, options);
    assert.equal(first.ok, true);
    assert.deepEqual(await service.insert(ITEM, options), first);
    assert.equal(calls, 1);
});
