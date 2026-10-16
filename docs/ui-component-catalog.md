# UI 组件清单（实现镜像 v4）

该清单索引生产界面，参数和状态以列出的 TypeScript/CSS 实现为准；对应的视觉样例在唯一权威原型 [`docs/design/prototype.html`](design/prototype.html)。`prototype-r187.html` 是旧工作流演示，不是规范来源。原型中的静态状态样例不能单独证明交互已接线；未经过生产 smoke、交互审计或宿主验收的能力会明确标出。

## 统一约定

| 约定 | 当前实现边界 |
|---|---|
| 主题与样式 | [`tokens-r187.scss`](../src/styles/tokens-r187.scss) 提供局部颜色、字阶、行高、间距、圆角、阴影、层级和动效变量；[`index.scss`](../src/styles/index.scss) 提供页面布局。样式只作用于插件根和标记过的宿主弹窗。 |
| 异步状态 | 按操作本身呈现适用状态，不要求无意义地为每个动作制造五种状态。搜索列表用 `aria-busy`，状态行 `aria-live`；发现根用 `aria-busy`，状态和回执可读；首设文档选择器提供加载/空/失败重试。 |
| 写入与破坏性操作 | 捕获保存锁定重复提交并对重复正文二次确认；删除经确认；覆盖导入先选冲突策略并确认；发现批次撤销只删除仍满足条件的新块。退出未完成发现时，存在可撤销批次会要求确认。 |
| 文本与安全 | 用户提供的文本以 `textContent` 或表单 value 写入 DOM；列表标题视觉截断但文本仍保留，正文/路径使用换行或局部滚动。不要把未经验证的读屏提示、自动回滚或通用重试写成组件承诺。 |
| 响应式 | 搜索面板在容器宽度 ≤620px 隐藏桌面预览并使用列表形态，不会把预览移到列表下方；移动 sheet 使用宿主 Dialog、安全区与触控尺寸。发现页在 ≤620px 或低高度时改为根滚动、上下两段。 |
| 验收等级 | **生产自动化**指 UI smoke / 交互审计；**隔离内核**指真实思源内核但非 Electron 前端；**现场待验**见 [`BLOCKERS.md`](../BLOCKERS.md)。截图、静态原型或 Chromium 自动化不代表 Electron/Android 宿主验收。 |

## R191/R192 控件与断言映射

`data-xlc-control` 是交互审计使用的稳定语义标识，不参与样式。下表只列已有行为断言的控件；一次点击或输入必须产生可观察结果才算通过。它是搜索主面板首批映射，不代表其余页面或全部条件都已穷举。逐页扩展规则见 [ADR 0019](adr/0019-stable-control-audit-map.md)。

