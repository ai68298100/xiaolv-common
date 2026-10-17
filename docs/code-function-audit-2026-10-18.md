# 代码与功能审计记录（2026-10-18）

> R238 更正：R237 对全部 operation ID 的清单与回滚假设不成立。当前实现以 [ADR 0058](adr/0058-restrict-unverified-multiblock-writes.md) 为准；历史受控夹具不能证明宿主多块完整性。

## 已核对的主链

- `src/index.ts`：宿主生命周期、命令/菜单注册、侧车加载、服务装配和导入导出入口。
- `src/kernel/client.ts`：官方 API 请求封装和响应形状校验；没有发现 SQL 核心依赖。
- `src/model/`：条目归一化、动作计划、搜索/拼音、变量、传输和 Kramdown 纯函数。
- `src/service/library.ts`：结构化块遍历、索引、CRUD、来源/资源状态和真实正文读取。
- `src/service/commands.ts`：插入/复制/打开来源执行，移动端和无活动编辑器诚实降级。
- `src/ui/`：搜索双栏、捕获、设置、首跑、发现、导入策略和变量卡；外部文本用 `textContent`/`pre.textContent` 渲染。

## 本轮修复

1. 未来版本或读取失败的 state 侧车进入只读保护，不再由默认状态写回覆盖；用户会看到 `sidecarReadOnly`。
2. JSON/Markdown 导出遇到索引错误、停止/截断、正文读取失败、缺正文或超过 `LIMITS.contentChars` 时以 `ExportIntegrityError` 终止；设置页显示具体原因。
3. 模板数量、移动端选择后主动作、媒体路径复制边界和多块正文风险在中英文 UI、原型和 harness 中同步。

专项 `tests/r234-export-sidecar.test.cjs` 为 10/10；另外对 7 类源码违规（提前写回、吞正文读取失败、丢失条目、超限截断等）实际注入后均退出失败，逐字节恢复后正向复验通过。T-0090 的最新多块源码注入证据见 `C:\Users\Admin\AppData\Local\Temp\xlc-r237-latest-negative.log`，恢复复验见 `C:\Users\Admin\AppData\Local\Temp\xlc-r237-latest-restored.log`；注入前后 `library.ts` SHA256 均为 `1EDB2C1B556A0840052F50371C7260A8BD02444DE6315EBD722CA4AB7B2329FF`。

## 已确认缺陷

### B-006：历史多块正文只登记首块（现采用写前受限保护）

历史复现中，`LibraryService.createItemUnlocked` 将 Markdown 交给 `appendBlock`，只使用首个 `doOperations` 的 ID 写条目属性；`getStoredItemKramdown` 也只读该 ID。历史真实内核记录表明多段 Markdown 会拆成兄弟块，本轮使用打包后的真实服务离线复现，确认创建、索引、预览、复制、JSON/Markdown 导出和删除都可能只覆盖首块，尾块无条目属性而留在库文档。详见 [multiblock-integrity-2026-10-18.md](multiblock-integrity-2026-10-18.md)。

T-0091 替换了不安全假设：写前拒绝未经验证的多行正文；append 仅采目标文档 insert，setAttrs 不作为新块，异常响应不盲删。已有 parts 经同文档/顺序/属性检查读取，正文更新和自动删除暂停；单锚块也检查是否移出原文档。导入覆盖在删旧前检查新正文和备份均可写。未启动宿主，复杂模板继续受限。

T-0092 补齐入口一致性：六个捕获入口超限后明确拒绝，停止截断后写入；表单写前检查与服务共用规则，行内错误保留输入和焦点；块引用草稿保存真实目标引用语法。更新正文时先验证旧正文可读取且符合恢复限制，避免失败恢复再次丢失内容。截图夹具的3个限制文案改为直接引用生产语言文件，新增8类型可见和拒绝零创建的浏览器检查；7类源码负向均检出并恢复。

## UI/无障碍待办

上一轮 Chrome axe 诊断中的 `nested-interactive`（搜索结果 option 内含收藏等按钮）和客服分类徽标对比度约 3.93:1 已修复；预览正文和快捷键区域已补可聚焦滚动。发现页标签组的 ARIA 属性错误已修正。最新搜索亮色/暗色/移动矩阵为 0 violations，但不能把单一搜索矩阵或 `test:ix 74/74` 外推成全插件 axe 全绿。

## 最终门禁

`pnpm run check`、`pnpm test` 512/512、`pnpm run build`、`pnpm run check:package` 13 项、`pnpm run scan`、Chrome `pnpm run test:ui`、`pnpm run test:ix` 74/74 和 `git diff --check` 均通过。最新搜索 UI 已改用 `list/listitem` + `aria-current`，客服浅色徽标改为高对比色；Chrome axe 的搜索亮色/暗色/移动矩阵为 0 violations。R240 另验证示例包 25/8/17、重复导入 skip 和复制/插入载荷。真实 Electron/Android/AI 现场证据仍按 B-001–B-006 分层，B-006 继续开放。
