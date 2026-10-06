// 发布自检：全仓密钥字面量扫描（CI 与本地共用）。
// 覆盖 ts/js/cjs/mjs/json/md/scss/html/txt；跳过 node_modules/.git/dist/构建产物。
// 命中即输出文件与规则并退出 1；干净则输出通过。
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".github"]);
const SKIP_FILES = new Set(["docs/design/harness-bundle.js", "package.zip"]);
const TEXT_RE = /\.(ts|js|cjs|mjs|json|md|scss|html|txt)$/;

const PATTERNS = [
    [/api-[\w]{20,}/, "api-key-like"],
    [/token\s*[:=]\s*['"][A-Za-z0-9]{16,}['"]/, "token-literal"],
    [/(sk|pk)-[A-Za-z0-9]{20,}/, "secret-key-like"],
    [/AIza[A-Za-z0-9_-]{30,}/, "google-api-key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private-key-block"],
];

const hits = [];

function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const rel = path.relative(ROOT, p).split(path.sep).join("/");
        const st = fs.statSync(p);
        if (st.isDirectory()) {
            if (!SKIP_DIRS.has(name)) walk(p);
            continue;
        }
        if (SKIP_FILES.has(rel) || !TEXT_RE.test(name)) continue;
        const text = fs.readFileSync(p, "utf8");
        for (const [re, label] of PATTERNS) {
            if (re.test(text)) hits.push(`${rel} :: ${label}`);
        }
    }
}

walk(ROOT);
if (hits.length > 0) {
    console.error("密钥扫描命中：");
    console.error(hits.join("\n"));
    process.exit(1);
}
console.log("密钥扫描：未发现可疑字面量");
