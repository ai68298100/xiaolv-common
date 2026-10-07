// 变量填充卡片（R67/F1，质感基准 docs/design/prototype.html 屏 4）：
// 含 {{xlc:ask:…}} 的条目在插入前弹出轻量表单——Enter 插入 / Tab 切字段 / Esc 取消。
// 填充值仅作用于本次插入（草稿不回写库）；同名重复变量只询问一次（listAskFields 已去重）。
// 安全：字段名/选项一律 textContent 注入，绝不 innerHTML。
import {Dialog} from "siyuan";
import {AskField} from "../model/variables";
import {ItemType} from "../model/item";

const TYPE_BADGES: Partial<Record<ItemType, string>> = {
    text: "TXT", markdown: "MD", url: "URL", code: "CODE",
    image: "IMG", asset: "FILE", blockref: "REF", structure: "BLK",
};

export interface VariableFillOptions {
    t: (key: string, ...args: string[]) => string;
    itemType: ItemType;
    title: string;
    fields: AskField[];
    /** 确认：收集到的填充值（键=字段名；空值字段已由展开层兜底为 __名称__） */
    onConfirm: (fills: Record<string, string>) => void;
    /** 取消/关闭回调（缺省仅销毁） */
    onCancel?: () => void;
}

export function openVariableFillCard(options: VariableFillOptions): void {
    const t = options.t;
    const dialog = new Dialog({
        title: t("varFormTitle"),
        content: "",
        width: "min(360px, 92vw)",
        height: "auto",
    });
    // 原型屏 4：紧凑卡形态，卡头（徽标+标题+Esc 取消）即标题，隐藏宿主标题栏
    const container = dialog.element.querySelector(".b3-dialog__container");
    if (container) container.classList.add("xlc-varform-host");
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-varform";

    // 头部：类型徽标 + 条目标题 + Esc 提示
    const head = document.createElement("div");
    head.className = "xlc-varform-head";
    const badge = document.createElement("span");
    badge.className = "xlc-badge xlc-badge--markdown";
    badge.textContent = TYPE_BADGES[options.itemType] ?? "TXT";
    head.appendChild(badge);
    const title = document.createElement("span");
    title.className = "xlc-varform-title";
    title.textContent = options.title || t("unknownType");
    head.appendChild(title);
    const escHint = document.createElement("span");
    escHint.className = "xlc-kbd";
    escHint.textContent = "Esc " + t("cancel");
    head.appendChild(escHint);
    root.appendChild(head);

    const sub = document.createElement("div");
    sub.className = "xlc-varform-sub";
    sub.textContent = t("varFormSub", String(options.fields.length));
    root.appendChild(sub);

    // 字段区：text→input / select→input+datalist（↑↓ 选择，保键盘一致） / date→input[type=date]
    const inputs: HTMLInputElement[] = [];
    for (const field of options.fields) {
        const wrap = document.createElement("div");
        wrap.className = "xlc-varform-field";
        const label = document.createElement("label");
        label.className = "xlc-varform-label";
        label.textContent = field.name;
        const tag = document.createElement("span");
        tag.className = "xlc-varform-tag";
        tag.textContent = field.kind === "text"
            ? `{{xlc:ask:${field.name}}}`
            : `{{xlc:ask:${field.name}${field.kind === "date" ? "|date" : "|" + field.options.join(",")}}}`;
        label.appendChild(tag);
        wrap.appendChild(label);
        const input = document.createElement("input");
        input.className = "b3-text-field";
        input.setAttribute("enterkeyhint", "done");
        if (field.kind === "date") input.type = "date";
        if (field.kind === "select") {
            input.setAttribute("list", `xlc-varform-list-${safeListId(field.name)}`);
            const datalist = document.createElement("datalist");
            datalist.id = `xlc-varform-list-${safeListId(field.name)}`;
            for (const opt of field.options) {
                const option = document.createElement("option");
                option.value = opt;
                datalist.appendChild(option);
            }
            wrap.appendChild(datalist);
        }
        input.dataset.xlcVarField = field.name;
        wrap.appendChild(input);
        inputs.push(input);
        root.appendChild(wrap);
    }

    const foot = document.createElement("div");
    foot.className = "xlc-varform-foot";
    const kbdHint = document.createElement("span");
    kbdHint.className = "xlc-varform-hint";
    kbdHint.textContent = t("varFormHint");
    foot.appendChild(kbdHint);
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.textContent = t("cancel");
    foot.appendChild(cancelBtn);
    const insertBtn = document.createElement("button");
    insertBtn.className = "b3-button xlc-btn-primary";
    insertBtn.textContent = t("insert");
    foot.appendChild(insertBtn);
    root.appendChild(foot);

    body.appendChild(root);

    const collect = (): Record<string, string> => {
        const fills: Record<string, string> = {};
        for (const input of inputs) {
            const name = input.dataset.xlcVarField ?? "";
            if (name) fills[name] = input.value;
        }
        return fills;
    };
    const confirm = (): void => {
        dialog.destroy();
        options.onConfirm(collect());
    };
    insertBtn.addEventListener("click", confirm);
    cancelBtn.addEventListener("click", () => {
        dialog.destroy();
        options.onCancel?.();
    });
    // Enter=插入（焦点在输入框时）；焦点在按钮上时由原生激活该按钮（取消=取消）
    root.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
            if ((ev.target as HTMLElement).tagName === "BUTTON") return;
            ev.preventDefault();
            confirm();
            return;
        }
        if (ev.key === "Tab") {
            const focusables = Array.from(
                root.querySelectorAll<HTMLElement>("input, button"),
            ).filter((el) => !el.hasAttribute("disabled"));
            if (focusables.length === 0) return;
            const index = focusables.indexOf(document.activeElement as HTMLElement);
            ev.preventDefault();
            const next = ev.shiftKey
                ? (index - 1 + focusables.length) % focusables.length
                : (index + 1) % focusables.length;
            focusables[next]?.focus();
        }
    });
    dialog.element.addEventListener("click", (ev) => {
        // 宿主 scrim 点击关闭时补 onCancel（destroyCallback 无法区分来源，统一挂一次性）
        if ((ev.target as HTMLElement).classList.contains("b3-dialog__scrim")) options.onCancel?.();
    }, {once: true});
    inputs[0]?.focus();
}

