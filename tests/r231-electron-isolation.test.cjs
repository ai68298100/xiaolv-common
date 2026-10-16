"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const {commandLineArgs, switchValues, inside, validateElectronIsolation, createIsolationGuard} = require("../scripts/electron-isolation.cjs");

const TEMP = "C:\\Users\\Admin\\AppData\\Local\\Temp";
const MIRROR = TEMP + "\\xlc-electron-r226-mirror-20261016061028";
const WORKSPACE = TEMP + "\\xlc-electron-r226-20261016061028";
const EXE = MIRROR + "\\SiYuan.exe";
const KERNEL = MIRROR + "\\resources\\kernel\\SiYuan-Kernel.exe";
const DATE = "2026-10-16T02:00:00.0000000Z";
const options = {workspace: WORKSPACE, mirror: MIRROR, executable: EXE, processId: 36280, cdp: "http://127.0.0.1:9356"};
const resolveExecutable = (value) => value;
function processEntry(id, parent, executable, command, extra = {}) {
    return {ProcessId: id, ParentProcessId: parent, CreationDate: DATE, Name: path.win32.basename(executable), ExecutablePath: executable, CommandLine: command, ...extra};
}
function fixture() {
    return [
        processEntry(100, 0, "C:\\Windows\\explorer.exe", "C:\\Windows\\explorer.exe"),
        processEntry(36280, 100, EXE, `"${EXE}" --workspace="${WORKSPACE}" --port=6856 --remote-debugging-port=9356`),
        processEntry(36281, 36280, EXE, `"${EXE}" --type=utility`),
        processEntry(36282, 36281, EXE, `"${EXE}" --type=renderer`),
        processEntry(36283, 36280, KERNEL, `"${KERNEL}" serve --port 6856 --wd "${MIRROR}\\resources" --attach-ui --workspace "${WORKSPACE}"`),
    ];
}
const validate = (snapshot, overrides = {}, resolver = resolveExecutable) => validateElectronIsolation({...options, ...overrides}, snapshot, {resolveExecutable: resolver});

test("R231 accepts the complete matching browser, renderer and explicit workspace kernel tree", () => {
    const result = validate(fixture());
    assert.deepEqual(result.kernelPids, [36283]);
    assert.deepEqual(result.processes.map((entry) => entry.ProcessId), [36280, 36281, 36282, 36283]);
    assert.equal(result.rootCreationDate, DATE);
    assert.match(result.limitation, /cannot prevent/);
});

test("R231 rejects the incident's extra mirror kernel workspace even outside the root ancestry", () => {
    // Actual incident PID/executable/argv, with an unrelated parent to ensure
    // mirror-wide observation does not accidentally depend on tree membership.
    const incident = processEntry(51040, 99999, KERNEL, `${KERNEL} serve --port 1228 --wd ${MIRROR}\\resources --attach-ui --workspace D:\\SIYUAN`);
    assert.throws(() => validate([...fixture(), incident]), /PID 51040: unexpected kernel\/browser workspace/);
});

test("R231 follows grandchildren and rejects a kernel reached through an intermediate renderer", () => {
    const snapshot = fixture();
    snapshot.push(processEntry(51040, 36282, KERNEL, `"${KERNEL}" serve --workspace D:\\SIYUAN`));
    assert.throws(() => validate(snapshot), /unexpected kernel\/browser workspace/);
});

test("R231 rejects missing, duplicate, relative and misleading workspace arguments", () => {
    const invalid = [
        `"${KERNEL}" serve`,
        `"${KERNEL}" --workspace`,
        `"${KERNEL}" --workspace=`,
        `"${KERNEL}" --workspace relative-dir`,
        `"${KERNEL}" --workspace="${WORKSPACE}" --workspace D:\\SIYUAN`,
        `"${KERNEL}" --workspace D:\\SIYUAN --workspace="${WORKSPACE}"`,
        `"${KERNEL}" --workspace="${WORKSPACE}-other"`,
        `"${KERNEL}" --description "quoted --workspace=${WORKSPACE}"`,
        `"${KERNEL}" --workspace "${WORKSPACE}`,
    ];
    for (const command of invalid) {
        const snapshot = fixture(); snapshot[4].CommandLine = command;
        assert.throws(() => validate(snapshot), undefined, command);
    }
    for (const suffix of [` --workspace D:\\SIYUAN`, ` --remote-debugging-port=9999`]) {
        const snapshot = fixture(); snapshot[1].CommandLine += suffix;
        assert.throws(() => validate(snapshot));
    }
});

test("R231 distinguishes actual switches from quoted text and handles paths containing spaces", () => {
    const command = '"C:\\Temp\\Mirror Name\\SiYuan.exe" "--workspace=C:\\Temp\\Workspace Name" --type renderer --description "quoted --workspace=D:\\SIYUAN"';
    const argv = commandLineArgs(command);
    assert.equal(argv[0], "C:\\Temp\\Mirror Name\\SiYuan.exe");
    assert.deepEqual(switchValues(argv, "workspace"), ["C:\\Temp\\Workspace Name"]);
    assert.deepEqual(switchValues(argv, "type"), ["renderer"]);
    const snapshot = fixture();
    snapshot[4].CommandLine = `"${KERNEL}" --WORKSPACE "${WORKSPACE.toUpperCase()}"`;
    assert.equal(validate(snapshot).kernelPids.length, 1);
});

