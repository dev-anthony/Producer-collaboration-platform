module.exports = {
  entry: './src/preload.js',
  target: 'electron-preload',
  mode: 'development',
  output: {
    filename: 'preload.js',
  },
  resolve: {
    extensions: ['.js'],
  },
  externals: {
    electron: 'commonjs2 electron',
  },
  node: false,
  optimization: {
    minimize: false,
  },
  // Absolutely no dev server
  infrastructureLogging: {
    level: 'error',
  },
};