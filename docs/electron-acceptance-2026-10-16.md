# Electron 壳隔离验收记录（2026-10-16）

## 环境与隔离边界

- 思源版本：`3.8.7`（`D:\RJ\SiYuan\SiYuan.exe`）。
- 临时根目录：`C:\Users\Admin\AppData\Local\Temp\xlc-electron-acceptance-20261015-170953`。
- 工作区：临时根目录下的 `workspace`，内容库为 `XLC验收/常用内容库`。
- Electron 用户数据、配置和镜像程序目录均位于临时根目录；未使用日常 `C:\Users\Admin\AppData\Roaming\SiYuan-Electron`。
- 通过 `--workspace=<临时工作区> --port=6822 --lang=zh-CN --remote-debugging-port=9338` 启动镜像 Electron，使用 CDP 连接真实 Electron renderer。

## 已取得证据

1. Electron 页面实际加载插件 `xiaolv-common`，版本对应当前 `dist`；真实顶栏出现“打开小驴常用（内测版）”。
2. 通过插件协议打开搜索面板，真实 DOM 显示空态、类型/标签/分类筛选与降级提示。
3. 通过真实捕获表单保存“Electron 验收条目”，内核工作区中出现正文块及 `custom-xlc-*` 属性；标签 `electron,验收`、分类 `研发` 均回读成功。
4. 真实 Electron 搜索命中该条目；截图保存在临时根目录 `electron-open-dialog.png`、`electron-search.png`。
5. 设置面板真实打开，显示内容库、AI、变量、导入导出配置；截图为 `electron-settings.png`。
6. 点击 Espanso 导入并确认下一步后，插件目录异步 chunk 真实加载：
   - `/plugins/xiaolv-common/702.js` → HTTP 200，`text/javascript`，56,369 bytes
   - `/plugins/xiaolv-common/795.js` → HTTP 200，`text/javascript`，44,973 bytes
   - `/plugins/xiaolv-common/713.js` → HTTP 200，`text/javascript`，2,535 bytes
   - `/plugins/xiaolv-common/index.js` → HTTP 200，`text/javascript`，332,517 bytes
7. 设置面板展开内容库选择器后，执行 200 次“checkbox 快速切换 + 更改内容库”序列，CDP 页面未崩溃、页面仍存活；截图为 `electron-settings-stress-final.png`。

## 证据边界

- 本次隔离 Electron 证据覆盖插件 onload、真实搜索/捕获、块属性落盘、异步 chunk 和 B-004 压测序列。
- 没有配置宿主 AI 模型，因此真实 AI 端到端仍为“未验证”。
- 发现视图的真实 Electron 手工动作、块引用/嵌入/源正文三种插入动作和 Android 触控未在本轮执行；不能据此解除对应限制。
- 这次为可复现的临时镜像启动方式，镜像只为隔离 `appData`/配置而建，不改动仓库源码或日常工作区；临时进程已关闭。

## T-0077 动作补充证据（第二个隔离副本）

- 使用新的临时工作区 `C:\\Users\\Admin\\AppData\\Local\\Temp\\xlc-electron-r223b-20261016022438`、Electron 镜像 `xlc-electron-r223b-mirror-202610160230`，CDP 端口 `9345`，未触碰日常工作区。
- 通过真实插件服务调用验证普通文本条目的复制：回执 `ok=true`，Electron `navigator.clipboard` 读回文本与源正文一致。
- 通过真实 `openDoc` 激活目标 Protyle 后验证当前编辑器插入：`service.insert({mode:"insert"})` 回执 `ok=true`、`downgraded=false`，目标文档子块由 1 增至 2，新增正文落盘。
- 通过 `service.openSource` 验证普通条目来源打开：回执 `ok=true`、`opened="doc"`，普通手工条目没有 `sourceDocId` 时按设计回退到 `libraryDocId`；不能用空的 `sourceDocId` 作为失败判据。
- 首次打开设置触发插件目录下 `702.js` 请求，响应为 `200 text/javascript`；未观察到站点根 `/702.js` 请求。
- 本轮未形成可采信的指定文档插入、引用条目块引用/嵌入/源正文、来源失效和移动端降级证据；前一次脚本移除设置 DOM 后遗留宿主 Dialog 状态，后续设置重开与压力序列失去有效前置条件。B-004 继续开放。

## T-0077 动作补充证据（第三个隔离副本，2026-10-16）

- 环境：复用临时工作区 `C:\\Users\\Admin\\AppData\\Local\\Temp\\xlc-electron-r223c-20261016023412`，思源内核 `6846`、Electron CDP `9346`；先用真实 `Dialog.destroy()` 关闭设置弹窗，未直接删除宿主 DOM。动作完成后删除源/目标文档和库内引用入口。
- 创建源文档 `20261016025207-8o5j25a`，源块 `20261016025207-3yehxzg`，通过真实插件服务创建 `blockref` 条目 `xlc-mv9wb6or3009c6xq5p`；条目回读确认 `itemType=blockref`、`targetBlockId`、`sourceDocId/sourceBlockId`、标签和分类均落盘，库内正文仍为引用 marker。
- 在三个独立新目标文档中逐项执行：
  - `insert-ref`：回执 `ok=true,downgraded=false`；内核读回 `((20261016025207-3yehxzg 'Electron T-0077 引用条目'))`。
  - `insert-embed`：回执 `ok=true,downgraded=false`；内核读回 `{{select * from blocks where id='20261016025207-3yehxzg'}}`。
  - `insert-content`：回执 `ok=true,downgraded=false`；内核读回源块正文 `Electron T-0077 源块正文：可实时更新。`。
- `copy-content` 回执 `ok=true,mode=copy-content,downgraded=false`，Electron 剪贴板读回源块正文一致；`openSource` 回执 `opened=block`，真实活动文档切换到源文档。
- 指定文档插入沿真实搜索面板 `insertToDoc` 回调执行，返回成功；目标文档内核读回源正文块。
- 删除源块后，`copy` 和 `openSource` 均返回协议失败 `reason=source-missing`；引用条目和临时文档随后清理成功。块引用/嵌入语法本身是否可在源块删除后继续插入未作为成功能力声明。
- 宿主边界：在同一个编辑器连续插入块引用后再插入嵌入，思源会把选区留在嵌入渲染节点的 `.protyle-cursor`，第三次 `insert-content` 可能返回 `insert-failed`；三个动作分别在干净目标文档执行均通过。该现象归因于宿主编辑器选区状态，暂不修改插件以伪造回执。
