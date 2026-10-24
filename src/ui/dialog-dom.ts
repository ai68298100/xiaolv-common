/**
 * SiYuan 弹窗内容容器兼容层（R142 P0）。
 * 真实 v3.8.x 前端的 Dialog 内容容器是 .b3-dialog__body（旧版为 .b3-dialog__content）。
 * 此前全部弹窗用单一选择器查询，真实前端查不到即静默空壳——真机验收（R142）坐实。
 * 规则：一律经由本函数取挂载点；stub-dom 已对齐真实 __body 结构。
 */
export function getDialogBody(root: HTMLElement | Document): HTMLElement | null {
    return root.querySelector<HTMLElement>(".b3-dialog__body")
        ?? root.querySelector<HTMLElement>(".b3-dialog__content");
}

/**
 * 给思源原生 Dialog 标题栏装配统一的品牌标题栏规范（.lv-dialog-title-wrap）。
 * 包含 22×22 帝王紫底白标 + 标题 + 版本胶囊，重复调用保持幂等。
 */
export function mountPlatformDialogTitleWrap(
    dialogElement: HTMLElement | null | undefined,
    titleText: string,
    badgeText = "v0.7.0",
    iconName = "iconXlcCommon",
): HTMLElement | null {
    if (!dialogElement || typeof dialogElement.querySelector !== "function") return null;
    const header = dialogElement.querySelector(".b3-dialog__header");
    const titleEl = header?.querySelector(".b3-dialog__title");
    if (!header || !titleEl) return null;
    const existing = header.querySelector(".lv-dialog-title-wrap") as HTMLElement | null;
    if (existing) return existing;

    const wrap = document.createElement("div");
    wrap.className = "lv-dialog-title-wrap";
    const iconSpan = document.createElement("span");
    iconSpan.className = "lv-dialog-title-icon";
    iconSpan.innerHTML = `<svg><use xlink:href="#${iconName || "iconXlcCommon"}"></use></svg>`;
    const titleSpan = document.createElement("span");
    titleSpan.className = "lv-dialog-title-text";
    titleSpan.textContent = titleText || "";
    wrap.append(iconSpan, titleSpan);
    if (badgeText) {
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "lv-dialog-title-pill";
        badgeSpan.textContent = badgeText;
        wrap.appendChild(badgeSpan);
    }
    titleEl.textContent = "";
    titleEl.appendChild(wrap);
    return wrap;
}
