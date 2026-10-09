// R164：lsNotebooks 信封形状锁定（真机 P0）。
// 思源内核返回 data = {notebooks:[...]}（对象非裸数组）；旧代码按裸数组解析恒得空表，
// 首跑/更改库的笔记本下拉恒空，「创建新库文档」被 !notebookId 守卫拦死——全新工作区首跑不可完成。
const test = require("node:test");
const assert = require("node:assert");
const {library} = {library: require("./.build/entry.cjs").library};

function makeKernelOf(lsNotebooksData) {
    return {
        request: async (endpoint) => {
            if (endpoint === "lsNotebooks") return lsNotebooksData;
            throw new Error("unexpected endpoint: " + endpoint);
        },
    };
}

test("lsNotebooks：data.notebooks 对象信封（真实内核形状）", async () => {
    const svc = new library.LibraryService(makeKernelOf({
        notebooks: [
            {id: "20260101000000-aaaaaaa", name: "XLC验收"},
            {id: "20260101000000-bbbbbbb", name: "&nbsp;（已关闭笔记本名污染）"},
        ],
    }));
    const r = await svc.listNotebooks();
    assert.equal(r.ok, true);
    assert.equal(r.data?.length, 1, "&nbsp; 名单应被过滤");
    assert.deepEqual(r.data?.[0], {id: "20260101000000-aaaaaaa", name: "XLC验收"});
});

test("lsNotebooks：向后兼容裸数组形状也接受", async () => {
    const svc = new library.LibraryService(makeKernelOf([{id: "x", name: "旧形状"}]));
    const r = await svc.listNotebooks();
    assert.equal(r.ok, true);
    assert.equal(r.data?.length, 1);
});

test("lsNotebooks：坏形状返回安全空表不抛错", async () => {
    const svc = new library.LibraryService(makeKernelOf({notebooks: "not-an-array"}));
    const r = await svc.listNotebooks();
    assert.equal(r.ok, true);
    assert.deepEqual(r.data, []);
});
