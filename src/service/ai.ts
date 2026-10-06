// AI 助手服务：基于宿主思源「设置→人工智能」的配置（插件不读取/不存储任何密钥）。
// 端点（上游核实）：POST /api/ai/chatGPT {msg} → data:string（一次性补全）；
//                  POST /ai/listModels {} → 已配置模型清单（可用性预检）。
// 硬边界（docs/positioning.md §四）：
//  - 默认关（aiEnabled）；正文出域须 aiShareContent 显式开启
//  - prompt 版本化（可审计）；自包含（不依赖/不清除内核会话缓存）
//  - 空响应=失败（上游吞错为空串，model/ai.go L75-78），绝不拿假结果兜底
//  - AI 结果永不回写来源块
import {LIMITS} from "../constants";

export interface IKernelTransport {
    request<T = unknown>(endpoint: AiEndpointName, payload?: Record<string, unknown>): Promise<T>;
}

export type AiEndpointName = "chatGPT" | "listModels";

export interface AiSettings {
    enabled: boolean;
    /** 允许发送完整正文（元数据级功能无需此项） */
    shareContent: boolean;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {enabled: false, shareContent: false};

export class AiUnavailableError extends Error {
    constructor(public readonly reason: "disabled" | "not-configured" | "empty-response" | "timeout" | "content-not-allowed" | "transport") {
        super(`ai unavailable: ${reason}`);
        this.name = "AiUnavailableError";
    }
}

export const AI_TIMEOUT_MS = 20_000;
export const AI_MAX_CONTENT_CHARS = 4000;
export const AI_MAX_META_ITEMS = 60;

// ---- prompt 模板（版本化：改语义必须升版本并留旧版兼容注释）----

export const PROMPT_VERSION = 1;

export function buildTidyPrompt(content: string): string {
    return [
        `你是笔记软件的条目整理助手（prompt v${PROMPT_VERSION}）。分析以下内容，输出严格 JSON（不要多余文字）：`,
        `{"title":"不超过20字的标题","alias":"可选别名","tags":["标签1","标签2"],"category":"分类","summary":"一句话摘要"}`,
        `内容：`,
        content.slice(0, AI_MAX_CONTENT_CHARS),
    ].join("\n");
}

export function buildDraftPrompt(description: string): string {
    return [
        `你是内容模板助手（prompt v${PROMPT_VERSION}）。根据描述直接输出可复用的内容草稿本体（Markdown 或纯文本，不要解释、不要代码围栏包裹全文）：`,
        `描述：`,
        description.slice(0, AI_MAX_CONTENT_CHARS),
    ].join("\n");
}

export type TransformKind = "polish" | "shorten" | "formal" | "translate-en" | "bulletize";

export const TRANSFORM_LABELS: Record<TransformKind, string> = {
    polish: "润色",
    shorten: "缩短",
    formal: "正式化",
    "translate-en": "译为英文",
    bulletize: "列表化",
};

const TRANSFORM_INSTRUCTIONS: Record<TransformKind, string> = {
    polish: "润色下文，保持原意与语言，仅提升流畅度：",
    shorten: "把下文压缩到一半以内篇幅，保留关键信息：",
    formal: "把下文改写为正式书面语气，保持事实不变：",
    "translate-en": "把下文翻译为英文：",
    bulletize: "把下文整理为 Markdown 无序列表，不新增事实：",
};

export function buildTransformPrompt(kind: TransformKind, content: string): string {
    return [
        `（prompt v${PROMPT_VERSION}）直接输出变换结果本体，不要解释：`,
        TRANSFORM_INSTRUCTIONS[kind],
        content.slice(0, AI_MAX_CONTENT_CHARS),
    ].join("\n");
}

/** 自定义变换（F7）：用户指令作为变换提示正文，外层约束（直接输出/正文上限）与内置一致 */
export function buildCustomTransformPrompt(instruction: string, content: string): string {
    return [
        `（prompt v${PROMPT_VERSION}）直接输出变换结果本体，不要解释：`,
        instruction.trim().slice(0, 500),
        content.slice(0, AI_MAX_CONTENT_CHARS),
    ].join("\n");
}

export interface SearchMetaEntry {
    id: string;
    title: string;
    alias: string;
    tags: string[];
    category: string;
    summary: string;
    itemType: string;
}

// ---- 标签体检（R9）：仅元数据（标签清单）出域；只建议不自动改 ----

export interface TagAuditSuggestion {
    type: "merge" | "rename";
    tags: string[];
    suggestion: string;
    reason: string;
}

export function buildTagAuditPrompt(tags: readonly string[]): string {
    return [
        `你是标签治理助手（prompt v${PROMPT_VERSION}）。分析以下标签清单，找出应归并的同义/近义标签或应改名的标签。`,
        `只输出严格 JSON 数组（至多 10 条）：[{"type":"merge","tags":["a","b"],"suggestion":"合并为: c","reason":"一句话理由"},{"type":"rename","tags":["x"],"suggestion":"改为: y","reason":"…"}]。没有建议输出 []。`,
        `标签清单：`,
        tags.slice(0, 200).join(", "),
    ].join("\n");
}

export function parseTagAudit(raw: string): TagAuditSuggestion[] {
    const json = extractJson(raw);
    if (!json) return [];
    try {
        const arr = JSON.parse(json) as unknown;
        if (!Array.isArray(arr)) return [];
        const out: TagAuditSuggestion[] = [];
        for (const raw of arr.slice(0, 10)) {
            if (!raw || typeof raw !== "object") continue;
            const obj = raw as Record<string, unknown>;
            const type = obj.type === "merge" || obj.type === "rename" ? obj.type : null;
            const tags = Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string" && t.length > 0).slice(0, 10) : [];
            const suggestion = typeof obj.suggestion === "string" ? obj.suggestion.slice(0, 200) : "";
            const reason = typeof obj.reason === "string" ? obj.reason.slice(0, 200) : "";
            if (!type || tags.length === 0 || !suggestion) continue;
            out.push({type, tags, suggestion, reason});
        }
        return out;
    } catch {
        return [];
    }
}

export function buildSemanticPickPrompt(query: string, entries: readonly SearchMetaEntry[]): string {
    const list = entries.slice(0, AI_MAX_META_ITEMS).map((e, i) =>
        `${i + 1}. [${e.itemType}] ${e.title}${e.alias ? ` / 别名:${e.alias}` : ""}${e.tags.length ? ` / 标签:${e.tags.join(",")}` : ""}${e.category ? ` / 分类:${e.category}` : ""}${e.summary ? ` / 摘要:${e.summary.slice(0, 60)}` : ""}`,
    );
    return [
        `你是条目检索助手（prompt v${PROMPT_VERSION}）。根据用户描述从下列条目清单中挑出最相关的至多 5 条。`,
        `只输出 JSON 数组（按相关度排序），形如 [1,4,2]（行号），不要其他文字。清单为空或都不相关则输出 []。`,
        `用户描述：${query.slice(0, 200)}`,
        `条目清单：`,
        ...list,
    ].join("\n");
}

// ---- 结果解析（容错：剥离围栏/前后杂文，坏 JSON 返 null 由调用方报「无法解析」）----

export function parseTidyResult(raw: string): {title?: string; alias?: string; tags?: string[]; category?: string; summary?: string} | null {
    const json = extractJson(raw);
    if (!json) return null;
    try {
        const obj = JSON.parse(json) as Record<string, unknown>;
        return {
            title: typeof obj.title === "string" ? obj.title.slice(0, LIMITS.title) : undefined,
            alias: typeof obj.alias === "string" ? obj.alias.slice(0, LIMITS.alias) : undefined,
            tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string").slice(0, LIMITS.tags) : undefined,
            category: typeof obj.category === "string" ? obj.category.slice(0, LIMITS.category) : undefined,
            summary: typeof obj.summary === "string" ? obj.summary.slice(0, LIMITS.summary) : undefined,
        };
    } catch {
        return null;
    }
}

export function parseSemanticPick(raw: string, max: number): number[] {
    const json = extractJson(raw);
    if (!json) return [];
    try {
        const arr = JSON.parse(json) as unknown;
        if (!Array.isArray(arr)) return [];
        return arr
            .map((v) => Math.floor(Number(v)))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= max)
            .slice(0, 5);
    } catch {
        return [];
    }
}

