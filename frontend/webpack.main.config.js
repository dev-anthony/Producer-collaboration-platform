
module.exports = {
  entry: './src/index.js',
  module: {
    rules: require('./webpack.rules'),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  externals: {
    naudiodon: 'commonjs naudiodon',
  },
};
