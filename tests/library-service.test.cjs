// 内容库服务测试：索引构建（无 SQL 遍历）、CRUD 回执与回滚、来源失效检测。
// 用受控行为的假内核客户端，不冒充真实宿主（真实宿主验收单独记录）。
const test = require("node:test");
const assert = require("node:assert");
const { LibraryService } = require("./.build/entry.cjs").library;

const DOC = "20240101120001-hijklmn";
const B1 = "20240101120000-aaaaaaa";
const B2 = "20240101120002-bbbbbbb";

function makeKernel(overrides = {}) {
    const calls = [];
    const base = {
        getChildBlocks: () => [{id: B1, type: "p"}, {id: B2, type: "p"}],
        batchGetBlockAttrs: ({ids}) => Object.fromEntries(ids.map((id) => [id, {
            "custom-xlc-id": `xlc-${id.slice(-10)}`,
            "custom-xlc-title": `条目 ${id}`,
        }])),
        getBlockAttrs: () => ({"custom-xlc-id": `xlc-${B1.slice(-10)}`}),
        appendBlock: ({parentID}) => [{doOperations: [{id: "20240101120003-ccccccc", action: "insert", parentID}]}],
        setBlockAttrs: () => null,
        updateBlock: () => null,
        deleteBlock: () => null,
        checkBlocksExist: ({ids}) => Object.fromEntries(ids.map((id) => [id, true])),
        getBlockKramdown: () => ({id: B1, kramdown: "内容"}),
        getFile: () => null,
        getBlockInfo: () => ({box: "nb", path: "/x"}),
        listDocsByPath: () => ({files: []}),
        lsNotebooks: () => [{id: "20240101", name: "笔记"}],
        createDocWithMd: () => "20240101120004-ddddddd",
        createNotebook: ({name}) => ({notebook: {id: "20240101123456", name}}),
        removeNotebook: () => null,
    };
    const handlers = {...base, ...overrides};
    return {
        calls,
        request(endpoint, payload = {}) {
            calls.push({endpoint, payload});
            const handler = handlers[endpoint];
            if (!handler) return Promise.reject(new Error(`no handler for ${endpoint}`));
            return Promise.resolve(handler(payload));
        },
    };
}

