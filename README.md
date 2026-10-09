# 小驴常用（内测版）

> **内测说明**：插件仍处于持续迭代阶段，部分功能和思源宿主兼容性尚在验证中。欢迎参与内测，并通过交流 QQ 群 **871707735** 反馈 Bug、提交需求。对功能完整性或运行稳定性有较高要求的用户，建议等待正式版发布后再使用。

[![CI](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml/badge.svg)](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/ai68298100/xiaolv-common?label=%E7%89%88%E6%9C%AC&sort=semver)](https://github.com/ai68298100/xiaolv-common/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

基于思源真实文档和块的**常用内容库与快速调用器**。可以保存常用语、邮件回复、地址、提示词、代码和链接，再通过搜索预览、插入或复制；每条内容都锚定真实思源块，来源可回链，失效状态可见。

支持插入前填写变量、日期与随机占位符、片段嵌套、模板包分享、Espanso 配置导入、拼音搜索和 AI 辅助。插件可独立使用，也提供 `xiaolv-common/v1` 公开协议供小驴系列插件接入。

> **最新正式版：v0.3.8（2026-10-10）** · [下载最新版](https://github.com/ai68298100/xiaolv-common/releases/latest)

## 本次更新（v0.3.8）

本版完善常用内容的新增入口、首次设置和使用引导，并补齐相关状态反馈。

新增：更方便地添加和开始使用

- 搜索面板顶栏常驻「＋新建」；搜索无结果时也可直接新建，并把普通搜索词作为可编辑标题候选（`?` 语义搜索不预填）。命令面板也可执行「新建条目」（`⌥⇧N`）。
- 使用说明可从面板底部打开；设置里的首次引导说明了如何新增、搜索、插入和填写模板。
- 内置分类模板增至 16 个可编辑示例，包含使用说明、邮箱、地址和联系方式；需在设置中确认后导入。

优化：首次设置与库状态更清楚

- 首次使用默认推荐在现有笔记本中新建一个专用库文档。现有文档、文档树和按笔记本仍可选择，之后也能在设置中更改。
- 笔记本读取、根目录为空或检查失败时会显示对应状态和重试入口；分类作为条目属性保存在当前内容库文档中。
- 移动端使用说明展示适用的点按和长按操作，不再混入桌面快捷键。

修复：模板包条目正文边界

- 修复 Markdown 模板包解析时把下一条条目元数据并入当前正文的问题。

验证边界：生产界面的自动化检查覆盖上述交互；思源 Electron 桌面端和 Android 真机尚未验收，见[已知限制](#known-limitations)。

<details>
<summary>历史版本更新（点击展开）</summary>

### v0.3.7（2026-10-09）

新增日期算术、随机选择、多行文本变量和 Espanso 配置导入；修复全新工作区首次设置无法完成、来源失效提示滞后、变量填写卡溢出及模板包导入按钮表述不准确等问题。完整记录见 [CHANGELOG.md](./CHANGELOG.md)。

</details>

## 小驴系列插件

小驴系列插件各自独立，可按需安装和组合使用：

| 插件名称 | 一句话简介 | GitHub 仓库 |
|---|---|---|
| [小驴雷切](https://github.com/ai68298100/siyuan-speed-switch) | 思源中的统一导航与工作上下文平台，连接页签、工作台、片段和快捷入口。 | [ai68298100/siyuan-speed-switch](https://github.com/ai68298100/siyuan-speed-switch) |
| [小驴打卡](https://github.com/ai68298100/siyuan-checkin) | 本地优先的习惯、目标打卡与复盘工作台。 | [ai68298100/siyuan-checkin](https://github.com/ai68298100/siyuan-checkin) |
| [小驴人脉](https://github.com/ai68298100/siyuan-contacts) | 在思源中管理联系人、人际关系、组织归属和重要日期。 | [ai68298100/siyuan-contacts](https://github.com/ai68298100/siyuan-contacts) |
| [小驴拾遗](https://github.com/ai68298100/siyuan-glean) | 整理思源剪藏和导入文章，支持状态分拣、阅读管理与日后回顾。 | [ai68298100/siyuan-glean](https://github.com/ai68298100/siyuan-glean) |
| [小驴考试（内测版）](https://github.com/ai68298100/siyuan-exam) | 本地题库备考工作台，支持多格式导入、刷题、模考、错题复盘与 AI 辅助。 | [ai68298100/siyuan-exam](https://github.com/ai68298100/siyuan-exam) |
| [小驴管家（内测版）](https://github.com/ai68298100/siyuan-home) | 管理家庭与生活资料、成员档案、台账、到期提醒和事务跟进。 | [ai68298100/siyuan-home](https://github.com/ai68298100/siyuan-home) |
| [小驴闪卡（内测版）](https://github.com/ai68298100/siyuan-lv-cards) | 思源中的知识捕获、制卡、练习与复习平台，使用内核原生 FSRS 排期。 | [ai68298100/siyuan-lv-cards](https://github.com/ai68298100/siyuan-lv-cards) |
| [小驴常用（内测版）](https://github.com/ai68298100/xiaolv-common) | 基于思源块保存、搜索并快速调用常用语、模板、代码和链接，支持变量填充。 | [ai68298100/xiaolv-common](https://github.com/ai68298100/xiaolv-common) |

交流 QQ 群：**871707735**（反馈 Bug、提交需求、交流使用体验）

## 快速开始

1. **安装并启用**：从 [GitHub Releases](https://github.com/ai68298100/xiaolv-common/releases/latest) 下载 `package.zip`，按[安装说明](#install)启用插件。
2. **设置内容库**：首次打开默认推荐在现有笔记本中新建「常用内容库」文档。也可选择已有文档、文档树或按笔记本；配置完成后可在设置中更改。
3. **添加内容**：在搜索面板点「＋新建」，或从选中文字、当前块、右键菜单和剪贴板捕获。保存时填写用途清楚的标题，并按需要添加标签和分类。
4. **搜索和调用**：搜索标题、正文、标签或分类，选中后插入或复制。桌面可用 `Enter` 插入、`Ctrl/⌘+Enter` 复制；移动端点按条目插入、长按打开更多动作。
5. **建立模板**：在正文中写 `{{xlc:ask:字段}}`，调用时会要求填写；邮箱、地址和联系方式示例可在设置 → 数据与模板中查看并确认导入。导入内容保存在当前库文档，分类记录在条目属性中，不会自动建立笔记本或分类文档。

<details>
<summary>界面截图（点击展开）</summary>

![桌面搜索（双栏预览 + 分类分组 + 变量徽标 + 使用计数，亮色）](docs/design/production-desktop-light.png)

![搜索命中高亮（查询词主色加粗）](docs/design/production-highlight-light.png)

![空库引导（就地新建第一条）](docs/design/production-empty-library-light.png)

![桌面搜索（暗色）](docs/design/production-desktop-dark.png)

![变量填充卡片（插入前询问字段）](docs/design/production-variable-form-light.png)

![动作菜单（分组 + AI 变换 + 自定义指令）](docs/design/production-action-menu-light.png)

![捕获表单（AI 草稿/整理 + 变量快捷插入）](docs/design/production-capture-light.png)

![设置（AI/自定义变换/变量与插入/搜索/提供方/数据）](docs/design/production-settings-light.png)

![模板包导出（分类筛选 + 包名 + 变量清单）](docs/design/production-pack-export-light.png)

![提供方分区](docs/design/production-provider-light.png)

![首跑引导（两步式：选库方式 → 确认落点）](docs/design/production-setup-light.png)

![导入策略（三选 + 推荐档）](docs/design/production-import-policy-light.png)

![窄容器单列降级](docs/design/production-narrow-light.png)

![设置（暗色）](docs/design/production-settings-dark.png)

</details>

## 定位边界

**是**：思源内的常用内容保存与快速复用（搜索 → 预览 → 插入 / 复制 / 打开来源）。

**不是**：密码管理器、剪贴板历史、云同步服务、任意应用自动发送器、JS/SQL 执行器、雷切第二切换器、片段实验室管理器。

<details>
<summary>详细功能与数据说明（点击展开）</summary>

## 核心设计

1. **思源块 = 内容唯一真源**。每个条目是库文档中的一个真实块（普通块或 superblock 包装），插件不复制正文进私有库；删除插件，用户数据零损失。
2. **元数据走用户可见的块属性**（`custom-xlc-id/-type/-title/-alias/-tags/-category/-src-doc/-src-block/-url/-target/-created/-updated`），可在思源属性面板查看和手工修补。
3. **插件侧车（`data/storage/petal/xiaolv-common/`）只存**：库配置、收藏、最近使用、排序偏好、provider 注册——全部版本化、可重建、可迁移。
4. **不用 SQL**：遍历用 `getChildBlocks`（文档序），失效检测用 `checkBlocksExist`，内容用 `getBlockKramdown`（见 ADR 0003 的嵌入块边界说明）。
5. **诚实能力声明**：移动端直接插入、图片位图复制未真机验证前，自动降级为复制并明示「待验证」。

## 捕获入口（八种，覆盖全部右键上下文）

| 入口 | 捕获内容 |
| --- | --- |
| 选中文字 + ⌥⇧S / 右键菜单 | 选区文本（类型自动推断） |
| 右键当前块 / ⌥⇧B | 整块内容（kramdown 保真） |
| 右键块引用 | 被引用块 → blockref 条目 |
| 右键链接 | http(s) → URL 条目；assets/ → 附件条目 |
| 右键图片 | assets/ 图片 → 图片条目 |
| 右键文档树选中文档 | 一键设为常用库（confirm） |
| 剪贴板 / 命令 / 面包屑 / 顶栏 / 编辑器工具栏 | 各场景直达 |

## 数据模型

```
CommonItem（思源块承载）
├── id: "xlc-xxxx"            ← 稳定逻辑 ID（custom-xlc-id，跨工作区/导入导出不变）
├── blockId / libraryDocId    ← 物理定位（库文档中的锚定块）
├── itemType                  ← text|markdown|url|code|image|asset|blockref|structure
├── title / alias / tags / category
├── summary                   ← 有界摘要（≤240 字，内存索引缓存，可重建）
└── source                    ← sourceDocId / sourceBlockId / sourceType（回链）

侧车 state.json（v2）: favorites / recents / sort / uiPrefs / providers
库配置 config.json:    mode(doc|tree|notebook) + containerDocIds / notebookIds
```

## 插入语义（按类型分派）

| 类型 | 插入 | 复制 | 打开来源 |
| --- | --- | --- | --- |
| text | 段落文本 | 纯文本 | 来源文档/块 |
| markdown | 原样 kramdown | Markdown | 来源文档/块 |
| url | `[标题](url)` 链接 | 裸 URL | 外部浏览器（仅 http/https） |
| code | 代码块（保留语言） | 裸代码 | 来源文档/块 |
| image | `![](assets/…)` 图片块 | Markdown 链接（位图复制待验证） | 资源预览 |
| asset | `[名](assets/…)` 链接块 | Markdown 链接 | 资源预览 |
| blockref | `((id '锚文本'))` 引用 | 复制内容（copy-content） | 目标块 |
| structure | 原样结构（superblock 剥壳） | Markdown | 来源文档/块 |

资源缺失时：插入/打开诚实失败，复制链接仍可用；来源块/文档删除显示「来源失效」。

## AI 能力（默认关，ADR 0005）

> 思源智能体已注册只读能力 `xiaolv_common_search`（按关键词搜条目，仅返回标题/类型/标签元数据，`localRead` 声明，不含正文）——在思源「设置→人工智能」的智能体中可直接调用。

使用你在思源 **设置→人工智能** 配置的模型，插件不保存任何密钥：

| 功能 | 入口 | 出域内容 |
| --- | --- | --- |
| **AI 整理** | 捕获表单「✦ AI 整理」→ 自动填标题/标签/分类建议，逐项采纳 | 条目正文（需开启「允许读取完整正文」） |
| **AI 草稿** | 新建表单描述一句话 → 生成模板草稿 | 描述文本（同上） |
| **AI 变换** | 动作菜单 ✦ 润色/缩短/正式化/译英/列表化 → 预览后选「插变换版/插原文」，**原文永不被改写** | 条目正文（同上） |
| **AI 语义找条目** | 搜索框 `?` 前缀（如 `?给客户的道歉回复`）→ 标注「AI 找到的」 | **仅元数据**（标题/别名/标签/分类/摘要），不含正文与来源 ID |
| **AI 标签体检** | 设置面板「✦ AI 标签体检」→ 归并/改名建议清单（只建议，不自动修改） | 仅标签清单 |

另有**动态占位符**（code 条目保持字面，绝不改写代码）：条目中写 `{{xlc:date}} / {{xlc:time}} / {{xlc:datetime}} / {{xlc:weekday}} / {{xlc:title}} / {{xlc:doc}} / {{xlc:path}} / {{xlc:clipboard}}`，插入或复制时替换为当前日期时间/当前文档标题与路径/剪贴板文本（无活动文档等场景替换为空串）。**日期算术**：`{{xlc:date|+3d}}`（三天后）、`{{xlc:date|-1w}}`（一周前）、`{{xlc:date|+2m}}`/`{{xlc:date|+1y}}`（月/年进位按日历钳制）、`{{xlc:date|next_monday}}`（下一个星期一，取严格未来最近一天）。**随机选择**：`{{xlc:random|选项A,选项B,选项C}}` 替换时随机取一项。带参语法分隔符必须用 `|`（`:` 形式会被思源 emoji 短代码损坏，插件永不展开、保留原文）。表达式写坏一律原样保留不吞内容；`xlc:` 命名空间不误伤思源模板；存储内容始终保留模板原文，可在设置关闭。

## 变量、片段嵌套与模板包

| 能力 | 用法 |
| --- | --- |
| **插入时变量填充** | 内容写 `{{xlc:ask:字段}}`（文本）/ `{{xlc:ask:字段\|选项A,选项B}}`（下拉）/ `{{xlc:ask:字段\|date}}`（日期）/ `{{xlc:ask:字段\|textarea}}`（多行文本框，框内 Enter 换行、点按钮插入）→ 插入前弹填充卡片（Enter 插入 / Esc 取消 / Tab 切字段）；填写值仅用于本次不回写库；未填充兜底 `__字段__` 可见可改 |
| **光标落点** | `{{xlc:cursor}}` 标记位置（宿主 API 限制：插入后光标落于内容之后） |
| **片段嵌套** | `{{xlc:snippet:标题}}` 插入时展开为另一条目内容（深度 ≤3、环检测；不可解析落 `__片段：标题__`）；预览/填充卡所见 = 插入所得 |
| **常用排序** | 插入/复制自动记次数（仅本机、可清空）；排序档「⇅ 常用」= 次数 × 最近使用 |
| **模板包分享** | 设置 → 数据 → 「模板包」：按分类筛选、命名导出 `.md` 包（含变量清单）；导入方得到真实思源块——分享的是活的块，不是文本快照 |
| **导入 Espanso 配置** | 设置 → 数据 → 「从 Espanso 导入」：粘贴 Espanso match 配置（base.yml）全文，日期/剪贴板/随机变量与表单字段自动转为本库语法（`[[字段]]`→`{{xlc:ask:字段}}` 等），无等价映射的变量原样保留并逐条列出；同触发词重复导入走冲突策略。TextExpander 专有格式暂不支持 |
| **自定义 AI 变换** | 设置 → AI 助手 → 自定义变换（≤10 条）：你的指令与内置五种并列出现在动作菜单 ✦ 区 |
| **内置分类模板** | 设置 → 数据与模板 → 「导入内置分类模板」：内置 16 个模板（使用说明 / 地址 / 邮箱 / 联系方式 / 客服回复 / AI 提示词 / 研发写作），演示全部变量能力 |
| **快速捕获** | 命令「快速捕获剪贴板为条目」（默认 ⌥⇧V）：无表单一步入库、类型推断、同文自动跳过并提示 |

## 桌面搜索弹窗（调用中枢）

双栏（左列表右预览）/ 窄窗单列 / 移动端底部 sheet；键盘全链路 `↑↓ 选择 · Enter 插入 · Ctrl+Enter 复制 · Alt+1~9 直达 · Esc 关闭`；类型/标签/分类筛选、★收藏置顶、🕐最近、⇅排序、`?` 前缀 AI 语义找、提供方分区（其他小驴插件内容源）；条目显示类型徽标 / 变量徽标 / 使用次数 / 来源失效 ⚠。

## B-001 真机验收（一键脚本）

```bash
pnpm e2e:iso      # 推荐：独立后台验收——用本机思源内核起隔离实例（独立工作区+独立端口），
                  # 自动读取令牌，不影响正在运行的主思源，跑完自动关闭（零依赖，Node 18+）
SIYUAN_ORIGIN=http://127.0.0.1:6806 SIYUAN_TOKEN=<你的令牌> pnpm e2e   # 对指定实例验收
```

脚本镜像插件全部内核流（建库文档 → 追加条目+属性 → 属性回读/kramdown 往返/搜索/导出 → 更新 → 清理核验），逐项输出 ✔/✖ 与汇总。**内核链路已于 2026-10-08 在真实内核 v3.8.6 上验收通过（12/12）**；思源前端（Electron）内的插件运行时验收（安装启用、界面交互、AI 真实模型调用）仍待现场确认。

未配置模型/超时/空响应均诚实提示；总开关与正文出域开关在引导面板「AI 助手」区，任何输入下默认关闭（门禁测试锁定）。

## xiaolv-common/v1 协议

```js
// 其他插件（如雷切、打卡）通过 app.plugins 找到本插件实例：
const common = app.plugins.find(p => p.name === "xiaolv-common");
await common.service.search({text: "客服", itemType: "", tag: "", scope: "all"});
await common.service.insert(itemId, {mode: "insert"});   // insert|copy|copy-content|insert-ref|insert-embed|open
await common.service.copy(itemId);
await common.service.openSource(itemId);
common.registerProvider({protocol: "xiaolv-common", protocolVersion: 1, pluginId: "xiaolv-checkin", displayName: "小驴打卡"});
common.protocolCommands["xiaolv.common.open"]();          // 稳定命令 ID
```

- 服务接口：`getCapabilities / search / get / save / update / remove / insert / copy / openSource / reindex / getRecent / getFavorites`
- 命令 ID：`xiaolv.common.open / saveSelection / insert / copy / openSource`；插件命令另有 捕获当前块(⌥⇧B)/捕获当前文档；接入示例见 [docs/provider-guide.md](docs/provider-guide.md)
- 事件（window CustomEvent，detail 带 protocolVersion）：`xiaolv:common:item-created / item-updated / item-deleted / item-inserted`
- 兼容行为：未知字段保留透传；未知能力忽略；更高主版本明确拒绝（不静默降级）。

</details>

<a id="install"></a>
## 安装、升级与备份

- **安装**：集市（待上架）或手动——把 `package.zip` 解压到 `<工作空间>/data/plugins/xiaolv-common/`，重启思源并在「设置 → 集市 → 下载」中启用。启用后可在命令面板搜索「打开小驴常用（内测版）」或点击顶栏图标进入；若侧车设置读取失败，插件仍会保留这些入口并提示原因。
- **首次使用**：点击顶栏图标，按引导选择库。默认推荐在已有笔记本中新建「常用内容库」文档；也可选已有文档、文档树或按笔记本。创建前会显示确认信息，模板需要你在设置中确认导入；分类作为条目属性写入当前内容库文档。之后可在插件设置 → 当前内容库中更改模式和落点。
- **升级**：覆盖插件目录后重启；侧车 schema 自动迁移（v1→v2）；未来版本数据只读保留不降级改写。
- **备份**：库内容 = 普通思源文档，随思源同步走；导出 JSON（含全部条目与来源引用）或 **Markdown 包 ZIP**（items.md + assets/ 资源，无依赖解压即读）；恢复 = 导入 JSON 或 **Markdown 包**（自动识别文件类型，同一套校验/冲突策略/回执）；Markdown 包可被任何文本工具阅读。
- **卸载**：不删除库文档与块属性；侧车目录由思源清理。

## 开发

```bash
pnpm i
pnpm run check   # tsc --noEmit
pnpm test        # 单元测试
pnpm run build   # dist/ + package.zip
node scripts/render-prototype.cjs    # 原型图截图（需 Playwright Chromium）
pnpm run test:ui                # 生产界面 smoke 与截图（需 Playwright Chromium）
```

系列协议见 [AGENTS.md](AGENTS.md)；路线见 [ROADMAP.md](ROADMAP.md)；阻塞见 [BLOCKERS.md](BLOCKERS.md)；取舍见 [docs/adr/](docs/adr/)；宿主 API 能力矩阵见 [docs/host-contract.md](docs/host-contract.md)。

<a id="known-limitations"></a>
## 已知限制

- **内核链路已真机验收**（2026-10-08，独立内核 v3.8.6，12/12 通过）；仍待验收：思源前端（Electron）内的插件运行时（安装启用、界面交互、AI 真实模型）与 Android 真机（BLOCKERS B-001 前端部分 / B-002 / B-003）：移动端插入自动降级为复制；图片位图复制降级为 Markdown 链接。
- 拼音搜索：已接入 tiny-pinyin（本地注解，设置可关，ADR 0004/R5）；多音字按常用读音。
- 库文档树模式从根文档最多展开 3 层子文档；条目索引上限 2000（超出截断并明示，数据仍安全在库中）。
- 导入冲突按逻辑 ID 判定（无内容级 diff）。
- 「选择现有文档」支持通过宿主公开文档搜索 API 按关键词选择；真实宿主写入验收仍受 B-001 阻塞。
