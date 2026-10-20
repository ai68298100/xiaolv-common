// 常用语使用热力透视与时间节省计算引擎（ADR 0081 / G28 / T-0140）
// 纯函数、零副作用、纯本地计算：量化使用收益与活跃频度

import {UsageEntry} from "./storage";

export interface UsageItemMeta {
    id: string;
    title: string;
    contentLength?: number;
}

export interface UsageInsightItem {
    id: string;
    title: string;
    count: number;
    lastAt: number;
    savedKeystrokes: number;
}

export interface UsageInsightsResult {
    /** 累计总调用次数 */
    totalCalls: number;
    /** 累计节省击键数 */
    totalSavedKeystrokes: number;
    /** 估算节省打字时间（分钟） */
    estimatedMinutesSaved: number;
    /** 格式化节省时间可读文案，如 "15 分钟"、"2.4 小时" */
    formattedTimeSaved: string;
    /** 最近 7 天内活跃使用的条目数 */
    activeItems7Days: number;
    /** Top 5 最常使用条目 */
    topItems: UsageInsightItem[];
}

/** 键盘人均输入速度常数：每分钟约 200 字符（约 40 词） */
export const TYPING_CPM = 200;

/** 呼出弹窗与检索的按键成本（快捷键 + 3 字符检索 + 回车） */
export const INVOKE_OVERHEAD_KEYSTROKES = 6;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** 格式化分钟为人类易读的时间字符串 */
export function formatSavedTime(minutes: number): string {
    if (minutes < 1) {
        return "< 1 分钟";
    }
    if (minutes < 60) {
        return `${Math.round(minutes)} 分钟`;
    }
    const hours = (minutes / 60).toFixed(1);
    return `${hours.endsWith(".0") ? hours.slice(0, -2) : hours} 小时`;
}

/**
 * 纯函数：计算常用语使用热力透视指标与工时节约估算
 * @param usage 侧车使用字典
 * @param items 条目元数据列表（提供条目正文长度估算击键量）
 * @param now 当前时间戳（ms）
 */
export function calculateUsageInsights(
    usage: Readonly<Record<string, UsageEntry>>,
    items: readonly UsageItemMeta[],
    now: number,
): UsageInsightsResult {
    let totalCalls = 0;
    let totalSavedKeystrokes = 0;
    let activeItems7Days = 0;

    const itemMap = new Map<string, UsageItemMeta>();
    for (const item of items) {
        itemMap.set(item.id, item);
    }

    const insightItems: UsageInsightItem[] = [];

    for (const [id, entry] of Object.entries(usage ?? {})) {
        if (!Number.isInteger(entry.count) || entry.count <= 0) continue;
        const count = entry.count;
        const lastAt = Number(entry.lastAt) || 0;
        totalCalls += count;

        if (now - lastAt <= SEVEN_DAYS_MS) {
            activeItems7Days++;
        }

        const meta = itemMap.get(id);
        const title = meta?.title || id;
        // 若未提供正文长度，默认保底估算为 25 字符（短常用语平均长度）
        const len = typeof meta?.contentLength === "number" && meta.contentLength > 0 ? meta.contentLength : 25;
        const perCallSaved = Math.max(0, len - INVOKE_OVERHEAD_KEYSTROKES);
        const savedKeystrokes = perCallSaved * count;
        totalSavedKeystrokes += savedKeystrokes;

        insightItems.push({
            id,
            title,
            count,
            lastAt,
            savedKeystrokes,
        });
    }

    insightItems.sort((a, b) => b.count - a.count);
    const topItems = insightItems.slice(0, 5);

    const estimatedMinutesSaved = Math.round((totalSavedKeystrokes / TYPING_CPM) * 10) / 10;
    const formattedTimeSaved = formatSavedTime(estimatedMinutesSaved);

    return {
        totalCalls,
        totalSavedKeystrokes,
        estimatedMinutesSaved,
        formattedTimeSaved,
        activeItems7Days,
        topItems,
    };
}
