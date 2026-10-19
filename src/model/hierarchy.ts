// 层次化分类与标签层级树与级联匹配引擎（G11，R269）：
// 支持通过斜杠 (/) 定义父子层级结构（例如「客服/售后/退款」或「研发/前端/Vue」）；
// 提供严格防止前缀污染的级联匹配算法（子项自动属于父项，但「常用2」绝不属于「常用」）；
// 支持层级树聚合计数与 UI 下拉框扁平缩进视图格式化。

export interface HierarchyNode {
    path: string;        // 完整路径，例如 "客服/售后/退款"
    name: string;        // 当前层级名称，例如 "退款"
    depth: number;       // 深度：0 为根层级
    count: number;       // 级联总计数（包含自身及所有子后代项）
    directCount: number; // 直属于当前完整路径的条目数
    children: HierarchyNode[];
}

export interface FlattenedHierarchyItem {
    path: string;
    label: string;
    depth: number;
    count: number;
}

/** 切分层级路径，去除首尾与多余斜杠 */
export function splitHierarchyPath(path: string): string[] {
    if (!path || typeof path !== "string") return [];
    return path.split("/").map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * 级联匹配判定：判断 childPath 是否与 parentPath 完全相同，或是其下级子孙路径。
 * 严格边界防御：通过精确匹配与斜杠前缀判定，确保 "常用" 匹配 "常用/售后"，但绝对不匹配 "常用2"。
 */
export function isHierarchicalChild(childPath: string, parentPath: string): boolean {
    if (!childPath || !parentPath) return false;
    const c = childPath.trim();
    const p = parentPath.trim();
    if (c === p) return true;
    return c.startsWith(p + "/");
}

/** 分类级联匹配 */
export function matchesHierarchicalCategory(entryCategory: string | undefined, queryCategory: string | undefined): boolean {
    if (!queryCategory || queryCategory.trim().length === 0) return true;
    if (!entryCategory || entryCategory.trim().length === 0) return false;
    return isHierarchicalChild(entryCategory, queryCategory);
}

/** 标签级联匹配：条目的多个标签中只要有一个满足父级或同级，即算命中 */
export function matchesHierarchicalTag(entryTags: readonly string[] | undefined, queryTag: string | undefined): boolean {
    if (!queryTag || queryTag.trim().length === 0) return true;
    if (!entryTags || entryTags.length === 0) return false;
    return entryTags.some((tag) => isHierarchicalChild(tag, queryTag));
}

/** 构建层级节点树并递归累加后代计数 */
export function buildHierarchyTree(
    paths: readonly string[],
    countsMap?: ReadonlyMap<string, number>,
): HierarchyNode[] {
    const rootNodes: HierarchyNode[] = [];

    // 辅助查找或创建子节点
    const getOrCreateChild = (parentList: HierarchyNode[], name: string, fullPath: string, depth: number): HierarchyNode => {
        let found = parentList.find((n) => n.name === name);
        if (!found) {
            found = {
                path: fullPath,
                name,
                depth,
                count: 0,
                directCount: 0,
                children: [],
            };
            parentList.push(found);
        }
        return found;
    };

    // 1. 插入所有路径到树中
    for (const rawPath of paths) {
        const segments = splitHierarchyPath(rawPath);
        if (segments.length === 0) continue;

        let currentList = rootNodes;
        let accumulatedPath = "";

        for (let d = 0; d < segments.length; d++) {
            const seg = segments[d]!;
            accumulatedPath = accumulatedPath ? `${accumulatedPath}/${seg}` : seg;
            const node = getOrCreateChild(currentList, seg, accumulatedPath, d);
            if (d === segments.length - 1) {
                // 叶子或当前完整声明节点
                const direct = countsMap?.get(rawPath) ?? 1;
                node.directCount += direct;
            }
            currentList = node.children;
        }
    }

    // 2. 递归排序子节点并计算级联汇总 count
    const finalizeNode = (node: HierarchyNode): number => {
        let total = node.directCount;
        for (const child of node.children) {
            total += finalizeNode(child);
        }
        node.count = total;
        // 同级按中文字典序稳定排序
        node.children.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
        return total;
    };

    rootNodes.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    for (const root of rootNodes) {
        finalizeNode(root);
    }

    return rootNodes;
}

/** 将层级树扁平化为带层级缩进符号的下拉菜单视图 */
export function flattenHierarchyTree(
    nodes: readonly HierarchyNode[],
    options: {includeCount?: boolean; showPrefixBranch?: boolean} = {},
): FlattenedHierarchyItem[] {
    const {includeCount = true, showPrefixBranch = true} = options;
    const result: FlattenedHierarchyItem[] = [];

    const walk = (node: HierarchyNode, isLast: boolean, parentIndent: string) => {
        let prefix = "";
        if (node.depth > 0 && showPrefixBranch) {
            prefix = parentIndent + (isLast ? "└ " : "├ ");
        }

        const countSuffix = includeCount && node.count > 0 ? ` (${node.count})` : "";
        const label = `${prefix}${node.name}${countSuffix}`;

        result.push({
            path: node.path,
            label,
            depth: node.depth,
            count: node.count,
        });

        const nextIndent = node.depth === 0 ? "" : parentIndent + (isLast ? "  " : "│ ");
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i]!;
            const childIsLast = i === node.children.length - 1;
            walk(child, childIsLast, nextIndent);
        }
    };

    for (let i = 0; i < nodes.length; i++) {
        const root = nodes[i]!;
        const isLast = i === nodes.length - 1;
        walk(root, isLast, "");
    }

    return result;
}
