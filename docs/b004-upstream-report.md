# B-004 上游问题报告草稿（siyuan-note/siyuan）

> 状态：本地草稿，尚未发送或提交上游；B-004 继续开放。整理日期：2026-10-16。
> 本文区分历史 Chromium harness 硬崩溃、思源 stage 前端宿主异常和当前 Electron 样本。三者是否同因尚未确认，不能合并为“Electron 已复现硬崩溃”。
> T-0082 使用的镜像事后发现额外启动日常工作区并自动云同步，整个镜像隔离声明失效。特定测试 renderer/API 为临时目标，但完整矩阵须保留多工作区并存的环境限制；详见 [隔离失效记录](electron-isolation-incident-2026-10-16.md)。

## 建议标题

插件设置快速混合操作的历史 Chromium 崩溃与 stage 前端 `null.style` 异常线索（当前 Electron 有限矩阵未复现）

## 环境与现象范围

| 证据层 | 环境及载体 | 已记录现象 | 限制 |
| --- | --- | --- | --- |
| R132，R138–R139 | Windows 下 Playwright 启动 Chromium，加载本仓库 `docs/design/harness.html` 和当时的小驴常用构建；不是思源 Electron | R132 随机混合序列三次出现 `page crash`；rAF 聚焦缓解后的 R139 三轮未复现 | 历史文档对 Chromium 主版本有不一致记载，本文不指定未经日志复核的精确版本；没有可定位原生根因的 crash dump |
| R142，R163 | Playwright/Chrome 浏览器加载思源 stage 前端、连接独立真实内核；不是 Electron 壳 | 完整插入/搜索前置后压测，出现宿主 `main.*.js` 的 `null.style` JavaScript 异常，页面仍存活 | 历史完整流程含直接删除宿主 Dialog DOM 的操作，不能排除测试流程损伤；独立设置压测未复现该异常 |
| 2026-10-16 Electron 对照 | 可销毁的思源 `3.8.7` 镜像与独立工作区，实际 Electron renderer；T-0074 样本及 T-0082 完整前置矩阵分别记录 | T-0074 单轮及 T-0082 五组有限序列均未见 crash、`null.style` 或其他运行时异常 | 未复现不能证明修复；不外推到其他版本、平台、插件或人工使用 |

所有历史阳性样本均以小驴常用为载体。没有其他插件的对照证据，不声称任意同类插件均可复现。历史 stage 内核与当前 Electron 版本也不应混用；旧轮次缺少完整版本身份时，不按当前安装版本补写。

## 现象 A：历史 Chromium harness 渲染进程崩溃

依据：[当期账本 R132、R138、R139](dev-plan-2026-10-06.md)，历史工具 `scripts/repro-settings-crash.cjs`。

- harness 打开小驴常用设置，固定伪随机种子 `20261009` 驱动开关、库选择器展开/收起、输入和其他设置操作。R132 三次 `page crash` 记录位于第 `112–213` 步；这是当时构建与操作序列的历史结果，当前构建不保证复现。
- 在当时的有限隔离矩阵中，13 类操作单独执行各 30 步无崩溃；单开关 300 次、去掉 picker 的随机序列 500 次也未见崩溃。库选择器存在并参与混合快速操作是这些样本中的关联条件，尚不能认定为所有环境下的必要或充分条件。
- 使用 `--disable-gpu` 的三轮仍崩溃；崩溃前观测的 JavaScript 堆小于 `60MB`。这些观测不足以排除所有 GPU/驱动路径或进程级内存问题，也不能据此定位 Blink 子系统。
- R138 将选择器展开后的同步 `focus()` 延迟到 `requestAnimationFrame`；账本记录 R139 同序列 `250` 步三轮均 CLEAN，而之前同序列三轮崩溃。这支持保留该缓解，但无法单独证明 focus、StyleEngine、无障碍树或某个 Chromium 生命周期是根因。

历史工具载入的是本地 harness，其中宿主接口由测试环境提供。该证据证明当时浏览器测试页出现硬崩溃，不证明思源 Electron、真实宿主设置组件或当前插件版本具有相同故障。

## 现象 B：历史思源 stage 前端的宿主 `null.style` 异常

依据：[当期账本 R142、R163](dev-plan-2026-10-06.md)。R142 记录一条宿主内部异常；R163 使用 CDP `Runtime.exceptionThrown` 补充堆栈取证：

```text
TypeError: Cannot read properties of null (reading 'style')
stage/build/desktop/main.*.js:7291 ← 7290
压缩函数帧：g / B
```

- R163 记录四个全新环境在完整前置插入/搜索交互后，再执行设置面板 `200` 次快速开关及选择器展开操作，各捕获 `2–4` 条异常；页面存活，没有 `page crash`。
- 独立运行仅打开设置和压力循环的 `scripts/repro-settings-style-null.cjs` 未捕获异常。因此该脚本是取证工具，不是已经证明的独立最小复现。
- 已观察的堆栈帧位于宿主 bundle，可作为调查异常抛出位置的线索；这不能排除插件交互或测试前置对宿主状态的影响，也不证明是宿主单方缺陷。
- 旧 `scripts/real-acceptance.cjs` 的完整流程有直接移除宿主 Dialog DOM 的操作。该行为可能绕过正常销毁生命周期，历史结果必须保留此限制；T-0082 改用真实控件/官方 Dialog 重新建立前置，不能把旧流程直接视作可信 Electron 复现。

“对话框销毁后回调继续访问空 DOM”目前只是待检验假设。缺少相应对象生命周期或源码定位证据，本文不将其列为根因，也不将现象 B 等同于现象 A。

