# ADR 0063：层次化标签与场景嵌套分类导航 (G11) 契约

## 状态

已接受，T-0122 / R269（2026-10-19，对标 Raycast / 树状分类管理，落地 G11）。

## 背景与上下文

小驴常用条目拥有分类（`category`）与多标签（`tags`）属性。
在企业知识库、客服话术与技术模板的实际使用中，分类和标签经常具备层次化嵌套特征，例如：
- 分类：`客服/售后/退换货`、`商务/合同/补充协议`、`研发/前端/Vue`
- 标签：`财务/开票`、`技术/数据库/Postgres`

此前系统仅支持平铺字符串严格相等匹配（`entry.category === query.category`），导致用户筛选顶级父分类（如「客服」）时无法召回子分类（如「客服/售后」）的条目；同时，在 UI 下拉框中平铺展示长路径使得视觉扫视成本极高。

## 决策

1. **严格斜杠边界层级切分与判定（Boundary Guarded Cascading）**：
   - 在 `src/model/hierarchy.ts` 导出纯函数 `isHierarchicalChild(childPath, parentPath)`；
   - 规则：`childPath === parentPath || childPath.startsWith(parentPath + "/")`；
   - 边界防御（红线）：严格通过 `+ "/"` 防御前缀误伤，例如「客服」天然匹配「客服/售后」，但绝对不匹配「客服2」或「客服专员」。
2. **检索过滤层级级联（Cascading Match in PassesFilters）**：
   - `matchesHierarchicalCategory`：当筛选「客服」时，自动级联匹配命中所有属于「客服」后代分类的条目；
   - `matchesHierarchicalTag`：当筛选标签「财务」时，只要条目的标签列表中包含「财务」或「财务/*」子标签，即判定命中。
3. **层级树构建与多级聚合计数**：
   - 纯函数 `buildHierarchyTree` 将一维路径列表解析为多叉树 `HierarchyNode[]`；
   - 递归累加各层级直接条目与后代子项条目数（例如父节点总计数 = 直属计数 + 所有子节点计数之和）；
   - 同级节点按中文字典序稳定排序。
4. **UI 筛选器扁平缩进与分支指引展示**：
   - 纯函数 `flattenHierarchyTree` 将树状结构转换为带缩进分支符号的下拉选项列表；
   - 顶层根节点呈现名称（如 `客服`），子级呈现 `├ 售前`、`└ 售后`，孙级呈现 `  └ 退款`；
   - `<option value="...">` 始终保持真实完整路径（`entry.path`），保证前后端数据契约无损。

## 结果与证据

- 单元测试增至 577/577 全部通过；
- 专项测试 `tests/r269-hierarchy.test.cjs` 覆盖路径切分、严格前缀边界、树构建与计数、下拉扁平化以及 `passesFilters` 级联实测；
- 负向验证：故意在 `src/model/hierarchy.ts` 中移除 `+ "/"` 边界判断，测试准确失败检出（`AssertionError: Expected values to be strictly equal: true !== false`），恢复源码后复验全绿；
- 全套工程门禁 `check:errors`、`check`、单元 `577/577`、`build`、`test:ui`、`test:ix`（74/74）、`scan`、`check:package` 全数通过。
