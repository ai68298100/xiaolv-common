# ADR 0001：技术栈 = webpack + TypeScript + node:test（与系列一致）

日期：2026-10-06 ｜ 状态：已采纳

## 背景

小驴常用需要从零建仓。可选路线：官方 vite-svelte 模板、vite-vue 模板、或小驴系列既有栈（webpack + TS + SCSS + pnpm + node:test）。

## 决策

采用与「小驴雷切」「小驴打卡」一致的栈：TypeScript + webpack + SCSS + pnpm，`siyuan` 官方 npm 包 1.2.9，测试用 Node 内置 `node:test`（无第三方断言/运行时依赖）。

## 理由

1. 系列一致性：联动协议、代码风格、构建产物结构（dist/index.js + index.css + i18n/ + package.zip）可直接对照兄弟仓库评审。
2. 本机已验证：Node 24.15 + pnpm 12.5.1；雷切同栈构建/测试链成熟。
3. 无 UI 框架运行时依赖：插件 UI 以思源 b3 组件类 + 少量自绘 DOM 为主，引入 Svelte/Vue 的运行时收益小于体积与第二套视觉系统的成本（雷切 ROADMAP §2.1 同款约束）。
4. node:test 零依赖即可覆盖纯模型层测试；真实宿主交互另外走 E2E，不混进单测。

## 后果

- 放弃 vite 模板的 HMR/双 target 便利；开发期用 `pnpm dev` watch + 思源重载插件即可，损失可接受。
- 测试文件用 `.test.cjs`（纯 Node，无构建步骤），被测模块从 `../src/**/*.ts` 经 esbuild 转译加载——不引入 jest/ts-node 依赖。
