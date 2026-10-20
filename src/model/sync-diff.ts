// 多源内容库同步比对与冲突合并策略引擎（ADR 0085 / G33 / T-0145）
// 纯函数、无外部依赖、零副作用、遵循 LIMITS 规范

import {LIMITS} from "../constants";
import {cleanTagList, newLogicalId} from "./item";
import {mergeTags} from "./batch-ops";
import {toErrorMessage} from "./errors";

/** 参与同步比对的通用条目形态（兼容 CommonItem 与 ExportedItem） */
export interface SyncEntry {
    id: string;
    itemType: string;
    title: string;
    alias?: string;
    tags?: readonly string[];
    category?: string;
    kramdown?: string;
    url?: string;
    targetBlockId?: string;
    createdAt?: number;
    updatedAt?: number;
}

/** 单条条目的比对差异状态 */
export type DiffStatus =
    | "identical"  // 两端完全一致（元数据与正文无差异）
    | "added"      // 仅在 Remote 存在，Local 缺失
    | "removed"    // 仅在 Local 存在，Remote 缺失（镜像比对场景）
    | "modified"   // 两端 ID 相同但存在字段修改（单向推进或明确最新）
    | "conflict";  // 两端均发生独立修改或时间戳倒挂/内容不同

/** 冲突合并策略 */
export type MergeStrategy =
    | "keep-local"   // 保留本地版本，忽略远端变更
    | "keep-remote"  // 以远端版本为准，覆盖本地内容
    | "keep-both"    // 两者并存：远端项重命名/换新 ID，本地项保留
    | "latest-wins"  // 最新优先：依据 updatedAt 决胜，时间戳相同时内容哈希保序
    | "smart-merge"; // 智能合并：标签取并集，分类在本地为空时继承远端，时间戳取最新，正文按最新优先

/** 单个条目的比对明细 */
export interface ItemDiffRecord {
    id: string;
    status: DiffStatus;
    local?: SyncEntry;
    remote?: SyncEntry;
    /** 发生变动的字段名称列表（例如 ["title", "kramdown", "tags"]） */
    changedFields: string[];
    localFingerprint?: string;
    remoteFingerprint?: string;
}

/** 两库比对结果报告 */
export interface LibraryDiffReport {
    timestamp: number;
    totalLocal: number;
    totalRemote: number;
    identicalCount: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    conflictCount: number;
    diffs: ItemDiffRecord[];
}

/** 单项合并执行决策 */
export type SyncAction = "noop" | "create" | "update" | "fork" | "delete";

export interface SyncPlannedItem {
    id: string;
    action: SyncAction;
    status: DiffStatus;
    strategy: MergeStrategy;
    entry?: SyncEntry;
    /** 当 action 为 fork 时的新分配逻辑 ID */
    forkedId?: string;
    reason: string;
}

export interface SyncPlan {
    strategy: MergeStrategy;
    items: SyncPlannedItem[];
    summary: {
        total: number;
        noop: number;
        create: number;
        update: number;
        fork: number;
        delete: number;
    };
}

export interface SyncReceiptItem {
    id: string;
    action: SyncAction;
    ok: boolean;
    finalEntry?: SyncEntry;
    error?: string;
}

export interface SyncReceipt {
    appliedAt: number;
    strategy: MergeStrategy;
    total: number;
    success: number;
    failed: number;
    results: SyncReceiptItem[];
    finalEntries: SyncEntry[];
}

/**
 * 快速计算条目正文与核心元数据的指纹摘要（32位 FNV-1a 哈希）。
 * 保证跨平台一致、无随机、无外部依赖。
 */
