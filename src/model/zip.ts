// 无依赖 ZIP 写入器（store-only，不压缩）：Markdown+资源导出用。
// 结构：[本地文件头+数据]…[中央目录]…[EOCD]。CRC32/时间戳确定性（固定 DOS 时间），
// 便于可复现导出与测试。仅支持 <4GB、条目数 <65535（导出场景远够）。

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

export function crc32(data: Uint8Array): number {
    let c = 0 ^ -1;
    for (const byte of data) c = (c >>> 8) ^ (CRC_TABLE[(c ^ byte) & 0xff] ?? 0);
    return (c ^ -1) >>> 0;
}

export interface ZipEntry {
    /** 条目路径（POSIX 分隔；不得以 / 开头，不得含 ..） */
    name: string;
    data: Uint8Array;
}

function dosDateTime(): {time: number; date: number} {
    // 固定 2026-01-01 00:00（可复现导出；远离 1980 纪元回滚问题）
    const time = 0;
    const date = ((2026 - 1980) << 9) | (1 << 5) | 1;
    return {time, date};
}

function u16(arr: number[], value: number): void {
    arr.push(value & 0xff, (value >>> 8) & 0xff);
}

function u32(arr: number[], value: number): void {
    arr.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
    if (entries.length === 0) throw new Error("zip: no entries");
    if (entries.length > 65535) throw new Error("zip: too many entries");
    const {time, date} = dosDateTime();
    const localParts: number[][] = [];
    const centralParts: number[][] = [];
    let offset = 0;
    for (const entry of entries) {
        if (!entry.name || entry.name.startsWith("/") || entry.name.includes("..") || entry.name.includes("\\")) {
            throw new Error(`zip: unsafe entry name ${entry.name}`);
        }
        const nameBytes = new TextEncoder().encode(entry.name);
        const crc = crc32(entry.data);
        const local: number[] = [];
        u32(local, 0x04034b50);
        u16(local, 20);
        u16(local, 0);
        u16(local, 0);
        u16(local, time);
        u16(local, date);
        u32(local, crc);
        u32(local, entry.data.length);
        u32(local, entry.data.length);
        u16(local, nameBytes.length);
        u16(local, 0);
        local.push(...nameBytes);
        const headerOffset = offset;
        localParts.push(local, Array.from(entry.data));

        const central: number[] = [];
        u32(central, 0x02014b50);
        u16(central, 20);
        u16(central, 20);
        u16(central, 0);
        u16(central, 0);
        u16(central, time);
        u16(central, date);
        u32(central, crc);
        u32(central, entry.data.length);
        u32(central, entry.data.length);
        u16(central, nameBytes.length);
        u16(central, 0);
        u16(central, 0);
        u16(central, 0);
        u16(central, 0);
        u32(central, 0);
        u32(central, headerOffset);
        central.push(...nameBytes);
        centralParts.push(central);
        offset += local.length + entry.data.length;
    }
    const centralStart = offset;
    let centralSize = 0;
    const out: number[] = [];
    for (const part of localParts) out.push(...part);
    for (const part of centralParts) {
        out.push(...part);
        centralSize += part.length;
    }
    const eocd: number[] = [];
    u32(eocd, 0x06054b50);
    u16(eocd, 0);
    u16(eocd, 0);
    u16(eocd, entries.length);
    u16(eocd, entries.length);
    u32(eocd, centralSize);
    u32(eocd, centralStart);
    u16(eocd, 0);
    out.push(...eocd);
    return new Uint8Array(out);
}

/** 极简 ZIP 读取（测试回读用）：校验签名/条目数/CRC 一致性，返回名称与内容。 */
export function readZipEntries(zip: Uint8Array): Array<{name: string; data: Uint8Array}> {
    // EOCD 定位：从尾部找 0x06054b50
    let eocd = -1;
    for (let i = zip.length - 22; i >= 0; i--) {
        if (zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 0x05 && zip[i + 3] === 0x06) {
            eocd = i;
            break;
        }
    }
    if (eocd === -1) throw new Error("zip: EOCD not found");
    const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const count = dv.getUint16(eocd + 10, true);
    const cdOffset = dv.getUint32(eocd + 16, true);
    const out: Array<{name: string; data: Uint8Array}> = [];
    let p = cdOffset;
    for (let i = 0; i < count; i++) {
        if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("zip: bad central signature");
        const crc = dv.getUint32(p + 16, true);
        const size = dv.getUint32(p + 24, true);
        const nameLen = dv.getUint16(p + 28, true);
        const extraLen = dv.getUint16(p + 30, true);
        const commentLen = dv.getUint16(p + 32, true);
        const localOffset = dv.getUint32(p + 42, true);
        const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
        const localNameLen = dv.getUint16(localOffset + 26, true);
        const localExtraLen = dv.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const data = zip.subarray(dataStart, dataStart + size);
        if (crc32(data) !== crc) throw new Error(`zip: crc mismatch on ${name}`);
        out.push({name, data});
        p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
}
