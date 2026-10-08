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
    "icon.png",
    "preview.png",
].concat(Object.values(pluginManifest.readme || {})).map((name) => ({
    from: name,
    to: "./",
})).filter((pattern) => fs.existsSync(path.resolve(__dirname, pattern.from)));

module.exports = (env, argv) => {
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
            include: [/\.js$/, /\.css$/, /\.json$/, /\.md$/, /\.png$/, /\.html$/],
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
            libraryTarget: "umd",
            library: "Plugin",
            libraryExport: "default",
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
            minimizer: [
                new EsbuildPlugin({
                    target: "es2019",
                }),
            ],
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
