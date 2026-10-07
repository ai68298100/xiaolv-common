# 小驴常用状态审查（2026-10-07）

本报告用于下一轮开发接续。审查后已在同一发布轮次落地高优先级数据、宿主协议和 UI 修复；报告中的原始问题清单保留作证据，已完成项在发布记录中标明。

## 当前结论

- 产品定位已经稳定为“以思源真实块为真源的常用内容资产层”。当前发布候选为 v0.2.2，集市不推送。
- 本地门禁可重复通过：`pnpm run check`、`pnpm test`（209/209）、`pnpm run build`、`pnpm run scan`、`pnpm run test:ui`（15 组 smoke，逐组断言全部通过，脚本最终还会生成 15 张截图）。`pnpm audit --audit-level high` 报告无已知漏洞。
- 真正的宿主验收尚未完成。`pnpm run e2e` 在没有 `SIYUAN_TOKEN` 时按设计退出；桌面内核读写、桌面人工 UI 走查、Android 真机行为仍分别受 B-001/B-002/B-003 阻塞。Chromium harness 和窄视口截图只能证明生产 DOM/CSS 结构，不能替代思源桌面或 Android 验收。
- 当前工作树包含 v0.2.2 发布修复，待最终门禁后提交并同步 `origin/main`，不推送集市。

## 已开发范围

1. 数据与宿主层：块真源、`custom-xlc-*` 元数据、侧车迁移、索引重建、来源健康、CRUD、结构化内核 API 白名单。
2. 调用体验：搜索、中文/拼音、类型/标签/分类筛选、收藏/最近/常用排序、键盘导航、双栏预览、移动 sheet、八类插入语义、来源回链。
3. 内容能力：代码/图片/附件/结构/块引用、JSON 与 Markdown+资源包导入导出、provider 协议、动态占位符、ask 填充、片段嵌套、使用计数。
4. AI 与捕获：宿主 AI 默认关闭和正文出域双开关、整理/草稿/语义找/变换、标签体检、自定义变换、10 条提示词场景包、快速捕获剪贴板。
5. 工程门禁：strict TypeScript、`noUncheckedIndexedAccess`、单元/模型测试、负向门禁、生产 UI harness、密钥扫描、GitHub Actions。

## 原始审查问题与当前状态

T-0012～T-0018 已在本次 v0.2.2 发布轮次处理：索引正文读取、导入冲突快照、来源/资源探针、回执语义、URL/字段校验、Markdown 往返、快速捕获标题、notebook 写入，以及搜索/预览/捕获 UI 竞态均已改动并有回归测试。下面的表格保留审查时的证据和影响，便于后续追溯；尚未完成的项目见“待办与阻塞”。

以下问题来自当前源码静态审查；其中带“需真机确认”的项目仍应在 B-001/B-002 中补证据。

### P0/P1：数据正确性与核心功能

