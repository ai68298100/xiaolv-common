# 搜索列表虚拟滚动专项测量（2026-10-14）

本报告只记录测量结果，不把 Chromium harness 的结果当作思源 Electron/Android 宿主验收。测量使用生产 `CommonSearchDialog`、生产 `dist/index.css` 和 `docs/design/harness.html`，通过 harness 的 `search` 依赖注入恰好 100 条结果；键盘/ARIA 回归已接入 `pnpm run test:ui`。

## 环境与方法

- 视口：Chromium `1280 × 720`，`deviceScaleFactor=1`。
- 列表容器：两种模式都固定为 `420px` 高，实际 `clientHeight=418px`。
- 数据：100 条合法 `SearchEntry`，无分组、无提供方行，确保进入同一渲染路径。
- 虚拟模式：使用生产默认阈值（结果数大于 80 条），固定行高 72px、overscan 8。
- 全量对照：仅在浏览器内临时把阈值提高到 10000，使同一生产渲染器保留 100 行；未写回源码。
- 首次绘制时间：从调用 `refresh()` 到 Promise 完成以及下一帧 `requestAnimationFrame` 的墙钟时间。
- 后续刷新时间：同一弹窗连续刷新 10 次，取中位数。
- 键盘路径：搜索框连续触发 99 次 `ArrowDown` 到第 100 条，再连续 99 次 `ArrowUp` 回到首条，检查活动索引、DOM 行、`aria-activedescendant`、`aria-selected` 和滚动位置。

## 结果

| 指标 | 虚拟窗口 | 全量 100 行 | 变化 |
| --- | ---: | ---: | ---: |
| 首屏真实结果行 DOM | 22 | 100 | 减少 78% |
| 列表 `clientHeight` | 418px | 418px | 相同 |
| 列表 `scrollHeight` | 7200px | 7299px | 行高/边框实现差异，均可滚到末项 |
| 首次 `refresh()` 完成 | 17.10ms | 5.90ms | 虚拟窗口首次装配多 11.20ms |
| 首次刷新后的下一帧 | 18.00ms | 13.10ms | 虚拟窗口多 4.90ms |
| 后续刷新中位数（10 次） | 1.70ms | 5.50ms | 减少 69.1% |

首次装配时虚拟窗口会创建占位高度和滚动监听，所以在 100 条这一规模下首次刷新比全量慢；稳定刷新和 DOM 数量已经出现明确收益。这个结果支持保留窗口化实现，但不支持仅凭首次绘制宣称所有场景都更快。

## 键盘回归

虚拟列表滚到末项后，数据索引已经到 99，末项也出现在 DOM 中，但活动语义没有同步：

```text
activeIndex=99
last row exists=true
scrollTop=1166
aria-activedescendant=null
last row aria-selected="false"
```

回到首项时语义恢复正常：

```text
activeIndex=0
first row exists=true
scrollTop=0
aria-activedescendant="xlc-result-0"
first row aria-selected="true"
```

根因是 `paintActive()` 把窗口内的局部行序号当作全局结果索引。窗口从第 91 条开始时，末项是局部第 9 行，不等于全局索引 99；随后按全局索引从局部数组取活动行也会得到空值。已改为按每一行的 `data-xlc-index` 匹配全局 `activeIndex`，提供方行按稳定 provider id 匹配，再用匹配行设置 `aria-selected`、`aria-activedescendant` 并滚动到可见位置。

修复后的生产 smoke 结果：在同一视口连续 99 次 ArrowDown 后，末项 `data-xlc-index=99` 存在且 `aria-selected=true`，搜索框 `aria-activedescendant=xlc-result-99`，列表滚动位置大于 0；连续 99 次 ArrowUp 后首项恢复选中且 `aria-activedescendant=xlc-result-0`。当前视口实际保留 11–14 行 DOM（随容器高度变化），仍显著低于 100 行。

## 复现入口

- 生产页面：[`docs/design/harness.html`](design/harness.html)
- harness 装配：[`scripts/harness/entry.ts`](../scripts/harness/entry.ts)
- 生产列表实现：[`src/ui/dialog.ts`](../src/ui/dialog.ts)
- 虚拟列表样式：[`src/styles/index.scss`](../src/styles/index.scss)

键盘/ARIA 回归已由 `scripts/render-production.cjs` 固定执行；生产宿主中的真实窗口尺寸、字体和 Electron 事件派发仍需单独现场验证。

