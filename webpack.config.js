const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const clientConfig = {
	entry: './js/client/index.js',
  target: 'web', // <=== can be omitted as default is 'web'
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  },
};

if (process.env.NODE_ENV === "production") {
  clientConfig.optimization = {
    minimizer: [
      new UglifyJsPlugin()
    ]
  };
  clientConfig.mode = 'production';
} else {
  clientConfig.mode = 'development';
}

module.exports = [ clientConfig ];