| 控件 ID | 入口 / 前置条件 | 可观察结果 | 审计证据 |
|---|---|---|---|
| `search.input` | 搜索面板已打开；输入关键词或快捷键 | 列表按当前查询更新，键盘选择状态可见；按 Tab 平滑聚焦至预览操作区；空输入按 Alt+ArrowUp 或列表顶端按 ArrowUp 回填最近搜索历史 | `A1`、`B1`、`D1`、`B7`、`B14` |
| `search.clear` | 查询非空 | 查询清空、列表恢复、焦点回到搜索框、清空态隐藏 | `K1` |
| `search.new` | 搜索面板已打开；桌面顶栏按钮 | 捕获表单实际打开；移动底栏复用此 ID，尚未单独触发 | `K2` |
| `empty.scope-fallback` | 收藏/最近范围中有查询词且搜索、provider 均无结果 | 首选动作切换范围到全部，保留查询并重查；结果恢复且焦点回到搜索框，新建动作仍可用 | `B17`、`B18` |
| `filter.type` | 类型筛选选项已加载 | 选择值持久化到筛选服务并触发重查；清空筛选后列表恢复 | `D1`、`D2` |
| `filter.tag` | 标签选项加载完成 | 所选标签保存并用于下一次搜索 | `K7` |
| `filter.category` | 分类选项加载完成 | 所选分类保存并用于下一次搜索 | `K8` |
| `filter.scope.favorites` | 搜索面板已打开 | 收藏范围高亮并传入搜索；切换最近范围后取消高亮 | `K9`、`K10` |
| `filter.scope.recent` | 搜索面板已打开 | 最近范围高亮并传入搜索；与收藏范围互斥 | `K10` |
| `sort.open` | 搜索面板已打开 | 四档排序菜单出现；选中后菜单关闭 | `E1`、`E2` |
| `item.row` | 搜索结果非空 | 点击/键盘移动会更新当前条目；Alt+1~9 直达插入、Alt+Shift+1~9 直达复制；Ctrl/⌘+E 快捷编辑、Ctrl/⌘+D 快捷复制副本、Alt+Delete 快捷删除、Alt+F 快捷切换收藏；非编辑区按 Ctrl/⌘+V 快捷粘贴捕获草稿；前 9 项序号角标显示精准本地化提示与 aria-label | `B1`、`B3`、`B5`、`B6`、`B8`、`B10`、`B11`、`B12`、`B13`、`J1` |
| `item.favorite` | 对应结果行可见 | 收藏服务收到条目 ID，星标和可访问名称同步更新 | `K3` |
| `row.filter.tag` | 条目行包含有效标签 | 点击列表行标签胶囊直接设置标签筛选并重查；再次点击反选清空；不触发整行条目激活或插入 | `B15` |
| `search.drop` | 拖拽文本或链接进入搜索面板 | 展现半透明放置反馈蒙层；离开时移除；松开后自动提取文本/URL 并唤起捕获草稿 | `B9` |
| `preview.insert` | 有可执行结果且目标策略可用 | 调用插入/复制主路径；忙态锁定后恢复 | `A3`、`B2`、`H3`、`H4` |
| `preview.copy` | 当前条目可见 | 复制动作收到当前条目 ID | `K4` |
| `preview.ai` | AI 已启用且当前条目可用 | 打开变换菜单、展示结果并可返回原文动作 | `F1`、`F2`、`F3` |
| `preview.source` | 当前来源有效 | 打开来源动作收到当前条目 ID | `K5` |
| `preview.edit` | 当前条目可见 | 编辑动作收到当前条目 ID | `K6` |
| `preview.mobile-primary` | 移动端结果非空 | 底部主按钮执行当前选中条目：无定向目标时走复制降级，有定向目标时走插入路径；请求中锁定按钮并播报结果 | `K15`、R197 mobile-primary smoke |
| `footer.help` | 桌面或移动面板底栏可见 | 当前视口可达；打开使用帮助内容 | `K11`、`K12` |
| `footer.settings` | 搜索面板底栏可见 | 当前视口可达；关闭搜索面板并打开设置 | `K13`、`K14` |
| `access.retry` | 搜索收到统一鉴权或权限错误，错误空态可见 | 保留原查询与筛选；鉴权提示用户先在思源重新登录，权限提示用户检查目标权限；点击后清除错误并重新加载最新列表 | `test:ui` auth failure/recovery 与 permission failure/recovery（7 项）；Electron 现场仍待验 |

搜索主面板当前所有显式 `data-xlc-control` 标识均已有至少一项交互断言；桌面/移动端共用的 `search.new` 分别覆盖 `K2`、`K16`；键盘与手势链路覆盖 `B1`~`B15`（包含 ArrowDown 移动、Ctrl+Enter 复制、Alt+1 插入、取消恢复、Alt+N/Alt+Shift+N 序号提示与直达复制、Tab 导航、非输入区粘贴捕获、拖拽放置反馈、Ctrl+D 复制副本、Ctrl+E 快捷编辑、Alt+Delete 快捷删除、Alt+F 快捷切换收藏、ArrowUp/Alt+ArrowUp 历史回溯、点击行标签胶囊直选筛选与反选，交互审计增至 56 项）。这不包含尚未加稳定 ID 的动态标签/分类元数据 chip、空态 CTA、动作菜单内项目、设置其余区域和发现面板，也不等于全插件逐 DOM 穷举。首设向导映射见下节；后续按页扩展并复用现有 `test:ui`/隔离内核证据。