/** datalist id 安全化（字段名来自内容文本；仅用作 DOM id） */
function safeListId(name: string): string {
    return name.replace(/[^0-9a-zA-Z\u4e00-\u9fa5_-]/g, "").slice(0, 24) || "f";
}

/** 变量快捷插入条（F1 创作侧，原型屏 3）：点选在目标 textarea 光标处插入变量语法。捕获与编辑弹窗共用。 */
export function buildVariableBar(t: (key: string, ...args: string[]) => string, getTarget: () => HTMLTextAreaElement): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "xlc-varbar";
    const cap = document.createElement("span");
    cap.className = "xlc-varbar-cap";
    cap.textContent = t("insertVariable");
    bar.appendChild(cap);
    const snippets = [
        "{{xlc:ask:字段}}",
        "{{xlc:ask:字段|选项A,选项B}}",
        "{{xlc:snippet:标题}}",
        "{{xlc:cursor}}",
        "{{xlc:date}}",
        "{{xlc:doc}}",
        "{{xlc:clipboard}}",
    ];
    for (const snippet of snippets) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "xlc-varbtn";
        btn.textContent = snippet;
        btn.addEventListener("click", () => {
            const el = getTarget();
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? start;
            el.value = el.value.slice(0, start) + snippet + el.value.slice(end);
            const caret = start + snippet.length;
            el.focus();
            el.setSelectionRange(caret, caret);
        });
        bar.appendChild(btn);
    }
    return bar;
}
