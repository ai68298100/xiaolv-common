# ADR 0094：专业级键盘交互、预览保真与 Headless 缺失变量显式契约 (Power Interactions, Preview Fidelity & Missing Variables Contract)

## 状态
已接受，T-0158 / R292（2026-10-21，用户指令立项：各核心功能深度持续优化）。

## 背景与上下文
随着小驴常用被重度使用，高频用户与外部开发者提出了更极致的交互诉求：
1. **多行表单快捷提交 (Power User Shortcut)**：在多行文本框（Textarea）中，回车为自然换行；但用户填写完毕后，往往期望按 `Ctrl+Enter` 或 `Cmd+Enter` 一步提交，而不是拿起鼠标点击“保存”或“插入”；
2. **待办任务列表预览保真 (Task List Preview)**：正文中包含 `- [ ]` / `- [x]` 任务清单时，剪贴板已支持富文本导出，但右侧预览窗格此前仅按普通无序列表渲染，缺乏直观的复选框打勾状态呈现；
3. **录入字数边界感知 (Content Size Feedback)**：受限于内核与单块上限，正文过长时以往只有保存时才弹出报错，用户在输入阶段无法感知已输入字符数；
4. **外部 Quicker 缺失变量探测 (Missing Variables Contract)**：外部工具调用 `resolve` 时，无法确切知道该条目是否还有“未填且无默认值”的必填字段，导致 Quicker 无法智能决定是直接喷射还是弹窗收集。

## 决策

### 1. 全局 `Ctrl+Enter` / `Cmd+Enter` 闪电保存与插入
- 在变量卡片（`src/ui/variable-form.ts`）与条目捕获表单（`src/ui/capture.ts`）根容器监听键盘事件；
- 当捕获到 `Enter` 且包含 `ctrlKey` 或 `metaKey` 时（排除输入法组合态 229），立即触发提交，全面解放双手。

### 2. 详情预览窗格任务列表复选框 (`task-item`) 渲染
- 在 `src/ui/preview-renderer.ts` 的 `parseMarkdownBlocks` 扩充 `task-item` 类型识别；
- 识别 `- [ ]` 与 `- [x]`（包含大小写 X），渲染为带有禁用原生复选框样式的 `.xlc-md-task-item`，已完成项自动附加删除线，与跨端富文本剪贴板输出 100% 视觉保真。

### 3. 录入表单实时字符计数器与超限警示 (`.xlc-form-counter`)
- 在捕获表单正文文本框下方挂载 `.xlc-form-counter`，实时计算已输入字符数（如 `128 / 4000`）；
- 超限时自动切换为醒目警告红色（`.xlc-form-counter--over`），给用户最及时的输入反馈。

### 4. Headless 纯求值接口显式回传 `missingVariables`
- 扩充 `ResolvedItemData`，新增 `missingVariables: string[]`；
- 统计所有未提供 fills 且没有默认值的变量名称；
- Quicker / 自动化脚本通过 `missingVariables.length === 0` 可直接零等待模拟粘贴，非空时则有针对性地调起专属输入框。

### 5. 搜索历史一键清空与管理
- 在 `DialogDeps` 扩展 `clearRecentQueries`，并在搜索历史条末尾增加清空操作（`✕ 清空`），满足用户隐私与历史队列清理需求。

## 结果与证据
- 单元测试增至 717/717 项全数通过；
- 契约测试验证任务列表复选框解析、`missingVariables` 准确定位；
- 全套工程门禁（check, scan, check:errors, check:package, build）全数通过。
