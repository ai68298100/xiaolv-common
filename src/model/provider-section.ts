// provider 虚拟条目模型（xiaolv-common/v1）：提供方 runtime.search 的结果在弹窗中的呈现契约。
// 硬边界：虚拟条目绝不进入执行器（executor 只接受锚定真实块的 xlc-* 逻辑 ID），
// 因此虚拟 ID 使用 pv: 命名空间，并保证永不与 xlc- 逻辑 ID 模式冲突（门禁锁定）。

export interface ProviderHit {
    providerId: string;
    providerName: string;
    title: string;
    payload: string;
}

export interface ProviderRow {
    virtualId: string;
    providerId: string;
    providerName: string;
    title: string;
    payload: string;
}

export const PROVIDER_ID_PATTERN = /^pv:[A-Za-z0-9_-]+:\d+$/;

/**
 * 提供方候选 → 弹窗行。每行带 pv: 虚拟 ID（含提供方与序号，稳定可追）。
 * 数量上限 20/提供方（UI 有界）；payload 截断 2000 字符（防超长注入）。
 */
export function buildProviderRows(hits: readonly ProviderHit[]): ProviderRow[] {
    if (!Array.isArray(hits)) return [];
    const counters = new Map<string, number>();
    const rows: ProviderRow[] = [];
    for (const hit of hits) {
        if (!hit || typeof hit.providerId !== "string" || !hit.providerId) continue;
        if (typeof hit.payload !== "string" || !hit.payload.trim()) continue;
        const n = (counters.get(hit.providerId) ?? 0) + 1;
        counters.set(hit.providerId, n);
        if (n > 20) break;
        rows.push({
            virtualId: `pv:${hit.providerId.replace(/[^A-Za-z0-9_-]/g, "_")}:${n}`,
            providerId: hit.providerId,
            providerName: hit.providerName || hit.providerId,
            title: String(hit.title ?? "").slice(0, 200),
            payload: hit.payload.slice(0, 2000),
        });
    }
    return rows;
}
