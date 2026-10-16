# Electron 壳隔离验收记录（2026-10-16）

> **隔离声明更正（T-0081–T-0083）**：退出复核发现镜像额外启动了日常工作区内核 PID `51040`（`1228`，10:12:15–10:45:26），并发生自动云同步。测试脚本匹配的 renderer/API 确属临时工作区，但整个镜像不满足严格隔离；这些轮次中“日常实例未操作/未触碰”的笼统声明作废，不能声称数据未改或无影响。原始操作结果作为特定临时夹具的局部证据保留，T-0082 另有同镜像多工作区并存限制。详见 [隔离失效记录](electron-isolation-incident-2026-10-16.md)。

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

## T-0080 / R227 固定笔记本与同步后关闭、切换

### 环境与最终构建

- 复用已停止的 R226 临时工作区和镜像，以新主进程 PID `51596` 启动；真实版本仍为思源 `3.8.7`、Electron `44.7.0`，内核端口 `6856`、CDP `9356`。同日 `3.8.8-alpha.1` 内核门禁不能替代这份 Electron 现场证据。
- 验收入口仍为 `scripts/electron-saved-views-acceptance.cjs`，其工作区、镜像进程、loopback 和 renderer 身份检查全部保留。规则保存、关闭确认、取消及设置重开均走真实宿主 Dialog 和生产控件；没有调用内部保存接口制造成功状态，也没有直接删除宿主 DOM。
- 最终部署文件与当前 `dist` 逐字节一致：`index.js` 为 `347242` bytes，SHA256 `8274cea27aedc2814e9618107b1586d1ffd4aed06bd76baf7f6cb0eef5efcdae`；`index.css` 为 `132927` bytes，SHA256 `acf610026b83c2a58705aa8517c242b4e8c602d0b2381edaeaa95d8f29f416db`。回执见最终证据目录 `build-identity.json`。

### 最终正向证据：21/21

- 延续文档/文档树的真实命名、空名称校验、Esc/按钮取消、同名幂等保存、设置恢复、精确标签、默认勾选、锁定引用方式、树根冻结和重复同步检查；文档同步新增两个入口，树同步只新增一个子文档入口。
- 文档同步后点击真实关闭按钮，打开 `.xlc-discovery-close-form`。再次激活关闭控件仍只出现一个确认表单；点击“返回并保留撤销”后，原发现窗口、撤销回执和库内引用完整保留。重新关闭并连续激活两次“仍然关闭”后，确认窗及原窗口正常销毁，引用块 ID/正文/属性不变。笔记本同步后重复同组检查也通过。本检查证明单确认窗口、正常关闭和数据守恒，没有对 `closeSession` 的调用次数计数。
- 树同步仍有可撤销批次时，先打开范围外同级文档，再执行已注册的 `discoverCurrentDocument` 命令。取消关闭后，旧 DOM 仍连接，原树范围、候选、标签、撤销回执和引用完整保持；再次请求并确认后，旧 DOM 确认断开，插件自动打开所请求文档的发现窗口，范围为 `document`、标签为空、唯一候选为该同级文档的“范围外模板”。旧批次的引用没有被撤销或重复写入。
- 从真实未打标签的入口文档打开笔记本发现，精确标签得到四个候选。保存规则实际落盘为 `scope=notebook`、`targetDocId=""`、`targetNotebookId=原笔记本ID`，不依赖入口文档 ID。
- 通过真实 `/api/filetree/moveDocs` 将入口文档移到另一笔记本，回读 `getBlockInfo.box` 确认移动成功；随后重载 renderer，先打开已经移出的入口文档，再从设置页打开该规则。发现范围仍为保存的笔记本，四个匹配来源完整保留，仅尚未收录的同级文档候选被自动勾选，加入方式继续锁定引用。
- 笔记本同步只新增第四个来源的引用入口。对四条引用逐项回读：`custom-xlc-target`、`custom-xlc-src-block` 精确等于预期来源集合，`custom-xlc-src-doc` 精确对应各来源文档，类型全部为 `blockref`；去掉末尾物理 IAL 后，每条正文严格等于单一引用 marker，没有复制源正文。确认关闭后再次打开笔记本视图，四条均显示已在库中、未选中且禁用，同步按钮禁用，库内入口 ID 集合不变。
- 对源文档、子文档和同级文档的全部源块进行最终快照比较，块 ID、完整 Kramdown 和所有块属性均未改变。最终 renderer 异常 `0`，原生 JavaScript dialog 事件 `0`。