function makeService(kernelOverrides = {}, config, serviceOptions = {}) {
    const kernel = makeKernel(kernelOverrides);
    const service = new LibraryService(kernel, serviceOptions);
    service.setConfig(config ?? {mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    return {kernel, service};
}

test("索引构建：只收带 custom-xlc-id 的顶层块（普通内容混排安全）", async () => {
    const {service} = makeService({
        batchGetBlockAttrs: ({ids}) => Object.fromEntries(ids.map((id) => [id, id === B1 ? {"custom-xlc-id": "xlc-first00001"} : {}])),
    });
    const idx = await service.buildIndex();
    assert.equal(idx.entries.length, 1);
    assert.equal(idx.entries[0].id, "xlc-first00001");
    assert.equal(idx.truncated, false);
});

test("索引摘要：从真实块正文派生摘要供正文关键词搜索使用", async () => {
    const {kernel, service} = makeService({
        getChildBlocks: () => [{id: B1, type: "p"}],
        batchGetBlockAttrs: () => ({[B1]: {"custom-xlc-id": "xlc-summary00001", "custom-xlc-title": "独立标题"}}),
        getBlockKramdown: ({id}) => ({id, kramdown: "这段正文可搜索并生成摘要。"}),
    });
    const idx = await service.buildIndex();
    assert.equal(idx.entries.length, 1);
    assert.ok(idx.entries[0].summary.includes("正文可搜索"));
    assert.ok(kernel.calls.some((c) => c.endpoint === "getBlockKramdown" && c.payload.id === B1));
});

test("引用条目摘要和变量数取源块最新内容，库内正文仍只保留块引用", async () => {
    const source = "20240101120005-eeeeeee";
    const {service, kernel} = makeService({
        getChildBlocks: () => [{id: B1, type: "p"}],
        batchGetBlockAttrs: () => ({[B1]: {
            "custom-xlc-id": "xlc-refsource0001",
            "custom-xlc-type": "blockref",
            "custom-xlc-title": "原文模板",
            "custom-xlc-target": source,
        }}),
        getBlockKramdown: ({id}) => ({id, kramdown: id === source ? "最新答复 {{xlc:ask:姓名}}" : `((${source} '原文模板'))`}),
        getBlockKramdowns: ({ids, mode}) => {
            assert.equal(mode, "md");
            return Object.fromEntries(ids.map((id) => [id, "最新答复 {{xlc:ask:姓名}}"]));
        },
    });
    const idx = await service.buildIndex();
    const item = idx.items.get("xlc-refsource0001");
    assert.equal(item.summary, "最新答复");
    assert.equal(item.varCount, 1);
    assert.ok(kernel.calls.some((call) => call.endpoint === "getBlockKramdowns" && call.payload.ids.includes(source)));
});

test("引用有效正文跟随 targetBlockId，编辑与导出仍可取库内原生块引用", async () => {
    const source = "20240101120005-eeeeeee";
    const {service, kernel} = makeService({
        getBlockKramdown: ({id}) => ({id, kramdown: id === B1 ? `((${source} '短语'))` : "源块刚更新的正文"}),
    });
    const item = {
        id: "xlc-reference01", blockId: B1, libraryDocId: DOC, itemType: "blockref", title: "短语", alias: "",
        tags: [], category: "", summary: "", varCount: 0,
        source: {sourceDocId: DOC, sourceBlockId: source, sourceType: "block"},
        url: "", targetBlockId: source, createdAt: 1, updatedAt: 1, droppedFields: [],
    };
    const resolved = await service.getItemKramdown(item);
    const stored = await service.getStoredItemKramdown(item);
    assert.equal(resolved.data, "源块刚更新的正文");
    assert.match(stored.data, new RegExp(source));
    assert.deepEqual(kernel.calls.filter((call) => call.endpoint === "getBlockKramdown").map((call) => call.payload.id), [source, B1]);
});

test("引用插入正文会剥离源块物理 IAL，但库内 marker 保持原样", async () => {
    const source = "20240101120005-eeeeeee";
    const {service} = makeService({
        getBlockKramdown: ({id}) => ({id, kramdown: id === source ? "源正文\n{: id='20240101120006-fffffff' custom-xlc-id='xlc-source0001'}" : `((${source} '短语'))`}),
    });
    const item = {
        id: "xlc-reference02", blockId: B1, libraryDocId: DOC, itemType: "blockref", title: "短语", alias: "",
        tags: [], category: "", summary: "", varCount: 0,
        source: {sourceDocId: DOC, sourceBlockId: source, sourceType: "block"},
        url: "", targetBlockId: source, createdAt: 1, updatedAt: 1, droppedFields: [],
    };
    const resolved = await service.getItemKramdown(item);
    assert.equal(resolved.data.includes("custom-xlc-id"), false);
    assert.equal(resolved.data.includes("20240101120006-fffffff"), false);
    const stored = await service.getStoredItemKramdown(item);
    assert.match(stored.data, new RegExp(source));
});

test("门禁：条目超过上限截断并标记 truncated（不静默丢数据）", async () => {
    const many = Array.from({length: 50}, (_, i) => ({id: `2024010112${String(i).padStart(4, "0")}-xxxxxxx`, type: "p"}));
    const {service} = makeService({
        getChildBlocks: () => many,
        batchGetBlockAttrs: ({ids}) => Object.fromEntries(ids.map((id, i) => [id, {"custom-xlc-id": `xlc-bulk${String(i).padStart(8, "0")}`}]))
    });
    // 上限可注入（生产默认 LIMITS.maxItems=2000；此处用 10 验证截断语义）
    const idx = await service.buildIndex(10);
    assert.equal(idx.truncated, true);
    assert.equal(idx.entries.length, 10);
});

test("createItem：appendBlock + setBlockAttrs，返回条目回执", async () => {
    const {kernel, service} = makeService();
    const result = await service.createItem({itemType: "text", markdown: "hello", title: "新条目", tags: ["a"]});
    assert.ok(result.ok);
    assert.match(result.data.item.id, /^xlc-/);
    assert.equal(result.data.item.title, "新条目");
    const setAttrs = kernel.calls.find((c) => c.endpoint === "setBlockAttrs");
    assert.equal(setAttrs.payload.id, "20240101120003-ccccccc");
    assert.equal(setAttrs.payload.attrs["custom-xlc-tags"], "a");
});

test("B-006：已有 parts 经文档归属核验后读回，正文更新和删除均暂停", async () => {
    const C1 = "20240101120010-ccccccc";
    const C2 = "20240101120011-ddddddd";
    const createdAttrs = {"custom-xlc-id": "xlc-multi0000001", "custom-xlc-parts": `${C1},${C2}`};
    const {kernel, service} = makeService({
        getChildBlocks: () => [{id: C1, type: "p"}, {id: C2, type: "l"}],
        batchGetBlockAttrs: () => ({
            [C1]: createdAttrs ?? {"custom-xlc-id": "xlc-multi0000001"},
            [C2]: {},
        }),
        getBlockAttrs: () => createdAttrs ?? {"custom-xlc-id": "xlc-multi0000001"},
        getBlockKramdown: ({id}) => ({id, kramdown: id === C1 ? "首段" : "- 尾段"}),
        checkBlocksExist: ({ids}) => Object.fromEntries(ids.map((id) => [id, true])),
    });
    const item = (await service.ensureIndex()).items.get("xlc-multi0000001");
    assert.deepEqual(item.partBlockIds, [C1, C2]);
    const stored = await service.getStoredItemKramdown(item);
    assert.deepEqual(stored, {ok: true, data: "首段\n\n- 尾段"});
    const updated = await service.updateItem(item.id, {markdown: "替换正文"});
    assert.equal(updated.ok, false);
    assert.equal(updated.reason, "conflict");
    const removed = await service.removeItem(item.id);
    assert.equal(removed.ok, false);
    assert.equal(removed.reason, "conflict");
    assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
});

test("B-006：意外返回多个 insert 时报告待核对，不登记或盲删", async () => {
    const C1 = "20240101120012-eeeeeee";
    const C2 = "20240101120013-fffffff";
    const {kernel, service} = makeService({
        appendBlock: ({parentID}) => [{doOperations: [{id: C1, action: "insert", parentID}, {id: C2, action: "insert", parentID}]}],
        setBlockAttrs: () => { throw new Error("attrs failed"); },
    });
    const result = await service.createItem({itemType: "text", markdown: "a"});
    assert.equal(result.ok, false);
    assert.match(result.message, /inspect library document/);
    assert.equal(kernel.calls.some((call) => ["setBlockAttrs", "deleteBlock"].includes(call.endpoint)), false);
});

test("B-006：append 回包含非法操作时拒绝且不自动删除响应 ID", async () => {
    const C1 = "20240101120014-ggggggg";
    const {kernel, service} = makeService({
        appendBlock: ({parentID}) => [{doOperations: [{id: C1, action: "insert", parentID}, {id: "not-a-block", action: "insert", parentID}]}],
    });
    const result = await service.createItem({itemType: "text", markdown: "a"});
    assert.equal(result.ok, false);
    assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
});

test("B-006：损坏的 parts 元数据拒绝正文读取，不猜测邻接块", async () => {
    const {service} = makeService({
        getChildBlocks: () => [{id: B1, type: "p"}],
        batchGetBlockAttrs: () => ({[B1]: {"custom-xlc-id": "xlc-corrupt00001", "custom-xlc-parts": `${B1},bad`}}),
        getBlockAttrs: () => ({"custom-xlc-id": "xlc-corrupt00001", "custom-xlc-parts": `${B1},bad`}),
    });
    const index = await service.ensureIndex();
    const item = index.items.get("xlc-corrupt00001");
    assert.equal(item.partsCorrupt, true);
    const stored = await service.getStoredItemKramdown(item);
    assert.equal(stored.ok, false);
    assert.equal(stored.reason, "conflict");
});

test("写操作成功后按逻辑 ID 通知缓存失效，失败操作不通知", async () => {
    const changes = [];
    const existingId = "xlc-cacheentry0001";
    const {service} = makeService({
        getChildBlocks: () => [{id: B1, type: "p"}],
        batchGetBlockAttrs: () => ({[B1]: {"custom-xlc-id": existingId}}),
        getBlockAttrs: () => ({"custom-xlc-id": existingId}),
    }, undefined, {onItemsChanged: (ids) => changes.push([...ids])});
    const index = await service.ensureIndex();
    assert.equal(index.entries[0].id, existingId);

    const updated = await service.updateItem(existingId, {title: "改名"});
    assert.equal(updated.ok, true);
    assert.deepEqual(changes, [[existingId]]);

    const cleared = await service.clearSource(existingId);
    assert.equal(cleared.ok, true);
    const relinked = await service.relinkSource(existingId, {sourceDocId: DOC});
    assert.equal(relinked.ok, true);
    const removed = await service.removeItem(existingId);
    assert.equal(removed.ok, true);

    const created = await service.createItem({itemType: "text", markdown: "new"});
    assert.equal(created.ok, true);
    const createdId = created.data.item.id;
    const invalid = await service.createItem({itemType: "url", markdown: "javascript:alert(1)", url: "javascript:alert(1)"});
    assert.equal(invalid.ok, false);
    assert.deepEqual(changes, [
        [existingId],
        [existingId],
        [existingId],
        [existingId],
        [createdId],
    ]);
});

test("createItem：同一 logicalId 并发写入串行化，重试不产生第二个块", async () => {
    let appends = 0;
    const {kernel, service} = makeService({
        appendBlock: async () => {
            appends++;
            await new Promise((resolve) => setTimeout(resolve, 20));
            return [{doOperations: [{id: "20240101120003-ccccccc", action: "insert", parentID: DOC}]}];
        },
    });
    const input = {itemType: "text", markdown: "幂等正文", logicalId: "xlc-idempotent0001"};
    const [first, second] = await Promise.all([service.createItem(input), service.createItem(input)]);
    assert.equal([first, second].filter((result) => result.ok).length, 1);
    assert.equal([first, second].filter((result) => !result.ok && result.reason === "conflict").length, 1);
    assert.equal(appends, 1);
    assert.equal(kernel.calls.filter((call) => call.endpoint === "appendBlock").length, 1);
});

test("createItem：显式幂等 key 在并发与顺序重试中复用成功回执", async () => {
    let appends = 0;
    const {kernel, service} = makeService({
        appendBlock: async () => {
            appends++;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return [{doOperations: [{id: "20240101120003-ccccccc", action: "insert", parentID: DOC}]}];
        },
    });
    const input = {itemType: "text", markdown: "重复提交"};
    const options = {idempotencyKey: "xlc-submit-test-001"};
    const [first, second] = await Promise.all([
        service.createItem(input, undefined, options),
        service.createItem(input, undefined, options),
    ]);
    const third = await service.createItem(input, undefined, options);
    assert.equal(first.ok, true);
    assert.strictEqual(second, first);
    assert.strictEqual(third, first);
    assert.equal(appends, 1);
    assert.equal(kernel.calls.filter((call) => call.endpoint === "appendBlock").length, 1);
});

test("URL 写入：仅接受 http/https；清空 URL 仍允许", async () => {
    const {service} = makeService();
    const unsafe = await service.createItem({itemType: "url", markdown: "javascript:alert(1)", url: "javascript:alert(1)"});
    assert.equal(unsafe.ok, false);
    assert.equal(unsafe.reason, "invalid-input");
    const safe = await service.createItem({itemType: "url", markdown: "https://example.com", url: "https://example.com"});
    assert.equal(safe.ok, true);
});

test("门禁：属性写入失败时回滚已插入块（失败不落半条数据）", async () => {
    const {kernel, service} = makeService({setBlockAttrs: () => { throw new Error("attrs denied"); }});
    const result = await service.createItem({itemType: "text", markdown: "hello"});
    assert.equal(result.ok, false);
    const del = kernel.calls.find((c) => c.endpoint === "deleteBlock");
    assert.ok(del, "orphan block must be rolled back");
    assert.equal(del.payload.id, "20240101120003-ccccccc");
});

test("createItem：appendBlock 未返回块 ID → 明确失败（不写属性）", async () => {
    const {kernel, service} = makeService({appendBlock: () => []});
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.equal(result.ok, false);
    assert.ok(!kernel.calls.some((c) => c.endpoint === "setBlockAttrs"));
});

test("来源失效检测：块/文档/资源三态", async () => {
    const {service} = makeService({checkBlocksExist: ({ids}) => Object.fromEntries(ids.map((id) => [id, false]))});
    const item = {
        id: "xlc-src1", blockId: B1, libraryDocId: DOC, itemType: "markdown",
        source: {sourceDocId: DOC, sourceBlockId: B2, sourceType: "block"},
    };
    const health = await service.checkSourceHealth(item);
    assert.ok(health.ok);
    assert.equal(health.data.docMissing, true);
    assert.equal(health.data.blockMissing, true);

    // 图片条目资源缺失（getFile 失败 → assetMissing）
    const imgKernel = makeKernel({
        getBlockKramdown: () => ({id: B1, kramdown: "![](assets/missing.png)"}),
        getFile: () => { throw new Error("404"); },
    });
    const imgService = new LibraryService(imgKernel, {
        probeAsset: async (path) => {
            try {
                await imgKernel.request("getFile", {path});
                return true;
            } catch {
                return false;
            }
        },
    });
    imgService.setConfig({mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: 1});
    const imgHealth = await imgService.checkSourceHealth({...item, itemType: "image"});
    assert.equal(imgHealth.data.assetMissing, true);
});

test("引用健康检查校验目标块，即使来源字段缺失也不误报健康", async () => {
    let requestedIds = [];
    const {service} = makeService({
        checkBlocksExist: ({ids}) => {
            requestedIds = ids;
            return Object.fromEntries(ids.map((id) => [id, false]));
        },
    });
    const item = {
        id: "xlc-reference02", blockId: B1, libraryDocId: DOC, itemType: "blockref", title: "坏引用", alias: "",
        tags: [], category: "", summary: "", varCount: 0,
        source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
        url: "", targetBlockId: B2, createdAt: 1, updatedAt: 1, droppedFields: [],
    };
    const health = await service.checkSourceHealth(item);
    assert.deepEqual(requestedIds, [B2]);
    assert.equal(health.data.blockMissing, true);
});

test("relinkSource：非法来源 ID 拒绝", async () => {
    const {service} = makeService();
    const created = await service.createItem({itemType: "text", markdown: "x"});
    const relink = await service.relinkSource(created.data.item.id, {sourceDocId: "bad"});
    assert.equal(relink.ok, false);
    assert.equal(relink.reason, "invalid-input");
});

test("reindex 强制重建（缓存可丢弃）", async () => {
    const {kernel, service} = makeService();
    await service.ensureIndex();
    const first = kernel.calls.filter((c) => c.endpoint === "getChildBlocks").length;
    await service.ensureIndex(); // 命中缓存
    assert.equal(kernel.calls.filter((c) => c.endpoint === "getChildBlocks").length, first);
    await service.reindex();
    assert.ok(kernel.calls.filter((c) => c.endpoint === "getChildBlocks").length > first);
});

test("reindex 收到停止信号后等待当前请求并跳过后续索引请求", async () => {
    let releaseRead;
    let readStarted;
    const readGate = new Promise((resolve) => { releaseRead = resolve; });
    const started = new Promise((resolve) => { readStarted = resolve; });
    let shouldStop = false;
    const {kernel, service} = makeService({
        getChildBlocks: async () => {
            readStarted();
            await readGate;
            return [{id: B1, type: "p"}];
        },
    });
    const rebuilding = service.reindex({shouldStop: () => shouldStop});
    await started;
    shouldStop = true;
    releaseRead();
    const index = await rebuilding;

    assert.equal(index.stopped, true);
    assert.equal(index.truncated, true);
    assert.equal(index.entries.length, 0);
    assert.deepEqual(kernel.calls.map(({endpoint}) => endpoint), ["getChildBlocks"]);
    assert.equal(service.getIndex(), null);
});

test("无库配置时 CRUD 明确失败（不静默写错地方）", async () => {
    const kernel = makeKernel();
    const service = new LibraryService(kernel);
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid-input");
});

test("removeItemsIfUnchanged 仅删除仍匹配的批次副本，并现场复核属性与正文", async (t) => {
    const itemId = "xlc-discovery0001";
    const itemBlock = "20240101120005-eeeeeee";
    const body = "批次正文";
    const createCase = (overrides = {}, serviceOptions = {}) => {
        let liveAttrs = {};
        let liveBody = body;
        let bodyReads = 0;
        let failIndex = false;
        let indexedBlock = itemBlock;
        const {kernel, service} = makeService({
            getChildBlocks: () => {
                if (failIndex) throw new Error("tree unavailable");
                return [{id: indexedBlock, type: "p"}];
            },
            batchGetBlockAttrs: () => ({[indexedBlock]: {...liveAttrs}}),
            getBlockAttrs: () => ({...liveAttrs}),
            getBlockKramdown: ({id}) => {
                bodyReads++;
                if (overrides.onBodyRead) overrides.onBodyRead({bodyReads, attrs: liveAttrs, setBody: (value) => { liveBody = value; }});
                return {id, kramdown: liveBody};
            },
            appendBlock: ({parentID}) => [{doOperations: [{id: itemBlock, action: "insert", parentID}]}],
            setBlockAttrs: ({attrs}) => { liveAttrs = {...attrs}; },
            deleteBlock: () => null,
            ...overrides.kernel,
        }, undefined, serviceOptions);
        return {
            kernel,
            service,
            liveAttrs: () => liveAttrs,
            setFailIndex: (value) => { failIndex = value; },
            setIndexedBlock: (value) => { indexedBlock = value; },
            async createSnapshot() {
                const created = await service.createItem({
                    itemType: "text",
                    logicalId: itemId,
                    markdown: body,
                    title: "批次内容",
                    source: {
                        sourceDocId: "20240101120006-fffffff",
                        sourceBlockId: "20240101120007-ggggggg",
                        sourceType: "block",
                    },
                }, undefined, {batchToken: "discovery-batch-token-01"});
                assert.equal(created.ok, true, created.ok ? "" : created.message);
                return created.data.item;
            },
            batchToken: "discovery-batch-token-01",
        };
    };

    await t.test("身份、属性和正文都未变时删除精确物理块", async () => {
        const notifications = [];
        const {kernel, service, createSnapshot, batchToken} = createCase({}, {onItemsChanged: (ids) => notifications.push([...ids])});
        const item = await createSnapshot();
        assert.deepEqual(notifications, [[itemId]], "create emits only the created ID");
        notifications.length = 0;
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.ok, true, result.ok ? "" : result.message);
        assert.deepEqual(result.data, [{status: "deleted", itemId: item.id, blockId: itemBlock}]);
        assert.equal(kernel.calls.filter((call) => call.endpoint === "getBlockKramdown").length, 3);
        assert.deepEqual(kernel.calls.filter((call) => call.endpoint === "deleteBlock").map((call) => call.payload.id), [itemBlock]);
        assert.deepEqual(notifications, [[itemId]], "batch delete emits only actually deleted IDs");
    });

    await t.test("忽略 getBlockKramdown 附带的本块 IAL 属性", async () => {
        const {service, createSnapshot, batchToken} = createCase({kernel: {
            getBlockKramdown: ({id}) => ({
                id,
                kramdown: `${body}\n{: id="${id}" custom-xlc-id="${itemId}"}`,
            }),
        }});
        const item = await createSnapshot();
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.ok, true, result.ok ? "" : result.message);
        assert.deepEqual(result.data, [{status: "deleted", itemId: item.id, blockId: itemBlock}]);
    });

    await t.test("正文已编辑时跳过且不删除", async () => {
        const {kernel, service, createSnapshot, batchToken} = createCase({kernel: {getBlockKramdown: ({id}) => ({id, kramdown: "后续编辑"})}});
        const item = await createSnapshot();
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.data[0].reason, "edited");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });

    await t.test("属性已编辑时跳过且不删除", async () => {
        const {kernel, service, createSnapshot, batchToken, liveAttrs} = createCase();
        const item = await createSnapshot();
        liveAttrs()["custom-xlc-title"] = "用户修改过的标题";
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.data[0].reason, "edited");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });

    await t.test("未知 custom-xlc 扩展属性变化时跳过且不删除", async () => {
        const {kernel, service, createSnapshot, batchToken, liveAttrs} = createCase();
        const item = await createSnapshot();
        liveAttrs()["custom-xlc-future-field"] = "后来添加的扩展值";
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.data[0].reason, "edited");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });

    await t.test("成功删除后消费授权，同一批次不能重放删除", async () => {
        const {kernel, service, createSnapshot, batchToken} = createCase();
        const item = await createSnapshot();
        const first = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(first.ok, true);
        assert.equal(first.data[0].status, "deleted");

        const replay = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(replay.ok, false);
        assert.equal(replay.reason, "invalid-input");
        assert.equal(kernel.calls.filter((call) => call.endpoint === "deleteBlock").length, 1);
    });

    await t.test("读核验期间正文发生变化时跳过且不删除", async () => {
        const {kernel, service, createSnapshot, batchToken} = createCase({
            onBodyRead: ({bodyReads, setBody}) => { if (bodyReads === 3) setBody("并发编辑"); },
        });
        const item = await createSnapshot();
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.data[0].reason, "edited");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });

    await t.test("逻辑 ID 与批次回执不一致时不删除", async () => {
        const {kernel, service, createSnapshot, batchToken, liveAttrs} = createCase();
        const item = await createSnapshot();
        liveAttrs()["custom-xlc-id"] = "xlc-changeditem01";
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.data[0].reason, "not-found");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });

    await t.test("同逻辑 ID 对应的物理块已变化时不删除", async () => {
        const {kernel, service, createSnapshot, batchToken, setIndexedBlock} = createCase();
        const item = await createSnapshot();
        setIndexedBlock(B2);
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.ok, true);
        assert.equal(result.data[0].reason, "identity-changed");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });

    await t.test("非本批 createItem 返回的对象无法伪造批次授权", async () => {
        const {kernel, service, createSnapshot, batchToken} = createCase();
        await createSnapshot();
        const existing = (await service.reindex()).items.get(itemId);
        const result = await service.removeItemsIfUnchanged(batchToken, [{item: existing, markdown: body}]);
        assert.equal(result.ok, false);
        assert.equal(result.reason, "invalid-input");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });

    await t.test("索引不完整时全部跳过", async () => {
        const {kernel, service, createSnapshot, batchToken, setFailIndex} = createCase();
        const item = await createSnapshot();
        setFailIndex(true);
        const result = await service.removeItemsIfUnchanged(batchToken, [{item, markdown: body}]);
        assert.equal(result.ok, true);
        assert.equal(result.data[0].reason, "library-unverified");
        assert.equal(kernel.calls.some((call) => call.endpoint === "deleteBlock"), false);
    });
});

