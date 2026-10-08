// R146 补丁：设置类弹窗固定高度（一次性工具）
const fs = require("fs");
const p = "src/ui/settings-dialog.ts";
let s = fs.readFileSync(p, "utf8");
const q = '"';
const mk = (title, width, height, note) => [
    `        title: t(${q}${title}${q}),`,
    `        content: ${q}${q},`,
    `        width: ${q}${width}${q},`,
    `        height: ${q}${height}${q},` + (note ? ` // ${note}` : ""),
].join("\n");
const pairs = [
    [mk("setupTitle", "min(520px, 92vw)", "auto"), mk("setupTitle", "min(520px, 92vw)", "min(640px, 90vh)", "固定高：内容增减不再顶跳弹窗（R146）")],
    [mk("openSettings", "min(560px, 92vw)", "auto"), mk("openSettings", "min(560px, 92vw)", "min(720px, 90vh)", "固定高：展开/收起不再顶跳弹窗（R146）")],
    [mk("packExportTitle", "min(460px, 92vw)", "auto"), mk("packExportTitle", "min(460px, 92vw)", "min(600px, 90vh)", "固定高：分类切换不顶跳（R146）")],
];
for (const [a, b] of pairs) {
    if (!s.includes(a + ",")) { console.error("MISSING: " + a.split("\n")[0]); process.exit(1); }
    s = s.replace(a + ",", b + ",");
}
// 三个宿主容器挂 xlc-settings-host（滚动样式挂点）：设置/首跑/包导出
// main settings 容器类挂点：
s = s.replace(
    '    const body = getDialogBody(dialog.element);\n    if (!body) return;\n    body.innerHTML = "";\n    const root = document.createElement("div");\n    root.className = "xlc-form";\n    buildLibraryPickerSection',
    '    const body = getDialogBody(dialog.element);\n    if (!body) return;\n    body.innerHTML = "";\n    dialog.element.querySelector(".b3-dialog__container")?.classList.add("xlc-settings-host");\n    const root = document.createElement("div");\n    root.className = "xlc-form";\n    buildLibraryPickerSection'
);
fs.writeFileSync(p, s);
console.log("heights fixed + settings host class (main)");