最终证据目录为工作区下 `temp\saved-view-acceptance-1792111798600`，包含 `result.json`、命名/重开截图、`close-confirmation.png`、`switch-close-confirmation.png`、`switch-confirmed-document.png`、`notebook-reopened.png`、`build-identity.json` 和 `cleanup.json`。最终夹具：原笔记本 `20261016084958-wprs9v5`，源文档 `20261016084959-mmsu4oa`，子文档 `20261016084959-jaagd13`，同级文档 `20261016084959-56cf09m`，入口文档 `20261016084959-aqvpwkh`，移出目标笔记本 `20261016084959-ls7g22y`；专用库仍为 `20261016061211-7pfws4w`。

本次正向运行仅重载 renderer `2` 次：第一次建立干净插件生命周期；第二次在所有带批次的会话已通过真实确认关闭后，验证入口文档移动后的持久化规则恢复。同步后的关闭、取消、重复确认、重新打开与切换均没有使用重载绕过关闭流程。R226 中“原生关闭确认未覆盖”的限制，已由本轮宿主 Dialog 替代实现及真实交互证据覆盖。

### 真实回归注入与恢复

- **取消误接确认**：只在隔离部署 `index.js` 中把取消按钮 click 处理改为激活确认按钮，验收脚本保持原交互。七项通过后，`Cancel must preserve the discovery window` 准确失败，实际窗口数 `0 !== 1`，进程退出 `1`；证据为 `temp\saved-view-acceptance-1792111331275\result.json`。
- **笔记本目标错配**：只在隔离部署 bundle 的保存视图重开参数中，将 `initialNotebookId` 错接到同次夹具入口文档已移入的笔记本。十三项通过后，`Moving the anchor must not retarget the saved notebook` 准确失败，候选 `0 !== 4`，进程退出 `1`；证据为 `temp\saved-view-acceptance-1792111648159\result.json`。失败后真实 controller 的 `initialNotebookId` 回读为 `20261016084728-ys6uou1`，精确等于该次夹具的移出目标笔记本。该负向使用保留原 19 项流程的临时脚本副本，以隔离当时旧构建尚未修复的切换续开缺陷；笔记本相关断言没有放宽。
- 两种 bundle 注入均在 `finally` 恢复原字节，恢复后的 SHA256 与注入前一致（`181d8795259cef8fa56d70d3f5598b77309e7e72623e896e1df33c1578a05ee5`）；合并回执为工作区 `temp\r227-negative-injections.json`。随后部署包含续开修复的最终构建，完整 `21/21` 正向通过。
- **续开缺陷实测**：新增切换检查先在尚未加入 `onClosed` 续开的旧构建运行；取消保留原树通过，确认后旧 DOM 销毁但新发现窗口未创建，`waitScan` 超时，进程退出 `1`，证据为 `temp\saved-view-acceptance-1792111403755\result.json`。这次运行原计划注入笔记本错配，但被更早的真实续开缺陷截断，因此不将其计作笔记本负向成功。最终构建的同一切换流程已完整通过。
- R226 的“引用 marker 混入复制正文”和“源块 witness 属性被改写”负向证据继续有效；本轮未重复注入这两种违规。没有用 native dialog stub 代替真实宿主交互。

### 退出与保留边界

