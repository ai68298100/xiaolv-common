// 全域内容搜索终端服务（Omni-Search Terminal · G12，R270）：
// 将小驴常用提升为全局内容启动器与知识搜索终端；
// 当常用库检索无果或用户主动切域时，支持极速检索「当前打开文档」与「全库思源笔记」；
// 绝不依赖 SQL 端点，100% 走官方结构化端点（getChildBlocks / getBlockKramdowns / searchDocs）；
// 检索结果无缝复用 SearchEntry 模型，支持就地语法高亮预览、快捷插入、复制及一键收录为常用语。

import type {IKernelClient} from "../kernel/client";
import {parseChildBlocks, parseBatchKramdowns, parseDocSearch} from "../kernel/client";
import {SearchEntry, splitSearchTokens} from "../model/search";
import {deriveTitle, deriveSummary, inferItemType, isBlockId, ItemType} from "../model/item";
import {inferTypeFromText} from "../ui/capture";

export interface OmniSearchOptions {
    maxCurrentDocBlocks?: number;
    maxAllNotesDocs?: number;
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

    const raw = await kernel.request("searchDocs", {k}, {
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
        return searchAllNotesDocuments(this.kernel, keyword);
    }
}
