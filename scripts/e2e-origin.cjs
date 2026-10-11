"use strict";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function resolveLoopbackOrigin(value, fallback) {
    let url;
    try {
        url = new URL(value || fallback);
    } catch {
        throw new Error("SIYUAN_ORIGIN must be a valid loopback origin");
    }
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!['http:', 'https:'].includes(url.protocol)
        || !LOOPBACK_HOSTS.has(hostname)
        || url.username || url.password
        || url.pathname !== "/" || url.search || url.hash) {
        throw new Error("SIYUAN_ORIGIN must be a plain HTTP(S) loopback origin; API tokens are never sent to remote hosts");
    }
    return url.origin;
}

module.exports = {resolveLoopbackOrigin};
