import * as path from "path";
import merge from "webpack-merge";
import common from "./webpack.common";

const HtmlWebpackPlugin = require("html-webpack-plugin");
const src = path.resolve(__dirname, "./");

export default merge(
  common,
  {
    mode: "development",
    devtool: "eval-source-map",
    plugins: [
      new HtmlWebpackPlugin({
        template: src + "/index.dev.html",
        filename: "index.html",
      }),
    ],
  },
  {
    devServer: {
      contentBase: path.join(__dirname, "dist"),
      compress: true,
      port: 9000,
    },
  } as any
);