再次核验 renderer 工作区和本轮主 PID 后，隔离 `/api/system/exit` 返回 HTTP `200`；随后只停止精确镜像路径下已验证的 PID `51596`、`33916`、`19344`、`52992`、`15028`。退出复查镜像进程为 `[]`，`6856/9356` 监听为 `[]`；所有夹具及证据保留，日常实例未操作。Android、真实 AI、无活动编辑器降级和 B-004 的其他既有边界不因本轮通过而解除。

## T-0081 / R228 无编辑器、连续动作与冻结目标失效

### 环境和构建

- 启动前精确核对 R226 镜像路径下进程为 `[]`，`6856/9356` 无监听；随后启动该临时镜像，主进程 PID `36280`。真实版本仍为思源 `3.8.7`、Electron `44.7.0`，本脚本匹配的 renderer/API 工作区不变。后续该镜像还启动日常工作区，不能以此启动检查证明全生命周期隔离，见本文更正。
- 新入口：`node scripts/electron-editor-actions-acceptance.cjs --cdp http://127.0.0.1:9356 --workspace C:\Users\Admin\AppData\Local\Temp\xlc-electron-r226-20261016061028`。脚本先验证 loopback、临时工作区、镜像主进程与 renderer 身份；测试夹具用真实内核和公开插件 service 创建，没有替换活动编辑器、选区或宿主返回值。
- 最终部署逐字节等于本轮 `dist`：`index.js` 为 `347523` bytes，SHA256 `0c0f6bd7036b7330108548b5d6ca5d22e1e58d4927534b90401acab20a5fd6ad`；CSS 为 `132927` bytes，SHA256 `acf610026b83c2a58705aa8517c242b4e8c602d0b2381edaeaa95d8f29f416db`。证据见最终目录 `build-identity.json`。

### 最终现场结果：7/7

1. 真实 Electron、隔离工作区与夹具核验通过；源/目标文档、源块与库内引用入口由真实内核回读。
2. 通过真实页签 `.item__close` 逐一关闭全部文档，宿主 `hasActiveEditor()` 为 `false`、`currentDocId()` 为 `null`。没有 stub 活动编辑器或直接删除宿主 DOM。
3. 通过已注册 `open` 命令打开搜索，仅唯一标题条目显示。操作前 banner、按钮 title 和 aria-label 均为将来式“当前没有活动编辑器，主操作会复制到剪贴板”，主按钮为“复制”。先向系统剪贴板写入本轮唯一 sentinel，再仅点击一次主按钮，真实剪贴板精确变为预期源块引用 marker；界面完成提示为“当前没有活动编辑器，已复制到剪贴板，可手动粘贴”。另行调用公开协议 `service.insert(...,{mode:"insert-ref"})` 得到 `ok=true, mode=insert-ref, downgraded=true`。UI 动作与协议回执分别观测，不将后者冒充前者的直接返回值。
4. 同一无编辑器搜索窗口的复制按钮真实写入源块正文，精确等于本轮源文本；`service.copy` 回执为 `ok=true,kind=clipboard`。整个无编辑器动作组前后，目标和来源的 `getChildBlocks` ID 集合及每块完整 Kramdown 快照一致。
5. 连续协议动作在一个干净真实目标文档中执行，期间不重开文档、不修造选区：`insert-ref` 回执 `ok=true,downgraded=false`，子块由 `1→2`，唯一新增块正文为精确引用 marker；`insert-embed` 同样成功，子块 `2→3`，唯一新增块为预期原生嵌入语法。第三步 `insert-content` 的真实选区停在 `<div class="protyle-cursor">`，回执 `ok=true,downgraded=true`，子块仍为 `3`、无新增块、全部 Kramdown 快照不变，真实剪贴板精确等于源正文。**此项通过表示安全降级检查成立，不表示第三步插入成功，也不表示同一搜索窗口的冻结目标在独立协议调用之间持续存在。**
6. 另建干净目标 A，真实点击其首段文本后打开搜索。仅点一次主操作，内核确认 A 只新增一个精确引用块；保留搜索 input 的实际 `ElementHandle` 身份。
7. 在原搜索仍打开时用真实 `Ctrl+W` 关闭 A，核对 A 的 Protyle 已销毁且原 input 仍连接；点击同窗“打开来源”，来源 B 真实打开，宿主 `currentDocId()` 精确等于 B。该 input 身份保持不变；主按钮改为“复制”，banner 显示“原插入位置不可用”。再次先写唯一 sentinel，再仅点一次主按钮：剪贴板精确为引用 marker，完成提示为“原插入位置已失效，内容已复制到剪贴板；请手动粘贴”。A 和 B 的全部子块 ID/完整 Kramdown 在点击后 `500ms` 及再过 `1s` 均保持原样，没有重定向写入 B。

