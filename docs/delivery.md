# 交付与维护说明

本文面向第一次接手仓库的开发者，目标是从干净环境完成构建、验证、打包和手动安装。产品定位、数据约束和取舍仍以 [`ROADMAP.md`](../ROADMAP.md)、[`AGENTS.md`](../AGENTS.md) 和 [`docs/adr/`](adr/) 为准。

## 项目结构

核心源码位于 `src/`：`index.ts` 负责插件生命周期、命令、宿主事件和服务装配；`kernel/client.ts` 封装思源官方内核 API；`model/` 放纯数据模型、搜索、变量、导入导出、迁移和协议；`service/` 放库、发现、AI、provider 和协议桥；`ui/` 放搜索、捕获、发现、首设、设置、变量和导入弹窗；`styles/tokens-r187.scss` 是变量基座，`styles/index.scss` 是表面布局；`i18n/` 保存中文和英文文案。

`tests/` 是 node:test 测试入口；`scripts/` 是构建、截图、交互审计、真实内核验收、密钥扫描和包检查；`docs/design/` 是原型、设计规范、生产截图和真实验收截图；`dist/` 和 `package.zip` 由构建生成，不手工编辑。

## 环境要求

- Node.js >= 18，pnpm 12（`packageManager` 固定为 `pnpm@12.5.1`）。
- 截图和交互脚本需要 Playwright Chromium；脚本会优先复用兄弟插件的浏览器缓存。
- 生产运行需要思源笔记宿主。插件不自建登录系统，也不保存外部 token；内核鉴权由思源宿主提供。

构建和普通测试不要求额外环境变量。内核验收和诊断脚本使用以下变量；真实令牌只放在本地进程环境中，不得写入仓库：

| 变量 | 用途 | 默认 / 限制 |
|---|---|---|
| `SIYUAN_ORIGIN` | `pnpm run e2e` 指定已有思源内核地址 | `http://127.0.0.1:6806` |
| `SIYUAN_TOKEN` | 指定实例的内核令牌 | 未提供时脚本会明确失败；推荐隔离 E2E 自动读取 |
| `SIYUAN_KERNEL` | 隔离 E2E / 集成诊断使用的思源内核可执行文件 | 自动探测常见安装位置失败时指定 |
| `SIYUAN_E2E_PORT` | `e2e:iso` 隔离实例端口 | `16806` |
| `SIYUAN_E2E_WS` | `e2e:iso` 独立工作区 | 默认系统临时目录下 `xiaolv-e2e-ws` |
| `PLAYWRIGHT_BROWSERS_PATH` | 指定 Chromium 缓存目录 | 未设置时使用 Playwright 默认目录 |
| `IT_ORIGIN` / `IT_TOKEN` / `IT_DOC` | 手动真实内核验收脚本使用的地址、令牌和库文档 ID | 各场景脚本按需使用；只连接本机/隔离测试实例 |
| `IT_PORT` / `IT_WS` / `IT_N` | 集成内核和压力诊断的端口、工作区和条目数 | `16807` / 临时目录 / `2000` |
| `MAX_STEPS` / `SKIP` | 设置弹窗压力复现的步数和跳过项 | 仅 `repro-settings-crash.cjs` 诊断使用 |
| `GITHUB_OUTPUT` | CI 发布说明提取器的输出文件 | 仅 GitHub Actions 设置 |

`IT_ORIGIN`、`IT_TOKEN`、`IT_DOC`、`IT_PORT`、`IT_WS` 和 `IT_N` 由若干同名验收/诊断脚本读取。`SIYUAN_KERNEL`、`SIYUAN_E2E_PORT`、`SIYUAN_E2E_WS` 为隔离内核脚本配置；`MAX_STEPS`/`SKIP` 为压力复现配置；`GITHUB_OUTPUT` 仅在 CI 中出现。其他复现脚本还含有已归档工作区默认路径，运行前应先检查脚本头部说明。

## 从零运行

```bash
git clone https://github.com/ai68298100/xiaolv-common.git
cd xiaolv-common
pnpm install
pnpm run check:errors
pnpm run check
pnpm test
pnpm run build
```

