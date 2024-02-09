const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    mode: "production",
    entry: {
        index: "./src/index.ts",
    },
    resolve: {
        extensions: [".ts", ".js"],
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
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.ttf$/,
                use: ["file-loader"],
            },
        ],
    },
    plugins: [
        new MonacoWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: "views/index.html",
            chunks: ["index"],
        })
    ],

    devtool: "source-map", // source-map in production, eval in development

    devServer: {
        contentBase: path.join(__dirname, "dist"),
        port: 8080,
        compress: true, // true in production, false in development
        disableHostCheck: true,
    },
};
