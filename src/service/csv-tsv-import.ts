// 通用 CSV / TSV 表格数据批量导入引擎（G8，R267，常用资产多源汇聚）：
// 支持 RFC 4180 规范解析（字段双引号包裹、"" 转义、内联换行、BOM 清洗）；
// 智能嗅探逗号 (,)、制表符 (\t) 与分号 (;) 分隔符；
// 智能识别中英文多场景表头（标题/正文/分类/标签/别名/网址/类型）；
// 支持无表头位置降级推断、类型推断（URL/Code/Markdown/Text）与稳定确定性逻辑 ID 生成；
// 深度融合 B-006 写前安全限制，产生可追溯导入 Issue 与告警，对接现有导入策略管道。

import {LIMITS} from "../constants";
import {ExportedItem} from "../model/transfer";
import {ItemType, isItemType, cleanTagList, isSafeHttpUrl} from "../model/item";
import {inferTypeFromText} from "../ui/capture";
import {bodyWriteRestriction} from "../model/kramdown";

export interface CsvTsvImportResult {
    items: ExportedItem[];
    issues: string[];
    delimiter: string;
    headers: string[];
    totalRows: number;
    validRows: number;
}

export interface ColumnMapping {
    titleIndex: number;
    contentIndex: number;
    categoryIndex: number;
    tagsIndex: number;
    aliasIndex: number;
    urlIndex: number;
    typeIndex: number;
    hasHeaderRow: boolean;
}

/** 分隔符自动嗅探：统计各候选分隔符在非空行中产生列数的稳定度和数量。 */
export function sniffDelimiter(rawText: string): string {
    const lines = rawText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 10);
    if (lines.length === 0) return ",";

    const candidates = [",", "\t", ";"];
    let bestDelimiter = ",";
    let bestScore = -1;

    for (const d of candidates) {
        let prevCount = -1;
        let consistent = true;
        let totalCols = 0;

        for (const line of lines) {
            // 简单估算：不在双引号内的分隔符出现次数
            let inQuotes = false;
            let count = 0;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    inQuotes = !inQuotes;
                } else if (ch === d && !inQuotes) {
                    count++;
                }
            }
            const cols = count + 1;
            totalCols += cols;
            if (prevCount === -1) {
                prevCount = cols;
            } else if (prevCount !== cols) {
                consistent = false;
            }
        }

        // 评分策略：如果各行列数完全一致且大于 1 列，赋予极高权重
        if (prevCount > 1) {
            let score = totalCols;
            if (consistent) score += 1000;
            // TSV 制表符在包含制表符的剪贴板/表格复制中具备更高可信度
            if (d === "\t" && consistent) score += 100;
            if (score > bestScore) {
                bestScore = score;
                bestDelimiter = d;
            }
        }
    }

    return bestDelimiter;
}

/** RFC 4180 状态机表格解析：完整支持双引号包围、引号转义 ("")、字段内换行与 BOM。 */
export function parseDelimitedTable(rawText: string, customDelimiter?: string): {grid: string[][]; delimiter: string; issues: string[]} {
    const issues: string[] = [];
    const text = rawText.replace(/^\uFEFF/, "");
    const delimiter = customDelimiter || sniffDelimiter(text);

    const grid: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < len && text[i + 1] === '"') {
                    // 转义双引号 "" -> "
                    currentField += '"';
                    i += 2;
                    continue;
                } else {
                    // 离开双引号态
                    inQuotes = false;
                    i++;
                    continue;
                }
            } else {
                currentField += char;
                i++;
                continue;
            }
        } else {
            if (char === '"') {
                // 进入双引号态（如果当前字段已有非空字符，记录弱告警并兼容）
                if (currentField.trim().length > 0) {
                    issues.push(`解析提示：第 ${grid.length + 1} 行字段存在未转义的双引号`);
                }
                inQuotes = true;
                i++;
                continue;
            } else if (char === delimiter) {
                currentRow.push(currentField);
                currentField = "";
                i++;
                continue;
            } else if (char === "\r") {
                if (i + 1 < len && text[i + 1] === "\n") {
                    i++;
                }
                currentRow.push(currentField);
                currentField = "";
                // 仅当非完全空行时推入
                if (currentRow.some((c) => c.trim().length > 0)) {
                    grid.push(currentRow);
                }
                currentRow = [];
                i++;
                continue;
            } else if (char === "\n") {
                currentRow.push(currentField);
                currentField = "";
                if (currentRow.some((c) => c.trim().length > 0)) {
                    grid.push(currentRow);
                }
                currentRow = [];
                i++;
                continue;
            } else {
                currentField += char;
                i++;
                continue;
            }
        }
    }

    // 处理末尾未收尾字段与行
    if (inQuotes) {
        issues.push(`文件末尾存在未正常闭合的双引号，已自动兼容截断`);
    }
    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.some((c) => c.trim().length > 0)) {
            grid.push(currentRow);
        }
    }

    return {grid, delimiter, issues};
}

