// 渲染 harness 入口：把生产 CommonSearchDialog / 设置对话框 / 捕获表单暴露到 window，
// 由 render-production.cjs 在 Chromium 中以假数据驱动、截取真实生产 DOM+CSS 效果。
import {CommonSearchDialog} from "../../src/ui/dialog";
import {openSettingsDialog, type SettingsUiContext} from "../../src/ui/settings-dialog";
import {CaptureDialog} from "../../src/ui/capture";
import type {SearchEntry} from "../../src/model/search";
import type {TransformKind} from "../../src/service/ai";

const ENTRIES: SearchEntry[] = [
    {id: "xlc-demo0000001", blockId: "20240101120000-aaaaaaa", libraryDocId: "20240101120001-hijklmn", itemType: "markdown", title: "项目延期道歉与补偿方案", alias: "延期道歉", tags: ["客户沟通", "模板"], category: "客服", summary: "尊敬的王总：关于本期交付延期……", createdAt: 1, updatedAt: 2, sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb"},
    {id: "xlc-demo0000002", blockId: "20240101120000-ccccccc", libraryDocId: "20240101120001-hijklmn", itemType: "text", title: "延期简短版（IM 用）", alias: "", tags: [], category: "", summary: "您好，本次迭代因联调超期，上线推迟 2 天……", createdAt: 1, updatedAt: 2},
    {id: "xlc-demo0000003", blockId: "20240101120000-ddddddd", libraryDocId: "20240101120001-hijklmn", itemType: "code", title: "SQL 分页模板", alias: "", tags: ["开发"], category: "", summary: "SELECT * FROM t LIMIT …", createdAt: 1, updatedAt: 2},
    {id: "xlc-demo0000004", blockId: "20240101120000-eeeeeee", libraryDocId: "20240101120001-hijklmn", itemType: "blockref", title: "产品需求模板（引用）", alias: "", tags: [], category: "", summary: "", createdAt: 1, updatedAt: 2, targetBlockId: "20240101120002-bbbbbbb" as unknown as string},
    {id: "xlc-demo0000005", blockId: "20240101120000-fffffff", libraryDocId: "20240101120001-hijklmn", itemType: "url", title: "SLA 赔付标准文档", alias: "", tags: [], category: "", summary: "https://wiki.example.com/sla", createdAt: 1, updatedAt: 2, url: "https://wiki.example.com/sla"},
];

const PREVIEWS: Record<string, string> = {
    "xlc-demo0000001": "尊敬的王总：\n\n关于本期「会员系统」交付延期，我们深表歉意。经复盘，主要原因为第三方支付联调超期。目前联调已完成 92%，预计推迟 2 个工作日上线。\n\n为弥补影响，我们提供以下补偿：\n1. 本期服务费减免 5%；\n2. 上线后 48 小时专属值守；\n3. 下期迭代优先排入贵方需求。\n\n再次感谢理解与支持，有任何问题随时联系我。",
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
        aiTidy: "AI 整理", aiDraft: "AI 草稿", aiDraftDesc: "描述你想要的内容，AI 生成草稿", aiApplied: "已应用 AI 建议",
        saved: "已保存：%s",
        "sort.manual": "手动/置顶", "sort.recent": "最近使用", "sort.title": "标题",
        totalItems: "共 %s 条",
        duplicateItem: "创建副本", insertToDoc: "插入到指定文档", insertToDocPick: "选择目标文档（输入关键词搜索）",
        saveTransformed: "存为新条目", deleteConfirm: "删除条目「%s」？",
        providerSection: "提供方内容", providerInsert: "插入（提供方）", providerCopy: "复制（提供方）",
        providerExecutable: "可执行", providerPendingReload: "待重载",
        openSettings: "设置 / 更改内容库", openSettingsChangeLib: "更改内容库",
        aiSection: "AI 助手", aiEnabled: "启用 AI 助手", aiShareContent: "允许 AI 读取条目完整正文",
        searchSection: "搜索", pinyinToggle: "拼音搜索", placeholdersToggle: "动态占位符", placeholdersHint: "支持 {{xlc:date}} 等",
        dataSection: "数据（导出 / 导入）", librarySection: "当前内容库", libraryNone: "未配置",
        reindexBtn: "重建索引", clearRecents: "清空最近使用", clearRecentsConfirm: "清空最近使用记录？",
        exportBtn: "导出全部条目 (JSON)", importBtn: "导入 JSON", exportMdBtn: "导出 Markdown 包（含资源）",
        tagAuditBtn: "AI 标签体检",
        setupTitle: "选择常用内容库", setupPickDoc: "选择现有文档", setupNotebook: "按笔记本",
        setupNewDoc: "创建新库文档", setupNewDocName: "常用内容库", docPicker: "选择库文档", docPickerEmpty: "没有匹配的文档",
    };
    let text = map[key] ?? key;
    for (const arg of args) text = text.replace("%s", arg);
    return text;
};

