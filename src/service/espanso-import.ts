// Espanso 配置导入（G2，R164，竞品差距分析 docs/competitive-gap-analysis.md P1）：
// 解析 Espanso match YAML（matches[].trigger/replace/vars）→ 本库条目（ExportedItem[]），随后走
// 现有导入策略管道（settings importPolicyConfirm → importMarkdownItems），与 JSON 包/Markdown 包同一条落库路径。
// 映射规则（诚实可追溯，未识别结构原样保留并记 issue，不静默丢）：
//   trigger ":sig"            → title "sig"（剥前导冒号），alias ":sig"，itemType "text"
//   replace 多行块            → kramdown 原样
//   vars[].type=date          → 按格式映射 {{current_date}} → {{xlc:date}} / %H:%M → {{xlc:time}}；其余格式 → date + issue
//   {{clipboard}}             → {{xlc:clipboard}}；{{random:a,b}} → {{xlc:random|a,b}}
//   [[field]]                 → {{xlc:ask:字段}}；[[field={A,B}]] → {{xlc:ask:字段|A,B}}（Espanso Forms）
//   其余 {{var}}              → 原样保留 + issue（script/shell 等无可等价映射，绝不猜语义）
// TextExpander 专有格式（.textexpander plist）不在本轮：格式封闭，留待后续（README 如实说明）。

import {load as loadYaml} from "js-yaml";
import {ExportedItem} from "../model/transfer";

export interface EspansoImportResult {
    items: ExportedItem[];
    issues: string[];
}

interface EspansoVar {
    name?: unknown;
    type?: unknown;
    params?: {format?: unknown} | null;
}

interface EspansoMatch {
    trigger?: unknown;
    replace?: unknown;
    vars?: unknown;
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Espanso 日期格式 → 本库占位符；不可映射返回 null（调用方降级为 date 并记 issue）。 */
export function mapDateFormat(format: string): "{{xlc:date}}" | "{{xlc:time}}" | null {
    const f = format.trim();
    if (f === "%Y-%m-%d" || f === "%Y/%m/%d") return "{{xlc:date}}";
    if (f === "%H:%M" || f === "%H:%M:%S") return "{{xlc:time}}";
    return null;
}

/** 内容改写：Espanso 变量/表单语法 → 本库语法；未识别 {{var}} 原样保留并记 issue。 */
export function rewriteBody(replace: string, dateVars: ReadonlyMap<string, string>, issues: string[]): string {
    let out = replace
        // Espanso Forms：[[字段={A,B}]] / [[字段]]（先处理带选项的，避免内层误吞）
        .replace(/\[\[([^\][{}=]+)=\{([^\]}]+)\}\]\]/g, (_m, name: string, opts: string) => {
            return `{{xlc:ask:${name.trim()}|${opts.split(",").map((o) => o.trim()).join(",")}}}`;
        })
        .replace(/\[\[([^\][{}=]+)\]\]/g, (_m, name: string) => `{{xlc:ask:${name.trim()}}}`)
        // 随机：{{random:a,b,c}}（Espanso 内联 random）
        .replace(/\{\{random:([^}]+)\}\}/g, (_m, opts: string) => `{{xlc:random|${opts.trim()}}}`);
    // 用户命名变量：date 类型按格式映射；clipboard 直映；其余原样保留记 issue
    out = out.replace(/\{\{([^{}:]+)\}\}/g, (match, nameRaw: string) => {
        const name = nameRaw.trim();
        if (name === "clipboard") return "{{xlc:clipboard}}";
        const mapped = dateVars.get(name);
        if (mapped) return mapped;
        issues.push(`变量 {{${name}}} 无等价映射（script/shell 等），已原样保留`);
        return match;
    });
    return out;
}

/**
 * 逻辑 ID：xlc-e + 触发词双 FNV-1a 哈希（base36 ≈64 位）。
 * 约束：createItem 强制 ^xlc-[0-9a-z]{10,40}$——外部 ID 必须符合平台规则，否则落库时被换成随机 ID，
 * 重复导入的冲突策略（skip/overwrite）就永远走不到（R164 真机发现：CJK 触发词还被净化坍缩成同名互撞）。
 * 同一 trigger 两次导入 → 同 ID → 天然走冲突策略；不同 trigger 碰撞概率可忽略（64 位空间）。
 */
export function espansoLogicalId(trigger: string): string {
    const fnv = (text: string, seed: number): number => {
        let h = seed >>> 0;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h >>> 0;
    };
    const b36 = (n: number): string => n.toString(36).padStart(7, "0");
    const hash = (b36(fnv(trigger, 0x811c9dc5)) + b36(fnv(`${trigger}\u0000espanso`, 0x1b873593))).slice(0, 14);
    return `xlc-e${hash}`;
}

export function parseEspansoYaml(text: string, now = Date.now()): EspansoImportResult {
    const issues: string[] = [];
    const items: ExportedItem[] = [];
    let doc: unknown;
    try {
        doc = loadYaml(text);
    } catch (err) {
        return {items: [], issues: [`YAML 解析失败：${(err as Error).message.slice(0, 120)}`]};
    }
    const root = asRecord(doc);
    const matches = root ? root.matches : null;
    if (!Array.isArray(matches)) {
        return {items: [], issues: ["未找到 matches 列表——请粘贴 Espanso 的 match 配置文件内容（如 base.yml）"]};
    }
    for (const [index, raw] of matches.entries()) {
        const m = asRecord(raw) as EspansoMatch | null;
        const trigger = typeof m?.trigger === "string" ? m.trigger : "";
        // 块标量（|）自带尾部换行：对片段正文无意义，去除（多余空行入库还会顶出空块）
        const replace = typeof m?.replace === "string" ? m.replace.replace(/\n+$/, "") : "";
        if (!trigger || !replace) {
            issues.push(`第 ${index + 1} 项缺少 trigger/replace，已跳过`);
            continue;
        }
        // vars：收集 date 类型变量的映射（{{current_date}} → {{xlc:date}} 等）；其余类型在正文替换时记 issue
        const dateVars = new Map<string, string>();
        if (Array.isArray(m?.vars)) {
            for (const v of m.vars) {
                const rec = asRecord(v) as EspansoVar | null;
                const name = typeof rec?.name === "string" ? rec.name : "";
                const type = typeof rec?.type === "string" ? rec.type : "";
                if (!name) continue;
                if (type === "date") {
                    const format = typeof rec?.params?.format === "string" ? rec.params.format : "%Y-%m-%d";
                    const mapped = mapDateFormat(format);
                    if (mapped) {
                        dateVars.set(name, mapped);
                    } else {
                        dateVars.set(name, "{{xlc:date}}");
                        issues.push(`日期格式 ${format}（变量 ${name}）无精确映射，按 {{xlc:date}} 导入`);
                    }
                }
                // 非 date 类型不在此登记：正文引用时统一记 issue 保留原样
            }
        }
        items.push({
            id: espansoLogicalId(trigger),
            itemType: "text",
            title: trigger.replace(/^:+/, "").trim() || trigger,
            alias: trigger,
            tags: ["espanso"],
            category: "",
            kramdown: rewriteBody(replace, dateVars, issues),
            source: {sourceDocId: "", sourceBlockId: "", sourceType: "external"},
            url: "",
            targetBlockId: "",
            createdAt: now,
            updatedAt: now,
        });
    }
    if (items.length === 0 && issues.length === 0) issues.push("matches 列表为空");
    return {items, issues};
}
