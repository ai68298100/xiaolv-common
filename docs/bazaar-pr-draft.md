# 思源集市上架准备与 PR 流程

> 本文按官方当前集市仓库流程核对（2026-10-10）。发布 GitHub Release 不等于提交集市 PR；只有用户明确说「可以推送集市」后，才操作 `siyuan-note/bazaar`。

## 当前准备情况

| 检查项 | 状态 | 说明 |
| --- | --- | --- |
| GitHub Latest Release | v0.3.8 发布中 | 上架前须确认 Latest Release 附带同版本 `package.zip` |
| 源码与许可 | 已具备 | GitHub 仓库公开，根目录 `LICENSE` 为 MIT |
| Manifest | 已核对 | `plugin.json` 的 `name` 与仓库名均为 `xiaolv-common`；版本使用 semver；README 中英文路径均存在 |
| 发布包文件 | 构建后核对 | 至少包含 `plugin.json`、`index.js`、`index.css`、README、声明的图标/预览图及 i18n；用 `pnpm run check:package` 检查根相对结构与版本一致性 |
| 图标 | 可用 | PNG，48,877 bytes；低于 64 KiB 限制，尺寸 260×260（官方建议 160×160） |
| 预览图 | 可用 | PNG，1024×768、270,419 bytes；低于 512 KiB 限制 |
| Electron 桌面验收 B-001 | 待完成 | 当前缺真实前端插件运行时验收；这是产品验收未完成项，不是官方 PR Check 的明示硬门槛 |
| Android 真机验收 B-002 | 待完成 | 移动端能力仍按 README 降级提示声明；不是官方 PR Check 的明示硬门槛 |

图标与预览图不是集市 PR 的必需项；一旦在 manifest 声明，文件需存在并满足官方格式和大小限制。截图或 GIF 也不是 PR 的硬要求。

## 官方 PR 流程

1. 先确认 GitHub Latest Release 已发布，tag、`plugin.json` 版本和 `package.zip` 内容来自同一提交。Release 附件必须包含 `package.zip`。
2. Fork 并同步 `https://github.com/siyuan-note/bazaar`，从 `main` 创建 `add-plugin-xiaolv-common` 分支。
3. 只修改 bazaar 仓库根目录 `plugins.txt`，追加一行 `ai68298100/xiaolv-common`。每个 PR 只新增一个插件，目标分支为 `main`。
4. 提交信息和 PR 标题均使用 `Add ai68298100/xiaolv-common`。PR 正文使用官方 `.github/PULL_REQUEST_TEMPLATE.md`，按模板确认无侵权内容并在末尾附仓库链接：`https://github.com/ai68298100/xiaolv-common`。
5. 等待 PR Check 核验 Latest Release、`package.zip` 必要文件和 metadata。检查失败时修正原 PR，不要另开重复 PR。
6. 维护者审核并合并后，后续版本只需发布新的 GitHub Release，不需要重复提交集市 PR。

若插件闭源，官方模板要求提供可供维护者完整审阅的源码私有仓库并授予指定维护者访问；本插件为 MIT 开源仓库，不适用该项。

## 官方依据

- [集市提交说明](https://github.com/siyuan-note/bazaar/blob/main/README.zh-CN.md#提交集市包)
- [维护者流程](https://github.com/siyuan-note/bazaar/blob/main/AGENTS.md)
- [PR 模板](https://github.com/siyuan-note/bazaar/blob/main/.github/PULL_REQUEST_TEMPLATE.md)
- [插件样例上架与 plugin.json 规范](https://github.com/siyuan-note/plugin-sample/blob/main/README.zh-CN.md#上架集市)
