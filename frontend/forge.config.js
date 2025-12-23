
// // // // module.exports = {
// // // //   packagerConfig: {
// // // //     asar: true,
// // // //   },
// // // //   rebuildConfig: {},
// // // //   makers: [
// // // //     {
// // // //       name: '@electron-forge/maker-squirrel',
// // // //       config: {},
// // // //     },
// // // //     {
// // // //       name: '@electron-forge/maker-zip',
// // // //       platforms: ['darwin'],
// // // //     },
// // // //     {
// // // //       name: '@electron-forge/maker-deb',
// // // //       config: {},
// // // //     },
// // // //     {
// // // //       name: '@electron-forge/maker-rpm',
// // // //       config: {},
// // // //     },
// // // //   ],
// // // //   plugins: [
// // // //     {
// // // //       name: '@electron-forge/plugin-auto-unpack-natives',
// // // //       config: {},
// // // //     },
// // // //     {
// // // //       name: '@electron-forge/plugin-webpack',
// // // //       config: {
// // // //         mainConfig: './webpack.main.config.js',
// // // //         preloadConfig: './webpack.preload.config.js',
// // // //         port: 3000,  // Change this from whatever it was
// // // //         loggerPort: 9000,
// // // //         devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 http://localhost:3000 ws://localhost:3000 https://api.github.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
// // // //         renderer: {
// // // //           config: './webpack.renderer.config.js',
// // // //           entryPoints: [
// // // //             {
// // // //               html: './src/index.html',
// // // //               js: './src/renderer.js',
// // // //               name: 'main_window',
// // // //               preload: {
// // // //                 js: './src/preload.js',
// // // //               },
// // // //             },
// // // //           ],
// // // //         },
// // // //       },
// // // //     },
// // // //   ],
// // // // };
// // // module.exports = {
// // //   packagerConfig: {
// // //     asar: true,
// // //   },
// // //   rebuildConfig: {},
// // //   makers: [
// // //     {
// // //       name: '@electron-forge/maker-squirrel',
// // //       config: {},
// // //     },
// // //     {
// // //       name: '@electron-forge/maker-zip',
// // //       platforms: ['darwin'],
// // //     },
// // //     {
// // //       name: '@electron-forge/maker-deb',
// // //       config: {},
// // //     },
// // //     {
// // //       name: '@electron-forge/maker-rpm',
// // //       config: {},
// // //     },
// // //   ],
// // //   plugins: [
// // //     {
// // //       name: '@electron-forge/plugin-auto-unpack-natives',
// // //       config: {},
// // //     },
// // //     {
// // //       name: '@electron-forge/plugin-webpack',
// // //       config: {
// // //         mainConfig: './webpack.main.config.js',
// // //         preloadConfig: './webpack.preload.config.js',
// // //         port: 3000,
// // //         loggerPort: 9000,
// // //         devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 http://localhost:3000 ws://localhost:3000 ws://0.0.0.0:3000 https://api.github.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
// // //         renderer: {
// // //           config: './webpack.renderer.config.js',
// // //           entryPoints: [
// // //             {
// // //               html: './src/index.html',
// // //               js: './src/renderer.js',
// // //               name: 'main_window',
// // //               preload: {
// // //                 js: './src/preload.js',
// // //               },
// // //             },
// // //           ],
// // //         },
// // //       },
// // //     },
// // //   ],
// // // };
// // module.exports = {
// //   packagerConfig: {
// //     asar: true,
// //   },
// //   rebuildConfig: {},
// //   makers: [
// //     // ... your makers config
// //   ],
// //   plugins: [
// //     {
// //       name: '@electron-forge/plugin-auto-unpack-natives',
// //       config: {},
// //     },
// //     {
// //       name: '@electron-forge/plugin-webpack',
// //       config: {
// //         mainConfig: './webpack.main.config.js',
// //         preloadConfig: './webpack.preload.config.js',
// //         devServer: {
// //           host: 'localhost',  // ADD THIS
// //         },
// //         port: 3000,
// //         loggerPort: 9000,
// //         devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 http://localhost:3000 ws://localhost:3000 https://api.github.com https://github.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
// //         renderer: {
// //           config: './webpack.renderer.config.js',
// //           entryPoints: [
// //             {
// //               html: './src/index.html',
// //               js: './src/renderer.js',
// //               name: 'main_window',
// //               preload: {
// //                 js: './src/preload.js',
// //               },
// //             },
// //           ],
// //         },
// //       },
// //     },
// //   ],
// // };
// module.exports = {
//   packagerConfig: {
//     asar: true,
//   },
//   rebuildConfig: {},
//   makers: [
//     {
//       name: '@electron-forge/maker-squirrel',
//       config: {},
//     },
//     {
//       name: '@electron-forge/maker-zip',
//       platforms: ['darwin'],
//     },
//     {
//       name: '@electron-forge/maker-deb',
//       config: {},
//     },
//     {
//       name: '@electron-forge/maker-rpm',
//       config: {},
//     },
//   ],
//   plugins: [
//     {
//       name: '@electron-forge/plugin-auto-unpack-natives',
//       config: {},
//     },
//     {
//       name: '@electron-forge/plugin-webpack',
//       config: {
//         mainConfig: './webpack.main.config.js',
//         // Use the separate preload config
//         preloadConfig: './webpack.preload.separate.config.js',
//         devServer: {
//           host: 'localhost',
//         },
//         port: 3000,
//         loggerPort: 9000,
//         devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 http://localhost:3000 ws://localhost:3000 https://api.github.com https://github.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
//         renderer: {
//           config: './webpack.renderer.config.js',
//           entryPoints: [
//             {
//               html: './src/index.html',
//               js: './src/renderer.js',
//               name: 'main_window',
//               preload: {
//                 js: './src/preload.js',
//                 // DO NOT specify a config here
//               },
//             },
//           ],
//         },
//       },
//     },
//   ],
// };
module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        // REMOVE preloadConfig entirely
        devServer: {
          host: 'localhost',
        },
        port: 3000,
        loggerPort: 9000,
        devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 http://localhost:3000 ws://localhost:3000 https://api.github.com https://github.com https://github.githubassets.com https://avatars.githubusercontent.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              // REMOVE preload entry entirely
            },
          ],
        },
      },
    },
  ],
};