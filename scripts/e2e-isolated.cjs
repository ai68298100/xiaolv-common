// 独立后台 E2E（B-001 解除方案，R136）：用本机思源自带内核起一个隔离实例——
// 独立工作区 + 独立端口（默认 16806），令牌直接从测试工作区 conf 读出，不触碰正在运行的
// 主思源实例，无需用户授权令牌。跑完 scripts/e2e-acceptance.cjs 后自动关闭内核。
// 零依赖（Node 18+ 原生 fetch / child_process）。
//
// 用法：node scripts/e2e-isolated.cjs [--keep] [--port 16806] [--kernel <内核exe路径>]
//   --keep    跑完后保留内核运行（可直接复跑 node scripts/e2e-acceptance.cjs）
// 环境变量：SIYUAN_KERNEL（内核路径）、SIYUAN_E2E_PORT（默认 16806）、SIYUAN_E2E_WS（工作区目录，默认系统临时目录）
//
// 本脚本只做进程编排与令牌读取；验收断言全部在 e2e-acceptance.cjs。
"use strict";

const {spawn} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "") : null;
};
const KEEP = args.includes("--keep");
const PORT = String(flag("--port") || process.env.SIYUAN_E2E_PORT || 16806);
const ORIGIN = `http://127.0.0.1:${PORT}`;

function resolveKernel() {
    const fromArg = flag("--kernel") || process.env.SIYUAN_KERNEL || "";
    const candidates = [
        fromArg,
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
    console.error(`未找到思源内核（siyuan.exe）。请用 --kernel 或环境变量 SIYUAN_KERNEL 指定，候选已尝试：\n  ${candidates.join("\n  ")}`);
    process.exit(1);
}

async function probe(origin) {
    try {
        const resp = await fetch(`${origin}/api/system/version`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: "{}",
            signal: AbortSignal.timeout(1500),
        });
        return resp.ok ? await resp.json() : null;
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
            const token = conf.api?.token ?? conf.apiToken ?? "";
            if (token) return token;
        } catch {}
    }
    return "";
}

async function main() {
    const kernel = resolveKernel();
    const ws = process.env.SIYUAN_E2E_WS || path.join(os.tmpdir(), "xiaolv-e2e-ws");
    fs.mkdirSync(ws, {recursive: true});

    // 端口上已有内核则复用（前次 --keep 或并发调用），否则启动隔离实例
    let reused = await probe(ORIGIN);
    let child = null;
    if (reused) {
        console.log(`[isolated] 端口 ${PORT} 已有内核在运行，直接复用`);
    } else {
        const logPath = path.join(ws, ".kernel.log");
        console.log(`[isolated] 启动隔离内核：${kernel}`);
        console.log(`[isolated]   工作区 ${ws}`);
        console.log(`[isolated]   端口   ${PORT}（日志 ${logPath}）`);
        child = spawn(kernel, ["serve", "-w", ws, "--port", PORT], {
            stdio: ["ignore", fs.openSync(logPath, "a"), fs.openSync(logPath, "a")],
        });
        child.on("error", (err) => {
            console.error(`[isolated] 内核启动失败：${err.message}`);
            process.exit(1);
        });
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 800));
            reused = await probe(ORIGIN);
            if (reused) break;
        }
        if (!reused) {
            console.error("[isolated] 内核 30s 未就绪，查看工作区 .kernel.log");
            if (child && child.pid) killTree(child.pid);
            process.exit(1);
        }
    }
    console.log(`[isolated] 内核就绪 v${reused?.data ?? reused}`);

    const token = readToken(ws);
    if (!token) {
        console.error(`[isolated] 未能从 ${ws} 读到 api token（conf.api.token）`);
        if (child) killTree(child.pid);
        process.exit(1);
    }

    // 验收脚本要求至少一个打开的笔记本；隔离工作区首启为空，就地补建
    try {
        const nb = await api(ORIGIN, token, "/api/notebook/lsNotebooks");
        const list = (nb.data?.notebooks ?? []).filter((n) => !n.closed);
        if (list.length === 0) {
            await api(ORIGIN, token, "/api/notebook/createNotebook", {name: "xiaolv-e2e"});
            console.log('[isolated] 空工作区，已创建笔记本 "xiaolv-e2e"');
        }
    } catch (err) {
        console.error(`[isolated] 笔记本检查失败：${err.message}`);
        if (child) killTree(child.pid);
        process.exit(1);
    }

    const acceptance = path.join(__dirname, "e2e-acceptance.cjs");
    console.log("[isolated] 运行验收 scripts/e2e-acceptance.cjs ——\n");
    const exitCode = await new Promise((resolve) => {
        const proc = spawn(process.execPath, [acceptance], {
            stdio: "inherit",
            env: {...process.env, SIYUAN_ORIGIN: ORIGIN, SIYUAN_TOKEN: token},
        });
        proc.on("exit", (code) => resolve(code ?? 1));
    });

    if (child && !KEEP) {
        console.log("\n[isolated] 关闭隔离内核");
        killTree(child.pid);
    } else if (KEEP) {
        console.log(`\n[isolated] --keep：内核保留在 ${ORIGIN}（工作区 ${ws}），可直接复跑 scripts/e2e-acceptance.cjs`);
    }
    process.exit(exitCode);
}

function killTree(pid) {
    try {
        if (process.platform === "win32") {
            spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {stdio: "ignore"});
        } else {
            process.kill(pid, "SIGTERM");
        }
    } catch {}
}

main().catch((err) => {
    console.error(`[isolated] ${err.message}`);
    process.exit(1);
});
