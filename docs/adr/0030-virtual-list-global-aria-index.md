# ADR 0030：虚拟列表使用全局索引维护键盘与 ARIA 状态

## 状态

已采纳（2026-10-14，T-0056 / R203）。

## 背景

搜索结果超过 80 条时，列表只渲染视口附近的窗口。窗口内 DOM 序号会随着滚动变化，而键盘导航保存的是 `results` 中的全局索引。旧实现用窗口内序号匹配全局索引，滚动到末段后视觉滚动仍然正确，但 `aria-activedescendant` 为空、活动行 `aria-selected=false`，键盘用户无法获知当前条目。

## 决策

1. 库条目行以稳定的 `data-xlc-index` 作为全局结果索引；活动态、选中态和活动后代均按该属性查找，不依赖当前窗口的局部位置。
2. 提供方行没有库索引，继续使用 `xlc-provider-{index}` 稳定 ID 单独匹配；分组头和上下占位永不参与导航。
3. 键盘回归固定覆盖 100 条结果连续 ArrowDown 到末项、再 ArrowUp 回首项，验证窗口化、滚动位置、`aria-selected` 和 `aria-activedescendant`。

## 取舍与边界

- 虚拟列表仍使用固定行高和 overscan；发现页维持分页，不共享该窗口化实现。
- 生产 smoke/Chromium 只证明 DOM 与键盘契约；思源 Electron 的真实字体、窗口高度和事件派发仍需现场验收。

## 验证

- `pnpm run test:ui`：虚拟列表 100 条结果首末项键盘/ARIA 回归通过；当前视口保留 11–14 行 DOM。
- `pnpm run check`：通过。
- 详细前后测量见 [`docs/perf-virtual-scroll-2026-10-14.md`](../perf-virtual-scroll-2026-10-14.md)。
