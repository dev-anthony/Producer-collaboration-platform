
// // const rules = require('./webpack.rules');
// // const plugins = require('./webpack.plugins');

// // module.exports = {
// //   target: 'web',
// //   module: {
// //     rules,
// //   },
// //   plugins: plugins,
// //   resolve: {
// //     extensions: ['.js', '.jsx', '.json', '.css'],
// //   },
// //   devServer: {
    
// //     host: 'localhost',  // ADD THIS
// //     port: 3000,
// //     hot: true,
// //     headers: {
// //       'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:3000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
// //     },
// //   },
// // };
// const rules = require('./webpack.rules');
// const plugins = require('./webpack.plugins');
// const webpack = require('webpack');
// require('dotenv').config({ path: './.env' });

// module.exports = {
//   target: 'web',
//   module: {
//     rules,
//   },
//   plugins: [
//     ...plugins,
//     new webpack.DefinePlugin({
//       'process.env.CLIENT_ID': JSON.stringify(process.env.GITHUB_CLIENT_ID),
//     }),
//   ],
//   resolve: {
//     extensions: ['.js', '.jsx', '.json', '.css'],
//   },
//   devServer: {
//     host: 'localhost',
//     port: 3000,
//     hot: true,
//     headers: {
//       'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:3000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
//     },
//   },
// };
const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins'); // This already has your env variables
// const webpack = require('webpack'); <-- You can delete this line now
// require('dotenv').config({ path: './.env' }); <-- You can delete this line now too if it's already in webpack.plugins.js

module.exports = {
  target: 'web',
  module: {
    rules,
  },
  plugins: plugins, // <-- Just use the imported plugins directly!
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.css'],
  },
  devServer: {
    host: 'localhost',
    port: 3000,
    hot: true,
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:3000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
    },
  },
};