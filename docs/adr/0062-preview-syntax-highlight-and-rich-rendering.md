# ADR 0062：详情预览轻量富文本与代码语法安全着色引擎 (G6) 契约

## 状态

已接受，T-0121 / R268（2026-10-19，对标 Raycast / TextExpander 预览体验，落地 G6）。

## 背景与上下文

小驴常用主搜索面板采用桌面双栏设计（左侧检索列表，右侧条目详情预览窗格）。
此前详情预览窗格仅支持纯文本输出（`paneBody.textContent = finalText`），对于开发者的代码片段（如 TypeScript、Python、SQL、Shell 等）缺乏关键字着色与行号区分；对于长篇模板或 Markdown 内容缺乏标题、引用块与列表层级，缺乏专业生产力工具（如 Raycast Detail / TextExpander Snippet Preview）的现代化质感。

同时，思源笔记插件有着极其严苛的安全契约（约束 7：外部文本一律按文本节点渲染，不注入 HTML；约束 22：思源文档是正文与结构唯一来源；约束 31：绝不伪造行为与数据），必须坚决杜绝 XSS 注入漏洞，并保障用户点击复制或按快捷键插入时，复制与插入的正文为 100% 字节不变的原始文本，不能受任何 DOM 节点或修饰标记污染。

## 决策

1. **绝对零 HTML 注入（Zero Injection / Pure DOM Safe Rendering）**：
   - 在 `src/ui/preview-renderer.ts` 实现安全的纯 DOM 渲染流水线 `renderSafePreview`；
   - 严禁使用 `innerHTML`、`outerHTML` 或 `insertAdjacentHTML`；所有文本与符号必须通过 `document.createTextNode(text)` 挂载；
   - 即使正文包含恶意字符串（如 `<script>alert(1)</script>`、`<img onerror=...>`），在 DOM 树中也仅表现为文本节点的字面内容，杜绝任何 XSS 攻击途径。
2. **多语言代码语法高亮与变量占位符提权着色**：
   - 纯函数 `tokenizeCodeLine` 基于线性扫描，支持识别：
     - 关键字（`keyword`）：覆盖 JS/TS, Python, SQL, Go, Rust, Shell 常用关键字；
     - 字符串（`string`）：双引号、单引号与反引号包裹，且能优先切出内嵌的 `{{xlc:ask:字段}}` 变量；
     - 注释（`comment`）：`//`、`#`、`--` 行尾注释；
     - 数字（`number`）：整型、浮点与十六进制字面量；
     - 变量占位符（`variable`）：`{{xlc:...}}` 赋予醒目的高亮芯片着色；
   - 代码块顶端自动渲染 `.xlc-code-banner` 代码信息条，展示大写的语言徽标（如 `TS`、`PYTHON`、`SQL`）与总行数；
   - 每一行呈现紧凑的行号 `.xlc-line-num`，提升长代码阅读体验。
3. **Markdown 轻量结构化展示**：
   - `parseMarkdownBlocks` 将多行文本拆解为 `h1`、`h2`、`h3`、`quote` 引用块、`list-bullet` 无序项、`list-ordered` 有序项、`code-fence` 行内围栏与普通段落；
   - `tokenizeMarkdownInlines` 解析行内粗体 `**bold**`、行内代码 `` `code` ``、链接 `[text](url)` 与变量 `{{xlc:...}}`，以纯 DOM 挂载。
4. **复制与插入不变性（Copy Invariance）**：
   - 预览着色仅作为视觉展现层运行于预览窗格内部；
   - 用户执行复制（`Ctrl+Enter` / `Alt+Shift+1~9` / 详情按钮）或插入（`Enter` / `Alt+1~9`）动作时，底层 `ActionExecutor` 始终读取原始的纯文本/Kramdown 资产，绝不回读渲染后的 DOM，100% 保持数据真源性。
5. **系统主题与高对比度/forced-colors 全面兼容**：
   - 在 `src/styles/tokens-r187.scss` 声明 `--xlc-tok-kw`, `--xlc-tok-str`, `--xlc-tok-num`, `--xlc-tok-comment`, `--xlc-tok-var` 亮暗调色板；
   - 在 `@media (forced-colors: active)` 下将关键字与变量对齐到系统 `Highlight`，其余对齐到 `CanvasText`，满足 Windows 高对比度可达性标准。

## 结果与证据

- 单元测试增至 573/573 全部通过；
- 专项测试 `tests/r268-preview-highlight.test.cjs` 包含 5 项专项用例，完整覆盖关键字、内嵌变量、行内格式、Markdown 块结构与防 XSS 注入验证；
- 负向验证：故意在 `src/ui/preview-renderer.ts` 中禁用关键字匹配，测试准确失败检出（`AssertionError: 应识别 const 为 keyword`），恢复源码后复验全绿；
- 全门禁 `check:errors`、`check`、单元 `573/573`、`build`、`test:ui`、`test:ix`（74/74）、`scan`、`check:package` 全数通过。