function extractJson(raw: string): string | null {
    if (!raw) return null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = fenced ? fenced[1] ?? "" : raw;
    const start = body.search(/[[{]/);
    if (start === -1) return null;
    const open = body[start] ?? "";
    const close = open === "{" ? "}" : "]";
    const end = body.lastIndexOf(close);
    if (end <= start) return null;
    return body.slice(start, end + 1);
}

// ---- 服务门面 ----

export class AiAssistant {
    constructor(
        private readonly transport: IKernelTransport,
        private settings: AiSettings = {...DEFAULT_AI_SETTINGS},
    ) {}

    updateSettings(patch: Partial<AiSettings>): void {
        this.settings = {...this.settings, ...patch};
    }

    getSettings(): AiSettings {
        return {...this.settings};
    }

    /** 可用性预检：未启用 → disabled；模型清单为空 → not-configured；预检失败视为未配置（上游吞错）。 */
    async preflight(): Promise<{ok: true} | {ok: false; reason: "disabled" | "not-configured" | "transport"}> {
        if (!this.settings.enabled) return {ok: false, reason: "disabled"};
        try {
            const models = await this.transport.request<Array<unknown>>("listModels", {});
            return Array.isArray(models) && models.length > 0 ? {ok: true} : {ok: false, reason: "not-configured"};
        } catch {
            return {ok: false, reason: "not-configured"};
        }
    }

    private async complete(prompt: string, needContentPermission: boolean, content?: string): Promise<string> {
        if (!this.settings.enabled) throw new AiUnavailableError("disabled");
        if (needContentPermission && !this.settings.shareContent) throw new AiUnavailableError("content-not-allowed");
        if (needContentPermission && content && content.length > AI_MAX_CONTENT_CHARS * 2) {
            throw new AiUnavailableError("content-not-allowed"); // 超长内容拒绝出域
        }
        let raw: unknown;
        try {
            raw = await this.transport.request<string>("chatGPT", {msg: prompt});
        } catch (err) {
            if ((err as {name?: string})?.name === "KernelTimeoutError") throw new AiUnavailableError("timeout");
            throw new AiUnavailableError("transport");
        }
        if (typeof raw !== "string" || raw.trim().length === 0) {
            // 上游把「未配置/网络失败」都吞成空串（model/ai.go L75-78）
            throw new AiUnavailableError("empty-response");
        }
        return raw.trim();
    }

    /** 捕获表单「AI 整理」：需要正文出域权限。 */
    async tidy(content: string): Promise<ReturnType<typeof parseTidyResult>> {
        const raw = await this.complete(buildTidyPrompt(content), true, content);
        const parsed = parseTidyResult(raw);
        if (!parsed || (!parsed.title && !parsed.tags?.length)) throw new AiUnavailableError("empty-response");
        return parsed;
    }

    /** AI 生成草稿：需要正文出域权限（描述文本同样出域）。 */
    async draft(description: string): Promise<string> {
        return this.complete(buildDraftPrompt(description), true, description);
    }

    /** 调用时变换：需要正文出域权限。返回预览文本，绝不回写。 */
    async transform(kind: TransformKind, content: string): Promise<string> {
        return this.complete(buildTransformPrompt(kind, content), true, content);
    }

    /** 自定义变换（F7）：指令来自用户设置；需要正文出域权限（complete 的 needContent 门禁同内置） */
    async transformCustom(instruction: string, content: string): Promise<string> {
        return this.complete(buildCustomTransformPrompt(instruction, content), true, content);
    }

    /** 语义找条目：默认仅元数据清单出域（不含正文）。返回按相关度排序的条目引用。 */
    async semanticPick(query: string, entries: readonly SearchMetaEntry[]): Promise<SearchMetaEntry[]> {
        if (entries.length === 0) return [];
        const raw = await this.complete(buildSemanticPickPrompt(query, entries), false);
        const picks = parseSemanticPick(raw, Math.min(entries.length, AI_MAX_META_ITEMS));
        return picks.map((idx) => entries[idx - 1]).filter((e): e is SearchMetaEntry => !!e);
    }

    /** 标签体检：仅标签清单出域；只给建议不自动改。少于 2 个标签直接短路。 */
    async tagAudit(tags: readonly string[]): Promise<TagAuditSuggestion[]> {
        if (tags.length < 2) return [];
        const raw = await this.complete(buildTagAuditPrompt(tags), false);
        return parseTagAudit(raw);
    }
}