最终证据目录：工作区 `temp\editor-actions-acceptance-1792115483966`，含 `result.json`、`build-identity.json`、`frozen-target-copied.png`。最终 renderer 异常 `[]`、原生 dialog 事件 `[]`。夹具：笔记本 `20261016095123-ifk1l3i`，源文档 `20261016095124-qmum2t4`，源块 `20261016095124-7yltehg`，连续动作目标 `20261016095124-k7is0lg`，同窗冻结目标 A `20261016095141-yra2uq6`，条目 `xlc-mvabadog2wyohndf90`。

脚本有两次真实 renderer 重载，分别建立干净起始生命周期、隔离无编辑器段与连续协议段；同窗 A 打开搜索、插入、关闭 A、来源 B 打开和后续复制之间没有重载。目标编辑器用真实文本点击激活；`openDoc` 创建页签本身不被假定为有效活动编辑器。

### 回归失败、恢复与剩余边界

- **前置提示真实负向**：只在隔离部署 bundle 的主按钮 title/aria-label 分支把 `insertNoEditorBanner` 改回完成时 `insertNoEditor`，未改 banner 及宿主能力。两项通过后，将来式 label 断言准确拒绝“当前没有活动编辑器，已复制到剪贴板，可手动粘贴”，进程退出 `1`；证据 `temp\editor-actions-acceptance-1792115395401\result.json`。`finally` 恢复原始 bundle 字节，前后 SHA256 均为 `0c0f6bd7036b7330108548b5d6ca5d22e1e58d4927534b90401acab20a5fd6ad`，回执 `temp\r228-negative-hint.json`；恢复后上述完整 `7/7` 通过。
- **tracked range 生命周期实测**：在 `ActionExecutor.run` 未等待 `execute` 的中间构建，首个 `insert-ref` 返回 `ok=true,downgraded=true`；脚本准确失败，证据 `temp\editor-actions-acceptance-1792113951650\result.json`。主线程随后以源码测试复现提前释放 handle，改为等待 execute 完成后释放；最终构建的前两个连续动作已真实插入。最初怀疑是空白点击的判断不作为最终归因。
- **嵌入后的选区边界**：最终构建首次严格要求三次都插入时，第三步 `insert-content` 被“未新增内核块”检查拒绝，证据 `temp\editor-actions-acceptance-1792114958416\result.json`，三步完整回执均保留。随后只把验收定义调整为“精确插入或可验证安全复制”两种诚实分支，未伪造插入成功。该失败夹具另有一次明确的人工重选文本恢复实验：重选真实段落后 `insert-content` 回执 `downgraded=false`，内核新增正确正文块；见同目录 `manual-selection-recovery.json`，不能把这次重选算作无干预连续成功。
- Android、真实 AI 与 B-004 仍未由本轮解除。连续协议第三步的自动插入限制继续保留，产品以复制降级表达，不自动重试写入新编辑器。

### 同窗来源快照门禁补证与交接

