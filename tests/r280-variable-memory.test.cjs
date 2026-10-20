// T-0133 / R280 / G22：变量历史填写值记忆与智能预填契约测试
const test = require("node:test");
const assert = require("node:assert");
const {variableMemory, storage} = {
    variableMemory: require("./.build/entry.cjs").variableMemory,
    storage: require("./.build/entry.cjs").storage,
};
const vm = variableMemory;

test("normalizeVariableMemory: 安全兜底与非法结构容错", () => {
    // 空输入
    const def = vm.normalizeVariableMemory(null);
    assert.equal(def.enabled, true);
    assert.deepEqual(def.values, {});

    // 非法结构
    const corrupted = vm.normalizeVariableMemory({
        enabled: "yes", // 非 boolean
        values: "bad-values",
    });
    assert.equal(corrupted.enabled, true);
    assert.deepEqual(corrupted.values, {});

    // 显式关闭
    const disabled = vm.normalizeVariableMemory({enabled: false, values: {}});
    assert.equal(disabled.enabled, false);
});

test("rememberValue & getRememberedValue: 读写与大小写不敏感", () => {
    let mem = vm.normalizeVariableMemory(null);
    const now = 1700000000000;

    // 写入字段
    mem = vm.rememberValue(mem, "客服姓名", "张三", now);
    assert.equal(vm.getRememberedValue(mem, "客服姓名"), "张三");
    // 大小写/首尾空白不敏感
    assert.equal(vm.getRememberedValue(mem, " 客服姓名 "), "张三");

    // 英文大小写
    mem = vm.rememberValue(mem, "CustomerName", "Alice", now);
    assert.equal(vm.getRememberedValue(mem, "customername"), "Alice");
    assert.equal(vm.getRememberedValue(mem, "CUSTOMERNAME"), "Alice");

    // 覆盖更新
    mem = vm.rememberValue(mem, "客服姓名", "李四", now + 1000);
    assert.equal(vm.getRememberedValue(mem, "客服姓名"), "李四");
});

test("rememberValue: 空值绝对不记（防占位符兜底污染记忆）", () => {
    let mem = vm.normalizeVariableMemory(null);
    const now = Date.now();

    // 纯空串或全空白
    mem = vm.rememberValue(mem, "测试字段", "", now);
    assert.equal(vm.getRememberedValue(mem, "测试字段"), "");
    assert.equal(Object.keys(mem.values).length, 0);

    mem = vm.rememberValue(mem, "测试字段", "   ", now);
    assert.equal(vm.getRememberedValue(mem, "测试字段"), "");
    assert.equal(Object.keys(mem.values).length, 0);

    mem = vm.rememberValue(mem, "测试字段", null, now);
    assert.equal(vm.getRememberedValue(mem, "测试字段"), "");
    assert.equal(Object.keys(mem.values).length, 0);
});

test("collectDefaults: 批量多字段预填提取", () => {
    let mem = vm.normalizeVariableMemory(null);
    mem = vm.rememberValues(mem, {
        "工单号": "WO-20261020",
        "联系电话": "13800000000",
        "未填项": "",
    }, Date.now());

    const defaults = vm.collectDefaults(mem, ["工单号", "联系电话", "未填项", "无记忆字段"]);
    assert.deepEqual(defaults, {
        "工单号": "WO-20261020",
        "联系电话": "13800000000",
    });
});

test("forgetValue & clearAllMemory: 单字段抹除与全部清空", () => {
    let mem = vm.normalizeVariableMemory(null);
    mem = vm.rememberValues(mem, {
        "字段A": "1",
        "字段B": "2",
        "字段C": "3",
    }, Date.now());
    assert.equal(vm.countRememberedFields(mem), 3);

    // 单项遗忘
    mem = vm.forgetValue(mem, "字段B");
    assert.equal(vm.getRememberedValue(mem, "字段B"), "");
    assert.equal(vm.getRememberedValue(mem, "字段A"), "1");
    assert.equal(vm.countRememberedFields(mem), 2);

    // 全部清空（保留 enabled 状态）
    mem = vm.clearAllMemory(mem);
    assert.equal(vm.countRememberedFields(mem), 0);
    assert.equal(mem.enabled, true);
});

test("rememberValue: 容量上限（200条）LRU 淘汰最旧项", () => {
    let mem = vm.normalizeVariableMemory(null);
    // 写入 205 个不同字段
    for (let i = 0; i < 205; i++) {
        mem = vm.rememberValue(mem, `field_${i}`, `val_${i}`, 1000 + i);
    }
    // 必须被截断到 200 条
    assert.equal(vm.countRememberedFields(mem), vm.VARIABLE_MEMORY_MAX_FIELDS);
    // 最旧的 5 条（field_0 ~ field_4）应被淘汰
    assert.equal(vm.getRememberedValue(mem, "field_0"), "");
    assert.equal(vm.getRememberedValue(mem, "field_4"), "");
    // 最新的 field_204 应在
    assert.equal(vm.getRememberedValue(mem, "field_204"), "val_204");
});

test("storage: PluginState 包含 variableMemory 并平滑持久化", () => {
    const rawState = {
        schemaVersion: 2,
        favorites: [],
        recents: [],
        variableMemory: {
            enabled: true,
            values: {
                "经办人": {value: "王专员", lastAt: 123456},
            },
        },
    };
    const state = storage.normalizeState(rawState);
    assert.ok(state.variableMemory);
    assert.equal(state.variableMemory.enabled, true);
    assert.equal(vm.getRememberedValue(state.variableMemory, "经办人"), "王专员");
});
