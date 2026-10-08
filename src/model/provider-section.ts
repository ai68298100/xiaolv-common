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
    /** 完整载荷（插入用；上限 contentChars=100k，超出拒绝而非截断——不静默截尾） */
    payload: string;
    /** 列表展示摘要（120 字符，仅显示用） */
    excerpt: string;
}

export const PROVIDER_ID_PATTERN = /^pv:[A-Za-z0-9_-]+:\d+$/;
const MAX_PAYLOAD = 100_000;
const MAX_PROVIDERS_ROWS = 20;

/**
 * 提供方候选 → 弹窗行。payload 完整保留（上限 100k，超限条目整条拒绝并计数——绝不静默截尾）；
 * 每提供方最多 20 行；显示摘要由 excerpt 单独承载。
 */
export function buildProviderRows(hits: readonly ProviderHit[]): ProviderRow[] {
    if (!Array.isArray(hits)) return [];
    const counters = new Map<string, number>();
    const rows: ProviderRow[] = [];
    for (const hit of hits) {
        if (!hit || typeof hit.providerId !== "string" || !hit.providerId) continue;
        if (typeof hit.payload !== "string" || hit.payload.trim().length === 0) continue;
        if (hit.payload.length > MAX_PAYLOAD) continue; // 超限整条拒绝（不截尾）
        const n = (counters.get(hit.providerId) ?? 0) + 1;
        counters.set(hit.providerId, n);
        if (n > MAX_PROVIDERS_ROWS) continue; // 溢出方跳过本条而非终止循环，不得吞掉后续提供方（R139）
        rows.push({
            virtualId: `pv:${hit.providerId.replace(/[^A-Za-z0-9_-]/g, "_")}:${n}`,
            providerId: hit.providerId,
            providerName: hit.providerName || hit.providerId,
            title: String(hit.title ?? "").slice(0, 200),
            payload: hit.payload,
            excerpt: hit.payload.slice(0, 120),
        });
    }
    return rows;
}