- **误写来源 B 负向**：复制仓库验收脚本到本工作区 `temp\r228-negative-source-snapshot\electron-editor-actions-negative-source.cjs`，仅在 `frozenClipboard` 精确断言之后、A/B 完整快照断言之前，调用真实 `/api/block/appendBlock`，向本次负向夹具 B `20261016095810-sa3d8m1` 追加 `injected-redirect-mvabj30q`。原交互及快照断言不变。前六项通过，`The newly opened source must not receive a redirected insert` 准确失败，差异为新增真实段落 `20261016095845-za8dv3c`，进程退出 `1`；证据 `temp\editor-actions-acceptance-1792115890436\result.json`。该违规仅写入这次负向的专属 B，没有改生产代码或其他源文档。
- 临时副本保留在证据目录，仓库原脚本字节始终未变，注入前后 SHA256 均为 `de20f9c3e674232181e598b5e512621c841bb2f390d959613f9db72c752f2fd8`；真实 API 回执、失败点、原脚本身份见 `temp\r228-negative-source-snapshot\injection-report.json`。
- 随后运行仓库原脚本完整复验，最终再次 **7/7**，renderer 异常 `[]`、原生 dialog 事件 `[]`。最终证据目录更新为 `temp\editor-actions-acceptance-1792115945932`，含 `result.json`、`frozen-target-copied.png`、`build-identity.json`；版本仍为思源 `3.8.7` / Electron `44.7.0`，部署 JS/CSS 与上述 `dist` 字节和 SHA256 一致。最终正向 B `20261016095906-009i5dr`、A `20261016095930-bttuhqy`；连续动作仍为引用和嵌入真实新增，第三步正文诚实复制降级、目标全部块不变。
- 按后续压力验收交接要求，保留测试 Electron 主进程 PID `36280` 和 `6856/9356` 监听，不执行退出；本阶段不生成退出完成回执。本脚本指定工作区为 R226 临时副本；镜像后续多工作区并存使“日常实例未操作”的环境声明失效，见本文更正。

## T-0082 / R229 设置压力的有限矩阵与完整归因

### 环境、隔离与实际交互

- 复用 T-0081 交接的主进程 PID `36280`，工作区为 `C:\Users\Admin\AppData\Local\Temp\xlc-electron-r226-20261016061028`，内核 `6856`、CDP `9356`。未新启宿主、未退出宿主、未修改生产源码或部署构建。现场回读为思源 `3.8.7` / Electron `44.7.0` / Chromium `152.0.7977.130`。
- 新增 `scripts/electron-settings-stress-acceptance.cjs`。连接前检查显式绝对临时工作区、`xlc-electron-*` 名称、临时镜像可执行文件真实路径，以及命令行精确工作区和端口对应的唯一主 PID；连接后再通过 CDP `SystemInfo.getProcessInfo` 对照 browser PID，并核对 renderer 工作区与 Electron 身份。非 loopback、HTTPS、凭据、CDP 子路径、重复参数及非法步数均在连接前被拒绝。
- 使用已配置的独立 doc 库 `20261016061211-7pfws4w`，没有替换或新建库配置；每次运行仅新增唯一来源文档、引用条目和独立目标夹具。完整前置组用真实目标文本点击激活编辑器，从已注册搜索命令进入窗口，输入唯一标题，真实复制来源正文并回读系统剪贴板，再仅点一次主按钮插入，内核确认目标只新增一个精确引用 marker。随后通过可见宿主关闭控件或聚焦弹窗真实控件后按 Escape 关闭，等待实际 DOM 断开；没有删除宿主 DOM、强点隐藏控件或穿过遮罩。
- 每组重载建立独立 renderer 生命周期；直接设置对照不执行搜索/插入前置。设置经插件正常入口打开，强断言六个开关、至少四个可用开关、唯一官方 Dialog、真实库选择器已构建并展开。快切采用固定 seed `20261009`，每步调用实际 checkbox/button click handler，校验每次选中状态和 picker 的 `aria-expanded` 确实变化，步间约 `30ms`；人工速度组采用 Playwright 正常 pointer 点击，两动作各留 `250ms` 间隔。后者是自动化人工速度对照，不冒充人工现场验收。
- 每组结束仅通过真实 UI 恢复本轮改变的开关，等待实际 `400ms` 侧车节流后再继续；记录完整 state/config 前后快照，配置逐项相等。搜索历史、使用计数等真实前置动作自然产生的侧车状态保留，不用整份旧状态覆盖。来源与目标的子块 ID/完整 Kramdown 均比较不变。
- 部署 JS 为 `347523` bytes / SHA256 `0c0f6bd7036b7330108548b5d6ca5d22e1e58d4927534b90401acab20a5fd6ad`；CSS 为 `132927` bytes / SHA256 `acf610026b83c2a58705aa8517c242b4e8c602d0b2381edaeaa95d8f29f416db`，与 T-0081 构建一致。每次证据目录包含 `result.json` 和逐步 `trace.jsonl`，异常保留完整 CDP `Runtime.exceptionThrown` 及异步 parent callFrames、URL、行列，不用只有无堆栈的 `pageerror` 代替归因。

