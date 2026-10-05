// 测试运行器：esbuild 把 tests/entry.ts（引用全部被测模块）打包为单一 bundle
// （模块实例唯一），再用 node --test 执行全部 *.test.cjs。
const path = require("node:path");
const fs = require("node:fs");
const {spawnSync} = require("node:child_process");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const outdir = path.join(__dirname, ".build");

fs.rmSync(outdir, {recursive: true, force: true});

esbuild.buildSync({
    entryPoints: [path.join(__dirname, "entry.ts")],
    outfile: path.join(outdir, "entry.cjs"),
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    sourcemap: false,
    logLevel: "warning",
    alias: {
        siyuan: path.join(__dirname, "stub-siyuan.cjs"),
    },
});

const testFiles = fs.readdirSync(__dirname)
    .filter((name) => name.endsWith(".test.cjs"))
    .map((name) => path.join(__dirname, name));

if (testFiles.length === 0) {
    console.error("No test files found.");
    process.exit(1);
}
const result = spawnSync(process.execPath, ["--test", ...testFiles], {stdio: "inherit"});
process.exit(result.status ?? 1);
