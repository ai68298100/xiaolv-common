/** Candidate facets used by the discovery dialog.
 *
 * Facets are derived from the current discovery session only. They are a
 * display aid, never persisted data and never a second source of truth.
 */
export interface DiscoveryTagFacet {
    tag: string;
    count: number;
}

/** Exact, case-insensitive tag matching. A saved view for `常用` must not match `常用2`. */
export function matchesDiscoveryTag(tags: readonly string[] | undefined, query: string): boolean {
    const wanted = (query ?? "").trim().toLocaleLowerCase();
    if (!wanted) return true;
    return (tags ?? []).some((tag) => typeof tag === "string" && tag.trim().toLocaleLowerCase() === wanted);
}

export function buildDiscoveryTagFacets(
    candidates: readonly {tags?: readonly string[]}[],
    limit = 12,
): DiscoveryTagFacet[] {
    const counts = new Map<string, number>();
    for (const candidate of candidates) {
        const seen = new Set<string>();
        for (const raw of candidate.tags ?? []) {
            if (typeof raw !== "string") continue;
            const tag = raw.trim();
            if (!tag || seen.has(tag)) continue;
            seen.add(tag);
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 12;
    return Array.from(counts, ([tag, count]) => ({tag, count}))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-Hans"))
        .slice(0, safeLimit);
}
