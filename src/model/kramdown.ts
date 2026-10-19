import {LIMITS} from "../constants";

/** Temporary B-006 write boundary, not a general Markdown parser or host acceptance. */
const STRUCTURED_PATTERN = /\{:|[{]{3}|[}]{3}|^ {0,3}(?:`{3,}|~{3,}|>|(?:[-*+]|\d{1,9}[.)])[ \t]|\||(?:[-*_][ \t]*){3,}$)/;

export function bodyWriteRestriction(markdown: string): string | undefined {
    if (!markdown.trim()) return "body is empty";
    if (markdown.length > LIMITS.contentChars) return "body exceeds the supported size; nothing was written";
    if (/[\u2028\u2029]/.test(markdown)) return "multi-line body writing is unavailable pending B-006 host verification";
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    while (lines.length > 1 && lines[0]!.trim() === "") lines.shift();
    while (lines.length > 1 && lines[lines.length - 1]!.trim() === "") lines.pop();
    // A complete, unindented fence is the only multi-line form currently allowed.
    const opening = lines[0]?.match(/^(`{3,}|~{3,})([a-zA-Z0-9_+.-]*)[ \t]*$/);
    if (opening && lines.length >= 2) {
        const fence = opening[1]!;
        const close = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`);
        const closingIndex = lines.findIndex((line, index) => index > 0 && close.test(line));
        if (closingIndex === lines.length - 1) return undefined;
    }
    if (lines.length === 1 && !STRUCTURED_PATTERN.test(lines[0]!)) return undefined;
    // Multi-line non-fence content is blocked pending B-006 host verification.
    return "multi-line or structured body writing is unavailable pending B-006 host verification; use a single line or a complete code fence";
}

const ATTRIBUTE_PATTERN = /(^|\s)([\w:-]+)=(?:"[^"]*"|'[^']*'|[^\s}]+)(?=\s|$)/g;
const IAL_TOKEN_PATTERN = /(`+)|(\{:[^{}]*\})/g;

function normalizeIalToken(ial: string): string {
    const attributes = ial.slice(2, -1);
    const safeAttributes = attributes.replace(ATTRIBUTE_PATTERN, (attribute, _space, name) =>
        name === "id" || name === "updated" || name.startsWith("custom-xlc-") ? " " : attribute,
    ).trim();
    return safeAttributes ? `{: ${safeAttributes}}` : "";
}

interface InlineCodeTick {
    line: number;
    offset: number;
    length: number;
}

function findCodeLines(lines: string[]): boolean[] {
    const codeLines: boolean[] = [];
    let fence: {marker: string; length: number} | null = null;

    for (const line of lines) {
        if (fence) {
            codeLines.push(true);
            const closing = line.match(/^\s*(`+|~+)\s*$/)?.[1];
            if (closing && closing.charAt(0) === fence.marker && closing.length >= fence.length) fence = null;
            continue;
        }
        if (!line.trim()) {
            codeLines.push(false);
            continue;
        }
        if (/^(?: {4,}|\t)/.test(line)) {
            codeLines.push(true);
            continue;
        }
        const opening = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
        if (opening) {
            fence = {marker: opening.charAt(0), length: opening.length};
            codeLines.push(true);
            continue;
        }
        codeLines.push(false);
    }

    return codeLines;
}

function findInlineCodeTicks(lines: string[], codeLines: boolean[]): Set<number>[] {
    const pairedByLine = lines.map(() => new Set<number>());
    let segment: InlineCodeTick[] = [];

    const pairSegment = (): void => {
        const nextByLength = new Map<number, number>();
        const nextSameLength = new Map<number, number>();
        for (let index = segment.length - 1; index >= 0; index--) {
            const tick = segment[index];
            if (!tick) continue;
            const next = nextByLength.get(tick.length);
            if (next !== undefined) nextSameLength.set(index, next);
            nextByLength.set(tick.length, index);
        }

        for (let index = 0; index < segment.length; index++) {
            const tick = segment[index];
            if (!tick) continue;
            const closeIndex = nextSameLength.get(index);
            if (closeIndex === undefined) continue;
            pairedByLine[tick.line]?.add(tick.offset);
            const close = segment[closeIndex];
            if (close) pairedByLine[close.line]?.add(close.offset);
            index = closeIndex;
        }
        segment = [];
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex] ?? "";
        if (codeLines[lineIndex]) {
            pairSegment();
            continue;
        }
        IAL_TOKEN_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(IAL_TOKEN_PATTERN)) {
            if (!match[1]) continue;
            segment.push({line: lineIndex, offset: match.index ?? 0, length: match[0].length});
        }
    }
    pairSegment();
    return pairedByLine;
}

function normalizeLineIals(
    line: string,
    activeInlineCodeTicks: number,
    pairedInlineCodeTicks: Set<number>,
): {line: string; activeInlineCodeTicks: number} {
    let cursor = 0;
    let inlineCodeTicks = activeInlineCodeTicks;
    let output = "";
    IAL_TOKEN_PATTERN.lastIndex = 0;
    for (const match of line.matchAll(IAL_TOKEN_PATTERN)) {
        const token = match[0];
        const start = match.index ?? 0;
        output += line.slice(cursor, start);
        cursor = start + token.length;
        if (match[1]) {
            if (pairedInlineCodeTicks.has(start)) {
                if (!inlineCodeTicks) inlineCodeTicks = token.length;
                else if (inlineCodeTicks === token.length) inlineCodeTicks = 0;
            }
            output += token;
        } else if (inlineCodeTicks) {
            output += token;
        } else {
            output += normalizeIalToken(token);
        }
    }
    return {line: output + line.slice(cursor), activeInlineCodeTicks: inlineCodeTicks};
}

export function normalizeKramdownIal(markdown: string): string {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const codeLines = findCodeLines(lines);
    const pairedInlineCodeTicks = findInlineCodeTicks(lines, codeLines);
    const output: string[] = [];
    let inlineCodeTicks = 0;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        if (codeLines[index]) {
            inlineCodeTicks = 0;
            output.push(line);
            continue;
        }
        const normalized = normalizeLineIals(line, inlineCodeTicks, pairedInlineCodeTicks[index] ?? new Set());
        output.push(normalized.line);
        inlineCodeTicks = normalized.activeInlineCodeTicks;
    }

    return output.join("\n").trim();
}