### R192 首次设置向导

决策见 [ADR 0020](adr/0020-first-run-control-audit-map.md)。`test:ui` 通过生产 DOM 监听验证首设入口和结果。稳定 ID 是页面语义标识，同一类动态文档结果共享 `setup.doc.result`；重复结果按当前项的选中状态区分。

| 控件 ID | 入口 / 前置条件 | 可观察结果 | 审计证据 |
|---|---|---|---|
| `setup.mode` | 首次设置向导打开 | 改变方式后相关文档/笔记本/标题区显隐和下一步条件同步；过期验证不会切错步骤 | setup、stale notebook validation smoke |
| `setup.docs.query` | 文档或文档树方式 | 输入词后开始加载；乱序返回时只显示最新查询结果 | doc-picker loading/failure/retry、stale-response smoke |
| `setup.doc.result` | 文档检索有结果 | 选择项高亮、下一步可用；完成后配置保存其文档 ID | step transition、setup completion smoke |
| `setup.docs.retry` | 文档检索失败且错误原因可见 | 点击后重新加载，成功恢复结果与下一步 | doc-picker loading/failure/retry smoke |
| `setup.notebook` | 笔记本加载完成且有可选项 | 选择笔记本后更新创建或根文档验证条件 | empty-notebook、notebook retry、existing setup smoke |
| `setup.notebook.retry` | 笔记本列表失败，或根文档检查失败 | 按当前失败语境重试列表加载或根目录检查；空笔记本不显示误导性重试 | notebook load failure/retry、root-doc retry smoke |
| `setup.newdoc.title` | 新建库方式 | 标题为空时不允许创建；输入有效标题后创建按钮可用 | setup、create-library smoke |
| `setup.newdoc.create` | 已选笔记本、标题非空，用户确认 | 创建成功后应用目标文档和 `createdDocIds`，关闭向导；执行中锁定重复提交 | create-library smoke（专项确认桩） |
| `setup.later` | 首次设置允许稍后再配置 | 关闭向导，不写入库配置 | setup later smoke |
| `setup.next` | 已选文档，或笔记本通过根文档检查 | 进入确认步骤；验证失败留在第一步 | step transition、empty notebook、root-doc retry smoke |
| `setup.back` | 第二步确认页 | 返回选择页并保留已选目标 | setup completion smoke |
| `setup.finish` | 第二步确认页且目标有效 | 保存已选目标并关闭向导；不把确认页仅显示误当完成 | setup completion smoke；移除 ID 的负向验证 |

首设全流程和状态已由 `test:ui` 覆盖，但这些 ID 目前服务于 smoke 与组件清单，不构成全插件 DOM 穷举。设置其余区域、导入导出、发现与菜单仍待逐页映射。

### R193 捕获表单核心控件

决策见 [ADR 0021](adr/0021-capture-form-control-audit-map.md)。稳定 ID 由生产 DOM 的 `test:ui` 触发；保存写入结果来自 harness 可观察 payload，不等同真实思源块持久化验收。

| 控件 ID | 入口 / 前置条件 | 可观察结果 | 审计证据 |
|---|---|---|---|
| `capture.type` | 捕获或编辑表单打开 | 选择条目类型；URL 类型提交时校验正文 URL | capture core smoke |
| `capture.content` | 捕获或编辑表单打开 | 正文输入；错误时聚焦并关联原因；输入后清除错误状态 | required/URL validation 与 correction smoke |
| `capture.title` | 捕获或编辑表单打开 | 标题值写入创建 payload | capture save payload smoke |
| `capture.alias` | 捕获或编辑表单打开 | 别名值写入创建 payload | capture save payload smoke |
| `capture.tags` | 捕获或编辑表单打开 | 逗号分隔标签解析为数组写入 payload | capture save payload smoke |
| `capture.category` | 捕获或编辑表单打开 | 分类值写入创建 payload | capture save payload smoke |
| `capture.save` | 正文有效；blockref 还须有目标块 | 查重后保存；成功按实际 payload 写入并关闭；失败保留表单 | empty/URL rejection、save payload and close smoke |
| `capture.cancel` | 表单打开且未处于提交锁定 | 关闭表单，不调用创建写入 | cancel close/no-write smoke |

