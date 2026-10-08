# B-004 上游问题报告草稿（siyuan-note/siyuan）

> 状态：草稿，待与上游确认提交渠道。以下为可直接粘贴的报告正文（英文版可再译）。
> 触发环境与复现脚本均在仓库内：`scripts/repro-settings-crash.cjs`（种子可复现）。

---

## 标题

设置弹窗在「展开插件选择器 + 快速切换开关」混合操作序列下渲染进程硬崩溃（Chromium 层，非 JS 异常）

## 环境

- SiYuan 3.8.6（Windows 10 Pro x64；Playwright Chromium ≈154 与 Electron 内核两种环境均可观察）
- 插件：任意含「设置面板 + 多开关 + 文档选择器」形态的插件（以 xiaolv-common 0.3.x 为载体复现）

## 复现

1. 打开插件设置弹窗（含多个 `input[type=checkbox]` 开关与一个「更改内容库」展开式选择器区块）
2. 展开选择器区块
3. 以每步 ~30ms 的节奏循环：点击全部开关（change 切换）+ 点击「更改内容库」按钮（展开/收起切换）
4. 约 100–250 步内 Chromium 渲染进程硬崩溃（`page crash`，DevTools 断连）

确定性种子脚本（Playwright）：

```js
// 简化骨架；完整可复现脚本见仓库 scripts/repro-settings-crash.cjs
for (let i = 0; i < 200; i++) {
  document.querySelectorAll("input[type=checkbox]").forEach((b) => b.click());
  changeLibButton.click(); // 展开 ↔ 收起
  await sleep(30);
}
```

## 已排除

- JS 堆 < 60MB（非 OOM）；无 JS 异常（崩溃前 0 pageerror/console.error）
- GPU 已排除：`--disable-gpu` 软件渲染仍崩
- 与具体开关业务逻辑无关：逐类操作隔离 13 类全部干净
- 必要条件 = **选择器区块存在 + 混合快速切换**（单开关 300 次、随机 500 次无选择器均干净）
- 缓解实验：将「展开后同帧 focus()」改为 `requestAnimationFrame` 延一帧后，250 步压测 3/3 不再复现——**同帧布局变更 + 强制聚焦是敏感路径之一**

## 怀疑方向

Blink 层在「display 切换 + focus() 同帧执行 + 相邻表单控件批量 change」的交错下触发渲染进程崩溃（疑似 StyleEngine/axObject 生命周期问题）。缓解实验支持该方向，但根因需上游在 Chromium 层定位。

## 期望

- 上游确认该 DOM/交互模式是否为已知 Chromium 崩溃面
- 如属 Chromium bug，给出可规避的 DOM 模式建议（如：展开类操作后禁止同帧 focus；或开关 change 处理器避免与 display 切换同帧交错）

---

## 附：R142 真机验收发现的另一条上游线索（同报或分报）

思源前端在插件压测序列（弹窗快速开关 + 开关批量切换）下，主程序自身抛出
`TypeError: Cannot read properties of null (reading 'style')`（`stage/build/desktop/main.*.js`
内 `g()`/`B()` 函数，stack 已留档 R142 账本）——疑似对话框销毁后 rAF/事件回调仍触达已置空的
DOM 引用。非插件代码触发，供上游排查参考。
