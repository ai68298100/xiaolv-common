// 跨应用富文本剪贴板安全转换与双载荷写入（ADR 0070 / G18 / T-0129）
// 核心场景：客服/邮件模板复制到外部富文本应用（Outlook、网页邮箱、飞书、微信、钉钉等）
// 关键红线：绝对杜绝 XSS 注入，所有非转义用户输入一律转义为安全 HTML 实体。

/** HTML 特殊字符安全转义 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** 检测文本中是否包含明显的 Markdown 结构或排版标记 */
export function isMarkdownFormattingPresent(text: string): boolean {
    if (!text || !text.trim()) return false;
    return (
        /(\*\*|__)[^\s].*?(\*\*|__)/.test(text) || // 粗体
        /~~[^\s].*?~~/.test(text) || // 删除线
        /`[^`\n]+`/.test(text) || // 行内代码
        /```[\s\S]*?```/.test(text) || // 代码块
        /^#{1,6}\s+/m.test(text) || // 标题
        /^>\s+/m.test(text) || // 引用
        /^[-*+]\s+/m.test(text) || // 无序列表
        /^\d+\.\s+/m.test(text) || // 有序列表
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/.test(text) // 链接
    );
}

/**
 * 将 Markdown 文本安全渲染为可被外部富文本编辑器接受的轻量 HTML
 * 零依赖、纯函数、强 XSS 免疫
 */
export function renderSafeHtmlFromMarkdown(markdown: string): string {
    if (!markdown || !markdown.trim()) return "";

    const codeBlocks: string[] = [];
    const inlineCodes: string[] = [];

    // 1. 统一换行符并清洗 Kramdown 属性标记（如 {: id="xxx" }）
    let raw = markdown.replace(/\r\n/g, "\n").replace(/\{:[^}]*\}/g, "");

    // 2. 提取并保护围栏代码块 ```lang ... ```
    raw = raw.replace(/(?:^|\n)```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n```(?:\n|$)/g, (_match, lang: string, code: string) => {
        const escapedCode = escapeHtml(code);
        const langAttr = lang ? ` data-language="${escapeHtml(lang)}"` : "";
        const html = `<pre${langAttr} style="background-color: #f6f8fa; padding: 12px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.5; overflow-x: auto; margin: 0.8em 0;"><code>${escapedCode}</code></pre>`;
        const placeholder = `XLCCODEBLOCK${codeBlocks.length}XLC`;
        codeBlocks.push(html);
        return `\n\n${placeholder}\n\n`;
    });

    // 3. 全局 HTML 转义（杜绝除我们受信生成的标签之外的任何原生 HTML 标签注入）
    let safe = escapeHtml(raw);

    // 4. 提取并保护行内代码 `code`
    safe = safe.replace(/`([^`\n]+)`/g, (_match, code: string) => {
        const html = `<code style="background-color: rgba(175, 184, 193, 0.2); padding: 0.2em 0.4em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 85%;">${code}</code>`;
        const placeholder = `XLCINLINECODE${inlineCodes.length}XLC`;
        inlineCodes.push(html);
        return placeholder;
    });

    // 5. 超链接解析：仅限 http://、https:// 与 mailto: 协议，其余保持字面文本
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (_match, text: string, href: string) => {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #0969da; text-decoration: underline;">${text}</a>`;
    });

    // 6. 行内样式加粗、删除线、斜体
    safe = safe.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    safe = safe.replace(/~~(.*?)~~/g, "<del>$1</del>");
    safe = safe.replace(/(?<![*_])(\*|_)(?![*_])(.*?)\1(?![*_])/g, "<em>$2</em>");

    // 7. 块级结构转换（按段落划分）
    const rawParagraphs = safe.split(/\n{2,}/);
    const htmlParagraphs: string[] = [];

    for (const para of rawParagraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // 若是独立的代码块占位符，直接透传
        if (/^XLCCODEBLOCK\d+XLC$/.test(trimmed)) {
            htmlParagraphs.push(trimmed);
            continue;
        }

        // 标题 # ~ ###
        const hMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
        if (hMatch && !trimmed.includes("\n")) {
            const level = hMatch[1]!.length;
            const content = hMatch[2]!;
            const sizeMap: Record<number, string> = {1: "1.6em", 2: "1.4em", 3: "1.2em", 4: "1.1em", 5: "1em", 6: "0.9em"};
            htmlParagraphs.push(`<h${level} style="font-size: ${sizeMap[level] ?? "1.1em"}; font-weight: 600; margin: 0.8em 0 0.4em 0;">${content}</h${level}>`);
            continue;
        }

        const lines = trimmed.split("\n");

        // 引用块（以 &gt; 开头）
        if (lines.every((line) => line.startsWith("&gt;") || line.trim() === "")) {
            const quoteContent = lines
                .map((line) => line.replace(/^&gt;\s?/, ""))
                .join("<br>");
            htmlParagraphs.push(`<blockquote style="margin: 0.8em 0; padding: 0.4em 0.8em; border-left: 3px solid #d0d7de; color: #57606a; background-color: #f6f8fa;">${quoteContent}</blockquote>`);
            continue;
        }

        // 行级归类处理：支持段落内混排列表与普通说明文本
        let currentListType: "ul" | "ol" | null = null;
        let currentListItems: string[] = [];

        const flushList = () => {
            if (currentListType && currentListItems.length > 0) {
                const tag = currentListType;
                const itemsHtml = currentListItems.map((li) => li.startsWith("<li") ? `  ${li}` : `  <li style="margin: 0.2em 0;">${li}</li>`).join("\n");
                htmlParagraphs.push(`<${tag} style="margin: 0.6em 0; padding-left: 1.5em;">\n${itemsHtml}\n</${tag}>`);
                currentListType = null;
                currentListItems = [];
            }
        };

        const currentParaLines: string[] = [];
        const flushPara = () => {
            if (currentParaLines.length > 0) {
                htmlParagraphs.push(`<p style="margin: 0.6em 0; line-height: 1.6;">${currentParaLines.join("<br>")}</p>`);
                currentParaLines.length = 0;
            }
        };

        for (const line of lines) {
            const taskMatch = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
            const ulMatch = /^[-*]\s+(.*)$/.exec(line);
            const olMatch = /^\d+\.\s+(.*)$/.exec(line);
            if (taskMatch) {
                flushPara();
                if (currentListType !== "ul") flushList();
                currentListType = "ul";
                const isDone = taskMatch[1]!.toLowerCase() === "x";
                const itemBody = taskMatch[2]!;
                const rendered = isDone ? `<del>${itemBody}</del>` : itemBody;
                currentListItems.push(`<li style="list-style-type: none; margin: 0.25em 0;"><input type="checkbox" ${isDone ? "checked" : ""} disabled style="margin-right: 6px; vertical-align: -1px;">${rendered}</li>`);
            } else if (ulMatch) {
                flushPara();
                if (currentListType !== "ul") flushList();
                currentListType = "ul";
                currentListItems.push(`<li style="margin: 0.2em 0;">${ulMatch[1]!}</li>`);
            } else if (olMatch) {
                flushPara();
                if (currentListType !== "ol") flushList();
                currentListType = "ol";
                currentListItems.push(`<li style="margin: 0.2em 0;">${olMatch[1]!}</li>`);
            } else {
                flushList();
                currentParaLines.push(line);
            }
        }
        flushList();
        flushPara();
    }

    let finalHtml = htmlParagraphs.join("\n");

    // 8. 还原占位符
    finalHtml = finalHtml.replace(/XLCINLINECODE(\d+)XLC/g, (_m, idxStr: string) => {
        return inlineCodes[Number(idxStr)] ?? "";
    });
    finalHtml = finalHtml.replace(/XLCCODEBLOCK(\d+)XLC/g, (_m, idxStr: string) => {
        return codeBlocks[Number(idxStr)] ?? "";
    });

    // 9. 外部包装器（增强邮件与富文本应用的排版兼容性）
    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #24292f;">\n${finalHtml}\n</div>`;
}

