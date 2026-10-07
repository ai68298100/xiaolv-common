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
        pluginName: "小驴常用",
        searchPlaceholder: "搜索常用内容（? 前缀 = AI 语义找）",
        type: "类型", tags: "标签", tagsHint: "逗号分隔", title: "标题", alias: "别名", category: "分类", contentLabel: "内容（Markdown）", filterAll: "全部类型",
        "type.text": "纯文本", "type.markdown": "Markdown", "type.url": "网址", "type.code": "代码", "type.image": "图片", "type.asset": "附件", "type.blockref": "块引用", "type.structure": "块结构", filterFavorites: "收藏", filterRecent: "最近",
        empty: "没有匹配的条目", usageHint: "↑↓ 选择 · Enter 插入 · Ctrl+Enter 复制 · Esc 关闭",
        usageHintMobile: "点按插入 · 长按更多",
        insert: "插入", copy: "复制", openSource: "打开来源", edit: "编辑", delete: "删除",
        insertRef: "插入引用", insertEmbed: "插入嵌入", insertCopy: "复制内容",
        sourceMissing: "来源失效", sourceGone: "来源块已不存在（原文档被重组）· 打开来源可重新指定", previewUnavailable: "暂无预览",
        aiFound: "AI 找到的", aiWorking: "AI 处理中…", aiOriginalPreserved: "原文未被修改",
        insertNoEditor: "当前没有活动编辑器，已复制到剪贴板，可手动粘贴",
        kernelError: "思源接口调用失败",
        "tf.polish": "润色", "tf.shorten": "缩短", "tf.formal": "正式化", "tf.translate-en": "译为英文", "tf.bulletize": "列表化",
        more: "返回动作",
        newItem: "新建条目", save: "保存", cancel: "取消", confirm: "确定", invalidItem: "条目数据无效",
        aiTidy: "AI 整理", aiDraft: "AI 草稿", aiDraftDesc: "描述你想要的内容，AI 生成草稿", aiApplied: "已应用 AI 建议", aiTransform: "AI 变换",
        saved: "已保存：%s",
        dataTruth: "思源块真源 · 失效可见", adoptAll: "全部采纳", actionsNoun: "动作",
        semanticSuggestion: "没有本地结果。试试 AI 语义找：在关键词前加 ?", aiSemanticHint: "输入 ? 加描述，如「?给客户的道歉回复」，AI 在元数据中找最相关条目",
        varCountBadge: "%s 变量", paneVarsLabel: "插入时将询问 %s 个变量：", insertVariable: "插入变量：",
        varFormTitle: "填写变量", varFormSub: "本条目含 %s 个变量，填写后一次性插入；填写值仅用于本次，不回写库。", varFormHint: "Tab 下一项 · Enter 插入",
        groupPinned: "置顶", groupAll: "全部", groupUncategorized: "无分类", insertSection: "变量与插入",
        promptVariablesToggle: "插入前询问变量", promptVariablesSub: "含 {{xlc:ask:…}} 的条目插入前弹出填充卡片",
        recordUsageToggle: "记录使用次数", recordUsageSub: "仅本地存储，可一键清除；用于「常用」排序",
        usageStatsHint: "使用统计仅保存在本机", clearUsageBtn: "清空使用统计", clearUsageConfirm: "清空全部使用计数？", clearUsageDone: "已清空使用统计",
        importPolicySkipDesc: "同名同源条目不动，仅新增缺失项", importPolicyOverwriteDesc: "以导入内容更新现有条目（原文块被改写）", importPolicyRenameDesc: "导入项加「导入」后缀，现有条目不受影响",
        recommended: "推荐", importReceiptHint: "导入完成将逐项回执：新增 / 跳过 / 覆盖 / 改名 / 失败",
        importPolicyTitle: "选择重复处理策略", importPolicySkip: "跳过重复（保留现有）", importPolicyOverwrite: "覆盖重复", importPolicyRename: "重名并存",
        importPreview: "文件包含 %s 个条目，%s 条格式无效将被跳过。选择重复处理策略：",
        itemCountBadge: "%s 条目", invalidSkipBadge: "%s 条格式无效将跳过",
        cursorHint: "光标落点",
        setupModeLabel: "库方式", setupStep1: "第 1 步 · 选择库方式", setupStep2: "第 2 步 · 确认落点",
        setupNext: "下一步：确认", setupBack: "上一步", setupFinish: "完成设置", setupLater: "稍后再说",
        setupConfirmHint: "创建动作有明确 confirm 提示 · 不动你已有的任何文档；之后可在 设置 → 当前内容库 更改。",
        setupSummaryDoc: "条目将以真实块保存于此文档", setupSummaryNotebook: "整个笔记本作为内容库",
        create: "创建",
        useCount: "%s 次", quickNew: "＋ 新建", quickInsertSelected: "插入选中",
        packBtn: "模板包", packExportTitle: "导出 · 模板包", packCategoryLabel: "分类", allCategories: "全部分类",
        packNameLabel: "包名称", packNameDefault: "小驴常用模板包", packExportBtn: "导出 .md 包", packVarsBadge: "%s 条含变量",
        packContentsHint: "· 条目 Markdown + 元数据（标题/标签/分类）\n· 变量清单（{{xlc:ask:…}} 字段与选项）\n· 资源引用（assets 原样打包）",
        packTrustHint: "他人导入后即为真实思源块，可继续编辑与再分享——分享的是「活的块」，不是文本快照。",
        emptyFavorites: "还没有收藏的条目", emptyFavoritesSub: "点击条目右侧 ☆ 一键收藏，收藏会置顶显示", emptyRecent: "暂无最近使用的条目",
        "sort.manual": "手动/置顶", "sort.recent": "最近使用", "sort.title": "标题", "sort.frequent": "常用",
        totalItems: "共 %s 条",
        duplicateItem: "创建副本", insertToDoc: "插入到指定文档", insertToDocPick: "选择目标文档（输入关键词搜索）",
        aiInsertTransformed: "插入变换结果", aiCopyTransformed: "复制变换结果", aiInsertOriginal: "插入原文", saveTransformed: "存为新条目", deleteConfirm: "删除条目「%s」？",
        providerSection: "提供方内容", providerInsert: "插入（提供方）", providerCopy: "复制（提供方）",
        providerExecutable: "可执行", providerPendingReload: "待重载",
        openSettings: "设置 / 更改内容库", openSettingsChangeLib: "更改内容库",
        aiSection: "AI 助手", aiEnabled: "启用 AI 助手", aiShareContent: "允许 AI 读取条目完整正文",
        aiEnabledSub: "使用思源 设置→人工智能 的模型，插件不保存密钥", aiShareContentSub: "整理/变换/草稿需要；关闭时仅元数据",
        searchSection: "搜索", pinyinToggle: "拼音搜索", placeholdersToggle: "动态占位符", placeholdersHint: "支持 {{xlc:date}} 等",
        pinyinToggleSub: "全拼/首字母本地匹配", placeholdersToggleSub: "插入时替换 {{xlc:date}} 等为当前日期时间",
        aiSuggestion: "AI 建议", clearSearch: "清空搜索",
        customTransformSection: "自定义变换", customTransformAdd: "＋ 添加自定义变换", customTransformName: "名称",
        customTransformPrompt: "变换指令，如：改写为客服话术：", customTransformEmpty: "暂无自定义变换",
        customTransformCap: "最多 10 个自定义变换", customTransformNewName: "我的变换",
        customTransformHint: "与内置变换并列出现在条目动作菜单 ✦ 区；读取正文遵循「允许 AI 读取完整正文」开关",
        quickCapture: "快速捕获剪贴板为条目", quickCaptureDuplicate: "已存在同文条目「%s」，未重复保存",
        promptPackBtn: "导入提示词场景包", promptPackHint: "内置 10 个模板：客服回复 / AI 提示词 / 研发写作；导入当前库后可自由修改",
        dataSection: "数据（导出 / 导入）", librarySection: "当前内容库", libraryNone: "未配置",
        reindexBtn: "重建索引", clearRecents: "清空最近使用", clearRecentsConfirm: "清空最近使用记录？",
        exportBtn: "导出全部条目 (JSON)", importBtn: "导入 JSON", exportMdBtn: "导出 Markdown 包（含资源）",
        tagAuditBtn: "AI 标签体检",
        setupTitle: "选择常用内容库", setupHint: "条目将以真实块的形式保存在你选择的文档中（可在思源中正常编辑）。创建新文档前会明确提示，不会静默写入。", setupPickDoc: "选择现有文档", setupNotebook: "按笔记本",
        setupNewDoc: "创建新库文档", setupNewDocName: "常用内容库", docPicker: "选择库文档", docPickerEmpty: "没有匹配的文档",
        captureHint: "条目将保存为真实思源块 · 变量在插入时询问", captureHintLib: "库：%s", docCount: "%s 个文档",
        emptyLibrary: "内容库还是空的", emptyLibrarySub: "从选区、剪贴板或右键菜单捕获常用内容；也可以直接新建一条",
        updatedAtLabel: "更新于 %s",
    };
    let text = map[key] ?? key;
    for (const arg of args) text = text.replace("%s", arg);
    return text;
};

