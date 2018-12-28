const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const mode = 
  process.env.NODE_ENV === "production"
  ? 'production'
  : 'development';

const clientConfig = {
  entry: './src/client/index.tsx',
  mode,
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      }
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin()
  ],
};

const serverConfig = {
  entry: './src/server/index.tsx',
  mode,
  target: 'node',
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'server.js'
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin()
  ],
  externals: [nodeExternals()],
};

module.exports = [ clientConfig, serverConfig ];