正文空值或 URL 错误以行内原因、红色边框、`aria-invalid`/`aria-describedby` 和焦点定位呈现；用户编辑后清除错误，重新提交时再校验。保存中禁用保存与取消，重复内容另经确认。AI 整理、草稿、建议采纳和变量快捷栏详见 R194 稳定控件映射。

### R194/R196 捕获辅助控件与失败恢复

决策见 [ADR 0022](adr/0022-capture-creation-assistance-audit.md)。`test:ui` 触发生产 DOM 控件并核对真实可观察状态；AI 调用由 harness 成功桩提供，不代表思源模型或 Electron 端到端验收。

| 控件 ID | 入口 / 前置条件 | 可观察结果 | 审计证据 |
|---|---|---|---|
| `capture.ai.tidy` | AI 已启用；正文非空 | 空正文禁用；运行时显示“处理中”并锁定重复触发；成功后显示标题、别名、标签、分类建议，结束后恢复按钮；失败在原操作附近显示可读错误和 `capture.ai.tidy.retry` | capture-ai busy、去重、建议呈现、失败重试 smoke（R196） |
| `capture.ai.suggestion.adopt` | AI 整理已返回建议 | 全部采纳只更新建议中实际提供的标题/别名/标签/分类，不改正文；建议行同步展示这些字段 | capture AI suggestion adoption smoke |
| `capture.ai.draft.description` | AI 已启用 | 输入非空描述后生成按钮可用；空描述不发起请求 | capture AI draft smoke |
| `capture.ai.draft.generate` | AI 已启用；描述非空 | 请求中防重复；正文已有内容时先确认，未确认保持原文，确认后替换并触发 input 更新；失败在原操作附近显示可读错误和 `capture.ai.draft.retry` | capture AI draft overwrite-confirmation、失败重试 smoke（R196） |
| `capture.ai.tidy.retry` / `capture.ai.draft.retry` | 对应 AI 操作失败且错误区域可见 | 重试读取最新正文/描述；请求期间再次锁定；成功清除错误并恢复建议/正文；失败保留原因和重试入口 | `test:ui` AI failure recovery smoke（R196） |
| `capture.variable.ask` / `.ask.options` / `.ask.textarea` | 捕获或编辑正文可编辑 | 分别插入文本、选项、多行询问语法 | variable-bar table-driven smoke |
| `capture.variable.snippet` / `.cursor` | 捕获或编辑正文可编辑 | 插入嵌套片段或光标标记语法 | variable-bar table-driven smoke |
| `capture.variable.date` / `.date.offset` / `.random` | 捕获或编辑正文可编辑 | 插入当前日期、日期偏移或随机选项语法 | variable-bar table-driven smoke |
| `capture.variable.doc` / `.clipboard` | 捕获或编辑正文可编辑 | 插入当前文档名或剪贴板语法 | variable-bar table-driven smoke |

变量按钮插入当前选区（或无选区时的光标）并保留正文前后文本；插入后正文重新获得焦点，光标落于新语法之后，捕获正文错误态同步清除。smoke 覆盖全部 10 种语法、折叠光标与选区替换。AI 失败/重试、最新输入读取、旧建议清理和关闭后迟到响应隔离由 R196 smoke 覆盖；真实模型与 Electron 行为仍按 B-001 记录。

## 页面与复合组件

