// 多源内容库同步比对与冲突合并策略可视化模态框（ADR 0085 / G33 / T-0145）
// 支持桌面端 DOM 渲染与 Headless / Node 测试环境

import {
    LibraryDiffReport,
    MergeStrategy,
    SyncPlan,
    SyncReceipt,
    SyncPlannedItem,
    SyncEntry,
    planLibrarySync,
    executeSyncMerge,
} from "../model/sync-diff";
import {escapeHtml} from "../model/clipboard";

export interface SyncDiffModalProps {
    report: LibraryDiffReport;
    localEntries?: readonly SyncEntry[];
    initialStrategy?: MergeStrategy;
    mirrorDelete?: boolean;
    title?: string;
    onConfirm?: (receipt: SyncReceipt, plan: SyncPlan) => void | Promise<void>;
    onCancel?: () => void;
    localLabel?: string;
    remoteLabel?: string;
}

export interface SyncDiffModalInstance {
    element: HTMLElement | any;
    getCurrentStrategy: () => MergeStrategy;
    setStrategy: (strategy: MergeStrategy) => void;
    getStatusFilter?: () => string | null;
    setStatusFilter?: (status: string | null) => void;
    getCurrentPlan: () => SyncPlan;
    applySync: () => Promise<SyncReceipt>;
    close: () => void;
}

// 供 Node 测试使用的 MockElement 结构
class MockElement {
    tagName: string;
    className = "";
    classList = {
        classes: new Set<string>(),
        add: (...cls: string[]) => {
            cls.forEach((c) => this.classList.classes.add(c));
            this.className = Array.from(this.classList.classes).join(" ");
        },
        remove: (...cls: string[]) => {
            cls.forEach((c) => this.classList.classes.delete(c));
            this.className = Array.from(this.classList.classes).join(" ");
        },
        contains: (c: string) => this.classList.classes.has(c),
    };
    innerHTML = "";
    value = "";
    checked = false;
    disabled = false;
    children: MockElement[] = [];
    private listeners: Record<string, ((...args: any[]) => void)[]> = {};

    constructor(tagName: string) {
        this.tagName = tagName.toLowerCase();
    }

    addEventListener(event: string, fn: (...args: any[]) => void) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }

    dispatchEvent(event: {type: string}) {
        const list = this.listeners[event.type] || [];
        for (const fn of list) {
            fn(event);
        }
    }

    click() {
        this.dispatchEvent({type: "click"});
    }

    querySelector(selector: string): MockElement | null {
        return this.findChild(selector);
    }

    querySelectorAll(selector: string): MockElement[] {
        const results: MockElement[] = [];
        this.collectChildren(selector, results);
        return results;
    }

    private findChild(selector: string): MockElement | null {
        for (const child of this.children) {
            if (this.matchSelector(child, selector)) return child;
            const sub = child.findChild(selector);
            if (sub) return sub;
        }
        return null;
    }

    private collectChildren(selector: string, acc: MockElement[]) {
        for (const child of this.children) {
            if (this.matchSelector(child, selector)) acc.push(child);
            child.collectChildren(selector, acc);
        }
    }

    private matchSelector(el: MockElement, selector: string): boolean {
        if (selector.startsWith(".")) {
            return el.classList.contains(selector.slice(1));
        }
        if (selector.startsWith("#")) {
            return false;
        }
        return el.tagName === selector.toLowerCase();
    }
}

/** 格式化状态中文描述与颜色类 */
function getStatusMeta(status: string): {text: string; cls: string} {
    switch (status) {
        case "identical":
            return {text: "完全一致", cls: "xlc-status-identical"};
        case "added":
            return {text: "远端新增", cls: "xlc-status-added"};
        case "modified":
            return {text: "字段变动", cls: "xlc-status-modified"};
        case "conflict":
            return {text: "冲突待解", cls: "xlc-status-conflict"};
        case "removed":
            return {text: "远端缺失", cls: "xlc-status-removed"};
        default:
            return {text: status, cls: ""};
    }
}

