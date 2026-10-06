// 宿主执行层：把 planAction 的纯计划执行到思源（protyle.insert / clipboard / openTab）。
// 每个动作返回诚实回执；降级路径明示；不伪造成功。
import type {App} from "siyuan";
import {getActiveEditor, openTab} from "siyuan";
import {EVENTS} from "../constants";
import {ActionContext, InsertMode, InsertPlan, OpenTarget, planAction, planOpenSource} from "../model/actions";
import {applyPlaceholders} from "../model/placeholders";
import {applyAskDefaults, expandAsks, stripCursorToken} from "../model/variables";
import {CommonItem} from "../model/item";
import {LibraryService, Receipt, SourceHealth} from "./library";

/** 占位符应用钩子：由入口注入（读设置 + 当前时间 + 当前文档 + 剪贴板）；未注入则原样保留 */
export interface IPlaceholderHook {
    enabled(): boolean;
    now(): Date;
    /** 当前文档（{{xlc:title}}/{{xlc:doc}}/{{xlc:path}}）；无活动文档返回 null */
    currentDoc(): Promise<{title: string; path: string} | null>;
    /** 系统剪贴板文本（{{xlc:clipboard}}）；读取失败/拒绝返回空串（语义同无文档） */
    clipboard?(): Promise<string>;
}

export interface IHostBridge {
    /** 桌面端活动编辑器是否存在（getActiveEditor 官方 API） */
    hasActiveEditor(): boolean;
    /** 在活动编辑器光标处插入 markdown 块 */
    insertMarkdown(markdown: string): boolean;
    /** 系统剪贴板写文本 */
    writeClipboard(text: string): Promise<boolean>;
    /** 打开文档/块（openTab） */
    openDoc(docId: string, blockId?: string): boolean;
    /** 打开资源（openTab asset） */
    openAsset(assetPath: string): boolean;
    /** 外部 URL */
    openExternal(url: string): boolean;
    /** 当前文档 ID（relink 用） */
    currentDocId(): string | null;
    isMobile(): boolean;
}

export class HostBridge implements IHostBridge {
    constructor(private readonly app: App) {}

    isMobile(): boolean {
        return (window.siyuan?.mobile as unknown) === true || document.body.classList.contains("body--mobile");
    }

    hasActiveEditor(): boolean {
        try {
            return !!getActiveEditor();
        } catch {
            return false;
        }
    }

    insertMarkdown(markdown: string): boolean {
        try {
            const editor = getActiveEditor();
            if (!editor) return false;
            editor.insert(markdown, true, false);
            return true;
        } catch {
            return false;
        }
    }

    async writeClipboard(text: string): Promise<boolean> {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {
            // 落到 execCommand 降级
        }
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            const okFlag = document.execCommand("copy");
            ta.remove();
            return okFlag;
        } catch {
            return false;
        }
    }

    openDoc(docId: string, blockId?: string): boolean {
        try {
            openTab({
                app: this.app,
                doc: blockId ? {id: blockId} : {id: docId},
            });
            return true;
        } catch {
            return false;
        }
    }

    openAsset(assetPath: string): boolean {
        try {
            openTab({app: this.app, asset: {path: assetPath}});
            return true;
        } catch {
            return false;
        }
    }

    openExternal(url: string): boolean {
        try {
            // 仅 http/https；其余协议拒绝（安全边界）
            if (!/^https?:\/\//i.test(url)) return false;
            window.open(url, "_blank", "noopener");
            return true;
        } catch {
            return false;
        }
    }

    currentDocId(): string | null {
        try {
            const editor = getActiveEditor();
            const rootID = editor?.protyle?.block?.rootID;
            return typeof rootID === "string" && rootID.length > 0 ? rootID : null;
        } catch {
            return null;
        }
    }
}

export interface ExecutionReceipt {
    ok: boolean;
    mode: InsertMode | "open-source";
    message: string;
    downgraded: boolean;
    pendingVerification: string[];
}

export class ActionExecutor {
    constructor(
        private readonly library: LibraryService,
        private readonly host: IHostBridge,
        private readonly notify: (kind: "info" | "error", message: string) => void,
        private readonly onItemUsed?: (item: CommonItem) => void,
        private readonly placeholders?: IPlaceholderHook,
    ) {}

