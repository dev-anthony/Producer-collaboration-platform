// const webpack = require('webpack');

// module.exports = [
//   new webpack.DefinePlugin({
//     'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
//   }),
// ];
const webpack = require('webpack');
require('dotenv').config({ path: './.env' });

module.exports = [
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.CLIENT_ID': JSON.stringify(process.env.CLIENT_ID),
  }),
];