| 优先级 | 问题 | 证据与影响 |
| --- | --- | --- |
| P0 | **索引没有读取正文，摘要和正文关键词搜索实际为空** | `src/service/library.ts:329-343` 以 `kramdown: ""` 构造索引条目；`src/model/item.ts:160` 的 `summary` 因此为空。搜索模型虽支持摘要字段，但正文命中和摘要展示不会发生。需决定“索引期取正文”或“写入期保存可重建摘要”，并更新性能口径。 |
| P0 | **导入冲突判断依赖可为空的缓存，可能产生重复逻辑 ID** | `src/service/importer.ts:65-76` 使用 `library.getIndex()?.items.has(...)`；首次导入或首条创建后 `library.ts:538` 会使索引失效，后续同批条目继续被判为 new。`validateImport` 也未拒绝 payload 内重复 ID（`src/model/transfer.ts:104-113`）。这会让 skip/overwrite/rename 失效并产生重复块。 |
| P1 | **来源文档失效被忽略，资源健康检查走错传输协议** | `src/service/commands.ts:201-210` 以 `h.docMissing && !item.libraryDocId` 判断来源文档；`libraryDocId` 对条目必填，故来源文档删除时通常不会标失效。另 `src/service/library.ts:456-463` 通过 `kernel.request("getFile")` 检查二进制资源，但 `src/kernel/client.ts:55-88` 强制 `{code,msg,data}` 信封；真实资源端点需独立二进制探针。 |
| P1 | **更新/覆盖导入不是原子操作，且无法清除旧字段** | `src/service/library.ts:561-575` 先写属性再 `updateBlock`；正文更新失败会留下新属性+旧正文。`custom-xlc-vars` 仅在新计数大于 0 时写入，ask 被删后旧徽标残留；`url/target` 为空时也不会按空串删除旧属性。 |
| P1 | **URL 输入缺少统一的 http/https 校验** | `src/model/protocol.ts:150-170`、`src/service/library.ts:487-498` 只截断 URL；`src/model/actions.ts:125-133` 插入 Markdown 链接时也不校验，跨插件可能保存并插入 `javascript:`/`data:` 链接。open 分支虽有守卫，写入与插入路径仍不一致。 |
| P1 | **Markdown 包字段不全，URL/块引用导入会丢元数据** | `src/service/export-markdown.ts:60-73` 未导出 `source-type`、`url`、`target`；`src/service/import-markdown.ts:119-125` 却尝试读取这些字段。R31 的“全字段保真”承诺与实现不符。 |
| P1 | **快速捕获没有按文档承诺使用剪贴板首行作标题** | `src/ui/capture.ts:84-114` 的 `doQuickCapture` 只传 `itemType` 和 `markdown`；没有传 `title`。`library.createItem` 又未将 markdown 传给 `normalizeCommonItem`，最终标题会退化为类型名。 |
| P1 | **notebook 库模式无法创建条目** | `src/model/storage.ts` 允许 notebook 配置不带 `containerDocIds`，但 `src/service/library.ts:477-480` 只读取 `config.containerDocIds[0]`；该模式下捕获、导入都会返回 `no library doc`。应解析可写目标文档，或在 UI 明确禁止该模式的写入入口。 |
| P1 | **导入类型校验过宽，未知类型会静默变成 text** | `src/model/transfer.ts:116-145` 只检查 `itemType` 是短字符串；`src/service/importer.ts:7-9,43-44` 把未知类型降级为 text，回执仍可能成功，破坏导入语义。 |
| P1 | **overwrite 类型变化先删后建，重建失败会丢原条目** | `src/service/importer.ts:35-47` 类型变化时先 `removeItem` 再 `createItem`，没有保留旧块或补偿回滚。 |
| P1 | **协议回执丢失真实错误语义** | `src/service/service.ts:146-170` 把 executor 的 `source-missing`、`asset-missing`、`unsupported` 等统一成 `kernel-error`，`openSource` 还固定返回 `{opened: "doc"}`，URL/块/资源会被误报为 doc。跨插件无法按错误类型恢复。 |
| P1 | **外部 URL 打开失败仍可能报告成功** | `src/service/commands.ts:111-119` 忽略 `window.open` 返回值；弹窗拦截时仍返回 true，违反“失败诚实”。 |
| P2 | **来源类型不会在索引重建后保留** | `src/model/item.ts:146-150` 只按是否有源文档/块二值化 `sourceType`；`src/service/library.ts:487-500` 也没有写入 source-type 属性。selection/doc-fragment 等来源在重建或导出后会退化为 block/manual。 |

### P1/P2：UI 与交互

