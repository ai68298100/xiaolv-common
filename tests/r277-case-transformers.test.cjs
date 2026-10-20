// T-0130 / R277 / G19：文本大小写与命名范式转换器契约测试
const test = require("node:test");
const assert = require("node:assert");
const {placeholders} = {
    placeholders: require("./.build/entry.cjs").placeholders,
};
const ph = placeholders;

const NOW = new Date(2026, 9, 20, 12, 0, 0);

test("splitWords: 驼峰、标点、缩写与中英分词", () => {
    assert.deepEqual(ph.splitWords("helloWorld"), ["hello", "World"]);
    assert.deepEqual(ph.splitWords("user_login_token"), ["user", "login", "token"]);
    assert.deepEqual(ph.splitWords("order-detail-id"), ["order", "detail", "id"]);
    assert.deepEqual(ph.splitWords("XMLHTTPRequest"), ["XMLHTTP", "Request"]);
    assert.deepEqual(ph.splitWords("APIEndpoint"), ["API", "Endpoint"]);
    assert.deepEqual(ph.splitWords("项目Test123Case"), ["项目", "Test", "123", "Case"]);
    assert.deepEqual(ph.splitWords(""), []);
});

test("transformCase: 基础大小写转换", () => {
    // upper
    assert.equal(ph.transformCase("hello world", "upper"), "HELLO WORLD");
    assert.equal(ph.transformCase("hello world", "uppercase"), "HELLO WORLD");

    // lower
    assert.equal(ph.transformCase("HELLO WORLD", "lower"), "hello world");
    assert.equal(ph.transformCase("HELLO WORLD", "lowercase"), "hello world");

    // title / capitalize
    assert.equal(ph.transformCase("user login status", "title"), "User Login Status");
    assert.equal(ph.transformCase("john doe", "capitalize"), "John Doe");
});

test("transformCase: 编程命名风格转换 (camel, pascal, snake, kebab, constant)", () => {
    const input = "user login token";

    // camelCase
    assert.equal(ph.transformCase(input, "camel"), "userLoginToken");
    assert.equal(ph.transformCase(input, "camelcase"), "userLoginToken");

    // PascalCase
    assert.equal(ph.transformCase(input, "pascal"), "UserLoginToken");
    assert.equal(ph.transformCase(input, "pascalcase"), "UserLoginToken");

    // snake_case
    assert.equal(ph.transformCase(input, "snake"), "user_login_token");
    assert.equal(ph.transformCase("UserLoginToken", "snake"), "user_login_token");

    // kebab-case
    assert.equal(ph.transformCase(input, "kebab"), "user-login-token");
    assert.equal(ph.transformCase("user_login_token", "kebab"), "user-login-token");

    // CONSTANT_CASE
    assert.equal(ph.transformCase(input, "constant"), "USER_LOGIN_TOKEN");
});

test("{{xlc:case|...}}: 占位符解析与管道应用", () => {
    // 管道语法
    assert.equal(
        ph.applyPlaceholders("常量: {{xlc:case|upper|status code}}", NOW, true),
        "常量: STATUS CODE",
    );
    assert.equal(
        ph.applyPlaceholders("驼峰方法: {{xlc:case|camel|get user profile}}", NOW, true),
        "驼峰方法: getUserProfile",
    );
    assert.equal(
        ph.applyPlaceholders("大驼峰类名: {{xlc:case|pascal|order item handler}}", NOW, true),
        "大驼峰类名: OrderItemHandler",
    );
    assert.equal(
        ph.applyPlaceholders("CSS类: {{xlc:case|kebab|btn primary active}}", NOW, true),
        "CSS类: btn-primary-active",
    );
    assert.equal(
        ph.applyPlaceholders("姓名: {{xlc:case|title|william shakespeare}}", NOW, true),
        "姓名: William Shakespeare",
    );
    assert.equal(
        ph.applyPlaceholders("常量名: {{xlc:case|constant|max connection pool}}", NOW, true),
        "常量名: MAX_CONNECTION_POOL",
    );

    // 冒号子命令兼容语法
    assert.equal(
        ph.applyPlaceholders("路由: /{{xlc:case:kebab|user settings page}}", NOW, true),
        "路由: /user-settings-page",
    );
    assert.equal(
        ph.applyPlaceholders("变量: {{xlc:case:snake|api secret key}}", NOW, true),
        "变量: api_secret_key",
    );
});

test("listPlaceholders: 识别 case 占位符", () => {
    const list1 = ph.listPlaceholders("{{xlc:case|upper|abc}} {{xlc:date}}");
    assert.deepEqual(list1, ["case", "date"]);

    const list2 = ph.listPlaceholders("{{xlc:case:snake|abc}}");
    assert.deepEqual(list2, ["case"]);
});

test("负向安全：未知风格与非法语法原样保留，不吞噬内容", () => {
    // 未知风格
    assert.equal(ph.applyPlaceholders("{{xlc:case|unknown_style|hello}}", NOW, true), "{{xlc:case|unknown_style|hello}}");
    assert.equal(ph.applyPlaceholders("{{xlc:case:bogus|hello}}", NOW, true), "{{xlc:case:bogus|hello}}");

    // 缺内容/缺管道
    assert.equal(ph.applyPlaceholders("{{xlc:case}}", NOW, true), "{{xlc:case}}");
    assert.equal(ph.applyPlaceholders("{{xlc:case|only_style}}", NOW, true), "{{xlc:case|only_style}}");
});
