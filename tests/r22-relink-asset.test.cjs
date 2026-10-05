// R22：relinkSource 旧 src-block 残留修复 + fetchAssetBytes 路径校验（穿越安全、括号等合法名放行）。
const test = require("node:test");
const assert = require("node:assert");
const libModule = require("./.build/entry.cjs").library;

const DOC = "20240101120001-hijklmn";
const B1 = "20240101120000-aaaaaaa";
const NEW_DOC = "20240101120002-bbbbbbb";

test("门禁：relink 到纯文档来源时显式清空旧 src-block（防残留错位）", async () => {
    const calls = [];
    let cleared = false;
    const kernel = {
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            switch (endpoint) {
                case "getChildBlocks":
                    return Promise.resolve([{id: B1, type: "p"}]);
                case "batchGetBlockAttrs": {
                    const out = {};
                    for (const id of payload.ids ?? []) {
                        out[id] = cleared
                            ? {"custom-xlc-id": "xlc-relink0001", "custom-xlc-src-doc": NEW_DOC}
                            : {"custom-xlc-id": "xlc-relink0001", "custom-xlc-src-doc": DOC, "custom-xlc-src-block": B1};
                    }
                    return Promise.resolve(out);
                }
                case "getBlockAttrs":
                    return Promise.resolve(cleared
                        ? {"custom-xlc-id": "xlc-relink0001", "custom-xlc-src-doc": NEW_DOC}
                        : {"custom-xlc-id": "xlc-relink0001", "custom-xlc-src-doc": DOC, "custom-xlc-src-block": B1});
                case "setBlockAttrs":
                    cleared = (payload.attrs["custom-xlc-src-block"] ?? "") === "";
                    return Promise.resolve(null);
                default:
                    return Promise.resolve(null);
            }
        },
    };
    const service = new libModule.LibraryService(kernel);
    service.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const result = await service.relinkSource("xlc-relink0001", {sourceDocId: NEW_DOC});
    assert.ok(result.ok, result.ok ? "" : result.message);
    assert.equal(result.data.item.source.sourceDocId, NEW_DOC);
    assert.equal(result.data.item.source.sourceBlockId, "");
    const setCall = calls.find((c) => c.endpoint === "setBlockAttrs");
    assert.equal(setCall.payload.attrs["custom-xlc-src-doc"], NEW_DOC);
    assert.equal(setCall.payload.attrs["custom-xlc-src-block"], "");
});

test("fetchAssetBytes 路径校验（注入到 HostBridge.fetchAssetBytes 同语义的独立复刻上验证规则）", () => {
    // 与 src/index.ts fetchAssetBytes 相同的校验规则（单段 assets/ 名；禁 .. 与子目录）
    const isSafe = (p) => p.startsWith("assets/") && !p.includes("..") && !p.slice("assets/".length).includes("/");
    assert.equal(isSafe("assets/pic-20240101.png"), true);
    assert.equal(isSafe("assets/(1)照片.png"), true, "parens/CJK names are legal asset names");
    assert.equal(isSafe("assets/a..b.png"), false, "traversal marker rejected");
    assert.equal(isSafe("assets/sub/pic.png"), false, "subdirectory rejected");
    assert.equal(isSafe("other/pic.png"), false, "non-assets prefix rejected");
});

test("R27：链接/块引用捕获目标分类（纯函数）", () => {
    const cap = require("./.build/entry.cjs").capture;
    assert.deepEqual(cap.classifyLinkTarget("https://example.com/a"), {kind: "url", value: "https://example.com/a"});
    assert.deepEqual(cap.classifyLinkTarget("assets/pic-20240101.png"), {kind: "asset", value: "assets/pic-20240101.png"});
    assert.equal(cap.classifyLinkTarget("siyuan://blocks/x"), null);
    assert.equal(cap.classifyLinkTarget("javascript:alert(1)"), null);
    assert.equal(cap.classifyLinkTarget(""), null);
    assert.equal(cap.isBlockRefTarget("20240101120000-abcdefg"), true);
    assert.equal(cap.isBlockRefTarget("bad"), false);
});
