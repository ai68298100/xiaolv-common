# ADR 0093：全功能矩阵深度体验升级 (Cross-Feature Usability and Fidelity Enhancements)

## 状态
已接受，T-0157 / R292（2026-10-21，用户指令立项：各核心功能深度优化）。

## 背景与上下文
在前几轮中，我们重塑了设计系统与便当盒数据看板。用户提出“每个功能都需要优化”，我们系统性地审查了小驴常用的五大核心业务支柱：
1. **变量与模板填参 (Variables)**：用户在填参卡片面对下拉或预设选项时，原有隐藏 datalist 交互繁重，缺乏直接点选填入的快捷能力；
2. **数据同步与合并比对 (Sync Diff)**：比对模态框包含大量差异条目时，统计卡片不可交互，用户难以快速隔离关注冲突项；
3. **条目新建与捕获 (Capture & Ingest)**：粘贴内容时类型下拉框保持原样，用户需手动翻选代码或外链类型；
4. **跨应用富文本剪贴板 (Clipboard Export)**：向微信、Word、Outlook 复制带有待办复选框的任务清单或代码块时，格式与属性可能丢失或呈现不佳；
5. **全域搜索与条目认知 (Search & Quick Look)**：列表行缺乏对条目是否含有动态变量的直观标识。

## 决策

### 1. 变量填参快捷选项胶囊行 (`.xlc-varform-quick-options`)
- 在 `src/ui/variable-form.ts`，为包含 `options` 或默认值的字段直接在输入框下方生成快速点选胶囊行；
- 点击任意选项胶囊即刻完成填充，并自动触发事件联动更新实时展开预览。

### 2. 同步比对统计卡片升级为交互式五态筛选标签
- 在 `src/ui/sync-diff-modal.ts`，赋予 5 个比对卡片点击交互能力（`data-status` 与 `.xlc-summary-card--active`）；
- 点击“冲突待解”卡片瞬间过滤表格仅展示冲突行；再次点击或点击“总计对比”还原全局视图；
- 支持 `getStatusFilter` / `setStatusFilter` API。

### 3. 新建常用语正文智能侦测输入结构
- 在 `src/ui/capture.ts`，监听正文输入：
  - 若用户未手动指定类型，自动检测输入内容是否为外链 URL、代码围栏（```）、或 Markdown 并自动切换下拉菜单；
  - 若标题为空，自动提取首行作为推荐标题占位符。

### 4. 富文本剪贴板任务列表高保真渲染
- 在 `src/model/clipboard.ts` 的 `renderSafeHtmlFromMarkdown` 中：
  - 支持将 `- [ ]` 和 `- [x]` 转换为跨邮件/Word/微信兼容的原生复选框样式；
  - 自动清洗 Kramdown 专属属性标记 `{:.class}`，防止排版噪音溢出到外部窗口。

### 5. 搜索列表与极速预览变量徽标强化
- 在 `src/ui/dialog.ts`，若条目 `varCount > 0`，列表标题旁直观展示 `{x} 变量` 动态胶囊徽标；
- 在 Quick Look 预览卡片元数据中清晰呈现变量数量与别名。

## 结果与证据
- 单元测试增至 716/716 项全数通过；
- 契约测试覆盖剪贴板任务列表复选框转换、Kramdown IAL 清洗与同步比对状态筛选器；
- 全套工程门禁（check, scan, check:errors, check:package, build）全数通过。
