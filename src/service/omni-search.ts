// 全域内容搜索终端服务（Omni-Search Terminal · G12，R270）：
// 将小驴常用提升为全局内容启动器与知识搜索终端；
// 当常用库检索无果或用户主动切域时，支持极速检索「当前打开文档」与「全库思源笔记」；
// 绝不依赖 SQL 端点，100% 走官方结构化端点（getChildBlocks / getBlockKramdowns / searchDocs）；
// 检索结果无缝复用 SearchEntry 模型，支持就地语法高亮预览、快捷插入、复制及一键收录为常用语。

import type {IKernelClient} from "../kernel/client";
import {parseChildBlocks, parseBatchKramdowns, parseDocSearch, parseFullTextSearch, IBlockSearchHit} from "../kernel/client";
import {SearchEntry, splitSearchTokens} from "../model/search";
import {deriveTitle, deriveSummary, inferItemType, isBlockId, ItemType} from "../model/item";
import {inferTypeFromText} from "../ui/capture";
import {bodyWriteRestriction} from "../model/kramdown";
import {getPinyinAdapter} from "../model/pinyin";

export interface OmniSearchOptions {
    maxCurrentDocBlocks?: number;
    maxAllNotesDocs?: number;
    maxAllNotesBlocks?: number;
}

export interface ParsedOmniQuery {
    keyword: string;
    paths: string[];
    notebook?: string;
    types?: Record<string, boolean>;
}

/**
 * 纯函数：从搜索输入中解析范围限定语法（in:路径 / path:路径 / book:笔记本 / type:块类型）
 */
