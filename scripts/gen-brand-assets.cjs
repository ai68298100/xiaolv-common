// 品牌资产生成（发布前置）：icon.png（260×260 集市标准）+ preview.png（1024×768 集市横幅）。
// 设计走插件自身设计语言：品牌蓝渐变 + 圆角 + 白字「常」；preview 用双主题生产截图拼版。
// 用法：node scripts/gen-brand-assets.cjs（覆盖根目录 icon.png / preview.png 后由构建打包）。
"use strict";

const path = require("node:path");
const fs = require("node:fs");
let chromium;
try {
    ({chromium} = require(path.join(__dirname, "..", "..", "小驴雷切", "node_modules", "@playwright", "test")));
} catch {
    ({chromium} = require("playwright"));
}

const ROOT = path.resolve(__dirname, "..");
const OUT = ROOT;
const LIGHT = path.join(ROOT, "docs", "design", "production-desktop-light.png");
const DARK = path.join(ROOT, "docs", "design", "production-desktop-dark.png");

const ICON_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; }
  .stage { width: 260px; height: 260px; background: #fff; }
  .tile {
    width: 260px; height: 260px;
    background: linear-gradient(135deg, #3575f0 0%, #5a8af2 100%);
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .tile .glyph {
    color: #fff; font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 150px; font-weight: 700; line-height: 1;
    text-shadow: 0 4px 16px rgba(31, 35, 41, .25);
  }
  .tile .spark {
    position: absolute; top: 22px; right: 30px; color: rgba(255, 255, 255, .85);
    font-size: 34px;
  }
  .tile .dot {
    position: absolute; left: -34px; bottom: -34px; width: 120px; height: 120px;
    border-radius: 50%; background: rgba(255, 255, 255, .14);
  }
</style></head><body><div class="stage"><div class="tile">
  <div class="dot"></div>
  <div class="glyph">常</div>
  <div class="spark">✦</div>
</div></div></body></html>`;

const LIGHT_URI = "production-desktop-light.png";
const DARK_URI = "production-desktop-dark.png";

const PREVIEW_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; }
  .stage { width: 1024px; height: 768px; background: linear-gradient(160deg, #f7f8fa 0%, #e8ebf1 100%);
           font-family: "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px 44px 30px; box-sizing: border-box;
           display: flex; flex-direction: column; }
  h1 { margin: 0; font-size: 42px; color: #1f2329; letter-spacing: 1px; }
  h1 .spark { color: #3575f0; margin-right: 10px; }
  p.tag { margin: 12px 0 0; font-size: 17px; color: #7d8085; }
  .shots { display: flex; gap: 22px; margin-top: 30px; flex: 1; min-height: 0; }
  .shot { flex: 1; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 32px rgba(31,35,41,.16), 0 2px 8px rgba(31,35,41,.08);
          border: 1px solid rgba(31,35,41,.08); background: #fff; display: flex; flex-direction: column; }
  .shot img { width: 100%; flex: 1; min-height: 0; object-fit: cover; object-position: top center; display: block; }
  .shot .cap { font-size: 13px; color: #7d8085; text-align: center; padding: 8px 0 10px; background: #fff; border-top: 1px solid #e5e7eb; }
  .chips { margin-top: 26px; display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { font-size: 13px; color: #3575f0; background: rgba(53,117,240,.08);
          border: 1px solid rgba(53,117,240,.25); border-radius: 999px; padding: 4px 14px; }
  .chip.neutral { color: #7d8085; background: #fff; border-color: #e5e7eb; }
</style></head><body><div class="stage">
  <h1><span class="spark">✦</span>小驴常用</h1>
  <p class="tag">思源笔记的内容资产层 —— 一次捕获，处处调用；块是真源，AI 是变通，变量是活的。</p>
  <div class="shots">
    <div class="shot"><img src="${LIGHT_URI}"><div class="cap">桌面双栏 · 变量填充 · AI 语义找</div></div>
    <div class="shot"><img src="${DARK_URI}"><div class="cap">暗色主题 · 使用计数 · 片段嵌套</div></div>
  </div>
  <div class="chips">
    <span class="chip">插入时变量填充</span><span class="chip">片段嵌套</span><span class="chip">AI 变换 / 语义找</span>
    <span class="chip">模板包分享</span><span class="chip">常用排序</span>
    <span class="chip neutral">思源块真源</span><span class="chip neutral">移动端 sheet</span>
  </div>
</div></body></html>`;

(async () => {
    for (const f of [LIGHT, DARK]) {
        if (!fs.existsSync(f)) {
            console.error(`缺少 ${f} —— 先运行 pnpm run test:ui 生成生产截图`);
            process.exit(1);
        }
    }
    const browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 260, height: 260}, deviceScaleFactor: 1});
    // icon.png（260×260）
    await page.setContent(ICON_HTML);
    await page.screenshot({path: path.join(OUT, "icon.png"), clip: {x: 0, y: 0, width: 260, height: 260}});
    // preview.png（1024×768）：HTML 落盘到截图同目录（file:// 同源才能引用本地图片）
    const previewHtmlPath = path.join(LIGHT, "..", "_preview-tmp.html");
    fs.writeFileSync(previewHtmlPath, PREVIEW_HTML);
    await page.setViewportSize({width: 1024, height: 768});
    await page.goto("file:///" + previewHtmlPath.split(path.sep).join("/"));
    await page.waitForTimeout(600);
    await page.screenshot({path: path.join(OUT, "preview.png"), clip: {x: 0, y: 0, width: 1024, height: 768}});
    fs.unlinkSync(previewHtmlPath);
    await browser.close();
    for (const f of ["icon.png", "preview.png"]) {
        const b = fs.readFileSync(path.join(OUT, f));
        console.log(f, b.length, "bytes", b.readUInt32BE(16) + "x" + b.readUInt32BE(20));
    }
})();
