# 代码与功能审计记录（2026-10-18）

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

专项 `tests/r234-export-sidecar.test.cjs` 为 10/10；另外对 7 类源码违规（提前写回、吞正文读取失败、丢失条目、超限截断等）实际注入后均退出失败，逐字节恢复后正向复验通过。证据在 `C:\Users\Admin\AppData\Local\Temp\xlc-r234-negatives-r65Z0x\summary.json`。

## 已确认缺陷

### B-006：多块正文只登记首块

`LibraryService.createItemUnlocked` 将 Markdown 交给 `appendBlock`，只使用首个 `doOperations` 的 ID 写条目属性；`getStoredItemKramdown` 也只读该 ID。历史真实内核记录表明多段 Markdown 会拆成兄弟块，本轮使用打包后的真实服务离线复现，确认创建、索引、预览、复制、JSON/Markdown 导出和删除都可能只覆盖首块，尾块无条目属性而留在库文档。详见 [multiblock-integrity-2026-10-18.md](multiblock-integrity-2026-10-18.md)。

这不是本轮修复项。没有修改 `library.ts`，没有猜测相邻块归属，也没有在 B-005 开放时启动宿主。复杂多段模板、简历、公司介绍和结构清单因此标为待修复。

## UI/无障碍待办

Chrome axe 诊断仍有 `nested-interactive`（搜索结果 option 内含收藏等按钮）和客服分类徽标对比度约 3.93:1；预览正文和快捷键区域已补可聚焦滚动。发现页标签组的 ARIA 属性错误已修正。不要把 `test:ix 74/74` 解读为 axe 全绿。

## 最终门禁

`pnpm run check`、`pnpm test` 494/494、`pnpm run build`、`pnpm run check:package` 13 项、`pnpm run scan`、Chrome `pnpm run test:ui`、`pnpm run test:ix` 74/74 和 `git diff --check` 均通过。真实 Electron/Android/AI 现场证据仍按 B-001–B-005 分层，B-006 是本轮新增开放缺陷。
