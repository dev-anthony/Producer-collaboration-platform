const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

module.exports = {
  target: 'web',
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.css'],
  },
  devServer: {
    host: 'localhost',
    port: 3000,
    hot: true,
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:3000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; media-src 'self' blob: data:;",
    },
  },
};