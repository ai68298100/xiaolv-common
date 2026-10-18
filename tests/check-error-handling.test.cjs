const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "check-error-handling.cjs");

test("异常处理门禁：源码通过且注入旧模式时确实失败", () => {
    const clean = execFileSync(process.execPath, [SCRIPT], {cwd: ROOT, encoding: "utf8"});
    assert.match(clean, /未发现不安全/);

    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "xiaolv-error-gate-"));
    try {
        const source = path.join(temp, "src");
        fs.mkdirSync(source, {recursive: true});
        fs.writeFileSync(path.join(source, "bad.ts"), [
            "export function bad(error: unknown, cause: unknown): string {",
            "    const cast = (error as Error)?.message;",
            "    const ternary = error instanceof Error ? error.message : String(error);",
            "    const objectCast = (cause as {message?: unknown}).message;",
            "    const nameCast = (cause as {name?: unknown})?.name;",
            "    // (ignored as Error).message should not be reported from comments",
            "    return String(cast ?? ternary ?? objectCast ?? nameCast);",
            "}",
        ].join("\n"));
        assert.throws(
            () => execFileSync(process.execPath, [SCRIPT, "--root", temp], {cwd: ROOT, encoding: "utf8", stdio: "pipe"}),
            (error) => error
                && error.status === 1
                && /unsafe Error cast message access/.test(error.stderr)
                && /duplicated Error\/string ternary/.test(error.stderr)
                && /unsafe cast message access/.test(error.stderr)
                && /unsafe cast name access/.test(error.stderr),
        );
    } finally {
        fs.rmSync(temp, {recursive: true, force: true});
    }
});