`pnpm run dev` 是 webpack development mode 单次构建，不开启 watch。直接打开 `docs/design/prototype.html` 可查看原型；`node scripts/render-prototype.cjs` 会更新原型 PNG，包括 v4 状态镜像截图。

## 脚本索引

| 命令 | 作用 | 宿主 |
|---|---|---|
| `pnpm run check:errors` | 扫描源码中的不安全 thrown value 属性读取，阻止异常回执回归 | 否 |
| `pnpm run check` | TypeScript 严格类型检查 | 否 |
| `pnpm test` | 模型、服务、协议、导入导出和边界测试 | 否 |
| `pnpm run build` | webpack 生产构建并生成 `dist/`、`package.zip` | 否 |
| `pnpm run test:ui` | 生产 UI smoke、亮暗主题/窄屏截图 | Chromium |
| `pnpm run test:ix` | 键盘、点击、弹窗、表单、移动行为审计 | Chromium |
| `pnpm run e2e:iso` | 隔离真实思源内核读写验收 | 本机思源安装内核 |
| `pnpm run e2e:discovery:iso` | 文档/笔记本/树/全库发现和批次撤销验收 | 本机思源安装内核 |
| `pnpm run scan` | 密钥和高风险文件扫描 | 否 |
| `pnpm run check:package` | zip 入口、manifest 和必需资源检查 | 否 |
| `pnpm run it:kernel` | 启动临时思源内核并运行集成验收 | 本机思源安装内核 |
| `node scripts/render-prototype.cjs` | 原型整页与分屏截图 | Chromium |

`scripts/real-*.cjs` 是按场景拆分的现场验收脚本，通常由 `pnpm run it:kernel` 准备隔离环境。不要直接指向包含用户数据的笔记本。`scripts/repro-*.cjs`、`debug-*.cjs`、`diag-axe.cjs`、`scale-test.cjs`、`ui-sweep.cjs` 和 `patch-settings-height.cjs` 用于诊断/复现，不是常规发布门禁。

## 发布与部署

1. 修改 `package.json` 与 `plugin.json` 版本，并更新 README 当前版本更新内容。
2. 依次执行 `pnpm run check:errors`、`pnpm run check`、`pnpm test`、`pnpm run build`、`pnpm run test:ui`、`pnpm run test:ix`、`pnpm run scan`、`pnpm run check:package`，需要时补跑 `pnpm run e2e:iso`。
3. 检查 `package.zip`：解压后目录名为 `xiaolv-common`，包含 `plugin.json`、`index.js`、`index.css` 和图标资源；不得包含 `node_modules`、测试截图或密钥。
4. GitHub 发布上传 `package.zip` 和变更说明。手动安装时，把 zip 解压到 `<工作空间>/data/plugins/xiaolv-common/`，重启思源后在插件设置中启用。
5. 思源集市 PR 只在用户明确授权后发起；提交前补齐集市要求的 zip、图标、版本、README 和校验结果。

## 验收回归与当前边界

2026-10-16 收尾发现 Electron 镜像隔离失效：同一镜像曾额外启动访问 `D:\SIYUAN` 的内核并自动云同步。临时 renderer 的功能结果保留，但不能称为整个宿主未触碰日常环境的安全验收。进程已退出，日常数据影响范围未确定，B-005 开放；后续 Electron 实验停止，详见 [事故记录](electron-isolation-incident-2026-10-16.md)。

