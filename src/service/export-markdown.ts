// Markdown 包导出构建器（R13；R71/F6 模板包清单）：条目 → items.md + assets/*（store-only ZIP）。
// 资源链接保持相对形式 assets/…（ZIP 根与 Markdown 同层，解压即可读）。
// 资源字节由调用方经 /api/file/getFile 提供（二进制端点，fetchSyncPost 不适用）；
// 取不到的资源如实计入 skipped，不产生坏包。
// 包清单（F6）：首部 <!-- xlc-pack … --> 注释声明包名/条目数/变量清单——
// 旧版解析器只认 xlc-item 注释，清单对旧导入天然透明；新解析器读取用于回执展示。
import {ZipEntry} from "../model/zip";
import {extractAssetPath} from "../model/actions";
import {CommonItem} from "../model/item";
import {LIMITS} from "../constants";
import {listAskFields} from "../model/variables";

export interface MarkdownExportResult {
    entries: ZipEntry[];
    /** 条目内联元数据头（HHTML 注释形式，导回时可读） */
    itemCount: number;
    assetCount: number;
    skippedAssets: string[];
    /** 聚合的 ask 变量名清单（包清单用；去重保序） */
    varNames: string[];
}

export async function buildMarkdownExport(
    items: readonly CommonItem[],
    kramdownById: ReadonlyMap<string, string>,
    fetchAssetBytes: (assetPath: string) => Promise<Uint8Array | null>,
    pack?: {name: string},
): Promise<MarkdownExportResult> {
    const oneLine = (value: string): string => value.replace(/[\r\n]+/g, " ").trim();
    const entries: ZipEntry[] = [];
    const skippedAssets: string[] = [];
    const assetEntries = new Map<string, ZipEntry>();
    const usedNames = new Set<string>(["items.md"]);
    let assetCount = 0;
    // 变量清单（F6）：跨条目聚合 ask 字段名（去重保序，封顶 maxAskFields）
    const varNames: string[] = [];
    for (const item of items) {
        if (item.itemType === "code") continue;
        for (const field of listAskFields(kramdownById.get(item.id) ?? "")) {
            if (!varNames.includes(field.name)) varNames.push(field.name);
            if (varNames.length >= LIMITS.maxAskFields) break;
        }
        if (varNames.length >= LIMITS.maxAskFields) break;
    }
    const mdParts: string[] = [
        "# 小驴常用 · 条目导出",
        "",
        `> 导出自思源插件「小驴常用」，共 ${items.length} 条。资源位于 assets/，条目内链接为相对路径。`,
        "",
    ];
    if (pack && pack.name.trim()) {
        const manifest = [
            `<!-- xlc-pack`,
            `name: ${oneLine(pack.name).slice(0, LIMITS.title)}`,
            `items: ${items.length}`,
            varNames.length ? `vars: ${varNames.join(",")}` : "",
            `-->`,
        ].filter(Boolean).join("\n");
        mdParts.unshift(manifest, "");
    }
    for (const item of items) {
        const kramdown = kramdownById.get(item.id) ?? "";
        const meta = [
            `<!-- xlc-item`,
            `id: ${item.id}`,
            `type: ${item.itemType}`,
            item.alias ? `alias: ${oneLine(item.alias)}` : "",
            item.tags.length ? `tags: ${item.tags.map(oneLine).join(",")}` : "",
            item.category ? `category: ${oneLine(item.category)}` : "",
            item.source.sourceDocId ? `source-doc: ${oneLine(item.source.sourceDocId)}` : "",
            item.source.sourceBlockId ? `source-block: ${oneLine(item.source.sourceBlockId)}` : "",
            item.source.sourceType ? `source-type: ${oneLine(item.source.sourceType)}` : "",
            item.url ? `url: ${oneLine(item.url)}` : "",
            item.targetBlockId ? `target: ${oneLine(item.targetBlockId)}` : "",
            `-->`,
        ].filter(Boolean).join("\n");
        mdParts.push(`## ${oneLine(item.title || item.id)}`, "", meta, "", kramdown, "");
        // 资源条目：取字节 → assets/<basename>
        if (item.itemType === "image" || item.itemType === "asset") {
            const assetPath = extractAssetPath(kramdown);
            if (assetPath && !assetEntries.has(assetPath)) {
                const bytes = await fetchAssetBytes(assetPath);
                if (bytes && bytes.length > 0) {
                    // 条目名 = 完整相对路径（与 kramdown 链接天然一致，永不重名；路径已过安全校验）
                    const name = assetPath;
                    usedNames.add(name);
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
    return {entries, itemCount: items.length, assetCount, skippedAssets, varNames};
}