function makeDeps(overrides: {aiEnabled?: boolean; missing?: boolean; mobile?: boolean; empty?: boolean} = {}) {
    const aiOn = overrides.aiEnabled ?? true;
    return {
        t: T,
        search: async () => overrides.empty
            ? {entries: [], truncated: false, total: 0}
            : {entries: ENTRIES, truncated: false, total: 128},
        getTags: async () => ["客户沟通", "模板", "开发"],
        getCategories: async () => ["客服", "开发"],
        preview: async (itemId: string) => PREVIEWS[itemId] ?? "",
        runAction: async () => ({ok: true, message: "inserted"}),
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
        getFilters: () => ({type: "", tag: "", category: ""}),
        getLibraryName: async () => "/常用内容库",
        setFilters: () => {},
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
        newItem: () => {},
        providerSearch: async (query: string) => query.includes("工作台") ? [
            {virtualId: "pv:xiaolv-speed-switch:1", providerId: "xiaolv-speed-switch", providerName: "小驴雷切", title: "当前工作台", payload: "快速回到工作台布局（提供方演示数据）"},
            {virtualId: "pv:xiaolv-checkin:1", providerId: "xiaolv-checkin", providerName: "小驴打卡", title: "今日打卡状态", payload: "已完成 3/4 项习惯打卡（提供方演示数据）"},
        ] : [],
        insertProviderPayload: async () => true,
        copyProviderPayload: async () => true,
        aiSemantic: async (_desc: string) => ({ok: true as const, entries: ENTRIES.slice(0, 3)}),
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
    openDialog(overrides?: {aiEnabled?: boolean; missing?: boolean; scope?: "all" | "favorites"; query?: string; mobile?: boolean; empty?: boolean}): CommonSearchDialog {
        const dialog = new CommonSearchDialog(makeDeps(overrides));
        dialog.open();
        // 预填搜索与选中态，让截图呈现工作状态
        const input = document.querySelector<HTMLInputElement>(".xlc-search-input");
        if (input) {
            input.value = overrides?.query ?? "?给客户延期上线的道歉回复";
            input.dispatchEvent(new Event("input"));
        }
        return dialog;
    },
        openSettings(): void {
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
            getConfig: () => ({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1}),
            library: {
                listNotebooks: async () => ({ok: true, data: [{id: "20240101", name: "笔记"}]}),
                searchDocs: async (k: string) => k ? [{id: "20240101120001-hijklmn", hPath: "/常用内容库", box: "nb", name: "常用内容库"}] : [],
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
            fetchAssetBytes: async () => null,
            aiErrorText: (err) => String(err),
            applyPinyinAdapter: () => {},
        } as unknown as SettingsUiContext;
        openSettingsDialog(ctx);
    },
    openSetup(): void {
        const ctx: SettingsUiContext = {
            t: T,
            state: {
                schemaVersion: 2,
                favorites: [], recents: [], usage: {}, sort: "manual",
                uiPrefs: {lastTypeFilter: "", lastTagFilter: "", lastCategoryFilter: ""},
                providers: [], ai: {enabled: false, shareContent: false}, search: {pinyin: true, placeholders: true},
                insert: {promptVariables: true, recordUsage: true},
            },
            getConfig: () => null,
            library: {
                listNotebooks: async () => ({ok: true, data: [{id: "20240101", name: "笔记"}]}),
                searchDocs: async () => [],
                reindex: async () => ({entries: [], items: new Map(), truncated: false, docsScanned: 0, errors: [], builtAt: 1}),
            },
            ai: {updateSettings: () => {}, getSettings: () => ({enabled: false, shareContent: false})},
            registry: {list: () => [], listExecutable: () => []},
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
        openSetupDialog(ctx);
    },
    openCapture(aiOn = true): void {
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
            aiTidy: async (content: string) => ({ok: true as const, title: "AI 建议 " + content.slice(0, 6), tags: ["AI"]}),
            aiDraft: async (desc: string) => ({ok: true as const, text: "草稿（" + desc + "）"}),
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
