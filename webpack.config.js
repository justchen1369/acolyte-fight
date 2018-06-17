const path = require('path');

const clientConfig = {
	entry: './js/client.js',
  target: 'web', // <=== can be omitted as default is 'web'
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  }
  //…
};

module.exports = [ clientConfig ];
