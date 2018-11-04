const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const clientConfig = {
	entry: './js/client/index.js',
  target: 'web', // <=== can be omitted as default is 'web'
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin()
    ]
  },
  mode: 'production',
};

module.exports = [ clientConfig ];