| 组件 / 入口 | 用途 | 可变参数 | 已实现状态与断点表现 | 实现 / 证据 |
|---|---|---|---|---|
| `CommonSearchDialog` | 搜索专用库条目、筛选、预览、插入/复制及条目管理 | 查询词、类型/标签/分类、全部/收藏/最近范围、排序、定向插入目标、AI 能力、移动端标记 | 初始加载及每次搜索刷新；请求代次保护迟到响应；搜索列表显示 busy，状态行播报；失败保留查询并给出状态回执；空库、普通无命中、筛选无命中和空预览各有不同引导。收到 `auth` 时显示 `kernelAuthStatus`，收到 `permission` 时显示 `kernelPermissionStatus`；两者清空过期列表/预览但保留查询和筛选，错误空态只提供 `access.retry`，成功重试后恢复列表。桌面双栏，≤620px 单列，移动端 sheet。 | `src/ui/dialog.ts`；`test:ui`、`test:ix`；桌面/暗色/窄屏/移动截图 |
| 搜索框、清空钮、常驻新建、快捷键提示栏与拖拽放置 | 输入关键词；清空查询；打开新建表单；展示 7 项跨平台快捷键提示（含 Alt+1~9 插入、Alt+Shift+1~9 复制、Tab 切换焦点）；支持外部文本拖拽高亮反馈与非输入区 Ctrl/⌘+V 快捷粘贴 | `query`、搜索占位、清空可见态、新建标题候选、拖拽 overlay | 输入防抖；IME 组合输入结束后刷新；清空后回焦并刷新；新建入口常驻，无结果时提供上下文 CTA。输入标记 combobox 并关联列表；桌面展示 7 项自适应键帽栏；拖拽进入展示半透明放置提示，松手或非输入区粘贴直接唤起预填表单。 | `dialog.ts`；`search` smoke、键盘交互审计、B8/B9 断言 |
| 筛选器、范围、排序菜单 | 类型/标签/分类过滤，全部/收藏/最近范围和四种排序直选 | 选中值、加载选项、排序模式 | 选项读取期间禁用筛选；读取失败在控件提示原因并保留当前筛选；不存在的持久筛选会在读取成功后清理；空筛选可恢复。标签、分类选项加载不是搜索结果分页。窄宽度换行/横向容纳。 | `dialog.ts`；filter recovery smoke、`test:ix` |
| 条目行、徽标、收藏按钮 | 显示类型、标题、摘要、变量数、使用次数和来源状态 | 条目、选中、收藏、来源失效、排序位置、分类彩色徽标、多关键词高亮、拼音定位高亮 | 桌面键盘上下移动和 Enter 执行动作；超过 80 条时固定行高窗口化，按全局索引维护选中态和 `aria-activedescendant`；渲染场景分类彩色胶囊徽标（.xlc-badge--cat，预置 5 种场景语义色与确定性哈希色板）；支持多关键词空格组合跨字段 AND 检索、标题重叠分词安全高亮与基于高频多音词表（银行/重新/会计等）的拼音首字母/全拼汉字物理区间定位高亮；移动端点按只更新选中项与预览，底部主按钮再执行；标题视觉省略、DOM 文本保留，但没有专用的展开全文控件；收藏切换后刷新并恢复搜索焦点；来源失效显示警示图标和提示。 | `dialog.ts`、`index.scss`；`test:ix`、100 条首末键盘/ARIA `test:ui`、R197 mobile smoke |
| 详情预览窗格 | 显示正文、元数据、变量说明、来源状态和主操作区 | 当前条目、预览文本、标签/分类、来源状态、插入目标 | 空预览引导选择条目；来源缺失保留条目并说明；详情动作区单行不可收缩；请求失败或降级说明通过结果状态回执。正文在窗格内部滚动。 | `dialog.ts`；action-menu 与 preview smoke |
| 动作菜单 / AI 变换菜单 | 插入、复制、复制副本、编辑、来源、删除、重置单条使用频次及 AI 变换 | 当前条目、变换类型、能力开关、来源状态、目标文档、使用计数 | 不可用动作按原因禁用；使用计数大于 0 时动态呈现重置使用频次（B16）；删除确认；变换请求中锁定其结果动作，成功展示预览再由用户选择；菜单限高并内部滚动，底部留安全距离。移动端为 sheet/长按菜单。 | `dialog.ts`；action-menu、B16、transform guard smoke；宿主真实菜单仍待验 |
| 使用帮助 | 解释搜索、插入/复制、Alt+1~9/Alt+Shift+1~9 快捷键、Tab 焦点流转、变量及内置模板注释规则 | 文案语言、入口设备形态 | 桌面从快捷键提示和空态进入，移动端从使用帮助入口打开；内容随中英文语言切换。 | `dialog.ts`、`i18n/*.json`；mobile usage guide smoke |
| 捕获 / 编辑表单 `CaptureDialog` | 从选区、块、链接、剪贴板或手动文本新建/编辑条目 | 初始正文、标题、别名、来源、条目类型、标签、分类、AI 能力 | 正文空值/URL 错误时在正文显示具体原因、焦点和 aria 关联，输入后清除；保存期间锁定保存/取消；查重确认、失败保留、成功关闭。桌面随表单滚动到达按钮，移动端操作区吸底。 | `src/ui/capture.ts`；R193/R194 `test:ui` 核心与辅助控件 smoke；隔离内核写链路通过，Electron 仍待验 |
| AI 整理、建议采纳与草稿生成 | 对现有正文生成元数据建议，或按描述起草正文 | AI 启用状态、正文、草稿描述、建议字段、覆盖确认回调 | 整理需有正文，忙时按钮锁定；建议可见后手动采纳且显示所有可采纳字段；草稿描述必填，现有正文覆盖前确认；失败在操作附近以 `role=alert` 保留原因并显示重试，重试读取最新输入，新的整理请求先隐藏旧建议。关闭表单后迟到响应不会污染重开表单。真实模型与 Electron 生命周期仍受 B-001 限制。 | `src/ui/capture.ts`；R194/R196 `capture-ai` UI smoke（失败、重试、关窗隔离）；harness AI 桩仅证明 UI 接线 |
| 快捷变量栏 | 将 10 种变量语法插入正文选区或光标位置 | ask 文本/选项/多行、snippet、cursor/date/date offset/random/doc/clipboard | 表驱动逐项触发；保留选区两侧正文、插入后回焦并将光标置于插入末尾，同时清除捕获正文错误态。窄屏可换行，触屏按钮增大。 | `src/ui/variable-form.ts`、`src/model/variables.ts`；R194 variable-bar `test:ui` smoke |
| 变量填写卡 | 调用带 ask 变量的内容前填入本次值 | 字段名、文本/选项/日期/textarea、默认值、确认/取消回调 | Esc/遮罩取消调用取消回调；Enter 在普通输入确认，textarea Enter 换行；Tab 在字段和按钮间循环；值仅用于本次执行，不回写条目。字段区独立滚动，按钮常驻。当前没有字段级异步校验流程。 | `variable-form.ts`；variable-form smoke、键盘审计 |
| `DiscoveryDialog` 范围与目标选择 | 按需从当前文档/笔记本、指定文档树/笔记本或经确认的全部笔记本发现候选 | 范围、冻结目标、搜索词、分页、筛选、分类和重复策略 | 文档树输入变化清除旧目标；查询按代次提交；笔记本/文档选择加载、空、失败重试分开显示；切换目标需满足前置条件。扫描排除专用库。≤620px 或低高度采用根滚动，上下排列；原型 screen 10 同步亮/暗桌面、窄屏失败/空结果/回执。 | `src/ui/discovery-dialog.ts`、`src/service/discovery.ts`；discovery smoke、`e2e:discovery:iso`；原型 `prototype-discovery.png` |
| 发现扫描状态、筛选和候选列表 | 读取来源块，按类型/状态/文本过滤候选 | 扫描范围、进度、候选页、类型/状态、文本、全库二次确认 | 扫描/收录/撤销使用根 `aria-busy` 锁定互斥动作；停止会等待已发请求、停止后续请求，并保留已完整处理文档的候选且标记扫描未完成；部分来源失败保留其余候选并显示原因；空结果说明范围并提供重扫/改范围入口。每页最多 100 条。 | `discovery-dialog.ts`、`service/discovery.ts`；discovery smoke 与隔离内核 8/8 |
| 发现预览、分类覆盖、收录回执和撤销 | 预览候选、设置默认/单条分类、收录到专用库 | 候选正文、默认分类、单条覆盖、重复内容强制确认、选择集合、撤销批次 | 分类输入最多 64 字；忙碌时锁定分类控件；相同内容需显式确认；单条/批次显示逐项成功、跳过、失败；撤销只删除授权批次中仍未变化的块，逐条显示跳过/失败。关闭时存在可撤销批次会确认。正文长文本可滚动换行。 | `discovery-dialog.ts`、`service/discovery.ts`；服务/UI smoke、`e2e:discovery:iso` |
| 首次设置向导 | 选择专用库位置并确认创建/绑定 | 新建文档、已有文档、文档树、按笔记本；文档/笔记本选择；标题 | 默认推荐在现有笔记本新建专用库文档；文档选择有加载/空/失败重试；笔记本空/失败分开；前置条件不满足禁用下一步/创建；第二步确认后写入。快速开始说明桌面三列、移动纵向。 | `src/ui/settings-dialog.ts`；setup smoke（含文档重试、空笔记本、旧请求校验） |
| 设置弹窗与库选择器 | 更改库，配置 AI、变量/插入、搜索、提供方和数据 | 设置值、库模式、AI/变量开关、provider、索引/统计 | 库选择器展开态和当前库说明；读取或保存错误按所属控件显示；开关即时持久化；重建索引/导入导出锁定重复入口；设置区可滚动。超高速混合切换仍有宿主相关开放问题 B-004。 | `settings-dialog.ts`；settings smoke；B-004 待 Electron 根因核验 |
| 自定义变换与提示词场景包 | 编辑命名 AI 指令并导入/导出场景模板（内置场景包扩充至 20 项，覆盖商务/客服/写作/开发/提示词） | 名称、提示词正文、场景包内容 | 空列表有添加入口；删除配置前确认；名称/提示词输入保存在本地插件设置。真实模型调用依赖思源配置，未在 Electron 端完成端到端验收。 | `settings-dialog.ts`、`service/prompt-pack.ts`、`service/ai.ts`；单测 20 项验证 |
| 数据与模板管理 | 导入导出 JSON/Markdown、内置分类模板、Espanso 导入、标签体检、统计与索引 | 文件、冲突策略、模板包名/分类、Espanso 文本、标签建议 | 冲突策略提供跳过/覆盖/改名；覆盖会确认；导入逐项给结果；模板包导出按分类和变量说明；Espanso 解析问题可读；标签审计仅建议，不自动改写；无条目/空配置有对应状态。 | `settings-dialog.ts`、model import/export；pack/import-policy UI smoke、单测 |

