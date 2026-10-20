# ADR 0082：批量标签追加、移除与分类批量变更引擎 (G30) 契约

## 状态

已接受，T-0142 / R289（2026-10-20，对标 Quicker 动作批量标签管理 / Raycast Batch Tagging，落地 G30）。

## 背景与上下文

当常用内容库规模超过数十条后，用户常需要对一批条目进行批量标签与分类重整（例如：将多个客服条目统一划入「售后/退货」分类，或者批量追加 `#双十一#` 活动标签）：
1. **现有局限**：用户只能逐一点击编辑表单逐个修改保存，重复低效；
2. **数据一致性与锁边界**：批量操作涉及多个思源块属性更新（`custom-xlc-tags` / `custom-xlc-category`），必须串行写入并防止并发冲突；若部分条目被删除或更新失败，必须返回精准的逐项回执，避免静默失败；
3. **标签清洗规范**：批量追加标签需复用 `cleanTagList` 规范，支持中英文逗号分号顿号切分、自动清洗前后井号、自动去重并按上限截断；移除标签需精确比对（不区分大小写，去除首尾空白）。

## 决策

1. **纯函数标签操作模型 (`src/model/batch-ops.ts`)**：
   - `mergeTags(currentTags: string[], toAdd: string[]): string[]`：追加新标签，自动清洗前后井号、自动去重与上限保护（最多 16 个）；
   - `removeTags(currentTags: string[], toRemove: string[]): string[]`：精确移除指定标签（大小写不敏感）；
   - `applyBatchTagCategoryOps(item: CommonItem, op: BatchTagCategoryPatch): {tags: string[]; category?: string; changed: boolean}`：计算更新后属性与变动标记。
2. **服务层串行写锁与批量回执 (`LibraryService.batchUpdateTagsAndCategory`)**：
   - 在 `src/service/library.ts` 实现安全的批处理方法；
   - 逐项持有写锁并调用 `updateItem` 更新属性；
   - 收集每项执行状态，返回 `BatchOperationReceipt`（成功数、跳过数、失败项与错误原因）；
   - 批处理完成后自动使索引失效并触发重构。
3. **主搜索面板多选与批处理工具栏 (`src/ui/dialog.ts`)**：
   - 交互入口：支持按 `Alt + M`（macOS `⌥ + M`）进入/退出多选模式，支持 `Shift+Click` 连选与 `Ctrl/Cmd+Click` 点选；
   - 底部浮现批处理栏 `.xlc-batch-bar`：展示已选数量、`＋ 加标签`、`－ 删标签`、`🏷️ 设分类` 动作；
   - 操作完成后自动清空已选项并刷新列表。

## 结果与证据

- 单元测试覆盖批量追加、批量移除、分类覆写、无变动跳过与异常处理；
- 负向验证与全门禁通过。
