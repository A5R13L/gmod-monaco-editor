const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const path = require("path");

const smp = new SpeedMeasurePlugin();

module.exports = smp.wrap({
    mode: "production",
    entry: {
        index: "./src/index.ts",
    },
    watchOptions: {
        ignored: /node_modules/
    },
    output: {
        globalObject: "self",
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                loader: "babel-loader",
                exclude: /node_modules/,
                options: {
                    presets: ["@babel/env", "@babel/preset-typescript"]
                }
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.ttf$/,
                type: "asset/resource",
            }
        ],
    },
    resolve: {
        extensions: [".ts", ".js", ".json"]
    },
    plugins: [
        new MonacoWebpackPlugin({
            languages: ["lua"],
            features: []
        }),
        new HtmlWebpackPlugin({
            inject: true,
            template: "views/index.html",
            chunks: ["index"],
        })
    ],
    devtool: process.env.WEBPACK_SERVE ? "eval" : undefined,
    devServer: {
        static: {
            directory: path.join(__dirname, "dist"),
        },
        client: {
            overlay: false
        },
        compress: !process.env.WEBPACK_SERVE,
        port: 8080,
        historyApiFallback: true,
        allowedHosts: "all",
    },
});
