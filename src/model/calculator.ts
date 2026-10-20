// 安全内联算术计算求值引擎（ADR 0072 / G20 / T-0131）
// 绝对零 eval、零 Function，基于受限词法与递归下降解析器的纯数学求值

type TokenType = "NUMBER" | "PLUS" | "MINUS" | "STAR" | "SLASH" | "PERCENT" | "LPAREN" | "RPAREN" | "COMMA" | "IDENT" | "EOF";

interface Token {
    type: TokenType;
    value: string;
    numValue?: number;
}

const SUPPORTED_FUNCTIONS: Record<string, (...args: number[]) => number> = {
    round: (val, digits = 0) => {
        const factor = Math.pow(10, digits);
        return Math.round(val * factor) / factor;
    },
    floor: (val) => Math.floor(val),
    ceil: (val) => Math.ceil(val),
    abs: (val) => Math.abs(val),
};

/** 词法切分 */
function tokenize(expr: string): Token[] | null {
    const tokens: Token[] = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
        const ch = expr[i]!;

        // 忽略空白
        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // 数字（含小数）
        if (/[0-9]/.test(ch) || (ch === "." && i + 1 < len && /[0-9]/.test(expr[i + 1]!))) {
            let start = i;
            let dotCount = 0;
            while (i < len && (/[0-9]/.test(expr[i]!) || expr[i] === ".")) {
                if (expr[i] === ".") dotCount++;
                if (dotCount > 1) return null; // 非法多小数点
                i++;
            }
            const numStr = expr.slice(start, i);
            const numVal = Number(numStr);
            if (Number.isNaN(numVal)) return null;
            tokens.push({type: "NUMBER", value: numStr, numValue: numVal});
            continue;
        }

        // 标识符（函数名，只允许纯英文字母）
        if (/[a-zA-Z_]/.test(ch)) {
            let start = i;
            while (i < len && /[a-zA-Z0-9_]/.test(expr[i]!)) {
                i++;
            }
            const ident = expr.slice(start, i).toLowerCase();
            tokens.push({type: "IDENT", value: ident});
            continue;
        }

        // 运算符与括号
        switch (ch) {
            case "+": tokens.push({type: "PLUS", value: "+"}); i++; break;
            case "-": tokens.push({type: "MINUS", value: "-"}); i++; break;
            case "*": tokens.push({type: "STAR", value: "*"}); i++; break;
            case "/": tokens.push({type: "SLASH", value: "/"}); i++; break;
            case "%": tokens.push({type: "PERCENT", value: "%"}); i++; break;
            case "(": tokens.push({type: "LPAREN", value: "("}); i++; break;
            case ")": tokens.push({type: "RPAREN", value: ")"}); i++; break;
            case ",":
            case "，": tokens.push({type: "COMMA", value: ","}); i++; break;
            default:
                // 未知非法字符
                return null;
        }
    }

    tokens.push({type: "EOF", value: ""});
    return tokens;
}

/** 语法解析器 */
class MathParser {
    private pos = 0;

    constructor(private readonly tokens: Token[]) {}

    private peek(): Token {
        return this.tokens[this.pos] ?? {type: "EOF", value: ""};
    }

    private consume(expected?: TokenType): Token | null {
        const cur = this.peek();
        if (expected && cur.type !== expected) return null;
        this.pos++;
        return cur;
    }

    /** expr = term (('+' | '-') term)* */
    parseExpr(): number | null {
        let left = this.parseTerm();
        if (left === null) return null;

        while (true) {
            const tok = this.peek();
            if (tok.type === "PLUS") {
                this.consume();
                const right = this.parseTerm();
                if (right === null) return null;
                left += right;
            } else if (tok.type === "MINUS") {
                this.consume();
                const right = this.parseTerm();
                if (right === null) return null;
                left -= right;
            } else {
                break;
            }
        }

        return left;
    }

    /** term = unary (('*' | '/' | '%') unary)* */
    private parseTerm(): number | null {
        let left = this.parseUnary();
        if (left === null) return null;

        while (true) {
            const tok = this.peek();
            if (tok.type === "STAR") {
                this.consume();
                const right = this.parseUnary();
                if (right === null) return null;
                left *= right;
            } else if (tok.type === "SLASH") {
                this.consume();
                const right = this.parseUnary();
                if (right === null || Math.abs(right) < 1e-15) return null; // 除零防御
                left /= right;
            } else if (tok.type === "PERCENT") {
                this.consume();
                const right = this.parseUnary();
                if (right === null || Math.abs(right) < 1e-15) return null; // 取模零防御
                left %= right;
            } else {
                break;
            }
        }

        return left;
    }

    /** unary = ('+' | '-')? factor */
    private parseUnary(): number | null {
        const tok = this.peek();
        if (tok.type === "PLUS") {
            this.consume();
            return this.parseUnary();
        }
        if (tok.type === "MINUS") {
            this.consume();
            const val = this.parseUnary();
            return val !== null ? -val : null;
        }
        return this.parseFactor();
    }

    /** factor = NUMBER | IDENT '(' argList ')' | '(' expr ')' */
    private parseFactor(): number | null {
        const tok = this.peek();

        // 数字
        if (tok.type === "NUMBER") {
            this.consume();
            return tok.numValue ?? null;
        }

        // 括号表达式
        if (tok.type === "LPAREN") {
            this.consume();
            const val = this.parseExpr();
            if (val === null) return null;
            if (!this.consume("RPAREN")) return null; // 缺少右括号
            return val;
        }

        // 函数调用
        if (tok.type === "IDENT") {
            const funcName = tok.value;
            this.consume();
            if (!this.consume("LPAREN")) return null;

            const args: number[] = [];
            if (this.peek().type !== "RPAREN") {
                while (true) {
                    const arg = this.parseExpr();
                    if (arg === null) return null;
                    args.push(arg);
                    if (this.peek().type === "COMMA") {
                        this.consume();
                    } else {
                        break;
                    }
                }
            }

            if (!this.consume("RPAREN")) return null;

            const fn = SUPPORTED_FUNCTIONS[funcName];
            if (!fn) return null; // 不支持的未知函数

            try {
                return fn(...args);
            } catch {
                return null;
            }
        }

        return null;
    }

    isComplete(): boolean {
        return this.peek().type === "EOF";
    }
}

/** 格式化计算结果浮点数，修剪 JavaScript 浮点数精度误差 */
export function formatCalculationResult(num: number): string {
    if (!Number.isFinite(num)) return "";
    // 将 1e-10 内的浮点误差归整
    const rounded = Math.round(num * 1e10) / 1e10;
    return String(rounded);
}

/**
 * 纯函数安全求值数学表达式
 * @param expr 表达式，如 "100 * 1.13"、"round(50 / 3, 2)"
 * @returns 格式化后的计算结果字符串；非法或除以零返回 null（保持原文）
 */
export function evaluateMathExpression(expr: string): string | null {
    if (!expr || !expr.trim()) return null;
    const tokens = tokenize(expr);
    if (!tokens || tokens.length <= 1) return null;

    const parser = new MathParser(tokens);
    const result = parser.parseExpr();
    if (result === null || !parser.isComplete()) return null;
    if (!Number.isFinite(result)) return null;

    return formatCalculationResult(result);
}
