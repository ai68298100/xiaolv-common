// 小驴家族生态轻量探测器与只读桥接适配器（Ecosystem Adapter）
// 零依赖、零侵入、纯只读、渐进增强：
// 1. 若宿主未安装其他插件，本适配器完全不产生任何网络或存储副作用，小驴常用 100% 独立运行；
// 2. 若检测到打卡、人脉、拾遗、雷切等兄弟插件公开窗口桥，自动提供只读条目联动与状态呈现。

export interface SiblingPluginInfo {
    id: string;
    name: string;
    bridgeKey: string;
    installed: boolean;
    description: string;
    capability: string;
}

export interface EcosystemStatus {
    totalChecked: number;
    installedCount: number;
    plugins: SiblingPluginInfo[];
}

/** 探测宿主窗口中已挂载的兄弟插件公开桥 */
export function detectEcosystem(host: any = (typeof window !== "undefined" ? window : {})): EcosystemStatus {
    const plugins: SiblingPluginInfo[] = [
        {
            id: "siyuan-checkin",
            name: "小驴打卡",
            bridgeKey: "window.siyuanCheckin",
            installed: Boolean(host.siyuanCheckin && typeof host.siyuanCheckin.getItems === "function"),
            description: "习惯打卡、时间追踪与连击记录",
            capability: "快速插入今日打卡状态与连击文本",
        },
        {
            id: "siyuan-contacts",
            name: "小驴人脉",
            bridgeKey: "window.LvContacts",
            installed: Boolean((host.LvContacts || host.siyuanContacts) && typeof (host.LvContacts || host.siyuanContacts).searchPeople === "function"),
            description: "人物关系图谱与联系人脉络",
            capability: "检索联系人并一键插入结构化名片块",
        },
        {
            id: "siyuan-glean",
            name: "小驴拾遗",
            bridgeKey: "window.siyuanGlean",
            installed: Boolean((host.siyuanGlean || host.xiaolvGlean) && typeof (host.siyuanGlean || host.xiaolvGlean).listClips === "function"),
            description: "网页文章剪藏与高亮摘录",
            capability: "引用剪藏文章片段与金句高亮",
        },
        {
            id: "siyuan-speed-switch",
            name: "小驴雷切",
            bridgeKey: "window.siyuanSpeedSwitch",
            installed: Boolean(host.siyuanSpeedSwitch || host.xiaolvSpeedSwitch),
            description: "全域工作台快速切换与大纲穿透",
            capability: "通过公开协议在雷切中秒级调用常用语",
        },
    ];

    return {
        totalChecked: plugins.length,
        installedCount: plugins.filter((p) => p.installed).length,
        plugins,
    };
}

/**
 * 安全查询小驴生态兄弟插件的只读条目（打卡概览、人脉名片等）
 * 包含异常隔离，任何单一插件调用失败绝不阻塞主流程。
 */
export async function queryEcosystemItems(
    rawQuery: string,
    host: any = (typeof window !== "undefined" ? window : {}),
): Promise<Array<{title: string; payload: string; providerName: string}>> {
    const q = (rawQuery ?? "").trim().toLowerCase();
    const items: Array<{title: string; payload: string; providerName: string}> = [];

    // 1. 小驴打卡联动
    try {
        const checkin = host.siyuanCheckin;
        if (checkin && typeof checkin.getItems === "function") {
            const rawItems = checkin.getItems();
            if (Array.isArray(rawItems) && rawItems.length > 0) {
                const isCheckinIntent = !q || q.includes("打卡") || q.includes("checkin") || q.includes("今日") || q.includes("习惯");
                if (isCheckinIntent) {
                    const activeItems = rawItems.filter((it: any) => !it.archived);
                    items.push({
                        title: `小驴打卡 · 今日打卡清单 (${activeItems.length}项)`,
                        payload: `【今日打卡】共 ${activeItems.length} 项打卡项目：\n${activeItems.map((it: any) => `- [ ] ${it.name || it.title}`).join("\n")}`,
                        providerName: "小驴打卡",
                    });
                }
            }
        }
    } catch {
        // 静默隔离
    }

    // 2. 小驴人脉联动
    try {
        const contacts = host.LvContacts || host.siyuanContacts;
        if (contacts && typeof contacts.searchPeople === "function" && q.length >= 1) {
            const people = await contacts.searchPeople(q);
            if (Array.isArray(people)) {
                for (const p of people.slice(0, 3)) {
                    const name = p.name || "联系人";
                    const infoLines = [
                        `**联系人**：${name}`,
                        p.organization ? `· 公司/组织：${p.organization}` : "",
                        p.role ? `· 职位：${p.role}` : "",
                        p.phone ? `· 电话：${p.phone}` : "",
                        p.wechat ? `· 微信：${p.wechat}` : "",
                        p.email ? `· 邮箱：${p.email}` : "",
                    ].filter(Boolean);

                    items.push({
                        title: `小驴人脉 · ${name}${p.role ? ` (${p.role})` : ""}`,
                        payload: infoLines.join("\n"),
                        providerName: "小驴人脉",
                    });
                }
            }
        }
    } catch {
        // 静默隔离
    }

    return items;
}
