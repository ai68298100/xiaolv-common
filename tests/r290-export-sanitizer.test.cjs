// R290 / T-0143: 导出脱敏器测试（掩码、变量化占位符、自定义词典、Markdown与JSON导出联动契约与负向验证）
const test = require("node:test");
const assert = require("node:assert");
const {
    exportSanitizer,
    exportSanitizerModal,
    transfer,
    exportMarkdown,
} = require("./.build/entry.cjs");

const {
    sanitizeTextForExport,
} = exportSanitizer;

const {
    renderSanitizerOptionsModal,
} = exportSanitizerModal;

const {buildBundle} = transfer;
const {buildMarkdownExport} = exportMarkdown;

const enc = (s) => new TextEncoder().encode(s);

const mkItem = (id, itemType, title, kramdown) => ({
    id,
    blockId: "20240101120000-abcdefg",
    libraryDocId: "20240101120001-hijklmn",
    itemType,
    title,
    alias: "",
    tags: ["test"],
    category: "general",
    summary: "",
    source: {sourceDocId: "", sourceBlockId: "", sourceType: "manual"},
    url: "",
    targetBlockId: "",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    droppedFields: [],
});

test("脱敏器：大陆 11 位手机号码（掩码与占位符模式）", () => {
    const raw = "联系我：13812345678 或 18998765432，谢谢！";

    // 默认掩码模式
    const masked = sanitizeTextForExport(raw, {mode: "mask"});
    assert.equal(masked.sanitizedCount, 2);
    assert.ok(masked.detectedTypes.includes("phone"));
    assert.equal(masked.text, "联系我：138****5678 或 189****5432，谢谢！");

    // 变量占位符模式
    const placeholdered = sanitizeTextForExport(raw, {mode: "placeholder"});
    assert.equal(placeholdered.sanitizedCount, 2);
    assert.equal(placeholdered.text, "联系我：{{xlc:ask:手机号}} 或 {{xlc:ask:手机号}}，谢谢！");

    // 禁用手机号脱敏
    const disabled = sanitizeTextForExport(raw, {sanitizePhones: false});
    assert.equal(disabled.sanitizedCount, 0);
    assert.equal(disabled.text, raw);
});

test("脱敏器：电子邮箱脱敏（掩码与占位符模式）", () => {
    const raw = "发送邮件至 user.name@example.com 或 admin@internal.net 咨询。";

    // 掩码模式
    const masked = sanitizeTextForExport(raw, {mode: "mask"});
    assert.equal(masked.sanitizedCount, 2);
    assert.ok(masked.detectedTypes.includes("email"));
    assert.ok(masked.text.includes("us***@example.com") || masked.text.includes("u***@example.com"));
    assert.ok(masked.text.includes("ad***@internal.net"));

    // 占位符模式
    const placeholdered = sanitizeTextForExport(raw, {mode: "placeholder"});
    assert.equal(placeholdered.text, "发送邮件至 {{xlc:ask:电子邮箱}} 或 {{xlc:ask:电子邮箱}} 咨询。");
});

test("脱敏器：18 位身份证号码脱敏（掩码与占位符模式）", () => {
    const raw = "身份认证：110101199003072345（持证人）与 44030119881212345X。";

    // 掩码模式
    const masked = sanitizeTextForExport(raw, {mode: "mask"});
    assert.equal(masked.sanitizedCount, 2);
    assert.ok(masked.detectedTypes.includes("idCard"));
    assert.equal(masked.text, "身份认证：110101********2345（持证人）与 440301********345X。");

    // 占位符模式
    const placeholdered = sanitizeTextForExport(raw, {mode: "placeholder"});
    assert.equal(placeholdered.text, "身份认证：{{xlc:ask:身份证号}}（持证人）与 {{xlc:ask:身份证号}}。");
});

test("脱敏器：API 密钥/Token（sk-、ghp_、Bearer）脱敏", () => {
    const dummyToken = ["sk", "abcdefghijklmnopqrstuvwxyz12345678"].join("-");
    const raw = "配置 API: OPENAI_KEY=" + dummyToken + ", GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz12345678, Auth: Bearer token1234567890abcdefghij";

    // 掩码模式
    const masked = sanitizeTextForExport(raw, {mode: "mask"});
    assert.equal(masked.sanitizedCount, 3);
    assert.ok(masked.detectedTypes.includes("token"));
    assert.ok(masked.text.includes("sk-********************"));
    assert.ok(masked.text.includes("ghp_********************"));
    assert.ok(masked.text.includes("Bearer ********************"));

    // 占位符模式
    const placeholdered = sanitizeTextForExport(raw, {mode: "placeholder"});
    assert.ok(placeholdered.text.includes("OPENAI_KEY={{xlc:ask:API密钥}}"));
    assert.ok(placeholdered.text.includes("GITHUB_TOKEN={{xlc:ask:API密钥}}"));
    assert.ok(placeholdered.text.includes("Auth: {{xlc:ask:API密钥}}"));
});

test("脱敏器：自定义词典字面替换", () => {
    const raw = "请访问生产服务器 prod-db-01.corp.internal，部门代号 ProjectPegasus。";
    const result = sanitizeTextForExport(raw, {
        customReplacements: {
            "prod-db-01.corp.internal": "db-host.example.com",
            "ProjectPegasus": "ProjectAlpha",
        },
    });
    assert.equal(result.sanitizedCount, 2);
    assert.ok(result.detectedTypes.includes("custom"));
    assert.equal(result.text, "请访问生产服务器 db-host.example.com，部门代号 ProjectAlpha。");
});

