# ADR 0031：动态分块使用宿主提供的插件路径

## 状态

已采纳（2026-10-14，T-0057 / R204）。

## 背景

插件通过思源加载器执行 `index.js`，该脚本不是从浏览器文档 URL 直接加载。webpack 的相对 `publicPath: "./"` 因而按宿主页面 URL 解析；在思源 stage 前端打开设置时，实际请求为 `/702.js`，设置加载失败并提示 `Loading chunk 702 failed`。插件静态资源实际由 `/plugins/{plugin.name}/` 提供。

## 决策

在插件 `onload` 最早阶段使用思源公开的只读 `this.name` 设置 webpack 运行时 `publicPath` 为 `/plugins/${encodeURIComponent(this.name)}/`。设置/首跑和 Espanso 解析器等动态导入统一从插件目录加载。构建默认值仍保留相对路径，仅用于 webpack runtime 尚未初始化的环境。

## 验证与边界

- 修复前，真实思源 stage 页面触发设置时请求 `/702.js` 并打开失败。
- 修复后，设置首开请求 `/plugins/xiaolv-common/702.js`，返回 `200 text/javascript`，设置面板正常出现。
- 输入合法 Espanso YAML 后按需请求 `/plugins/xiaolv-common/795.js` 和 `/plugins/xiaolv-common/713.js`，均返回 `200 text/javascript`，解析出 1 条且无页面异常。
- 验收在思源 `3.8.7-beta.3` 的 stage 前端进行，浏览器以授权头连接当前 `D:\SIYUAN` 工作区；这证明思源前端加载器和运行时路径工作，不等同于 Electron 壳 UI、AI 或 Android 真机验收。

## 取舍

- 固定写死插件 ID 会与宿主实际目录耦合；`this.name` 是公开 API，能在插件改名时自动跟随。
- 相对路径不依赖宿主 API，但实际解析基准是文档地址，已被 stage 前端实测否定。
- 继续懒加载会使全部分块都下载时的 JS 压缩字节略增；详细体积对照见 [`docs/perf-baseline-2026-10-14.md`](../perf-baseline-2026-10-14.md)。
