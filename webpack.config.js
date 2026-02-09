const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

const smp = new SpeedMeasurePlugin();

const config = {
    mode: "production",
    entry: {
        index: "./src/index.tsx",
    },
    watchOptions: {
        ignored: /node_modules/,
    },
    output: {
        globalObject: "self",
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
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
                            "@babel/env",
                            {
                                targets: {
                                    browsers: [
                                        "> 1%",
                                        "last 2 versions",
                                        "not dead",
                                    ],
                                },
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
    },
    plugins: [
        new MonacoWebpackPlugin({
            languages: ["lua"],
            features: [],
            filename: "[name].worker.js",
            publicPath: "./",
        }),
        new HtmlWebpackPlugin({
            inject: true,
            template: "views/index.html",
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
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
    devtool: process.env.WEBPACK_SERVE ? "eval" : undefined,
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

module.exports = process.env.WEBPACK_SERVE ? smp.wrap(config) : config;
