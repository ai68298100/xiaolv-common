// 变量填充卡片（R67/F1，质感基准 docs/design/prototype.html 屏 4）：
// 含 {{xlc:ask:…}} 的条目在插入前弹出轻量表单——Enter 插入 / Tab 切字段 / Esc 取消。
// 填充值仅作用于本次插入（草稿不回写库）；同名重复变量只询问一次（listAskFields 已去重）。
// 安全：字段名/选项一律 textContent 注入，绝不 innerHTML。
import {Dialog} from "siyuan";
import {getDialogBody} from "./dialog-dom";
import {AskField, askFieldTag, expandAsks, stripCursorToken} from "../model/variables";
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
    /** 字段初值预填表（字段名 -> 预填值，由记忆表提供，ADR 0074） */
    defaults?: Record<string, string>;
    /** 模板原始内容（用于交互式实时展开预览，G24 / ADR 0076） */
    templateText?: string;
    /** 确认：收集到的填充值（键=字段名；空值字段已由展开层兜底为 __名称__） */
    onConfirm: (fills: Record<string, string>) => void;
    /** 复制：将展开结果直接写入剪贴板并关闭（便于跨窗口粘贴，G49） */
    onCopy?: (fills: Record<string, string>) => void;
    /** 取消/关闭回调（缺省仅销毁） */
    onCancel?: () => void;
}

/**
 * 纯函数：根据当前已收集填充值渲染实时展开预览文本（G24 / ADR 0076）
 * 自动剥离光标标记，纯文本防 XSS，支持超长安全截断
 */
export function renderLivePreviewText(templateText: string, fills: Record<string, string>, maxChars = 1000): string {
    if (!templateText) return "";
    const expanded = stripCursorToken(expandAsks(templateText, fills));
    if (expanded.length > maxChars) {
        return expanded.slice(0, maxChars) + "…";
    }
    return expanded;
}

