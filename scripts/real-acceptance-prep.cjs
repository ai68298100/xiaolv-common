// 真机验收环境准备（R147）：全新工作区 + 隔离内核 + 插件安装 + 信任/语言/库/启用 全流程。
// 用法：node scripts/real-acceptance-prep.cjs [--port 6812] [--ws <目录>] [--dist <目录>]
// 输出 PREP_RESULT 行（origin/token/doc），供调用方注入 real-acceptance.cjs 的环境变量。
// 内核保持运行；验收脚本的 graceful exit 会关闭它。
"use strict";

const {spawn, execSync} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const flag = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const PORT = String(flag("--port", 6812));
const ORIGIN = `http://127.0.0.1:${PORT}`;
const ROOT = path.resolve(__dirname, "..");
const DIST = path.resolve(ROOT, flag("--dist", "dist"));
const WS = path.resolve(flag("--ws", path.join(os.tmpdir(), `xlc-acceptance-${PORT}`)));

function resolveKernel() {
    const candidates = [
        process.env.SIYUAN_KERNEL || "",
        path.join(os.homedir(), "AppData", "Local", "Programs", "SiYuan", "resources", "kernel", "siyuan.exe"),
        "C:/Program Files/SiYuan/resources/kernel/siyuan.exe",
        "D:/RJ/SiYuan/resources/kernel/siyuan.exe",
    ].filter(Boolean);
    for (const c of candidates) {
        try {
            fs.accessSync(c, fs.constants.X_OK);
            return c;
        } catch {}
    }
    console.error("[prep] 未找到思源内核，请设 SIYUAN_KERNEL");
    process.exit(1);
}

async function probe(origin) {
    try {
        const r = await fetch(`${origin}/api/system/version`, {method: "POST", headers: {"Content-Type": "application/json"}, body: "{}", signal: AbortSignal.timeout(1500)});
        return r.ok ? r.json() : null;
    } catch {
        return null;
    }
}

function api(origin, token, endpoint, payload = {}) {
    return fetch(`${origin}${endpoint}`, {
        signal: AbortSignal.timeout(10_000),
        method: "POST",
        headers: {"Content-Type": "application/json", ...(token ? {Authorization: `Token ${token}`} : {})},
        body: JSON.stringify(payload),
    }).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} @ ${endpoint}`);
        return r.json();
    });
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

function waitKernel(origin, deadlineMs) {
    const deadline = Date.now() + deadlineMs;
    const poll = async () => {
        while (Date.now() < deadline) {
            const up = await probe(origin);
            if (up) return true;
            await new Promise((r) => setTimeout(r, 800));
        }
        return false;
    };
    return poll();
}

(async () => {
    const kernel = resolveKernel();
    // 1) 全新工作区 + 插件安装
    fs.rmSync(WS, {recursive: true, force: true});
    fs.mkdirSync(path.join(WS, "data", "plugins", "xiaolv-common"), {recursive: true});
    fs.cpSync(DIST, path.join(WS, "data", "plugins", "xiaolv-common"), {recursive: true});
    console.log(`[prep] 工作区 ${WS}，插件已安装（dist ${fs.statSync(path.join(DIST, "index.js")).size}B）`);

    // 2) 启动内核（首次）
    let up = await probe(ORIGIN);
    let child = null;
    const bootLog = () => fs.openSync(path.join(WS, ".kernel.log"), "a");
    if (!up) {
        child = spawn(kernel, ["serve", "-w", WS, "--port", PORT], {stdio: ["ignore", bootLog(), bootLog()], detached: true});
    child.unref();
        up = await waitKernel(ORIGIN, 30_000);
        if (!up) { console.error("[prep] 内核 30s 未就绪"); killTree(child.pid); process.exit(1); }
    }
    let token = readToken(WS);
    if (!token) { console.error("[prep] 令牌读取失败"); if (child?.pid) killTree(child.pid); process.exit(1); }

    // 3) 信任 + 语言（写盘后重启内核生效）
    const confPath = path.join(WS, "conf", "conf.json");
    const conf = JSON.parse(fs.readFileSync(confPath, "utf8"));
    conf.bazaar = conf.bazaar || {};
    conf.bazaar.trust = true;
    conf.lang = "zh-CN";
    fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");
    if (child?.pid) killTree(child.pid);
    await new Promise((r) => setTimeout(r, 1500)); // 端口释放竞态兜底（R147）
    child = spawn(kernel, ["serve", "-w", WS, "--port", PORT], {stdio: ["ignore", bootLog(), bootLog()], detached: true});
    child.unref();
    up = await waitKernel(ORIGIN, 45_000);
    if (!up) { console.error("[prep] 内核重启未就绪"); killTree(child.pid); process.exit(1); }
    token = readToken(WS);

    // 4) 笔记本 + 库文档 + 侧车配置 + 启用插件
    const nb = await api(ORIGIN, token, "/api/notebook/createNotebook", {name: "XLC验收"});
    const nbId = nb.data.notebook.id;
    const doc = await api(ORIGIN, token, "/api/filetree/createDocWithMd", {notebook: nbId, path: "/常用内容库", markdown: "欢迎页"});
    const docId = String(doc.data ?? "");
    if (!/^\d{14}-[0-9a-z]{7}$/.test(docId)) { console.error("[prep] 建库文档失败"); if (child?.pid) killTree(child.pid); process.exit(1); }
    const petalDir = path.join(WS, "data", "storage", "petal", "xiaolv-common");
    fs.mkdirSync(petalDir, {recursive: true});
    fs.writeFileSync(path.join(petalDir, "config.json"), JSON.stringify({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [docId], createdDocIds: [docId], configuredAt: Date.now()}));
    for (const f of ["desktop", "browser-desktop"]) {
        await api(ORIGIN, token, "/api/petal/setPetalEnabled", {frontend: f, packageName: "xiaolv-common", enabled: true});
    }

    console.log(`[prep] 就绪。`);
    console.log(`PREP_RESULT origin=${ORIGIN} token=${token} doc=${docId} ws=${WS} kernelPid=${child?.pid ?? "(复用)"}`);
    // 内核保持运行，由 real-acceptance 的 graceful exit 关闭
})().catch((err) => {
    console.error(`[prep] ${err.message}`);
    process.exit(1);
});
