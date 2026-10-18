// 渲染 harness 入口：把生产 CommonSearchDialog / 设置对话框 / 捕获表单暴露到 window，
// 由 render-production.cjs 在 Chromium 中以假数据驱动、截取真实生产 DOM+CSS 效果。
import {CommonSearchDialog} from "../../src/ui/dialog";
import {openImportPolicyDialog, openSettingsDialog, openSetupDialog, type SettingsUiContext} from "../../src/ui/settings-dialog";
import {CaptureDialog} from "../../src/ui/capture";
import {openDiscoveryDialog} from "../../src/ui/discovery-dialog";
import type {DiscoveryDialogController} from "../../src/ui/discovery-dialog";
import type {SearchEntry} from "../../src/model/search";
import type {CommonItem} from "../../src/model/item";
import {ActionExecutor} from "../../src/service/commands";
import {LibraryService} from "../../src/service/library";
import type {TransformKind} from "../../src/service/ai";
import type {SavedDiscoveryView} from "../../src/model/storage";
import zhI18n from "../../src/i18n/zh-CN.json";

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

// 虚拟列表回归夹具：保持真实 SearchEntry 形状，只把数量扩到窗口化阈值以上。
const LARGE_ENTRIES: SearchEntry[] = Array.from({length: 100}, (_, index) => {
    const base = ENTRIES[index % ENTRIES.length];
    return {
        ...base,
        id: `xlc-window-${String(index + 1).padStart(3, "0")}`,
        blockId: `2024010113${String(index).padStart(4, "0")}-window`,
        title: `窗口测试条目 ${String(index + 1).padStart(3, "0")}`,
        alias: "",
        category: "",
        summary: `用于虚拟列表键盘回归的第 ${index + 1} 条结果`,
        sourceBlockId: `2024010114${String(index).padStart(4, "0")}-window`,
        varCount: 0,
    };
});

let discoveryController: DiscoveryDialogController | null = null;
const captureCreatedItems: unknown[] = [];
const captureAiTidyCalls: string[] = [];
const captureAiDraftCalls: string[] = [];
let deferredTidyResponse: ((value: {ok: true; title: string; alias: string; tags: string[]; category: string}) => void) | null = null;
let lastSearchDialog: CommonSearchDialog | null = null;
let savedDiscoveryViews: SavedDiscoveryView[] = [];

