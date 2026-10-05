// 测试专用 siyuan 桩件：仅提供被测代码引用的运行时符号，不做任何真实行为。
// 真实宿主行为不在单测里冒充（验收走真实思源 E2E）。
"use strict";
module.exports = {
    getActiveEditor: () => null,
    openTab: () => {},
    Dialog: class {
        constructor() {}
        destroy() {}
        element() {}
    },
    confirm: () => {},
    showMessage: () => {},
    fetchSyncPost: async () => ({code: -1, msg: "stub", data: null}),
};
