# ADR 0077：正则提取与文本动态替换安全过滤器 (G25) 契约

## 状态

已接受，T-0136 / R283（2026-10-20，对标 Espanso Regex / TextExpander 文本提取与脱敏转换能力，落地 G25）。

## 背景与上下文

在客服回复、工单流转、数据清洗与文档模板场景中，用户高频需要对剪贴板文本或变量输入进行局部提取与结构调整：
1. **典型场景**：
   - 从一长串聊天记录或订单详情中提取纯数字流水号（如提取 `\d{8,14}`）；
   - 从完整邮箱地址中提取用户名（如提取 `^([^@]+)`）；
   - 手机号或身份证号脱敏（如将 `(\d{3})\d{4}(\d{4})` 替换为 `$1****$2`）；
2. **行业对标**：Espanso 核心内置 `regex` 提取器；TextExpander 支持通过正则表达式过滤与提取；
3. **安全红线（ReDoS 绝对防御）**：
   - 严禁允许灾难性回溯（Catastrophic Backtracking）的危险正则表达式（如嵌套量词 `(a+)+`、`(.*a)+`）；
   - 正则表达式模式限长 64 字符；
   - 待处理文本长度限长 4000 字符；
   - 严格异常捕获，语法错误或非法模式安全返回 `null`，保持占位符原文不被吞噬。

## 决策

1. **安全正则执行器纯函数 (`applyRegexFilter`)**：
   - 在 `src/model/placeholders.ts` 实现安全的纯函数正则过滤器；
   - 静态危险模式检测 (`isDangerousRegex`)：过滤嵌套重复量词（如 `[+*]\)?[+*]` 或 `\([^)]*[+*][^)]*\)[+*]`）；
   - 提取模式 (`extract`)：调用 `pattern.exec(text)`，若有分组则返回第一捕获组 `m[1]`，否则返回全匹配 `m[0]`；无匹配返回空串；
   - 替换模式 (`replace`)：调用 `text.replace(new RegExp(pattern, "g"), replacement)`；
2. **语法与参数解析 (`resolvePlaceholder`)**：
   - 管道语法：`{{xlc:regex|extract|PATTERN|TEXT}}` 与 `{{xlc:regex|replace|PATTERN|REPLACEMENT|TEXT}}`；
   - 兼容冒号语法：`{{xlc:regex:extract|PATTERN|TEXT}}` 与 `{{xlc:regex:replace|PATTERN|REPLACEMENT|TEXT}}`；
   - 非法语法或未知操作类型严格返回 `null`（保持原文）。

## 结果与证据

- 单元测试覆盖数字提取、邮箱前缀捕获、手机号脱敏替换、危险 ReDoS 正则拦截与非法语法容错；
- 严格负向验证与全门禁通过。
