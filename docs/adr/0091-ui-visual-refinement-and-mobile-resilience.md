# ADR 0091：全表面 UI 设计令牌收敛、移动端手势滑动与视觉微动效加固

## 状态
已接受，T-0155 / R292（2026-10-21，用户指令立项：仔细研究各处 UI 并深度优化）。

## 背景与上下文
结合 `ui-ux-pro-max` 设计系统准则与对小驴常用所有表面的深度排查，发现以下四个视觉与交互体验优化点：
1. **内联样式污染与设计令牌偏离**：此前在设置面板与全域空态中散落了部分内联 `style.cssText`，难以自动适配思源的暗黑主题（Dark Mode）与系统高对比度模式（forced-colors）；
2. **窄屏与移动端折行挤压列表视口**：移动端 sheet 下，搜索框下方若同时存在热门标签与近期历史胶囊，多项换行折叠会向下侵占列表高度，造成垂直空间紧缩与布局跳动（CLS）；
3. **列表行焦点指示与对比度**：键盘导航上下移动和鼠标悬停时，列表项需要更清晰的边缘层级指示，以增强操作焦点感知；
4. **多源同步卡片在暗黑模式下的对比度**：同步比对模态框中的五态数值颜色需接入思源原生语义变量，确保在不同主题下满足 WCAG 4.5:1 对比度标准。

## 决策

### 1. 彻底清除非规范内联样式，统一收敛至标准设计令牌
- 在 `src/styles/index.scss` 定义规范类：
  - `.xlc-api-code-block`：外部协议展示卡片；
  - `.xlc-eco-matrix-title` / `.xlc-eco-matrix-list` / `.xlc-eco-row`：小驴家族全家桶协同状态面板；
  - `.xlc-empty-omni-tips`：全库检索自愈技巧提示卡；
- 移除所有散落在 TS 代码中的 `element.style.cssText`，100% 走类名与设计变量。

### 2. 窄屏与移动端横向平滑手势滑动 (`Overflow-X Scroll Snap`)
- 在 `@media (max-width: 620px)` 下：
  - `.xlc-quick-filter-pills` 与 `.xlc-search-history-bar` 强制 `flex-wrap: nowrap !important; overflow-x: auto !important;`；
  - 隐藏原生滚动条，开启 `-webkit-overflow-scrolling: touch;`；
  - 保证在移动设备上单行手势轻扫浏览全部胶囊，完全杜绝换行挤压列表视口。

### 3. 主列表行激活态与悬停微动效
- `.xlc-row:hover` 增加 `box-shadow: inset 2px 0 0 rgba(53, 117, 240, 0.4)` 左侧微指示线条；
- `.xlc-row--active` 强化为 `box-shadow: inset 3.5px 0 0 var(--b3-theme-primary) !important;` 搭配 `var(--xlc-list-selected)` 柔和背景；
- 平滑 transition 过渡，视觉焦点极其清晰稳定。

### 4. 同步比对卡片与徽标的深浅色主题自适应
- 卡片数值与状态徽标颜色接入 `var(--b3-theme-success)`、`var(--b3-theme-info)`、`var(--b3-theme-error)`，并使用 `rgba(..., 0.12)` 半透明底色，无论浅色、深色还是强对比度模式均完美对齐。

## 结果与证据
- 单元测试增至 715/715 项全数通过；
- a11y 样式门禁、高对比度模式（forced-colors）全项通过；
- 全套工程门禁（check, scan, check:errors, check:package, build）全数通过。
