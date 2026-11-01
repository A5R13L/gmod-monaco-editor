const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const TerserPlugin = require("terser-webpack-plugin");

const smp = new SpeedMeasurePlugin();

const patchTarget =
    "node_modules/monaco-editor/esm/vs/editor/common/services/findSectionHeaders.js";
if (!fs.existsSync(path.resolve(__dirname, patchTarget))) {
    throw new Error(
        `Monaco patch target not found: ${patchTarget}\n` +
            "The findSectionHeaders patch may need updating for this Monaco version.",
    );
}

const isDev = Boolean(process.env.WEBPACK_SERVE);

const config = {
    mode: isDev ? "development" : "production",
    cache: isDev ? { type: "filesystem" } : undefined,
    entry: {
        polyfills: "./src/polyfills.ts",
        index: { import: "./src/index.tsx", dependOn: "polyfills" },
    },
    watchOptions: {
        ignored: /node_modules/,
    },
    output: {
        globalObject: "self",
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
        environment: {
            arrowFunction: true,
            bigIntLiteral: false,
            const: true,
            destructuring: true,
            dynamicImport: true,
            dynamicImportInWorker: false,
            forOf: true,
            globalThis: true,
            module: false,
            optionalChaining: true,
            templateLiteral: true,
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "babel-loader",
                exclude: /node_modules/,
                options: {
                    presets: [
                        [
                            "@babel/preset-env",
                            {
                                targets: { chrome: "86" },
                                useBuiltIns: "usage",
                                corejs: 3,
                                bugfixes: true,
                                modules: false,
                            },
                        ],
                        [
                            "@babel/preset-react",
                            {
                                runtime: "automatic",
                            },
                        ],
                        "@babel/preset-typescript",
                    ],
                },
            },
            {
                test: /\.js$/,
                include: /node_modules[\\/]monaco-editor/,
                loader: "babel-loader",
                options: {
                    presets: [
                        [
                            "@babel/preset-env",
                            {
                                targets: { chrome: "86" },
                                useBuiltIns: "usage",
                                corejs: 3,
                                bugfixes: true,
                            },
                        ],
                    ],
                },
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.scss$/,
                use: ["style-loader", "css-loader", "sass-loader"],
            },
            {
                test: /\.ttf$/,
                type: "asset/resource",
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".json"],
        fallback: {
            path: require.resolve("path-browserify"),
            fs: false,
        },
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: require.resolve("process/browser"),
        }),
        new webpack.NormalModuleReplacementPlugin(
            /monaco-editor\/esm\/.*\/findSectionHeaders\.js$/,
            path.resolve(__dirname, "src/patches/findSectionHeaders.js"),
        ),
        new MonacoWebpackPlugin({
            languages: ["lua"],
            features: [
                "bracketMatching",
                "clipboard",
                "codeAction",
                "colorPicker",
                "comment",
                "contextmenu",
                "cursorUndo",
                "find",
                "folding",
                "fontZoom",
                "format",
                "hover",
                "indentation",
                "linesOperations",
                "links",
                "multicursor",
                "parameterHints",
                "quickCommand",
                "quickOutline",
                "smartSelect",
                "suggest",
                "wordHighlighter",
                "wordOperations",
            ],
            filename: "[name].worker.js",
            publicPath: "./",
        }),
        new HtmlWebpackPlugin({
            inject: true,
            template: "views/index.html",
            chunks: ["polyfills", "index"],
            chunksSortMode: "manual",
        }),
    ],
    optimization: {
        minimize: !isDev,
        minimizer: isDev
            ? []
            : [
                  new TerserPlugin({
                      terserOptions: {
                          compress: {
                              drop_console: false,
                              passes: 2,
                              pure_funcs: ["console.debug"],
                          },
                          format: {
                              comments: false,
                          },
                      },
                      extractComments: false,
                  }),
              ],
        usedExports: true,
        sideEffects: false,
        moduleIds: "deterministic",
        chunkIds: "deterministic",
        concatenateModules: true,
        splitChunks: {
            chunks: "all",
            minSize: 20000,
            cacheGroups: {
                monaco: {
                    test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
                    name: "monaco",
                    priority: 20,
                    reuseExistingChunk: true,
                    enforce: true,
                },
                vendor: {
                    test: /[\\/]node_modules[\\/](?!monaco-editor[\\/])/,
                    name: "vendors",
                    priority: 10,
                    reuseExistingChunk: true,
                },
            },
        },
    },
    performance: {
        hints: false,
    },
    devtool: isDev ? "eval-cheap-module-source-map" : undefined,
    devServer: {
        static: {
            directory: path.join(__dirname, "dist"),
        },
        client: {
            overlay: false,
        },
        compress: !process.env.WEBPACK_SERVE,
        port: 8080,
        historyApiFallback: true,
        allowedHosts: "all",
    },
};

const exported =
    process.env.WEBPACK_MEASURE === "1" ? smp.wrap(config) : config;

module.exports = exported;