截至 2026-10-16，T-0083/R230 组合复验通过：`pnpm run check`、`pnpm test`（468/468）、生产 build、`test:ui`、`test:ix`（74/74）、隔离内核（12/12）、发现链路、secret scan 和 package check（13 项）。新增门禁完成真实违规注入、恢复和正向复验。固定思源 3.8.7 / Electron 44.7.0 隔离副本已通过无活动编辑器降级、真实剪贴板/协议回执和协议层引用/嵌入内核读回及紧接源正文动作的安全复制降级；部署最新 dist 后前置提示为未来式，失败回执保持失败。内核门禁另用 v3.8.8-alpha.1，两层版本分别记录。分项结果见当前状态审计 [`status-audit-2026-10-15.md`](status-audit-2026-10-15.md) 与 [`electron-acceptance-2026-10-16.md`](electron-acceptance-2026-10-16.md)；[`acceptance-audit-2026-10-12.md`](acceptance-audit-2026-10-12.md) 保留为 R191-R198 历史快照。原型 screen 11 提供五态/边界/断点视觉样例；卡片里的动作是静态标签，不是交互证据。当前交互审计不是所有页面控件的全量清点，映射范围和缺口见 [`ui-component-catalog.md`](ui-component-catalog.md)。

样式变量覆盖和视觉尺度现状见 [`design-spec.md`](design/design-spec.md) 与 ADR 0017/0018。2026-10-16 本轮构建的 `dist/index.js` 为 347,852 B、`dist/index.css` 为 132,927 B、`dist/package.zip` 为 496,928 B；这些是原始文件大小，不等于 gzip 传输或 Electron 首屏时间。性能趋势沿用 [`perf-baseline-2026-10-14.md`](perf-baseline-2026-10-14.md)，当前构建变化不构成性能提升声明。

同一搜索窗口冻结目标的现场检查也已完成：关闭原目标 A、打开来源 B 后再次主操作精确复制，A/B 的立即及延迟完整块快照不变；故意向 B 写入违规块时同一断言失败，恢复后完整 7/7。

T-0083 又补齐协议入口更早的查询/排队阶段：真实 Electron 延迟条目属性请求并切页，旧构建两场景均误写 B、新构建 4/4 通过；A 保持打开时写回 A，A 关闭时降级复制，B 的立即和延迟块 ID/正文/属性快照不变。修复后的同窗/无编辑器回归仍为 7/7。

T-0084 最终只做离线加固：四个近期 Electron 采集器统一接入 `electron-isolation.cjs` 与 `electron-isolation-playwright.cjs`，检查所有镜像进程、后代内核的精确工作区及页面导航身份，失败后不再向宿主操作。永久专项共 16/16，全套单元更新为 484/484；类型、六脚本语法、密钥、包和 diff 检查通过。源码绕过保护负向检出后均原字节恢复；四入口真实参数入口在离线事故夹具中全部连接前拒绝，合法对照仅到阻断 spy，零真实连接。生产源码/构建保持 T-0083 最终 SHA，未重新启动或附着宿主。该工具只检测，后续 Electron 实验仍需操作系统层隔离与独立宿主配置/profile，不能凭这些测试解除 B-005；证据见 [ADR 0054](adr/0054-electron-process-workspace-guard.md)。

仍未完成的事项：

- B-001 部分解除：Electron 安装启用、核心运行时、普通/引用条目动作、来源失效、保存视图和无活动编辑器降级已现场验收；同一编辑器连续引用动作后的宿主选区边界和真实 AI 模型端到端仍待现场收口。
- B-002/B-003：没有 Android 真机/模拟器，移动端直接插入和图片位图复制继续诚实降级为复制文本/Markdown 链接。
- B-004：历史 Chromium harness 崩溃与 stage 前端异常仍待定位；rAF 后 harness 三轮未复现，stage 需正常生命周期复现。T-0082 的真实 Electron 五组 812 步/1849 次开关矩阵未复现，不能据此解除；历史含直接删除 Dialog DOM 的流程不作为可信 Electron 复现。
- B-005：镜像额外启动日常工作区内核并自动同步，影响未完整确定；全进程检查只能检测，后续宿主实验需有操作系统层隔离证据。

本轮已补齐请求层的在途去重、latest 竞态取消、超时 AbortSignal、网络限次重试和写端点禁重试；服务层写入按目标串行、支持受限幂等键、快照回滚和精确预览缓存失效。鉴权/权限失败会统一清理派生状态、保留搜索上下文并显示可重试错误态。插件仍借助思源宿主登录态，没有独立登录页；宿主未提供公开登录跳转 API，因此恢复登录后由用户点 Retry 回到原搜索条件。

