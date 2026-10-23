# 【小驴生态中枢统领指令】小驴常用 (xiaolv-common) 全方位升级与跨插件协同执行手册

> **统领下发方**：小驴快门中枢（`siyuan-quickgate`）
> **执行接收方**：小驴常用（`xiaolv-common`）开发 Agent
> **架构基线**：Epoch 6 联邦规范 · 零强依赖优雅降级 · 托斯卡纳帝王紫+赛博薄荷绿美学 · 历史排雷防线

---

## 一、 核心定位与视觉资产状态
- **生态角色**：**【内容资产与快捷调用层（Content Asset & Snippet Layer）】**——锚定思源真实块的常用语、模板、代码库，支持动态变量与全生态调用。
- **专属主题色**：**托斯卡纳帝王紫（`#9333EA` ➔ `#581C87`）＋ 赛博薄荷荧光绿变量石（`#10B981`）**。
- **根目录 `icon.png`**：**已由快门中枢完成 256×256 殿堂级“帝王紫底配变量花括号与赛博薄荷绿宝珠”高反差头像替换（彻底告别原版汉字“常”），请勿覆盖回退！**
- **本地已就绪 SDK**：`src/ecosystem-bridge-kit.ts`（零外部依赖，可直接 `import`）。

---

## 二、 必做任务 1：跨插件联邦联动（Epoch 6 标准）

### 1. 四别名挂载与安全注销 (`src/index.ts` & `src/service/external-bridge.ts`)
- 维护 `window.xiaolvCommon`，同步兼容挂载 `window.LvCommon`、`window.lvCommon`、`window.siyuanCommon`（First-Instance-Wins + 卸载时身份核验安全注销）；
- 保持 v1 只读子集稳定（`search`, `get`, `recent`, `favorites`, `resolve`）。

### 2. 生态宏 `{{xlc:checkin:today}}` 优雅降级解析 (`src/service/library.ts` 或宏引擎)
- 解析 `{{xlc:checkin:today}}` 时，使用 `src/ecosystem-bridge-kit.ts` 的 `callBridge` 安全调用小驴打卡：
  ```ts
  const checkinSummaryText = await callBridge(
      "checkin",
      "items.read",
      (bridge) => {
          const items = bridge.queryItems({ includeArchived: false });
          return items.map(i => `✓ ${i.name}`).join("\n");
      },
      () => "（未检测到小驴打卡）" // 未安装打卡时的优雅降级文本
  );
  ```

### 3. 向小驴雷切注册“高频常用语”小组件 (`src/index.ts`)
- 调用 `registerRaikiriModuleSafely` 注册 `common-quick-palette` 小组件，展示最近调用的前 5 条内容资产。

---

## 三、 必做任务 2：顶栏与侧栏单色图标升级 (`src/index.ts`)

将 `this.addIcons(ICONS)` 中的 `iconXlcCommon`（并同步新增别名 `iconLvCommon`）更新为与新版 Logo 1:1 映射的 32×32 单色矢量图标（片段插槽 + `{{ }}` 变量大括号 + 变量点）：
```xml
<symbol id="iconXlcCommon" viewBox="0 0 32 32">
  <path d="M11 5h10c1.7 0 3 1.3 3 3v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.4"/>
  <rect x="6" y="8" width="16" height="19" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M10.5 13.5c-1 0-1.5.8-1.5 1.5v1c0 .8-.8 1-.8 1s.8.2.8 1v1c0 .7.5 1.5 1.5 1.5M17.5 13.5c1 0 1.5.8 1.5 1.5v1c0 .8.8 1 .8 1s-.8.2-.8 1v1c0 .7-.5 1.5-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M12.5 16.5h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="22.5" cy="8.5" r="3" fill="currentColor"/>
</symbol>
```

---

## 四、 必做任务 3：UI 轻量统一与参考图 Bento 软性美学升级 (`src/styles/index.scss`)

1. **注入专属品牌色与圆角阶梯**：
   ```scss
   --lv-brand: #9333EA; /* 托斯卡纳帝王紫 */
   --lv-brand-soft: color-mix(in srgb, var(--lv-brand) 12%, transparent);
   --lv-accent-mint: #10B981; /* 赛博薄荷绿点缀 */
   ```
2. **吸收最初参考图设计神韵**：
   - 保持 Bento 便当盒看板与 `9999px` 胶囊标签优势；
   - 按钮挂载 `:active:not(:disabled) { transform: translateY(1.5px) scale(0.985); }` 物理微触感；
   - Dialog 弹窗标题栏统一采用 `.lv-dialog-title-wrap`（22×22 紫底白标 + 标题 + 版本胶囊）。

---

## 五、 必做任务 4：深层工程规范与历史排雷加固（重点必改！）

1. **`plugin.json` 关键对齐（必改）**：
   - **修正英文名空格**：将 `"default": "LvCommon (Beta)"` 规范为 `"Lv Common (Beta)"`（中间加空格，对齐家族 `Lv <Name>` 标准）；
   - `minAppVersion` 统一由 `"3.8.0"` 提升至 `"3.8.4"`；
   - `keywords` 确保包含 `"lv"`, `"小驴"`。
2. **构建产物 `./package.zip` 路径对齐 (`webpack.config.js`)**：
   - 当前 Webpack 构建后根目录缺失 `./package.zip`（产出在 `dist/` 内），请确保 `pnpm build` 后在项目根目录下生成扁平结构的 `./package.zip`，对齐全生态发布脚本！
3. **自定义块属性与跨平台快捷键纠偏**：
   - 排查 `custom-transform-not-found` 等裸属性，统一规范为 `custom-xlc-*` 命名空间；
   - 检查硬编码的 Mac 符号 `⌥⇧C` 等快捷键，确保 Windows/Linux 跨平台兼容；
4. **移动端虚拟键盘避让 & 合规补齐**：
   - 移动端变量填参或新建弹窗挂载 `window.visualViewport` 动态抬升底边距，防键盘遮挡提交按钮；
   - 控制台日志前缀统一由 `[小驴常用]` 规范为 `[LvCommon]`；Toast 提示前缀保持 `[小驴常用]`；
   - 确保构建产出包含下划线格式的 `dist/i18n/zh_CN.json`；
   - 补齐根目录缺失的 `.gitattributes`、`SECURITY.md` 与 `.github/workflows/release.yml`。

---

## 六、 验收标准
执行完毕后，在根目录运行：
```bash
pnpm check && pnpm test
```
确保全量 723+ 项门禁体检 100% 全绿通过！
