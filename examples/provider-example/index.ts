// xiaolv-provider-example：向小驴常用注册内容提供方的最小可复制示例。
// 用法：把本文件的模式复制到你的插件 onload()；无需构建步骤（原生 JS 亦可，见文末注释）。
//
// 协议：xiaolv-common/v1（docs/provider-guide.md）
// 关键约束：
// - runtime.search 每次刷新都会被调用（输入防抖 200ms 后）——保持轻量、自己缓存
// - 单条 payload ≤ 100,000 字符（超限整条拒绝）；≤ 20 条/提供方
// - 失败会弹通知（每提供方每会话一次）；抛错即通知，return [] 即静默无结果

export default class ProviderExamplePlugin {
    private unregisterFns: Array<() => void> = [];

    async onload(): Promise<void> {
        const common = this.findCommon();
        if (!common) {
            console.warn("[provider-example] 未找到小驴常用（未安装或未启用）——本示例插件仍可独立运行");
            return;
        }
        const result = common.registerProvider(
            {
                protocol: "xiaolv-common",
                protocolVersion: 1,
                pluginId: "provider-example",
                displayName: "提供方示例",
                provides: ["text"],
            },
            {
                // runtime.search：返回候选 {title, payload}
                // payload ≤ 100k 字符；≤ 20 条；插入/复制由小驴常用完成
                search: async (query: string) => {
                    const q = String(query || "").trim();
                    if (!q) return [];
                    return [
                        {title: `示例：${q} 相关条目一`, payload: `（示例内容一，关键词 ${q}）`},
                        {title: `示例：${q} 相关条目二`, payload: "（示例内容二）"},
                    ].filter((i) => i.title.includes(q) || q.length <= 1);
                },
            },
        );
        if (result.ok) {
            this.unregisterFns.push(() => common.unregisterProvider?.("provider-example"));
            console.log("[provider-example] 提供方注册成功");
        }
    }

    private findCommon(): any | null {
        const app = (window as any).siyuan?.ws?.app ?? (window as any).siyuan?.app;
        const plugins = app?.plugins ?? [];
        return plugins.find((p: any) => p?.name === "xiaolv-common") ?? null;
    }

    onunload(): void {
        for (const fn of this.unregisterFns) {
            try { fn(); } catch { /* 忽略 */ }
        }
        this.unregisterFns = [];
    }
}

// 原生 JS 版本（无构建）：class 换 function/对象字面量均可——
// SiYuan 只要求 index.js 导出 default（Plugin 子类或兼容对象），onload 里调
// common.registerProvider(descriptor, runtime) 即可。