### 正式矩阵：11/11

命令为 `node scripts/electron-settings-stress-acceptance.cjs --cdp http://127.0.0.1:9356 --workspace C:\Users\Admin\AppData\Local\Temp\xlc-electron-r226-20261016061028 --rounds 3 --steps 200`；`--rounds` 范围 `1..5`，`--steps` 范围 `1..250`，人工速度组至多十二步，避免无限加压。

| 组别 | 实际步数 | 实际开关激活 | 完整搜索/复制/插入前置 | 异常 / 崩溃 |
| --- | ---: | ---: | --- | --- |
| 直接设置快切对照 | 200 | 465 | 无 | 0 / 无 |
| 完整前置快切 1 | 200 | 464 | 有 | 0 / 无 |
| 完整前置快切 2 | 200 | 455 | 有 | 0 / 无 |
| 完整前置快切 3 | 200 | 453 | 有 | 0 / 无 |
| 完整前置人工速度 pointer | 12 | 12 | 有 | 0 / 无 |

合计 `812` 步、`1849` 次实际开关激活；每步均有真实 picker 状态反转，禁用开关不会被计入激活数。五组 renderer 均存活，正常关闭后可见 Dialog 均为零；Runtime、pageerror、console error、native dialog 事件全部为零，`styleNullExceptions=0`、`crashed=false`。正式证据目录为工作区 `temp\settings-stress-acceptance-1792117848679`。这表示本轮有限矩阵没有复现，**不代表 B-004 已解除，也没有证明旧版硬崩溃和宿主 `null.style` 的根因**。

### 真实负向、恢复正向与无效尝试