这些能力仍受官方传输取消语义、端点重试安全性和宿主鉴权合同约束；自动化已覆盖故障分类、回滚和重试，不能以核心 Electron 动作验收代替所有网络异常路径的现场证据。设置/首跑和 Espanso 已按入口懒加载，异步 chunk 的插件目录路径已现场验证；主搜索超过 80 行启用固定行高窗口渲染，首屏包体对比和列表规模证据见 [`perf-baseline-2026-10-14.md`](perf-baseline-2026-10-14.md)。

图片现代格式和字体子集化暂不改动：生产页面没有媒体或自带字体，集市预览/图标受格式规范约束；Electron 首屏时间和滚动帧率需要真实宿主采样后再决定是否继续拆分。

其余未完成事项待对应宿主或设备条件具备后按 `BLOCKERS.md` 解除并补证据。

## v0.5.0 发布记录

T-0118/T-0119（2026-10-19）已完成 [GitHub v0.5.0 发布](https://github.com/ai68298100/xiaolv-common/releases/tag/v0.5.0)。版本元数据（package.json、plugin.json）与中英文 README、CHANGELOG 全面对齐。
涵盖自 v0.4.2 以来的 34 项核心增强（T-0086 至 T-0119）：
1. 动态模板与占位符能力：日期算术与中文自然语言偏移、随机占位符与变量下拉中文标点归一化、变量填充卡默认值预填；
2. 片段嵌套与模板包：片段嵌套可视化代码芯片与展开详情诊断、模板包依赖预检黄色警示徽标与提示、Compact Bundle Base64 与 URL 协议直接导入；
3. 搜索与交互优化：多关键词多维标点分词容错、Levenshtein 最小编辑距离模糊容错检索、时间半衰期衰减评分加权、拼音连续音节平滑高亮消除打词闪烁、时间范围筛选模型、捕获查重排除自身与全角空格归一化；
4. 安全防护与硬门禁：B-006 Kramdown 写前保守防御（单行/围栏限制）、静态异常处理门禁（`check-error-handling.cjs`）、标签多维标点修正与 `#` 标签清洗、独立笔记本补偿凭据与进度反馈。

包身份：本地 `dist/package.zip` 为 513344 bytes，SHA256=`87fc197eae80660703159d7abf8b7cd366ad4b5442a18497a6944863cd865b14`。
类型检查、560/560 单元测试、生产构建、Chrome 生产 UI smoke（80+ 项断言）、74/74 交互审计、密钥与包检查全绿通过。B-005 继续开放，真实宿主与设备边界保留。集市严禁自行推送，本次发布为独立 GitHub Release。

## v0.4.2 发布记录

T-0085（2026-10-16）已完成 [GitHub v0.4.2 发布](https://github.com/ai68298100/xiaolv-common/releases/tag/v0.4.2)，发布提交 `fac2a4450141bc491be2b96ce2c4418345b4b53d`，版本元数据与中英文 README、CHANGELOG 同步。类型、484/484 单元、构建、Chrome 生产 UI smoke、74/74 交互、密钥与包检查通过；T-0083 的核心/发现内核证据按相同生产 JS/CSS 身份复用，本轮没有重启或附着宿主。

[main CI](https://github.com/ai68298100/xiaolv-common/actions/runs/38846012571) 和 [tag CI/Release](https://github.com/ai68298100/xiaolv-common/actions/runs/38846012546) 均成功。下载正式附件 `package.zip` 为 498742 bytes，SHA256 `9bd5251cc823ffe1ed4b306431fa7477db576e5117865c523b6847e4bfb58b4a`，与 API digest 相同；实际 manifest 为 `xiaolv-common / 0.4.2`，13 项资源核验通过，10 项逐字节一致，中英 README 和 LICENSE 仅平台换行差异。完整证据见 [当期账本 T-0085](dev-plan-2026-10-06.md)。B-005 继续开放；集市没有获得明确授权，未发起上架 PR。
