// R72/F5：片段嵌套——{{xlc:snippet:标题}} 插入时展开（深度 ≤3、环检测、缺失落可见标记、
// 菱形引用允许、嵌套内 ask 保留给填充卡、code 条目字面）。
const test = require("node:test");
const assert = require("node:assert");
const {library: libSvc, commands} = require("./.build/entry.cjs");
const {LibraryService} = libSvc;
const {ActionExecutor} = commands;

const DOC = "20240101120001-hijklmn";

// 库内五个条目：A → B → C（含 ask）；D 独立（菱形引用用）；E 自指（环）
const BLOCKS = [
    {id: "20240101120000-aaaaaaa", xlcId: "xlc-src0000001", title: "条目", kramdown: "A 引用 {{xlc:snippet:B 条目}}"},
    {id: "20240101120000-bbbbbbb", xlcId: "xlc-b000000001", title: "B 条目", kramdown: "B 内容 {{xlc:snippet:C 条目}}"},
    {id: "20240101120000-ccccccc", xlcId: "xlc-c000000001", title: "C 条目", kramdown: "C 正文 {{xlc:ask:客户}}"},
    {id: "20240101120000-ddddddd", xlcId: "xlc-d000000001", title: "D 条目", kramdown: "D 正文"},
    {id: "20240101120000-eeeeeee", xlcId: "xlc-e000000001", title: "自指条目", kramdown: "自 {{xlc:snippet:自指条目}}"},
];

function makeKernel() {
    return {
        request(endpoint, payload = {}) {
            if (endpoint === "getChildBlocks") {
                return Promise.resolve(BLOCKS.map((b) => ({id: b.id, type: "p"})));
            }
            if (endpoint === "batchGetBlockAttrs") {
                const attrs = {};
                for (const b of BLOCKS) {
                    attrs[b.id] = {"custom-xlc-id": b.xlcId, "custom-xlc-type": "text", "custom-xlc-title": b.title};
                }
                return Promise.resolve(attrs);
            }
            if (endpoint === "getBlockKramdown") {
                const b = BLOCKS.find((x) => x.id === payload.id);
                return Promise.resolve(b ? {id: payload.id, kramdown: b.kramdown} : {id: payload.id, kramdown: ""});
            }
            if (endpoint === "checkBlocksExist") {
                return Promise.resolve({[DOC]: true});
            }
            return Promise.resolve(null);
        },
    };
}

function makeLibrary() {
    const lib = new LibraryService(makeKernel());
    lib.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    return lib;
}

test("展开：maxDepth=1 时下一层引用落可见标记；默认深度 3 一路展开到 ask 为止", async () => {
    const lib = makeLibrary();
    const one = await lib.expandSnippetRefs("开头 {{xlc:snippet:B 条目}} 结尾", {maxDepth: 1});
    assert.strictEqual(one, "开头 B 内容 __片段：C 条目__ 结尾");
    const full = await lib.expandSnippetRefs("{{xlc:snippet:B 条目}}");
    assert.strictEqual(full, "B 内容 C 正文 {{xlc:ask:客户}}");
});

test("展开：成环 → 可见标记（不挂死）", async () => {
    const lib = makeLibrary();
    const out = await lib.expandSnippetRefs("{{xlc:snippet:自指条目}}");
    assert.strictEqual(out, "自 __片段：自指条目__");
});

test("展开：标题不存在 → __片段：标题__ 可见标记", async () => {
    const lib = makeLibrary();
    const out = await lib.expandSnippetRefs("前 {{xlc:snippet:不存在的片段}} 后");
    assert.strictEqual(out, "前 __片段：不存在的片段__ 后");
});

test("展开：深度上限收紧时超出层数落可见标记", async () => {
    const lib = makeLibrary();
    const out = await lib.expandSnippetRefs("{{xlc:snippet:B 条目}}", {maxDepth: 1});
    assert.ok(out.startsWith("B 内容"));
    assert.match(out, /__片段：C 条目__/);
});

test("展开：菱形引用允许（同一目标被两个位置各自展开）", async () => {
    const lib = makeLibrary();
    const out = await lib.expandSnippetRefs("{{xlc:snippet:D 条目}} 与 {{xlc:snippet:D 条目}}");
    assert.strictEqual(out, "D 正文 与 D 正文");
});

test("执行层：code 条目不展开（字面）", async () => {
    const host = {
        isMobile: () => false,
        hasActiveEditor: () => true,
        insertMarkdown: (md) => {
            host.last = md;
            return true;
        },
        writeClipboard: async () => true,
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => DOC,
    };
    const codeBlocks = [{id: "20240101120000-aaaaaaa", xlcId: "xlc-code000001", title: "SQL 模板", kramdown: "```sql\n{{xlc:snippet:B 条目}}\n```"}];
    const lib = new LibraryService({
        request(endpoint, payload = {}) {
            if (endpoint === "getChildBlocks") return Promise.resolve(codeBlocks.map((b) => ({id: b.id, type: "c"})));
            if (endpoint === "batchGetBlockAttrs") {
                const attrs = {};
                for (const b of codeBlocks) attrs[b.id] = {"custom-xlc-id": b.xlcId, "custom-xlc-type": "code", "custom-xlc-title": b.title};
                return Promise.resolve(attrs);
            }
            if (endpoint === "getBlockKramdown") {
                const b = codeBlocks.find((x) => x.id === payload.id);
                return Promise.resolve(b ? {id: payload.id, kramdown: b.kramdown} : {id: payload.id, kramdown: ""});
            }
            if (endpoint === "checkBlocksExist") return Promise.resolve({[DOC]: true});
            return Promise.resolve(null);
        },
    });
    lib.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const executor = new ActionExecutor(lib, host, () => {});
    const item = {
        id: "xlc-code000001", blockId: codeBlocks[0].id, libraryDocId: DOC, itemType: "code",
        title: "SQL 模板", alias: "", tags: [], category: "", summary: "", varCount: 0,
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 0, updatedAt: 0, droppedFields: [],
    };
    await executor.run(item, "insert");
    assert.match(host.last, /\{\{xlc:snippet:B 条目\}\}/);
});
