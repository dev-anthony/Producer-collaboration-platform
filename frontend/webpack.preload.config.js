module.exports = {
  entry: './src/preload.js',
  module: {
    rules: [],
  },
  resolve: {
    extensions: ['.js'],
  },
  target: 'electron-preload',
  externals: {
    electron: 'commonjs electron',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};