export type SearchScope = "all" | "favorites" | "recent" | "current-doc" | "all-notes";

export function shouldShowScopeFallback(query: string, scope: SearchScope): boolean {
    return Boolean(query.trim()) && (scope === "favorites" || scope === "recent");
}

export function shouldShowOmniSearchFallback(query: string, scope: SearchScope): boolean {
    return Boolean(query.trim()) && (scope === "all" || scope === "favorites" || scope === "recent");
}

export function formatScopeFallbackQuery(query: string, maxCharacters = 20): string {
    const limit = Math.max(0, Math.floor(maxCharacters));
    const characters: string[] = [];
    for (const character of query.trim()) {
        if (characters.length === limit) return `${characters.join("")}…`;
        characters.push(character);
    }
    return characters.join("");
}
