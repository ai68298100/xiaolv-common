# 宿主合同与能力矩阵（小驴常用）

> 证据基线：siyuan@1.2.8 类型（`node_modules/siyuan`）+ siyuan-note/siyuan 源码（本机 `D:\AI\tmp-siyuan-source`，kernel/api/router.go 等行号标注）+ 真实内核 3.8.6 只读探测（2026-10-06）。写路径 E2E 未执行（B-001），下表「验证」列如实区分。

## 一、内核 HTTP 端点（全部走官方 fetchSyncPost 传输 + 白名单）

| 端点 | 用途 | 证据（router.go） | 验证 |
| --- | --- | --- | --- |
| `/api/notebook/lsNotebooks` | 首次引导列笔记本 | L150 | 结构✓ / 真机待 B-001 |
| `/api/filetree/listDocsByPath` | notebook/tree 模式列文档 | L184 | 结构✓ / 真机待 |
| `/api/filetree/createDocWithMd` | 创建库文档（先 confirm） | L193 | 结构✓ / 真机待 |
| `/api/block/getChildBlocks` | 库文档有序遍历（无 SQL） | L286 | 结构✓ / 真机待 |
| `/api/block/getBlockKramdown` | 条目正文现场取用 | L284 | 结构✓ / 真机待 |
| `/api/block/getBlockInfo` | tree 模式取 box/path | L278 | 结构✓ / 真机待 |
| `/api/block/checkBlocksExist` | 来源失效检测 | L305 | 结构✓ / 真机待 |
| `/api/block/appendBlock` | 创建条目块 | L312；响应 `[{doOperations:[{id}]}]`（apicontract/block_transaction.go） | 结构✓ / 真机待 |
| `/api/block/updateBlock` | 编辑条目内容 | L316 | 结构✓ / 真机待 |
| `/api/block/deleteBlock` | 删除条目块/回滚 | L319 | 结构✓ / 真机待 |
| `/api/attr/getBlockAttrs` / `batchGetBlockAttrs` | 元数据读取（`map[string]map[string]string`，contracts.go L279） | L363/L364 | 结构✓ / 真机待 |
| `/api/attr/setBlockAttrs` | 元数据写入 | L361 | 结构✓ / 真机待 |
| `/api/file/getFile` | 资源存在性检查 | router.go `/api/file/` | 结构✓ / 真机待 |
| `/api/export/exportMdContent` | 文档片段导出（P4 后备用） | L437 | 未接线 |

写端点均带 `CheckAdminRole + CheckReadonly`（只读模式/访客下会失败→回执 kernel-error，UI 明示）。

## 二、客户端 API（siyuan@1.2.8 官方导出）

| API | 用途 | 证据 | 验证 |
| --- | --- | --- | --- |
| `Plugin` 生命周期/addTopBar/addCommand/loadData/saveData | 插件骨架 | siyuan.d.ts L592-783 | 类型✓（系列既有实践） |
| `getActiveEditor(wndActive?)` | 活动编辑器（插入/当前文档） | siyuan.d.ts L369；引入记录 issue #15641 | 类型✓ / 真机待 |
| `protyle.insert(html, isBlock, useProtyleRange)` | 光标处插入 markdown | protyle.d.ts L343 | 类型✓ / 真机待 |
| `openTab({doc:{id}} / {asset:{path}})` | 打开来源/资源 | siyuan.d.ts L381 | 类型✓ / 真机待 |
| `Dialog` / `confirm` / `showMessage` | UI | siyuan.d.ts | 类型✓ |
| `addToolbarItem` | 移动端入口 | siyuan.d.ts L734 | 类型✓ / 移动端真实形态待 B-002 |

## 三、能力声明（getCapabilities 输出，产品口径）

| 能力 | desktop | mobile | 说明 |
| --- | --- | --- | --- |
| search/get/reindex/recent/favorites/save/update/remove | ✅ | ✅（同 UI） | 纯内核 API |
| insert（直接插入） | ✅ | ⚠️ 降级复制 | `mobile-insert-unverified`（B-002） |
| copy（文本/URL/代码/MD） | ✅ | ✅ | Clipboard API + execCommand 降级 |
| copy（图片位图） | ⚠️ Markdown 链接 | ⚠️ 同左 | `bitmap-clipboard-unverified`（B-003） |
| openSource（文档/块/资源） | ✅ openTab | ⚠️ 待 B-002 | |
| openSource（URL） | ✅ http/https only | ⚠️ 待 B-002 | 协议守卫在计划层 |

## 四、运行时口径

- 传输：官方 `fetchSyncPost`（自动端口/鉴权）；插件侧白名单 + 8s 超时 + `{code,msg,data}` 信封校验；缺失 syncPost 时构造即失败（防裸 fetch 绕过）。
- 遍历上限：条目 2000 / 文档 200 / 遍历深度一层子文档；超出 `truncated=true` 明示。
- 失败语义：一切写操作带回执；属性写入失败回滚已插块；超时/断网/只读模式均可见错误，不静默。
- DOM 边界（ADR 0003）：仅插件自建 UI、官方编辑器实例 API、选区 + `data-node-id`；不碰布局栈/页签内部结构/坐标猜测。