/** 智能推断表格列语义与表头位置 */
export function inferColumnMapping(grid: string[][]): ColumnMapping {
    const mapping: ColumnMapping = {
        titleIndex: -1,
        contentIndex: -1,
        categoryIndex: -1,
        tagsIndex: -1,
        aliasIndex: -1,
        urlIndex: -1,
        typeIndex: -1,
        hasHeaderRow: false,
    };

    const firstRow = grid[0];
    if (!firstRow) return mapping;

    const row0 = firstRow.map((c) => c.trim().toLowerCase());

    // 表头关键词字典（中英多维别名）
    const TITLE_KEYS = ["title", "name", "phrase", "label", "trigger", "标题", "名称", "快捷语", "话术名称", "常用语", "短语", "问", "问题"];
    const CONTENT_KEYS = ["content", "text", "snippet", "body", "value", "payload", "replace", "template", "正文", "内容", "展开文本", "模板", "话术内容", "快捷内容", "答", "回答", "话术"];
    const CAT_KEYS = ["category", "group", "folder", "scene", "分类", "场景", "分组", "文件夹", "目录", "业务线"];
    const TAG_KEYS = ["tags", "tag", "keywords", "keyword", "标签", "关键词", "关键字"];
    const ALIAS_KEYS = ["alias", "abbr", "shortcut", "key", "别名", "缩写", "快捷键", "触发词", "简写", "指令", "按键"];
    const URL_KEYS = ["url", "link", "href", "网址", "链接", "外链"];
    const TYPE_KEYS = ["type", "itemtype", "类型", "条目类型"];

    const matchesKey = (val: string, keys: string[]): boolean => {
        if (!val || val.length > 20) return false;
        return keys.some((k) => {
            if (val === k) return true;
            if (k.length >= 2 && (val.startsWith(k) || val.endsWith(k) || val === k)) return true;
            return false;
        });
    };

    let matchedHeaders = 0;
    const colCount = row0.length;

    for (let c = 0; c < colCount; c++) {
        const val = row0[c];
        if (!val) continue;
        if (matchesKey(val, TITLE_KEYS)) {
            if (mapping.titleIndex === -1) {
                mapping.titleIndex = c;
                matchedHeaders++;
            }
        } else if (matchesKey(val, CONTENT_KEYS)) {
            if (mapping.contentIndex === -1) {
                mapping.contentIndex = c;
                matchedHeaders++;
            }
        } else if (matchesKey(val, CAT_KEYS)) {
            if (mapping.categoryIndex === -1) {
                mapping.categoryIndex = c;
                matchedHeaders++;
            }
        } else if (matchesKey(val, TAG_KEYS)) {
            if (mapping.tagsIndex === -1) {
                mapping.tagsIndex = c;
                matchedHeaders++;
            }
        } else if (matchesKey(val, ALIAS_KEYS)) {
            if (mapping.aliasIndex === -1) {
                mapping.aliasIndex = c;
                matchedHeaders++;
            }
        } else if (matchesKey(val, URL_KEYS)) {
            if (mapping.urlIndex === -1) {
                mapping.urlIndex = c;
                matchedHeaders++;
            }
        } else if (matchesKey(val, TYPE_KEYS)) {
            if (mapping.typeIndex === -1) {
                mapping.typeIndex = c;
                matchedHeaders++;
            }
        }
    }

    // 判定是否有表头行：命中 2 个及以上字段，或命中 1 个显著表头且整行单元格均为简短标签
    if (matchedHeaders >= 2 || (matchedHeaders >= 1 && row0.every((c) => c.length <= 25))) {
        mapping.hasHeaderRow = true;
    } else {
        // 第一行没有明确表头关键词或包含长句正文，判定为无表头数据
        mapping.hasHeaderRow = false;
    }

    // 针对未命中表头的缺省位置推断与降级策略
    if (!mapping.hasHeaderRow) {
        if (colCount === 1) {
            mapping.contentIndex = 0;
            mapping.titleIndex = -1; // 从正文自动提取前缀
        } else if (colCount === 2) {
            mapping.titleIndex = 0;
            mapping.contentIndex = 1;
        } else if (colCount === 3) {
            mapping.titleIndex = 0;
            mapping.contentIndex = 1;
            mapping.categoryIndex = 2;
        } else if (colCount === 4) {
            mapping.titleIndex = 0;
            mapping.contentIndex = 1;
            mapping.categoryIndex = 2;
            mapping.tagsIndex = 3;
        } else {
            mapping.titleIndex = 0;
            mapping.contentIndex = 1;
            mapping.categoryIndex = 2;
            mapping.tagsIndex = 3;
            mapping.aliasIndex = 4;
        }
    } else {
        // 如果有表头但缺失 title 或 content，尽量做智能补齐
        if (mapping.contentIndex === -1 && mapping.titleIndex !== -1 && colCount >= 2) {
            mapping.contentIndex = mapping.titleIndex === 0 ? 1 : 0;
        } else if (mapping.titleIndex === -1 && mapping.contentIndex !== -1 && colCount >= 2) {
            mapping.titleIndex = mapping.contentIndex === 0 ? 1 : 0;
        }
    }

    return mapping;
}

