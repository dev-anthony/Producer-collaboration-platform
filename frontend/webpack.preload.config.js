// // module.exports = {
// //   entry: './src/preload.js',
// //   module: {
// //     rules: [],
// //   },
// //   resolve: {
// //     extensions: ['.js'],
// //   },
// //   target: 'electron-preload',
// //   externals: {
// //     electron: 'commonjs electron',
// //   },
// //   node: {
// //     __dirname: false,
// //     __filename: false,
// //   },
// // };
// module.exports = {
//   entry: './src/preload.js',
//   module: {
//     rules: [],
//   },
//   resolve: {
//     extensions: ['.js'],
//   },
//   target: 'electron-preload',
//   mode: process.env.NODE_ENV || 'development',
//   externals: {
//     electron: 'commonjs electron',
//   },
//   node: {
//     __dirname: false,
//     __filename: false,
//   },
//   // Exclude webpack-dev-server from preload
//   devServer: false,
//   optimization: {
//     minimize: false,
//   },
// };
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
  // CRITICAL: No webpack-dev-server features
  optimization: {
    minimize: false,
  },
  performance: {
    hints: false,
  },
};