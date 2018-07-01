const path = require('path');

const clientConfig = {
	entry: './js/client/index.js',
  target: 'web', // <=== can be omitted as default is 'web'
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  },
  mode: 'production',
};
const settingsConfig = {
	entry: './js/settings/index.js',
  target: 'web', // <=== can be omitted as default is 'web'
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'settings.js'
  },
  mode: 'production',
};
const watchConfig = {
	entry: './js/watch/index.js',
  target: 'web', // <=== can be omitted as default is 'web'
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'watch.js'
  },
  mode: 'production',
};

module.exports = [ clientConfig, settingsConfig, watchConfig ];
