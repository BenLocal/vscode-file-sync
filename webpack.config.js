//@ts-check

"use strict";

const path = require("node:path");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: "node", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded
    // Only native modules that cannot be webpack'ed must be external
    // ssh2-sftp-client can be bundled, but it depends on ssh2 (native), so we keep it external
    // All other dependencies (including ali-oss, cos-nodejs-sdk-v5) will be bundled by webpack
    ssh2: "commonjs ssh2", // Contains native bindings (cpu-features, nan) - cannot be bundled
    "ssh2-sftp-client": "commonjs ssh2-sftp-client", // Depends on ssh2 (native) - keep external to avoid bundling ssh2 dependencies
    "cpu-features": "commonjs cpu-features", // Native C++ module - cannot be bundled
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".js", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: [
          path.resolve(__dirname, "src"),
          path.resolve(__dirname, "node_modules/ali-oss"),
        ],
        use: [
          {
            loader: "ts-loader",
            options: {
              allowTsInNodeModules: true,
              onlyCompileBundledFiles: true,
            },
          },
        ],
      },
    ],
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
};
module.exports = [extensionConfig];