- **源文档快照负向**：在临时脚本副本中，保持原交互和原不变性断言不变，仅在首组压力结束后通过真实 `/api/block/appendBlock` 向本次专属来源文档追加 `XLC_R229_NEGATIVE_SOURCE_WITNESS`。原断言 `Settings pressure must leave the source unchanged` 准确显示新增块 `20261016103416-ckjd3md` 的 ID/Kramdown 差异并失败，退出 `1`；`finally` 通过真实 `/api/block/deleteBlock` 删除该唯一 witness，API 成功回执一并保留。证据 `temp\settings-stress-acceptance-1792118053216\result.json`。
- **未知异常归因负向**：另一临时副本在完整小样矩阵后，通过真实 renderer `setTimeout` 抛出 `XLC_R229_NEGATIVE_UNKNOWN_RUNTIME`。CDP 实际捕获一条 `unknown` 异常，`pageerror` 与同条 CDP 配对；原门禁 `Plugin or unknown runtime exceptions require investigation` 准确失败，退出 `1`，没有把无可归因 URL 的异常并入宿主白名单。证据 `temp\settings-stress-acceptance-1792118057627\result.json`。
- 临时副本、注入日志、API 回执和合并报告保留于 `temp\r229-negative-injections-1792118052503\injection-report.json`。仓库原脚本字节始终未改，前后 SHA256 均为 `2328be3c862fede78e2baecdca9cc78b5e91dafb31dc934448fe76553ebcc6eb`。负向之后运行原脚本 `--rounds 1 --steps 2`，三组各两步、共 `16` 次实际开关激活，最终 **7/7**，全部异常为零、设置恢复且源/目标快照不变；证据 `temp\settings-stress-acceptance-1792118115472\result.json`。该最终小样证明恢复后的原脚本有效，正式压力数字仍取前述 `11/11` 目录，不把小样冒充正式矩阵。
- 三次较早小样仅定位验收脚本问题，均未观测到 renderer 异常或崩溃：`1792116152837` 在宿主启动过渡 Dialog 消失前断言，尚未执行压力；`1792116574293` 完成两步且恢复设置后尝试点击隐藏的宿主 close SVG 超时；`1792116983921` 的真实插入后焦点回到编辑器，Escape 未关闭搜索窗口而超时。分别修正为等待宿主启动生命周期、尊重可见关闭控件、先聚焦真实弹窗控件再 Escape。首次完整小样 `temp\settings-stress-acceptance-1792117682821` 已 `7/7` 通过；上述失败不计为 B-004 复现，也不用于解除阻塞。
- 离线 `node --check`、脚本格式检查、两个参数正向、十二个非法参数负向和六个异常归因检查均通过。没有修改插件生产代码、实际 AI 配置、兄弟插件或集市。B-004 保持开放；后续若需定位旧症状，仍需同内核可重复触发序列或实际崩溃堆栈。
- 本阶段结束保留隔离主进程 PID `36280` 和 `6856/9356`，已交接给下一阶段独占 UI；没有生成退出完成回执。

## T-0083 / R230 协议入口等待期间切页与关闭目标

### 身份、夹具与延迟方法

- 在 T-0082 串行交接后复用同一可销毁思源 `3.8.7` / Electron `44.7.0` 副本，镜像主 PID `36280`，内核 `6856`、CDP `9356`。入口为 `scripts/electron-protocol-target-acceptance.cjs`，复用 T-0082 严格临时目录、命令行、镜像检查，并在连接后核对 CDP `SystemInfo.getProcessInfo` 的 browser PID；renderer 的实际工作区也必须匹配。
- 通过真实内核和公开 `service.save/get` 创建本轮专属来源、引用条目和两组干净 A/B 文档。每次先实际打开 B，再激活 A、点击其真实段落文本；检查选区的 anchor 为非空文本节点且位于 A。调用 `service.insert(...,{mode:"insert-ref"})` 后，只用 Playwright route 暂停该条目物理块的第一次真实 `/api/attr/getBlockAttrs` 请求；等待确实命中，再切到 B 的真实文本，最后 `route.continue()` 放行原请求。没有伪造响应、替换 service/get、stub 宿主/编辑器、删除 DOM 或人工注入写入。
- 两组分别保留 A 连接、真实点 A 页签关闭按钮后确认 A Protyle 销毁；随后都激活已打开 B 的真实文本。报告记录请求 hold/release 时间、真实选区、完整公开回执、系统剪贴板，以及 A/B 的全部子块 ID、完整 Kramdown 和属性；完成后 `1100ms` 及再过 `500ms` 回读，检查延迟写入。

### 旧部署自然负向：两组均检出误写 B

- 使用未经篡改的旧部署（`index.js` `347523` bytes，SHA256 `0c0f6bd7036b7330108548b5d6ca5d22e1e58d4927534b90401acab20a5fd6ad`），完整运行同一脚本，证据 `temp\protocol-target-acceptance-1792118260724\result.json`。身份和夹具两项通过；两组均被 `later active B must not receive the pending insert` 拒绝，最终退出 `1`，renderer 异常与原生 dialog 均 `[]`。
- **A 仍连接时切 B**：A `20261016103742-svc6svl` 原块不变，B `20261016103742-v2mq766` 却新增引用块 `20261016103743-aysff7k`；正文精确为本轮预期 marker `((20261016103742-jgmlwcx '协议目标条目mvacxx3r'))`，公开回执为 `ok=true,mode=insert-ref,downgraded=false`。
- **等待期间关闭 A 再切 B**：A `20261016103744-oqkm7vi` 的 Protyle 确认销毁、原块不变，B `20261016103744-dzi2xf5` 却新增 `20261016103745-o8d56ii`，正文同样是精确 marker，回执仍为非降级成功。两次 A/B 选区均为真实文本，负向是旧产品自然发生的目标重定向，不是无效选区造成的降级，也不是测试另造违规块。

