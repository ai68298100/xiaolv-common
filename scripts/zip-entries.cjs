// 读取 ZIP 中央目录中的文件名，不依赖平台上的 unzip/7-Zip 命令。
"use strict";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;

function listZipEntries(input) {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const minimumEocdOffset = Math.max(0, buffer.length - 22 - 0xffff);
    let eocdOffset = -1;

    // EOCD 位于文件末尾，之前最多有 65,535 字节的注释。
    for (let offset = buffer.length - 22; offset >= minimumEocdOffset; offset--) {
        if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
            eocdOffset = offset;
            break;
        }
    }
    if (eocdOffset < 0) throw new Error("ZIP 文件缺少结束目录记录（EOCD）");

    const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
    const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
    const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
    const entryCount = buffer.readUInt16LE(eocdOffset + 10);
    const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
    const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

    if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
        throw new Error("不支持分卷 ZIP 包");
    }
    if (entryCount === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
        throw new Error("不支持 ZIP64 包");
    }
    if (centralDirectoryOffset + centralDirectorySize > eocdOffset ||
        centralDirectoryOffset + centralDirectorySize > buffer.length) {
        throw new Error("ZIP 中央目录越界或已损坏");
    }

    const entries = [];
    let offset = centralDirectoryOffset;
    for (let index = 0; index < entryCount; index++) {
        if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_FILE_SIGNATURE) {
            throw new Error(`ZIP 中央目录第 ${index + 1} 项无效`);
        }
        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const entryEnd = offset + 46 + nameLength + extraLength + commentLength;
        if (entryEnd > centralDirectoryOffset + centralDirectorySize || entryEnd > buffer.length) {
            throw new Error(`ZIP 中央目录第 ${index + 1} 项越界`);
        }
        entries.push(buffer.toString("utf8", offset + 46, offset + 46 + nameLength));
        offset = entryEnd;
    }
    if (offset !== centralDirectoryOffset + centralDirectorySize) {
        throw new Error("ZIP 中央目录长度与条目记录不一致");
    }
    return entries;
}

module.exports = {listZipEntries};