test("notebook 模式：从笔记本根解析首个文档作为写入落点", async () => {
    const {kernel, service} = makeService({
        listDocsByPath: () => ({files: [{id: "20240101120009-nbdoc01", name: "库"}]}),
    }, {mode: "notebook", notebookIds: ["20240101120008-nbook01"], containerDocIds: [], createdDocIds: [], configuredAt: 1});
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.ok(result.ok, result.ok ? "" : result.message);
    const append = kernel.calls.find((c) => c.endpoint === "appendBlock");
    assert.equal(append.payload.parentID, "20240101120009-nbdoc01");
});

test("notebook 模式：笔记本没有文档时明确拒绝写入", async () => {
    const {service} = makeService({listDocsByPath: () => ({files: []})}, {mode: "notebook", notebookIds: ["20240101120008-nbook01"], containerDocIds: [], createdDocIds: [], configuredAt: 1});
    const result = await service.createItem({itemType: "text", markdown: "x"});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid-input");
});

test("notebook 首跑：列出可用一级文档供空库前置检查", async () => {
    const {service, kernel} = makeService({
        listDocsByPath: ({path}) => path === "/" ? {files: [
            {id: B1, name: "常用内容库"},
            {id: "bad-id", name: "忽略非法 ID"},
        ]} : {files: []},
    });
    const result = await service.listNotebookDocs("20240101120008-nbook01");
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, [{id: B1, name: "常用内容库"}]);
    assert.ok(kernel.calls.some((call) => call.endpoint === "listDocsByPath" && call.payload.path === "/"));
});

