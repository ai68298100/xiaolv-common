const test = require("node:test");
const assert = require("node:assert");
const target = require("./.build/entry.cjs").discoveryTarget;

const DOC_ID = "20240101120001-hijklmn";

test("文档树发现目标仅接受公开事件中的单选文档并冻结 ID/路径", () => {
    const payload = [{id: DOC_ID, path: "/工作/项目", notebookId: "20240101"}];
    const result = target.getSingleDocTreeDiscoveryTarget("doc", payload);
    assert.deepEqual(result, {docId: DOC_ID, path: "/工作/项目"});
    payload[0].id = "20240102120001-qrstuvw";
    payload[0].path = "/其他文档";
    assert.deepEqual(result, {docId: DOC_ID, path: "/工作/项目"});
});

test("文档树发现目标拒绝笔记本、未知混合项、多选和非法文档 ID", () => {
    const one = [{id: DOC_ID, path: "/工作/项目", notebookId: "20240101"}];
    assert.equal(target.getSingleDocTreeDiscoveryTarget("notebook", one), null);
    assert.equal(target.getSingleDocTreeDiscoveryTarget("items", one), null);
    assert.equal(target.getSingleDocTreeDiscoveryTarget("docs", [...one, {...one[0]}]), null);
    assert.equal(target.getSingleDocTreeDiscoveryTarget("doc", [{...one[0], id: "not-a-document"}]), null);
    assert.equal(target.getSingleDocTreeDiscoveryTarget("doc", null), null);
});
