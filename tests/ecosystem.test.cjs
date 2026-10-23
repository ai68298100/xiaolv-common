// 小驴家族生态轻量探测与只读联动契约测试（Ecosystem Adapter）
const test = require("node:test");
const assert = require("node:assert/strict");
const { ecosystem, commands, library } = require("./.build/entry.cjs");

const { detectEcosystem, queryEcosystemItems } = ecosystem;

test("生态探测：无任何兄弟插件时安全降级，installedCount 为 0，零开销", () => {
    const emptyHost = {};
    const status = detectEcosystem(emptyHost);
    assert.strictEqual(status.installedCount, 0);
    assert.strictEqual(status.totalChecked, 4);
    assert.ok(status.plugins.every((p) => p.installed === false));
});

test("生态探测：正确识别挂载的兄弟插件（打卡、人脉、拾遗、雷切）", () => {
    const mockHost = {
        siyuanCheckin: {
            getItems: () => [],
        },
        LvContacts: {
            searchPeople: async () => [],
        },
        siyuanGlean: {
            listClips: async () => [],
        },
        siyuanSpeedSwitch: {},
    };

    const status = detectEcosystem(mockHost);
    assert.strictEqual(status.installedCount, 4);
    assert.strictEqual(status.totalChecked, 4);
    assert.ok(status.plugins.every((p) => p.installed === true));
});

test("queryEcosystemItems：未安装任何插件时搜索安全返回空数组，零副作用", async () => {
    const emptyHost = {};
    const items = await queryEcosystemItems("打卡", emptyHost);
    assert.deepStrictEqual(items, []);

    const items2 = await queryEcosystemItems("张三", emptyHost);
    assert.deepStrictEqual(items2, []);
});

test("queryEcosystemItems：小驴打卡联动（自动生成今日打卡状态条目）", async () => {
    const mockHost = {
        siyuanCheckin: {
            getItems: () => [
                {id: "habit-1", name: "早起晨跑", archived: false},
                {id: "habit-2", name: "阅读30分钟", archived: false},
                {id: "habit-3", name: "旧习惯", archived: true},
            ],
        },
    };

    const hits = await queryEcosystemItems("打卡", mockHost);
    assert.strictEqual(hits.length, 1);
    assert.ok(hits[0].title.includes("今日打卡清单"));
    assert.ok(hits[0].title.includes("2项"));
    assert.ok(hits[0].payload.includes("早起晨跑"));
    assert.ok(hits[0].payload.includes("阅读30分钟"));
    assert.ok(!hits[0].payload.includes("旧习惯"));
    assert.strictEqual(hits[0].providerName, "小驴打卡");
});

test("queryEcosystemItems：小驴人脉联动（自动生成联系人名片条目）", async () => {
    const mockHost = {
        LvContacts: {
            searchPeople: async (q) => {
                if (q === "张三") {
                    return [
                        {
                            id: "person-1",
                            name: "张三",
                            organization: "驴友科技",
                            role: "技术总监",
                            phone: "13800138000",
                            wechat: "zhangsan_tech",
                            email: "zhangsan@example.com",
                        },
                    ];
                }
                return [];
            },
        },
    };

    const hits = await queryEcosystemItems("张三", mockHost);
    assert.strictEqual(hits.length, 1);
    assert.strictEqual(hits[0].title, "小驴人脉 · 张三 (技术总监)");
    assert.ok(hits[0].payload.includes("联系人**：张三"));
    assert.ok(hits[0].payload.includes("驴友科技"));
    assert.ok(hits[0].payload.includes("13800138000"));
    assert.strictEqual(hits[0].providerName, "小驴人脉");
});

test("queryEcosystemItems：异常隔离防御（外部插件报错不影响主流程）", async () => {
    const brokenHost = {
        siyuanCheckin: {
            getItems: () => {
                throw new Error("Checkin internal crash");
            },
        },
        LvContacts: {
            searchPeople: async () => {
                throw new Error("Contacts network error");
            },
        },
    };

    // 应该吞下错误并返回空，绝不抛出异常
    const hits = await queryEcosystemItems("打卡", brokenHost);
    assert.deepStrictEqual(hits, []);
});

test("生态占位符：{{xlc:checkin:today}} 宏解析与优雅降级", async () => {
    const { ActionExecutor } = commands;
    const { LibraryService } = library;

    const mockLib = new LibraryService({ request: async () => null });
    const mockHost = {
        isMobile: () => false,
        hasActiveEditor: () => true,
    };
    const placeholders = {
        enabled: () => true,
        now: () => Date.now(),
        currentDoc: async () => null,
    };

    const executor = new ActionExecutor(mockLib, mockHost, () => {}, undefined, placeholders);

    // 1. 无打卡插件时：优雅降级为提示文本
    global.window = {};
    const out1 = await executor.renderForInsert("状态：{{xlc:checkin:today}}已就绪");
    assert.strictEqual(out1, "状态：（未检测到小驴打卡）已就绪");

    // 2. 有打卡插件时：解析出今日打卡项
    global.window = {
        siyuanCheckin: {
            getItems: () => [
                {id: "1", name: "读书", archived: false},
                {id: "2", name: "健身", archived: false},
            ],
        },
    };
    const out2 = await executor.renderForInsert("状态：\n{{xlc:checkin:today}}");
    assert.strictEqual(out2, "状态：\n✓ 读书\n✓ 健身");

    // 清理全局
    delete global.window;
});
