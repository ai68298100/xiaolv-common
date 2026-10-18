// 源码质量门禁：阻止不安全的 thrown value 读取回流。
// 统一异常文本和属性读取必须经过 src/model/errors.ts，避免 null、普通对象或
// hostile Proxy 在错误处理分支中再次抛错。支持 --root 供负向门禁测试使用。
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const rootArgIndex = process.argv.indexOf("--root");
const root = rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
    ? path.resolve(process.argv[rootArgIndex + 1])
    : repoRoot;
const sourceRoot = path.join(root, "src");
const skipFiles = new Set([path.join("model", "errors.ts")]);
const sourceExtensions = new Set([".ts", ".tsx"]);
const identifier = "[A-Za-z_$][\\w$]*";
const rules = [
    [new RegExp(`\\(\\s*${identifier}\\s+as\\s+Error\\s*\\)\\s*\\??\\.message\\b`, "g"), "unsafe Error cast message access"],
    [new RegExp(`\\b(${identifier})\\s+instanceof\\s+Error\\s*\\?\\s*\\1\\.message\\s*:\\s*String\\(\\1\\)`, "g"), "duplicated Error/string ternary"],
    [new RegExp(`\\(\\s*${identifier}\\s+as\\s+\\{[^}]*\\bmessage\\b[^}]*\\}\\s*\\)\\s*\\??\\.message\\b`, "gs"), "unsafe cast message access"],
    [new RegExp(`\\(\\s*${identifier}\\s+as\\s+\\{[^}]*\\bname\\b[^}]*\\}\\s*\\)\\s*\\??\\.name\\b`, "gs"), "unsafe cast name access"],
];

const hits = [];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
        const file = path.join(dir, name);
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
            walk(file);
            continue;
        }
        if (!sourceExtensions.has(path.extname(name)) || skipFiles.has(path.relative(sourceRoot, file))) continue;
        const text = fs.readFileSync(file, "utf8");
        // Ignore comments so examples in maintenance notes cannot trip the gate.
        // Keep line breaks to preserve useful diagnostics.
        const scanText = text
            .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
            .replace(/\/\/.*$/gm, (comment) => comment.replace(/[^\n]/g, " "));
        const relative = path.relative(root, file).split(path.sep).join("/");
        for (const [pattern, label] of rules) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(scanText)) !== null) {
                const line = scanText.slice(0, match.index).split("\n").length;
                hits.push(`${relative}:${line} :: ${label}`);
            }
        }
    }
}

walk(sourceRoot);
if (hits.length > 0) {
    console.error("异常处理门禁命中：");
    console.error(hits.join("\n"));
    process.exit(1);
}
console.log("异常处理门禁：未发现不安全 thrown value 读取");