test("R231 rejects unknown or escaped descendants, mirror helpers and extra browsers", () => {
    const entries = [
        processEntry(51040, 36282, "D:\\Host\\SiYuan-Kernel.exe", '"D:\\Host\\SiYuan-Kernel.exe" --workspace D:\\SIYUAN'),
        processEntry(51040, 36282, MIRROR + "-other\\SiYuan.exe", `"${MIRROR}-other\\SiYuan.exe" --type=renderer`),
        processEntry(51040, 36282, MIRROR + "\\unknown.exe", `"${MIRROR}\\unknown.exe"`),
        processEntry(51040, 99999, EXE, `"${EXE}" --workspace="${WORKSPACE}" --remote-debugging-port=9357`),
        processEntry(51040, 36280, EXE, `"${EXE}" --type=unexpected-type`),
    ];
    for (const entry of entries) assert.throws(() => validate([...fixture(), entry]));
    assert.equal(inside(MIRROR, MIRROR + "-other\\SiYuan.exe"), false);
    assert.throws(() => validate(fixture(), {}, (filename) => filename === KERNEL ? "D:\\Host\\kernel.exe" : filename), /resolved outside the mirror/);
});

test("R231 rejects incomplete inventories, executable mismatch, missing kernel and PID reuse", () => {
    for (const key of ["ExecutablePath", "CommandLine", "CreationDate", "ParentProcessId"]) {
        const snapshot = fixture(); delete snapshot[4][key];
        assert.throws(() => validate(snapshot), undefined, key);
    }
    assert.throws(() => validate([...fixture(), fixture()[4]]), /Duplicate process PID/);
    const wrongExe = fixture(); wrongExe[4].CommandLine = '"D:\\Other\\kernel.exe" --workspace "' + WORKSPACE + '"';
    assert.throws(() => validate(wrongExe), /command executable mismatch/);
    const cycle = fixture(); cycle[1].ParentProcessId = 36282;
    assert.throws(() => validate(cycle), /cyclic process ancestry/);
    assert.throws(() => validate(fixture().filter((entry) => entry.ProcessId !== 36283)), /No explicit, verified workspace kernel/);
    assert.throws(() => validate(fixture(), {rootCreationDate: "2026-10-16T01:59:59Z"}), /Browser PID was reused/);
    assert.throws(() => validate(fixture().filter((entry) => entry.ProcessId !== 36280)), /browser process disappeared/);
});

test("R231 ignores unrelated ordinary workspaces without reading or controlling them", () => {
    const unrelated = processEntry(51040, 100, "D:\\InstalledSiYuan\\resources\\kernel\\SiYuan-Kernel.exe", '"D:\\InstalledSiYuan\\resources\\kernel\\SiYuan-Kernel.exe" --workspace D:\\SIYUAN');
    assert.equal(validate([...fixture(), unrelated]).processes.length, 4);
});

test("R231 guard caches scans, refreshes on target dirty/force and refuses every action after a violation", async () => {
    let snapshot = fixture();
    let scans = 0;
    let disconnects = 0;
    const evidence = [];
    const guard = createIsolationGuard(options, {resolveExecutable, maxAgeMs: 10000,
        readProcesses: () => { scans++; return snapshot; },
        onVerified: (value) => evidence.push(value),
        onViolation: () => { disconnects++; },
    });
    await guard.verify("before-cdp", {force: true});
    await guard.verify("cached-step");
    assert.equal(scans, 1);
    guard.markDirty("targetCreated");
    await guard.verify("target-action");
    assert.equal(scans, 2);
    await guard.verify("critical-write", {force: true});
    assert.equal(scans, 3);
    snapshot = [...fixture(), processEntry(51040, 99999, KERNEL, `"${KERNEL}" --workspace D:\\SIYUAN`)];
    guard.markDirty("targetCreated");
    await assert.rejects(() => guard.verify("next-action"), /unexpected kernel\/browser workspace/);
    assert.equal(guard.failed, true);
    assert.equal(guard.failure.code, "XLC_ELECTRON_ISOLATION_VIOLATION");
    assert.equal(disconnects, 1);
    snapshot = fixture();
    await assert.rejects(() => guard.verify("must-not-resume", {force: true}), /unexpected kernel\/browser workspace/);
    assert.equal(scans, 4);
    assert.equal(evidence.length, 3);
    assert.equal(disconnects, 1);
});

test("R231 guard rechecks the pinned root creation time after attachment and inventory failures fail closed", async () => {
    let snapshot = fixture();
    const guard = createIsolationGuard(options, {resolveExecutable, readProcesses: () => snapshot});
    await guard.verify("before-cdp", {force: true});
    snapshot = fixture(); snapshot[1].CreationDate = "2026-10-16T03:00:00Z";
    await assert.rejects(() => guard.verify("after-cdp", {force: true}), /Browser PID was reused/);
    const denied = createIsolationGuard(options, {readProcesses: () => { throw new Error("CIM access denied"); }});
    await assert.rejects(() => denied.verify("before-cdp"), /CIM access denied/);
    assert.equal(denied.failed, true);
});

test("R231 explicit renderer rejection is sticky before disconnect and prevents subsequent process or page operations", async () => {
    let scans = 0;
    let violations = 0;
    const guard = createIsolationGuard(options, {resolveExecutable,
        readProcesses: () => { scans++; return fixture(); },
        onViolation: () => { violations++; assert.equal(guard.failed, true); },
    });
    await guard.verify("before-renderer");
    await assert.rejects(() => guard.reject(new Error("Renderer workspace changed to an unknown workspace"), "navigation"), /Renderer workspace changed/);
    await assert.rejects(() => guard.verify("must-not-query-renderer", {force: true}), /Renderer workspace changed/);
    assert.equal(scans, 1);
    assert.equal(violations, 1);
});
