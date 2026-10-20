# ADR 0074：变量填写值记忆与智能预填 (G22) 契约

## 状态

已接受，T-0133 / R280（2026-10-20，对标 TextExpander / Espanso 变量默认值记忆与 Raycast 表单自动填充能力，落地 G22）。

## 背景与上下文

小驴常用以 `{{xlc:ask|字段名}}` 形式提供变量填充卡。对于「客服名称」「工单渠道」「客户联系人」等高频复用字段，用户每次插入同一模板都要重复输入相同内容：
1. **行业对标**：TextExpander 会记住上次填写的变量值并作为默认值预填；Espanso 的 `form` 也可配合记忆；
2. **隐私红线**：变量内容可能包含客户姓名、电话等敏感信息，因此：
   - **只存于本机侧车**（`loadData`），绝不上传任何云端、不写入笔记正文与块属性；
   - 明确提供一键清除入口，用户可随时抹去记忆；
   - 提供总开关（默认开启，用户可关闭）；
   - 长度与条目数双上限，避免侧车膨胀。

## 决策

1. **纯函数记忆模型 (`src/model/variable-memory.ts`)**：
   - `normalizeMemory(raw)`：从侧车原始数据中安全提取记忆表，丢弃非法结构、裁剪超限项与超长值；
   - `getRememberedValue(memory, fieldLabel)`：标签大小写不敏感读取；
   - `rememberValue(memory, fieldLabel, value, now)`：写入/刷新（含最近使用时间），**空值不记**（避免用 `__字段__` 兜底值污染记忆）；
   - `forgetValue(memory, fieldLabel)` 与 `clearAllMemory(memory)`；
   - 上限：最多 200 个字段、单值最多 500 字符、字段名最多 80 字符。
2. **表单预填 (`src/ui/variable-form.ts`)**：
   - `VariableFillOptions.defaults?: Record<string, string>`：存在记忆值时作为输入框初值；
   - 预填值仍在输入框内，用户可随时改写；改写后的值在确认时覆盖记忆。
3. **执行链记忆写入 (`src/ui/dialog.ts`)**：
   - 变量卡确认 → 先写入记忆 → 再执行插入/复制（写入失败不得阻断插入）；
   - 记忆读写通过依赖注入（`deps.rememberVariable` / `deps.variableMemory`），便于测试与宿主隔离。
4. **开关与清除**：
   - 侧车字段 `variableMemory: {enabled: boolean; values: {...}}`；
   - `enabled === false` 时既不预填也不写入，但保留已有数据（不擅自删除用户数据）。

## 结果与证据

- 单元测试覆盖读取/写入/覆盖/清除/上限裁剪/非法结构丢弃；
- 负向验证：故意让空值写入记忆，断言失败；
- 全门禁通过。