export function parseOmniQueryScope(query: string): ParsedOmniQuery {
    const raw = query.trim();
    if (!raw) return {keyword: "", paths: []};

    const tokens = raw.split(/\s+/);
    const paths: string[] = [];
    let notebook: string | undefined;
    const types: Record<string, boolean> = {};
    const cleanTokens: string[] = [];

    for (const token of tokens) {
        if (/^(?:in|path):(.+)$/i.test(token)) {
            const m = token.match(/^(?:in|path):(.+)$/i);
            if (m && m[1]) {
                const p = m[1].trim().replace(/^['"]|['"]$/g, "");
                if (p) paths.push(p.startsWith("/") ? p : `/${p}`);
            }
        } else if (/^(?:book|box):(.+)$/i.test(token)) {
            const m = token.match(/^(?:book|box):(.+)$/i);
            if (m && m[1]) {
                const b = m[1].trim().replace(/^['"]|['"]$/g, "");
                if (b) notebook = b;
            }
        } else if (/^type:(.+)$/i.test(token)) {
            const m = token.match(/^type:(.+)$/i);
            if (m && m[1]) {
                const rawType = m[1].trim().toLowerCase().replace(/^['"]|['"]$/g, "");
                if (rawType === "code" || rawType === "c" || rawType === "代码") {
                    types["c"] = true;
                } else if (rawType === "heading" || rawType === "h" || rawType === "标题") {
                    types["h"] = true;
                } else if (rawType === "quote" || rawType === "b" || rawType === "引述" || rawType === "引用") {
                    types["b"] = true;
                } else if (rawType === "math" || rawType === "m" || rawType === "公式") {
                    types["m"] = true;
                } else if (rawType === "table" || rawType === "t" || rawType === "表格") {
                    types["t"] = true;
                } else if (rawType === "list" || rawType === "l" || rawType === "列表") {
                    types["l"] = true;
                } else if (rawType === "doc" || rawType === "d" || rawType === "文档") {
                    types["d"] = true;
                }
            }
        } else {
            cleanTokens.push(token);
        }
    }

    return {
        keyword: cleanTokens.join(" ").trim(),
        paths,
        notebook,
        ...(Object.keys(types).length > 0 ? {types} : {}),
    };
}

/**
 * 智能推导从全域思源块/文档收录为常用语条目时的分类与标签治理元数据
 */
export function deriveOmniItemMetadata(entry: SearchEntry): { category: string; tags: string[]; recommendedAlias: string } {
    const rawPath = (entry.category || "").replace(/^\/+/, "").replace(/\.sy$/, "");
    const segments = rawPath.split("/").map((s) => s.trim()).filter(Boolean);

    // 分类：优先取倒数第二层目录或末级文档名
    let category = "思源收录";
    if (segments.length >= 2) {
        category = segments[segments.length - 1] || "思源收录";
    } else if (segments.length === 1) {
        category = segments[0] || "思源收录";
    }

    const tagsSet = new Set<string>();
    tagsSet.add("思源收录");

    // 将文档短名称作为溯源标签
    if (segments.length > 0) {
        const docName = segments[segments.length - 1];
        if (docName && docName.length <= 20 && docName !== category) {
            tagsSet.add(docName);
        }
    }

    if (entry.tags && Array.isArray(entry.tags)) {
        for (const t of entry.tags) {
            if (t && t !== "全库块" && t !== "全库笔记" && t !== "当前文档") {
                tagsSet.add(t);
            }
        }
    }

    // 智能推导推荐别名：若无别名，根据标题自动提取拼音首字母缩写
    let recommendedAlias = (entry.alias || "").trim();
    if (!recommendedAlias && entry.title) {
        try {
            const adapter = getPinyinAdapter();
            if (typeof adapter?.annotate === "function") {
                const anno = adapter.annotate({title: entry.title, alias: ""});
                if (anno && anno.pyi) {
                    recommendedAlias = anno.pyi.toLowerCase().slice(0, 8);
                }
            }
        } catch {
            recommendedAlias = "";
        }
        if (!recommendedAlias) {
            const words = entry.title.split(/[\s_-]+/).filter(Boolean);
            if (words.length >= 2 && words.every((w) => /^[a-zA-Z]/.test(w))) {
                recommendedAlias = words.map((w) => w[0]?.toLowerCase()).join("").slice(0, 8);
            }
        }
    }

    return {
        category,
        tags: Array.from(tagsSet).slice(0, 8),
        recommendedAlias,
    };
}

/** 清除思源搜索结果中的高亮 <mark> 标签并还原常见 HTML 转义字符 */
export function cleanSearchHighlight(raw: string): string {
    if (!raw) return "";
    return raw
        .replace(/<mark>/gi, "")
        .replace(/<\/mark>/gi, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

/**
 * 根据思源块类型与子类型规整 Kramdown 正文，保证在预览与插入时结构和语法着色保真
 */
export function normalizeBlockKramdown(type: string, subType: string | undefined, content: string): string {
    const trimmed = content.trim();
    if (!trimmed) return "";

    // 1. 代码块：确保包裹标准语言围栏
    if (type === "c") {
        if (/^```[\w+#.-]*\s*\n[\s\S]*\n```\s*$/.test(trimmed)) {
            return trimmed;
        }
        const lang = (subType || "").toLowerCase().trim();
        return `\`\`\`${lang}\n${trimmed}\n\`\`\``;
    }

    // 2. 标题块：若未带 # 标记，根据 subType (h1~h6) 补齐
    if (type === "h") {
        if (/^#{1,6}\s+/.test(trimmed)) {
            return trimmed;
        }
        const levelMatch = (subType || "").match(/^h([1-6])$/i);
        const level = levelMatch ? Number(levelMatch[1]) : 2;
        return `${"#".repeat(level)} ${trimmed}`;
    }

    // 3. 引述块：若未带 > 标记，自动增加引述前缀
    if (type === "b") {
        if (trimmed.startsWith(">")) return trimmed;
        return trimmed.split("\n").map((line) => `> ${line}`).join("\n");
    }

    // 4. 数学公式块
    if (type === "m") {
        if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) return trimmed;
        return `$$\n${trimmed}\n$$`;
    }

    return trimmed;
}

/** 解析思源 14 位 YYYYMMDDHHmmss 或秒/毫秒时间戳为标准毫秒时间戳 */
export function parseSiYuanTimestamp(raw: string | undefined): number {
    if (!raw) return 0;
    const str = raw.trim();
    if (/^\d{14}$/.test(str)) {
        const year = Number(str.slice(0, 4));
        const month = Number(str.slice(4, 6)) - 1;
        const day = Number(str.slice(6, 8));
        const hour = Number(str.slice(8, 10));
        const min = Number(str.slice(10, 12));
        const sec = Number(str.slice(12, 14));
        const date = new Date(year, month, day, hour, min, sec);
        return date.getTime();
    }
    const num = Number(str);
    if (Number.isFinite(num) && num > 0) {
        return num > 1e11 ? num : num * 1000;
    }
    return 0;
}

/** 将官方 fullTextSearchBlock 返回的命中块转换为小驴常用统一 SearchEntry 模型 */
export function blockHitToSearchEntry(hit: IBlockSearchHit): SearchEntry {
    const cleanContent = cleanSearchHighlight(hit.content);
    const normalizedKramdown = normalizeBlockKramdown(hit.type, hit.subType, cleanContent);
    const summary = deriveSummary(cleanContent);
    const inferredType: ItemType = inferItemType(hit.type, hit.subType || "", cleanContent);

    // 标题：若块类型为 heading (h)，直接取正文；否则若有文档路径取路径最后一段+正文前缀
    let title = "";
    if (hit.type === "h") {
        title = deriveTitle(cleanContent.replace(/^#{1,6}\s*/, ""), inferredType, {});
    } else {
        const docName = hit.hPath ? hit.hPath.split("/").pop()?.replace(/\.sy$/, "") || "" : "";
        const snippet = cleanContent.slice(0, 30).replace(/\s+/g, " ");
        title = docName ? `${docName}: ${snippet}` : deriveTitle(cleanContent, inferredType, {});
    }

    return {
        id: `xlc-omni-${hit.id}`,
        blockId: hit.id,
        libraryDocId: hit.rootId || hit.id,
        title,
        summary: summary || cleanContent.slice(0, 80),
        content: normalizedKramdown,
        isOmni: true,
        itemType: inferredType,
        category: hit.hPath || "全库内容",
        tags: ["全库块"],
        alias: "",
        createdAt: 0,
        updatedAt: parseSiYuanTimestamp(hit.updated),
        sourceDocId: hit.rootId || hit.id,
        sourceBlockId: hit.id,
        targetBlockId: hit.id,
    };
}

/** 纯函数：在给定块集合中进行关键词检索打分并返回命中的条目列表 */
export function scoreAndFilterBlocks(
    blocks: Array<{id: string; type: string; subtype?: string; kramdown: string}>,
    keyword: string,
    docId: string,
    docPath = "当前文档",
): SearchEntry[] {
    const tokens = splitSearchTokens(keyword);
    if (tokens.length === 0) return [];

    const matchedEntries: Array<{entry: SearchEntry; score: number}> = [];

    for (const b of blocks) {
        const kd = b.kramdown.trim();
        if (!kd) continue;

        const title = deriveTitle(kd, "text", {});
        const summary = deriveSummary(kd);
        const inferredType: ItemType = inferItemType(b.type, b.subtype || "", kd);

        const haystack = `${title}\n${summary}\n${kd}`.toLowerCase();
        let totalScore = 0;
        let allTokensMatch = true;

        for (const token of tokens) {
            const t = token.toLowerCase();
            const idx = haystack.indexOf(t);
            if (idx === -1) {
                allTokensMatch = false;
                break;
            }
            if (title.toLowerCase().includes(t)) {
                totalScore += 20;
            } else if (summary.toLowerCase().includes(t)) {
                totalScore += 10;
            } else {
                totalScore += 5;
            }
        }

        if (allTokensMatch && totalScore > 0) {
            const entry: SearchEntry = {
                id: `xlc-omni-${b.id}`,
                blockId: b.id,
                libraryDocId: docId,
                title,
                summary,
                content: kd,
                isOmni: true,
                itemType: inferredType,
                category: docPath,
                tags: ["当前文档"],
                alias: "",
                createdAt: 0,
                updatedAt: 0,
                sourceDocId: docId,
                sourceBlockId: b.id,
                targetBlockId: b.id,
            };
            matchedEntries.push({entry, score: totalScore});
        }
    }

    matchedEntries.sort((a, b) => b.score - a.score);
    return matchedEntries.map((m) => m.entry);
}

/** 检索当前打开文档中的块内容 */
export async function searchCurrentDocumentBlocks(
    kernel: IKernelClient,
    docId: string,
    keyword: string,
    options: OmniSearchOptions & {docPath?: string} = {},
): Promise<SearchEntry[]> {
    const k = keyword.trim();
    if (!k || !isBlockId(docId)) return [];

    const rawChildren = await kernel.request("getChildBlocks", {id: docId}, {
        latest: true,
        raceKey: "omni.currentDoc.children",
    });
    const childBlocks = parseChildBlocks(rawChildren);
    if (childBlocks.length === 0) return [];

    const limit = options.maxCurrentDocBlocks ?? 100;
    const targetBlocks = childBlocks.slice(0, limit);
    const blockIds = targetBlocks.map((b) => b.id);

    const rawKds = await kernel.request("getBlockKramdowns", {ids: blockIds}, {
        latest: true,
        raceKey: "omni.currentDoc.kramdowns",
    });
    const kdsMap = parseBatchKramdowns(rawKds);

    const blockItems = targetBlocks.map((b) => {
        const entry: {id: string; type: string; subtype?: string; kramdown: string} = {
            id: b.id,
            type: b.type,
            kramdown: kdsMap[b.id] ?? "",
        };
        if (b.subtype !== undefined) entry.subtype = b.subtype;
        return entry;
    });

    return scoreAndFilterBlocks(blockItems, k, docId, options.docPath || "当前文档");
}

/** 检索全库文档（走官方 searchDocs 端点） */
export async function searchAllNotesDocuments(
    kernel: IKernelClient,
    keyword: string,
    options: OmniSearchOptions = {},
): Promise<SearchEntry[]> {
    const k = keyword.trim();
    if (!k) return [];

    const parsed = parseOmniQueryScope(k);
    const actualQuery = parsed.keyword || k;

    const raw = await kernel.request("searchDocs", {k: actualQuery}, {
        latest: true,
        raceKey: "omni.allNotes.docs",
    });
    const hits = parseDocSearch(raw);
    const limit = options.maxAllNotesDocs ?? 30;

    return hits.slice(0, limit).map((hit) => {
        const lastSegment = hit.hPath.split("/").pop() || "";
        const title = hit.name || lastSegment.replace(/\.sy$/, "") || hit.hPath;
        const entry: SearchEntry = {
            id: `xlc-omni-${hit.id}`,
            blockId: hit.id,
            libraryDocId: hit.id,
            title,
            summary: hit.hPath,
            content: hit.hPath,
            isOmni: true,
            itemType: inferTypeFromText(hit.hPath),
            category: "全库笔记",
            tags: ["全库笔记"],
            alias: "",
            createdAt: 0,
            updatedAt: 0,
            sourceDocId: hit.id,
            sourceBlockId: hit.id,
            targetBlockId: hit.id,
        };
        return entry;
    });
}

/**
 * 纯函数：对思源全文本搜索返回的块列表进行多关键词相关度二次重排（Secondary Re-ranking · G42）
 * 标题与大纲块密集匹配优先，多词全部命中间距紧密优先，保持稳定原序。
 */
export function rerankBlockHits(hits: IBlockSearchHit[], query: string): IBlockSearchHit[] {
    const tokens = splitSearchTokens(query).map((t) => t.toLowerCase());
    if (tokens.length === 0 || hits.length <= 1) return hits;

    const scored = hits.map((hit, originalIndex) => {
        const cleanContent = cleanSearchHighlight(hit.content).toLowerCase();
        const docName = (hit.hPath || "").split("/").pop()?.replace(/\.sy$/, "").toLowerCase() || "";
        let score = 0;

        let titleMatchCount = 0;
        let contentMatchCount = 0;

        for (const t of tokens) {
            if (hit.type === "h" && cleanContent.includes(t)) {
                titleMatchCount++;
            } else if (docName.includes(t)) {
                titleMatchCount++;
            }
            if (cleanContent.includes(t)) {
                contentMatchCount++;
            }
        }

        if (titleMatchCount === tokens.length) score += 50;
        else score += titleMatchCount * 20;

        if (contentMatchCount === tokens.length) score += 30;
        else score += contentMatchCount * 10;

        // 标题块本身具有概括性权重
        if (hit.type === "h") score += 10;
        if (hit.type === "c") score += 5;

        return { hit, score, originalIndex };
    });

    scored.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
    return scored.map((s) => s.hit);
}

/** 检索全库思源内容块（走官方 fullTextSearchBlock 端点，零 SQL） */
export async function searchAllNotesBlocks(
    kernel: IKernelClient,
    keyword: string,
    options: OmniSearchOptions = {},
): Promise<SearchEntry[]> {
    const k = keyword.trim();
    if (!k) return [];

    const parsed = parseOmniQueryScope(k);
    const actualQuery = parsed.keyword || k;
    const limit = options.maxAllNotesBlocks ?? 30;

    const payload: Record<string, unknown> = {
        query: actualQuery,
        method: 0, // 0 = 关键词普通检索（零 SQL）
        orderBy: 7, // 7 = 官方内核原生相关度降序（按 FTS 相关性降序，对齐 SiYuan kernel/model/search.go）
        page: 1,
        pageSize: limit,
    };
    if (parsed.paths.length > 0) {
        payload.paths = parsed.paths;
    }
    if (parsed.notebook) {
        payload.notebook = parsed.notebook;
    }
    if (parsed.types && Object.keys(parsed.types).length > 0) {
        payload.types = parsed.types;
    }

    const raw = await kernel.request("fullTextSearchBlock", payload, {
        latest: true,
        raceKey: "omni.allNotes.blocks",
    });

    const hits = parseFullTextSearch(raw);
    const reranked = rerankBlockHits(hits, actualQuery);
    return reranked.map(blockHitToSearchEntry);
}

/** 全库统一检索：块内容优先，文档为辅 */
export async function searchAllNotesUnified(
    kernel: IKernelClient,
    keyword: string,
    options: OmniSearchOptions = {},
): Promise<SearchEntry[]> {
    const k = keyword.trim();
    if (!k) return [];

    // 并行请求块级检索与文档检索
    const [blockEntries, docEntries] = await Promise.all([
        searchAllNotesBlocks(kernel, k, options).catch(() => []),
        searchAllNotesDocuments(kernel, k, options).catch(() => []),
    ]);

    // 块结果优先，若块结果不足或有匹配文档，将文档放在块之后（且去重已存在的根文档）
    const seenBlockRoots = new Set(blockEntries.map((b) => b.sourceDocId));
    const supplementalDocs = docEntries.filter((d) => !seenBlockRoots.has(d.sourceDocId));

    return [...blockEntries, ...supplementalDocs];
}

/** 校验全域块内容更新（遵循 B-006 写前安全约束，防止多行结构损坏思源块层级） */
export function validateOmniBlockUpdate(content: string): {valid: boolean; error?: string} {
    const err = bodyWriteRestriction(content);
    if (err) {
        return {valid: false, error: err};
    }
    return {valid: true};
}

/** 纯函数安全调用思源 updateBlock 端点更新块内容 */
export async function updateDocBlock(
    kernel: IKernelClient,
    blockId: string,
    newKramdown: string,
): Promise<{success: boolean; error?: string}> {
    const validation = validateOmniBlockUpdate(newKramdown);
    if (!validation.valid) {
        return {success: false, error: validation.error};
    }
    if (!isBlockId(blockId)) {
        return {success: false, error: "invalid block ID"};
    }
    try {
        await kernel.request("updateBlock", {
            id: blockId,
            dataType: "markdown",
            data: newKramdown,
        }, {
            latest: true,
            raceKey: `omni.updateBlock.${blockId}`,
        });
        return {success: true};
    } catch (e: any) {
        return {success: false, error: e?.message || "kernel error updating block"};
    }
}

/** 全域内容搜索服务包装类 */
export class OmniSearchService {
    constructor(
        private readonly kernel: IKernelClient,
        private readonly getActiveDoc: () => {docId: string; hPath?: string} | null,
    ) {}

    async searchInCurrentDoc(keyword: string): Promise<SearchEntry[]> {
        const active = this.getActiveDoc();
        if (!active || !active.docId) return [];
        return searchCurrentDocumentBlocks(this.kernel, active.docId, keyword, {docPath: active.hPath});
    }

    async searchInAllNotes(keyword: string): Promise<SearchEntry[]> {
        return searchAllNotesUnified(this.kernel, keyword);
    }

    async searchInAllNotesDocs(keyword: string): Promise<SearchEntry[]> {
        return searchAllNotesDocuments(this.kernel, keyword);
    }

    async searchInAllNotesBlocks(keyword: string): Promise<SearchEntry[]> {
        return searchAllNotesBlocks(this.kernel, keyword);
    }

    async updateBlockContent(blockId: string, newContent: string): Promise<{success: boolean; error?: string}> {
        return updateDocBlock(this.kernel, blockId, newContent);
    }
}