## 基础控件

| 组件 | 参数 / 变体 | 已实现状态表现 | 实现 / 证据边界 |
|---|---|---|---|
| `.b3-button`、`.xlc-btn-primary/ghost/ai` | default、primary、ghost、AI、危险语义；默认/触控尺寸由页面或 `pointer: coarse` 覆盖 | hover、active、focus-visible、disabled 有样式；具体异步按钮各自改文案或禁用；没有统一的通用 loading spinner 组件。 | `tokens-r187.scss`、`index.scss`；页面 smoke |
| 文本框、textarea、select | 文本、日期、多行、选项；错误类 `xlc-input--error` | hover/focus/disabled 样式；捕获空正文错误聚焦并在输入后清除；首设目标加载失败有独立重试。并非所有字段错误都具有统一 `aria-describedby`。 | 各对话框实现；`test:ui` |
| 开关行 | checked/unchecked、禁用或请求中 | CSS 开关和设置标题/副说明；变更即保存。读取或写入失败由上下文提示，不假设统一回滚。 | `settings-dialog.ts`、`tokens-r187.scss` |
| 类型/变量/AI/失效徽标 | text、markdown、url、code、image、asset、ref、var、ai、warn | 文字标签与色彩并用；亮暗主题颜色来自局部语义变量；来源告警附 aria-label/title。 | `dialog.ts`、`tokens-r187.scss` |
| 状态行、计数和回执 | info/loading/error/success 文案由页面提供 | 搜索一般状态使用 `role=status`；鉴权/权限错误升为 `role=alert`，分别显示登录失效/访问权限不足；发现状态/回执 `aria-live`。通用 toast 状态组件未建立。 | `dialog.ts`、`discovery-dialog.ts`；auth failure smoke |
| 空态 | 空库、无命中、筛选无命中、空预览、无发现候选、空 provider、鉴权/权限失败 | 区分原因与下一步：新建、清除筛选、重新扫描、改范围或选中条目。访问错误空态清空失效结果、不出现新建 CTA，仅提供可重试入口；其他主要为空态图形/符号和文案组合，未承诺统一 bitmap 插图。 | 搜索/发现/设置实现；empty、auth recovery smoke |
| 确认弹窗 | 删除、重复内容、覆盖、退出时有撤销批次 | 破坏性动作说明对象/影响后再确认；可条件恢复的发现收录有撤销动作。发现关闭使用官方 Dialog，`discovery.close.cancel` 默认聚焦并保留撤销，`discovery.close.confirm` 重新核验写入后关闭；切换入口在成功关闭后继续，取消不切换。 | `capture.ts`、`settings-dialog.ts`、`discovery-dialog.ts`；ADR 0050 |
| 文档/笔记本选择器 | loading、ready、empty、error | 加载反馈、无匹配/空列表说明、错误原因和可触发重试；当前目标需显式选择或确认。 | `settings-dialog.ts`、`discovery-dialog.ts`；setup/discovery smoke |
| 发现分页器 | 当前页、页数、前后页 | 第一页/最后一页边界按钮禁用；换页保留筛选与候选选择状态；页码以 `role=status`、`aria-live=polite` 播报；结果为空时仍保留 `role=list`/`listitem` 语义。 | `discovery-dialog.ts`；`test:ui` 205 候选场景验证 4 次键盘翻页 |
| 原型状态样例控件 | 屏 11 样例动作 | 仅视觉标签，不触发生产功能；使用非按钮元素以免误认成可点交互。发现页实际静态镜像单独位于屏 10。 | `prototype.html`；通过截图渲染核对 |

