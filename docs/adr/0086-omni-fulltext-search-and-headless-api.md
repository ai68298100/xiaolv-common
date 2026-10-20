# ADR 0086：全库思源块全文检索融合与 Headless 纯求值 API 契约

## 状态
已接受，T-0146~T-0148 / R292（2026-10-21，用户指令立项：搜索融合与外部 Quicker 联动准备）。

## 背景与上下文
在用户日常知识调用和资产复用场景中，存在两大核心诉求：
1. **搜索能力一体化**：不仅能在常用库中检索常用语，还能一站式、零割裂地检索“思源全库的真实内容块”（段落、代码块、列表、标题等），并支持“直接复用、用完即收”；
2. **全局跨应用准备**：为了实现未来在微信、Word、浏览器、QQ 等任意外部界面直接呼出小驴常用并喷射内容（如配合 Quicker 动作），插件侧必须提供无需依赖思源界面弹窗的 Headless 纯数据查询与变量求值展开接口。

## 决策

### 1. 全库思源块检索（Zero-SQL 与官方 FTS 契约）
- 将官方端点 `fullTextSearchBlock: "/api/search/fullTextSearchBlock"` 登记进 `src/kernel/client.ts` 白名单，严格使用 `method: 0` 纯关键词匹配，坚守不依赖任意 SQL 的核心红线；
- 在 `src/service/omni-search.ts` 实现 `cleanSearchHighlight`（清洗 `<mark>` 高亮标签并还原 HTML 实体）；
- 实现 `blockHitToSearchEntry`，将官方块结构结构化映射为小驴常用 `SearchEntry`，赋予类型推断与 `isOmni: true` 标记；
- 实现 `searchAllNotesUnified`，并发调度块检索与文档检索，内容块结果优先呈现。

### 2. 搜索界面双轨级联与一键收录闭环
- 在 `src/ui/dialog.ts` 支持输入前缀穿透语法：输入以 `@`、`/` 或 `sy:` 开头时，自动切换为 `all-notes` 全库搜索模式；
- 在常用库无结果时，按下 `Tab` 键秒级穿透至全库检索；
- 为全库结果赋予醒目的 `xlc-badge--omni` 徽标；
- 键盘交互加固：选中全域结果时按 `Alt+S` 或 `Ctrl+Shift+S` 直接触发 `createFromOmni` 一键收录为常用语资产。

### 3. Headless 纯数据与变量展开求值 API（为 Quicker 铺路）
- 在 `XiaolvCommonService` 与 `external-bridge.ts` 暴露 `resolve(itemId, fills?)`；
- 内部自动展开嵌套片段 `{{xlc:snippet:...}}`，填入 `fills` 或默认值，计算动态日期、时间、UUID、算术表达式与命名范式；
- 结构化输出条目中含有的所有动态变量列表（变量名、类型、下拉选项、默认值），供外部调用工具无思源界面直接收集与填参；
- 在 `src/index.ts` 的 `protocolCommands` 中注册 `xiaolv.common.search`、`xiaolv.common.get`、`xiaolv.common.resolve`、`xiaolv.common.recent` 与 `xiaolv.common.favorites`，全面对齐外部自动化脚本与 Quicker 动作的调用协议。

## 结果与证据
- 单元测试增至 698/698 全部通过；
- 经过严格负向验证，写方法隔离门禁持续生效，`resolve` 保持只读求值无副作用；
- 全库块检索、标签清洗与变量 Headless 求值契约完备通过。