## 当前 Electron 对照与新增矩阵

### 已有单轮样本（T-0074，2026-10-16）

- 可销毁思源 `3.8.7` 副本，临时根目录 `C:\Users\Admin\AppData\Local\Temp\xlc-electron-acceptance-20261015-170953`，工作区为其 `workspace`；内核端口 `6822`、CDP `9338`。
- 前端刷新后打开设置、展开“更改内容库”，以约 `30ms` 间隔执行 `200` 次 checkbox 与选择器混合切换；记录 `crashed=false`、`errors=0`、`alive=true`。证据见 [Electron 验收记录](electron-acceptance-2026-10-16.md)，截图 `electron-settings-stress-final.png`。
- 这是单轮合成压力下的未复现样本，没有覆盖 R163 的全部前置；不解除 B-004。

### 完整前置与多轮取证（T-0082 / R229）

- 工具：`scripts/electron-settings-stress-acceptance.cjs`。环境为思源 `3.8.7`、Electron `44.7.0`、Chromium `152.0.7977.130`；测试工作区 `C:\Users\Admin\AppData\Local\Temp\xlc-electron-r226-20261016061028`，镜像主 PID `36280`，测试内核 `6856`、CDP `9356`。连接前验证临时路径、镜像命令行，连接后核对 CDP browser PID 与选定 renderer 工作区。该检查没有枚举镜像所有工作区；10:12:15 起同镜像额外运行日常工作区内核，故不能称为严格隔离环境，不能声称日常数据未改或无影响。
- 正式矩阵 `11/11` 取证检查完成，原始记录为上述工作区 `temp\settings-stress-acceptance-1792117848679\result.json` 与 `trace.jsonl`。本次部署 `index.js` 为 `347523` bytes，SHA256 `0c0f6bd7036b7330108548b5d6ca5d22e1e58d4927534b90401acab20a5fd6ad`；CSS 为 `132927` bytes，SHA256 `acf610026b83c2a58705aa8517c242b4e8c602d0b2381edaeaa95d8f29f416db`。

| 组别 | 已完成步骤 | 实际开关激活次数 | 页面存活 | 运行时异常 |
| --- | ---: | ---: | --- | ---: |
| 直接进入设置，快速合成对照 | 200 | 465 | 是 | 0 |
| 完整前置后快速合成第 1 轮 | 200 | 464 | 是 | 0 |
| 完整前置后快速合成第 2 轮 | 200 | 455 | 是 | 0 |
| 完整前置后快速合成第 3 轮 | 200 | 453 | 是 | 0 |
| 完整前置后慢速指针操作 | 12 | 12 | 是 | 0 |

- 合计 `812` 步、`1849` 次实际开关激活；记录了每次实际状态变化，不能把步骤数直接等同于开关次数。每个完整前置组均先用真实搜索窗口复制、向本轮干净目标插入引用，内核回读唯一精确 marker，再正常关闭 Dialog 后打开设置。设置压力前后，配置、源块和已插入目标的快照不变，各轮修改的开关已恢复。
- 正式矩阵 `crashed=false`，宿主/插件/未知 CDP 异常、未匹配 pageerror、console error、`null.style` 均为 `0`，原生 dialog 事件 `0`。快速组使用合成 click；慢速组使用真实指针输入和较长间隔，仍是自动化样本，不代表人工验收。
- **取证门禁负向**：临时脚本副本经真实 API 向专属源文档追加 witness 后，“源快照不变”断言准确失败，`finally` 删除 witness；另一副本通过 `setTimeout` 真实抛出唯一 Error，CDP 归为 unknown 并被“插件或未知异常”门禁拒绝。它们验证取证工具能检出违规，不属于 B-004 自发复现。回执见 `temp\r229-negative-injections-1792118052503\injection-report.json`；仓库原脚本前后 SHA256 相同。恢复原脚本后另跑三组各 `2` 步小样，`7/7` 通过，记录为 `temp\settings-stress-acceptance-1792118115472\result.json`；不能将该小样标为第二轮完整压力矩阵。

取证边界由 [ADR 0052](adr/0052-electron-settings-stress-evidence.md) 约束：直接进入设置作对照，真实复制/插入/搜索后再进入设置，分别采样快速合成压力和接近人工速度的指针操作；后者仍是自动化，不代表人工验收。整个流程不得删除宿主 DOM、stub 活动编辑器或强制穿透遮罩。

当前结论限于上述构建、版本、特定临时 renderer/夹具和同镜像多工作区并存的有限序列未复现两类症状；B-004 保持开放，没有据此确认历史根因或宣布修复。正式上游报告前应先在具备操作系统层隔离、独立宿主配置和 profile 的环境重新建立可重复样本；profile 本身或进程快照检查不能替代操作系统隔离。

## 待上游协助的问题与补证

- 两类历史症状是否需要分开报告；定位 renderer crash 还需哪些原生诊断数据和精确浏览器版本。
- 宿主 `main.*.js` 的对应源码位置是什么；在走正常 Dialog 生命周期的完整前置中能否重现 `null.style`。
- 如果当前 Electron 矩阵仍未复现，下一步应缩减哪些前置/DOM 交互，并增加哪些诊断，而不是据单轮 CLEAN 推断故障已修复。

正式发送前应附实际可共享的版本、复现序列、原始日志和脱敏证据；本地临时路径与历史账本并非上游可访问的附件。本文件目前只准备报告内容，没有创建 issue、发送消息或联系上游。