const T = (key: string, ...args: string[]): string => {
    const map: Record<string, string> = {
        pluginName: "小驴常用（内测版）",
        setupCreateIndependentNotebook: "新建独立笔记本与库文档", setupIndependentNotebookName: "新笔记本名称", setupIndependentNotebookNamePlaceholder: "例如：工作常用语", setupIndependentNotebookHint: "会先新建一个笔记本，再在其中创建库文档；两步都成功后才保存配置。", setupIndependentConfirmCreate: "将新建笔记本「%s」和库文档「%s」，确定吗？", setupIndependentCreateFailed: "创建独立笔记本失败：%s",
        settingsIntro: "管理内容库、复用偏好和数据。库内内容会保留在思源文档中，并可继续编辑。",
        captureIntro: "先放入想要复用的内容，再补充标题和分类，之后可以更快找到它。",
        discoveryTitle: "从当前文档发现", discoveryTitleNotebook: "从当前笔记本发现", discoveryTitleGeneral: "发现已有内容", discoveryTitleTree: "从此文档发现常用语",
        discoveryScope: "扫描范围", discoveryScopeDocument: "当前文档", discoveryScopeNotebook: "当前笔记本",
        discoveryScopeTree: "指定文档树", discoveryScopeSelectedNotebook: "指定笔记本", discoveryScopeAllNotebooks: "全部笔记本（高级）",
        discoveryScopeTreeHint: "扫描所选根文档及其下级文档顶层块；确认后加入常用库；源文档不变，加入方式见下方。",
        discoveryScopeSelectedNotebookHint: "扫描所选笔记本的文档顶层块；确认后加入常用库；源文档不变，加入方式见下方。",
        discoverySelectTree: "输入关键词查找文档树根文档", discoverySelectNotebook: "选择要扫描的笔记本", discoverySearch: "搜索",
        discoveryFromTreeMenu: "从此文档发现常用语", discoverySelectTreeRoot: "请选择文档树根文档", discoverySearchingDocs: "正在搜索文档…",
        discoveryNoDocsFound: "没有找到匹配的文档", discoveryNoNotebooks: "当前没有可扫描的笔记本",
        discoveryNotebookLoading: "正在读取笔记本列表…", discoveryRetryNotebooks: "重试加载笔记本",
        discoveryAllWarning: "上限：%s 个笔记本、%s 篇文档、%s 层目录、%s 个块、%s 个候选、单块 %s 字符、候选文本累计 %s 字符、%s 秒。文档和块按顺序读取；路径查询与重复核验最多 4 路并发。只读扫描，不会自动收录。",
        discoveryConfirmAll: "我确认开始扫描所有可搜索笔记本", discoveryTargetRequired: "请先选择或确认扫描目标",
        discoverySearchFailed: "文档搜索失败：%s", discoveryNotebookLoadFailed: "笔记本列表加载失败：%s",
        discoveryErrors: "扫描或内容库重复核验失败 %s 处，已保留其他结果", discoverySkippedLong: "跳过超长块 %s 个",
        discoveryLimitScope: "范围/深度上限", discoveryLimitNotebooks: "笔记本数上限", discoveryLimitDocuments: "文档数上限",
        discoveryLimitBlocks: "块数上限", discoveryLimitCandidates: "候选数上限", discoveryLimitCharacters: "文本字符上限", discoveryLimitTime: "扫描时间上限",
        discoveryResultsPage: "第 %s / %s 页", discoveryPreviousPage: "上一页", discoveryNextPage: "下一页",
        discoveryRescanKeepsUndo: "请先撤销或关闭本批次，再重新扫描。", discoveryCloseKeepsUndo: "关闭会丢失撤销入口；仍要关闭吗？",
        discoveryScopeHintDocument: "只读取当前文档的顶层块；收录前可预览，原文不会被修改。",
        discoveryScopeHintNotebook: "扫描当前文档所属笔记本的文档顶层块；候选显示各自来源，收录只复制到专用库。",
        discoveryNotebookUnavailable: "当前版本暂不支持笔记本范围发现",
        discoveryScanningDocument: "正在扫描当前文档…", discoveryScanningNotebook: "正在扫描当前笔记本…",
        discoveryScanningTree: "正在扫描所选文档树…", discoveryScanningSelectedNotebook: "正在扫描所选笔记本…",
        discoveryScanningAllNotebooks: "正在扫描全部笔记本…",
        discoveryCancelPending: "已请求停止；当前已发出的内核请求结束后不再启动后续请求，并保留已完成部分供你选择收录。",
        discoveryStopping: "正在等待已发出的内核请求结束…", discoveryStopped: "已停止扫描，保留 %s 条候选；没有自动收录，待确认重复状态的候选会在收录前复查。",
        discoveryStoppedNoResults: "已停止。专用库边界尚未核实，因此没有继续扫描或保留候选；可以重新开始。",
        discoveryNotebookProgress: "扫描文档 %s / %s，已读取 %s 个块…",
        discoveryNotebookEnumerating: "正在查找文档，已发现 %s 个…",
        discoveryUndoBatch: "撤销本批新增", discoveryUndoing: "正在安全检查并撤销…",
        discoveryUndoReceiptTitle: "撤销回执", discoveryUndoDone: "已撤销新增 %s 条；已跳过 %s 条，失败 %s 条。重新扫描可刷新候选状态。",
        discoveryUndoAlreadyDone: "这批新增已撤销。重新扫描可刷新候选状态。",
        discoveryUndoSkipNotFound: "条目已删除", discoveryUndoSkipIdentityChanged: "条目身份或内容库范围已变化",
        discoveryUndoSkipEdited: "条目已被编辑", discoveryUndoSkipLibraryUnverified: "内容库索引不完整，无法安全核对",
        discoveryUndoDeleteFailed: "删除失败：%s",
        discoveryScanned: "已扫描 %s 个块，发现 %s 个候选", discoveryScannedDocs: "扫描文档 %s 个", discoveryScannedNotebooks: "至少有一次目录读取成功的笔记本 %s 个", discoverySkipped: "跳过空块 %s 个",
        discoveryTruncated: "已达到扫描上限，结果可能不完整", discoveryCancelScan: "停止扫描", discoveryRetry: "重新扫描",
        discoveryFilter: "筛选", discoveryFilterAll: "全部状态", discoveryFilterCandidate: "待收录", discoveryFilterUnverified: "重复待确认",
        discoveryFilterSameContent: "内容相同", discoveryFilterAlready: "已在库中", discoveryFilterAdded: "已收录", discoveryTypeAll: "全部类型",
        discoverySearchPlaceholder: "筛选标题、摘要或来源", discoveryTagFilterPlaceholder: "按标签筛选", discoveryNoCandidates: "没有符合条件的候选", discoveryPreviewTitle: "候选预览",
        discoveryPreviewEmpty: "选择左侧候选后查看正文；收录前会再次校验来源。", discoveryPreviewLoading: "正在读取候选正文…",
        discoveryAdd: "加入常用库", discoveryAddSelected: "加入选中项", discoverySyncView: "同步到常用库", discoveryAddMode: "加入方式",
        discoveryAddModeReference: "建立引用入口（源块不动）", discoveryAddModeCopy: "复制到常用库（独立副本）",
        discoveryAddModeHint: "引用入口只保存来源块 ID 和元数据，调用时读取源块最新正文。", discoveryDefaultCategory: "默认分类",
        discoveryTagFacets: "候选标签", discoveryTagFacetApply: "按标签「%s」筛选，共 %s 条",
        discoverySaveView: "保存视图", discoverySaveViewPrompt: "为当前标签视图命名：",
        discoverySaveViewInvalid: "视图名称或扫描目标无效，未保存。", discoverySaveViewDone: "已保存视图「%s」",
        savedViewsSection: "常用视图", savedViewsEmpty: "还没有保存的视图。可在发现面板输入标签后保存。",
        savedViewsOpen: "打开", savedViewsDelete: "删除", savedViewsDeleteConfirm: "删除视图「%s」？只会删除快捷配置，不会删除源块或已有引用。",
        discoveryUnsortedCategory: "待整理",
        discoveryDefaultCategoryHint: "新收录项默认使用此分类；预览中可单独修改当前条目。",
        discoveryCandidateCategory: "本条分类", discoveryUseDefaultCategory: "恢复默认",
        discoveryForceSameContent: "允许收录内容相同的候选",
        discoverySelected: "已选 %s 项", discoveryClose: "关闭", discoveryReceiptTitle: "收录回执",
        discoveryClosePendingWrites: "有收录正在写入内容库。请等待收录回执，必要时先撤销本批新增，再关闭此窗口。",
        discoveryReceiptAdded: "已复制到常用库：%s；原笔记未修改，之后不会自动同步。", discoveryReceiptSameContent: "内容与「%s」相同，未自动收录；如仍要收录，请明确确认。",
        discoveryReceiptAlready: "已在常用库中：%s", discoveryReceiptFailed: "收录失败：%s", discoveryReceiptBatch: "批量收录完成：新增 %s，跳过 %s，失败 %s",
        discoverySessionExpired: "发现会话已失效，候选正文已释放，请重新扫描。", discoveryScanFailed: "扫描失败：%s", discoveryUnknown: "未知错误",
        discoveryStatusCandidate: "待收录", discoveryStatusAlready: "已在库中", discoveryStatusSameContent: "内容相同", discoveryStatusUnverified: "重复待确认", discoveryStatusAdded: "已收录",
        discoveryType: "类型", discoverySource: "来源", discoveryStats: "统计", discoveryNotConfigured: "尚未配置常用内容库，无法收录候选。",
        searchPlaceholder: "搜索标题、别名、标签、分类和正文摘要", searchHint: "输入 ? 加描述，按含义搜索（需在本插件设置中启用 AI）",
        kernelAuthRequired: "思源拒绝了当前请求，登录状态可能已失效。请重新登录后重试；当前搜索条件已保留。",
        kernelPermissionDenied: "当前操作无权访问所选内容。请检查权限后重试；当前搜索条件已保留。",
        kernelAuthStatus: "登录状态失效",
        kernelPermissionStatus: "访问权限不足",
        type: "类型", tags: "标签", tagsHint: "逗号分隔", title: "标题", alias: "别名", category: "分类", contentLabel: "内容（Markdown）", filterAll: "全部类型", filterAllType: "类型：全部", filterAllTags: "标签：全部", filterByThisTag: "点击按此标签筛选：%s", clearThisTagFilter: "点击取消标签筛选：%s", filterAllCategories: "分类：全部",
        "type.text": "纯文本", "type.markdown": "Markdown", "type.url": "网址", "type.code": "代码", "type.image": "图片", "type.asset": "附件", "type.blockref": "块引用", "type.structure": "块结构", filterFavorites: "只看收藏", filterRecent: "最近使用",
        empty: "没有找到匹配内容", usageHint: "↑ ↓ 选择 · Enter 插入 · Ctrl/⌘ + Enter 复制 · Alt + 1-9 快速插入 · Esc 关闭",
        ordinalShortcutHint: "Alt+%s 插入 · Alt+Shift+%s 复制",
        usageHintMobile: "点按选择条目，再点底部主按钮使用 · 长按查看操作",
        usageGuideBtn: "使用帮助", usageGuideTitle: "小驴常用怎么用",
        usageGuideIntro: "把常用内容保存在思源文档中，之后搜索、预览，再插入或复制。",
        usageGuideAdd: "新增：点「＋ 新建条目」，或从选区、当前块、剪贴板和右键菜单保存。",
        usageGuideSearch: "查找：搜索标题、别名、摘要、标签和分类；也可以用拼音、收藏、最近使用和常用排序。",
        usageGuideInsert: "使用：Enter 插入，Ctrl/⌘ + Enter 复制；Alt/⌥ + 1-9 直达插入，Alt/⌥ + Shift + 1-9 直达复制；Tab 可在搜索框与操作区流转；长按条目可打开更多操作。",
        usageGuideInsertMobile: "使用：点按只选择条目，再点底部主按钮使用；没有指定目标时复制到剪贴板。移动端直接插入尚未在真实客户端验证；长按条目可打开更多操作。",
        emptyFiltered: "当前筛选下没有匹配条目", clearFilters: "清除筛选",
        usageGuideOrganize: "整理：给条目补上清楚的标题、标签和分类；设置 → 数据与模板可导入开票、退换、邮箱、地址和联系方式等示例。",
        usageGuideVariables: "模板与注释规则：{{xlc:ask:字段}} 插入前询问，支持 {{xlc:ask:字段|选项A,选项B}} 下拉选择；{{xlc:date}}、{{xlc:clipboard}} 等占位符仅使用时展开；条目别名可作场景注释，正文内可用引用块「> 💡 提示：...」记录填写提醒。AI 默认关闭。",
        insert: "插入", copy: "复制", openSource: "打开来源", edit: "编辑", delete: "删除", favorite: "收藏", unfavorite: "取消收藏",
        insertRef: "插入引用", insertEmbed: "插入嵌入", insertCopy: "复制内容",
        sourceMissing: "来源失效", sourceGone: "原内容块已移动或删除。可编辑此条目并重新指定来源。", previewUnavailable: "暂无预览", previewNoResult: "选择左侧条目后，这里会显示预览",
        mediaContentHint: "图片和附件显示 Markdown 原文；复制得到链接文本。查看原文件请用「打开来源」。不支持复制图片位图或文件本体。",
        usageGuideMedia: "图片和附件：先将资源添加到思源，再从图片或附件的右键菜单保存。预览显示 Markdown 原文，复制得到链接文本；查看原文件请用「打开来源」。不支持复制图片位图或文件本体。",
        usageGuideMediaExamplesTitle: "真实资源示例（需先在思源添加）",
        usageGuideMediaImageExample: "图片 / 身份证照片：只用无敏感信息的示意图；保存后可预览 Markdown 链接、复制链接或打开来源，位图复制仍待 Android 验证。",
        usageGuideMediaAttachmentExample: "公司介绍 PPT、PDF、DOCX：先拖入思源生成附件；当前可保存、复制和打开资源链接，没有内置 Office 阅读器或跨应用文件发送。",
        usageGuideMediaResumeExample: "简历：正文适合保存为可编辑 Markdown，文件版需先添加真实 PDF/DOCX；完整多段正文暂受 B-006 限制，示例包不会安装假附件。",
        usageGuideMultiblock: zhI18n.usageGuideMultiblock,
        multiBlockPendingHint: zhI18n.multiBlockPendingHint,
        aiFound: "AI 语义搜索", aiWorking: "AI 处理中…", aiOriginalPreserved: "原文未被修改",
        aiTransport: "AI 调用失败，请检查模型配置或连接后重试。",
        insertNoEditor: "当前没有活动编辑器，已复制到剪贴板，可手动粘贴", insertFailed: "插入失败", insertToDocFailed: "目标文档插入失败",
        insertNoEditorBanner: "当前没有活动编辑器，主操作会复制到剪贴板",
        insertCurrentEditorBanner: "插入到打开弹窗时的光标位置",
        insertTargetUnavailableBanner: "原插入位置不可用，主操作会复制到剪贴板",
        insertTargetUnavailableCopied: "原插入位置已失效，内容已复制到剪贴板；请手动粘贴",
        insertMobileActionHint: "移动端直接插入尚未验证，当前操作会复制到剪贴板",
        kernelError: "思源接口调用失败：%s",
        "tf.polish": "润色", "tf.shorten": "缩短", "tf.formal": "正式化", "tf.translate-en": "译为英文", "tf.bulletize": "列表化",
        more: "返回动作",
        dropToAdd: "松开鼠标以添加常用条目",
        newItem: "新建条目", newItemAction: "＋ 新建条目", save: "保存", saving: "保存中…", cancel: "取消", confirm: "确定", invalidItem: "条目数据无效",
        captureContentRequired: "请填写要保存的内容。", captureUrlInvalid: "请输入有效的 http 或 https 链接。",
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
        resetItemUsage: "重置使用频次（当前 %s 次）", resetItemUsageDone: "已重置「%s」的使用频次",
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
        aiSuggestion: "AI 建议", clearSearch: "清空搜索", shortcutLabel: "操作提示", searchAllScopeAction: "在全部内容中搜索「%s」", newItemActionWithQuery: "＋ 新建「%s」", newItemWithTitle: "将「%s」预填为标题并新建条目", emptyQueryHint: "新建时会把当前搜索词填入标题，你可以继续修改。", semanticEmptyHint: "AI 搜索没有找到相关条目。可调整描述，或新建条目后自行填写标题和内容。",
        customTransformSection: "自定义变换", customTransformAdd: "＋ 添加自定义变换", customTransformName: "名称",
        customTransformPrompt: "变换指令，如：改写为客服话术：", customTransformEmpty: "暂无自定义变换",
        customTransformCap: "最多 10 个自定义变换", customTransformNewName: "我的变换",
        customTransformHint: "与内置变换并列出现在条目动作菜单 ✦ 区；读取正文遵循「允许 AI 读取完整正文」开关",
        quickCapture: "快速捕获剪贴板为条目", quickCaptureDuplicate: "已存在同文条目「%s」，未重复保存",
        promptPackBtn: "导入常用内容示例", promptPackHint: zhI18n.promptPackHint,
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
        keyboardHelp: "键盘快捷操作", kbdNav: "切换选中条目", kbdEnter: "插入选中条目", kbdCopy: "复制选中条目", kbdAltDirect: "%s + 1-9 快速插入", kbdEsc: "关闭", kbdQuickInsert: "快速插入对应条目", kbdQuickCopy: "快速复制对应条目", kbdTabActions: "切换到操作区", kbdFavorite: "收藏/取消收藏", kbdClose: "关闭面板", loading: "加载中…",
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

function makeDeps(overrides: {aiEnabled?: boolean; missing?: boolean; mobile?: boolean; empty?: boolean; largeResults?: boolean; filters?: {type: string; tag: string; category: string}; newItemAction?: string; activeEditor?: boolean; insertTargetAvailable?: boolean; actionDelayMs?: number; promptVariables?: boolean; realExecutor?: boolean; realClipboardAvailable?: boolean} = {}) {
    const aiOn = overrides.aiEnabled ?? true;
    let activeFilters = {...(overrides.filters ?? {type: "", tag: "", category: ""})};
    const favorites = new Set(["xlc-demo0000001"]);
    const recents = new Set(["xlc-demo0000001", "xlc-demo0000002"]);
    const realItem: CommonItem = {
        id: "xlc-demo0000001", blockId: "20240101120000-aaaaaaa", libraryDocId: "20240101120001-hijklmn",
        itemType: "markdown", title: "项目延期道歉与补偿方案", alias: "延期道歉", tags: ["客户沟通", "模板"], category: "客服",
        summary: "尊敬的王总：关于本期交付延期……", varCount: 0,
        source: {sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb", sourceType: "manual"},
        url: "", targetBlockId: "", createdAt: 1, updatedAt: 1, droppedFields: [],
    };
    let realExecutor: ActionExecutor | null = null;
    let realTarget: {editor: object; handle: object; docId: string} | null = null;
    if (overrides.realExecutor) {
        const library = new LibraryService({request: async (endpoint: string) => {
            if (endpoint === "getBlockKramdown") return {id: realItem.blockId, kramdown: "真实执行器正文"};
            if (endpoint === "checkBlocksExist") return {"20240101120001-hijklmn": true, "20240101120002-bbbbbbb": true};
            if (endpoint === "getBlockAttrs") return {};
            return null;
        }} as never);
        const patched = library as unknown as {
            ensureIndex: () => Promise<{entries: SearchEntry[]; items: Map<string, CommonItem>; truncated: boolean; docsScanned: number; errors: string[]; builtAt: number}>;
            getItemKramdown: (item: CommonItem) => Promise<{ok: true; data: string}>;
            checkSourceHealth: (item: CommonItem) => Promise<{ok: true; data: {blockMissing: boolean; docMissing: boolean; assetMissing: boolean}}>;
            expandSnippetRefs: (text: string) => Promise<string>;
        };
        patched.ensureIndex = async () => ({entries: [ENTRIES[0]], items: new Map([[realItem.id, realItem]]), truncated: false, docsScanned: 1, errors: [], builtAt: 1});
        patched.getItemKramdown = async () => ({ok: true, data: "真实执行器正文"});
        patched.checkSourceHealth = async () => ({ok: true, data: {blockMissing: false, docMissing: false, assetMissing: false}});
        patched.expandSnippetRefs = async (text) => text;
        realTarget = {editor: overrides.activeEditor === false ? null : {}, handle: {}, docId: realItem.source.sourceDocId};
        const host = {
            isMobile: () => false,
            hasActiveEditor: () => {
                document.body.dataset.xlcRealHasEditorCalls = String(Number(document.body.dataset.xlcRealHasEditorCalls ?? 0) + 1);
                return overrides.activeEditor !== false;
            },
            insertMarkdown: (text: string) => {
                document.body.dataset.xlcRealInsertCalls = String(Number(document.body.dataset.xlcRealInsertCalls ?? 0) + 1);
                document.body.dataset.xlcRealInsertedText = text;
                return true;
            },
            captureInsertTarget: () => realTarget,
            canInsertAtTarget: () => overrides.insertTargetAvailable !== false && overrides.activeEditor !== false,
            releaseInsertTarget: () => {},
            writeClipboard: async (text: string) => {
                document.body.dataset.xlcRealClipboardText = text;
                return overrides.realClipboardAvailable !== false;
            },
            openDoc: () => true, openAsset: () => true, openExternal: () => true,
            currentDocId: () => realItem.source.sourceDocId,
        };
        document.body.dataset.xlcRealHostHasEditor = String(overrides.activeEditor !== false);
        realExecutor = new ActionExecutor(library, host as never, () => {});
    }
    const runRealAction = async (_itemId: string, mode: string) => {
        const receipt = await realExecutor!.run(realItem, mode as never, {editorTarget: realTarget as never});
        document.body.dataset.xlcRealRequestedMode = mode;
        document.body.dataset.xlcRealReceipt = JSON.stringify({ok: receipt.ok, message: receipt.message, downgraded: receipt.downgraded});
        return {ok: receipt.ok, message: receipt.message};
    };
    return {
        t: (key: string, ...args: string[]) => key === "newItemAction" && overrides.newItemAction
            ? overrides.newItemAction
            : T(key, ...args),
        search: async (query: string | {text?: string; itemType?: string; tag?: string; category?: string; scope?: "all" | "favorites" | "recent"}) => {
            // 查询计数（R118 筛选回填竞态探测用）
            const w = window as unknown as {__xlcSearchCalls?: number};
            w.__xlcSearchCalls = (w.__xlcSearchCalls ?? 0) + 1;
            const q = typeof query === "string" ? {text: query} : query;
            const queries = (window as unknown as {__xlcQueries?: Array<{text?: string; itemType?: string; tag?: string; category?: string; scope?: string}>}).__xlcQueries ?? [];
            queries.push({...q});
            (window as unknown as {__xlcQueries?: typeof queries}).__xlcQueries = queries;
            if (overrides.empty) return {entries: [], truncated: false, total: 0};
            const sourceEntries = overrides.largeResults ? LARGE_ENTRIES : ENTRIES;
            // R137 交互审计：本地结果按查询词过滤（与真实 service 语义一致；? 前缀走 AI 语义找，全量返回）。
            // 真实契约：deps.search 收 {text,itemType,tag,…} 查询对象（dialog.ts refresh）。
            const text = typeof query === "string" ? query : query?.text ?? "";
            const searchText = text.trim();
            let entries = !searchText || searchText.startsWith("?")
                ? sourceEntries
                : sourceEntries.filter((e) => {
                    const hay = [e.title, e.alias, e.summary, e.category, ...(e.tags ?? [])].join(" ").toLowerCase();
                    return hay.includes(searchText.toLowerCase());
                });
            if (typeof query !== "string") {
                if (query.scope === "favorites") entries = entries.filter((entry) => favorites.has(entry.id));
                if (query.scope === "recent") entries = entries.filter((entry) => recents.has(entry.id));
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
            if (realExecutor) return runRealAction(itemId, mode);
            const w = window as unknown as {__xlcActions?: Array<{id: string; mode: string}>};
            const observedMode = overrides.mobile && !overrides.insertTarget ? "copy" : mode;
            (w.__xlcActions ??= []).push({id: itemId, mode: observedMode});
            if (overrides.actionDelayMs) await new Promise((resolve) => setTimeout(resolve, overrides.actionDelayMs));
            return {ok: true, message: "inserted"};
        },
        runActionWithFills: async (_itemId: string, _mode: string, fills?: Record<string, string>) => {
            (window as unknown as {__xlcLastFills?: Record<string, string>}).__xlcLastFills = fills;
            return {ok: true, message: "inserted"};
        },
        openSource: async (itemId: string) => {
            const w = window as unknown as {__xlcOpenedSources?: string[]};
            (w.__xlcOpenedSources ??= []).push(itemId);
            return {ok: true, message: "opened"};
        },
        editItem: async (itemId: string) => {
            const w = window as unknown as {__xlcEditedItems?: string[]};
            (w.__xlcEditedItems ??= []).push(itemId);
        },
        deleteItem: async (itemId: string) => {
            const w = window as unknown as {__xlcDeletedItems?: string[]};
            (w.__xlcDeletedItems ??= []).push(itemId);
        },
        toggleFavorite: (itemId: string) => {
            const w = window as unknown as {__xlcFavoriteToggles?: string[]};
            (w.__xlcFavoriteToggles ??= []).push(itemId);
            if (favorites.has(itemId)) favorites.delete(itemId);
            else favorites.add(itemId);
            return favorites.has(itemId);
        },
        isFavorite: (id: string) => favorites.has(id),
        insertRaw: async () => true,
        copyText: async (text: string) => {
            (window as unknown as {__xlcCopied?: string}).__xlcCopied = text;
            return true;
        },
        getSort: (): "manual" | "recent" | "frequent" | "title" => "manual",
        setSort: () => {},
        searchDocs: async (k: string) => k ? [{id: "20240101120001-hijklmn", hPath: "/常用内容库", name: "常用内容库"}] : [],
        insertToDoc: async (itemId: string, docId: string, hPath: string) => {
            const w = window as unknown as {__xlcDocActions?: Array<{id: string; docId: string; hPath: string}>};
            (w.__xlcDocActions ??= []).push({id: itemId, docId, hPath});
            return true;
        },
        duplicateItem: async (itemId: string) => {
            const w = window as unknown as {__xlcDuplicatedItems?: string[]};
            (w.__xlcDuplicatedItems ??= []).push(itemId);
        },
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
        getRecentQueries: () => (window as unknown as {__xlcRecentQueries?: string[]}).__xlcRecentQueries ?? ["发票资料", "延期道歉"],
        addRecentQuery: (q: string) => {
            const w = window as unknown as {__xlcRecentQueries?: string[]};
            const current = w.__xlcRecentQueries ?? ["发票资料", "延期道歉"];
            w.__xlcRecentQueries = [q, ...current.filter((x) => x !== q)].slice(0, 10);
        },
        insertTarget: null,
        openSetup: () => (window as unknown as {XlcHarness: {openSettings: () => void}}).XlcHarness.openSettings(),
        promptVariables: () => overrides.promptVariables ?? true,
        getUsage: () => ({
            "xlc-demo0000001": {count: 32, lastAt: 400},
            "xlc-demo0000002": {count: 18, lastAt: 300},
            "xlc-demo0000003": {count: 11, lastAt: 200},
            "xlc-demo0000005": {count: 4, lastAt: 100},
        }),
        resetItemUsage: (itemId: string) => {
            const w = window as unknown as {__xlcResetUsageItems?: string[]};
            (w.__xlcResetUsageItems ??= []).push(itemId);
            return true;
        },
        newItem: (titleCandidate?: string) => {
            document.body.dataset.xlcNewItemTitle = titleCandidate ?? "";
            document.body.dataset.xlcNewItemCalls = String(Number(document.body.dataset.xlcNewItemCalls ?? 0) + 1);
            (window as unknown as {XlcHarness: {openCapture: () => void}}).XlcHarness.openCapture();
        },
        newWithContent: (content: string, options?: {title?: string}) => {
            const w = window as unknown as {__xlcNewWithContentCalls?: Array<{content: string; title?: string}>};
            (w.__xlcNewWithContentCalls ??= []).push({content, title: options?.title});
            document.body.dataset.xlcNewItemTitle = options?.title ?? "";
            document.body.dataset.xlcNewWithContentCalls = String(Number(document.body.dataset.xlcNewWithContentCalls ?? 0) + 1);
            (window as unknown as {XlcHarness: {openCapture: () => void}}).XlcHarness.openCapture();
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
        hasActiveEditor: () => overrides.activeEditor !== false,
        hasInsertTarget: () => overrides.insertTargetAvailable ?? overrides.activeEditor !== false,
        isSourceMissing: (entry: SearchEntry) => overrides.missing === true && entry.id === "xlc-demo0000001",
        close: () => {},
        isMobile: () => overrides.mobile === true,
    };
}

(window as unknown as {XlcHarness: unknown}).XlcHarness = {
    openDialog(overrides?: {aiEnabled?: boolean; missing?: boolean; scope?: "all" | "favorites"; query?: string; mobile?: boolean; empty?: boolean; largeResults?: boolean; insertTarget?: {docId: string; hPath: string}; filters?: {type: string; tag: string; category: string}; newItemAction?: string; activeEditor?: boolean; insertTargetAvailable?: boolean; actionDelayMs?: number; promptVariables?: boolean; realExecutor?: boolean; realClipboardAvailable?: boolean}): CommonSearchDialog {
        const dialog = new CommonSearchDialog(makeDeps(overrides));
        lastSearchDialog = dialog;
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
    triggerAccessIssue(kind: "auth" | "permission" = "auth"): void {
        const key = kind === "auth" ? "kernelAuthRequired" : "kernelPermissionDenied";
        lastSearchDialog?.showKernelAccessIssue(kind, T(key));
    },
        openSettings(mode: "doc" | "tree" | "notebook" = "doc"): void {
            savedDiscoveryViews = [{
                id: "xlc-view-settings01",
                name: "客服话术",
                tag: "客服",
                scope: "document",
                targetDocId: "20240101120001-hijklmn",
                targetNotebookId: "",
                pathLabel: "/项目笔记",
                defaultCategory: "客服",
            }];
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
                createIndependentLibrary: async () => ({ok: true, data: {notebookId: "20240101999999", docId: "20240101120001-hijklmn"}}),
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
            getSavedDiscoveryViews: () => savedDiscoveryViews,
            openSavedDiscoveryView: (view) => { document.body.dataset.xlcSavedViewOpened = view.id; },
            deleteSavedDiscoveryView: (id) => { savedDiscoveryViews = savedDiscoveryViews.filter((view) => view.id !== id); },
        } as unknown as SettingsUiContext;
        openSettingsDialog(ctx);
    },
    openSetup(options?: {emptyNotebook?: boolean; notebookLoadError?: boolean; notebookDocsCheckError?: boolean; notebookDocsDelayMs?: number; docSearchErrorOnce?: boolean; docSearchDelayMs?: number; docSearchDelayByKeyword?: Record<string, number>; docSearchPathByKeyword?: Record<string, string>; existingMode?: "doc" | "tree" | "notebook"}): void {
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
                createIndependentLibrary: async (notebookName: string) => notebookName === "失败库"
                    ? ({ok: false, reason: "kernel-error", message: "补偿失败：20240101999999"} as const)
                    : ({ok: true, data: {notebookId: "20240101999999", docId: "20240101120001-hijklmn"}} as const),
                searchDocs: async (k: string) => {
                    docSearchRequests++;
                    const delay = options?.docSearchDelayByKeyword?.[k] ?? options?.docSearchDelayMs ?? 0;
                    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
                    if (options?.docSearchErrorOnce && docSearchRequests === 1) return {ok: false, reason: "kernel-error", message: "offline"} as const;
                    return k
                        ? ({ok: true, data: [{id: "20240101120001-hijklmn", hPath: options?.docSearchPathByKeyword?.[k] ?? "/常用内容库", box: "nb", name: "常用内容库"}]} as const)
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
    openCapture(aiOn = true, aiDelayMs = 0, options?: {tidyFailureCall?: number; tidyFailureKind?: "result" | "throw"; draftFailureCall?: number; draftFailureKind?: "result" | "throw"; deferTidy?: boolean}): void {
        let tidyCall = 0;
        let draftCall = 0;
        const capture = new CaptureDialog({
            t: T,
            getSelectionText: () => ({text: "", blockId: null}),
            currentDocId: () => "20240101120001-hijklmn",
            readClipboardText: async () => "",
            createItem: async (input) => {
                captureCreatedItems.push(input);
                document.body.dataset.xlcCaptureCreatedItems = JSON.stringify(captureCreatedItems);
                return {ok: true, message: input.title ?? "item", itemId: "xlc-new000000001"};
            },
            notify: () => {},
            getBlockKramdown: async () => "块内容",
            exportDocContent: async () => ({hPath: "/常用内容库", content: "# 内容"}),
            aiEnabled: () => aiOn,
            aiTidy: async (content: string) => {
                tidyCall++;
                if (options?.deferTidy) {
                    return await new Promise<{ok: true; title: string; alias: string; tags: string[]; category: string}>((resolve) => {
                        deferredTidyResponse = resolve;
                        document.body.dataset.xlcDeferredTidyPending = "true";
                    });
                }
                if (aiDelayMs) await new Promise((resolve) => setTimeout(resolve, aiDelayMs));
                captureAiTidyCalls.push(content);
                document.body.dataset.xlcCaptureAiTidyCalls = JSON.stringify(captureAiTidyCalls);
                if (options?.tidyFailureCall === tidyCall) {
                    if (options.tidyFailureKind === "throw") throw new Error("AI 整理请求暂时失败，请重试。");
                    return {ok: false as const, message: "AI 整理请求暂时失败，请重试。"};
                }
                return {ok: true as const, title: "AI 建议 " + content.slice(0, 6), alias: "AI 别名", tags: ["AI", "模板"], category: "AI 模板"};
            },
            aiDraft: async (desc: string) => {
                draftCall++;
                if (aiDelayMs) await new Promise((resolve) => setTimeout(resolve, aiDelayMs));
                captureAiDraftCalls.push(desc);
                document.body.dataset.xlcCaptureAiDraftCalls = JSON.stringify(captureAiDraftCalls);
                if (options?.draftFailureCall === draftCall) {
                    if (options.draftFailureKind === "throw") throw new Error("AI 草稿请求暂时失败，请重试。");
                    return {ok: false as const, message: "AI 草稿请求暂时失败，请重试。"};
                }
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
    openDiscovery(options?: {notebookLoadErrorOnce?: boolean; emptyNotebookList?: boolean; initialTreeRoot?: boolean; initialNotebookId?: string; candidateCount?: number; initialTag?: string; autoSelectFiltered?: boolean; referenceOnly?: boolean; defaultCategory?: string; longTag?: string; saveViewRejected?: boolean; unknownSourceNotebook?: boolean}): void {
        let sessionId = "discovery-harness";
        let stopRequested = false;
        let notebookRequests = 0;
        let treeSearchRequests = 0;
        const sampleCandidates = [
            {key: "candidate-1", sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb", sourcePath: "/项目笔记", itemType: "markdown", title: "客户延期回复", summary: "关于交付延期的说明", tags: ["客服", "延期"], status: "candidate"},
            {key: "candidate-2", sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120003-ccccccc", sourcePath: "/项目笔记", itemType: "text", title: "收件地址", summary: "邮寄地址模板", tags: ["客服", "地址"], status: "same-content", match: {itemId: "xlc-existing0001", title: "已有收件地址"}},
        ];
        if (options?.longTag) sampleCandidates[0].tags.push(options.longTag);
        const candidates = options?.candidateCount
            ? Array.from({length: options.candidateCount}, (_, index) => ({
                key: `page-candidate-${String(index + 1).padStart(4, "0")}`,
                sourceDocId: "20240101120001-hijklmn",
                sourceBlockId: `2024010112${String(index + 2).padStart(4, "0")}-bbbbbbb`,
                sourcePath: "/项目笔记",
                itemType: "markdown",
                title: `分页候选 ${String(index + 1).padStart(3, "0")}`,
                summary: "用于验证候选分页与键盘焦点恢复。",
                tags: [],
                status: "candidate" as const,
            }))
            : sampleCandidates;
        const makeView = (scope: "document" | "notebook" | "tree" | "all-notebooks", stopped = false) => ({id: sessionId, scope, sourceDocId: "20240101120001-hijklmn", sourceNotebookId: options?.unknownSourceNotebook ? undefined : "20240101120000-notebk1", sourcePath: "/项目笔记", candidates: candidates.map((candidate) => ({...candidate})), scannedBlocks: 4, scannedDocs: 1, scannedNotebooks: scope === "all-notebooks" ? 2 : 1, skippedEmpty: 1, skippedLong: 0, truncated: stopped, stopped, truncationReasons: stopped ? ["cancelled"] : [], errors: []});
        const service = {
            discoverCurrentDocument: async () => ({ok: true as const, data: makeView("document")}),
            discoverCurrentNotebook: async (_docId: string, options?: {onProgress?: (progress: {phase: "enumerating" | "scanning"; scannedDocs: number; scannedBlocks: number; discoveredDocs: number; totalDocs?: number}) => void}) => {
                document.body.dataset.xlcDiscoveryScopeUsed = "current-notebook";
                stopRequested = false;
                options?.onProgress?.({phase: "enumerating", scannedDocs: 0, scannedBlocks: 0, discoveredDocs: 3});
                options?.onProgress?.({phase: "scanning", scannedDocs: 1, scannedBlocks: 4, discoveredDocs: 3, totalDocs: 3});
                await new Promise((resolve) => setTimeout(resolve, 80));
                return {ok: true as const, data: {...makeView("notebook", stopRequested), scannedBlocks: 12, scannedDocs: 3, skippedEmpty: 2}};
            },
            discoverTree: async (docId: string) => {
                document.body.dataset.xlcDiscoveryScopeUsed = "tree";
                document.body.dataset.xlcDiscoveryTargetDoc = docId;
                return {ok: true as const, data: makeView("tree")};
            },
            discoverNotebook: async (notebookId: string) => {
                document.body.dataset.xlcDiscoveryScopeUsed = "selected-notebook";
                document.body.dataset.xlcDiscoveryTargetNotebook = notebookId;
                return {ok: true as const, data: {...makeView("notebook"), sourceNotebookId: notebookId}};
            },
            discoverAllNotebooks: async (options?: {confirmed?: boolean}) => {
                document.body.dataset.xlcDiscoveryScopeUsed = options?.confirmed ? "all-confirmed" : "all-unconfirmed";
                return options?.confirmed
                    ? ({ok: true as const, data: makeView("all-notebooks")})
                    : ({ok: false as const, reason: "invalid-input" as const, message: "confirmation required"});
            },
            previewCandidate: async (_id: string, key: string) => {
                const candidate = candidates.find((item) => item.key === key) ?? candidates[0];
                return {ok: true as const, data: {candidate: {...candidate}, markdown: key === "candidate-2" ? "收件人：{{xlc:ask:收件人}}\n地址：{{xlc:ask:地址|textarea}}" : "您好，关于本期交付延期，我们深表歉意。", contentComparisonComplete: true}};
            },
            addCandidate: async (_id: string, key: string, options?: {allowSameContent?: boolean; batchId?: string; category?: string}) => {
                const recorded = (window as unknown as {__xlcDiscoveryCategories?: Array<{key: string; category?: string}>}).__xlcDiscoveryCategories ?? [];
                recorded.push({key, category: options?.category});
                (window as unknown as {__xlcDiscoveryCategories?: Array<{key: string; category?: string}>}).__xlcDiscoveryCategories = recorded;
                const candidate = candidates.find((item) => item.key === key) ?? candidates[0];
                if (candidate.status === "same-content" && !options?.allowSameContent) {
                    return {ok: true as const, data: {status: "same-content" as const, itemId: "xlc-existing0001", title: "已有收件地址"}};
                }
                await new Promise((resolve) => setTimeout(resolve, 120));
                const id = key === "candidate-2" ? "xlc-discovered0002" : "xlc-discovered0001";
                return {ok: true as const, data: {status: "added" as const, item: {id, title: candidate.title} as never, batchId: options?.batchId ?? "batch-harness"}};
            },
            beginAddBatch: () => ({ok: true as const, data: {batchId: "batch-harness"}}),
            finishAddBatch: (_id: string, batchId: string) => ({ok: true as const, data: {batchId, added: 2, discarded: false}}),
            undoBatch: async (_id: string, batchId: string) => {
                await new Promise((resolve) => setTimeout(resolve, 120));
                return {ok: true as const, data: {
                    batchId,
                    deleted: 1,
                    alreadyUndone: false,
                    deletedItems: [{itemId: "xlc-discovered0001", title: "客户延期回复"}],
                    skipped: [{itemId: "xlc-discovered0002", title: "收件地址", reason: "not-found" as const}],
                    failed: [],
                }};
            },
            closeSession: () => {
                document.body.dataset.xlcDiscoveryCloseAttempts = String(Number(document.body.dataset.xlcDiscoveryCloseAttempts ?? 0) + 1);
                if (document.body.dataset.xlcDiscoveryCloseConflict === "true") {
                    return {ok: false as const, reason: "conflict" as const, message: "write pending"};
                }
                document.body.dataset.xlcDiscoverySessionClosed = "true";
                document.body.dataset.xlcDiscoveryCloseSuccesses = String(Number(document.body.dataset.xlcDiscoveryCloseSuccesses ?? 0) + 1);
                return {ok: true, data: {closed: true, activeWrites: 0}};
            },
            requestScanStop: () => { stopRequested = true; return true; },
        };
        document.body.dataset.xlcDiscoverySaveViewRejected = String(options?.saveViewRejected === true);
        discoveryController = openDiscoveryDialog({
            t: T,
            service,
            notify: (_kind, message) => { document.body.dataset.xlcDiscoveryNotice = message; },
            listNotebooks: async () => {
                notebookRequests++;
                if (options?.notebookLoadErrorOnce && notebookRequests === 1) throw new Error("offline");
                if (options?.emptyNotebookList) return [];
                return [{id: "20240101120000-notebk1", name: "笔记本一"}, {id: "20240102120000-notebk2", name: "笔记本二"}];
            },
            searchDocs: async (keyword) => {
                treeSearchRequests++;
                document.body.dataset.xlcDiscoveryTreeSearchRequests = String(treeSearchRequests);
                if (keyword === "旧项目") await new Promise((resolve) => setTimeout(resolve, 100));
                if (keyword === "项目") return [{id: "20240101120001-hijklmn", hPath: "/项目笔记", box: "20240101120000-notebk1", name: "项目笔记"}];
                if (keyword === "新项目") return [{id: "20240102120001-qrstuvw", hPath: "/新项目", box: "20240102120000-notebk2", name: "新项目"}];
                return [];
            },
            savedViews: savedDiscoveryViews,
            onSaveView: (view) => {
                document.body.dataset.xlcDiscoverySaveViewCalls = String(Number(document.body.dataset.xlcDiscoverySaveViewCalls ?? 0) + 1);
                if (document.body.dataset.xlcDiscoverySaveViewRejected === "true") return false;
                const saved: SavedDiscoveryView = {id: "xlc-view-harness01", ...view};
                savedDiscoveryViews = [saved, ...savedDiscoveryViews.filter((entry) => entry.id !== saved.id)];
                document.body.dataset.xlcDiscoverySavedView = JSON.stringify(saved);
            },
        }, {
            docId: "20240101120001-hijklmn",
            sourcePath: "/项目笔记",
            scope: options?.initialNotebookId ? "notebook" : options?.initialTreeRoot ? "tree" : undefined,
            initialTreeRootId: options?.initialTreeRoot ? "20240101120001-hijklmn" : undefined,
            initialNotebookId: options?.initialNotebookId,
            title: options?.initialTreeRoot ? "从此文档发现常用语" : undefined,
            initialTag: options?.initialTag,
            autoSelectFiltered: options?.autoSelectFiltered,
            referenceOnly: options?.referenceOnly,
            defaultCategory: options?.defaultCategory,
        });
    },
    closeDiscovery(force = false): boolean {
        const closed = discoveryController?.close(force) ?? true;
        if (closed) discoveryController = null;
        return closed;
    },
    requestCloseDiscovery(callbackKey: string, force = false): boolean {
        const onClosed = () => {
            const calls = JSON.parse(document.body.dataset.xlcDiscoveryCloseCallbacks ?? "{}") as Record<string, number>;
            calls[callbackKey] = (calls[callbackKey] ?? 0) + 1;
            document.body.dataset.xlcDiscoveryCloseCallbacks = JSON.stringify(calls);
        };
        if (!discoveryController) {
            onClosed();
            return true;
        }
        const closed = discoveryController.close(force, onClosed);
        if (closed) discoveryController = null;
        return closed;
    },
    completeDeferredTidy(): void {
        deferredTidyResponse?.({ok: true, title: "迟到的旧建议", alias: "旧别名", tags: ["旧标签"], category: "旧分类"});
        deferredTidyResponse = null;
    },
};
