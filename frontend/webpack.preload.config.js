
module.exports = {
  entry: './src/preload.js',
  target: 'electron-preload',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  output: {
    filename: 'preload.js',
  },
  module: {
    rules: [],
  },
  resolve: {
    extensions: ['.js'],
  },
  externals: {
    electron: 'commonjs2 electron',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  optimization: {
    minimize: false,
  },
  performance: {
    hints: false,
  },
};