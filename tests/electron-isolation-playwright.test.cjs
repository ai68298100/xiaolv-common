"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {guardElectronPage, watchElectronTargets} = require("../scripts/electron-isolation-playwright.cjs");

function fixture() {
    const workspace = "C:\\Temp\\xlc-electron-fixture";
    const state = {workspace, url: "https://127.0.0.1:6856/stage/build/app/", actions: [], verified: [], listeners: {}, dirty: 0};
    const guard = {
        failed: false, failure: null,
        markDirty() { state.dirty++; },
        async verify(reason) { state.verified.push(reason); if (this.failed) throw this.failure; },
        async reject(error) { this.failed = true; this.failure = error; throw error; },
    };
    const frame = {};
    const locator = {
        filter() { return this; }, first() { return this; },
        async click() { state.actions.push("click"); },
        async fill(value) { state.actions.push(`fill:${value}`); },
    };
    const rawPage = {
        on(name, listener) { state.listeners[name] = listener; },
        url() { return state.url; }, mainFrame() { return frame; },
        locator() { return locator; },
        async waitForFunction() {},
        async evaluate() { return state.workspace; },
        async screenshot() { state.actions.push("screenshot"); },
        async reload() { state.actions.push("reload"); state.listeners.framenavigated(frame); },
        keyboard: {async press(key) { state.actions.push(`press:${key}`); }},
    };
    return {state, guard, rawPage, page: guardElectronPage(rawPage, guard, {workspace})};
}

test("guarded locator chains and keyboard verify before actual client actions", async () => {
    const {state, page} = fixture();
    await page.locator("button").filter({hasText: "Insert"}).first().click();
    await page.keyboard.press("Escape");
    assert.deepEqual(state.actions, ["click", "press:Escape"]);
    assert(state.verified.includes("locator.click"));
    assert(state.verified.includes("input.press"));
});

test("a later process violation blocks already captured locators and screenshots", async () => {
    const {state, guard, page} = fixture();
    const saved = page.locator("button");
    await saved.click();
    guard.failure = new Error("unexpected daily workspace kernel");
    guard.failed = true;
    await assert.rejects(saved.click(), /unexpected daily workspace/);
    await assert.rejects(page.screenshot(), /unexpected daily workspace/);
    assert.deepEqual(state.actions, ["click"]);
});

test("renderer workspace change on navigation is sticky and prevents later UI", async () => {
    const {state, guard, rawPage, page} = fixture();
    await page.locator("button").click();
    rawPage.reload = async () => {
        state.actions.push("reload");
        state.workspace = "D:\\SIYUAN";
        state.listeners.framenavigated(rawPage.mainFrame());
    };
    await assert.rejects(page.reload(), /Renderer changed its workspace/);
    assert.equal(guard.failed, true);
    state.workspace = "C:\\Temp\\xlc-electron-fixture";
    await assert.rejects(page.locator("button").click(), /Renderer changed its workspace/);
    assert.deepEqual(state.actions, ["click", "reload"]);
});

test("a kernel origin change on navigation is rejected before further page evaluation", async () => {
    const {state, guard, rawPage, page} = fixture();
    await page.locator("button").click();
    rawPage.reload = async () => {
        state.url = "https://127.0.0.1:1228/stage/build/app/";
        state.listeners.framenavigated(rawPage.mainFrame());
    };
    await assert.rejects(page.reload(), /Renderer changed its kernel origin/);
    assert.equal(guard.failed, true);
    assert.deepEqual(state.actions, ["click"]);
});

test("CDP target changes invalidate the process cache and watcher disposal only detaches", async () => {
    const events = {};
    const calls = [];
    let dirty = 0;
    const detach = await watchElectronTargets({async newBrowserCDPSession() {
        return {on(name, callback) { events[name] = callback; }, async send(name) { calls.push(name); }, async detach() { calls.push("detach"); }};
    }}, {markDirty() { dirty++; }});
    events["Target.targetCreated"]();
    events["Target.targetInfoChanged"]();
    assert.equal(dirty, 2);
    await detach();
    assert.deepEqual(calls, ["Target.setDiscoverTargets", "detach"]);
});