## 验收索引与未完成项

| 验收面 | 命令 / 证据 | 当前结论 |
|---|---|---|
| 类型、模型与服务 | `pnpm run check`、`pnpm test` | 本轮最终复跑结果记在 `docs/dev-plan-2026-10-06.md`。 |
| 生产 DOM 状态、亮暗主题和断点 | `pnpm run test:ui`，`docs/design/production-*.png` | Chromium harness 中通过不等于思源 Electron 渲染通过。 |
| 点击、键盘、对话框交互 | `pnpm run test:ix` | 不覆盖所有宿主菜单真实触发或移动真机剪贴板。 |
| 思源内核读写与发现收录 | `pnpm run e2e:iso`、`pnpm run e2e:discovery:iso` | 使用隔离思源内核；不验证插件在 Electron 前端的运行时生命周期。 |
| 密钥与打包 | `pnpm run scan`、`pnpm run check:package` | 本轮最终复跑结果记在开发账本。 |

Electron 安装启用/AI 真实模型、Android 插入和图片二进制剪贴板、设置极端序列宿主异常根因仍分别按 B-001 至 B-004 记录；没有真实环境证据前不把原型或 Chromium 截图当作验收。

## R199 尺寸与断点补充

| 组件 | 桌面尺寸/密度 | 移动表现 |
| --- | --- | --- |
| `CommonSearchDialog` | 960px 宽上限、820px 高上限（均受视口比例约束）；列表行约 72px、预览正文 17px | 全屏 sheet；标题/说明压缩，筛选横向滚动，结果区优先，主操作与底栏可达 |
| `DiscoveryDialog` | 1040px 宽上限、840px 高上限（均受视口比例约束） | ≤620px 根滚动、上下布局，预览保持可读最小高度 |
| 捕获/设置/编辑/变量卡 | 宽高按统一宽松密度档放大，表单仍在主体内滚动 | 保留 44px 触控目标；不沿用桌面字号放大规则 |

本轮自动化证据：`pnpm run check`、`pnpm run build`、`pnpm run test:ui`；真实 Electron 窗口刷新后的裁切和 Android 触控仍需现场确认。
