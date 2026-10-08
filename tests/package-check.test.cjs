"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {spawnSync} = require("node:child_process");
const {listZipEntries} = require("../scripts/zip-entries.cjs");

const root = path.resolve(__dirname, "..");
const checker = path.join(root, "scripts", "check-package.cjs");

function makeZip(entries) {
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    for (const entry of entries) {
        const name = Buffer.from(entry, "utf8");
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(name.length, 26);
        localParts.push(local, name);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(localOffset, 42);
        centralParts.push(central, name);
        localOffset += local.length + name.length;
    }
    const centralDirectory = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralDirectory.length, 12);
    eocd.writeUInt32LE(localOffset, 16);
    return Buffer.concat([...localParts, centralDirectory, eocd]);
}

const requiredEntries = [
    "index.js", "index.css", "plugin.json", "README.md", "icon.png", "preview.png",
    "i18n/zh-CN.json", "i18n/en.json",
];

test("package check reads ZIP entries without an external unzip command", (t) => {
    const tempZip = path.join(os.tmpdir(), `xlc-package-check-valid-${process.pid}.zip`);
    t.after(() => fs.rmSync(tempZip, {force: true}));
    fs.writeFileSync(tempZip, makeZip(requiredEntries));

    const entries = listZipEntries(fs.readFileSync(tempZip));
    assert.ok(entries.includes("index.js"));
    assert.ok(entries.includes("plugin.json"));
    assert.ok(entries.includes("i18n/zh-CN.json"));

    const result = spawnSync(process.execPath, [checker, tempZip], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /check-package ✓/);
});

test("package check rejects an archive missing root index.js", (t) => {
    const tempZip = path.join(os.tmpdir(), `xlc-package-check-${process.pid}.zip`);
    t.after(() => fs.rmSync(tempZip, {force: true}));
    fs.writeFileSync(tempZip, makeZip(requiredEntries.filter((entry) => entry !== "index.js")));

    const result = spawnSync(process.execPath, [checker, tempZip], {encoding: "utf8"});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /缺少必需文件：index\.js/);
});

test("ZIP entry reader rejects a malformed archive", () => {
    assert.throws(() => listZipEntries(Buffer.from("not a zip")), /缺少结束目录记录/);
});
