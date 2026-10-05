# 小驴常用开发路线

> 定位：基于思源文档和块的常用内容快速调用器（参考 Quicker「常用语」，深度融合思源）。条目锚定真实思源块，来源可回链、失效可见；不复制正文进私有库。
> 精准定位与功能-效果总表：[docs/positioning.md](docs/positioning.md)。UI 质感基准：[docs/design/prototype.html](docs/design/prototype.html)（生产渲染证据 docs/design/production-*.png）。
> 状态：v0.1.0 开发中。当期账本：[docs/dev-plan-2026-10-06.md](docs/dev-plan-2026-10-06.md)。

## R2：AI 融入与原型质感（2026-10-06，用户指令立项）

- [x] AI 服务（宿主模型，插件零密钥）：整理建议/草稿生成/调用时变换/语义找条目（ADR 0005）
- [x] AI 硬边界：默认关（门禁+负向验证）、正文出域双开关、仅元数据语义找、原文不可变、诚实失败
- [x] 界面接线：捕获表单 ✦AI 整理/草稿、搜索 ? 语义找、动作菜单 ✦变换（预览三选）、设置开关区
- [x] 原型图四屏×双主题（搜索弹窗/动作菜单/捕获表单/移动 sheet）+ 截图渲染
- [x] 生产 UI 升级到原型质感：双栏预览、类型彩色徽标、筛选 chips、来源失效横幅、底部 sheet
- [x] 生产效果证据：真实 dist CSS+DOM 渲染截图（docs/design/production-desktop-light/dark.png）
- [ ] 真实思源 AI 端到端（依赖 B-001 令牌：宿主配置模型后全链路）
- [ ] AI 标签体检（P5 后）

## 不可回退的约束

1. 思源文档、块和资源是正文与结构的唯一来源；插件不偷偷复制完整正文进私有库。
2. 每个条目保留稳定来源引用（sourceDocId / sourceBlockId / itemType / 逻辑 ID）。
3. 标题、别名、标签、分类走用户可见的块属性（`custom-xlc-*`）；侧车只存收藏/最近/排序/UI 偏好/provider 注册，且版本化、可重建、可迁移。
4. 搜索缓存可丢弃、可重建、有上限；不把缓存当真源。
5. 来源删除、移动、冲突、资源缺失 → 显示「来源失效」，不静默消失。
6. 不使用 `/api/query/sql` 或任意 SQL 作为核心依赖；遍历用 `getChildBlocks` 等结构化官方 API。
7. 外部文本一律按文本节点渲染，不注入 HTML；远程 URL 只作链接处理。
8. 所有写入/删除/导入/批量操作有明确回执；失败、超时、来源失效可见且可恢复。
9. 独立运行，不依赖小驴雷切；联动只走 `xiaolv-common/v1` 公开协议。
10. 能力未验证就诚实降级（如「复制/打开来源可用，直接插入待验证」）。

## P1 宿主合同和架构（进行中）

- [x] 阅读思源源码（app/src/plugin、kernel/api/router.go）与 siyuan@1.2.8 类型，确认 API 面
- [x] 验证 `getActiveEditor()` 官方导出、`protyle.insert(html, isBlock, useProtyleRange)`、`openTab({doc/asset})`（类型契约级；真实行为待 B-001）
- [x] 确认端点清单（结构自上游 kernel/api/router.go）：getChildBlocks / getBlockKramdown / getBlockAttrs / setBlockAttrs / insertBlock / updateBlock / deleteBlock / checkBlocksExist / createDocWithMd / listDocsByPath / lsNotebooks / exportMdContent
- [x] 真实内核只读探测（3.8.6 版本可达；完整读写 E2E 因实例令牌未授权记 B-001）
- [x] 数据模型 / 协议模型（xiaolv-common/v1）/ 迁移模型落码
- [x] 能力矩阵与降级路径记录（docs/host-contract.md）

## P2 核心内容库

- [x] 首次运行引导：选择/创建库（根文档 / 文档树 / 笔记本），创建前明确提示
- [x] 条目 CRUD（新建/编辑/删除/恢复来源/收藏置顶/最近/排序/标签/分类/别名/来源回链）
- [x] 来源失效检测（块/文档/资源三态）
- [x] 可重建索引（有界、可丢弃缓存）

## P3 搜索和调用

- [x] 实时搜索（标题/正文摘要/别名/标签/分类/类型/中文关键词）
- [x] 拼音适配层（可替换接口 + 默认实现；拼音库后置）
- [x] 类型/标签筛选、预览、复制、插入、打开来源
- [x] 键盘导航（↑↓/Enter/Esc/搜索框首焦点/快捷复制）

## P4 媒体和块结构

- [x] 代码块（保留语言）、图片块、附件块
- [x] 列表/引用/任务等结构（superblock 包装、插入剥壳）
- [x] 块引用（`((id 'text'))`）与嵌入（宿主原生语法，ID 严格校验）明确分派
- [x] 资源失效处理（assets 路径检查 + 诚实失败）

## P5 导入导出与联动

- [x] JSON 导入导出 v1（版本号/导入前校验/重复项处理/冲突策略/失败可恢复/不覆盖原始数据）
- [x] `xiaolv-common/v1` 服务接口（getCapabilities/search/get/save/update/remove/insert/copy/openSource/reindex/getRecent/getFavorites）
- [x] 命令 ID 与事件协议（xiaolv.common.* / xiaolv:common:*）
- [x] provider 注册表（其他小驴插件注册内容源；卸载安全、重载恢复）
- [ ] Markdown + 资源引用导出（后置，待 P5 验收后评估）

## P6 验证和交付

- [x] 自动化测试（数据模型/迁移/搜索/拼音/筛选/失效/插入分派/导入冲突/导出恢复/协议协商/provider 生命周期/移动端降级/非法输入/坏引用/未知字段）
- [x] 门禁负向验证（注入违规确认失败，恢复源码复验）
- [ ] 桌面真实思源验收（B-001：需要用户授权的内核令牌/会话）
- [ ] Android 真机验收（B-002，后置于桌面验收）
- [x] README、协议文档、安装升级备份恢复说明、已知限制、验收记录

## R5：拼音接入与性能/树模式（2026-10-06，持续开发指令）

- [x] 拼音搜索：tiny-pinyin@1.3.2（MIT）接入适配层，条目侧注解 + 设置开关（默认开；noop 零开销门禁+负向验证）——ADR 0004/R5 修订
- [x] 性能基准：2000 条注解索引搜索 best-of-3 < 50ms 门禁进套件
- [x] tree 模式 BFS 多层展开（root+3 层子文档，200 文档上限，超出如实报错）
- [ ] 真实宿主下拼音与树模式行为核对（随 B-001）

## 暂缓与明确不做

- 密码管理、剪贴板历史管理、云同步、任意应用自动发送、任意 JS/SQL 执行器
- 雷切第二切换器、片段实验室 CSS/JS 管理
- 全文索引大库优化（等真实库规模反馈）