| 优先级 | 问题 | 证据与复现路径 |
| --- | --- | --- |
| P1 | **切换到“最近/常用”排序时，收藏条目会从列表消失** | `src/ui/dialog.ts:679-713` 先将收藏放入 `favs`，但只有 `isManual` 才 `ordered.push(...favs)`；recent/frequent 下收藏既不进 favs 分组，也不进 rest。 |
| P1 | **AI 语义搜索失败时错误文案被清空** | `src/ui/dialog.ts:565-577` 先写 `status`，随后 `601-621` 将 `emptyMessage` 清空且 status 置空；`?` 查询无结果时用户看到空列表，没有失败原因或重试提示。 |
| P1 | **预览存在陈旧内容和异步覆盖风险** | `updatePreview`（`src/ui/dialog.ts:1003-1031`）普通条目从未写回 `lastPreviewId`；切到 provider/空结果时也不使正在进行的 `preview()` 失效，旧请求可能覆盖新预览，搜索到零结果时右侧仍保留上一个条目。 |
| P1 | **provider 键盘导航索引错位** | `src/ui/dialog.ts:814-828` 的 `.xlc-provider-header` 没有 `data-xlcHead`；`paintActive`（`914-928`）只过滤分组头，因此 provider header 被当成可导航行，ArrowDown/Up 会高亮/滚动错误元素。 |
| P1 | **捕获表单重复点击和取消竞态可重复入库** | `src/ui/capture.ts:391-436` 保存按钮未禁用；多次点击会并行 `findDuplicate`。用户点击保存后立即关闭表单，异步去重完成仍会调用 `doSave()` 或打开确认框。 |
| P1 | **AI 整理结果自动写入，和“逐项采纳”文案冲突** | `src/ui/capture.ts:287-288` 提供“全部采纳”，但 `333-335` 收到建议后立即 `applySuggestions()`，用户尚未确认就修改标题/标签/分类。 |
| P1 | **首跑引导的“稍后再说”入口未接线** | `openSetup()`（`src/index.ts:1054-1061`）只传 `onConfigured`，没有传 `onDismiss`；设计稿/设置对话框虽有对应文案，真实首跑流程可能无法退出。 |
| P1 | **设置中 AI 总开关与正文出域开关可能形成不一致状态** | `src/ui/settings-dialog.ts:694-708` 关闭总开关时清掉 `shareContent`，但没有禁用依赖开关；用户可在总开关关闭时重新勾选，重新开启 AI 后会静默恢复正文出域。 |
| P1 | **设置/删除/重建索引等异步失败缺少回执** | `src/index.ts:865-868,1087-1091`、`src/ui/settings-dialog.ts:820-871` 等只 `void ...then(...)`，没有统一 `catch`/busy 状态，内核失败会变成 unhandled rejection 或无反馈。 |
| P1 | **保存的标签/分类筛选可能在异步选项加载后未重新查询** | `src/ui/dialog.ts:247-289` 异步填充 select，打开流程已先触发 `refresh()`；持久化筛选值到达后没有 hydration barrier/再次 refresh，重开弹窗可能显示未过滤列表。 |
| P2 | **移动端触控目标与设计约定不符** | `src/styles/index.scss:1413-1416` 将移动 chip 设为 32px；星标约 28px，清空按钮 18px（`240-250`），低于代码注释所称 44px 命中区。截图结构正常，但未在真实 Android 验收。 |
| P2 | **捕获表单窄屏仍保持固定双栏** | `src/ui/capture.ts:229-268` 使用固定 `.xlc-form-row`；`src/styles/index.scss:978-987` 的固定字段宽 130px，移动窄屏没有 stack 规则。 |
| P2 | **长按/菜单监听生命周期不完整** | `attachLongPress` 的 timer 是局部变量，销毁 sheet 时不能取消；provider 菜单（`src/ui/dialog.ts:814-883`）没有接入 `menuDismiss`，宿主关闭弹窗后 document `pointerdown` 闭包仍存活。普通动作菜单与宿主 X 关闭也应统一走 cleanup。 |
| P2 | **无障碍状态只做视觉更新** | 列表有 `role=listbox`/`aria-selected`（`src/ui/dialog.ts:339-343,749-750`），但行没有稳定 id/tabindex，搜索框没有 `aria-activedescendant`；provider/action 行也缺焦点语义。 |
| P2 | **英文界面仍有中文硬编码** | 首跑 tree 选项（`src/ui/settings-dialog.ts:428-431`）以及编辑来源异步文案（`src/index.ts:956,973`）直接写入中文，切换英文会出现中英混排。 |

## 工程质量与维护风险（仍待治理）

- 入口和 UI 文件偏大：`src/index.ts` 约 1,143 行、`src/ui/dialog.ts` 约 1,348 行、`settings-dialog.ts` 约 1,053 行、SCSS 约 1,282 行。生命周期、协议、宿主适配、界面装配集中在少数大文件，后续修复容易引入回归。
- `src/index.ts:85,94,382,1154` 等仍有多处 `as never`，隐藏 siyuan 类型漂移；当前 package 使用 `siyuan@1.2.9`，ADR/宿主证据多处仍写 1.2.8，应重新核对类型。
- `persistSoon`（`src/index.ts:294-298`）和 `onunload`（`1163-1164`）对 `saveData` fire-and-forget；保存失败没有用户回执。当前没有 ESLint/格式化门禁，`tests/entry.ts:8,13` 还有重复 pinyin 导入。
- 单元测试覆盖模型/服务很强，但 `tests/entry.ts` 不导入 dialog/settings/variable-form；UI 行为依赖 Playwright harness，尚未覆盖排序收藏、AI 错误、provider 键盘、宿主关闭、真实触控等路径。
- 现有测试也没有锁住快速捕获“首行标题”（`tests/r74-quick-capture.test.cjs:48-53` 只断言类型和正文），notebook 配置测试只验证归一化，没有 `createItem` 的端到端写入用例。
- CI（`.github/workflows/ci.yml:33-46`）执行 check/test/scan/build/UI smoke，但没有持续执行 `pnpm audit`；`pnpm e2e` 仍只能由带令牌的真实思源环境手工执行。

