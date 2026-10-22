# ADR 0096：全方位代码审查、XSS/IME/生命周期深度加固与零缺陷防御体系 (Full-Spectrum Quality Audit & Hardening)

## 状态
已接受，T-0161 / R292（2026-10-22，用户指令立项：全方位深度代码审查与零缺陷防漏体系）。

## 背景与上下文
随着小驴常用功能演进至 v0.6.0，系统涵盖了全域检索、Headless 纯求值展开、多源比对、Bento 便当盒 UI 与原子插入。为了彻底消除潜在的隐蔽缺陷，杜绝诸如内存残留、输入法误触、多语言缺失或 XSS 注入等历史性漏洞再次发生，开展全仓深层审查：
1. **i18n 多语言全覆盖**：全仓扫描代码调用的 `t()` 键名，排查是否存在代码中调用但在语言包中未声明导致英文环境下回退硬编码中文的问题；
2. **DOM 注入与 XSS 防护**：审查全仓所有 `innerHTML` 赋值，确保 100% 静态安全或经 `escapeHtml` 严密包裹；
3. **IME 中文输入法组合态防误触**：审查所有 `keydown` 监听器，确保对 `ev.isComposing` 与 `keyCode === 229` 保持绝对无死角的拦截，防止选词过程误触发提交或保存；
4. **生命周期卸载与内存泄漏**：审查 `onunload` 与组件销毁流程，确保所有菜单处理器、对话框引用、定时器全部清空，避免垃圾回收屏障；
5. **空值与极端边界防御**：审查纯文本转换、时间戳解析与标题派生等底层函数，在遇到 `null` / `undefined` / 非法时间格式时不崩溃、不返回 `NaN`。

## 决策与落地

### 1. 双语 i18n 完整覆盖与对称对齐
- 脚本深度遍历全仓所有 TypeScript 文件提取 `t(...)` 键名并比对 `zh-CN.json` 与 `en.json`；
- 补齐此前缺失的 `scopeAllNotesPlaceholder`、`scopeCurrentDocPlaceholder` 与 `packDepTreeTitle` 双语词条，消除硬编码回退风险。

### 2. 彻底杜绝动态 `innerHTML` 注入风险
- 发现并重构 `src/ui/settings-dialog.ts` 的 Bento 便当盒卡片与生态矩阵行，将其从 `innerHTML` 彻底升级为原生安全 DOM 节点（`textContent` / `createElement`）；
- 在 `src/ui/export-sanitizer-modal.ts` 中对 `customText` 增加 `escapeHtml` 转义，100% 阻断潜在的 XSS 攻击向量。

### 3. 全局键盘与 IME 选词防护加固
- 在 `src/ui/quick-edit.ts`、`src/ui/dialog.ts` 与 `src/ui/discovery-dialog.ts` 的所有 `keydown` 事件中，严格追加 `if (ev.isComposing || (ev as KeyboardEvent).keyCode === 229) return;` 防护，彻底杜绝中文拼音输入选词与回车确认时的快捷键误触。

### 4. 插件卸载与组件生命周期彻底闭环
- 在 `src/ui/capture.ts` 中实现 `destroy()` 方法并在 `onunload` 中调用，显式销毁当前活跃的对话框引用并清理 `activeCaptures` 集合；
- 在 `src/index.ts` 的 `onunload()` 中对所有菜单事件监听器（`imageMenuHandler`、`docTreeMenuHandler`、`blockRefMenuHandler`、`linkMenuHandler`）全量置空，断开内存闭包。

### 5. 极端输入与时间戳/纯文本边界防御
- 在 `src/model/item.ts` 的 `kramdownToPlainText` 增加 `if (!kramdown) return "";` 守卫，`deriveTitle` 的 `attrs` 赋予默认参数；
- 在 `src/service/omni-search.ts` 的 `parseSiYuanTimestamp` 增加 `Number.isFinite(time) ? time : 0`，防止极端非法时间数字（如超出 JS 范围的 14 位数字）生成 `NaN` 污染排序模型。

## 结果与证据
- 单元测试增至 721/721 项全数通过；
- 自动化扫描验证全仓 `t()` 键名与 `zh-CN.json` / `en.json` 零差异对齐；
- 全套工程门禁（check, scan, check:errors, check:package, build）全数通过。
