// R217 搜索框最近查询历史记忆与空输入历史回溯契约专项测试（ADR 0043 / T-0070）
const test = require("node:test");
const assert = require("node:assert/strict");
const {pushRecentQuery, normalizeState} = require("./.build/entry.cjs").storage;

test("pushRecentQuery 历史队列纯函数契约：LRU 去重、保序与容量截断", () => {
    // 1. 正常追加新词到首位
    const q1 = pushRecentQuery(["发票"], "延期");
    assert.deepEqual(q1, ["延期", "发票"]);

    // 2. 重复词提升到首位（LRU 语义）
    const q2 = pushRecentQuery(["延期", "发票", "开发"], "发票");
    assert.deepEqual(q2, ["发票", "延期", "开发"]);

    // 3. 空白与纯空格安全过滤（原样返回）
    const q3 = pushRecentQuery(["延期", "发票"], "   ");
    assert.deepEqual(q3, ["延期", "发票"]);
    const q4 = pushRecentQuery(["延期", "发票"], "");
    assert.deepEqual(q4, ["延期", "发票"]);

    // 4. 10 条容量上限严格截断
    let list = [];
    for (let i = 0; i < 15; i++) {
        list = pushRecentQuery(list, `词条_${i}`);
    }
    assert.strictEqual(list.length, 10);
    assert.strictEqual(list[0], "词条_14");
    assert.strictEqual(list[9], "词条_5");
});

test("normalizeState 侧车归一化对 recentQueries 字段的容错处理", () => {
    // 1. 非法数据类型或损坏数组安全净化
    const stateWithBadQueries = normalizeState({
        schemaVersion: 2,
        search: {
            pinyin: true,
            placeholders: true,
            lastQuery: "测试",
            recentQueries: ["正常词", "", "  ", 12345, null, "正常词", "另一个词"],
        },
    });

    assert.ok(Array.isArray(stateWithBadQueries.search.recentQueries));
    assert.deepEqual(stateWithBadQueries.search.recentQueries, ["正常词", "另一个词"]);

    // 2. 缺省字段安全回退为空数组
    const stateWithoutQueries = normalizeState({schemaVersion: 2});
    assert.deepEqual(stateWithoutQueries.search.recentQueries, []);
});

test("搜索框空输入历史回溯状态机契约", () => {
    class SearchHistoryNavigator {
        constructor(history = []) {
            this.history = history;
            this.cursor = -1;
            this.tempInput = "";
        }

        onArrowUp(currentValue) {
            if (this.history.length === 0) return null;
            if (this.cursor < 0) {
                if (currentValue.trim().length > 0) return null; // 有正在输入的内容时不劫持
                this.tempInput = currentValue;
                this.cursor = 0;
            } else if (this.cursor + 1 < this.history.length) {
                this.cursor++;
            }
            return this.history[this.cursor] ?? null;
        }

        onArrowDown() {
            if (this.cursor < 0) return null; // 未在翻找历史，交由列表下移
            this.cursor--;
            if (this.cursor >= 0) {
                return this.history[this.cursor] ?? null;
            }
            return this.tempInput; // 回退到历史前的原始输入
        }
    }

    const nav = new SearchHistoryNavigator(["发票资料", "延期致歉", "周报"]);

    // 1. 空输入框按 ArrowUp：回填第一条历史
    assert.strictEqual(nav.onArrowUp(""), "发票资料");

    // 2. 继续按 ArrowUp：回填第二条、第三条
    assert.strictEqual(nav.onArrowUp("发票资料"), "延期致歉");
    assert.strictEqual(nav.onArrowUp("延期致歉"), "周报");

    // 3. 达到历史边界继续按 ArrowUp：保持在最后一条
    assert.strictEqual(nav.onArrowUp("周报"), "周报");

    // 4. 按 ArrowDown：逐步回退
    assert.strictEqual(nav.onArrowDown(), "延期致歉");
    assert.strictEqual(nav.onArrowDown(), "发票资料");

    // 5. 翻过最新一条回到最初空输入
    assert.strictEqual(nav.onArrowDown(), "");
    assert.strictEqual(nav.cursor, -1);
});
