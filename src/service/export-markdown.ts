// Markdown 包导出构建器（R13）：条目 → items.md + assets/*（store-only ZIP）。
// 资源链接保持相对形式 assets/…（ZIP 根与 Markdown 同层，解压即可读）。
// 资源字节由调用方经 /api/file/getFile 提供（二进制端点，fetchSyncPost 不适用）；
// 取不到的资源如实计入 skipped，不产生坏包。
import {ZipEntry} from "../model/zip";
import {extractAssetPath} from "../model/actions";
import {CommonItem} from "../model/item";
import {LIMITS} from "../constants";

export interface MarkdownExportResult {
    entries: ZipEntry[];
    /** 条目内联元数据头（HHTML 注释形式，导回时可读） */
    itemCount: number;
    assetCount: number;
    skippedAssets: string[];
}

function safeBasename(assetPath: string): string {
    const base = assetPath.split("/").pop() ?? assetPath;
    return base.replace(/[^\w.\-\u4e00-\u9fff]/g, "_").slice(0, 120) || "asset";
}

export async function buildMarkdownExport(
    items: readonly CommonItem[],
    kramdownById: ReadonlyMap<string, string>,
    fetchAssetBytes: (assetPath: string) => Promise<Uint8Array | null>,
): Promise<MarkdownExportResult> {
    const entries: ZipEntry[] = [];
    const skippedAssets: string[] = [];
    const assetEntries = new Map<string, ZipEntry>();
    let assetCount = 0;
    const mdParts: string[] = [
        "# 小驴常用 · 条目导出",
        "",
        `> 导出自思源插件「小驴常用」，共 ${items.length} 条。资源位于 assets/，条目内链接为相对路径。`,
        "",
    ];
    for (const item of items) {
        const kramdown = kramdownById.get(item.id) ?? "";
        const meta = [
            `<!-- xlc-item`,
            `id: ${item.id}`,
            `type: ${item.itemType}`,
            item.alias ? `alias: ${item.alias}` : "",
            item.tags.length ? `tags: ${item.tags.join(",")}` : "",
            item.category ? `category: ${item.category}` : "",
            item.source.sourceDocId ? `source-doc: ${item.source.sourceDocId}` : "",
            item.source.sourceBlockId ? `source-block: ${item.source.sourceBlockId}` : "",
            `-->`,
        ].filter(Boolean).join("\n");
        mdParts.push(`## ${item.title || item.id}`, "", meta, "", kramdown, "");
        // 资源条目：取字节 → assets/<basename>
        if (item.itemType === "image" || item.itemType === "asset") {
            const assetPath = extractAssetPath(kramdown);
            if (assetPath && !assetEntries.has(assetPath)) {
                const bytes = await fetchAssetBytes(assetPath);
                if (bytes && bytes.length > 0) {
                    const name = `assets/${safeBasename(assetPath)}`;
                    assetEntries.set(assetPath, {name, data: bytes});
                    assetCount++;
                } else {
                    skippedAssets.push(assetPath);
                }
            }
        }
        if (mdParts.join("").length > LIMITS.contentChars) {
            mdParts.push("", "> （内容超长，导出在此截断）");
            break;
        }
    }
    entries.push({name: "items.md", data: new TextEncoder().encode(mdParts.join("\n"))});
    entries.push(...assetEntries.values());
    return {entries, itemCount: items.length, assetCount, skippedAssets};
}
