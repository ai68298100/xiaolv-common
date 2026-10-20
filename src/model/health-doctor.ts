// 常用内容库健康度与语法体检引擎（ADR 0078 / G26 / T-0137）
// 零副作用、纯函数静态诊断：检测死循环嵌套片段、缺失依赖、损坏占位符与超限结构

import {listSnippetRefs} from "./variables";
import {isSafeHttpUrl} from "./item";
import {bodyWriteRestriction} from "./kramdown";
import {PLACEHOLDER_PATTERN, resolvePlaceholder, PlaceholderKind} from "./placeholders";

export type IssueSeverity = "error" | "warning";

export type IssueType =
    | "cyclic-snippet"
    | "missing-snippet"
    | "unclosed-placeholder"
    | "malformed-placeholder"
    | "invalid-url"
    | "write-restriction";

export interface HealthIssue {
    itemId: string;
    itemTitle: string;
    severity: IssueSeverity;
    type: IssueType;
    message: string;
    details?: string;
}

export interface HealthDoctorItem {
    id: string;
    title: string;
    content: string;
    itemType?: string;
    url?: string;
}

export interface HealthDiagnosisResult {
    totalScanned: number;
    healthyCount: number;
    errorCount: number;
    warningCount: number;
    issues: HealthIssue[];
    hasErrors: boolean;
}

const NOW = new Date(2026, 9, 20, 12, 0, 0);

/** 检测嵌套片段引用是否存在死循环（有向图环路检测） */
export function detectSnippetCycles(
    items: readonly HealthDoctorItem[],
): Map<string, string[]> {
    const titleToItem = new Map<string, HealthDoctorItem>();
    for (const item of items) {
        if (item.title && item.title.trim()) {
            titleToItem.set(item.title.trim(), item);
        }
    }

    const cyclesByItemId = new Map<string, string[]>();
    const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    const callStack: string[] = [];

    function dfs(currentTitle: string): void {
        visited.set(currentTitle, 1);
        callStack.push(currentTitle);

        const currentItem = titleToItem.get(currentTitle);
        if (currentItem) {
            const references = listSnippetRefs(currentItem.content);
            for (const refTitle of references) {
                const trimmedRef = refTitle.trim();
                const state = visited.get(trimmedRef) ?? 0;
                if (state === 1) {
                    // 发现环路
                    const cycleStartIndex = callStack.indexOf(trimmedRef);
                    const cyclePath = [...callStack.slice(cycleStartIndex), trimmedRef];
                    for (const node of cyclePath.slice(0, -1)) {
                        const it = titleToItem.get(node);
                        if (it && !cyclesByItemId.has(it.id)) {
                            cyclesByItemId.set(it.id, cyclePath);
                        }
                    }
                } else if (state === 0) {
                    if (titleToItem.has(trimmedRef)) {
                        dfs(trimmedRef);
                    }
                }
            }
        }

        callStack.pop();
        visited.set(currentTitle, 2);
    }

    for (const item of items) {
        const title = item.title?.trim();
        if (title && (visited.get(title) ?? 0) === 0) {
            dfs(title);
        }
    }

    return cyclesByItemId;
}

/** 静态检查文本中是否存在未闭合或损坏的占位符 */
export function checkPlaceholderIntegrity(
    content: string,
): Array<{type: "unclosed-placeholder" | "malformed-placeholder"; details: string}> {
    const issues: Array<{type: "unclosed-placeholder" | "malformed-placeholder"; details: string}> = [];
    if (!content || !content.includes("{{xlc:")) return issues;

    // 1. 检查是否存在未闭合的 {{xlc: 标记
    // 匹配 {{xlc: 后面没有跟 }} 直至换行或文本末尾
    const unclosedMatches = content.match(/\{\{xlc:(?:(?!\}\})[^\n])*$/gm);
    if (unclosedMatches) {
        for (const unclosed of unclosedMatches) {
            // 如果内部确实没有包含 }}，记为未闭合
            if (!unclosed.includes("}}")) {
                issues.push({
                    type: "unclosed-placeholder",
                    details: unclosed.slice(0, 50),
                });
            }
        }
    }

    // 2. 检查解析失败的占位符（未知类型、非法格式、非法表达式）
    // 重置正则 index
    PLACEHOLDER_PATTERN.lastIndex = 0;
    for (const match of content.matchAll(PLACEHOLDER_PATTERN)) {
        const full = match[0];
        const rawKind = match[1]!;
        const arg = match[2];

        // ask 语法有专属变量解析器，单独验证
        if (rawKind === "ask" || rawKind.startsWith("ask:")) {
            continue;
        }

        // snippet 语法单独由缺失/循环检查负责
        if (rawKind === "snippet") {
            continue;
        }

        // 验证标准占位符解析
        const resolved = resolvePlaceholder(rawKind as PlaceholderKind, arg, NOW, {title: "示例", path: "/示例", selection: "示例选区"});
        if (resolved === null) {
            issues.push({
                type: "malformed-placeholder",
                details: full.slice(0, 60),
            });
        }
    }

    // 3. 检查空字段名的 ask 占位符 {{xlc:ask:}} 或 {{xlc:ask:|...}}
    const emptyAskMatches = content.match(/\{\{xlc:ask:(?:\|[^}]*)?\}\}/g);
    if (emptyAskMatches) {
        for (const emptyAsk of emptyAskMatches) {
            issues.push({
                type: "malformed-placeholder",
                details: emptyAsk,
            });
        }
    }

    return issues;
}

