// 生成占位 icon.png(160x160) 与 preview.png(1024x768)。
// 纯 Node zlib 编码 PNG，无外部依赖。集市要求 PNG/JPEG/WebP/AVIF、不支持 SVG；
// 发布前应替换为正式设计图（本脚本只是让包结构合法）。
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
    let c;
    const table = crc32.table || (crc32.table = (() => {
        const t = new Int32Array(256);
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c;
        }
        return t;
    })());
    c = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
    return (c ^ -1) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, pixelAt) {
    const raw = Buffer.alloc(height * (1 + width * 3));
    for (let y = 0; y < height; y++) {
        const rowStart = y * (1 + width * 3);
        raw[rowStart] = 0;
        for (let x = 0; x < width; x++) {
            const [r, g, b] = pixelAt(x, y);
            const o = rowStart + 1 + x * 3;
            raw[o] = r;
            raw[o + 1] = g;
            raw[o + 2] = b;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw, {level: 9})),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

const root = path.resolve(__dirname, "..");

// icon：紫底圆点标「常」的意象——中心亮块 + 四角圆点（占位，可替换）
const iconPng = encodePng(160, 160, (x, y) => {
    const cx = x - 80, cy = y - 80;
    const d = Math.sqrt(cx * cx + cy * cy);
    if (d > 74) return [0, 0, 0, 0].slice(0, 3);
    if (Math.abs(cx) < 34 && Math.abs(cy) < 12) return [255, 255, 255];
    if (Math.abs(cx) < 12 && Math.abs(cy) < 34) return [255, 255, 255];
    if (d > 58) return [106, 90, 224];
    return [124, 108, 240];
});
fs.writeFileSync(path.join(root, "icon.png"), iconPng);

// preview：浅灰画布 + 三条示意行（占位）
const previewPng = encodePng(1024, 768, (x, y) => {
    if (x > 96 && x < 928 && y > 160 && y < 240) return [124, 108, 240];
    if (x > 96 && x < 800 && y > 300 && y < 350) return [210, 212, 220];
    if (x > 96 && x < 880 && y > 400 && y < 450) return [210, 212, 220];
    if (x > 96 && x < 720 && y > 500 && y < 550) return [225, 227, 233];
    return [246, 247, 250];
});
fs.writeFileSync(path.join(root, "preview.png"), previewPng);
console.log("placeholder icon.png + preview.png written");
