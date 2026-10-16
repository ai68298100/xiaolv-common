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

## T-0079 / R226 保存视图真实表单与引用同步

### 环境与复现入口

- 本轮固定镜像：思源 `3.8.7`、Electron `44.7.0`。这与同日另行运行的 `3.8.8-alpha.1` 隔离内核门禁是两层独立证据，版本不可混用。
- 工作区：`C:\Users\Admin\AppData\Local\Temp\xlc-electron-r226-20261016061028`；镜像：同父目录 `xlc-electron-r226-mirror-20261016061028`；内核 `6856`、CDP `9356`。最终验收主进程 PID `16656`。
- 脚本：`scripts/electron-saved-views-acceptance.cjs --cdp http://127.0.0.1:9356 --workspace C:\Users\Admin\AppData\Local\Temp\xlc-electron-r226-20261016061028`。脚本先验证 loopback CDP、临时工作区、镜像进程及 renderer 实际工作区完全一致，再创建本轮独立夹具；不输出令牌。
- 夹具只通过真实内核 API 创建；初始发现通过已注册命令打开。保存规则必须点击真实按钮、填写宿主 Dialog 并提交，不直接调用保存方法或伪造侧车状态。

### 现场发现与修复

- 旧“保存视图”按钮在真实 Electron 中调用 `window.prompt` 一次后抛出 `Error: prompt() is not supported.`；原实现吞掉异常，回执为空、保存视图仍为零。已改为宿主命名 Dialog。
- 设置重开视图后，内部选择集合和“已选 2 项”正确，但行复选框仍未勾选；已将自动选择放在列表渲染之前，最终真实 DOM 断言通过。
- 长标签计数胶囊在筛选行发生重叠；已改为正常文档流中的可换行区域，最终截图核对通过。
- 文档树子文档预览误报 `source-changed: source document moved outside the scanned document tree`。真实根路径为 `/根ID.sy`，子路径为 `/根ID/子ID.sy`；已按实时物理根路径去除 `.sy` 后做严格路径段边界比较，树同步恢复通过。

### 最终正向证据：11/11

1. 实际 Electron 身份和工作区隔离核验通过。
2. 原生标签精确筛选只保留两个目标块，排除同名加后缀的标签。
3. 空名称显示错误；Esc 和取消按钮均不保存。
4. 真实命名表单按 Enter 保存文档规则，名称、标签和目标 ID 均正确，并确认真实 `state.json` 已落盘。
5. 同名同规则再次保存保持原视图 ID，不增加规则数量。
6. 切到范围外文档后，从设置页真实打开文档视图；设置行销毁、标签预填、两候选真实勾选、引用方式锁定、按钮显示“同步到常用库”。
7. 首次同步回执“新增 2，跳过 0，失败 0”；内核回读两条 `blockref`。去掉末尾物理 IAL 后，每条正文严格等于预期块引用 marker，没有混入源正文；`target`、`src-block`、`src-doc` 均精确匹配来源。
8. 重载真实 renderer 后再从设置打开，同样两源块均显示“已在库中”、未选中、同步按钮禁用；库内引用块 ID 集合不变，没有重复入口。
9. 文档树视图在另一文档活动时仍保留保存的根 ID；三条目标候选仅新增子文档候选自动勾选，不出现范围外块。
10. 树同步只新增子文档入口；三条引用的 `target` 和 `src-block` ID 集合精确等于两个根文档源块加子文档源块，引用正文均只有 marker。
11. 源文档和子文档快照逐项比较通过：块 ID、完整 Kramdown 和全部块属性未变；renderer 异常计数为 `0`。

最终夹具：源文档 `20261016082021-h6nqvsx`，子文档 `20261016082021-xp2uufr`，范围外文档 `20261016082021-yon20qt`；专用库 `20261016061211-7pfws4w`。证据目录为工作区下 `temp\saved-view-acceptance-1792110021145`，含 `result.json`、`document-naming.png`、`document-reopened.png`、`tree-naming.png`、`tree-reopened.png`。

### 负向验证与证据边界

- **引用正文负向**：临时注入脚本，通过真实 API 将本轮引用块改为 `((源ID '标题')) injected copied source body`。严格 marker 断言准确失败，进程退出 `1`；证据为 `temp\saved-view-acceptance-1792109781021\result.json`。
- **源块完整性负向**：临时注入脚本，在最终快照比较前通过真实 API 将本轮首个源块的 `custom-xlc-acceptance-witness` 改为 `injected-regression`。完整快照断言准确显示该属性和 Kramdown IAL 的差异并失败，进程退出 `1`；证据为 `temp\saved-view-acceptance-1792109911189\result.json`。
- 两次注入均在 `finally` 恢复脚本原始字节并核对一致，随后恢复后的完整正向再次通过 `11/11`。违规仅写入各自负向运行的专属夹具，没有修改其他源文档。
- 隔离保护负向也已执行：外网 CDP 被 `CDP must be loopback` 拒绝；非临时目录工作区在连接前被拒绝。
- **原生关闭确认未覆盖**：带可撤销批次的 `window.confirm` 由 Electron 原生层处理，隐藏实例中没有 CDP `dialog` 事件，真实点击可能阻塞；没有 stub 确认或直接移除 DOM。最终验收共重载真实 renderer `3` 次：一次建立干净插件生命周期，两次在同步后结束临时撤销会话；保存规则均先确认实际侧车文件落盘。该证据证明重载后的规则恢复，不证明原生关闭确认已验收。
- Android、真实 AI、无活动编辑器降级和 B-004 的既有边界不因本轮通过而解除。
- 退出：再次核对 renderer 工作区后，隔离内核 `/api/system/exit` 返回 `200`；随后仅停止精确镜像目录下已核验的 PID `16656`、`18664`、`15004`、`43876`、`44144`。复查该镜像进程数为 `0`，`6856/9356` 均无监听；证据和夹具保留，退出回执见最终证据目录 `cleanup.json`。日常实例未操作。
