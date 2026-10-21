// R292 多源内容库同步比对与冲突合并策略专项契约测试（ADR 0085 / G33 / T-0145）
const test = require("node:test");
const assert = require("node:assert/strict");
const { syncDiff, syncDiffModal } = require("./.build/entry.cjs");

const {
    computeItemFingerprint,
    detectChangedFields,
    diffLibraries,
    planLibrarySync,
    executeSyncMerge,
} = syncDiff;

const {
    openSyncDiffModal,
    STRATEGY_DESCRIPTIONS,
} = syncDiffModal;

function createMockEntry(id, title, kramdown, overrides = {}) {
    return {
        id,
        title,
        kramdown,
        itemType: "text",
        tags: ["common"],
        category: "default",
        createdAt: 1000,
        updatedAt: 1000,
        ...overrides,
    };
}

test("computeItemFingerprint: 稳定哈希与变动感知", () => {
    const e1 = createMockEntry("1", "条目1", "正文1", {tags: ["b", "a"]});
    const e2 = createMockEntry("1", "条目1", "正文1", {tags: ["a", "b"]}); // 标签乱序归一后哈希应一致
    const e3 = createMockEntry("1", "条目1-改", "正文1");

    const h1 = computeItemFingerprint(e1);
    const h2 = computeItemFingerprint(e2);
    const h3 = computeItemFingerprint(e3);

    assert.equal(h1, h2, "标签乱序归一化后指纹应完全相同");
    assert.notEqual(h1, h3, "标题变更后指纹应不同");
});

test("detectChangedFields: 字段变更精细检测", () => {
    const local = createMockEntry("1", "旧标题", "旧正文", {tags: ["t1"], category: "c1"});
    const remote = createMockEntry("1", "新标题", "旧正文", {tags: ["t1", "t2"], category: "c1"});

    const fields = detectChangedFields(local, remote);
    assert.ok(fields.includes("title"), "应检出标题变更");
    assert.ok(fields.includes("tags"), "应检出标签变更");
    assert.ok(!fields.includes("category"), "未变动字段不应检出");
    assert.ok(!fields.includes("kramdown"), "未变动正文不应检出");
});

test("diffLibraries: 完整状态分类 (identical, added, removed, modified, conflict)", () => {
    const localList = [
        createMockEntry("1", "完全相同", "正文1", {updatedAt: 1000}),
        createMockEntry("2", "本地旧版", "正文2", {updatedAt: 700}), // 本地未在基线(800)后修改
        createMockEntry("3", "本地冲突", "冲突正文A", {updatedAt: 2000}), // 本地在基线后修改
        createMockEntry("4", "本地独有", "正文4", {updatedAt: 1000}),
    ];

    const remoteList = [
        createMockEntry("1", "完全相同", "正文1", {updatedAt: 1000}), // identical
        createMockEntry("2", "远端新版", "正文2-新", {updatedAt: 2000}), // modified (仅远端在基线后变动)
        createMockEntry("3", "远端冲突", "冲突正文B", {updatedAt: 1500}), // conflict (两端均在基线后变动)
        createMockEntry("5", "远端独有", "正文5", {updatedAt: 1200}), // added
    ];

    const report = diffLibraries(localList, remoteList, {baselineTimestamp: 800});

    assert.equal(report.identicalCount, 1);
    assert.equal(report.addedCount, 1);
    assert.equal(report.removedCount, 1);
    assert.equal(report.modifiedCount, 1);
    assert.equal(report.conflictCount, 1);
    assert.equal(report.diffs.length, 5);
});

