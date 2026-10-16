"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");

// This wraps the test client's actions, never the product's service/editor/DOM.
function guardElectronPage(rawPage, guard, options) {
    assert.equal(typeof guard.reject, "function", "Isolation guard must support sticky page identity failures");
    const expectedWorkspace = path.win32.normalize(options.workspace).toLowerCase();
    const expectedOrigin = new URL(rawPage.url()).origin;
    let pageIdentityDirty = true;
    const proxies = new WeakMap();
    rawPage.on("framenavigated", (frame) => {
        if (frame === rawPage.mainFrame()) {
            pageIdentityDirty = true;
            guard.markDirty("main frame navigated");
        }
    });
    async function before(reason) {
        await guard.verify(reason);
        if (!pageIdentityDirty) return;
        try {
            const url = new URL(rawPage.url());
            assert(["127.0.0.1", "localhost"].includes(url.hostname), "Renderer left loopback");
            assert.equal(url.origin, expectedOrigin, "Renderer changed its kernel origin");
            await rawPage.waitForFunction(() => typeof window.siyuan?.config?.system?.workspaceDir === "string", null, {timeout: 10000});
            const actual = await rawPage.evaluate(() => window.siyuan.config.system.workspaceDir);
            assert.equal(path.win32.normalize(actual).toLowerCase(), expectedWorkspace, "Renderer changed its workspace");
            pageIdentityDirty = false;
        } catch (error) {
            await guard.reject(error, reason);
            throw error;
        }
    }
    function wrap(target, kind) {
        if (!target || typeof target !== "object") return target;
        if (proxies.has(target)) return proxies.get(target);
        const proxy = new Proxy(target, {
            get(object, key) {
                const value = Reflect.get(object, key, object);
                if (kind === "page" && ["keyboard", "mouse", "touchscreen"].includes(key)) return wrap(value, "input");
                if (typeof value !== "function") return value;
                if (key === "then") return value.bind(object);
                if (["on", "once", "off", "removeListener", "removeAllListeners", "url", "isClosed", "mainFrame", "context", "setDefaultTimeout", "setDefaultNavigationTimeout"].includes(key)) return value.bind(object);
                if (["locator", "filter", "first", "last", "nth", "getByRole", "getByText", "getByLabel", "getByPlaceholder", "getByTestId", "getByTitle", "getByAltText", "and", "or"].includes(key)) {
                    return (...args) => wrap(value.apply(object, args), "locator");
                }
                return async (...args) => {
                    await before(`${kind}.${String(key)}`);
                    const result = await value.apply(object, args);
                    if (["reload", "goto", "goBack", "goForward"].includes(key)) await before(`after ${String(key)}`);
                    if (key === "elementHandle") return wrap(result, "handle");
                    if (["all", "elementHandles"].includes(key)) return result.map((entry) => wrap(entry, key === "all" ? "locator" : "handle"));
                    return result;
                };
            },
        });
        proxies.set(target, proxy);
        return proxy;
    }
    return wrap(rawPage, "page");
}

async function watchElectronTargets(browser, guard) {
    const cdp = await browser.newBrowserCDPSession();
    for (const event of ["Target.targetCreated", "Target.targetInfoChanged", "Target.targetDestroyed"]) {
        cdp.on(event, () => guard.markDirty(event));
    }
    await cdp.send("Target.setDiscoverTargets", {discover: true});
    return async () => { await cdp.detach().catch(() => {}); };
}

module.exports = {guardElectronPage, watchElectronTargets};
