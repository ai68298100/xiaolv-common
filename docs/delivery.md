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
pnpm run check
pnpm test
pnpm run build
```

`pnpm run dev` 是 webpack development mode 单次构建，不开启 watch。直接打开 `docs/design/prototype.html` 可查看原型；`node scripts/render-prototype.cjs` 会更新原型 PNG，包括 v4 状态镜像截图。

## 脚本索引

| 命令 | 作用 | 宿主 |
|---|---|---|
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
2. 依次执行 `pnpm run check`、`pnpm test`、`pnpm run build`、`pnpm run test:ui`、`pnpm run test:ix`、`pnpm run scan`、`pnpm run check:package`，需要时补跑 `pnpm run e2e:iso`。
3. 检查 `package.zip`：解压后目录名为 `xiaolv-common`，包含 `plugin.json`、`index.js`、`index.css` 和图标资源；不得包含 `node_modules`、测试截图或密钥。
4. GitHub 发布上传 `package.zip` 和变更说明。手动安装时，把 zip 解压到 `<工作空间>/data/plugins/xiaolv-common/`，重启思源后在插件设置中启用。
5. 思源集市 PR 只在用户明确授权后发起；提交前补齐集市要求的 zip、图标、版本、README 和校验结果。

## 验收回归与当前边界

截至 2026-10-14，R187-R202 的 UI smoke、交互审计、类型检查、单元测试、构建、隔离内核、发现内核、密钥扫描和包检查已完成组合复跑，逐项结果见 [`acceptance-audit-2026-10-12.md`](acceptance-audit-2026-10-12.md)。鉴权错误态新增 4 项、恢复 3 项 smoke；交互审计保持 45/45；单元测试为 355/355。原型 screen 11 提供五态/边界/断点视觉样例；卡片里的动作是静态标签，不是交互证据。当前交互审计不是所有页面控件的全量清点，映射范围和缺口见 [`ui-component-catalog.md`](ui-component-catalog.md)。

样式变量覆盖和视觉尺度现状见 [`design-spec.md`](design/design-spec.md) 与 ADR 0017/0018。当前生产入口 `index.js + index.css` 为 488 KiB（本机 webpack 输出，非 gzip 或网络首屏数据）；没有可比的历史包体/耗时数据，因此没有声称性能提升。

仍未完成的事项：

- B-001：思源 Electron 前端内的安装启用、插件运行时和真实 AI 模型端到端尚未现场验收；隔离真实内核链路已通过 12/12。
- B-002/B-003：没有 Android 真机/模拟器，移动端直接插入和图片位图复制继续诚实降级为复制文本/Markdown 链接。
- B-004：极端快速切换设置和库选择器可能触发宿主 Chromium/Electron 页面异常，已有缓解但根因待宿主确认。

本轮已补齐请求层的在途去重、latest 竞态取消、超时 AbortSignal、网络限次重试和写端点禁重试；服务层写入按目标串行、支持受限幂等键、快照回滚和精确预览缓存失效。鉴权/权限失败会统一清理派生状态、保留搜索上下文并显示可重试错误态。插件仍借助思源宿主登录态，没有独立登录页；宿主未提供公开登录跳转 API，因此恢复登录后由用户点 Retry 回到原搜索条件。

这些能力仍受官方传输取消语义、端点重试安全性和宿主鉴权合同约束；自动化已覆盖故障分类、回滚和重试，真实 Electron 仍需现场确认。设置/首跑和 Espanso 已按入口懒加载，主搜索超过 80 行启用固定行高窗口渲染；首屏包体对比和列表规模证据见 [`perf-baseline-2026-10-14.md`](perf-baseline-2026-10-14.md)。

图片现代格式和字体子集化暂不改动：生产页面没有媒体或自带字体，集市预览/图标受格式规范约束；Electron 首屏时间、滚动帧率和动态 chunk 路径需要真实宿主采样后再决定是否继续拆分。

其余未完成事项待对应宿主或设备条件具备后按 `BLOCKERS.md` 解除并补证据。