test("notebook 首跑：无效笔记本 ID 被拒且不请求内核", async () => {
    const {service, kernel} = makeService();
    const result = await service.listNotebookDocs("");
    assert.equal(result.ok, false);
    assert.equal(kernel.calls.length, 0);
});

test("createNotebook：严格校验响应、写请求不重试并支持幂等回执", async () => {
    let createCalls = 0;
    const {kernel, service} = makeService({
        createNotebook: ({name}) => {
            createCalls += 1;
            return {notebook: {id: "20240101123456", name}};
        },
    });
    const first = await service.createNotebook(" 独立库 ", {idempotencyKey: "issue1-nb-001"});
    const second = await service.createNotebook("独立库", {idempotencyKey: "issue1-nb-001"});
    assert.deepEqual(first, {ok: true, data: {notebookId: "20240101123456", name: "独立库"}});
    assert.deepEqual(second, first);
    assert.equal(createCalls, 1);
    const call = kernel.calls.find((entry) => entry.endpoint === "createNotebook");
    assert.deepEqual(call.payload, {name: "独立库"});
    const invalid = await service.createNotebook(" ");
    assert.equal(invalid.ok, false);
    assert.equal(invalid.reason, "invalid-input");
});

test("createNotebook：空/畸形回包明确失败", async () => {
    for (const response of [{notebook: null}, {notebook: {name: "缺 ID"}}, "20240101123456"]) {
        const {service} = makeService({createNotebook: () => response});
        const result = await service.createNotebook("独立库");
        assert.equal(result.ok, false);
        assert.equal(result.reason, "kernel-error");
    }
});

