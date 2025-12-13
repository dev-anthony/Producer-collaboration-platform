module.exports = [
  // Add support for native node modules
  {
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },
  // REMOVE or comment out this rule - it's causing the __dirname issue
  // {
  //   test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
  //   parser: { amd: false },
  //   use: {
  //     loader: '@vercel/webpack-asset-relocator-loader',
  //     options: {
  //       outputAssetBase: 'native_modules',
  //     },
  //   },
  // },
  // Add React/JSX support
  {
    test: /\.(js|jsx)$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-react']
      }
    }
  },
  // Add CSS support
  {
    test: /\.css$/,
    use: ['style-loader', 'css-loader'],
  },
];