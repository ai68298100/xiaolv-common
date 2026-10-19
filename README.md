# 小驴常用（内测版）

> **本地未发布修复（R238）**：发现多块正文完整性缺陷后，新建、正文更新和导入暂仅接受单行内容或一个完整代码围栏。当前示例包共 25 条，其中 8 条（原有 3 条加上邮箱、地址、无效身份占位、网址和代码入门 5 条安全示例）符合限制，17 条原多行模板会拒绝。完整简历、公司介绍与结构示例暂不可用；这项保护尚未包含在 GitHub v0.4.2。详见 [当前审计](docs/status-audit-2026-10-18.md)。

> **内测说明**：插件仍处于持续迭代阶段，部分功能和思源宿主兼容性尚在验证中。欢迎参与内测，并通过交流 QQ 群 **871707735** 反馈 Bug、提交需求。对功能完整性或运行稳定性有较高要求的用户，建议等待正式版发布后再使用。

[![CI](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml/badge.svg)](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/ai68298100/xiaolv-common?label=%E7%89%88%E6%9C%AC&sort=semver)](https://github.com/ai68298100/xiaolv-common/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

基于思源真实文档和块的**常用内容库与快速调用器**。可以保存常用语、邮件回复、地址、提示词、代码和链接，再通过搜索预览、插入或复制；每条内容都锚定真实思源块，来源可回链，失效状态可见。

支持插入前填写变量、日期与随机占位符、片段嵌套、模板包分享、Espanso 配置导入、拼音搜索和 AI 辅助。插件可独立使用，也提供 `xiaolv-common/v1` 公开协议供小驴系列插件接入。

> **已发布版本：v0.5.0（2026-10-19）** · [下载最新版](https://github.com/ai68298100/xiaolv-common/releases/latest) · 本版强化动态模板（日期算术/中文自然语言/标点容错/嵌套诊断），新增 Compact Bundle 紧凑分享与依赖预检，加固写前防御与异常处理硬门禁。

## 本次更新（v0.5.0）

动态模板与占位符能力升级：

- **日期算术与中文自然语言**：动态占位符扩展支持 `{{xlc:date|+3d}}`、`{{xlc:date|-1w}}`、`{{xlc:date|+1y}}`、`{{xlc:date|next_monday}}`，以及中文快捷短语 `{{xlc:date|今天}}`、`{{xlc:date|明天}}`、`{{xlc:date|后天}}`、`{{xlc:date|昨天}}`、`{{xlc:date|下周五}}` 等，月/年进位按日历月末钳制。
- **选项多维标点归一化**：变量下拉选择（`{{xlc:ask:方案|标准版，专业版，旗舰版}}`）与随机占位符（`{{xlc:random|红包、优惠券、感谢信}}`）全面支持中文全角逗号 `，` 与顿号 `、` 切分，彻底消除中文输入法下的格式误判。
- **变量填充卡默认值与预填**：支持等号语法 `{{xlc:ask:币种=CNY}}` 与单选项回退机制，并在唤起填充卡时自动预填默认值，保留修改自由。
- **嵌套片段语法可视化与可观测性**：详情预览窗格直观回显 `{{xlc:snippet:标题}}` 代码芯片；`LibraryService` 新增 `expandSnippetRefsDetailed`，精细跟踪展开标题、缺失项、递归成环熔断与最大层级。

分享、导入与检索能力升级：

- **模板包依赖预检与策略弹窗分级警示**：Markdown 模板包首部清单聚合声明 `snippets:` 依赖；导入解析器比对缺失依赖并在策略卡片醒目呈现黄色警告徽标与缺失项清单。
- **Compact Bundle 紧凑分享与直接导入**：支持将模板包序列化为单行 `xlc-bundle:...` Base64 文本或 `xlc://import?bundle=...` URL 链接，导入管道直接兼容并执行完整冲突校验。
- **Espanso 语法导入保真度增强**：支持自动推断代码围栏、提取并填充安全 URL 属性，并在纯文本与 Markdown 间安全切换。
- **搜索多关键词与分词标点容错**：除空格外，全面支持中英文逗号、斜杠、反斜杠、加号、分号与竖线作为连接符，并保持跨字段 AND 组合累积分数与高亮对齐。
- **拼音连续音节平滑高亮**：重构音节定位算法，支持末字全拼前缀平滑定位，彻底消除打词过程中高亮闪断闪烁感。
- **搜索时间范围筛选模型**：`SearchQuery` 扩展 `dateRange` 闭区间时间过滤，支持按创建时间与更新时间检索。
- **捕获查重排除自身与全角空格归一化**：编辑条目保存时通过 `excludeId` 避免与自身历史标题/内容自撞误报重复。

安全防御与底层质量加固：

- **B-006 Kramdown 写前保守防御**：正文写入限制为单行正文或一个完整代码围栏，显式拦截 `>`、列表、表格、超级块等 Markdown 结构标记，避免隐式容器解析失控。
- **静态错误处理硬门禁**：新增 `scripts/check-error-handling.cjs` 静态扫描门禁，禁止直接读取 thrown value 属性，统一走 `toErrorMessage`。
- **标签多维标点修正与井号清洗**：修正历史笔误正则，支持全角逗号、顿号、分号与连续空白，并自动清洗思源原生 `#` 标签前后缀。
- **独立笔记本补偿凭据与进度反馈**：独立笔记本两步编排提供进度回调，补偿删除失败时在设置 UI 显式暴露残留 notebookId 凭据。

## 上一版更新（v0.4.2）

原文留在自己的笔记中，通过标签和引用入口形成常用集合：

- 发现合并原生标签和自定义标签，支持精确筛选、标签计数、当前筛选全选和批量建立引用入口；库内只存引用和元数据，源块正文不搬迁，调用时读取最新正文。也可明确选择复制正文快照。
- 输入精确标签后可保存为视图。设置 → 常用视图可重开文档、笔记本或文档树视图，自动选中确定可新增的候选并锁定“建立引用入口”；再次同步跳过已有来源。引用条目可分别插入源内容、块引用或嵌入，也可复制正文、打开来源。
- 保存视图改用宿主命名表单，修复自动选择与复选框不一致、长标签遮挡、小窗口撤销按钮裁剪和文档树子文档范围误判。
- 笔记本视图固定保存时的扫描目标，入口文档移动不再切换笔记本；旧规则提示重新保存。同步后关闭可选择返回并保留撤销，或明确关闭并保留已加入内容；切换发现入口时，确认后继续打开目标，取消则停留原视图。

搜索与调用更方便：

- 多关键词跨字段组合检索、拼音命中汉字高亮及常见多音词纠正；支持最近查询回溯、点击标签筛选、分类彩色徽标、单条使用次数重置和收藏/最近无结果时扩大到全库。
- 数字键插入/复制、Tab 导航和编辑/副本/删除/收藏快捷操作；搜索面板支持拖放文本或链接，以及在非输入区粘贴后打开捕获表单。场景模板包现有 25 项，其中 8 条（含原有 3 条和 5 条单行/代码入门示例）可直接导入，复杂多行模板仍会给出拒绝原因。
- 插入目标在异步查询、读取和排队前固定；原目标关闭或选区失效时明确降级复制，避免误写切换后激活的文档。复制失败如实反馈，引用来源失效时不使用旧正文。

验证边界：Electron 仅有已覆盖动作的局部功能证据；测试镜像曾额外打开日常工作区并自动云同步，影响尚未确定，整体隔离声明已撤回，后续 Electron 实验按 B-005 停止。进程检查只提供检测，详见[事故记录](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/docs/electron-isolation-incident-2026-10-16.md)和[现场记录](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/docs/electron-acceptance-2026-10-16.md)。Android、真实 AI、连续嵌入后的选区兼容及 B-004 设置异常仍保留边界。

## 上一版更新（v0.4.1）

整体：专用内容库仍是默认工作集；用户可按需从文档、文档树或笔记本发现已有内容，确认后复制进库。

新增：

- 编辑器右键和命令面板提供当前文档、当前笔记本发现入口；发现面板还可选择指定文档树、指定笔记本或经二次确认的全部笔记本。
- 发现面板支持筛选、来源路径、正文预览、多选收录、内容相同确认、逐项回执和安全撤销。
- 同步设计变量收敛：字号、行高、4px 间距栅格、圆角、阴影、动效和亮暗主题语义色统一由一套变量管理。

优化：

- 捕获表单保留选区、当前块、剪贴板和手工新建的来源类型与触发时文档，避免切换页面后来源漂移。
- 发现候选只在当前会话内存中存在；收录前重验来源范围，收录后保留来源回链并刷新已打开的搜索面板。
- AI 整理与草稿生成失败时在原操作附近保留可读原因，并提供稳定的「重试」入口；重试读取最新正文/描述，旧建议不会被误采纳，关闭表单后的迟到响应也不会污染下一次打开。
- 移动端点按条目只负责选择并更新预览；无定向目标时由底部主按钮执行复制降级，存在定向目标时执行插入，长按仍可打开动作菜单。
- 发现扫描单独限额：最多 20 个笔记本、200 篇文档、8 层目录、2000 个块、500 个候选和 60 秒；每页最多 100 条。部分错误会保留可用结果，手动停止会等待已发出的内核请求完成、不再发起新请求。
- 桌面弹窗和列表放大以展示更多内容；移动端压缩标题与筛选占用并保留 44px 触控命中区。动态设置/Espanso 分块从插件目录加载，避免思源 stage 下的根路径请求。

限制：发现不会自动加入常用库或修改原文；全部笔记本扫描必须由用户确认。思源 Electron 插件运行时与 Android 真机仍待现场验收，自动化测试不代表宿主验收。

## 历史更新（v0.3.9）

本版围绕首次使用和日常调用体验，统一了入口检查、页面反馈、表单布局和跨页面状态刷新。

新增：更方便地添加和开始使用

- 新用户首屏增加三步快速开始卡，并可从空库态重复打开完整使用帮助。
- 搜索面板顶栏常驻「＋新建」，无结果时也可直接新建；命令面板支持「新建条目」（`⌥⇧N`）。
- 使用帮助补充搜索、插入、复制、变量和模板分类规则，内置示例覆盖使用说明、邮箱、地址、无效身份占位、网址和代码入门；照片、PPT、PDF/DOCX 与简历附件仍需先在思源添加真实资源。

优化：首次设置与库状态更清楚

- 首次设置默认推荐在现有笔记本中新建专用库文档，设置中可随时更改库和模式；笔记本加载、空列表、失败和重试状态均有明确反馈。
- 主页面快捷键、搜索语法、筛选、排序、空态和保存位置改为面向用户的语义文案；移动端提示与实际点按/长按操作一致。
- 新建、编辑、首跑、设置、导入等表单统一内边距、滚动边界和按钮可达性；跨页面新增、编辑、导入、重建和配置变化后，列表、筛选、预览和计数会同步刷新。
- 捕获入口提前检查内容库配置，读取、查重、保存、复制和插入失败均给出可恢复反馈；无活动编辑器时明确显示复制降级语义。

修复：模板包条目正文边界

- 修复 Markdown 模板包解析时把下一条条目元数据并入当前正文的问题。
- 修复变量填写取消后搜索上下文丢失、定向嵌入误写成引用、外部变化后筛选残留和 Espanso 预览提交旧结果等问题。

验证边界：独立思源内核 E2E 12/12 通过，类型检查、单元测试、生产构建、交互审计、包检查和密钥扫描通过；思源 Electron 桌面端插件运行时及 Android 真机仍待现场验收，见[已知限制](#known-limitations)。

<details>
<summary>历史版本更新（点击展开）</summary>

### v0.3.8（2026-10-10）

完善常用内容新增入口、首次设置和使用引导，补充分类模板与错误反馈。完整记录见 [CHANGELOG.md](./CHANGELOG.md)。

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
3. **添加内容**：在搜索面板点「＋新建」，或从选中文字、当前块、右键菜单和剪贴板捕获。也可以在正文右键或命令面板选择「从当前文档发现常用语」，先预览候选再收录。
4. **搜索和调用**：搜索标题、正文、标签或分类，选中后插入或复制。桌面可用 `Enter` 插入、`Ctrl/⌘+Enter` 复制；移动端点按条目只选择并更新预览，再点底部主按钮执行：无定向目标时复制降级，有定向目标时插入；长按可打开更多动作。发现面板中可以按标签保存视图，之后从设置 → 常用视图重开并同步引用入口。
5. **建立模板**：在正文中写 `{{xlc:ask:字段}}`，调用时会要求填写；设置 → 数据与模板中的 25 条示例包含邮箱、地址、无效身份占位、网址和代码入门，可先导入安全示例，再把占位替换为自己的内容。照片、PPT、PDF/DOCX 和简历文件要先作为真实资源添加到思源，再保存资源链接；导入内容保存在当前库文档，分类记录在条目属性中，不会自动建立笔记本或分类文档。

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

![UI 状态镜像原型（空闲、加载、成功、失败、空结果、边界与断点）](docs/design/prototype-state-matrix.png)

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
| blockref | `((id '锚文本'))` 引用；另有插入源内容和嵌入动作 | 复制最新源内容（copy-content） | 目标块 |
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

AI 整理或草稿生成失败时，表单会在对应操作旁保留错误原因并提供重试；重试使用当前正文或描述。自动化覆盖的是界面恢复流程，真实模型验收仍未完成。

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
| **常用内容示例** | 设置 → 数据与模板 → 「导入常用内容示例」：内置 25 个模板（使用说明 / 地址 / 邮箱 / 无效身份占位 / 网址 / 代码入门 / 联系方式 / 客服回复 / AI 提示词 / 研发写作 / 开票资料 / 退换指引 / 催办 / FAQ），其中 8 条符合当前单行或完整代码围栏限制；照片、PPT、PDF/DOCX 和简历附件需先添加真实资源 |
| **快速捕获** | 命令「快速捕获剪贴板为条目」（默认 ⌥⇧V）：无表单一步入库、类型推断、同文自动跳过并提示 |

## 桌面搜索弹窗（调用中枢）

双栏（左列表右预览）/ 窄窗单列 / 移动端底部 sheet；桌面键盘 `↑↓ 选择 · Enter 插入 · Ctrl+Enter 复制 · Alt+1~9 直达 · Esc 关闭`；移动端点按条目只选择并更新预览，底部主按钮按目标执行插入或无目标时复制降级，长按打开动作；类型/标签/分类筛选、★收藏置顶、🕐最近、⇅排序、`?` 前缀 AI 语义找、提供方分区（其他小驴插件内容源）；条目显示类型徽标 / 变量徽标 / 使用次数 / 来源失效 ⚠。

## B-001 内核链路验收脚本

```bash
pnpm e2e:iso      # 仅内核验收：使用临时工作区和独立端口，结束后关闭测试内核
SIYUAN_ORIGIN=http://127.0.0.1:6806 SIYUAN_TOKEN=<你的令牌> pnpm e2e   # 对指定实例验收
```

脚本覆盖建库文档、追加条目与属性、回读/搜索/导出、更新和清理核验，逐项输出 ✔/✖ 与汇总。内核链路已有独立验收；Electron 的局部功能证据、整体隔离撤回与 B-005 停止条件见[已知限制](#known-limitations)。内核脚本不等于 Electron、真实 AI 或 Android 验收。

未配置模型/超时/空响应均诚实提示；总开关与正文出域开关在引导面板「AI 助手」区，任何输入下默认关闭（门禁测试锁定）。

## xiaolv-common/v1 协议

```js
// 其他插件（如雷切、打卡）通过 app.plugins 找到本插件实例：
const common = app.plugins.find(p => p.name === "xiaolv-common");
await common.service.search({text: "客服", itemType: "", tag: "", scope: "all"});
await common.service.insert(itemId, {mode: "insert"});   // insert|insert-content|copy|copy-content|insert-ref|insert-embed|open
await common.service.copy(itemId);
await common.service.openSource(itemId);
common.registerProvider({protocol: "xiaolv-common", protocolVersion: 1, pluginId: "xiaolv-checkin", displayName: "小驴打卡"});
common.protocolCommands["xiaolv.common.open"]();          // 稳定命令 ID
```

- 服务接口：`getCapabilities / search / get / save / update / remove / insert / copy / openSource / reindex / getRecent / getFavorites`
- 命令 ID：`xiaolv.common.open / saveSelection / insert / copy / openSource`；发现协议另有 `discoverCurrentDocument / discoverCurrentNotebook / previewDiscoveryCandidate / addDiscoveryCandidate / closeDiscoverySession / beginDiscoveryBatch / finishDiscoveryBatch / undoDiscoveryBatch`；指定树、指定笔记本和全部笔记本可从发现面板选择；接入示例见 [docs/provider-guide.md](docs/provider-guide.md)
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
pnpm run check:errors  # 异常回执安全门禁
pnpm run check   # tsc --noEmit
pnpm test        # 单元测试
pnpm run build   # dist/ + package.zip
node scripts/render-prototype.cjs    # 原型图截图（需 Playwright Chromium）
pnpm run test:ui                # 生产界面 smoke 与截图（需 Playwright Chromium）
```

系列协议见 [AGENTS.md](AGENTS.md)；路线见 [ROADMAP.md](ROADMAP.md)；阻塞见 [BLOCKERS.md](BLOCKERS.md)；取舍见 [docs/adr/](docs/adr/)；宿主 API 能力矩阵见 [docs/host-contract.md](docs/host-contract.md)。实现镜像原型见 [docs/design/prototype.html](docs/design/prototype.html)，组件清单见 [docs/ui-component-catalog.md](docs/ui-component-catalog.md)，从零运行、脚本和部署见 [docs/delivery.md](docs/delivery.md)。

<a id="known-limitations"></a>
## 已知限制

- **宿主证据有边界**：独立内核核心与发现链路已通过；思源 3.8.7 / Electron 44.7.0 仅保留已覆盖动作的局部功能观测。测试镜像额外打开日常工作区并触发云同步，影响尚未确定，整体隔离声明已撤回；B-005 开放，后续 Electron 实验停止。进程检查不能替代操作系统层隔离，见[事故记录](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/docs/electron-isolation-incident-2026-10-16.md)和[阻塞清单](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/BLOCKERS.md)。
- 真实 AI、Android 触控与图片位图剪贴板尚未验证。移动端无定向目标时复制降级，有定向目标时走插入路径但仍待真机验证；图片位图复制降级为 Markdown 链接。同一编辑器连续引用/嵌入后可能因选区失效而明确降级复制。B-004 设置异常未定位，有限压力样本未复现不等于已修复。
- 保存视图支持文档、当前笔记本和文档树，最多 20 条；指定笔记本/全部笔记本可手动发现，暂不能保存为视图。同步由用户触发，不做后台自动收录；旧笔记本规则缺少固定目标时需重新保存。
- 拼音搜索：已接入 tiny-pinyin（本地注解，设置可关，ADR 0004/R5），并纠正常见多音词；词表并非完整多音字词典。
- 库文档树模式从根文档最多展开 3 层子文档；条目索引上限 2000（超出截断并明示，数据仍安全在库中）。
- 导入冲突按逻辑 ID 判定（无内容级 diff）。
- 「选择现有文档」支持通过宿主公开文档搜索 API 按关键词选择；部分宿主兼容与真实 AI、Android 验收继续按 B-001/B-002 跟踪。