test("planLibrarySync: 各合并策略决策契约", () => {
    const localList = [
        createMockEntry("1", "条目1", "正文1", {updatedAt: 1000}),
        createMockEntry("3", "冲突条目", "本地A", {updatedAt: 2000}),
        createMockEntry("4", "本地独有", "正文4", {updatedAt: 1000}),
    ];
    const remoteList = [
        createMockEntry("1", "条目1", "正文1", {updatedAt: 1000}),
        createMockEntry("3", "冲突条目", "远端B", {updatedAt: 1500}),
        createMockEntry("5", "远端新增", "正文5", {updatedAt: 1200}),
    ];
    const report = diffLibraries(localList, remoteList);

    // 1. smart-merge 策略
    const planSmart = planLibrarySync(report, "smart-merge");
    assert.equal(planSmart.strategy, "smart-merge");
    assert.equal(planSmart.summary.create, 1); // 远端新增 -> create
    assert.equal(planSmart.summary.noop, 2); // identical 1 + removed 1

    // 2. keep-both 策略
    const planBoth = planLibrarySync(report, "keep-both");
    assert.ok(planBoth.summary.fork >= 1, "冲突项应产生 fork 行为");

    // 3. keep-local 策略
    const planLocal = planLibrarySync(report, "keep-local");
    const conflictItem = planLocal.items.find((i) => i.id === "3");
    assert.equal(conflictItem.action, "noop", "keep-local 下冲突项应为 noop");

    // 4. mirrorDelete 选项
    const planMirror = planLibrarySync(report, "keep-remote", {mirrorDelete: true});
    assert.equal(planMirror.summary.delete, 1, "开启镜像删除时 removed 条目应被标记为 delete");
});

test("executeSyncMerge: 执行合入并产出正确最终条目集", () => {
    const localList = [
        createMockEntry("1", "条目1", "正文1", {updatedAt: 1000, tags: ["t1"]}),
        createMockEntry("2", "条目2", "旧正文", {updatedAt: 1000}),
    ];
    const remoteList = [
        createMockEntry("1", "条目1", "正文1", {updatedAt: 1000, tags: ["t2"]}), // tags 差异
        createMockEntry("3", "条目3-新增", "正文3", {updatedAt: 2000}),
    ];
    const report = diffLibraries(localList, remoteList);
    const plan = planLibrarySync(report, "smart-merge");
    const receipt = executeSyncMerge(localList, plan);

    assert.equal(receipt.success, 3);
    assert.equal(receipt.failed, 0);
    assert.equal(receipt.finalEntries.length, 3);

    const merged1 = receipt.finalEntries.find((e) => e.id === "1");
    assert.ok(merged1.tags.includes("t1") && merged1.tags.includes("t2"), "智能合并标签应取并集");
});

test("SyncDiffModal UI: HTML 渲染与骨架结构", () => {
    const localList = [createMockEntry("1", "条目1", "正文1")];
    const remoteList = [createMockEntry("1", "条目1", "正文1")];
    const report = diffLibraries(localList, remoteList);

    const modal = openSyncDiffModal({
        report,
        localEntries: localList,
        title: "测试模态框标题",
    });
    const html = modal.element.innerHTML;
    assert.ok(html.includes("测试模态框标题"), "应包含标题");
    assert.ok(html.includes("xlc-sync-summary-cards"), "应包含摘要卡片");
    assert.ok(html.includes("完全一致"), "应包含相同计数卡片");
    assert.ok(html.includes("xlc-sync-diff-table"), "应包含差异明细表");
});

test("SyncDiffModal UI: Mock 交互生命周期与策略切换", async () => {
    const localList = [
        createMockEntry("1", "条目1", "本地正文", {updatedAt: 1000}),
        createMockEntry("2", "冲突项", "内容A", {updatedAt: 2000}),
    ];
    const remoteList = [
        createMockEntry("1", "条目1", "本地正文", {updatedAt: 1000}),
        createMockEntry("2", "冲突项", "内容B", {updatedAt: 1500}),
    ];
    const report = diffLibraries(localList, remoteList);

    let confirmedReceipt = null;
    const modal = openSyncDiffModal({
        report,
        localEntries: localList,
        initialStrategy: "smart-merge",
        onConfirm: (receipt) => {
            confirmedReceipt = receipt;
        },
    });

    assert.equal(modal.getCurrentStrategy(), "smart-merge");

    // 切换策略为 keep-both
    modal.setStrategy("keep-both");
    assert.equal(modal.getCurrentStrategy(), "keep-both");
    assert.ok(modal.getCurrentPlan().summary.fork >= 1);

    // 触发应用合并
    const receipt = await modal.applySync();
    assert.ok(receipt.success > 0);

    // 状态筛选器交互测试 (G45)
    assert.equal(modal.getStatusFilter(), null);
    modal.setStatusFilter("conflict");
    assert.equal(modal.getStatusFilter(), "conflict");
    modal.setStatusFilter(null);
    assert.equal(modal.getStatusFilter(), null);
});
