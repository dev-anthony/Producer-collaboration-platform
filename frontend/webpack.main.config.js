// // module.exports = {
// //   /**
// //    * This is the main entry point for your application, it's the first file
// //    * that runs in the main process.
// //    */
// //   entry: './src/main.js',
// //   // Put your normal webpack config below here
// //   module: {
// //     rules: require('./webpack.rules'),
// //   },
// // };
// module.exports = {
//   /**
//    * This is the main entry point for your application, it's the first file
//    * that runs in the main process.
//    */
//   entry: './src/index.js',
//   // Put your normal webpack config below here
//   module: {
//     rules: require('./webpack.rules'),
//   },
//   resolve: {
//     extensions: ['.js', '.jsx', '.json'],
//   },
// };
module.exports = {
  entry: './src/index.js',
  module: {
    rules: require('./webpack.rules'),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
};