export function openVariableFillCard(options: VariableFillOptions): void {
    const t = options.t;
    const dialog = new Dialog({
        title: t("varFormTitle"),
        content: "",
        width: "min(440px, 92vw)",
        height: "auto",
        // 所有关闭路径（Esc/scrim）统一走 onCancel：上层搜索弹窗焦点回归（R128）；
        // 按钮确认/取消已自行结算，不在此重复触发（R138 结算语义）
        destroyCallback: () => {
            if (!settled) options.onCancel?.();
        },
    });
    // 原型屏 4：紧凑卡形态，卡头（徽标+标题+Esc 取消）即标题，隐藏宿主标题栏
    const container = dialog.element.querySelector(".b3-dialog__container");
    if (container) container.classList.add("xlc-varform-host");
    const body = getDialogBody(dialog.element);
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
    // textarea→textarea（R160：Enter=换行，插入走按钮/Tab；其余 Enter=插入）
    // wrap 用 label 元素：点字段任意处聚焦输入框，读屏器可朗读字段名（R115）
    // 字段独立成滚动区（R162）：字段多/textarea 高时只滚字段，插入/取消按钮常驻可见
    const inputs: Array<HTMLInputElement | HTMLTextAreaElement> = [];
    const fieldsWrap = document.createElement("div");
    fieldsWrap.className = "xlc-varform-fields";
    for (const [fieldIndex, field] of options.fields.entries()) {
        const wrap = document.createElement("label");
        wrap.className = "xlc-varform-field";
        const label = document.createElement("span");
        label.className = "xlc-varform-label";
        label.textContent = field.name;
        const tag = document.createElement("span");
        tag.className = "xlc-varform-tag";
        tag.textContent = askFieldTag(field);
        label.appendChild(tag);
        wrap.appendChild(label);
        const input = field.kind === "textarea"
            ? document.createElement("textarea")
            : document.createElement("input");
        input.className = "b3-text-field";
        if (field.kind === "textarea") {
            (input as HTMLTextAreaElement).rows = 3;
            (input as HTMLTextAreaElement).setAttribute("spellcheck", "false");
        } else {
            input.setAttribute("enterkeyhint", "done");
        }
        if (field.kind === "date") (input as HTMLInputElement).type = "date";
        if (field.kind === "select") {
            // datalist id 按索引起：字段名安全化后可能碰撞（如「a,b」与「a：b」），错绑候选列表（R138）
            input.setAttribute("list", `xlc-varform-list-${fieldIndex}`);
            const datalist = document.createElement("datalist");
            datalist.id = `xlc-varform-list-${fieldIndex}`;
            for (const opt of field.options) {
                const option = document.createElement("option");
                option.value = opt;
                datalist.appendChild(option);
            }
            wrap.appendChild(datalist);
        }
        input.dataset.xlcVarField = field.name;
        // 初值预填逻辑（ADR 0074）：记忆值优先，无记忆值时回退至模板声明的 defaultValue
        const memoryValue = options.defaults ? options.defaults[field.name] : undefined;
        if (memoryValue !== undefined && memoryValue.length > 0) {
            input.value = memoryValue;
        } else if (field.defaultValue) {
            input.value = field.defaultValue;
        }
        wrap.appendChild(input);

        if (field.kind === "toggle") {
            input.style.display = "none";
            const toggleRow = document.createElement("div");
            toggleRow.className = "xlc-varform-toggle-row";
            const toggleSwitch = document.createElement("input");
            toggleSwitch.type = "checkbox";
            toggleSwitch.className = "b3-switch xlc-varform-toggle";
            const defaultVal = field.defaultValue || "是";
            toggleSwitch.checked = Boolean(input.value && input.value !== "否" && input.value !== "false" && input.value !== "0");
            const toggleHint = document.createElement("span");
            toggleHint.className = "xlc-form-hint";
            toggleHint.textContent = toggleSwitch.checked ? `包含：${defaultVal}` : "关闭：不包含此内容";
            toggleSwitch.addEventListener("change", () => {
                input.value = toggleSwitch.checked ? defaultVal : "";
                toggleHint.textContent = toggleSwitch.checked ? `包含：${defaultVal}` : "关闭：不包含此内容";
                input.dispatchEvent(new Event("input", {bubbles: true}));
                input.dispatchEvent(new Event("change", {bubbles: true}));
            });
            toggleRow.append(toggleSwitch, toggleHint);
            wrap.appendChild(toggleRow);
        }

        // 快捷候选项胶囊行（快速单点填充并联动实时预览，对标移动端与参考图交互 · G45）
        const candidateOptions = new Set<string>();
        if (field.options && Array.isArray(field.options)) {
            for (const opt of field.options) {
                if (opt && opt.trim()) candidateOptions.add(opt.trim());
            }
        }
        if (field.defaultValue && field.defaultValue.trim()) {
            candidateOptions.add(field.defaultValue.trim());
        }
        if (candidateOptions.size > 0) {
            const pillsWrap = document.createElement("div");
            pillsWrap.className = "xlc-varform-quick-options";
            const syncPills = () => {
                pillsWrap.querySelectorAll<HTMLElement>(".xlc-quick-option-pill").forEach((pill) => {
                    pill.classList.toggle("xlc-quick-option-pill--selected", pill.textContent === input.value);
                });
            };
            for (const opt of Array.from(candidateOptions).slice(0, 8)) {
                const optBtn = document.createElement("button");
                optBtn.type = "button";
                optBtn.className = "xlc-quick-option-pill" + (input.value === opt ? " xlc-quick-option-pill--selected" : "");
                optBtn.textContent = opt;
                optBtn.title = `点击填入 "${opt}"`;
                optBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    input.value = opt;
                    input.dispatchEvent(new Event("input", {bubbles: true}));
                    input.dispatchEvent(new Event("change", {bubbles: true}));
                    input.focus();
                });
                pillsWrap.appendChild(optBtn);
            }
            input.addEventListener("input", syncPills);
            input.addEventListener("change", syncPills);
            wrap.appendChild(pillsWrap);
        }

        inputs.push(input);
        fieldsWrap.appendChild(wrap);
    }
    root.appendChild(fieldsWrap);

    const collect = (): Record<string, string> => {
        const fills: Record<string, string> = {};
        for (const input of inputs) {
            const name = input.dataset.xlcVarField ?? "";
            if (name) fills[name] = input.value;
        }
        return fills;
    };

    let previewBox: HTMLElement | null = null;
    let liveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    if (options.templateText) {
        const previewWrap = document.createElement("div");
        previewWrap.className = "xlc-varform-preview-wrap";

        const previewHead = document.createElement("div");
        previewHead.className = "xlc-varform-preview-head";
        previewHead.textContent = "🔍 实时展开预览：";

        previewBox = document.createElement("div");
        previewBox.className = "xlc-varform-preview";
        previewBox.setAttribute("role", "region");
        previewBox.setAttribute("aria-label", "实时展开预览");

        previewWrap.append(previewHead, previewBox);
        root.appendChild(previewWrap);

        const updatePreview = () => {
            if (!previewBox || !options.templateText) return;
            const text = renderLivePreviewText(options.templateText, collect());
            previewBox.textContent = text;
        };

        const scheduleLiveUpdate = () => {
            if (liveDebounceTimer) clearTimeout(liveDebounceTimer);
            liveDebounceTimer = setTimeout(updatePreview, 30);
        };

        // 初始预览渲染
        updatePreview();

        for (const input of inputs) {
            input.addEventListener("input", scheduleLiveUpdate);
            input.addEventListener("change", scheduleLiveUpdate);
        }
    }

    const foot = document.createElement("div");
    foot.className = "xlc-varform-foot";
    const kbdHint = document.createElement("span");
    kbdHint.className = "xlc-varform-hint";
    // 含 textarea 字段时 Enter 语义变化（R160）：提示行如实告知，不沿用「Enter 插入」
    kbdHint.textContent = options.fields.some((f) => f.kind === "textarea") ? t("varFormHintMultiline") : t("varFormHint");
    foot.appendChild(kbdHint);
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.dataset.xlcControl = "variable.cancel";
    cancelBtn.textContent = t("cancel");
    foot.appendChild(cancelBtn);

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "b3-button xlc-btn-ghost";
    resetBtn.dataset.xlcControl = "variable.reset-defaults";
    resetBtn.textContent = "↺ " + (t("resetDefaults") || "恢复默认");
    resetBtn.title = "清空当前输入，恢复所有字段到模板初始默认值";
    resetBtn.addEventListener("click", () => {
        for (const input of inputs) {
            const name = input.dataset.xlcVarField ?? "";
            const field = options.fields.find((f) => f.name === name);
            input.value = field?.defaultValue ?? "";
            input.dispatchEvent(new Event("input", {bubbles: true}));
            input.dispatchEvent(new Event("change", {bubbles: true}));
        }
    });
    foot.appendChild(resetBtn);

    if (options.onCopy) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "b3-button xlc-btn-ghost";
        copyBtn.dataset.xlcControl = "variable.copy";
        copyBtn.textContent = "⧉ " + (t("copy") || "复制");
        copyBtn.title = "将填入变量后的展开结果复制到剪贴板并关闭 (Alt+C)";
        copyBtn.addEventListener("click", () => {
            if (liveDebounceTimer) clearTimeout(liveDebounceTimer);
            if (settled) return;
            settled = true;
            dialog.destroy();
            options.onCopy?.(collect());
        });
        foot.appendChild(copyBtn);
    }

    const insertBtn = document.createElement("button");
    insertBtn.className = "b3-button xlc-btn-primary";
    insertBtn.textContent = t("insert");
    foot.appendChild(insertBtn);
    root.appendChild(foot);

    body.appendChild(root);

    // 结算语义（R138）：按钮确认/取消即「已结算」；未结算时的销毁（Esc/点遮罩）才视为取消。
    // 修复：此前确认路径也会先触发 onCancel、点取消会触发两次（destroyCallback + 显式调用）。
    let settled = false;
    const confirm = (): void => {
        if (liveDebounceTimer) clearTimeout(liveDebounceTimer);
        if (settled) return;
        settled = true;
        dialog.destroy();
        options.onConfirm(collect());
    };
    insertBtn.addEventListener("click", confirm);
    cancelBtn.addEventListener("click", () => {
        if (liveDebounceTimer) clearTimeout(liveDebounceTimer);
        if (settled) return;
        settled = true;
        dialog.destroy();
        options.onCancel?.();
    });
    // Enter=插入（焦点在输入框时）；焦点在按钮上时由原生激活该按钮（取消=取消）
    root.addEventListener("keydown", (ev) => {
        // IME 组合态（中文组词候选未上屏）：Enter 属选词，不得触发插入（对齐 dialog.ts 惯例，R138）
        if (ev.isComposing || (ev as KeyboardEvent).keyCode === 229) return;
        // Ctrl+Enter / Cmd+Enter: 在任何输入控件/多行文本中直接快速确认提交 (G46)
        if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
            ev.preventDefault();
            confirm();
            return;
        }
        // Alt+C / Ctrl+Shift+C: 快捷复制展开结果并关闭 (G49)
        if ((ev.altKey && (ev.key === "c" || ev.key === "C")) || (ev.ctrlKey && ev.shiftKey && (ev.key === "C" || ev.key === "c"))) {
            if (options.onCopy) {
                ev.preventDefault();
                if (liveDebounceTimer) clearTimeout(liveDebounceTimer);
                if (settled) return;
                settled = true;
                dialog.destroy();
                options.onCopy(collect());
                return;
            }
        }
        if (ev.key === "Enter" && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
            if ((ev.target as HTMLElement).tagName === "BUTTON") return;
            // textarea 字段（R160）：Enter=换行，插入只走按钮或 Tab 到按钮后回车
            if ((ev.target as HTMLElement).tagName === "TEXTAREA") return;
            const el = ev.target as HTMLInputElement;
            if (el instanceof HTMLInputElement && el.list) {
                // datalist 高亮项：先让浏览器提交选中值，下一拍再收集（否则采到旧值，R138）
                setTimeout(() => confirm(), 0);
                return;
            }
            ev.preventDefault();
            confirm();
            return;
        }
        if (ev.key === "Tab") {
            const focusables = Array.from(
                root.querySelectorAll<HTMLElement>("input, textarea, button"),
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
    inputs[0]?.focus();
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
        {id: "ask", text: "{{xlc:ask:字段}}"},
        {id: "ask.options", text: "{{xlc:ask:字段|选项A,选项B}}"},
        {id: "ask.textarea", text: "{{xlc:ask:字段|textarea}}"},
        {id: "snippet", text: "{{xlc:snippet:标题}}"},
        {id: "cursor", text: "{{xlc:cursor}}"},
        {id: "date", text: "{{xlc:date}}"},
        {id: "date.offset", text: "{{xlc:date|+3d}}"},
        {id: "random", text: "{{xlc:random|选项A,选项B}}"},
        {id: "doc", text: "{{xlc:doc}}"},
        {id: "clipboard", text: "{{xlc:clipboard}}"},
    ];
    for (const snippet of snippets) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "xlc-varbtn";
        btn.dataset.xlcControl = `capture.variable.${snippet.id}`;
        btn.textContent = snippet.text;
        btn.addEventListener("click", () => {
            const el = getTarget();
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? start;
            el.value = el.value.slice(0, start) + snippet.text + el.value.slice(end);
            const caret = start + snippet.text.length;
            el.focus();
            el.setSelectionRange(caret, caret);
            // 编程赋值不触发 input 事件：派发一次，清除表单的必填红描边等监听态（R138）
            el.dispatchEvent(new Event("input", {bubbles: true}));
        });
        bar.appendChild(btn);
    }
    return bar;
}