### 修复部署正向：4/4，原编辑器验收再过 7/7

- 将主线程完成的构建部署到同一隔离插件目录，逐字节核对等于当前 `dist`，重载后运行原脚本。最终 JS `347852` bytes，SHA256 `d35df4117be430cb9dd987a5aa65a4ae41a3dfef11d8a0872ceb052a50250857`；CSS `132927` bytes，SHA256 `acf610026b83c2a58705aa8517c242b4e8c602d0b2381edaeaa95d8f29f416db`。身份文件为最终证据目录 `build-identity.json`。
- T-0083 最终 **4/4**，证据 `temp\protocol-target-acceptance-1792118414814\result.json`，附两组截图。A 仍连接时，A `20261016104016-fr2tdtq` 唯一新增 `20261016104017-1gkm9ym`，去掉末尾物理 IAL 后精确等于 `((20261016104016-7ark3cz '协议目标条目mvad17zd'))`；B `20261016104016-5ce8exj` 全部快照不变，回执 `ok=true,mode=insert-ref,downgraded=false`，没有延迟重复。关闭 A `20261016104018-npyk3ix` 后切到 B `20261016104018-2noilfu`，回执 `ok=true,mode=insert-ref,downgraded=true`，真实剪贴板精确等于同一 marker，A/B 全部快照不变。来源文档全部块快照及库配置均不变；renderer 异常、原生 dialog 事件均 `[]`。
- 随后在同一新构建运行既有 `scripts/electron-editor-actions-acceptance.cjs`，再次完整 **7/7**，证据 `temp\editor-actions-acceptance-1792118451043\result.json`。无活动编辑器复制、同窗关闭 A 打开来源 B 的冻结目标不误写均通过。连续协议引用/嵌入分别真实新增，第三步正文仍因嵌入后的宿主选区不可用而明确复制降级，目标子块数保持 `3`；不将其标为第三次插入成功。

### 本副本最终退出

- 再次核对精确镜像主 PID、CDP browser PID 和 renderer 工作区后，首次 `/api/system/exit` 虽 HTTP `200`，JSON 为 `code=2`，只提示隔离工作区内已有更新安装包；这不是退出成功，没有执行安装。读取本镜像的官方 Electron `main.js` 和 app `common` bundle，确认其“取消安装并退出”分支使用 `execInstallPkg:1`；再次发送 `{force:true,setCurrentWorkspace:false,execInstallPkg:1}`，实际 HTTP `200,code=0`。
- 内核退出后的清理前列表实际仍包含镜像主进程、renderer 以及 PID `51040`（日常工作区、端口 `1228`），此前“只剩主进程”的表述错误。直接停止的是 PID `36280`，其后列表中的其他进程消失；不能据此宣称日常内核未受影响。最终镜像进程 `[]`，`1228/6856/9356` 监听 `[]`，没有执行更新包。两份最终证据目录均有 `cleanup-request.json` / `cleanup.json`，`completed=true` 只证明进程/端口清理结果，不证明工作区隔离或无影响；原始越界命令行保留在回执中。详细时间、同步事实及未知项见 [隔离失效记录](electron-isolation-incident-2026-10-16.md)。
- T-0082 的未复现结果继续保持原构建和有限矩阵的边界；本轮协议目标修复不解除 B-004、Android 或真实 AI 限制，也不解除嵌入后的宿主选区边界。
