// 渲染 harness 入口：把生产 CommonSearchDialog / 设置对话框 / 捕获表单暴露到 window，
// 由 render-production.cjs 在 Chromium 中以假数据驱动、截取真实生产 DOM+CSS 效果。
import {CommonSearchDialog} from "../../src/ui/dialog";
import {openImportPolicyDialog, openSettingsDialog, openSetupDialog, type SettingsUiContext} from "../../src/ui/settings-dialog";
import {CaptureDialog} from "../../src/ui/capture";
import type {SearchEntry} from "../../src/model/search";
import type {TransformKind} from "../../src/service/ai";

const ENTRIES: SearchEntry[] = [
    {id: "xlc-demo0000001", blockId: "20240101120000-aaaaaaa", libraryDocId: "20240101120001-hijklmn", itemType: "markdown", title: "项目延期道歉与补偿方案", alias: "延期道歉", tags: ["客户沟通", "模板"], category: "客服", summary: "尊敬的王总：关于本期交付延期……", createdAt: 1, updatedAt: Date.now() - 3 * 86_400_000, sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb", varCount: 2},
    {id: "xlc-demo0000002", blockId: "20240101120000-ccccccc", libraryDocId: "20240101120001-hijklmn", itemType: "text", title: "延期简短版（IM 用）", alias: "", tags: [], category: "", summary: "您好，本次迭代因联调超期，上线推迟 2 天……", createdAt: 1, updatedAt: Date.now() - 7 * 86_400_000},
    {id: "xlc-demo0000003", blockId: "20240101120000-ddddddd", libraryDocId: "20240101120001-hijklmn", itemType: "code", title: "SQL 分页模板", alias: "", tags: ["开发"], category: "开发", summary: "SELECT * FROM t LIMIT …", createdAt: 1, updatedAt: Date.now() - 7 * 86_400_000},
    {id: "xlc-demo0000004", blockId: "20240101120000-eeeeeee", libraryDocId: "20240101120001-hijklmn", itemType: "blockref", title: "产品需求模板（引用）", alias: "", tags: [], category: "", summary: "", createdAt: 1, updatedAt: Date.now() - 30 * 86_400_000, targetBlockId: "20240101120002-bbbbbbb" as unknown as string},
    {id: "xlc-demo0000005", blockId: "20240101120000-fffffff", libraryDocId: "20240101120001-hijklmn", itemType: "url", title: "SLA 赔付标准文档", alias: "", tags: [], category: "", summary: "https://wiki.example.com/sla", createdAt: 1, updatedAt: Date.now() - 1 * 86_400_000, url: "https://wiki.example.com/sla"},
];

const PREVIEWS: Record<string, string> = {
    "xlc-demo0000001": "尊敬的 {{xlc:ask:客户名称}}：\n\n关于本期「会员系统」交付延期，我们深表歉意。经复盘，主要原因为第三方支付联调超期。目前联调已完成 92%，预计推迟 2 个工作日上线。\n\n为弥补影响，我们提供以下补偿：\n1. 本期服务费减免 {{xlc:ask:补偿比例|5%,10%}}；\n2. 上线后 48 小时专属值守；\n3. 下期迭代优先排入贵方需求。\n\n再次感谢理解与支持，有任何问题随时联系我。{{xlc:cursor}}",
    "xlc-demo0000002": "您好，本次迭代因联调超期，上线推迟 2 天。给您带来不便深表歉意，有问题随时找我。",
    "xlc-demo0000003": "```sql\nSELECT * FROM articles\nWHERE status = 'published'\nORDER BY updated_at DESC\nLIMIT 20 OFFSET 40;\n```",
    "xlc-demo0000004": "（引用语法预览）((20240101120002-bbbbbbb '产品需求模板'))",
    "xlc-demo0000005": "https://wiki.example.com/sla",
};

const T = (key: string, ...args: string[]): string => {
    const map: Record<string, string> = {
        pluginName: "小驴常用（内测版）",
        searchPlaceholder: "搜索标题、别名、标签、分类和正文摘要", searchHint: "输入 ? 加描述，按含义搜索（需在本插件设置中启用 AI）",
        type: "类型", tags: "标签", tagsHint: "逗号分隔", title: "标题", alias: "别名", category: "分类", contentLabel: "内容（Markdown）", filterAll: "全部类型", filterAllType: "类型：全部", filterAllTags: "标签：全部", filterAllCategories: "分类：全部",
        "type.text": "纯文本", "type.markdown": "Markdown", "type.url": "网址", "type.code": "代码", "type.image": "图片", "type.asset": "附件", "type.blockref": "块引用", "type.structure": "块结构", filterFavorites: "只看收藏", filterRecent: "最近使用",
        empty: "没有找到匹配内容", usageHint: "↑ ↓ 选择 · Enter 插入 · Ctrl/⌘ + Enter 复制 · Alt + 1-9 快速插入 · Esc 关闭",
        usageHintMobile: "点按条目尝试插入；若宿主不支持会复制到剪贴板 · 长按查看操作",
        usageGuideBtn: "使用帮助", usageGuideTitle: "小驴常用怎么用",
        usageGuideIntro: "把常用内容保存在思源文档中，之后搜索、预览，再插入或复制。",
        usageGuideAdd: "新增：点「＋ 新建条目」，或从选区、当前块、剪贴板和右键菜单保存。",
        usageGuideSearch: "查找：搜索标题、别名、摘要、标签和分类；也可以用拼音、收藏、最近使用和常用排序。",
        usageGuideInsert: "使用：Enter 插入当前条目，Ctrl/⌘ + Enter 复制当前条目，Alt/⌥ + 1-9 插入对应条目；长按条目可打开更多操作。",
        usageGuideInsertMobile: "使用：点按条目尝试插入；若思源客户端不支持，会复制到剪贴板。移动端插入尚未在真实客户端验证；长按条目可打开更多操作。",
        emptyFiltered: "当前筛选下没有匹配条目", clearFilters: "清除筛选",
        usageGuideOrganize: "整理：给条目补上清楚的标题、标签和分类；设置 → 数据与模板可导入邮箱、地址和联系方式示例。",
        usageGuideVariables: "模板规则：{{xlc:ask:字段}} 会在插入前询问；{{xlc:date}}、{{xlc:clipboard}} 等占位符只在使用时展开，不会改写库中的原文。AI 默认关闭。",
        insert: "插入", copy: "复制", openSource: "打开来源", edit: "编辑", delete: "删除",
        insertRef: "插入引用", insertEmbed: "插入嵌入", insertCopy: "复制内容",
        sourceMissing: "来源失效", sourceGone: "原内容块已移动或删除。点击「打开来源」可重新指定位置。", previewUnavailable: "暂无预览", previewNoResult: "选择左侧条目后，这里会显示预览",
        aiFound: "AI 语义搜索", aiWorking: "AI 处理中…", aiOriginalPreserved: "原文未被修改",
        insertNoEditor: "当前没有活动编辑器，已复制到剪贴板，可手动粘贴", insertFailed: "插入失败", insertToDocFailed: "目标文档插入失败",
        kernelError: "思源接口调用失败：%s",
        "tf.polish": "润色", "tf.shorten": "缩短", "tf.formal": "正式化", "tf.translate-en": "译为英文", "tf.bulletize": "列表化",
        more: "返回动作",
        newItem: "新建条目", newItemAction: "＋ 新建条目", save: "保存", saving: "保存中…", cancel: "取消", confirm: "确定", invalidItem: "条目数据无效",
        aiTidy: "AI 整理", aiDraft: "AI 草稿", aiDraftDesc: "描述你想要的内容，AI 生成草稿", aiDraftNeedDescription: "请先描述想生成的内容", aiApplied: "已应用 AI 建议", aiTransform: "AI 变换",
        saved: "已保存：%s",
        dataTruth: "保存到思源文档；来源移动或删除时会提示", dataTruthHint: "内容以思源块保存在所选内容库文档，条目和来源仍可在思源中编辑。", adoptAll: "全部采纳", actionsNoun: "动作",
        semanticSuggestion: "没有找到匹配内容", aiSemanticHint: "输入 ? 加描述，例如「?给客户的道歉回复」。AI 依据标题、别名、标签、分类和摘要推荐条目，不读取完整正文。",
        varCountBadge: "%s 变量", paneVarsLabel: "插入时将询问 %s 个变量：", insertVariable: "插入变量：",
        varFormTitle: "填写变量", varFormSub: "本条目含 %s 个变量，填写后一次性插入；填写值仅用于本次，不回写库。", varFormHint: "Tab 下一项 · Enter 插入",
        groupFavorites: "收藏", groupAll: "全部", groupUncategorized: "无分类", insertSection: "变量与插入",
        promptVariablesToggle: "插入前询问变量", promptVariablesSub: "含 {{xlc:ask:…}} 的条目插入前弹出填充卡片",
        recordUsageToggle: "记录使用次数", recordUsageSub: "仅本地存储，可一键清除；用于「常用」排序。关闭后会保留已有统计。",
        usageStatsHint: "使用统计仅保存在本机", clearUsageBtn: "清空使用统计", clearUsageEmpty: "暂无使用统计", clearUsageConfirm: "清空全部使用计数？", clearUsageDone: "已清空使用统计",
        importPolicySkipDesc: "同名同源条目不动，仅新增缺失项", importPolicyOverwriteDesc: "以导入内容更新现有条目（原文块被改写）", importPolicyRenameDesc: "导入项加「导入」后缀，现有条目不受影响",
        recommended: "推荐", importReceiptHint: "导入完成将逐项回执：新增 / 跳过 / 覆盖 / 改名 / 失败",
        importPolicyTitle: "选择重复处理策略", importPolicySkip: "跳过重复（保留现有）", importPolicyOverwrite: "覆盖重复", importPolicyRename: "重名并存",
        importPreview: "文件包含 %s 个条目，%s 条格式无效将被跳过。选择重复处理策略：",
        itemCountBadge: "%s 条目", invalidSkipBadge: "%s 条格式无效将跳过",
        cursorHint: "光标落点",
        setupModeLabel: "库方式", setupStep1: "第 1 步 · 选择库方式", setupStep2: "第 2 步 · 确认落点",
        setupNext: "下一步：确认", setupBack: "上一步", setupFinish: "完成设置", setupLater: "稍后再说",
        setupConfirmHint: "创建动作有明确 confirm 提示 · 不动你已有的任何文档；之后可在 设置 → 当前内容库 更改。",
        setupSummaryDoc: "条目将以真实块保存于此文档", setupSummaryNotebook: "索引笔记本根目录下一级文档，并写入第一个文档", setupSummaryTree: "索引所选文档及最多 3 层子文档，新增条目写入所选根文档",
        create: "创建", retry: "重试",
        useCount: "%s 次", quickNew: "＋ 新建条目", quickInsertSelected: "插入选中",
        packBtn: "导出模板包", packExportTitle: "导出 · 模板包", packCategoryLabel: "分类", allCategories: "全部分类",
        packNameLabel: "包名称", packNameDefault: "小驴常用（内测版）模板包", packExportBtn: "导出 .md 包", packVarsBadge: "%s 条含变量",
        packContentsHint: "· 条目 Markdown + 元数据（标题/标签/分类）\n· 变量清单（{{xlc:ask:…}} 字段与选项）\n· 资源引用（assets 原样打包）",
        packTrustHint: "他人导入后即为真实思源块，可继续编辑与再分享——分享的是「活的块」，不是文本快照。",
        emptyFavorites: "还没有收藏的条目", emptyFavoritesSub: "点击条目右侧 ☆ 一键收藏，收藏会置顶显示", emptyRecent: "暂无最近使用的条目",
        "sort.manual": "默认排序（收藏优先）", "sort.recent": "最近使用在前", "sort.title": "按标题排序", "sort.frequent": "使用频次", sort: "排序",
        totalItems: "库内条目：%s 条", resultCount: "%s 条结果", aiResultCount: "AI 推荐：%s 条",
        "sortHint.manual": "收藏条目优先显示；其余条目按最近使用和更新时间排列", "sortHint.recent": "最近插入或复制过的条目排在前面", "sortHint.title": "浏览列表时按标题排序；搜索时仍按匹配程度排序", "sortHint.frequent": "使用次数较多的条目排在前面；次数相同则最近使用的优先",
        duplicateItem: "创建副本", insertToDoc: "插入到指定文档", insertToDocPick: "选择目标文档（输入关键词搜索）",
        duplicateTitle: "已存在同文条目", duplicateConfirm: "已存在「%s」，仍要保存吗？两条内容并存、互不影响。",
        insertTargetBanner: "插入到：%s",
        aiInsertTransformed: "插入变换结果", aiCopyTransformed: "复制变换结果", aiInsertOriginal: "插入原文", saveTransformed: "存为新条目", deleteConfirm: "删除条目「%s」？",
        providerSection: "其他插件内容", providerInsert: "插入其他插件内容", providerCopy: "复制其他插件内容",
        providerExecutable: "可执行", providerPendingReload: "待重载",
        openSettings: "设置 / 更改内容库", openSettingsChangeLib: "更改内容库",
        aiSection: "AI 助手", aiEnabled: "启用 AI 助手", aiShareContent: "允许 AI 读取条目完整正文",
        aiEnabledSub: "使用思源 设置→人工智能 的模型，插件不保存密钥", aiShareContentSub: "整理/变换/草稿需要；关闭时仅元数据",
        searchSection: "搜索", pinyinToggle: "拼音搜索", placeholdersToggle: "动态占位符", placeholdersHint: "支持 {{xlc:date}} 等",
        pinyinToggleSub: "全拼/首字母本地匹配", placeholdersToggleSub: "插入时替换 {{xlc:date}} 等为当前日期时间",
        aiSuggestion: "AI 建议", clearSearch: "清空搜索", shortcutLabel: "操作提示", newItemActionWithQuery: "＋ 新建「%s」", newItemWithTitle: "将「%s」预填为标题并新建条目", emptyQueryHint: "新建时会把当前搜索词填入标题，你可以继续修改。", semanticEmptyHint: "AI 搜索没有找到相关条目。可调整描述，或新建条目后自行填写标题和内容。",
        customTransformSection: "自定义变换", customTransformAdd: "＋ 添加自定义变换", customTransformName: "名称",
        customTransformPrompt: "变换指令，如：改写为客服话术：", customTransformEmpty: "暂无自定义变换",
        customTransformCap: "最多 10 个自定义变换", customTransformNewName: "我的变换",
        customTransformHint: "与内置变换并列出现在条目动作菜单 ✦ 区；读取正文遵循「允许 AI 读取完整正文」开关",
        quickCapture: "快速捕获剪贴板为条目", quickCaptureDuplicate: "已存在同文条目「%s」，未重复保存",
        promptPackBtn: "导入内置分类模板", promptPackHint: "内置模板会以分类属性保存在当前库文档中",
        dataSection: "数据与模板（导出 / 导入）", librarySection: "当前内容库", libraryNone: "未配置",
        reindexBtn: "重建索引", clearRecents: "清空最近使用", clearRecentsEmpty: "暂无最近使用", clearRecentsConfirm: "清空最近使用记录？",
        exportBtn: "导出全部条目 (JSON)", importBtn: "导入 JSON", exportMdBtn: "导出 Markdown 包（含资源）",
        tagAuditBtn: "AI 标签体检",
        setupTitle: "选择常用内容库", setupHint: "条目保存为思源文档，可继续编辑。创建新文档前会明确确认。", setupUsageGuide: "开始使用：从面板新建，或从剪贴板捕获；搜索后选择条目，再用操作区插入或复制。模板变量 {{xlc:ask:字段}} 会在使用前询问。", setupRecommendation: "推荐新建一个专用库文档；它会放入你选择的已有笔记本（不会新建笔记本）。分类会保存在每条内容上，模板由你确认后导入到该文档。", setupQuickStartTitle: "配置完成后这样开始", setupQuickStart1Title: "先放一条内容", setupQuickStart1Desc: "在面板点「新建条目」，或从选区、剪贴板和右键菜单保存。", setupQuickStart2Title: "再找到它", setupQuickStart2Desc: "输入标题、标签或分类搜索；点选条目即可查看预览。", setupQuickStart3Title: "最后使用", setupQuickStart3Desc: "按 Enter 插入，或复制后粘贴；设置中的模板可在使用时填写变量。", setupCreateNewDoc: "新建专用库文档（推荐）", setupPickDoc: "选择现有文档", setupNotebook: "按笔记本", setupCreateNotebook: "选择已有笔记本（不会新建笔记本）",
        setupChooseNotebook: "请选择笔记本", setupNotebookLoading: "正在读取可用笔记本…", setupNotebookReady: "可用笔记本已加载", setupNotebookNeedsDocsCheck: "选择笔记本后，下一步会检查根目录文档", setupNotebookDocsReady: "根目录文档已检查，可以继续设置内容库", setupNotebookEmpty: "没有可用笔记本。请先在思源新建笔记本，或切换为选择现有文档。", setupNotebookLoadFailed: "笔记本读取失败", setupNotebookNotReady: "笔记本尚未加载完成", setupNotebookNoDocs: "该笔记本根目录没有文档", setupNotebookDocsChecking: "正在检查笔记本根目录文档…", setupNotebookDocsCheckFailed: "检查笔记本根目录失败，可重试",
        setupNewDoc: "创建新库文档", setupNewDocName: "常用内容库", docPicker: "选择库文档", docPickerEmpty: "没有匹配的文档",
        captureHint: "条目将保存为真实思源块 · 变量在插入时询问", captureHintLib: "库：%s", docCount: "%s 个文档",
        emptyLibrary: "还没有常用内容", emptyLibrarySub: "先新建一条，或从选区、剪贴板和右键菜单保存；内容会保存在当前内容库",
        updatedAtLabel: "更新于 %s",
        // R138 键集（缺失时 T 回落键名，截图/断言会看到裸键）
        keyboardHelp: "键盘快捷操作", kbdNav: "切换选中条目", kbdEnter: "插入选中条目", kbdCopy: "复制选中条目", kbdAltDirect: "%s + 1-9 快速插入", kbdEsc: "关闭", kbdQuickInsert: "快速插入对应条目", kbdClose: "关闭面板", loading: "加载中…",
        truncatedHint: "条目超出索引上限，已截断显示；数据仍安全在库中", copyFailed: "复制失败：无法写入剪贴板",
        libModeNotebook: "笔记本 × %s", libModeDoc: "文档库 · %s 个文档", libModeTree: "文档树 · %s 个根文档", setupPickDocTree: "选择现有文档（含子文档）",
        ctDeleteConfirm: "删除自定义变换「%s」？该操作不可恢复。", ctDeleted: "已删除自定义变换「%s」",
        importReasonPackEmpty: "内置包为空", importReasonTooLarge: "文件超出大小上限", importReasonNoMeta: "Markdown 包缺少条目元数据",
        importReasonUnknown: "未知原因", importRunFailed: "导入失败：%s（写入可能已部分完成）", exportEmpty: "当前筛选下没有可导出的条目",
        resourceFallback: "资源", captureBlockFailed: "读取当前块内容失败，请重试", captureDocFailed: "读取文档内容失败，请重试",
        aiDraftOverwrite: "内容框已有内容，用 AI 草稿覆盖吗？", aiParseFailed: "AI 返回内容无法解析，请重试", aiContentTooLong: "内容超过 %s 字，请缩短后重试",
    };
    let text = map[key] ?? key;
    for (const arg of args) text = text.replace("%s", arg);
    return text;
};

function makeDeps(overrides: {aiEnabled?: boolean; missing?: boolean; mobile?: boolean; empty?: boolean; filters?: {type: string; tag: string; category: string}; newItemAction?: string} = {}) {
    const aiOn = overrides.aiEnabled ?? true;
    let activeFilters = {...(overrides.filters ?? {type: "", tag: "", category: ""})};
    return {
        t: (key: string, ...args: string[]) => key === "newItemAction" && overrides.newItemAction
            ? overrides.newItemAction
            : T(key, ...args),
        search: async (query: string | {text?: string; itemType?: string; tag?: string; category?: string}) => {
            // 查询计数（R118 筛选回填竞态探测用）
            const w = window as unknown as {__xlcSearchCalls?: number};
            w.__xlcSearchCalls = (w.__xlcSearchCalls ?? 0) + 1;
            if (overrides.empty) return {entries: [], truncated: false, total: 0};
            // R137 交互审计：本地结果按查询词过滤（与真实 service 语义一致；? 前缀走 AI 语义找，全量返回）。
            // 真实契约：deps.search 收 {text,itemType,tag,…} 查询对象（dialog.ts refresh）。
            const text = typeof query === "string" ? query : query?.text ?? "";
            const q = text.trim();
            let entries = !q || q.startsWith("?")
                ? ENTRIES
                : ENTRIES.filter((e) => {
                    const hay = [e.title, e.alias, e.summary, e.category, ...(e.tags ?? [])].join(" ").toLowerCase();
                    return hay.includes(q.toLowerCase());
                });
            if (typeof query !== "string") {
                if (query.itemType) entries = entries.filter((entry) => entry.itemType === query.itemType);
                if (query.tag) entries = entries.filter((entry) => entry.tags?.includes(query.tag ?? ""));
                if (query.category) entries = entries.filter((entry) => entry.category === query.category);
            }
            return {entries, truncated: false, total: 128};
        },
        getTags: async () => ["客户沟通", "模板", "开发"],
        getCategories: async () => ["客服", "开发"],
        preview: async (itemId: string) => PREVIEWS[itemId] ?? "",
        runAction: async (itemId: string, mode: string) => {
            const w = window as unknown as {__xlcActions?: Array<{id: string; mode: string}>};
            (w.__xlcActions ??= []).push({id: itemId, mode});
            return {ok: true, message: "inserted"};
        },
        runActionWithFills: async (_itemId: string, _mode: string, fills?: Record<string, string>) => {
            (window as unknown as {__xlcLastFills?: Record<string, string>}).__xlcLastFills = fills;
            return {ok: true, message: "inserted"};
        },
        openSource: async () => ({ok: true, message: "opened"}),
        editItem: async () => {},
        deleteItem: async () => {},
        toggleFavorite: () => true,
        isFavorite: (id: string) => id === "xlc-demo0000001",
        insertRaw: async () => true,
        copyText: async (text: string) => {
            (window as unknown as {__xlcCopied?: string}).__xlcCopied = text;
            return true;
        },
        getSort: (): "manual" | "recent" | "frequent" | "title" => "manual",
        setSort: () => {},
        searchDocs: async (k: string) => k ? [{id: "20240101120001-hijklmn", hPath: "/常用内容库", name: "常用内容库"}] : [],
        insertToDoc: async () => true,
        duplicateItem: async () => {},
        saveTransformed: async () => {},
        getFilters: () => ({...activeFilters}),
        getLibraryName: async () => "/常用内容库",
        setFilters: (filters: {type: string; tag: string; category: string}) => {
            activeFilters = {...filters};
            const w = window as unknown as {__xlcSetFilters?: Array<{type: string; tag: string; category: string}>};
            (w.__xlcSetFilters ??= []).push({...filters});
        },
        getLastQuery: () => "",
        setLastQuery: () => {},
        insertTarget: null,
        openSetup: () => {},
        promptVariables: () => true,
        getUsage: () => ({
            "xlc-demo0000001": {count: 32, lastAt: 400},
            "xlc-demo0000002": {count: 18, lastAt: 300},
            "xlc-demo0000003": {count: 11, lastAt: 200},
            "xlc-demo0000005": {count: 4, lastAt: 100},
        }),
        newItem: (titleCandidate?: string) => {
            document.body.dataset.xlcNewItemTitle = titleCandidate ?? "";
        },
        providerSearch: async (query: string) => query.includes("工作台") ? [
            {virtualId: "pv:xiaolv-speed-switch:1", providerId: "xiaolv-speed-switch", providerName: "小驴雷切", title: "当前工作台", payload: "快速回到工作台布局（提供方演示数据）"},
            {virtualId: "pv:xiaolv-checkin:1", providerId: "xiaolv-checkin", providerName: "小驴打卡", title: "今日打卡状态", payload: "已完成 3/4 项习惯打卡（提供方演示数据）"},
        ] : [],
        insertProviderPayload: async () => true,
        copyProviderPayload: async () => true,
        aiSemantic: async (desc: string) => ({ok: true as const, entries: desc === "空结果" ? [] : ENTRIES.slice(0, 3)}),
        aiTransform: async (_itemId: string, kind: TransformKind) => ({
            ok: true as const,
            text: kind === "translate-en"
                ? "Dear Mr. Wang:\n\nWe sincerely apologize for the delay of the \"Membership System\" delivery. Root cause: third-party payment integration overrun. Integration is 92% complete; launch postponed by 2 business days.\n\nCompensation: 5% fee reduction; 48h dedicated support after launch; priority scheduling next iteration."
                : "尊敬的王总：\n\n本期「会员系统」因第三方支付联调超期而延期，我们深表歉意。联调已完成 92%，预计推迟 2 个工作日上线。\n\n补偿方案：本期服务费减免 5%；上线后 48 小时专属值守；下期需求优先排期。",
        }),
        listCustomTransforms: () => [{id: "xltf-demo00001", name: "客服话术"}],
        aiTransformCustom: async () => ({ok: true as const, text: "客服话术结果示例"}),
        aiEnabled: () => aiOn,
        isSourceMissing: (entry: SearchEntry) => overrides.missing === true && entry.id === "xlc-demo0000001",
        close: () => {},
        isMobile: () => overrides.mobile === true,
    };
}

(window as unknown as {XlcHarness: unknown}).XlcHarness = {
    openDialog(overrides?: {aiEnabled?: boolean; missing?: boolean; scope?: "all" | "favorites"; query?: string; mobile?: boolean; empty?: boolean; insertTarget?: {docId: string; hPath: string}; filters?: {type: string; tag: string; category: string}; newItemAction?: string}): CommonSearchDialog {
        const dialog = new CommonSearchDialog(makeDeps(overrides));
        if (overrides?.insertTarget) dialog.insertTarget = overrides.insertTarget;
        dialog.open();
        // 预填搜索与选中态，让截图呈现工作状态
        const input = document.querySelector<HTMLInputElement>(".xlc-search-input");
        if (input) {
            input.value = overrides?.query ?? "?给客户延期上线的道歉回复";
            input.dispatchEvent(new Event("input"));
        }
        return dialog;
    },
        openSettings(mode: "doc" | "tree" | "notebook" = "doc"): void {
            const ctx: SettingsUiContext = {
            t: T,
            state: {
                schemaVersion: 2,
                favorites: [], recents: [], usage: {}, sort: "manual",
                uiPrefs: {lastTypeFilter: "", lastTagFilter: "", lastCategoryFilter: ""},
                providers: [{pluginId: "xiaolv-checkin", displayName: "小驴打卡", protocolVersion: 1, registeredAt: 1}],
                ai: {enabled: true, shareContent: true, customTransforms: [{id: "xltf-demo00001", name: "客服话术", prompt: "改写为客服话术："}]},
                search: {pinyin: true, placeholders: true},
                insert: {promptVariables: true, recordUsage: true},
            },
            getConfig: () => ({configVersion: 1, mode, notebookIds: mode === "notebook" ? ["20240101"] : [], containerDocIds: mode === "notebook" ? [] : ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1}),
            library: {
                listNotebooks: async () => ({ok: true, data: [{id: "20240101", name: "笔记"}]}),
                listNotebookDocs: async () => ({ok: true, data: [{id: "20240101120001-hijklmn", name: "常用内容库"}]}),
                createLibraryDoc: async () => ({ok: true, data: {docId: "20240101120001-hijklmn"}}),
                searchDocs: async (k: string) => k
                    ? ({ok: true, data: [{id: "20240101120001-hijklmn", hPath: "/常用内容库", box: "nb", name: "常用内容库"}]})
                    : ({ok: true, data: []}),
                getDocPath: async () => "/常用内容库",
                reindex: async () => ({entries: [], items: new Map(), truncated: false, docsScanned: 1, errors: [], builtAt: 1}),
                ensureIndex: async () => ({
                    entries: ENTRIES.map((e) => ({...e})) as never[],
                    items: new Map(ENTRIES.map((e) => [e.id, e])) as never,
                    truncated: false, docsScanned: 1, errors: [], builtAt: 1,
                }),
                getItemKramdown: async (item: {id: string}) => {
                    // 内核调用计数（性能门禁：模板包对话框零预取）
                    (window as unknown as {__xlcKdCalls?: number}).__xlcKdCalls = ((window as unknown as {__xlcKdCalls?: number}).__xlcKdCalls ?? 0) + 1;
                    return {ok: true, data: PREVIEWS[item.id] ?? "内容示例 {{xlc:ask:示例字段}}"};
                },
            },
            ai: {updateSettings: () => {}, getSettings: () => ({enabled: true, shareContent: true})},
            registry: {
                list: () => [{record: {pluginId: "xiaolv-checkin", displayName: "小驴打卡", protocolVersion: 1, registeredAt: 1}}],
                listExecutable: () => [],
            },
            notify: () => {},
            applyConfig: () => {},
            persistSoon: () => {},
            exportBundle: async () => "{}",
            importBundleText: async () => ({total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: []}),
            importMarkdownItems: async () => ({total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: []}),
            fetchAssetBytes: async () => null,
            aiErrorText: (err) => String(err),
            applyPinyinAdapter: () => {},
        } as unknown as SettingsUiContext;
        openSettingsDialog(ctx);
    },
    openSetup(options?: {emptyNotebook?: boolean; notebookLoadError?: boolean; notebookDocsCheckError?: boolean; notebookDocsDelayMs?: number; docSearchErrorOnce?: boolean; docSearchDelayMs?: number; existingMode?: "doc" | "tree" | "notebook"}): void {
        let notebookRequests = 0;
        let notebookDocRequests = 0;
        let docSearchRequests = 0;
        const ctx: SettingsUiContext = {
            t: T,
            state: {
                schemaVersion: 2,
                favorites: [], recents: [], usage: {}, sort: "manual",
                uiPrefs: {lastTypeFilter: "", lastTagFilter: "", lastCategoryFilter: ""},
                providers: [], ai: {enabled: false, shareContent: false}, search: {pinyin: true, placeholders: true},
                insert: {promptVariables: true, recordUsage: true},
            },
            getConfig: () => options?.existingMode === "notebook"
                ? ({configVersion: 1, mode: "notebook", notebookIds: ["20240101"], containerDocIds: [], createdDocIds: [], configuredAt: 1})
                : options?.existingMode
                    ? ({configVersion: 1, mode: options.existingMode, notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1})
                    : null,
            library: {
                listNotebooks: async () => {
                    notebookRequests++;
                    return options?.notebookLoadError && notebookRequests === 1
                        ? ({ok: false, reason: "kernel-error", message: "offline"} as const)
                        : ({ok: true, data: [{id: "20240101", name: "笔记"}]} as const);
                },
                listNotebookDocs: async () => {
                    notebookDocRequests++;
                    if (options?.notebookDocsDelayMs) await new Promise((resolve) => setTimeout(resolve, options.notebookDocsDelayMs));
                    if (options?.notebookDocsCheckError && notebookDocRequests === 1) return {ok: false, reason: "kernel-error", message: "offline"} as const;
                    return {ok: true, data: options?.emptyNotebook ? [] : [{id: "20240101120001-hijklmn", name: "常用内容库"}]} as const;
                },
                createLibraryDoc: async () => ({ok: true, data: {docId: "20240101120001-hijklmn"}}),
                searchDocs: async (k: string) => {
                    docSearchRequests++;
                    if (options?.docSearchDelayMs) await new Promise((resolve) => setTimeout(resolve, options.docSearchDelayMs));
                    if (options?.docSearchErrorOnce && docSearchRequests === 1) return {ok: false, reason: "kernel-error", message: "offline"} as const;
                    return k
                        ? ({ok: true, data: [{id: "20240101120001-hijklmn", hPath: "/常用内容库", box: "nb", name: "常用内容库"}]} as const)
                        : ({ok: true, data: []} as const);
                },
                getDocPath: async () => "/常用内容库",
                reindex: async () => ({entries: [], items: new Map(), truncated: false, docsScanned: 0, errors: [], builtAt: 1}),
            },
            ai: {updateSettings: () => {}, getSettings: () => ({enabled: false, shareContent: false})},
            registry: {list: () => [], listExecutable: () => []},
            notify: (_kind, message) => { document.body.dataset.xlcSetupNotice = message; },
            applyConfig: (config) => { document.body.dataset.xlcSetupConfig = JSON.stringify(config); },
            persistSoon: () => {},
            exportBundle: async () => "{}",
            importBundleText: async () => ({total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: []}),
            importMarkdownItems: async () => ({total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: []}),
            fetchAssetBytes: async () => null,
            aiErrorText: (err) => String(err),
            applyPinyinAdapter: () => {},
        } as unknown as SettingsUiContext;
        openSetupDialog(ctx);
    },
    openCapture(aiOn = true, aiDelayMs = 0): void {
        const capture = new CaptureDialog({
            t: T,
            getSelectionText: () => ({text: "", blockId: null}),
            currentDocId: () => "20240101120001-hijklmn",
            readClipboardText: async () => "",
            createItem: async (input) => ({ok: true, message: input.title ?? "item", itemId: "xlc-new000000001"}),
            notify: () => {},
            getBlockKramdown: async () => "块内容",
            exportDocContent: async () => ({hPath: "/常用内容库", content: "# 内容"}),
            aiEnabled: () => aiOn,
            aiTidy: async (content: string) => {
                if (aiDelayMs) await new Promise((resolve) => setTimeout(resolve, aiDelayMs));
                return {ok: true as const, title: "AI 建议 " + content.slice(0, 6), tags: ["AI"]};
            },
            aiDraft: async (desc: string) => {
                if (aiDelayMs) await new Promise((resolve) => setTimeout(resolve, aiDelayMs));
                return {ok: true as const, text: "草稿（" + desc + "）"};
            },
            findDuplicate: async () => null,
            getLibraryName: async () => "/常用内容库",
        });
        capture.newManual();
    },
    openImport(): void {
        // 导入策略卡（原型屏 8）：18 条目 / 3 条无效 / 策略三选
        const ctx = {
            t: T,
            notify: () => {},
            importBundleText: async () => ({total: 18, created: 12, skipped: 4, overwritten: 1, renamed: 1, failed: 0, lines: []}),
            importMarkdownItems: async () => ({total: 18, created: 12, skipped: 4, overwritten: 1, renamed: 1, failed: 0, lines: []}),
        } as unknown as SettingsUiContext;
        const parsed = {items: Array.from({length: 18}, (_, i) => ({id: `xlc-demo${i}`, title: `条目 ${i + 1}`}))};
        const issues = [{line: 3, reason: "bad shape"}, {line: 7, reason: "bad shape"}, {line: 11, reason: "bad shape"}];
        openImportPolicyDialog(ctx, parsed, issues, {kind: "json", text: "{}"});
    },
};
