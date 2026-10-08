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
