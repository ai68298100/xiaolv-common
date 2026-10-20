// 模板导出内容安全脱敏与隐私字段清洗引擎（ADR 0083 / G31 / T-0143）
// 纯函数、零副作用：在导出或分享模板时过滤敏感真实数据，绝不改写库内原始块

export type SanitizeMode = "mask" | "placeholder";

export interface SanitizerOptions {
    /** 脱敏策略：mask 掩码替换（如 138****5678）或 placeholder 变量化（如 {{xlc:ask:手机号}}），默认 mask */
    mode?: SanitizeMode;
    /** 是否脱敏大陆 11 位手机号码（默认 true） */
    sanitizePhones?: boolean;
    /** 是否脱敏电子邮箱地址（默认 true） */
    sanitizeEmails?: boolean;
    /** 是否脱敏 18 位身份证号码（默认 true） */
    sanitizeIdCards?: boolean;
    /** 是否脱敏 API 密钥/Token（默认 true） */
    sanitizeTokens?: boolean;
    /** 用户自定义字面替换词典（原词 -> 替换目标） */
    customReplacements?: Record<string, string>;
}

export interface SanitizeResult {
    text: string;
    /** 命中并脱敏的总次数 */
    sanitizedCount: number;
    /** 命中的敏感类型清单 */
    detectedTypes: string[];
}

const PHONE_REGEX = /(?<!\d)(1[3-9]\d)(\d{4})(\d{4})(?!\d)/g;
const EMAIL_REGEX = /\b([a-zA-Z0-9._%+-]{1,2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
const ID_CARD_REGEX = /(?<!\d)(\d{6})(?:\d{8})(\d{3}[\dXx])(?!\d)/g;
const TOKEN_REGEX = /(?<![a-zA-Z0-9_-])(sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{16,}|Bearer\s+[a-zA-Z0-9._-]{16,})(?![a-zA-Z0-9_-])/g;

/**
 * 纯函数：对导出或分享的文本正文进行隐私脱敏
 * @param text 待脱敏的文本
 * @param options 脱敏选项
 */
export function sanitizeTextForExport(
    text: string,
    options: SanitizerOptions = {},
): SanitizeResult {
    if (!text || !text.trim()) {
        return {text: text ?? "", sanitizedCount: 0, detectedTypes: []};
    }

    const mode = options.mode ?? "mask";
    const sanitizePhones = options.sanitizePhones !== false;
    const sanitizeEmails = options.sanitizeEmails !== false;
    const sanitizeIdCards = options.sanitizeIdCards !== false;
    const sanitizeTokens = options.sanitizeTokens !== false;

    let result = text;
    let sanitizedCount = 0;
    const detectedTypes = new Set<string>();

    // 1. 用户自定义字面替换
    if (options.customReplacements) {
        for (const [target, replacement] of Object.entries(options.customReplacements)) {
            if (target && result.includes(target)) {
                const count = result.split(target).length - 1;
                sanitizedCount += count;
                detectedTypes.add("custom");
                result = result.replaceAll(target, replacement);
            }
        }
    }

    // 2. 手机号码
    if (sanitizePhones) {
        result = result.replace(PHONE_REGEX, (_match, p1: string, _p2: string, p3: string) => {
            sanitizedCount++;
            detectedTypes.add("phone");
            return mode === "placeholder" ? "{{xlc:ask:手机号}}" : `${p1}****${p3}`;
        });
    }

    // 3. 电子邮箱
    if (sanitizeEmails) {
        result = result.replace(EMAIL_REGEX, (_match, prefix: string, domain: string) => {
            sanitizedCount++;
            detectedTypes.add("email");
            return mode === "placeholder" ? "{{xlc:ask:电子邮箱}}" : `${prefix}***${domain}`;
        });
    }

    // 4. 身份证号
    if (sanitizeIdCards) {
        result = result.replace(ID_CARD_REGEX, (_match, prefix: string, suffix: string) => {
            sanitizedCount++;
            detectedTypes.add("idCard");
            return mode === "placeholder" ? "{{xlc:ask:身份证号}}" : `${prefix}********${suffix}`;
        });
    }

    // 5. 常见 API 密钥与 Token
    if (sanitizeTokens) {
        result = result.replace(TOKEN_REGEX, (_match, tokenVal: string) => {
            sanitizedCount++;
            detectedTypes.add("token");
            if (mode === "placeholder") {
                return "{{xlc:ask:API密钥}}";
            }
            if (tokenVal.startsWith("sk-")) return "sk-********************";
            if (tokenVal.startsWith("ghp_")) return "ghp_********************";
            return "Bearer ********************";
        });
    }

    return {
        text: result,
        sanitizedCount,
        detectedTypes: Array.from(detectedTypes),
    };
}
