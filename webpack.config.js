const path = require('path');

const clientConfig = {
  entry: './src/client/index.tsx',
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "ts-loader" },
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  },
};

if (process.env.NODE_ENV === "production") {
  clientConfig.mode = 'production';
} else {
  clientConfig.mode = 'development';
}

module.exports = [ clientConfig ];
