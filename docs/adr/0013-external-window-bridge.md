# ADR-0013：对外窗口桥 `window.xiaolvCommon` v1（只读子集）

日期：2026-10-11 · 状态：已接受 · 任务：T-0031

## 背景

`xiaolv-common/v1` 协议模型（CAPABILITIES + ActionResult 信封）与 outbound 事件（item-created/updated/deleted/inserted）已落地，但兄弟插件此前只有两条消费路径：①`protocolCommands`（稳定 ID 命令面，面向宿主命令调用）；②作为 provider 注册（方向是内容进 xlc）。**没有任何面向兄弟插件的「调用 xlc 能力」的进程内入口**——`window.siyuanCheckin`/`window.LvContacts`/`window.LvHome`/`window.siyuanGlean` 先例均已有各自窗口桥，小驴快门（siyuan-quickgate）作为生态联动中枢需要一个同构入口。

## 决策

1. **暴露形态**：窗口桥 `window.xiaolvCommon`（protocol=1 + protocolName="xiaolv-common" + capabilities 协商 + whenReady + 卸载注销），对齐 LvHome 先例（首个实例持有窗口期，disposer 校验身份防误删新桥）。
2. **方法直通 ActionResult**：桥方法把 `XiaolvCommonService` 的返回**原样透传**（含 protocol/protocolVersion/ok/reason/message/data 信封），不二次包装——消费方按既有协议语义处理失败（not-found/invalid-input/timeout/kernel-error），桥层零新语义。
3. **v1 只读子集**：`search` / `get` / `getRecent` / `getFavorites` + `getCapabilities()`（完整能力描述符，消费方自行协商）。写面（save/update/remove/insert/copy）**不进 v1**：写路径需要「桥写开关 + 外部来源标记」的安全设计（对照拾遗 `integration.bridgeWriteEnabled` 先例），且 insert 有宿主焦点副作用——留 v2 立项，本 ADR 只承诺只读面稳定。
4. **卸载注销**：onunload 移除 window 引用并触发宿主钩子；多实例/重复卸载安全（只删自己挂载的桥）。

## 后果

- 兄弟插件（快门/雷切）可同构消费：协商 → 只读检索/取用。
- 外部写路径缺失是**显式缺口**：消费方写需求（如外部 Agent 新增条目）在 v2 前应走思源命令（`protocolCommands` 的 saveSelection 有宿主确认）或 UI。
- 门禁：桥测试锁定只读面（写方法不存在于桥对象上，防意外扩面）。
