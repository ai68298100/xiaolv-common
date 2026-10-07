# 提供方示例插件（provider-example）

向「小驴常用」注册内容提供方的**最小可复制示例**。把 `index.ts` 的模式复制到你自己的插件即可完成接入；协议细节见小驴常用仓库的 [docs/provider-guide.md](../../docs/provider-guide.md)。

## 快速开始

1. 复制 `index.ts` 与 `plugin.json` 到你的插件工程（或直接把 `onload` 里的注册代码搬进去）。
2. `pluginId` 改为你的插件 name（全局唯一）。
3. `runtime.search(query)` 返回候选数组 `{title, payload}`——保持轻量、自己缓存；payload ≤ 100k 字符、≤ 20 条。
4. 重新构建并启用两个插件，小驴常用设置面板「提供方内容」区会出现你的提供方。

## 原生 JS 版本

若无构建步骤，把 `index.ts` 改写为等价 `index.js`（去掉类型标注与 import/export，挂到 `window` 或模块导出均可）——SiYuan 加载器只要求默认导出兼容对象。

## 协议要点（v1）

- `registerProvider(descriptor, runtime?)`：主版本 > 1 会被拒绝；未知字段保留透传。
- `runtime.search` 每次刷新都会被调用（输入防抖 200ms 后）——保持轻量。
- 单条 payload ≤ 100,000 字符；≤ 20 条/提供方；超限整条拒绝。
- 卸载/停用：调用 `common.unregisterProvider(pluginId)`（不调用也安全——条目标记不可用，不删数据）。

## payload 支持的动态占位符

payload 中的以下变量在**插入/复制时**由小驴常用自动替换（可在 payload 里直接写）：

| 变量 | 展开值 |
| --- | --- |
| `{{xlc:date}}` / `{{xlc:time}}` / `{{xlc:datetime}}` / `{{xlc:weekday}}` | 当前日期/时间/日期时间/星期 |
| `{{xlc:title}}` / `{{xlc:doc}}` / `{{xlc:path}}` | 当前文档标题/文档名/完整路径 |
| `{{xlc:clipboard}}` | 剪贴板文本 |

**不支持的变量**（仅限库条目）：`{{xlc:ask:…}}`（需用户交互）、`{{xlc:cursor}}`、`{{xlc:snippet:…}}`（需库索引查找）。