export function computeItemFingerprint(entry: SyncEntry): string {
    const normTags = cleanTagList(entry.tags ?? []).sort().join(",");
    const payload = [
        entry.itemType || "text",
        (entry.title || "").trim(),
        (entry.alias || "").trim(),
        normTags,
        (entry.category || "").trim(),
        (entry.url || "").trim(),
        (entry.targetBlockId || "").trim(),
        (entry.kramdown || "").replace(/\r\n/g, "\n").trim(),
    ].join("§");

    let hash = 0x811c9dc5;
    for (let i = 0; i < payload.length; i++) {
        hash ^= payload.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

/** 检查两个条目的各个字段差异 */
export function detectChangedFields(local: SyncEntry, remote: SyncEntry): string[] {
    const fields: string[] = [];
    if (local.itemType !== remote.itemType) fields.push("itemType");
    if ((local.title || "").trim() !== (remote.title || "").trim()) fields.push("title");
    if ((local.alias || "").trim() !== (remote.alias || "").trim()) fields.push("alias");
    if ((local.category || "").trim() !== (remote.category || "").trim()) fields.push("category");
    if ((local.url || "").trim() !== (remote.url || "").trim()) fields.push("url");
    if ((local.targetBlockId || "").trim() !== (remote.targetBlockId || "").trim()) fields.push("targetBlockId");

    const localTags = cleanTagList(local.tags ?? []).sort().join(",");
    const remoteTags = cleanTagList(remote.tags ?? []).sort().join(",");
    if (localTags !== remoteTags) fields.push("tags");

    const localBody = (local.kramdown || "").replace(/\r\n/g, "\n").trim();
    const remoteBody = (remote.kramdown || "").replace(/\r\n/g, "\n").trim();
    if (localBody !== remoteBody) fields.push("kramdown");

    return fields;
}

export interface DiffOptions {
    /** 同步基线时间戳（若提供，两端在基线后均修改则明确标记为 conflict） */
    baselineTimestamp?: number;
    /** 容忍时间戳偏差毫秒数（默认 1000ms） */
    timestampToleranceMs?: number;
}

/**
 * 纯函数：多源内容库比对引擎
 * 对比本地条目列表与远端条目列表，输出完整的结构化差异报告
 */
export function diffLibraries(
    localEntries: readonly SyncEntry[],
    remoteEntries: readonly SyncEntry[],
    options?: DiffOptions,
): LibraryDiffReport {
    const localMap = new Map<string, SyncEntry>();
    for (const item of localEntries) {
        if (item && item.id) localMap.set(item.id, item);
    }

    const remoteMap = new Map<string, SyncEntry>();
    for (const item of remoteEntries) {
        if (item && item.id) remoteMap.set(item.id, item);
    }

    const diffs: ItemDiffRecord[] = [];
    const processedIds = new Set<string>();

    const baseline = options?.baselineTimestamp ?? 0;
    const tolerance = options?.timestampToleranceMs ?? 1000;

    // 1. 遍历远端所有条目
    for (const [id, remote] of remoteMap.entries()) {
        processedIds.add(id);
        const local = localMap.get(id);

        if (!local) {
            // 远端独有
            diffs.push({
                id,
                status: "added",
                remote,
                changedFields: ["id", "title", "kramdown"],
                remoteFingerprint: computeItemFingerprint(remote),
            });
            continue;
        }

        // 两端均有该 ID，对比指纹与具体字段
        const localFp = computeItemFingerprint(local);
        const remoteFp = computeItemFingerprint(remote);
        const changedFields = detectChangedFields(local, remote);

        if (localFp === remoteFp && changedFields.length === 0) {
            diffs.push({
                id,
                status: "identical",
                local,
                remote,
                changedFields: [],
                localFingerprint: localFp,
                remoteFingerprint: remoteFp,
            });
            continue;
        }

        // 存在内容/元数据差异，判定是单向修改还是冲突
        const localTime = Number(local.updatedAt) || 0;
        const remoteTime = Number(remote.updatedAt) || 0;

        let isConflict = false;
        if (baseline > 0) {
            // 有明确同步基线：若两端均在基线之后发生了更新，且指纹不一致，则定为冲突
            if (localTime > baseline && remoteTime > baseline) {
                isConflict = true;
            }
        } else {
            // 无基线：两端时间戳差距在容忍度以内但内容不同，或者远端比本地旧但内容不同
            const timeDiff = Math.abs(localTime - remoteTime);
            if (timeDiff <= tolerance) {
                isConflict = true;
            }
        }

        diffs.push({
            id,
            status: isConflict ? "conflict" : "modified",
            local,
            remote,
            changedFields,
            localFingerprint: localFp,
            remoteFingerprint: remoteFp,
        });
    }

    // 2. 遍历本地存在但远端缺失的条目
    for (const [id, local] of localMap.entries()) {
        if (processedIds.has(id)) continue;
        diffs.push({
            id,
            status: "removed",
            local,
            changedFields: ["id", "title", "kramdown"],
            localFingerprint: computeItemFingerprint(local),
        });
    }

    // 统计计数
    let identicalCount = 0;
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;
    let conflictCount = 0;

    for (const d of diffs) {
        switch (d.status) {
            case "identical":
                identicalCount++;
                break;
            case "added":
                addedCount++;
                break;
            case "removed":
                removedCount++;
                break;
            case "modified":
                modifiedCount++;
                break;
            case "conflict":
                conflictCount++;
                break;
        }
    }

    return {
        timestamp: Date.now(),
        totalLocal: localMap.size,
        totalRemote: remoteMap.size,
        identicalCount,
        addedCount,
        removedCount,
        modifiedCount,
        conflictCount,
        diffs,
    };
}

export interface PlanOptions {
    /** 是否对本地多余项执行镜像删除（默认 false，即单向同步只增改不删减本地） */
    mirrorDelete?: boolean;
    /** 生成 fork 副本时的随机数发生器 */
    random?: () => number;
}

/**
 * 纯函数：根据差异报告与冲突合并策略，生成确定性的合并计划
 */
export function planLibrarySync(
    report: LibraryDiffReport,
    strategy: MergeStrategy,
    options?: PlanOptions,
): SyncPlan {
    const items: SyncPlannedItem[] = [];
    const rand = options?.random ?? Math.random;

    for (const diff of report.diffs) {
        if (diff.status === "identical") {
            items.push({
                id: diff.id,
                action: "noop",
                status: diff.status,
                strategy,
                entry: diff.local,
                reason: "两端内容完全一致，无需操作",
            });
            continue;
        }

        if (diff.status === "added") {
            // 远端新增条目：无论何种策略均应拉入
            items.push({
                id: diff.id,
                action: "create",
                status: diff.status,
                strategy,
                entry: diff.remote,
                reason: "远端新增条目，合入本地",
            });
            continue;
        }

        if (diff.status === "removed") {
            if (options?.mirrorDelete) {
                items.push({
                    id: diff.id,
                    action: "delete",
                    status: diff.status,
                    strategy,
                    entry: diff.local,
                    reason: "远端已无此项，镜像删除本地副本",
                });
            } else {
                items.push({
                    id: diff.id,
                    action: "noop",
                    status: diff.status,
                    strategy,
                    entry: diff.local,
                    reason: "远端无对应项，本地保留既有内容",
                });
            }
            continue;
        }

        // 处理 modified 与 conflict
        if (diff.status === "modified" || diff.status === "conflict") {
            const local = diff.local!;
            const remote = diff.remote!;

            switch (strategy) {
                case "keep-local":
                    items.push({
                        id: diff.id,
                        action: "noop",
                        status: diff.status,
                        strategy,
                        entry: local,
                        reason: "策略指定保留本地版本",
                    });
                    break;

                case "keep-remote":
                    items.push({
                        id: diff.id,
                        action: "update",
                        status: diff.status,
                        strategy,
                        entry: remote,
                        reason: "策略指定以远端版本覆盖本地",
                    });
                    break;

                case "keep-both": {
                    const forkedId = newLogicalId(Date.now(), rand);
                    const forkedTitle = ((remote.title || "").slice(0, LIMITS.title - 6) + " (同步副本)").trim();
                    const forkedEntry: SyncEntry = {
                        ...remote,
                        id: forkedId,
                        title: forkedTitle,
                    };
                    items.push({
                        id: diff.id,
                        action: "fork",
                        status: diff.status,
                        strategy,
                        entry: forkedEntry,
                        forkedId,
                        reason: "策略指定两者并存，为远端版本分配新 ID",
                    });
                    break;
                }

                case "latest-wins": {
                    const localTime = Number(local.updatedAt) || 0;
                    const remoteTime = Number(remote.updatedAt) || 0;
                    if (remoteTime > localTime) {
                        items.push({
                            id: diff.id,
                            action: "update",
                            status: diff.status,
                            strategy,
                            entry: remote,
                            reason: `远端更新时间较新 (${remoteTime} > ${localTime})，执行覆盖`,
                        });
                    } else if (localTime > remoteTime) {
                        items.push({
                            id: diff.id,
                            action: "noop",
                            status: diff.status,
                            strategy,
                            entry: local,
                            reason: `本地更新时间较新 (${localTime} > ${remoteTime})，保留本地`,
                        });
                    } else {
                        // 时间戳完全相同，用哈希比较保序
                        const lFp = diff.localFingerprint || "";
                        const rFp = diff.remoteFingerprint || "";
                        if (rFp > lFp) {
                            items.push({
                                id: diff.id,
                                action: "update",
                                status: diff.status,
                                strategy,
                                entry: remote,
                                reason: "更新时间戳相同，根据内容指纹规则胜出远端",
                            });
                        } else {
                            items.push({
                                id: diff.id,
                                action: "noop",
                                status: diff.status,
                                strategy,
                                entry: local,
                                reason: "更新时间戳相同，根据内容指纹规则保留本地",
                            });
                        }
                    }
                    break;
                }

                case "smart-merge": {
                    // 智能合并元数据与正文
                    const localTime = Number(local.updatedAt) || 0;
                    const remoteTime = Number(remote.updatedAt) || 0;
                    const remoteIsNewer = remoteTime >= localTime;

                    const mergedTags = mergeTags(local.tags ?? [], remote.tags ?? []);
                    const mergedCategory = (local.category || "").trim() || (remote.category || "").trim();
                    const chosenBody = remoteIsNewer ? remote.kramdown : local.kramdown;
                    const chosenTitle = remoteIsNewer ? remote.title : local.title;
                    const chosenAlias = remoteIsNewer ? remote.alias : local.alias;

                    const mergedEntry: SyncEntry = {
                        ...(remoteIsNewer ? remote : local),
                        id: diff.id,
                        title: chosenTitle || local.title,
                        alias: chosenAlias ?? local.alias,
                        tags: mergedTags,
                        category: mergedCategory,
                        kramdown: chosenBody ?? local.kramdown,
                        updatedAt: Math.max(localTime, remoteTime, Date.now()),
                    };

                    items.push({
                        id: diff.id,
                        action: "update",
                        status: diff.status,
                        strategy,
                        entry: mergedEntry,
                        reason: "智能合并：标签取并集、分类补充继承、更新取最新",
                    });
                    break;
                }
            }
        }
    }

    const summary = {
        total: items.length,
        noop: items.filter((x) => x.action === "noop").length,
        create: items.filter((x) => x.action === "create").length,
        update: items.filter((x) => x.action === "update").length,
        fork: items.filter((x) => x.action === "fork").length,
        delete: items.filter((x) => x.action === "delete").length,
    };

    return {
        strategy,
        items,
        summary,
    };
}

/**
 * 纯函数：在内存中模拟应用同步合并计划，产出合并后的条目全集与执行回执。
 * 不产生任何实际物理写入，用于计划执行或脱机回放。
 */
export function executeSyncMerge(
    localEntries: readonly SyncEntry[],
    plan: SyncPlan,
): SyncReceipt {
    const entryMap = new Map<string, SyncEntry>();
    for (const e of localEntries) {
        if (e && e.id) entryMap.set(e.id, {...e});
    }

    const results: SyncReceiptItem[] = [];
    let success = 0;
    let failed = 0;

    for (const item of plan.items) {
        try {
            switch (item.action) {
                case "noop":
                    results.push({
                        id: item.id,
                        action: "noop",
                        ok: true,
                        finalEntry: entryMap.get(item.id),
                    });
                    success++;
                    break;

                case "create":
                    if (!item.entry) {
                        throw new Error("缺少新增条目载荷");
                    }
                    entryMap.set(item.id, {...item.entry});
                    results.push({
                        id: item.id,
                        action: "create",
                        ok: true,
                        finalEntry: {...item.entry},
                    });
                    success++;
                    break;

                case "update":
                    if (!item.entry) {
                        throw new Error("缺少更新条目载荷");
                    }
                    entryMap.set(item.id, {...item.entry});
                    results.push({
                        id: item.id,
                        action: "update",
                        ok: true,
                        finalEntry: {...item.entry},
                    });
                    success++;
                    break;

                case "fork":
                    if (!item.entry || !item.forkedId) {
                        throw new Error("缺少 fork 条目或分配的 ID");
                    }
                    entryMap.set(item.forkedId, {...item.entry});
                    results.push({
                        id: item.id,
                        action: "fork",
                        ok: true,
                        finalEntry: {...item.entry},
                    });
                    success++;
                    break;

                case "delete":
                    entryMap.delete(item.id);
                    results.push({
                        id: item.id,
                        action: "delete",
                        ok: true,
                    });
                    success++;
                    break;
            }
        } catch (err) {
            failed++;
            results.push({
                id: item.id,
                action: item.action,
                ok: false,
                error: toErrorMessage(err, "执行失败"),
            });
        }
    }

    return {
        appliedAt: Date.now(),
        strategy: plan.strategy,
        total: plan.items.length,
        success,
        failed,
        results,
        finalEntries: Array.from(entryMap.values()),
    };
}
