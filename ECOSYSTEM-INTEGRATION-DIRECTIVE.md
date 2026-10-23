# 【小驴生态中枢统领指令】小驴常用 (xiaolv-common) 专项排查与全方位升级执行手册

> **统领下发方**：小驴快门中枢（`siyuan-quickgate`）
> **执行接收方**：小驴常用（`xiaolv-common`）开发 Agent
> **当前状态**：底座测试全绿 (723项) · 规范评分 100% 满分（继续保持）
> **核心原则**：零强依赖 · 帝王紫+赛博薄荷绿 Bento 美学 · 严禁私有存储穿透

---

## 一、 核心资产状态确认
1. **根目录 `icon.png`**：**已由中枢完成 256×256 殿堂级“帝王紫底配变量花括号与薄荷绿宝珠”高清头像替换（彻底告别原版汉字“常”），请严格保留勿覆盖！**
2. **本地就绪 SDK**：`src/ecosystem-bridge-kit.ts`（零外部依赖，直接 import 使用）。

---

## 二、 当前排查出的本插件专项缺陷与必修任务清单

### 【P0 级：发布产物落点与命名规范】
1. **构建产物 `./package.zip` 根目录落点对齐 (`webpack.config.js`)**：
   - 目前 Webpack 构建将 `package.zip` 输出在 `dist/` 目录下，导致 GitHub Actions 自动发布脚本与集市爬虫在根目录找不到 zip！
   - **必修修改**：配置 ZipPlugin 确保在项目根目录生成扁平结构的 `./package.zip`。
2. **`plugin.json` 规范化**：
   - 英文名加空格：将 `"default": "LvCommon (Beta)"` 规范为 `"Lv Common (Beta)"`（对齐家族 `Lv <Name>` 标准）；
   - `minAppVersion` 提升至 `"3.8.4"`。

---

### 【P1 级：顶栏单色图标升级与生态宏解析】
3. **顶栏单色矢量图标升级 (`src/index.ts`)**：
   - 更新 `iconXlcCommon`（并增加别名 `iconLvCommon`）为与新版 Logo 1:1 映射的标准 32×32 SVG（片段插槽 + `{{ }}` 变量大括号 + 变量宝珠）：
   ```xml
   <symbol id="iconXlcCommon" viewBox="0 0 32 32">
     <path d="M11 5h10c1.7 0 3 1.3 3 3v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.4"/>
     <rect x="6" y="8" width="16" height="19" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M10.5 13.5c-1 0-1.5.8-1.5 1.5v1c0 .8-.8 1-.8 1s.8.2.8 1v1c0 .7.5 1.5 1.5 1.5M17.5 13.5c1 0 1.5.8 1.5 1.5v1c0 .8.8 1 .8 1s-.8.2-.8 1v1c0 .7-.5 1.5-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
     <path d="M12.5 16.5h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
     <circle cx="22.5" cy="8.5" r="3" fill="currentColor"/>
   </symbol>
   ```
4. **生态宏 `{{xlc:checkin:today}}` 优雅解析 & 雷切组件注册**：
   - 调用 `src/ecosystem-bridge-kit.ts` 的 `callBridge("checkin", "items.read", ...)`，打卡未装时优雅返回“（未检测到小驴打卡）”；
   - 注册 `common-quick-palette` 小组件至雷切工作台。

---

### 【P2 级：合规文件补齐与块属性命名空间】
5. **自定义块属性规范化**：
   - 将 `custom-transform-not-found` 等属性统一加上前缀改为 `custom-xlc-*`，防冲突。
6. **补齐开源合规文件**：
   - 补齐根目录缺失的 `.gitattributes` 与 `SECURITY.md`。

---

## 三、 验收指令
修改完成后，在根目录执行：
```bash
pnpm check && pnpm test
```
确保全量 723+ 项门禁体检 100% 全绿通过！
