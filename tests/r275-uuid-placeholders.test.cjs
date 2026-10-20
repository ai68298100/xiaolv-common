// T-0128 / R275 / G17：RFC 4122 UUID 与紧凑短 ID 动态占位符引擎契约测试
const test = require("node:test");
const assert = require("node:assert");
const {placeholders} = {
    placeholders: require("./.build/entry.cjs").placeholders,
};
const ph = placeholders;

const UUID_V4_LOWER_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V4_UPPER_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/;
const UUID_V4_SIMPLE_LOWER_REGEX = /^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/;
const UUID_V4_SIMPLE_UPPER_REGEX = /^[0-9A-F]{12}4[0-9A-F]{3}[89AB][0-9A-F]{15}$/;

const NOW = new Date(2026, 9, 20, 10, 0, 0);

test("generateUuidV4: RFC 4122 v4 格式与随机唯一性", () => {
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
        const id = ph.generateUuidV4();
        assert.equal(id.length, 36);
        assert.match(id, UUID_V4_LOWER_REGEX, `生成的 UUID [${id}] 不符合 RFC 4122 v4 规范`);
        seen.add(id);
    }
    assert.equal(seen.size, 50, "50 次生成的 UUID 必须全部唯一无碰撞");
});

test("generateShortId: 长度、字符集去混淆与唯一性", () => {
    // 默认 8 位
    const def = ph.generateShortId();
    assert.equal(def.length, 8);
    // 严禁包含易混淆字符 0, O, 1, l, I
    assert.doesNotMatch(def, /[0O1lI]/);

    // 指定长度与边界钳制
    assert.equal(ph.generateShortId(12).length, 12);
    assert.equal(ph.generateShortId(16).length, 16);
    assert.equal(ph.generateShortId(2).length, 4); // 最小钳制 4
    assert.equal(ph.generateShortId(100).length, 32); // 最大钳制 32

    // 大写模式
    const up = ph.generateShortId(10, true);
    assert.equal(up.length, 10);
    assert.equal(up, up.toUpperCase());
    assert.doesNotMatch(up, /[0O1I]/);
});

test("{{xlc:uuid}}: 标准与变体形态解析", () => {
    // 默认标准小写 36 字符
    const out1 = ph.applyPlaceholders("ID: {{xlc:uuid}}", NOW, true);
    const uuid1 = out1.replace("ID: ", "");
    assert.match(uuid1, UUID_V4_LOWER_REGEX);

    // upper: 大写 36 字符
    const out2 = ph.applyPlaceholders("ID: {{xlc:uuid|upper}}", NOW, true);
    const uuid2 = out2.replace("ID: ", "");
    assert.match(uuid2, UUID_V4_UPPER_REGEX);

    // simple / compact: 32 字符无连字符
    const out3 = ph.applyPlaceholders("ID: {{xlc:uuid|simple}}", NOW, true);
    const uuid3 = out3.replace("ID: ", "");
    assert.equal(uuid3.length, 32);
    assert.match(uuid3, UUID_V4_SIMPLE_LOWER_REGEX);

    const out4 = ph.applyPlaceholders("ID: {{xlc:uuid|compact}}", NOW, true);
    const uuid4 = out4.replace("ID: ", "");
    assert.equal(uuid4.length, 32);
    assert.match(uuid4, UUID_V4_SIMPLE_LOWER_REGEX);

    // 复合选项：upper,simple
    const out5 = ph.applyPlaceholders("ID: {{xlc:uuid|upper,simple}}", NOW, true);
    const uuid5 = out5.replace("ID: ", "");
    assert.equal(uuid5.length, 32);
    assert.match(uuid5, UUID_V4_SIMPLE_UPPER_REGEX);

    const out6 = ph.applyPlaceholders("ID: {{xlc:uuid|simple|upper}}", NOW, true);
    const uuid6 = out6.replace("ID: ", "");
    assert.equal(uuid6.length, 32);
    assert.match(uuid6, UUID_V4_SIMPLE_UPPER_REGEX);
});

test("{{xlc:id}}: 紧凑短 ID 解析与参数定制", () => {
    // 默认 8 位
    const out1 = ph.applyPlaceholders("Token: {{xlc:id}}", NOW, true);
    const id1 = out1.replace("Token: ", "");
    assert.equal(id1.length, 8);
    assert.doesNotMatch(id1, /[0O1lI]/);

    // 指定长度 12 位
    const out2 = ph.applyPlaceholders("Token: {{xlc:id|12}}", NOW, true);
    const id2 = out2.replace("Token: ", "");
    assert.equal(id2.length, 12);

    // 大写模式
    const out3 = ph.applyPlaceholders("Token: {{xlc:id|upper}}", NOW, true);
    const id3 = out3.replace("Token: ", "");
    assert.equal(id3.length, 8);
    assert.equal(id3, id3.toUpperCase());

    // 长度与大写复合
    const out4 = ph.applyPlaceholders("Token: {{xlc:id|16,upper}}", NOW, true);
    const id4 = out4.replace("Token: ", "");
    assert.equal(id4.length, 16);
    assert.equal(id4, id4.toUpperCase());
});

test("listPlaceholders: 准确识别 uuid 与 id 占位符", () => {
    const kinds = ph.listPlaceholders("订单号 {{xlc:id|12}} UUID {{xlc:uuid|upper}} 日期 {{xlc:date}}");
    assert.deepEqual(kinds, ["id", "uuid", "date"]);
});

test("负向安全：未知参数与非法语法原样保留，绝不吞噬", () => {
    // 非法 uuid 参数
    assert.equal(ph.applyPlaceholders("{{xlc:uuid|invalid}}", NOW, true), "{{xlc:uuid|invalid}}");
    assert.equal(ph.applyPlaceholders("{{xlc:uuid|bogus}}", NOW, true), "{{xlc:uuid|bogus}}");

    // 非法 id 参数
    assert.equal(ph.applyPlaceholders("{{xlc:id|invalid}}", NOW, true), "{{xlc:id|invalid}}");
    assert.equal(ph.applyPlaceholders("{{xlc:id|2}}", NOW, true), "{{xlc:id|2}}"); // 小于 4 位非法
    assert.equal(ph.applyPlaceholders("{{xlc:id|64}}", NOW, true), "{{xlc:id|64}}"); // 大于 32 位非法
});
