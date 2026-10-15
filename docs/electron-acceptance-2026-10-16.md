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