## 文档与发布口径问题（历史审查记录）

1. 版本需要统一：`plugin.json:5` 为 0.2.1，`package.json:3` 仍为 0.1.0，ROADMAP:5 仍写 v0.2.0 候选；需明确“代码 tag / 发布候选 / 集市未上架”的关系。
2. 测试数字曾过期：本轮已统一为 209 项、15 组 UI smoke；早期历史账本仍保留其当时的测试数字。
3. tree 深度过期：实际 `src/service/library.ts:245-286` 是 root+3 层 BFS；README:177 与 `docs/host-contract.md:51` 仍写一层。
4. `docs/positioning.md:34,55-60,119`、`docs/design/design-spec.md:4,102-103`、ADR 0004/0005 和开发账本早期段落仍有 v0.1、旧测试数、旧“待实现”描述。
5. dev-plan 只记到 R96；Git/CHANGELOG 已有 R97-R100。验收文档最新只到 R90，需补 R91-R100 证据或标明历史快照。
6. `CHANGELOG`/集市草稿中“全门禁”措辞应和 CI 实际范围一致；集市推送仍必须等用户明确授权。

## 待办与阻塞（按优先级）

| 任务 | 内容 | 完成证据 |
| --- | --- | --- |
| T-0012 | 修复索引摘要/正文搜索口径，决定正文读取或可重建摘要方案 | 搜索正文关键词、摘要和性能门禁；负向验证不允许回退为空摘要 |
| T-0013 | 重构 JSON/Markdown 导入冲突判定，先建立现有 ID 快照并拒绝包内重复 ID | 首次未预热索引、同批重复、skip/overwrite/rename 测试 |
| T-0014 | 修复来源/资源健康与 ActionResult 语义；拆出二进制资源探针，透传真实 opened kind/reason | 删除源文档、缺资源、弹窗拦截负向测试；B-001 真机回归 |
| T-0015 | 统一 URL、来源/target、逻辑 ID 校验，并修复 update 原子性/清空字段 | `javascript:`、非法 ID、清空 vars/url/target、正文更新失败补偿测试 |
| T-0016 | 修复 Markdown 包字段保真、标题换行编码和快速捕获标题 | JSON↔Markdown 往返与首行标题测试 |
| T-0017 | 修复搜索 UI：收藏排序、AI 错误、预览清理/竞态、provider 键盘导航 | 增加 UI smoke：manual/recent/frequent、`?` 失败、快速切换/空结果/provider ArrowDown |
| T-0018 | 修复捕获/设置异步生命周期和移动端布局 | 重复点击/取消竞态、关闭弹窗、reindex 失败回执、390px 表单与 44px 触控检查 |
| T-0019 | 拆分入口/大 UI 文件，移除可避免的 `as never`，补 lint/格式化门禁 | 模块边界说明、tsc、lint、全套回归 |
| T-0020 | 同步版本、测试数、tree 深度、设计状态、R97-R100 账本与验收记录 | 文档交叉检查；`pnpm run scan` 与构建后工作树干净 |
| T-0021 | 解除 B-001/B-002/B-003：桌面 token、Android 真机、图片位图剪贴板 | `pnpm e2e` 12 项回执、真实思源桌面走查、Android 录屏/截图与验收表 |
| T-0022 | provider 生态接入与集市发布演练 | 至少一个兄弟插件真实注册/卸载/重载；集市 PR 仅在用户明确授权后发起 |

## 下一轮推荐顺序

T-0012～T-0018 已完成。下一步先做 T-0019～T-0020 的工程治理与文档清理，随后在拿到令牌和 Android 会话后执行 T-0021；集市发布对应 T-0022，必须等用户明确授权。

## 本轮完成记录

T-0012～T-0018 的代码修复已落地并新增回归测试：索引正文/摘要、导入冲突快照与 ID 校验、来源与资源探针、URL 与 Markdown 字段保真、notebook 写入、服务回执、侧车保存、搜索/预览/捕获 UI 竞态和移动触控尺寸。负向测试已覆盖非法 URL、未知类型、重复 ID、宿主失败和恢复路径。