test("removeNotebook：严格 ID 与 null 回包，失败不伪报成功", async () => {
    const {kernel, service} = makeService({removeNotebook: () => null});
    const result = await service.removeNotebook("20240101123456", {idempotencyKey: "issue1-rm-001"});
    assert.deepEqual(result, {ok: true, data: {notebookId: "20240101123456"}});
    assert.deepEqual(kernel.calls.find((entry) => entry.endpoint === "removeNotebook").payload, {notebook: "20240101123456"});
    const invalid = await service.removeNotebook("bad-id");
    assert.equal(invalid.ok, false);
    assert.equal(invalid.reason, "invalid-input");
    const malformed = await makeService({removeNotebook: () => ({ok: true})}).service.removeNotebook("20240101123456");
    assert.equal(malformed.ok, false);
    assert.equal(malformed.reason, "kernel-error");
});

test("createIndependentLibrary：先建笔记本再建库文档，成功返回两个 ID", async () => {
    const {kernel, service} = makeService({
        createNotebook: ({name}) => ({notebook: {id: "20240101123456", name}}),
        createDocWithMd: () => "20240101123457-ddddddd",
    });
    const result = await service.createIndependentLibrary("独立库", "常用内容库", {idempotencyKey: "issue1-flow-001"});
    assert.deepEqual(result, {ok: true, data: {notebookId: "20240101123456", docId: "20240101123457-ddddddd"}});
    assert.deepEqual(kernel.calls.filter((entry) => ["createNotebook", "createDocWithMd"].includes(entry.endpoint)).map((entry) => entry.endpoint), ["createNotebook", "createDocWithMd"]);
});