/** 确定性稳定逻辑 ID：xlc-t + 64 位 FNV-1a 哈希（保证相同数据重复导入可命中冲突策略） */
export function csvTsvLogicalId(title: string, category: string, alias: string, contentPrefix: string): string {
    const fnv = (text: string, seed: number): number => {
        let h = seed >>> 0;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h >>> 0;
    };
    const b36 = (n: number): string => n.toString(36).padStart(7, "0");
    const payload = `${title}\u0000${category}\u0000${alias}\u0000${contentPrefix}`;
    const hash = (b36(fnv(payload, 0x811c9dc5)) + b36(fnv(`${payload}\u0000csv-tsv`, 0x1b873593))).slice(0, 14);
    return `xlc-t${hash}`;
}

/** 将 CSV/TSV 文本解析为 ExportedItem[] 并附带完整诊断回执 */
export function parseCsvTsvItems(
    rawText: string,
    customDelimiter?: string,
    now = Date.now(),
    customMapping?: Partial<ColumnMapping>,
): CsvTsvImportResult {
    const issues: string[] = [];
    const items: ExportedItem[] = [];

    if (!rawText || rawText.trim().length === 0) {
        return {
            items: [],
            issues: ["导入内容为空"],
            delimiter: ",",
            headers: [],
            totalRows: 0,
            validRows: 0,
        };
    }

    const {grid, delimiter, issues: parseIssues} = parseDelimitedTable(rawText, customDelimiter);
    issues.push(...parseIssues);

    if (grid.length === 0) {
        return {
            items: [],
            issues: issues.length > 0 ? issues : ["未在表格中解析出任何有效行"],
            delimiter,
            headers: [],
            totalRows: 0,
            validRows: 0,
        };
    }

    const mapping = inferColumnMapping(grid);
    const hasHeader = customMapping && customMapping.hasHeaderRow !== undefined
        ? customMapping.hasHeaderRow
        : mapping.hasHeaderRow;
    const startIndex = hasHeader ? 1 : 0;
    const headers = hasHeader ? (grid[0] ?? []) : [];
    const totalDataRows = grid.length - startIndex;

    for (let r = startIndex; r < grid.length; r++) {
        const row = grid[r];
        if (!row) continue;
        const rowNum = r + 1;

        const getCol = (idx: number): string => (idx >= 0 && idx < row.length ? (row[idx]?.trim() ?? "") : "");

        let content = customMapping && customMapping.contentIndex !== undefined
            ? getCol(customMapping.contentIndex)
            : mapping.contentIndex >= 0 ? getCol(mapping.contentIndex) : "";
        let title = customMapping && customMapping.titleIndex !== undefined
            ? getCol(customMapping.titleIndex)
            : mapping.titleIndex >= 0 ? getCol(mapping.titleIndex) : "";
        const category = customMapping && customMapping.categoryIndex !== undefined
            ? getCol(customMapping.categoryIndex).slice(0, LIMITS.category)
            : mapping.categoryIndex >= 0 ? getCol(mapping.categoryIndex).slice(0, LIMITS.category) : "";
        const tagsRaw = customMapping && customMapping.tagsIndex !== undefined
            ? getCol(customMapping.tagsIndex)
            : mapping.tagsIndex >= 0 ? getCol(mapping.tagsIndex) : "";
        const alias = customMapping && customMapping.aliasIndex !== undefined
            ? getCol(customMapping.aliasIndex).slice(0, LIMITS.alias)
            : mapping.aliasIndex >= 0 ? getCol(mapping.aliasIndex).slice(0, LIMITS.alias) : "";
        const urlRaw = customMapping && customMapping.urlIndex !== undefined
            ? getCol(customMapping.urlIndex)
            : mapping.urlIndex >= 0 ? getCol(mapping.urlIndex) : "";
        const typeRaw = mapping.typeIndex >= 0 ? getCol(mapping.typeIndex).toLowerCase() : "";

        // 如果正文与标题均为空，跳过空行
        if (!content && !title && !urlRaw) {
            continue;
        }

        // 如果只有正文而无标题，从正文提取首行或前 30 字作为标题
        if (!title && content) {
            const firstLine = content.split(/\r?\n/)[0]?.trim() ?? "";
            title = firstLine.slice(0, 40) || `常用语 ${rowNum}`;
        }
        title = title.slice(0, LIMITS.title);

        // 如果只有标题没有正文，但提供了 url
        if (!content && urlRaw) {
            content = urlRaw;
        }

        // 标签清洗切分
        const tags = cleanTagList(tagsRaw);

        // 网址校验
        let url = "";
        if (urlRaw && isSafeHttpUrl(urlRaw)) {
            url = urlRaw.slice(0, 2048);
        } else if (content && isSafeHttpUrl(content)) {
            url = content.slice(0, 2048);
        }

        // 类型推断
        let itemType: ItemType = "text";
        if (typeRaw && isItemType(typeRaw)) {
            itemType = typeRaw;
        } else if (url && (itemType as string) !== "code") {
            itemType = "url";
        } else {
            itemType = inferTypeFromText(content);
        }

        // 检查 B-006 写前安全限制（多行或嵌套结构警示）
        if (bodyWriteRestriction(content)) {
            issues.push(`第 ${rowNum} 行「${title}」：正文包含多行或复杂结构，在当前受限模式下保存将受到安全保护`);
        }

        const id = csvTsvLogicalId(title, category, alias, content.slice(0, 60));

        items.push({
            id,
            itemType,
            title,
            alias,
            tags,
            category,
            kramdown: content,
            source: {
                sourceDocId: "",
                sourceBlockId: "",
                sourceType: "external",
            },
            url,
            targetBlockId: "",
            createdAt: now,
            updatedAt: now,
        });
    }

    return {
        items,
        issues,
        delimiter,
        headers,
        totalRows: totalDataRows,
        validRows: items.length,
    };
}
