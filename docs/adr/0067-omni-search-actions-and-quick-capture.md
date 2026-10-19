# ADR 0067：全域搜索终端动作闭环、就地快速修改与快捷收录 (G14) 契约

## 状态

已接受，T-0126 / R273（2026-10-20，深化全域内容搜索终端 G12 与闭环 G14）。

## 背景与上下文

在 R270 中，小驴常用确立了「当前文档」与「全库笔记」的 Omni-Search Terminal 检索骨架。但在实际使用链路中存在以下交互与执行断层：
1. **运行时依赖未贯通**：`src/index.ts` 尚未将 `OmniSearchService` 实例化并传入主搜索弹窗依赖；
2. **全域条目动作受阻**：全域条目的虚拟 ID（`xlc-omni-*`）未在条目库中登记，导致直接调用 `preview`、`runAction`、`openSource` 时被 `getItem` 拒绝并报错“未找到条目”；
3. **缺少快捷编辑与就地修改（G14）**：用户在「当前文档」中搜出某个块后，往往希望快速修改该块的文字内容（如临时修正笔误或补充备注），若必须退出搜索弹窗并在长文档中手动翻找，操作流严重受挫；同时收录时缺乏带有预填表单的“编辑并收录”通道。

## 决策

1. **SearchEntry 模型轻量增强**：
   - 在 `src/model/search.ts` 的 `SearchEntry` 增补可选属性 `content?: string;` 与 `isOmni?: boolean;`；
   - `scoreAndFilterBlocks` 与 `searchAllNotesDocuments` 检索命中时直接填充 `content` 与 `isOmni = true`，使前端预览与操作区拥有即时内容上下文，消除不必要的二次网络请求。

2. **全域搜索条目的独立动作闭环**：
   - **零延迟安全预览**：`updatePreview` 识别全域条目时优先读取 `entry.content || entry.summary`，经 `renderSafePreview` 纯文本安全 DOM 渲染，杜绝加载空白与 XSS 风险；
   - **复制与插入闭环**：在全域条目下按复制（或 `Ctrl+Enter`）直接将 `entry.content` 写入剪贴板；按插入（或 `Enter`）直接调用 `insertRaw` 插入活动编辑器或定向目标；
   - **定位来源块/文档**：点击“打开来源”（或动作菜单中的“在文档中定位”），直接分派 `openDoc(sourceDocId, targetBlockId)` 定位至原块或原文档。

3. **就地快速修改当前文档块（G14 · In-Place Quick Edit）**：
   - 在「当前文档」作用域下，条目动作菜单与预览窗格编辑按钮提供「就地修改块内容」入口；
   - 弹出轻量快捷编辑弹窗（`openQuickEditDialog`），提供多行文本框、字符计数与 B-006 写入安全约束校验；
   - 保存时经 `validateOmniBlockUpdate` 严格校验 `bodyWriteRestriction`（防止多行非代码块未经核验写入导致思源块结构损坏）；
   - 校验通过后调用官方结构化端点 `updateBlock({id: blockId, dataType: "markdown", data: newContent})`，更新当前内存条目并即时刷新预览与标题，给出明确 Toast 回执。

4. **双轨收录常用语机制**：
   - **一键极速收录**：保留右下角 `✦ 收录为常用语` 按钮，自动携带块/文档标题、正文、来源文档 ID 与来源块 ID 存入常用库，分类自动归为「文档收集」或「笔记收集」，并带上「全域收录」标签；
   - **编辑并收录**：在动作菜单与快捷键中提供「编辑并收录...」入口，打开 `CaptureDialog` 表单并自动预填内容、标题、类型与来源上下文，允许用户精细调整后再行落库。

5. **全生命周期无缝装配**：
   - 在 `src/index.ts` 实例化 `OmniSearchService` 并接入宿主当前文档定位器；
   - 将 `searchCurrentDoc`、`searchAllNotes`、`createFromOmni`、`captureOmniWithForm`、`editOmniBlock` 完整接入 `SearchDialog` 依赖。

## 结果与证据

- 单元测试增至 590/590 全部通过；
- 新增 `tests/r273-omni-actions.test.cjs` 专项断言，覆盖就地块更新安全校验、B-006 边界拦截、更新执行回执、SearchEntry 内容携带与全域条目动作分派；
- 生产 UI 冒烟测试（80+ 项断言）与 74/74 交互审计全绿通过；
- 全套工程门禁 `check:errors`、`check`、`build`、`test:ui`、`test:ix`、`scan`、`check:package` 全数通过。
