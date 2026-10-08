// 渲染 harness 的 siyuan 桩件：Dialog 桩构建与宿主一致的类名结构
// （.b3-dialog > .b3-dialog__container > .b3-dialog__body + .b3-dialog__header，对齐真实 v3.8.6），
// 使生产 dialog.ts 的 DOM 装配代码原样执行。
"use strict";

class StubDialog {
    constructor(options) {
        this.options = options || {};
        const root = document.createElement("div");
        root.className = "b3-dialog";
        root.style.position = "fixed";
        root.style.inset = "0";
        root.style.zIndex = "100";
        const container = document.createElement("div");
        container.className = "b3-dialog__container";
        if (this.options.width) container.style.width = this.options.width;
        if (this.options.height) container.style.height = this.options.height;
        container.style.margin = "40px auto";
        const title = document.createElement("div");
        title.className = "b3-dialog__header";
        title.textContent = this.options.title || "";
        const content = document.createElement("div");
        content.className = "b3-dialog__body"; // R142：对齐真实 v3.8.6 Dialog 结构（无 __content）
        container.appendChild(title);
        container.appendChild(content);
        root.appendChild(container);
        this.element = root;
        this.containerElement = container;
        // harness：自挂载（生产宿主负责挂载；此处使 querySelector 可见）
        document.body.appendChild(root);
    }

    open() {
        if (typeof this.options.destroyCallback !== "function") return;
        this._destroy = () => {
            this.element.remove();
            this.options.destroyCallback();
        };
    }

    destroy() {
        if (this._destroy) this._destroy();
        else if (this.element) this.element.remove();
    }
}

module.exports = {
    Dialog: StubDialog,
    confirm: () => {},
    showMessage: () => {},
    getActiveEditor: () => null,
    openTab: () => {},
    fetchSyncPost: async () => ({code: -1, msg: "stub", data: null}),
};