    /** provider payload 渲染（xiaolv-common/v1 语义定案）：与库条目一致，插入前应用动态占位符。
     *  提供方如需字面花括号，请使用非 xlc 命名空间。 */
    async renderProviderOutput(text: string): Promise<string | undefined> {
        return this.applyOutput(text);
    }

    /** 对输出载荷应用动态占位符（插入 markdown 与剪贴板文本；存储内容不受影响）。
     *  仅当文本含 title/path/doc 占位符时才取当前文档（避免多余内核往返）。
     *  {{xlc:clipboard}} 异步替换（读取失败=空串，语义同无文档）。
     *  code 条目跳过替换：代码中的 {{xlc:…}} 是字面文本（例如演示模板的代码），绝不能被改写。 */
    /** 公开渲染入口：定向插入（insertToDoc）与 provider payload 共用（R50/R51 语义统一）。
     *  fills：变量填充卡收集的 ask 值（R67）；插入语义，含光标移除与未填充兜底。 */
    async renderForInsert(text: string, item?: CommonItem, fills?: Record<string, string>): Promise<string> {
        let payload = text;
        if (item?.itemType !== "code") {
            if (fills) payload = expandAsks(payload, fills);
            payload = applyAskDefaults(stripCursorToken(payload));
        }
        return (await this.applyOutput(payload, item)) ?? payload;
    }

    private async applyOutput(text: string | undefined, item?: CommonItem): Promise<string | undefined> {
        if (text === undefined) return undefined;
        if (item?.itemType === "code") return text;
        if (!this.placeholders) return text;
        try {
            if (!this.placeholders.enabled()) return text;
            const {listPlaceholders} = await import("../model/placeholders");
            const needsDoc = listPlaceholders(text).some((k) => k === "title" || k === "path" || k === "doc");
            const doc = needsDoc ? await this.placeholders.currentDoc() : null;
            let output = applyPlaceholders(text, this.placeholders.now(), true, doc);
            if (output.includes("{{xlc:clipboard}}") && this.placeholders.clipboard) {
                let clipboardText = "";
                try {
                    clipboardText = (await this.placeholders.clipboard()) ?? "";
                } catch {
                    clipboardText = "";
                }
                output = output.replaceAll("{{xlc:clipboard}}", clipboardText.slice(0, 4000));
            }
            return output;
        } catch {
            return text;
        }
    }

    private async resolveContent(item: CommonItem): Promise<{kramdown: string; sourceMissing: boolean; assetMissing: boolean} | null> {
        const kramdown = await this.library.getItemKramdown(item);
        if (!kramdown.ok) return null;
        const health = await this.library.checkSourceHealth(item);
        const h: SourceHealth = health.ok ? health.data : {blockMissing: false, docMissing: false, assetMissing: false};
        return {
            kramdown: kramdown.data,
            sourceMissing: h.blockMissing || (h.docMissing && !item.libraryDocId),
            assetMissing: h.assetMissing,
        };
    }

    private emitEvent(eventName: string, item: CommonItem, extra?: Record<string, unknown>): void {
        try {
            window.dispatchEvent(new CustomEvent(eventName, {
                detail: {protocolVersion: 1, itemId: item.id, itemType: item.itemType, ...extra},
            }));
        } catch {
            // 事件失败不影响主流程
        }
    }

    /** 现场解析条目内容；变量填充卡收集的 ask 值在此展开（模型层纯字符串替换；code 条目不处理变量）。 */
    private async resolveWithFills(item: CommonItem, fills?: Record<string, string>) {
        const content = await this.resolveContent(item);
        if (!content) return null;
        if (fills && item.itemType !== "code") {
            const expanded = expandAsks(content.kramdown, fills);
            content.kramdown = expanded;
        }
        return content;
    }

    async run(item: CommonItem, mode: InsertMode, opts?: {fills?: Record<string, string>}): Promise<ExecutionReceipt> {
        const content = await this.resolveWithFills(item, opts?.fills);
        if (!content) {
            return {ok: false, mode, message: "kernel-error:content", downgraded: false, pendingVerification: []};
        }
        const ctx: ActionContext = {
            surface: this.host.isMobile() ? "mobile" : "desktop",
            hasActiveEditor: this.host.hasActiveEditor(),
            content,
        };
        const plan: InsertPlan = planAction(item, mode, ctx);
        return this.execute(item, plan);
    }

