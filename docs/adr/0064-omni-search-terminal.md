# ADR 0064：全域内容搜索终端 (Omni-Search Terminal · G12) 契约

## 状态

已接受，T-0123 / R270（2026-10-19，用户提议立项，将小驴常用提升为搜索终端）。

## 背景与上下文

在常用语资产沉淀中，用户的真实场景常常超出小驴常用语库本身：
- 临时写作时，希望直接搜索当前打开文档中的内容块；
- 团队沟通中，希望检索全库思源笔记寻找历史答复或参考材料；
- 一键将任意笔记内容收录到常用语库以备未来复用。

此前小驴常用只能检索用户沉淀的常用语条目，与思源笔记的核心搜索能力存在割裂；用户若常用语库无匹配，只能切换到其他窗口或工具完成检索，丧失搜索终端的统一性。

## 决策

1. **官方结构化端点 100% 复用（Zero SQL Compliance）**：
   - 在 `src/service/omni-search.ts` 导出 `searchCurrentDocumentBlocks`、`searchAllNotesDocuments` 与 `OmniSearchService`；
   - 仅走官方端点 `getChildBlocks` + `getBlockKramdowns`（当前文档）与 `searchDocs`（全库文档），绝不依赖 `/api/query/sql`；
   - 严格遵守思源 1.2.9 类型契约与端点白名单。
2. **AND 严格语义与权重排序**：
   - 纯函数 `scoreAndFilterBlocks` 复用 `splitSearchTokens` 多维标点切词，按标题命中 +20 分、摘要命中 +10 分、正文命中 +5 分加权；
   - 任意一个 token 未命中即整块拒绝（AND 严格语义），杜绝模糊噪声。
3. **终端级 UI 范围 chip 切换**：
   - 在 `src/ui/dialog.ts` 顶部筛选行新增 `当前文档` 与 `全库笔记` 两个 chip，与 `收藏/最近` 互斥；
   - 范围切换时 `searchCurrentDoc` / `searchAllNotes` 服务自动调度对应端点；
   - 空结果状态自动展示「在当前文档中检索「%s」」与「在全库笔记中检索「%s」」终端级直达按钮，无缝降级。
4. **就地预览与一键收录**：
   - 全域搜索结果通过 `xlc-omni-<blockId>` 虚拟 ID 复用 SearchEntry 模型；
   - 预览窗格保留高亮渲染、复制与插入原有动作；
   - 新增 `save-omni` 按钮在当前文档/全库范围下浮现，用户可一键将任意笔记块或文档收录为常用语（写时按 B-006 防御处理）。
5. **数据真源与隐私守卫**：
   - 全域结果不进入 SearchPrefs 收藏、最近、常用计数侧车，避免污染原索引；
   - AI 语义找仍受限于 metadata-only 出域（即使在 omnidoc 范围），绝不出域给 AI。

## 结果与证据

- 单元测试增至 582/582 全部通过；
- 专项测试 `tests/r270-omni-search.test.cjs` 包含 5 项用例，覆盖 AND 多关键词命中、空关键词短路、标题权重排序、AND 严格性、空块内容跳过；
- 全套工程门禁 `check:errors`、`check`、`build`（510 KiB zip 产物）、`test:ui`、`test:ix`（74/74）、`scan`、`check:package` 全数通过。
