# ADR 0095：思源 3.8.8+ 官方插件核心生命周期契约对齐与宿主生态深度融合 (SiYuan 3.8.8+ Host Lifecycle & Insertion Alignment)

## 状态
已接受，T-0160 / R292（2026-10-22，用户指令立项：研读思源最新源码与插件生命周期核心契约）。

## 背景与上下文
通过对思源笔记最新主线（v3.8.8）前端 `app/src/plugin` 与内核 `kernel/model/search.go` 源码的深入审计，发现了四项关键的契约影响与协同优化机会：
1. **设置窗口官方识别机制 (`hasPluginSetting`)**：
   - 官方通过 `Boolean(plugin.setting) || plugin.openSetting !== Plugin.prototype.openSetting` 来判断插件是否提供配置页；
   - 此前小驴常用仅定义了内部方法 `openSettings()`，未重写基类的 `openSetting()`，导致官方顶栏插件菜单、已安装列表可能不展现官方「设置」按钮；
   - 官方新增了独立桌面设置窗口通道（Issue #20002），插件必须在 `plugin.json` 声明 `"settingsWindow": true`，内核才会将其加载到独立设置窗口中。
2. **插件存储会话缓存过期与挂起风险 (Issue #19908)**：
   - 官方文档明确说明 `loadData` 失败时会自动回退到内存缓存 `this.data[storageName]`。当其它窗口修改或删除文件时，未清理缓存的读取会误拿脏数据；
   - `saveData` 在遇到网络异常或内核负数错误码时可能 Promise 持续等待挂起，且兑现时不校验 `res.code`。
3. **编辑器稳定插入与可见性防御 (Issue #20566)**：
   - 官方在 commit `0af0e0a1` 与 `f1ece6b1` 明确：编辑器处于隐藏状态（`.fn__none`、`[inert]` 或未挂载）时，强制拒绝插入以防破坏非活动文档选区；
   - 官方在 `siyuan` 模块中导出了全新的原子插入接口 `insertContent({ data, dataType, editor, range })`。
4. **全文本块检索排序语义对齐 (`FullTextSearchBlock`)**：
   - 官方内核 `kernel/model/search.go` 注释明确指出：`OrderBy: 0 为按块类型，7 为按相关度降序`；
   - 之前传入了 `orderBy: 0`，导致底层 SQLite FTS 先按块类型聚合而非纯相关度排序。

## 决策

### 1. 声明 `settingsWindow: true` 并重写 `openSetting()`
- 在 `plugin.json` 声明 `"settingsWindow": true`，打通独立桌面设置窗口的加载与显示；
- 在 `XiaolvCommonPlugin` 重写 `override openSetting(): void { this.openSettings(); }`，对齐官方 `hasPluginSetting` 识别算法。

### 2. 存储层会话缓存清理与超时错误码加固
- 在启动加载与 `onDataChanged` 收到变更时，执行 `delete this.data[key]`，杜绝读取回退到脏内存缓存；
- 在 `persistSidecar` 中增加 5 秒超时保护与 `res.code === 0` 严格校验。

### 3. 编辑器可见性防御与原子插入接口接入
- 在 `HostBridge.insertMarkdown` 中增加 `.fn__none, [inert]` 与 `isConnected` 宿主可见性检查；
- 渐进增强优先调用官方原子接口 `siyuan.insertContent`，低版本平滑降级到 `editor.insert`。

### 4. 全库块检索参数修正为官方相关度降序 (`orderBy: 7`)
- 在 `src/service/omni-search.ts` 中修正为 `orderBy: 7`，直接利用 SQLite FTS BM25 相关度排序召回最匹配块，结合插件自身二次精细重排（Secondary Re-ranking），达到最佳召回效果。

## 结果与证据
- 单元测试增至 721/721 项全数通过；
- 新增 `tests/r295-siyuan-host-contracts.test.cjs` 验证契约边界与可见性防御；
- 全套工程门禁（check, scan, check:errors, check:package, build）全数通过。
