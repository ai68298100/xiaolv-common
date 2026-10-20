# ADR 0079：设置面板健康体检中心卡片与交互呈现 (G26 UI 呈现) 契约

## 状态

已接受，T-0138 / R285（2026-10-20，对标 PhraseExpress Macro Checker / VSCode 问题面板，落地 G26 UI）。

## 背景与上下文

在 T-0137 / R284 中，小驴常用构建了零副作用的纯函数诊断引擎 `diagnoseLibraryHealth`，具备检测嵌套片段成环、缺失依赖、未闭合或损坏占位符、非法 URL 协议与 B-006 多块受限结构的能力。
为了让用户直观掌控个人常用内容库的健康状态，需要在插件设置面板（Settings Dialog）提供可操作的交互式卡片界面：
1. **一键体检**：提供「一键全面体检」触发按钮，展示忙态与实时进度；
2. **可视化健康摘要**：呈现扫描总数、健康条目占比（如 `健康度 100% · 0 处异常` 或 `发现 1 处死循环 · 2 项警告`）；
3. **分级问题明细卡片**：展开展示异常条目清单，区分红色错误（`error`）与黄色警告（`warning`），展示清晰问题描述与建议说明；
4. **无障碍与稳定控件映射**：赋予语义属性与稳定的 `data-xlc-control` 属性，中英多语言严格对齐。

## 决策

1. **设置面板体检卡片 (`src/ui/settings-dialog.ts`)**：
   - 在数据治理/维护区域增设「条目健康体检中心」卡片（`.xlc-health-card`）；
   - 稳定控件 ID：
     - `settings.health.run`：一键体检按钮；
     - `settings.health.summary`：健康度汇总结果槽；
     - `settings.health.list`：问题条目明细展开容器；
2. **异步体检与安全挂载**：
   - 点击时置为忙态并更新 `aria-busy="true"`；
   - 异步从 `library.ensureIndex()` 获取条目元数据，并通过 `library.getItemKramdown` 现场提取条目正文；
   - 构造 `HealthDoctorItem[]` 并交由 `diagnoseLibraryHealth` 纯函数诊断；
   - 纯 DOM 安全构建（所有标题、描述与明细均走 `document.createTextNode` 挂载，坚守 XSS 免疫红线）；
3. **i18n 多语言对齐**：
   - `src/i18n/zh-CN.json` 与 `src/i18n/en.json` 严格对齐新增键（`healthTitle`、`healthDesc`、`healthRun`、`healthScanning`、`healthHealthy`、`healthIssuesFound` 等）。

## 结果与证据

- 单元测试与 UI 冒烟测试覆盖体检卡片渲染、一键运行结果反馈与明细展开；
- 严格负向验证与全门禁全绿通过。