/**
 * 常用内容库健康体检核心入口（纯函数）
 * @param items 全库条目候选集
 * @returns 诊断结果与问题清单
 */
export function diagnoseLibraryHealth(
    items: readonly HealthDoctorItem[],
): HealthDiagnosisResult {
    const issues: HealthIssue[] = [];
    const availableTitles = new Set(items.map((i) => i.title?.trim()).filter(Boolean));

    // 1. 死循环片段检测
    const cycles = detectSnippetCycles(items);
    for (const [itemId, cyclePath] of cycles.entries()) {
        const item = items.find((i) => i.id === itemId);
        if (item) {
            issues.push({
                itemId: item.id,
                itemTitle: item.title,
                severity: "error",
                type: "cyclic-snippet",
                message: `嵌套片段引用存在死循环: ${cyclePath.join(" → ")}`,
                details: cyclePath.join(" → "),
            });
        }
    }

    // 2. 逐条深度检查
    for (const item of items) {
        const content = item.content ?? "";

        // 2.1 检查缺失子片段依赖
        if (content.includes("{{xlc:snippet:")) {
            const refs = listSnippetRefs(content);
            for (const ref of refs) {
                if (!availableTitles.has(ref.trim())) {
                    issues.push({
                        itemId: item.id,
                        itemTitle: item.title,
                        severity: "warning",
                        type: "missing-snippet",
                        message: `引用的子片段「${ref}」在库中不存在，插入时将降级显示标记`,
                        details: ref,
                    });
                }
            }
        }

        // 2.2 占位符完整性检查（跳过代码块条目）
        if (item.itemType !== "code") {
            const placeholderIssues = checkPlaceholderIntegrity(content);
            for (const pIssue of placeholderIssues) {
                const isError = pIssue.type === "unclosed-placeholder";
                issues.push({
                    itemId: item.id,
                    itemTitle: item.title,
                    severity: isError ? "error" : "warning",
                    type: pIssue.type,
                    message: isError ? `占位符未闭合: ${pIssue.details}` : `占位符参数格式损坏: ${pIssue.details}`,
                    details: pIssue.details,
                });
            }
        }

        // 2.3 URL 合法性与协议检查
        if (item.itemType === "url") {
            const url = item.url ?? content.trim();
            if (!url || !isSafeHttpUrl(url)) {
                issues.push({
                    itemId: item.id,
                    itemTitle: item.title,
                    severity: "error",
                    type: "invalid-url",
                    message: `URL 链接为空或使用了不安全的协议（仅允许 http/https）: ${url || "(空)"}`,
                    details: url,
                });
            }
        }

        // 2.4 B-006 多块写前防御限制预警
        if (content && item.itemType !== "code") {
            const restriction = bodyWriteRestriction(content);
            if (restriction) {
                issues.push({
                    itemId: item.id,
                    itemTitle: item.title,
                    severity: "warning",
                    type: "write-restriction",
                    message: `正文触发 B-006 多块写前受限防御（${restriction}）`,
                    details: restriction,
                });
            }
        }
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const issueItemIds = new Set(issues.map((i) => i.itemId));
    const healthyCount = Math.max(0, items.length - issueItemIds.size);

    return {
        totalScanned: items.length,
        healthyCount,
        errorCount,
        warningCount,
        issues,
        hasErrors: errorCount > 0,
    };
}
