const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const {EsbuildPlugin} = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const pluginManifest = require("./plugin.json");

// package.zip 需要的静态文件；缺文件时静默跳过，由发布检查脚本负责报错。
const packageFilePatterns = [
    "plugin.json",
    "README.md",
    "icon.png",
    "preview.png",
].concat(Object.values(pluginManifest.readme || {})).map((name) => ({
    from: name,
    to: "./dist/",
})).filter((pattern) => fs.existsSync(path.resolve(__dirname, pattern.from)));

module.exports = (env, argv) => {
    const production = argv.mode === "production";
    const plugins = [
        new webpack.DefinePlugin({
            __LOG_ENABLED__: JSON.stringify(!production || process.env.XLC_LOG === "1"),
        }),
        new MiniCssExtractPlugin({
            filename: production ? "dist/index.css" : "index.css",
        }),
        new CopyPlugin({
            patterns: [
                ...packageFilePatterns,
                {from: "src/i18n", to: "./dist/i18n"},
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
            path: path.resolve(__dirname),
            filename: "dist/[name].js",
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
        plugins,
        stats: {
            modules: false,
            children: false,
        },
    };
};