test("createIndependentLibrary：库文档失败时补偿删除成功并保留 notebook ID", async () => {
    const {kernel, service} = makeService({
        createNotebook: ({name}) => ({notebook: {id: "20240101123456", name}}),
        createDocWithMd: () => { throw new Error("doc denied"); },
        removeNotebook: () => null,
    });
    const result = await service.createIndependentLibrary("独立库", "常用内容库", {idempotencyKey: "issue1-flow-002"});
    assert.equal(result.ok, false);
    assert.equal(result.notebookId, "20240101123456");
    assert.equal(result.compensation, "succeeded");
    assert.match(result.message, /was removed/);
    assert.ok(kernel.calls.some((entry) => entry.endpoint === "removeNotebook"));
});

test("createIndependentLibrary：补偿删除失败时回执保留 notebook ID 且明确失败", async () => {
    const {service} = makeService({
        createNotebook: ({name}) => ({notebook: {id: "20240101123456", name}}),
        createDocWithMd: () => { throw new Error("doc denied"); },
        removeNotebook: () => { throw new Error("permission denied"); },
    });
    const result = await service.createIndependentLibrary("独立库", "常用内容库", {idempotencyKey: "issue1-flow-003"});
    assert.equal(result.ok, false);
    assert.equal(result.notebookId, "20240101123456");
    assert.equal(result.compensation, "failed");
    assert.match(result.message, /could not be removed/);
});

test("createIndependentLibrary：最长幂等键仍派生有界子键并只创建一次", async () => {
    let notebookCalls = 0;
    let docCalls = 0;
    const {kernel, service} = makeService({
        createNotebook: ({name}) => {
            notebookCalls += 1;
            return {notebook: {id: "20240101123456", name}};
        },
        createDocWithMd: () => {
            docCalls += 1;
            return "20240101123457-ddddddd";
        },
    });
    const key = "x".repeat(128);
    const first = await service.createIndependentLibrary("独立库", "常用内容库", {idempotencyKey: key});
    const second = await service.createIndependentLibrary("独立库", "常用内容库", {idempotencyKey: key});
    assert.deepEqual(second, first);
    assert.equal(notebookCalls, 1);
    assert.equal(docCalls, 1);
    for (const call of kernel.calls.filter((entry) => ["createNotebook", "createDocWithMd"].includes(entry.endpoint))) {
        assert.ok(call.payload);
    }
});
