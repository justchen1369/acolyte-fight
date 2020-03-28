const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
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
      tsLoader(),
      {
        test: /\.s[ac]ss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.glsl$/i,
        use: ['webpack-glsl-loader'],
      },
      {
        test: /\.ai\.js$/i,
        use: ['raw-loader'],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true, // Must be set to true if using source-maps in production
        terserOptions: {
          parse: {},
          compress: {},
          mangle: {
            properties: {
              regex: /^(.+XX)$/,
            },
          },
          module: true,
        }
      }),
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  },
  plugins: plugins(),
};

const aiWorkerConfig = {
  entry: './src/client/ai/worker.tsx',
  mode,
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      tsLoader(),
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'aiWorker.js'
  },
  plugins: plugins(),
};

const audioWorkerConfig = {
  entry: './src/client/audio/worker.tsx',
  mode,
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      tsLoader(),
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'audioWorker.js'
  },
  plugins: plugins(),
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
      tsLoader(),
    ]
  },
  optimization: {
    minimize: false,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'server.js'
  },
  plugins: plugins(),
  externals: [nodeExternals()],
};

module.exports = [ clientConfig, aiWorkerConfig, audioWorkerConfig, serverConfig ];


function plugins() {
  if (mode === 'production') {
    return [];
  } else {
    return [new ForkTsCheckerWebpackPlugin()];
  }
}

function tsLoader() {
  if (mode === 'production') {
    return {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
        },
      };
  } else {
    return {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      };
  }
}