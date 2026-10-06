# 集市上架 PR 草稿（待批准后执行，本文档不含任何推送动作）

> 发布政策：bazaar 仓库的 fork / 修改 / PR 必须在用户明确说「可以推送集市」之后执行。
> 本文提前备好全部内容，批准后流程约 10 分钟。

## 前置自检（全部满足后才发起）

| 项 | 状态 |
| --- | --- |
| 桌面真机验收 B-001（`pnpm e2e` 全绿输出留档 docs/acceptance/） | ⏳ 待用户令牌 |
| 移动端演练 B-002（安装/升级/卸载/降级提示核对） | ⏳ 待真机 |
| 正式 icon/preview | ✅ 已替换占位图 |
| 密钥扫描（`git log -p` + 现源码无令牌/密钥字面量） | 发布前最后跑一遍 |
| package.zip 构建 | ✅ |

## 第一步：fork 并修改 siyuan-note/bazaar

1. Fork `https://github.com/siyuan-note/bazaar`（或用既有 fork）。
2. 在 `plugins.json` 追加条目（**以仓库实际 schema 为准核对字段名后再提交**）：

```json
{
  "name": "xiaolv-common",
  "repo": "ai68298100/xiaolv-common",
  "branch": "main",
  "headline": "一次捕获，处处调用：锚定真实思源块的常用内容资产层",
  "author": "ai68298100",
  "home": "https://github.com/ai68298100/xiaolv-common",
  "icon": "icon.png",
  "preview": "preview.png",
  "description": "常用语、模板、代码、链接、图片、附件与块结构的快速调用器。条目锚定真实思源块（来源可回链、失效可见），支持插入时变量填充、片段嵌套、AI 整理/变换/语义找、模板包分享、移动端 sheet。",
  "keywords": ["常用语", "模板", "片段", "AI", "快速插入", "小驴常用"]
}
```

## 第二步：PR 描述（建议文案）

**标题**：`[Plugin] 小驴常用 (xiaolv-common)`

**正文要点**：
- 功能：八类捕获入口；双栏搜索弹窗（键盘全链路 + Alt+1~9 直达 + `?` AI 语义找）；插入时变量填充；片段嵌套；模板包分享；AI 整理/草稿/变换（含自定义指令）/语义找/标签体检；使用计数与常用排序；快速捕获；移动端 sheet。
- 差异化：条目锚定真实思源块——来源可回链、失效可见、随思源同步；`xiaolv-common/v1` 协议供其他插件注册内容源。
- 安全：不使用 SQL 查询作为核心依赖；AI 默认关、不保存密钥、正文出域显式开关、原文永不被改写；全部写入有回执。
- 质量：192 项自动化测试 + 15 组生产渲染冒烟；桌面内核链路提供 `pnpm e2e` 一键验收（输出留档 docs/acceptance/）。
- 开源：MIT。

## 第三步：PR 后

- 回应 bazaar 维护者的审核意见（常见：icon/preview 尺寸、README 语言、minAppVersion）。
- 合并后集市可搜「小驴常用」；后续版本 = 改 plugin.json `version` + 打 tag + bazaar 自动跟随。
