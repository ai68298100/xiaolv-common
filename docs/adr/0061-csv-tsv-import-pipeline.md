# ADR 0061：通用 CSV/TSV 表格数据批量导入 (G8) 与智能字段映射契约

## 状态

已接受，T-0120 / R267（2026-10-19，对标同类资产汇聚能力，落地 G8）。

## 背景与上下文

在思源笔记的内容资产体系建设中，企业客户、商务销售、技术支持、客服团队以及知识管理作者大量使用电子表格（如 Excel、飞书多维表格/电子表格、Google Sheets、Numbers 或本地导出的 CSV / TSV 文件）维护成百上千条快捷话术、常见解答（FAQ）与模板片段。
此前小驴常用仅支持专有的 JSON 包、Markdown 模板包（`xlc-pack`）、Espanso YAML 格式与 Compact Bundle 紧凑分享串，用户从表格迁移资产时门槛极高，亟需一套高兼容性、智能免配置且安全可追溯的通用表格导入流水线。

## 决策

1. **RFC 4180 严格规范与状态机解析**：
   - 在 `src/service/csv-tsv-import.ts` 实现状态机表格解析器 `parseDelimitedTable`，完整支持双引号包围字段、双引号转义（`""` -> `"`）、字段内换行符（CRLF / LF）以及 UTF-8 BOM（`\uFEFF`）自动清洗。
   - 智能容错：对末尾未正常闭合引号、非法空行与格式微瑕实施宽容截断与安全恢复，产生可读的 issues 告警信息。
2. **多维分隔符自动嗅探（Sniffing）**：
   - 纯函数 `sniffDelimiter` 采样前若干非空行，自动计算逗号（`,`）、制表符（`\t`）与分号（`;`）的列一致性权重；
   - TSV 制表符在整行一致时赋予更高置信度，天然对齐用户从 Excel / 飞书表格选中单元格直接 `Ctrl+C` 复制到剪贴板粘贴的 TSV 场景。
3. **中英文多场景表头智能推断与位置降级**：
   - 覆盖中英文常见字段变体：
     - `title`: `title`, `name`, `phrase`, `label`, `trigger`, `标题`, `名称`, `快捷语`, `话术名称`, `常用语`, `短语`, `问`, `问题`
     - `content`: `content`, `text`, `snippet`, `body`, `value`, `payload`, `replace`, `template`, `正文`, `内容`, `展开文本`, `模板`, `话术内容`, `快捷内容`, `答`, `回答`, `话术`
     - `category`: `category`, `group`, `folder`, `scene`, `分类`, `场景`, `分组`, `文件夹`, `目录`, `业务线`
     - `tags`: `tags`, `tag`, `keywords`, `keyword`, `标签`, `关键词`, `关键字`
     - `alias`: `alias`, `abbr`, `shortcut`, `key`, `别名`, `缩写`, `快捷键`, `触发词`, `简写`, `指令`, `按键`
     - `url`: `url`, `link`, `href`, `网址`, `链接`, `外链`
     - `type`: `type`, `itemtype`, `类型`, `条目类型`
   - 无表头位置智能降级：
     - 1 列：从正文自动提取首行前 40 字作为标题；
     - 2 列：第 0 列为标题，第 1 列为正文；
     - 3 列：第 0 列标题，第 1 列正文，第 2 列分类；
     - 4 列：第 0 列标题，第 1 列正文，第 2 列分类，第 3 列标签；
     - 5 列及以上：追加别名列。
4. **属性净化、类型推断与确定性逻辑 ID**：
   - 标签经 `cleanTagList` 清洗中英文逗号、顿号、分号与空白分割，并自动剥离 `#标签#` 前后缀；
   - 通过 `inferTypeFromText` 自动识别 URL、代码块、富文本与普通文本；
   - 生成 64 位稳定 FNV-1a 哈希逻辑 ID（`xlc-t...`），确保同内容重复导入可无缝复用既有的冲突决策（skip / overwrite / rename）；
   - 融合 B-006 写前防御，若正文包含多行且非标准代码块，生成显式安全警示 issues，绝不隐式损坏思源原生 AST 块结构。
5. **UI 双重入口集成**：
   - 设置面板数据区 `settings.data.import` 文件选择器扩展支持 `.csv,text/csv,.tsv,text/tab-separated-values`；
   - 新增独立「从 CSV / 表格导入」（`settings.data.csvImport`）按钮，支持直接粘贴剪贴板表格文本，实时计算解析条数与分隔符/表头摘要，并一键接入标准导入策略对话框（`openImportPolicyDialog`）。

## 结果与证据

- 新增 `src/service/csv-tsv-import.ts` 与专项测试 `tests/r267-csv-tsv-import.test.cjs`（8 个专项测试用例全部通过）；
- 经故意破坏转义双引号解析逻辑进行严格负向验证，测试准确失败检出（`AssertionError: Expected values to be strictly deep-equal`），恢复源码后复验全绿；
- 全套静态异常门禁 `check:errors`、类型检查 `check`、单元测试 `568/568`、Chrome UI 冒烟测试、交互审计 `74/74`、构建打包、密钥扫描与包清单检查全数通过。
