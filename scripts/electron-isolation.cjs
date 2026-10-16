"use strict";
// Observation guard, not an OS security boundary. OS-level isolation plus
// dedicated host config/profile is still required before further host runs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

function windowsPath(value) {
    assert(typeof value === "string" && value.length && !value.includes("\0"), "Missing or invalid Windows path");
    assert(path.win32.isAbsolute(value) && !/^\\\\[?.]\\/.test(value), "Expected an ordinary absolute Windows path");
    return path.win32.normalize(value).replace(/\\+$/, "").toLowerCase();
}

function inside(directory, filename) {
    const relative = path.win32.relative(windowsPath(directory), windowsPath(filename));
    return Boolean(relative && relative !== ".." && !relative.startsWith("..\\") && !path.win32.isAbsolute(relative));
}

// Windows argv quoting rules: a run of backslashes only escapes an immediately
// following quote. Quoted whole switches and --workspace "path with spaces" work.
function commandLineArgs(command) {
    assert(typeof command === "string" && command.trim() && !command.includes("\0"), "Unreadable process command line");
    const argv = [];
    let value = "";
    let quoted = false;
    let active = false;
    for (let index = 0; index < command.length; index++) {
        const char = command[index];
        if (char === "\\") {
            let count = 1;
            while (command[index + count] === "\\") count++;
            if (command[index + count] === '"') {
                value += "\\".repeat(Math.floor(count / 2));
                if (count % 2) value += '"';
                else quoted = !quoted;
                index += count;
            } else {
                value += "\\".repeat(count);
                index += count - 1;
            }
            active = true;
        } else if (char === '"') {
            quoted = !quoted;
            active = true;
        } else if (/\s/.test(char) && !quoted) {
            if (active) { argv.push(value); value = ""; active = false; }
        } else { value += char; active = true; }
    }
    assert.equal(quoted, false, "Unterminated quote in process command line");
    if (active) argv.push(value);
    assert(argv.length && argv[0], "Missing process executable argument");
    return argv;
}

function switchValues(argv, name) {
    const prefix = `--${name.toLowerCase()}`;
    const values = [];
    for (let index = 1; index < argv.length; index++) {
        const lower = argv[index].toLowerCase();
        if (lower === prefix) {
            assert(argv[index + 1] && !argv[index + 1].startsWith("--"), `Missing ${prefix} value`);
            values.push(argv[++index]);
        } else if (lower.startsWith(prefix + "=")) {
            assert(argv[index].slice(prefix.length + 1), `Missing ${prefix} value`);
            values.push(argv[index].slice(prefix.length + 1));
        }
    }
    return values;
}

function readWindowsProcessSnapshot() {
    assert.equal(process.platform, "win32", "Electron isolation observation requires Windows");
    const script = "$ErrorActionPreference = 'Stop'; @(Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{ ProcessId = $_.ProcessId; ParentProcessId = $_.ParentProcessId; Name = $_.Name; ExecutablePath = $_.ExecutablePath; CommandLine = $_.CommandLine; CreationDate = if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { $null } } }) | ConvertTo-Json -Depth 3 -Compress";
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {encoding: "utf8", timeout: 15000, maxBuffer: 16 * 1024 * 1024});
    const result = JSON.parse(output);
    assert(Array.isArray(result) && result.length, "Process inventory unavailable");
    return result;
}

