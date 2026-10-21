# ADR 0089：全库块类型语法限定、别名智能推导与全域变量填参闭环 (Omni Type Filter & Smart Alias Capture)

## 状态
已接受，T-0153 / R292（2026-10-21，用户指令立项：搜索与 UI 持续深度优化）。

## 背景与上下文
在用户深度检索思源全库笔记与常用语沉淀流程中，存在三个高频痛点：
1. **跨类型无差别召回噪音**：全库检索时，用户有时只想搜索代码块（例如某种算法实现）或只想搜大纲标题，以往全部块混在一起增加了翻找成本；
2. **收录后别名空白导致无法极速直达**：全库块一键收录（`Alt+S`）后默认无别名，用户后续若想通过别名 (+400分) 秒级调用，需要二次手动编辑；
3. **全库笔记模板插入时无法交互填参**：用户历史笔记中如果包含 `{{xlc:ask:...}}` 变量模板，在全库检索出后直接插入会丢失填参卡片交互。

## 决策

### 1. 块类型精准限定语法 (`type:code` / `type:h` / `type:quote`)
- 扩展 `src/service/omni-search.ts` 的 `parseOmniQueryScope`；
- 识别 `type:code`（或 `type:c`/`type:代码`）、`type:heading`（或 `type:h`/`type:标题`）、`type:quote`（或 `type:b`/`type:引述`）、`type:math`（公式）、`type:table`（表格）、`type:list`（列表）等；
- 提取并传参给思源官方 `/api/search/fullTextSearchBlock` 的原生 `types: Record<string, boolean>`，实现全库指定块类型的秒级穿透检索。

### 2. 一键收录自动智能推导拼音缩写别名 (`Smart Alias Derivation`)
- 在 `deriveOmniItemMetadata` 扩展 `recommendedAlias` 算法；
- 中文标题自动调用拼音适配器提取首字母缩写（例如 `接口鉴权方案` -> `jkjqfa`）；英文标题自动提取各词首字母（例如 `Quick Start Guide` -> `qsg`）；
- 一键收录与表单收录时自动带入该别名，入库后用户立即享受首字母极速直达。

### 3. 全库笔记模板块直接插入时支持变量填参卡片
- 在 `src/ui/dialog.ts` 的 `insertEntryWithVars` 与 `runActionFor` 深度适配 `entry.isOmni`；
- 若全库块包含 `{{xlc:ask:...}}` 变量，正常触发 `openVariableFillCard` 收集参数；
- 填参完成后由 `expandAsks` 与 `insertProviderPayload` 展开并直接插入光标位置。

### 4. 搜索空状态自愈引导与技巧提示
- 在全库搜索无结果时，动态展示精炼的自愈技巧提示（改用拼音/首字母、`type:code` 搜代码、`type:h` 搜标题、`in:目录` 缩范围）。

## 结果与证据
- 单元测试增至 713/713 项全数通过；
- 契约测试覆盖块类型限定语法、拼音与英文别名推导、时间戳归一与模板变量展开；
- 全套工程门禁（check, scan, check:errors, check:package, build）全数通过。
