# ADR 0075：光标选区包裹模式与 {{xlc:selection}} 占位符 (G23) 契约

## 状态

已接受，T-0134 / R281（2026-10-20，对标 VSCode Surround With / Raycast Snippets 选区嵌入能力，落地 G23）。

## 背景与上下文

小驴常用支持 `{{xlc:clipboard}}`（剪贴板内容注入），但在日常高频写作与研发场景中：
1. **痛点**：用户在思源编辑器中已经用光标选好了一段文本（例如几行代码、一段引文、一段要翻译的段落），希望直接呼出常用语面板，选择一个条目将该段选中文本“包裹”进预设结构中（如代码围栏、引用块、Callout 提示框、翻译 Prompt 等）；
2. **现有局限**：如果仅支持剪贴板，用户必须先手动按 `Ctrl+C` 复制选区，再呼出面板插入，容易覆盖剪贴板原有内容且步骤繁琐；
3. **行业对标**：VSCode 核心标配 "Surround With..."、Raycast Snippets 原生支持 `{selection}` 占位符、TextExpander 支持 `%clipboard` 与选区融合。

## 决策

1. **语法定义与占位符体系 (`src/model/placeholders.ts`)**：
   - 占位符语法：`{{xlc:selection}}`；
   - 支持回退参数：`{{xlc:selection|默认内容}}`（当光标处无有效选区时采用默认内容；若无参数且无选区，则安全替换为空串，与 `title`/`path` 保持一致，绝不将模板字符残留在正文中）；
   - `PlaceholderKind` 扩展加入 `"selection"`，正则 `PLACEHOLDER_PATTERN` 同步扩充。
2. **宿主执行层选区捕获 (`src/service/commands.ts` & `src/index.ts`)**：
   - `IPlaceholderHook` 增加 `selection?(): Promise<string> | string`；
   - 插入与复制时，优先从活动 Protyle 编辑器读取 `window.getSelection()?.toString()`；
   - Protyle 插入行为：插入内容将自然替换当前编辑器的选区范围，实现顺滑“选区包裹”。
3. **安全与降级边界**：
   - 纯文本流转，绝不注入未转义 HTML；
   - 选区长度严格限制在 4000 字符内，防止异常长选区导致编辑器假死；
   - 代码类型条目（`itemType === "code"`）字面保留，不展开占位符（与既有原则一致）。

## 结果与证据

- 单元测试增设选区占位符专属套件，覆盖有选区展开、带参数默认回退、无选区空串降级以及代码条目字面保留；
- 严格负向验证与全套工程门禁全数通过。
