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
