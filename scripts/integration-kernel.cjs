// 真内核集成测试（R140）：起隔离内核 → 建库文档 → 打包 integration-entry.ts →
// 让 library.ts 全生命周期（索引/CRUD/搜索/健康/往返）对真实内核跑一遍 → 关内核。
// 用法：node scripts/integration-kernel.cjs（零 npm 依赖，需本机思源内核，见 e2e-isolated 说明）。
"use strict";

const {spawn} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = String(process.env.IT_PORT || 16807);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const esbuild = require("esbuild");

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
    console.error("未找到思源内核，请设 SIYUAN_KERNEL");
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

(async () => {
    const kernelExe = resolveKernel();
    const ws = process.env.IT_WS || path.join(os.tmpdir(), "xiaolv-it-ws");
    fs.mkdirSync(ws, {recursive: true});
    let up = await probe(ORIGIN);
    let child = null;
    if (up) {
        console.log(`[it] 复用运行中的内核 ${ORIGIN}`);
    } else {
        const log = fs.openSync(path.join(ws, ".kernel.log"), "a");
        child = spawn(kernelExe, ["serve", "-w", ws, "--port", PORT], {stdio: ["ignore", log, log]});
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline && !up) {
            await new Promise((r) => setTimeout(r, 800));
            up = await probe(ORIGIN);
        }
        if (!up) {
            console.error("[it] 内核 30s 未就绪");
            if (child?.pid) killTree(child.pid);
            process.exit(1);
        }
    }
    const token = readToken(ws);
    if (!token) {
        console.error("[it] 无法读取内核令牌");
        if (child?.pid) killTree(child.pid);
        process.exit(1);
    }
    // 笔记本与库文档
    let nb = (await api(ORIGIN, token, "/api/notebook/lsNotebooks")).data?.notebooks?.find((n) => !n.closed);
    if (!nb) {
        await api(ORIGIN, token, "/api/notebook/createNotebook", {name: "xiaolv-it"});
        nb = (await api(ORIGIN, token, "/api/notebook/lsNotebooks")).data?.notebooks?.find((n) => !n.closed);
    }
    const docTitle = `XLC集成测试库 ${Date.now()}`;
    const docId = String((await api(ORIGIN, token, "/api/filetree/createDocWithMd", {notebook: nb.id, path: `/${docTitle}`, markdown: ""})).data ?? "");
    if (!/^\d{14}-[0-9a-z]{7}$/.test(docId)) {
        console.error("[it] 建库文档失败");
        if (child?.pid) killTree(child.pid);
        process.exit(1);
    }
    console.log(`[it] 库文档 ${docId}`);

    // 打包并运行集成入口
    const entry = path.join(__dirname, "harness", "integration-entry.ts");
    const outfile = path.join(ws, "integration-entry.cjs");
    esbuild.buildSync({entryPoints: [entry], outfile, bundle: true, format: "cjs", platform: "node", target: "node18", logLevel: "silent"});
    const exitCode = await new Promise((resolve) => {
        const proc = spawn(process.execPath, [outfile], {stdio: "inherit", env: {...process.env, IT_ORIGIN: ORIGIN, IT_TOKEN: token, IT_DOC: docId}});
        proc.on("exit", (code) => resolve(code ?? 1));
    });

    // 清理库文档与内核
    try {
        await api(ORIGIN, token, "/api/filetree/removeDoc", {notebook: nb.id, path: `/${docId}.sy`});
    } catch {}
    if (child?.pid) {
        console.log("[it] 关闭隔离内核");
        killTree(child.pid);
    }
    process.exit(exitCode);
})().catch((err) => {
    console.error(`[it] ${err.message}`);
    process.exit(1);
});
