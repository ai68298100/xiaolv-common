# ADR 0097：小驴生态 Epoch 6 统领指令落地与美学工程全方位升级 (Ecosystem Epoch 6 Alignment & Aesthetic Overhaul)

## 状态
已接受，T-0166 / R292（2026-10-23，用户指令立项：执行 ECOSYSTEM-INTEGRATION-DIRECTIVE.md 统领指令）。

## 背景与上下文
由小驴快门中枢下发统一统领规范（`ECOSYSTEM-INTEGRATION-DIRECTIVE.md`），针对小驴常用插件在全生态 9 大插件中的跨插件联邦协同、品牌专属视觉美学以及深层工程规范提出标准要求：
1. **跨插件联邦四别名标准**：对外窗口桥除 `window.xiaolvCommon` 外，需同步兼容 `LvCommon`、`lvCommon`、`siyuanCommon`，并严格遵守首实例持有与销毁时身份核验防误删机制；
2. **打卡宏标准解析**：`{{xlc:checkin:today}}` 统一采用 `src/ecosystem-bridge-kit.ts` 的 `callBridge` 安全调用，未安装时提供优雅降级文案；
3. **雷切工作台联动**：注册 `common-quick-palette` 常用资产模块，向雷切中枢提供高频常用语列表；
4. **单色矢量图标升级**：顶栏与侧栏的 `iconXlcCommon` 及新增别名 `iconLvCommon` 升级为 32×32 变量大括号矢量图标；
5. **托斯卡纳帝王紫 + 赛博薄荷绿美学**：注入 `--lv-brand: #9333EA` 与 `--lv-accent-mint: #10B981`，按钮赋予物理微触感，弹窗标题栏统一规范为 `.lv-dialog-title-wrap`；
6. **全生态打包规范与排雷**：构建时在根目录扁平输出 `./package.zip`；移动端挂载 `visualViewport` 动态键盘避让；英文名规范为 `Lv Common (Beta)`；补齐 `.gitattributes`、`SECURITY.md` 与 Release 工作流。

## 决策与落地

### 1. 跨插件联邦四别名挂载与注销
- 在 `src/service/external-bridge.ts` 引入 `COMMON_BRIDGE_ALIASES`，依次挂载 `xiaolvCommon`、`LvCommon`、`lvCommon`、`siyuanCommon`；
- disposer 严格比对 `host[alias] === bridge` 后执行注销，保障多实例安全。

### 2. 生态宏接入与雷切组件注册
- 在 `src/service/commands.ts`，使用 `callBridge("checkin", "items.read", ...)` 提取打卡项并格式化为 `✓ 项目名`，降级文案为 `（未检测到小驴打卡）`；
- 在 `src/index.ts`，引入 `registerRaikiriModuleSafely` 注册 `common-quick-palette` 并在 `onunload` 中调用注销句柄。

### 3. 图标升级与视觉美学注入
- 在 `src/ui/icons.ts` 更新 `iconXlcCommon` 与 `iconLvCommon` 为 32×32 单色插槽大括号变量图标；
- 在 `src/styles/tokens-r187.scss` 注入 `--lv-brand` 与 `--lv-accent-mint`；在 `src/styles/index.scss` 增加按钮 `:active:not(:disabled)` 物理微触感与 `.lv-dialog-title-wrap`。

### 4. 根目录 ./package.zip 产出与合规文件健全
- 在 `webpack.config.js` 注入 `afterEmit` 编译器钩子，将压缩包同步输出到根目录 `./package.zip`，并拷贝下划线语言包 `i18n/zh_CN.json` 与 `i18n/en_US.json`；
- 移动端在 `src/ui/variable-form.ts` 与 `src/ui/capture.ts` 监听 `visualViewport` 动态调整底边距；
- 统一控制台日志为 `[LvCommon]`；补齐根目录 `.gitattributes`、`SECURITY.md` 与 `.github/workflows/release.yml`。

## 结果与证据
- 单元测试维持 723/723 项全数通过；
- `pnpm build` 成功在根目录产出 547 KiB 扁平 `./package.zip`，并通过 `check-package` 15 项必需资源健全校验；
- 全套工程门禁（check, scan, check:errors, check:package, build）全数通过。
