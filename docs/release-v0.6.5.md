## [0.6.5] — 2026-10-23

小驴生态联邦协同与视觉美学全面升级（Epoch 6 标准）：四别名挂载注销、callBridge 优雅解析打卡宏、雷切常用资产小组件注册、帝王紫+赛博薄荷绿美学升级与根目录 package.zip 自动化产出。

### 新增与核心优化

- **跨插件联邦四别名挂载与安全注销**：对外窗口桥全面兼容 `window.xiaolvCommon`、`window.LvCommon`、`window.lvCommon`、`window.siyuanCommon`，遵循 First-Instance-Wins 原则且在插件卸载时进行严格身份核验注销，保障跨插件生态高并发稳定性。
- **生态宏 `{{xlc:checkin:today}}` 优雅解析**：基于 `ecosystem-bridge-kit` 的 `callBridge` 安全探测并调用小驴打卡公开接口，未安装打卡插件时安全降级为友好提示文本，杜绝任何未捕获异常。
- **向小驴雷切工作台注册「常用资产」小组件**：安全注册 `common-quick-palette` 模块，向雷切中枢提供高频使用的常用语列表，支持单键点击快速插入。
- **顶栏与侧栏单色矢量图标升级**：全面更换为 32×32 单色大括号变量矢量图标（`iconXlcCommon` 与 `iconLvCommon`），对标全新品牌头像。
- **托斯卡纳帝王紫 + 赛博薄荷绿美学注入**：注入专属品牌色 `--lv-brand: #9333EA` 与 `--lv-accent-mint: #10B981`，为全仓按钮赋予物理微触感，弹窗标题栏引入规范化 `.lv-dialog-title-wrap`。
- **工程规范与全生态发布对齐**：构建产物在根目录扁平输出 `./package.zip`；移动端挂载 `visualViewport` 动态键盘避让；英文名规范为 `Lv Common (Beta)`；补齐 `.gitattributes`、`SECURITY.md` 与 Release 工作流。

### 验证与已知边界

- 全套质量门禁：单元测试 723/723 全绿通过、TypeScript 类型检查 0 错误、错误处理静态扫描、密钥安全扫描、安装包根相对结构校验（15 项必需资源健全）全部通过。
- B-005（操作系统沙箱）未解除前停止真实 Electron 宿主实验；B-006 多块正文更新与 AST 验证继续保持单行/围栏防御。真实 AI 与 Android 触控边界继续保留。集市（bazaar）未获用户授权严禁自行推送，本次发布为独立 GitHub Release。
