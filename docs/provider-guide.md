# 小驴常用 · 内容提供方（Provider）接入指南 — xiaolv-common/v1

其他小驴系列插件（小驴打卡、小驴雷切、小驴闪卡……）可以把自家内容注册为「常用条目」的提供方，也可以直接调用小驴常用的搜索/插入/复制能力。本文给出最小接入示例。

## 原则

- 小驴常用**独立运行**，不依赖任何小驴插件；接入是可选的双向增强。
- 协议版本：`protocol: "xiaolv-common"`，`protocolVersion: 1`。未知字段保留透传；未知能力忽略；**更高主版本直接拒绝**（fail-fast，不静默降级）。
- 不把函数回调写进持久化数据：provider 的持久化记录只含标量（pluginId/displayName/protocolVersion/registeredAt）；运行时行为（runtime.search）每次重载后由 provider 重新注册。
- provider 卸载：小驴常用保留注册记录、条目标记「提供方不可用」，不删除任何数据；重载后 provider 重新 register 即恢复。

## 消费小驴常用的服务（如：打卡插件想把「今日状态」插入笔记）

```ts
import type {Plugin} from "siyuan";

function getCommon(plugin: Plugin): any | null {
    // 官方途径：从 app.plugins 找插件实例（不碰内部 DOM / 私有变量 / 文件路径）
    return (plugin.app as any).plugins?.find((p: any) => p.name === "xiaolv-common") ?? null;
}

// 搜索
const common = getCommon(yourPlugin);
if (common) {
    const result = await common.service.search({text: "道歉", itemType: "", tag: "", scope: "all"});
    if (result.ok) {
        for (const ref of result.data) {
            // ref: {id, itemType, title}
        }
    }
}

// 插入 / 复制 / 打开来源（不抛异常，全部 ActionResult）
await common.service.insert(ref.id, {mode: "insert"}); // insert|copy|copy-content|insert-ref|insert-embed|open
await common.service.copy(ref.id);
await common.service.openSource(ref.id);

// 能力协商（接入前先问）
const caps = common.getCapabilities();
const insertCap = caps.find((c) => c.name === "insert");
if (insertCap && !insertCap.mobileSafe) {
    // 移动端不要调 insert（会自动降级为复制并明示）
}

// 稳定命令 ID（等价于上面的动作）
await common.protocolCommands["xiaolv.common.open"]();
await common.protocolCommands["xiaolv.common.insert"]({itemId: ref.id, mode: "insert"});
```

## 注册为内容提供方（如：雷切想把页签/文档集暴露为可插入内容）

```ts
const common = getCommon(yourPlugin);
common?.registerProvider(
    {
        protocol: "xiaolv-common",
        protocolVersion: 1,
        pluginId: "xiaolv-speed-switch",   // 你的插件 name（唯一）
        displayName: "小驴雷切",
        // provides: ["url", "blockref"],  // 可选：声明可提供的条目类型
        anyFutureField: true,               // 未知字段：小驴常用会保留透传并忽略
    },
    {
        // 运行时能力（可选）：按描述返回候选（title + payload），不落库、不复制正文
        search: async (query: string) => [
            {title: "当前工作台", payload: "siyuan://workspace"},
        ],
    },
);

// 卸载/停用时（可选；不调用也只是标记不可用）
common?.unregisterProvider("xiaolv-speed-switch");
```

## 生命周期语义

| 事件 | 行为 |
| --- | --- |
| provider 注册 | 校验协议（主版本 > 1 拒绝）→ 记录标量 → 侧车持久化 → 事件回执 |
| 小驴常用重载 | 从侧车恢复记录（无 runtime）；provider 需在自身 onload 重新 register 才可执行 |
| provider 插件卸载 | 记录保留，相关条目显示「提供方不可用」，不删数据 |
| 小驴常用卸载 | 不动任何库文档/块属性；侧车由宿主清理；provider 侧无需清理 |

## 事件（window CustomEvent）

小驴常用在条目生命周期派发（`detail` 携带 `protocolVersion: 1`）：

- `xiaolv:common:item-created` / `item-updated` / `item-deleted` / `item-inserted`（后者 detail 另含 `insertMode`）

```ts
window.addEventListener("xiaolv:common:item-inserted", (e) => {
    const detail = (e as CustomEvent).detail;
    // detail: {protocolVersion, itemId, itemType, insertMode}
});
```

## 版本兼容承诺（v1）

- 只增量加字段，不改已有字段语义；新增能力在 `getCapabilities()` 声明，消费方按 name 取用、未知项忽略。
- v2 出现时：v1 接口保持可用至少一个大版本；`protocolVersion: 2` 的 provider 向 v1 消费方注册会被拒绝并收到 `protocol-mismatch`（这是预期行为，不是 bug）。
