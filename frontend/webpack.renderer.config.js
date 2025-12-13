const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

module.exports = {
  target: 'web',  // Add this line
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.css'],
  },
};