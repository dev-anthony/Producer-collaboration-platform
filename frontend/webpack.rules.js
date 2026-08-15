// module.exports = [
//   // Add support for native node modules
//   {
//     test: /native_modules[/\\].+\.node$/,
//     use: 'node-loader',
//   },
//   // REMOVE or comment out this rule - it's causing the __dirname issue
//   // {
//   //   test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
//   //   parser: { amd: false },
//   //   use: {
//   //     loader: '@vercel/webpack-asset-relocator-loader',
//   //     options: {
//   //       outputAssetBase: 'native_modules',
//   //     },
//   //   },
//   // },
//   // Add React/JSX support
//   {
//     test: /\.(js|jsx)$/,
//     exclude: /node_modules/,
//     use: {
//       loader: 'babel-loader',
//       options: {
//         presets: ['@babel/preset-react']
//       }
//     }
//   },
//   // Add CSS support
//   {
//     test: /\.css$/,
//     use: ['style-loader', 'css-loader', 'postcss-loader'],
//   },
// ];
module.exports = [
  // Add support for native node modules
  {
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },
  // Add React/JSX support (only for renderer)
  {
    test: /\.(js|jsx)$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/preset-react']
      }
    }
  },
  // Add CSS support (only for renderer)
  {
    test: /\.css$/,
    use: ['style-loader', 'css-loader', 'postcss-loader'],
  },
];