/**
 * 跨平台/跨浏览器写入富文本剪贴板（含 text/plain 与 text/html 双载荷）
 * 优先使用标准异步 ClipboardItem API，失败时平滑降级到纯文本写入
 */
export async function writeRichClipboard(
    text: string,
    html?: string,
    options?: {
        clipboard?: {
            write?: (items: any[]) => Promise<void>;
            writeText?: (text: string) => Promise<void>;
        };
        isSecure?: boolean;
    },
): Promise<boolean> {
    const navClipboard = options?.clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
    const isSecure = options?.isSecure ?? (typeof window !== "undefined" ? window.isSecureContext : true);

    if (navClipboard && isSecure) {
        // 如果提供了富文本 HTML 且支持 ClipboardItem，尝试双载荷注入
        if (html && typeof ClipboardItem !== "undefined" && typeof navClipboard.write === "function") {
            try {
                const textBlob = new Blob([text], {type: "text/plain"});
                const htmlBlob = new Blob([html], {type: "text/html"});
                const item = new ClipboardItem({
                    "text/plain": textBlob,
                    "text/html": htmlBlob,
                });
                await navClipboard.write([item]);
                return true;
            } catch {
                // 浏览器权限限制或安全策略拒绝时，继续向下回退至纯文本写入
            }
        }
        if (typeof navClipboard.writeText === "function") {
            try {
                await navClipboard.writeText(text);
                return true;
            } catch {
                // 回退到 execCommand 降级
            }
        }
    }

    // 降级支持：通过 DOM Range 选中临时 HTML 或 Textarea 写入
    if (typeof document !== "undefined") {
        if (html && typeof document.createRange === "function" && typeof window !== "undefined") {
            try {
                const div = document.createElement("div");
                div.innerHTML = html;
                div.style.position = "fixed";
                div.style.opacity = "0";
                div.style.pointerEvents = "none";
                document.body.appendChild(div);

                const range = document.createRange();
                range.selectNodeContents(div);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                    const ok = document.execCommand("copy");
                    selection.removeAllRanges();
                    div.remove();
                    if (ok) return true;
                }
                div.remove();
            } catch {
                // 回退 textarea
            }
        }

        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            ta.style.pointerEvents = "none";
            document.body.appendChild(ta);
            ta.select();
            const okFlag = document.execCommand("copy");
            ta.remove();
            return okFlag;
        } catch {
            return false;
        }
    }

    return false;
}