function makeDeps(overrides: {aiEnabled?: boolean; missing?: boolean} = {}) {
    const aiOn = overrides.aiEnabled ?? true;
    return {
        t: T,
        search: async () => ({entries: ENTRIES, truncated: false, total: 128}),
        getTags: async () => ["客户沟通", "模板", "开发"],
        preview: async (itemId: string) => PREVIEWS[itemId] ?? "",
        runAction: async () => ({ok: true, message: "inserted"}),
        openSource: async () => ({ok: true, message: "opened"}),
        editItem: async () => {},
        deleteItem: async () => {},
        toggleFavorite: () => true,
        isFavorite: (id: string) => id === "xlc-demo0000001",
        insertRaw: async () => true,
        getSort: (): "manual" | "recent" | "title" => "manual",
        cycleSort: () => {},
        searchDocs: async (k: string) => k ? [{id: "20240101120001-hijklmn", hPath: "/常用内容库", name: "常用内容库"}] : [],
        insertToDoc: async () => true,
        duplicateItem: async () => {},
        saveTransformed: async () => {},
        getFilters: () => ({type: "", tag: ""}),
        setFilters: () => {},
        getLastQuery: () => "",
        setLastQuery: () => {},
        insertTarget: null,
        openSetup: () => {},
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
        aiEnabled: () => aiOn,
        isSourceMissing: (entry: SearchEntry) => overrides.missing === true && entry.id === "xlc-demo0000001",
        close: () => {},
        isMobile: () => false,
    };
}

(window as unknown as {XlcHarness: unknown}).XlcHarness = {
    openDialog(overrides?: {aiEnabled?: boolean; missing?: boolean; scope?: "all" | "favorites"; query?: string}): CommonSearchDialog {
        const dialog = new CommonSearchDialog(makeDeps(overrides), {
            favorites: new Set(["xlc-demo0000001"]),
            recents: new Map([["xlc-demo0000002", 2]]),
            now: 1,
        });
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
                favorites: [], recents: [], sort: "manual",
                uiPrefs: {lastTypeFilter: "", lastTagFilter: ""},
                providers: [{pluginId: "xiaolv-checkin", displayName: "小驴打卡", protocolVersion: 1, registeredAt: 1}],
                ai: {enabled: true, shareContent: true},
                search: {pinyin: true, placeholders: true},
            },
            getConfig: () => ({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1}),
            library: {
                listNotebooks: async () => ({ok: true, data: [{id: "20240101", name: "笔记"}]}),
                searchDocs: async (k: string) => k ? [{id: "20240101120001-hijklmn", hPath: "/常用内容库", box: "nb", name: "常用内容库"}] : [],
                reindex: async () => ({entries: [], items: new Map(), truncated: false, docsScanned: 1, errors: [], builtAt: 1}),
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
        });
        capture.newManual();
    },
};
