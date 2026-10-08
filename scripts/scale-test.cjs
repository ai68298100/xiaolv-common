// R155 规模性能实证驱动：全新隔离内核 + 库文档 → 打包 scale-entry → 运行 → 清理。
// 用法：node scripts/scale-test.cjs [--n 2000] [--port 6816]
"use strict";

const {spawn} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");

const args = process.argv.slice(2);
const flag = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const PORT = String(flag("--port", 6816));
const ORIGIN = `http://127.0.0.1:${PORT}`;
const N_ITEMS = String(flag("--n", 2000));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const WS = path.resolve(flag("--ws", path.join(os.tmpdir(), `xlc-scale-${PORT}`)));

function resolveKernel() {
    const candidates = [
        process.env.SIYUAN_KERNEL || "",
        path.join(os.homedir(), "AppData", "Local", "Programs", "SiYuan", "resources", "kernel", "siyuan.exe"),
        "C:/Program Files/SiYuan/resources/kernel/siyuan.exe",
        "D:/RJ/SiYuan/resources/kernel/siyuan.exe",
    ].filter(Boolean);
    for (const c of candidates) {
        try { fs.accessSync(c, fs.constants.X_OK); return c; } catch {}
    }
    console.error("[scale] 未找到思源内核，请设 SIYUAN_KERNEL");
    process.exit(1);
}
const KERNEL = resolveKernel();


async function probe(origin) {
    try {
        const r = await fetch(`${origin}/api/system/version`, {method: "POST", headers: {"Content-Type": "application/json"}, body: "{}", signal: AbortSignal.timeout(1500)});
        return r.ok ? r.json() : null;
    } catch { return null; }
}
async function api(origin, token, endpoint, payload = {}) {
    const r = await fetch(`${origin}${endpoint}`, {method: "POST", headers: {"Content-Type": "application/json", ...(token ? {Authorization: `Token ${token}`} : {})}, body: JSON.stringify(payload)});
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${endpoint}`);
    return r.json();
}
function readToken(ws) {
    for (const p of [path.join(ws, "conf", "conf.json"), path.join(ws, "conf.json")]) {
        try {
            const conf = JSON.parse(fs.readFileSync(p, "utf8"));
            if (conf.api?.token) return conf.api.token;
        } catch {}
    }
    return "";
}
function killTree(pid) {
    try {
        if (process.platform === "win32") spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {stdio: "ignore"});
        else process.kill(pid, "SIGTERM");
    } catch {}
}

(async () => {
    const kernel = resolveKernel();
    fs.rmSync(WS, {recursive: true, force: true});
    fs.mkdirSync(path.join(WS, "data", "plugins", "xiaolv-common"), {recursive: true});
    fs.cpSync(DIST_DIR, path.join(WS, "data", "plugins", "xiaolv-common"), {recursive: true});
    console.log(`[scale] 工作区 ${WS}，插件已安装（dist）`);

    let up = await probe(ORIGIN);
    let child = null;
    const bootLog = () => fs.openSync(path.join(WS, ".kernel.log"), "a");
    if (!up) {
        child = spawn(KERNEL, ["serve", "-w", WS, "--port", PORT], {stdio: ["ignore", bootLog(), bootLog()]});
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline && !up) {
            await new Promise((r) => setTimeout(r, 800));
            up = await probe(ORIGIN);
        }
        if (!up) { console.error("[scale] 内核 30s 未就绪"); killTree(child.pid); process.exit(1); }
    }
    let token = readToken(WS);
    if (!token) { console.error("[scale] 令牌读取失败"); if (child?.pid) killTree(child.pid); process.exit(1); }

    const nb = await api(ORIGIN, token, "/api/notebook/createNotebook", {name: "XLC规模"});
    const nbId = nb.data.notebook.id;
    const doc = await api(ORIGIN, token, "/api/filetree/createDocWithMd", {notebook: nbId, path: "/常用内容库", markdown: "欢迎页"});
    const docId = String(doc.data);
    const petalDir = path.join(WS, "data", "storage", "petal", "xiaolv-common");
    fs.mkdirSync(petalDir, {recursive: true});
    fs.writeFileSync(path.join(petalDir, "config.json"), JSON.stringify({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [docId], createdDocIds: [docId], configuredAt: Date.now()}));

    // 打包 scale-entry（TS → CJS）并运行
    const entry = path.join(__dirname, "harness", "scale-entry.ts");
    const outfile = path.join(WS, "scale-entry.cjs");
    esbuild.buildSync({entryPoints: [entry], outfile, bundle: true, format: "cjs", platform: "node", target: "node18", logLevel: "silent"});
    let exitCode = 1;
    await new Promise((resolve) => {
        const proc = spawn(process.execPath, [outfile], {stdio: "inherit", env: {...process.env, IT_ORIGIN: ORIGIN, IT_TOKEN: token, IT_DOC: docId, IT_N: N_ITEMS}});
        proc.on("exit", (code) => resolve(code ?? 1));
    });

    if (child?.pid) { console.log("[scale] 关闭隔离内核"); killTree(child.pid); }
    process.exit(exitCode);
})();