    private async execute(item: CommonItem, plan: InsertPlan): Promise<ExecutionReceipt> {
        // 插入语义输出：未填充 ask 兜底为 __名称__（可见可改），光标标记移除；复制路径保持模板原样
        const insertRender = (text: string | undefined): Promise<string | undefined> => {
            if (text === undefined) return Promise.resolve(undefined);
            if (item.itemType === "code") return Promise.resolve(text);
            return this.applyOutput(applyAskDefaults(stripCursorToken(text)), item);
        };
        // 移动端插入未验证：诚实降级为复制（B-002 解除后复核）
        if (plan.mode === "insert" && this.host.isMobile()) {
            const text = (await insertRender(plan.markdown)) ?? "";
            const copied = text ? await this.host.writeClipboard(text) : false;
            return {
                ok: copied,
                mode: plan.mode,
                message: copied ? "insert-downgraded-copied" : "copy-failed",
                downgraded: true,
                pendingVerification: ["mobile-insert-unverified", ...plan.pendingVerification],
            };
        }
        if (plan.mode === "insert" || plan.mode === "insert-ref" || plan.mode === "insert-embed") {
            const md = (await insertRender(plan.markdown)) ?? "";
            if (!md) {
                return {ok: false, mode: plan.mode, message: "empty-plan", downgraded: plan.downgraded, pendingVerification: plan.pendingVerification};
            }
            if (!this.host.hasActiveEditor()) {
                const copied = await this.host.writeClipboard(md);
                return {
                    ok: true,
                    mode: plan.mode,
                    message: copied ? "no-editor-copied" : "no-editor-copy-failed",
                    downgraded: true,
                    pendingVerification: plan.pendingVerification,
                };
            }
            const inserted = this.host.insertMarkdown(md);
            if (inserted) {
                this.emitEvent(EVENTS.itemInserted, item, {insertMode: plan.mode});
                try {
                    this.onItemUsed?.(item);
                } catch {
                    // 侧车记录失败不影响插入回执
                }
            }
            return {
                ok: inserted,
                mode: plan.mode,
                message: inserted ? "inserted" : "insert-failed",
                downgraded: false,
                pendingVerification: plan.pendingVerification,
            };
        }
        if (plan.mode === "copy" || plan.mode === "copy-content") {
            const text = (await this.applyOutput(plan.clipboardText, item)) ?? "";
            const copied = await this.host.writeClipboard(text);
            return {
                ok: copied,
                mode: plan.mode,
                message: copied ? "copied" : "copy-failed",
                downgraded: plan.downgraded,
                pendingVerification: plan.pendingVerification,
            };
        }
        if (plan.mode === "open" && plan.open) {
            return this.openTarget(plan.open, item);
        }
        return {ok: false, mode: plan.mode, message: "unsupported", downgraded: false, pendingVerification: plan.pendingVerification};
    }

    private async openTarget(target: OpenTarget, item: CommonItem): Promise<ExecutionReceipt> {
        let opened = false;
        if (target.kind === "url" && target.url) opened = this.host.openExternal(target.url);
        else if (target.kind === "asset" && target.assetPath) opened = this.host.openAsset(target.assetPath);
        else if (target.kind === "block" && target.blockId) opened = this.host.openDoc(target.docId ?? "", target.blockId);
        else if (target.kind === "doc" && target.docId) opened = this.host.openDoc(target.docId);
        return {
            ok: opened,
            mode: "open-source",
            message: opened ? "source-opened" : "open-failed",
            downgraded: false,
            pendingVerification: [],
        };
    }

    async openSource(item: CommonItem): Promise<ExecutionReceipt> {
        const content = await this.resolveContent(item);
        if (!content) {
            return {ok: false, mode: "open-source", message: "kernel-error:content", downgraded: false, pendingVerification: []};
        }
        const planned = planOpenSource(item, content);
        if (planned.failure || !planned.target) {
            return {
                ok: false,
                mode: "open-source",
                message: planned.failure ?? "not-found",
                downgraded: true,
                pendingVerification: [],
            };
        }
        return this.openTarget(planned.target, item);
    }
}
