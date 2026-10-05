# 自主开发协议（小驴常用）

- 目标：持续推进方向（`ROADMAP.md`）。
- 每轮：读 `ROADMAP.md`（方向）→ `BLOCKERS.md`（阻塞）→ `docs/adr/`（已有取舍）→ `docs/dev-plan-*.md`（当期账本）→ 选任务 → 计划 → 实现 → 验证 → 更新文件 → 下一个。
- 任务号：T-xxxx 从 0001 起单调递增；当期任务记 `docs/dev-plan-*.md` 与对应 ADR。
- 决策：小歧义自决并记当期账本；非显然取舍写 ADR（`docs/adr/NNNN-*.md`）。
- 提交：不频繁 commit；每阶段/里程碑或 3-5 个相关任务本地 commit 一次。
- 发布政策（2026-10-06 用户指令）：**GitHub 允许推送**（仓库 ai68298100/xiaolv-common，推前须过密钥扫描与全门禁）；**集市（bazaar/plugins.txt）严禁自行推送**——只有用户明确说「可以推送集市」后才可发起上架 PR。
- 阻塞：大阻塞记 `BLOCKERS.md`，能跳过就跳过。
- 停止：只有所有可做任务都阻塞或必须用户决策时才停。
- 汇报：任务ID | 状态 | 证据 | 下一步。
- 门禁：新增或修改任何门禁/契约测试，须做负向验证（注入违规确认它真的失败，再恢复源码复验通过）；只跑"改完仍通过"不构成证据。
- 独立性：不修改「小驴雷切」等兄弟插件生产代码；联动只走 `xiaolv-common/v1` 公开协议（`src/model/protocol.ts`）。
- 诚实性：能力未在真实宿主验证时，产品内显示降级提示，文档记录「尚未验证」，不以测试通过冒充宿主验收。

## 项目上下文

- 思源笔记常用内容复用插件「小驴常用」，本仓库为独立仓库。
- 构建：`pnpm run build` → dist/；类型检查：`pnpm run check`；测试：`pnpm test`。
- 技术栈：TypeScript + webpack + SCSS，`siyuan` 官方 npm 包 1.2.8，Node ≥ 18，node:test 测试。
- 数据真源：思源块。条目 = 库文档中的真实块；元数据走 `custom-xlc-*` 块属性；插件侧车（loadData）只存收藏/最近/UI 偏好/provider 注册。
- 禁止：`/api/query/sql` 及任意 SQL 查询作为核心依赖；私有 DOM 依赖；伪造宿主行为；未经用户批准推送集市。
