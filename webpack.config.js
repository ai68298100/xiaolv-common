const path = require("path");
const fs = require("fs");
const {EsbuildPlugin} = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const pluginManifest = require("./plugin.json");

// package.zip 需要的静态文件；缺文件时静默跳过，由 scripts/check-package.cjs 负责报错。
// 结构约束（R133）：全部产物以 dist/ 为 output.path 根相对落点，package.zip 条目根相对——
// SiYuan 安装按 zip 根找 index.js，dist/ 嵌套前缀会导致安装失败。
const packageFilePatterns = [
    "plugin.json",
    "README.md",
    "LICENSE",
    "icon.png",
    "preview.png",
].concat(Object.values(pluginManifest.readme || {})).map((name) => ({
    from: name,
    to: "./",
})).filter((pattern) => fs.existsSync(path.resolve(__dirname, pattern.from)));

module.exports = (env, argv) => {
    console.error("[cfg] libraryTarget seen at build:", JSON.stringify({
        libraryTarget: "commonjs2"
    }));
    const production = argv.mode === "production";
    const plugins = [
        new MiniCssExtractPlugin({
            filename: "index.css",
        }),
        new CopyPlugin({
            patterns: [
                ...packageFilePatterns,
                {from: "src/i18n", to: "./i18n"},
            ],
        }),
    ];
    if (production) {
        plugins.push(new ZipPlugin({
            filename: "package.zip",
            include: [/\.js$/, /\.css$/, /\.json$/, /\.md$/, /\.png$/, /\.html$/, /^LICENSE$/],
        }));
    }
    return {
        mode: production ? "production" : "development",
        devtool: production ? false : "eval",
        resolve: {
            extensions: [".ts", ".js", ".json"],
            alias: {
                "@": path.resolve(__dirname, "src"),
            },
        },
        entry: {
            index: "./src/index.ts",
        },
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].js",
            // SiYuan 插件加载器在 eval 包装中读取 module.exports：必须 commonjs2。
            // umd 会把赋值写到加载器读不到的位置，真实前端报 has-no-export 静默不装载（R142 P0）。
            libraryTarget: "commonjs2",
        },
        // siyuan npm 包仅含类型；运行时由思源宿主提供同名模块（系列既有方案）
        externals: {
            siyuan: "siyuan",
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "esbuild-loader",
                            options: {
                                loader: "ts",
                                target: "es2019",
                            },
                        },
                    ],
                },
                {
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                        "sass-loader",
                    ],
                },
            ],
        },
        optimization: {
            minimize: production,
            // R142 P0：压缩器必须用 webpack 默认 terser。esbuild-loader 的 EsbuildPlugin
            // 会丢掉 commonjs2 的 module.exports 赋值（真实前端 "has no export"，插件静默不装载，
            // A/B 实证：同一产物手工 esbuild 保留、EsbuildPlugin 丢失）。
            // esbuild-loader 仅承担 TS 转译职责。
        },
        // 桌面插件包不受网页加载体积约束（package.zip/集市 preview.png 超限为误报）
        performance: {
            hints: false,
        },
        plugins,
        stats: {
            modules: false,
            children: false,
        },
    };
};