test("契约门禁：buildBundle JSON 导出脱敏集成", () => {
    const dummyToken = ["sk", "abcdefghijklmnopqrstuvwxyz12345678"].join("-");
    const item1 = mkItem("xlc-md00000001", "template", "客户回访", "联系客户 13800138000，Token: " + dummyToken);
    const itemCode = mkItem("xlc-md00000002", "code", "代码片段", "const key = 'sk-123456789012345678';");
    const items = [item1, itemCode];
    const kramdownMap = new Map([
        [item1.id, item1.title + "\n" + "联系客户 13800138000，Token: " + dummyToken],
        [itemCode.id, "const key = 'sk-123456789012345678';"],
    ]);

    // 未指定脱敏器：保持原样
    const rawBundle = buildBundle(items, kramdownMap, Date.now());
    assert.ok(rawBundle.items[0].kramdown.includes("13800138000"));
    assert.ok(rawBundle.items[0].kramdown.includes(dummyToken));

    // 指定掩码脱敏器：普通条目脱敏，代码条目保持
    const maskedBundle = buildBundle(items, kramdownMap, Date.now(), {mode: "mask"});
    assert.ok(!maskedBundle.items[0].kramdown.includes("13800138000"));
    assert.ok(maskedBundle.items[0].kramdown.includes("138****8000"));
    assert.ok(maskedBundle.items[0].kramdown.includes("sk-********************"));
    // 代码条目不被误伤改动
    assert.equal(maskedBundle.items[1].kramdown, "const key = 'sk-123456789012345678';");
});

test("契约门禁：buildMarkdownExport Markdown 导出脱敏与动态变量提取联动", async () => {
    const item1 = mkItem("xlc-md00000001", "template", "问卷模板", "请致电 13912345678 或邮件 test@company.com");
    const items = [item1];
    const kramdownMap = new Map([[item1.id, "请致电 13912345678 或邮件 test@company.com"]]);

    // 占位符模式导出
    const result = await buildMarkdownExport(
        items,
        kramdownMap,
        async () => null,
        {
            pack: {name: "客户服务包"},
            sanitizer: {mode: "placeholder"},
        }
    );

    const itemsMd = new TextDecoder().decode(result.entries.find((e) => e.name === "items.md").data);
    // 敏感信息已不存在
    assert.ok(!itemsMd.includes("13912345678"));
    assert.ok(!itemsMd.includes("test@company.com"));
    // 转换为占位符
    assert.ok(itemsMd.includes("{{xlc:ask:手机号}}"));
    assert.ok(itemsMd.includes("{{xlc:ask:电子邮箱}}"));
    // 变量清单自动登记了转换出的动态 ask 字段
    assert.ok(result.varNames.includes("手机号"));
    assert.ok(result.varNames.includes("电子邮箱"));
});

test("负向验证门禁：注入违规敏感信息必须被检测到并清洗，未经脱敏的数据必须失败断言", () => {
    const sensitive = "机密测试手机号：13511112222，Token：sk-secr3tkey1234567890";
    
    // 负向验证：若未脱敏，直接检查必包含明文敏感词
    assert.ok(sensitive.includes("13511112222"), "未脱敏文本包含原始手机号");
    assert.ok(sensitive.includes("sk-secr3tkey1234567890"), "未脱敏文本包含原始密钥");

    // 清洗后
    const clean = sanitizeTextForExport(sensitive, {mode: "mask"});
    assert.ok(!clean.text.includes("13511112222"), "清洗后绝无明文手机号");
    assert.ok(!clean.text.includes("sk-secr3tkey1234567890"), "清洗后绝无明文密钥");
    assert.equal(clean.sanitizedCount, 2);
    assert.deepEqual(clean.detectedTypes.sort(), ["phone", "token"]);
});

test("UI 弹窗逻辑：renderSanitizerOptionsModal 结构完整性", () => {
    let closed = false;
    let submitted = null;
    const modal = renderSanitizerOptionsModal({
        initialOptions: {mode: "mask", sanitizePhones: true},
        onConfirm: (opts) => {
            submitted = opts;
        },
        onCancel: () => {
            closed = true;
        },
    });

    assert.ok(modal.element);
    assert.ok(modal.element.classList.contains("b3-dialog__container"));
    assert.ok(modal.element.innerHTML.includes("导出安全脱敏"));
    assert.ok(modal.element.innerHTML.includes("xlc-export-sanitizer-mode"));
    assert.ok(modal.element.innerHTML.includes("xlc-export-sanitizer-phone"));
    assert.ok(modal.element.innerHTML.includes("xlc-export-sanitizer-email"));
    assert.ok(modal.element.innerHTML.includes("xlc-export-sanitizer-idcard"));
    assert.ok(modal.element.innerHTML.includes("xlc-export-sanitizer-token"));
    assert.ok(modal.element.innerHTML.includes("xlc-export-sanitizer-custom"));

    // 点击取消
    const cancelBtn = modal.element.querySelector(".b3-button--cancel");
    cancelBtn.click();
    assert.strictEqual(closed, true);
});
