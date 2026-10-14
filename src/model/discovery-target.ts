import {isBlockId} from "./item";

export interface DocTreeDiscoveryTarget {
    docId: string;
    path: string;
}

/** Resolve a single, explicit document selection from the public doc-tree menu payload. */
export function getSingleDocTreeDiscoveryTarget(type: unknown, items: unknown): DocTreeDiscoveryTarget | null {
    if (type !== "doc" && type !== "docs") return null;
    if (!Array.isArray(items) || items.length !== 1) return null;
    const item = items[0] as {id?: unknown; path?: unknown} | null;
    if (!item || !isBlockId(item.id)) return null;
    return {docId: item.id, path: typeof item.path === "string" ? item.path : ""};
}