/** 格式化动作中文描述与颜色类 */
function getActionMeta(action: string): {text: string; cls: string} {
    switch (action) {
        case "create":
            return {text: "合入新增", cls: "xlc-action-create"};
        case "update":
            return {text: "更新内容", cls: "xlc-action-update"};
        case "fork":
            return {text: "并存副本", cls: "xlc-action-fork"};
        case "delete":
            return {text: "镜像删除", cls: "xlc-action-delete"};
        case "noop":
            return {text: "保持原样", cls: "xlc-action-noop"};
        default:
            return {text: action, cls: ""};
    }
}

/** 策略说明文案 */
export const STRATEGY_DESCRIPTIONS: Record<MergeStrategy, string> = {
    "smart-merge": "智能合并：正文与标题以最新为准，标签取并集，分类补充继承（推荐）。",
    "latest-wins": "最新优先：基于 updatedAt 时间戳决胜，较新一方完全覆盖旧方。",
    "keep-both": "两者并存：保留本地版本，远端版本生成独立新 ID 并追加 (同步副本) 后缀并存。",
    "keep-remote": "远端为准：无论时间早晚，无条件以远端内容覆盖本地内容。",
    "keep-local": "本地为准：忽略远端的所有变动与冲突，完整保持本地版本不动。",
};

/**
 * 弹出多源内容库同步比对与冲突合并策略模态框
 */
