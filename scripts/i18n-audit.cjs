// i18n 与文案审计（R138 临时工具）：
// 1) src 内 t("key") 使用集 vs zh-CN.json / en.json 键集 三方对比
// 2) zh/en 值的 %s 占位符数量与 t() 调用实参数量一致性
// 3) src/ui|service|index 内字符串字面量中的裸 CJK（应走 i18n 的用户可见文案）
// 输出明细；有缺失时退出 1。
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const zh = JSON.parse(fs.readFileSync(path.join(SRC, "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(SRC, "i18n", "en.json"), "utf8"));
const zhKeys = new Set(Object.keys(zh));
const enKeys = new Set(Object.keys(en));

// 1. 收集 t("...") / T("...") 用法
const used = new Map(); // key -> [file:line]
const usedArgs = new Map(); // key -> 实参数量（出现过的最大值）
function walk(dir) {
    for (const f of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f.name)) scan(p);
    }
}
function scan(file) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
        const re = /\b[tT]\(\s*"([a-zA-Z0-9_.-]+)"\s*([),])/g;
        let m;
        while ((m = re.exec(line))) {
            const key = m[1];
            if (!used.has(key)) used.set(key, []);
            used.get(key).push(`${rel}:${i + 1}`);
            if (m[2] === ",") {
                // 统计本调用实参数量：粗略数逗号直到收尾引号后的 ")"
                const rest = line.slice(re.lastIndex);
                const commas = (rest.match(/,/g) || []).length;
                const args = 1 + Math.max(0, countArgs(rest));
                usedArgs.set(key, Math.max(usedArgs.get(key) ?? 0, args));
            } else {
                usedArgs.set(key, Math.max(usedArgs.get(key) ?? 0, 0));
            }
        }
    });
}
function countArgs(s) {
    // 粗略：数顶层逗号（不考虑嵌套括号内的逗号被多数场景可接受，误报人工复核）
    let depth = 0, args = 0;
    for (const ch of s) {
        if (ch === "(" || ch === "[") depth++;
        else if (ch === ")" || ch === "]") { if (depth === 0) break; depth--; }
        else if (ch === "," && depth === 0) args++;
    }
    return args;
}
walk(SRC);

// 2. 对比
const missingInZh = [...used.keys()].filter((k) => !zhKeys.has(k) && !k.includes("."));
const missingInEn = [...used.keys()].filter((k) => !enKeys.has(k));
const unusedInZh = [...zhKeys].filter((k) => !used.has(k));
const zhEnDiff = [...zhKeys].filter((k) => !enKeys.has(k)).concat([...enKeys].filter((k) => !zhKeys.has(k)));

console.log(`i18n 键集：zh=${zhKeys.size} en=${enKeys.size} 源码使用=${used.size}`);
if (missingInZh.length) console.log(`✖ 使用但 zh-CN 缺失：${missingInZh.join(", ")}`);
else console.log("✔ 源码使用的键 zh-CN 全部存在");
if (missingInEn.length) console.log(`✖ 使用但 en 缺失：${missingInEn.join(", ")}`);
else console.log("✔ 源码使用的键 en 全部存在");
if (zhEnDiff.length) console.log(`✖ zh/en 键集差集：${zhEnDiff.join(", ")}`);
else console.log("✔ zh 与 en 键集零差集");
if (unusedInZh.length) console.log(`ℹ zh-CN 有但源码未引用（动态拼接键除外）：${unusedInZh.join(", ")}`);

// 3. %s 占位符一致性
const phProblems = [];
for (const [key, args] of usedArgs) {
    const placeholders = (v) => ((v ?? "").match(/%s/g) || []).length;
    const zn = placeholders(zh[key]);
    const ne = placeholders(en[key]);
    if (zhKeys.has(key) && zn !== args) phProblems.push(`${key}: zh %s=${zn} 调用实参=${args}`);
    if (zhKeys.has(key) && enKeys.has(key) && zn !== ne) phProblems.push(`${key}: zh %s=${zn} vs en %s=${ne}`);
}
if (phProblems.length) { console.log(`✖ %s 一致性问题：\n  ${phProblems.join("\n  ")}`); }
else console.log("✔ %s 占位符 zh/en/调用三方一致");

// 4. 裸 CJK 字符串字面量（排除注释、i18n JSON、测试）
const cjkHits = [];
function walkUi(dir) {
    for (const f of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walkUi(p);
        else if (/\.ts$/.test(f.name)) scanCjk(p);
    }
}
function scanCjk(file) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "");
        const strs = code.match(/"[^"]*"|'[^']*'|`[^`]*`/g) || [];
        for (const s of strs) {
            if (/[\u4e00-\u9fff]/.test(s) && !/class|data-xlc|dataset|aria/i.test(s)) {
                cjkHits.push(`${rel}:${i + 1} ${s.slice(0, 60)}`);
            }
        }
    });
}
walkUi(path.join(SRC, "ui"));
walkUi(path.join(SRC, "service"));
if (cjkHits.length) {
    console.log(`ℹ UI/service 源码中的裸 CJK 字面量（人工复核是否用户可见）：`);
    for (const h of cjkHits) console.log("  " + h);
} else console.log("✔ UI/service 无裸 CJK 字面量");

const hardFail = missingInZh.length || missingInEn.length || zhEnDiff.length || phProblems.length;
process.exit(hardFail ? 1 : 0);