function validateElectronIsolation(options, snapshot, {resolveExecutable} = {}) {
    assert(Array.isArray(snapshot) && snapshot.length, "Process inventory unavailable");
    const workspace = windowsPath(options.workspace);
    const mirror = windowsPath(options.mirror);
    const executable = windowsPath(options.executable || path.win32.join(mirror, "SiYuan.exe"));
    const cdpPort = new URL(options.cdp).port;
    assert(inside(mirror, executable), "Electron executable must be inside the expected mirror");
    assert(Number.isSafeInteger(options.processId) && options.processId > 0, "Missing expected browser PID");
    const byId = new Map();
    for (const entry of snapshot) {
        assert(Number.isSafeInteger(entry.ProcessId) && entry.ProcessId >= 0 && Number.isSafeInteger(entry.ParentProcessId) && entry.ParentProcessId >= 0, "Incomplete process tree inventory");
        assert(!byId.has(entry.ProcessId), `Duplicate process PID ${entry.ProcessId}`);
        byId.set(entry.ProcessId, entry);
    }
    const root = byId.get(options.processId);
    assert(root, "Expected Electron browser process disappeared");
    const descendantIds = new Set([options.processId]);
    for (let changed = true; changed;) {
        changed = false;
        for (const entry of snapshot) if (descendantIds.has(entry.ParentProcessId) && !descendantIds.has(entry.ProcessId)) {
            descendantIds.add(entry.ProcessId); changed = true;
        }
    }
    // Include all processes from this mirror, even if their parent has exited or
    // is unrelated to this browser. This is what catches the R231 extra kernel.
    const scoped = snapshot.filter((entry) => descendantIds.has(entry.ProcessId)
        || (entry.ExecutablePath && inside(mirror, entry.ExecutablePath)));
    assert(scoped.length, "No observable mirror process tree");
    const kernels = [];
    for (const entry of scoped) {
        const label = `PID ${entry.ProcessId}`;
        assert(entry.ExecutablePath && entry.CommandLine && entry.CreationDate, `${label}: incomplete process identity`);
        assert(inside(mirror, entry.ExecutablePath), `${label}: descendant executable escaped the mirror`);
        if (resolveExecutable) assert(inside(mirror, resolveExecutable(entry.ExecutablePath)), `${label}: executable resolved outside the mirror`);
        const argv = commandLineArgs(entry.CommandLine);
        assert.equal(windowsPath(argv[0]), windowsPath(entry.ExecutablePath), `${label}: command executable mismatch`);
        const workspaces = switchValues(argv, "workspace");
        const types = switchValues(argv, "type");
        const relativeExe = path.win32.relative(mirror, windowsPath(entry.ExecutablePath));
        const kernel = /^resources\\kernel\\(?:siyuan-kernel|siyuan)\.exe$/.test(relativeExe);
        assert(workspaces.length <= 1, `${label}: duplicate workspace switches`);
        if (workspaces.length) assert.equal(windowsPath(workspaces[0]), workspace, `${label}: unexpected kernel/browser workspace`);
        if (kernel) {
            assert.equal(workspaces.length, 1, `${label}: kernel requires one explicit workspace`);
            assert.equal(types.length, 0, `${label}: kernel has unexpected Electron type`);
            kernels.push(entry);
        } else if (entry.ProcessId === options.processId) {
            assert.equal(windowsPath(entry.ExecutablePath), executable, "Browser executable identity changed");
            assert.equal(workspaces.length, 1, "Browser requires one explicit workspace");
            assert.equal(types.length, 0, "Expected browser process, not an Electron child");
            assert.deepEqual(switchValues(argv, "remote-debugging-port"), [cdpPort], "Browser CDP port must be unique and exact");
            if (options.rootCreationDate) assert.equal(entry.CreationDate, options.rootCreationDate, "Browser PID was reused");
        } else {
            assert.equal(windowsPath(entry.ExecutablePath), executable, `${label}: unknown mirror descendant executable`);
            assert.equal(types.length, 1, `${label}: extra browser or unknown helper`);
            assert(["renderer", "gpu-process", "utility", "crashpad-handler", "zygote"].includes(types[0]), `${label}: unknown Electron process type`);
        }
        const visited = new Set([entry.ProcessId]);
        let ancestor = entry;
        while (byId.has(ancestor.ParentProcessId) && ancestor.ParentProcessId !== 0) {
            assert(!visited.has(ancestor.ParentProcessId), `${label}: cyclic process ancestry`);
            visited.add(ancestor.ParentProcessId);
            ancestor = byId.get(ancestor.ParentProcessId);
        }
    }
    assert(kernels.length >= 1, "No explicit, verified workspace kernel in the mirror process inventory");
    return {
        observedAt: new Date().toISOString(), processId: root.ProcessId, rootCreationDate: root.CreationDate,
        mirror, workspace, kernelPids: kernels.map((entry) => entry.ProcessId),
        processes: scoped.map((entry) => ({...entry, descendant: descendantIds.has(entry.ProcessId)})),
        limitation: "A process snapshot detects observed violations; it cannot prevent the host from starting a different workspace between checks. Use OS-level isolation plus dedicated host config/profile before further host acceptance.",
    };
}

function createIsolationGuard(options, {readProcesses = readWindowsProcessSnapshot, onVerified = () => {}, onViolation = () => {}, maxAgeMs = 2000, resolveExecutable = fs.realpathSync} = {}) {
    assert(Number.isFinite(maxAgeMs) && maxAgeMs >= 0 && maxAgeMs <= 10000, "Invalid isolation observation interval");
    let dirty = true;
    let lastVerified = 0;
    let identity;
    let failure;
    let inFlight;
    async function reject(error, reason) {
        if (!failure) {
            error = error instanceof Error ? error : new Error(String(error));
            error.code = "XLC_ELECTRON_ISOLATION_VIOLATION";
            failure = error;
            try { await onViolation(error, reason); } catch { /* Keep the first isolation failure authoritative. */ }
        }
        throw failure;
    }
    return {
        get failed() { return Boolean(failure); },
        get failure() { return failure; },
        get identity() { return identity; },
        markDirty() { dirty = true; },
        reject,
        async verify(reason, {force = false} = {}) {
            if (failure) throw failure;
            if (!force && !dirty && Date.now() - lastVerified < maxAgeMs) return identity;
            if (inFlight) await inFlight;
            if (failure) throw failure;
            if (!force && !dirty && Date.now() - lastVerified < maxAgeMs) return identity;
            inFlight = (async () => {
                try {
                    dirty = false;
                    identity = validateElectronIsolation({...options, rootCreationDate: identity?.rootCreationDate || options.rootCreationDate}, await readProcesses(), {resolveExecutable});
                    lastVerified = Date.now();
                    await onVerified({...identity, reason});
                    return identity;
                } catch (error) {
                    return reject(error, reason);
                }
            })();
            try { return await inFlight; } finally { inFlight = null; }
        },
    };
}

module.exports = {windowsPath, inside, commandLineArgs, switchValues, readWindowsProcessSnapshot, validateElectronIsolation, createIsolationGuard};
