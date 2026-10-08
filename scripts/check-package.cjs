// 发布包结构门禁（R133）：SiYuan 安装按 zip 根相对路径找 index.js，
// 任何目录嵌套前缀（如 dist/）都会导致安装失败；本检查在构建后强制校验。
// 用法：node scripts/check-package.cjs（需先 pnpm run build 产出 dist/package.zip）
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const {listZipEntries} = require("./zip-entries.cjs");

const ROOT = path.resolve(__dirname, "..");
const zipPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(ROOT, "dist", "package.zip");
const pluginManifest = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

if (!fs.existsSync(zipPath)) {
    console.error("check-package 失败：未找到 dist/package.zip（先 pnpm run build）");
    process.exit(1);
}

let entries;
try {
    entries = listZipEntries(fs.readFileSync(zipPath));
} catch (err) {
    console.error(`check-package 失败：无法读取 ZIP 目录（${err.message}）`);
    process.exit(1);
}

const failures = [];

// 1) 根相对：除 i18n/ 外禁止任何目录前缀
for (const name of entries) {
    if (name.includes("/")) {
        const top = name.split("/")[0];
        if (top !== "i18n") failures.push(`条目存在非预期嵌套前缀「${top}/」：${name}`);
    }
}

// 2) 必需文件齐全
const required = [
    "index.js",
    "index.css",
    "plugin.json",
    "README.md",
    "icon.png",
    "preview.png",
    "i18n/zh-CN.json",
    "i18n/en.json",
];
for (const req of required) {
    if (!entries.includes(req)) failures.push(`缺少必需文件：${req}`);
}

// 3) 不允许把 package.zip 自己打进去
if (entries.some((name) => name.endsWith("package.zip"))) {
    failures.push("包内嵌套了 package.zip（自包含错误）");
}

// 4) 版本一致性
if (pluginManifest.version !== packageJson.version) {
    failures.push(`版本不一致：plugin.json ${pluginManifest.version} vs package.json ${packageJson.version}`);
}

if (failures.length > 0) {
    console.error("check-package 失败：");
    for (const f of failures) console.error("  - " + f);
    console.error(`包内条目（${entries.length}）：\n  ` + entries.join("\n  "));
    process.exit(1);
}
console.log(`check-package ✓：${entries.length} 个条目全部根相对且必需文件齐全，版本 ${pluginManifest.version}`);
