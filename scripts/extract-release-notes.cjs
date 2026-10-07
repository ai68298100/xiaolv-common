// CI 发布说明提取：从 CHANGELOG.md 中取指定版本段落，写入 $GITHUB_OUTPUT。
// 用法：node scripts/extract-release-notes.cjs <版本号（不带 v 前缀）>
// 段落匹配：## [版本号] 起至下一个 ## [ 或文件尾；兼容 Keep a Changelog 体例。
"use strict";

const fs = require("node:fs");

const version = process.argv[2] ?? "";
if (!version) {
    console.error("用法: node extract-release-notes.cjs <version>");
    process.exit(1);
}

const lines = fs.readFileSync("CHANGELOG.md", "utf8").split("\n");
const body = [];
let flag = false;

for (const line of lines) {
    const headMatch = line.match(/^## \[(.+?)\]/);
    if (headMatch) {
        if (flag) break; // 下一个版本段开始 → 结束
        if (headMatch[1] === version) flag = true;
        continue;
    }
    if (flag) body.push(line);
}

if (body.length === 0) {
    console.error(`CHANGELOG.md 中未找到版本 ${version} 的段落`);
    process.exit(1);
}

const text = body.join("\n").trim();
const out = process.env.GITHUB_OUTPUT;
if (out) {
    // GitHub Actions 多行输出格式
    fs.appendFileSync(out, `body<<RELEASE_NOTES_EOF\n${text}\nRELEASE_NOTES_EOF\n`);
} else {
    console.log(text); // 本地调试
}
