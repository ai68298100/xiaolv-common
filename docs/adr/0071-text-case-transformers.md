# ADR 0071：文本大小写与命名范式转换器 (G19) 契约

## 状态

已接受，T-0130 / R277（2026-10-20，对标 Espanso / Raycast / TextExpander 代码片段与文本格式转换能力，落地 G19）。

## 背景与上下文

在研发写作、代码常用件、API 规范以及客服国际化场景中，用户高频需要对模板内文本或动态变量实施大小写与命名范式转换：
1. **开发者场景**：将变量名自动转换为驼峰（`camelCase`）、短横线（`kebab-case`）、蛇形（`snake_case`）或常量大写（`UPPER_CASE`）；
2. **客服与商务场景**：将客户姓名或产品型号自动转换为首字母大写（`Title Case` / `Capitalize`）或全大写；
3. **行业对标**：Espanso 核心内置 `uppercase` / `lowercase` / `capitalize` 过滤器；TextExpander 支持多种大小写变形函数。

## 决策

1. **轻量纯函数命名转换引擎 (`transformCase`)**：
   - 在 `src/model/placeholders.ts` 实现安全的字符串命名转换器；
   - 支持格式：
     - `upper` / `uppercase`：全大写（如 `HELLO WORLD`）；
     - `lower` / `lowercase`：全小写（如 `hello world`）；
     - `title` / `capitalize`：首字母大写词（如 `Hello World`）；
     - `camel` / `camelcase`：小驼峰（如 `helloWorld`）；
     - `pascal` / `pascalcase`：大驼峰（如 `HelloWorld`）；
     - `snake` / `snakecase`：下划线蛇形（如 `hello_world`）；
     - `kebab` / `kebabcase`：短横线连接（如 `hello-world`）；
     - `constant`：常量下划线大写（如 `HELLO_WORLD`）。
2. **语法与参数解析 (`resolvePlaceholder`)**：
   - 语法：`{{xlc:case:STYLE|TEXT}}`，其中参数以 `|` 分隔；
   - 示例：`{{xlc:case:upper|order status}}` -> `ORDER STATUS`；
   - 示例：`{{xlc:case:camel|user login token}}` -> `userLoginToken`；
   - 示例：`{{xlc:case:title|john doe}}` -> `John Doe`；
3. **安全边界与向下兼容**：
   - 未知 STYLE 或非法输入严格返回 `null`，保持原始占位符不被吞噬；
   - 纯函数无副作用。

## 结果与证据

- 单元测试增设转换专项用例，覆盖各主流命名范式、多标点分词与中英混排；
- 负向验证确保格式破坏精准捕获；
- 全套工程门禁全绿通过。