export function openSyncDiffModal(props: SyncDiffModalProps): SyncDiffModalInstance {
    let currentStrategy: MergeStrategy = props.initialStrategy ?? "smart-merge";
    let mirrorDelete = props.mirrorDelete ?? false;
    let currentStatusFilter: string | null = null;
    let searchKeyword = "";

    // 计算当前合并计划
    let currentPlan = planLibrarySync(props.report, currentStrategy, {mirrorDelete});

    const isBrowser = typeof document !== "undefined" && typeof document.createElement === "function";

    // 渲染骨架
    const renderSummaryHeaderHtml = (report: LibraryDiffReport, activeFilter?: string | null): string => {
        const isAct = (s: string | null) => (activeFilter === s ? "xlc-summary-card--active" : "");
        return `
            <div class="xlc-sync-summary-cards">
                <div class="xlc-summary-card ${isAct(null)}" data-status="" role="button" tabindex="0" title="点击查看全部明细">
                    <span class="xlc-card-label">总计对比</span>
                    <span class="xlc-card-value">${report.totalLocal} / ${report.totalRemote}</span>
                </div>
                <div class="xlc-summary-card xlc-card-identical ${isAct("identical")}" data-status="identical" role="button" tabindex="0" title="点击仅筛选一致项">
                    <span class="xlc-card-label">一致项</span>
                    <span class="xlc-card-value">${report.identicalCount}</span>
                </div>
                <div class="xlc-summary-card xlc-card-added ${isAct("added")}" data-status="added" role="button" tabindex="0" title="点击仅筛选远端新增">
                    <span class="xlc-card-label">远端新增</span>
                    <span class="xlc-card-value">${report.addedCount}</span>
                </div>
                <div class="xlc-summary-card xlc-card-modified ${isAct("modified")}" data-status="modified" role="button" tabindex="0" title="点击仅筛选字段变动">
                    <span class="xlc-card-label">字段变动</span>
                    <span class="xlc-card-value">${report.modifiedCount}</span>
                </div>
                <div class="xlc-summary-card xlc-card-conflict ${isAct("conflict")}" data-status="conflict" role="button" tabindex="0" title="点击仅筛选冲突项">
                    <span class="xlc-card-label">冲突待解</span>
                    <span class="xlc-card-value">${report.conflictCount}</span>
                </div>
                <div class="xlc-summary-card xlc-card-removed ${isAct("removed")}" data-status="removed" role="button" tabindex="0" title="点击仅筛选远端缺失">
                    <span class="xlc-card-label">远端缺失</span>
                    <span class="xlc-card-value">${report.removedCount}</span>
                </div>
            </div>
        `;
    };

    const renderStrategySelectorHtml = (): string => {
        const strategies: MergeStrategy[] = ["smart-merge", "latest-wins", "keep-both", "keep-remote", "keep-local"];
        const optionsHtml = strategies
            .map(
                (s) =>
                    `<option value="${s}" ${s === currentStrategy ? "selected" : ""}>${s}: ${STRATEGY_DESCRIPTIONS[s].split("：")[0]}</option>`,
            )
            .join("");

        return `
            <div class="xlc-sync-diff-controls b3-dialog__content">
                <div class="xlc-sync-strategy-row">
                    <label class="xlc-field-label">合并冲突策略：</label>
                    <select class="b3-select xlc-sync-strategy-select">
                        ${optionsHtml}
                    </select>
                    <label class="b3-label xlc-mirror-checkbox-label" title="若勾选，远端已不存在的条目将在本地删除">
                        <input type="checkbox" class="b3-switch xlc-mirror-checkbox" ${mirrorDelete ? "checked" : ""} />
                        镜像删除本地多余项
                    </label>
                    <input type="text" class="b3-text-field xlc-diff-search-input" placeholder="🔍 快速过滤标题或 ID..." value="${escapeHtml(searchKeyword)}" style="flex:1; min-width:140px; height:28px; font-size:12px;" />
                </div>
                <div class="b3-label__text xlc-strategy-hint">
                    ${escapeHtml(STRATEGY_DESCRIPTIONS[currentStrategy])}
                </div>
            </div>
        `;
    };

    const renderDiffRowsHtml = (report: LibraryDiffReport, plan: SyncPlan, activeFilter?: string | null, keyword?: string): string => {
        const actionMap = new Map<string, SyncPlannedItem>();
        for (const item of plan.items) {
            actionMap.set(item.id, item);
        }

        const cleanKw = (keyword ?? "").trim().toLowerCase();
        let candidateDiffs = activeFilter
            ? report.diffs.filter((d) => d.status === activeFilter)
            : report.diffs;

        if (cleanKw) {
            candidateDiffs = candidateDiffs.filter((d) => {
                const target = d.remote || d.local;
                const title = (target?.title || "").toLowerCase();
                const id = d.id.toLowerCase();
                return title.includes(cleanKw) || id.includes(cleanKw);
            });
        }

        if (candidateDiffs.length === 0) {
            return `<tr><td colspan="5" class="xlc-empty-diff">${activeFilter || cleanKw ? "当前筛选下无匹配项（点击上方卡片或清空搜索可重置）。" : "两端内容库完全一致，无任何变动项。"}</td></tr>`;
        }

        return candidateDiffs
            .map((diff) => {
                const target = diff.remote || diff.local;
                const title = escapeHtml(target?.title || "未命名条目");
                const itemType = escapeHtml(target?.itemType || "text");
                const statusMeta = getStatusMeta(diff.status);
                const planned = actionMap.get(diff.id);
                const actionMeta = getActionMeta(planned?.action || "noop");
                const fields = diff.changedFields.length > 0 ? diff.changedFields.map((f) => `<span class="xlc-field-badge">${escapeHtml(f)}</span>`).join(" ") : "-";

                return `
                    <tr class="xlc-diff-row" data-id="${escapeHtml(diff.id)}" data-status="${diff.status}">
                        <td class="xlc-col-type"><span class="xlc-type-badge">${itemType}</span></td>
                        <td class="xlc-col-title">
                            <div class="xlc-item-title" title="${title}">${title}</div>
                            <div class="xlc-item-id">${escapeHtml(diff.id)}</div>
                        </td>
                        <td class="xlc-col-status">
                            <span class="xlc-status-badge ${statusMeta.cls}">${statusMeta.text}</span>
                        </td>
                        <td class="xlc-col-fields">${fields}</td>
                        <td class="xlc-col-action">
                            <span class="xlc-action-badge ${actionMeta.cls}">${actionMeta.text}</span>
                        </td>
                    </tr>
                `;
            })
            .join("");
    };

    const renderTableHtml = (report: LibraryDiffReport, plan: SyncPlan): string => {
        return `
            <div class="xlc-sync-diff-table-container">
                <table class="xlc-sync-diff-table">
                    <thead>
                        <tr>
                            <th style="width: 70px;">类型</th>
                            <th>条目标题 / ID</th>
                            <th style="width: 90px;">比对状态</th>
                            <th style="width: 140px;">变动字段</th>
                            <th style="width: 100px;">预计动作</th>
                        </tr>
                    </thead>
                    <tbody class="xlc-sync-diff-tbody">
                        ${renderDiffRowsHtml(report, plan)}
                    </tbody>
                </table>
            </div>
        `;
    };

    const renderFooterHtml = (plan: SyncPlan): string => {
        const actionableCount = plan.summary.create + plan.summary.update + plan.summary.fork + plan.summary.delete;
        return `
            <div class="b3-dialog__action">
                <span class="xlc-plan-stat-hint">
                    预计变动：新增 ${plan.summary.create} · 更新 ${plan.summary.update} · 副本 ${plan.summary.fork} · 删除 ${plan.summary.delete} · 不变 ${plan.summary.noop}
                </span>
                <button class="b3-button b3-button--cancel">取消</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--text b3-button--primary xlc-btn-confirm">
                    确认执行合并 (${actionableCount} 项)
                </button>
            </div>
        `;
    };

    const titleText = props.title || "多源内容库同步与冲突合并比对";

    const fullHtml = `
        <div class="b3-dialog__header">
            <div class="b3-dialog__title">${escapeHtml(titleText)}</div>
        </div>
        ${renderSummaryHeaderHtml(props.report)}
        ${renderStrategySelectorHtml()}
        ${renderTableHtml(props.report, currentPlan)}
        ${renderFooterHtml(currentPlan)}
    `;

    // 执行合并的方法
    const performApply = async (): Promise<SyncReceipt> => {
        const baseEntries = props.localEntries || props.report.diffs.map((d) => d.local).filter((e): e is SyncEntry => Boolean(e));
        const receipt = executeSyncMerge(baseEntries, currentPlan);
        if (props.onConfirm) {
            await props.onConfirm(receipt, currentPlan);
        }
        return receipt;
    };

    if (isBrowser) {
        const container = document.createElement("div");
        container.className = "b3-dialog__container xlc-sync-diff-modal";
        container.innerHTML = fullHtml;

        const updateView = () => {
            currentPlan = planLibrarySync(props.report, currentStrategy, {mirrorDelete});

            const hintEl = container.querySelector(".xlc-strategy-hint");
            if (hintEl) {
                hintEl.textContent = STRATEGY_DESCRIPTIONS[currentStrategy];
            }

            const tbody = container.querySelector(".xlc-sync-diff-tbody");
            if (tbody) {
                tbody.innerHTML = renderDiffRowsHtml(props.report, currentPlan, currentStatusFilter, searchKeyword);
            }

            const statHint = container.querySelector(".xlc-plan-stat-hint");
            if (statHint) {
                statHint.textContent = `预计变动：新增 ${currentPlan.summary.create} · 更新 ${currentPlan.summary.update} · 副本 ${currentPlan.summary.fork} · 删除 ${currentPlan.summary.delete} · 不变 ${currentPlan.summary.noop}`;
            }

            const confirmBtn = container.querySelector(".xlc-btn-confirm") as HTMLButtonElement | null;
            if (confirmBtn) {
                const actionableCount =
                    currentPlan.summary.create +
                    currentPlan.summary.update +
                    currentPlan.summary.fork +
                    currentPlan.summary.delete;
                confirmBtn.textContent = `确认执行合并 (${actionableCount} 项)`;
            }
        };

        // 绑定状态卡片点击筛选事件（G45）
        const cards = container.querySelectorAll<HTMLElement>(".xlc-summary-card");
        cards.forEach((card) => {
            card.addEventListener("click", () => {
                const status = card.dataset.status || null;
                currentStatusFilter = currentStatusFilter === status ? null : status;
                cards.forEach((c) => {
                    const cStat = c.dataset.status || null;
                    c.classList.toggle("xlc-summary-card--active", cStat === currentStatusFilter);
                });
                updateView();
            });
        });

        const strategySelect = container.querySelector(".xlc-sync-strategy-select") as HTMLSelectElement | null;
        strategySelect?.addEventListener("change", () => {
            currentStrategy = (strategySelect.value as MergeStrategy) || "smart-merge";
            updateView();
        });

        const mirrorCheck = container.querySelector(".xlc-mirror-checkbox") as HTMLInputElement | null;
        mirrorCheck?.addEventListener("change", () => {
            mirrorDelete = mirrorCheck.checked;
            updateView();
        });

        const searchInput = container.querySelector(".xlc-diff-search-input") as HTMLInputElement | null;
        searchInput?.addEventListener("input", () => {
            searchKeyword = searchInput.value;
            updateView();
        });

        const cancelBtn = container.querySelector(".b3-button--cancel");
        cancelBtn?.addEventListener("click", () => {
            props.onCancel?.();
        });

        const confirmBtn = container.querySelector(".xlc-btn-confirm");
        confirmBtn?.addEventListener("click", async () => {
            await performApply();
        });

        return {
            element: container,
            getCurrentStrategy: () => currentStrategy,
            setStrategy: (strategy: MergeStrategy) => {
                currentStrategy = strategy;
                if (strategySelect) strategySelect.value = strategy;
                updateView();
            },
            getStatusFilter: () => currentStatusFilter,
            setStatusFilter: (status: string | null) => {
                currentStatusFilter = status;
                cards.forEach((c) => {
                    const cStat = c.dataset.status || null;
                    c.classList.toggle("xlc-summary-card--active", cStat === currentStatusFilter);
                });
                updateView();
            },
            getCurrentPlan: () => currentPlan,
            applySync: performApply,
            close: () => {
                props.onCancel?.();
            },
        };
    }

    // Node / Headless MockElement 环境
    const mockContainer = new MockElement("div");
    mockContainer.classList.add("b3-dialog__container", "xlc-sync-diff-modal");
    mockContainer.innerHTML = fullHtml;

    const strategySelect = new MockElement("select");
    strategySelect.classList.add("b3-select", "xlc-sync-strategy-select");
    strategySelect.value = currentStrategy;
    mockContainer.children.push(strategySelect);

    const mirrorCheck = new MockElement("input");
    mirrorCheck.classList.add("b3-switch", "xlc-mirror-checkbox");
    mirrorCheck.checked = mirrorDelete;
    mockContainer.children.push(mirrorCheck);

    const cancelBtn = new MockElement("button");
    cancelBtn.classList.add("b3-button", "b3-button--cancel");
    cancelBtn.addEventListener("click", () => {
        props.onCancel?.();
    });
    mockContainer.children.push(cancelBtn);

    const confirmBtn = new MockElement("button");
    confirmBtn.classList.add("b3-button", "b3-button--primary", "xlc-btn-confirm");
    confirmBtn.addEventListener("click", async () => {
        await performApply();
    });
    mockContainer.children.push(confirmBtn);

    const updateMock = () => {
        currentPlan = planLibrarySync(props.report, currentStrategy, {mirrorDelete});
    };

    strategySelect.addEventListener("change", (e: any) => {
        if (e && e.target && e.target.value) {
            currentStrategy = e.target.value as MergeStrategy;
        } else if (strategySelect.value) {
            currentStrategy = strategySelect.value as MergeStrategy;
        }
        updateMock();
    });

    mirrorCheck.addEventListener("change", () => {
        mirrorDelete = mirrorCheck.checked;
        updateMock();
    });

    return {
        element: mockContainer,
        getCurrentStrategy: () => currentStrategy,
        setStrategy: (strategy: MergeStrategy) => {
            currentStrategy = strategy;
            strategySelect.value = strategy;
            updateMock();
        },
        getStatusFilter: () => currentStatusFilter,
        setStatusFilter: (status: string | null) => {
            currentStatusFilter = status;
            updateMock();
        },
        getCurrentPlan: () => currentPlan,
        applySync: performApply,
        close: () => {
            props.onCancel?.();
        },
    };
}
