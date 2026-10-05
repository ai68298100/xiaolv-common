/*
 * 小驴常用 · 提供方演示脚本（无需构建插件，控制台即贴即测）
 *
 * 用途：在思源桌面端按 Ctrl+Shift+I 打开开发者工具，把本文件全文粘贴到 Console 回车，
 * 即注册一个「控制台演示」内容提供方；然后打开小驴常用搜索「会议」即可看到提供方分区。
 * 刷新页面后自动失效（提供方运行时不持久化——这是协议设计，不是 bug）。
 *
 * 协议：xiaolv-common/v1（详见仓库 docs/provider-guide.md）
 */
(async () => {
    "use strict";
    const common = (window.siyuan && Array.isArray(window.siyuan.plugins))
        ? window.siyuan.plugins.find((p) => p && p.name === "xiaolv-common")
        : null;
    if (!common) {
        console.warn("[xiaolv-demo] 未找到已启用的小驴常用插件（设置→集市→下载 中启用后重试）");
        return;
    }
    const result = common.registerProvider(
        {
            protocol: "xiaolv-common",
            protocolVersion: 1,
            pluginId: "console-demo",
            displayName: "控制台演示",
            provides: ["text"],
        },
        {
            search: async (query) => {
                const all = [
                    {title: "演示：会议纪要开头", payload: "时间：__ \n地点：__ \n与会人：__"},
                    {title: "演示：下周计划", payload: "下周计划：\n1. __\n2. __"},
                ];
                const q = String(query || "").trim();
                return q ? all.filter((i) => i.title.includes(q) || q.length <= 1) : all;
            },
        },
    );
    console.log("[xiaolv-demo] registerProvider →", result.ok ? "成功 ✅（打开搜索输入「会议」查看提供方分区）" : `失败：${result.message}`);
})();
