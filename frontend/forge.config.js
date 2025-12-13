// // // // // const { FusesPlugin } = require('@electron-forge/plugin-fuses');
// // // // // const { FuseV1Options, FuseVersion } = require('@electron/fuses');

// // // // // module.exports = {
// // // // //   packagerConfig: {
// // // // //     asar: true,
// // // // //   },
// // // // //   rebuildConfig: {},
// // // // //   makers: [
// // // // //     {
// // // // //       name: '@electron-forge/maker-squirrel',
// // // // //       config: {},
// // // // //     },
// // // // //     {
// // // // //       name: '@electron-forge/maker-zip',
// // // // //       platforms: ['darwin'],
// // // // //     },
// // // // //     {
// // // // //       name: '@electron-forge/maker-deb',
// // // // //       config: {},
// // // // //     },
// // // // //     {
// // // // //       name: '@electron-forge/maker-rpm',
// // // // //       config: {},
// // // // //     },
// // // // //   ],
// // // // //   plugins: [
// // // // //     {
// // // // //       name: '@electron-forge/plugin-auto-unpack-natives',
// // // // //       config: {},
// // // // //     },
// // // // //     {
// // // // //       name: '@electron-forge/plugin-webpack',
// // // // //       config: {
// // // // //         mainConfig: './webpack.main.config.js',
// // // // //         renderer: {
// // // // //           config: './webpack.renderer.config.js',
// // // // //           entryPoints: [
// // // // //             {
// // // // //               html: './src/index.html',
// // // // //               js: './src/renderer.js',
// // // // //               name: 'main_window',
// // // // //               preload: {
// // // // //                 js: './src/preload.js',
// // // // //               },
// // // // //             },
// // // // //           ],
// // // // //         },
// // // // //       },
// // // // //     },
// // // // //     // Fuses are used to enable/disable various Electron functionality
// // // // //     // at package time, before code signing the application
// // // // //     new FusesPlugin({
// // // // //       version: FuseVersion.V1,
// // // // //       [FuseV1Options.RunAsNode]: false,
// // // // //       [FuseV1Options.EnableCookieEncryption]: true,
// // // // //       [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
// // // // //       [FuseV1Options.EnableNodeCliInspectArguments]: false,
// // // // //       [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
// // // // //       [FuseV1Options.OnlyLoadAppFromAsar]: true,
// // // // //     }),
// // // // //   ],
// // // // // };
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
// // //         // This tells webpack not to bundle node built-ins for preload
// // //         devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
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
// //     {
// //       name: '@electron-forge/maker-squirrel',
// //       config: {},
// //     },
// //     {
// //       name: '@electron-forge/maker-zip',
// //       platforms: ['darwin'],
// //     },
// //     {
// //       name: '@electron-forge/maker-deb',
// //       config: {},
// //     },
// //     {
// //       name: '@electron-forge/maker-rpm',
// //       config: {},
// //     },
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
//         preloadConfig: './webpack.preload.config.js',
//         devContentSecurityPolicy: "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';",
//         port: 3000,
//         loggerPort: 9000,
//         renderer: {
//           config: './webpack.renderer.config.js',
//           entryPoints: [
//             {
//               html: './src/index.html',
//               js: './src/renderer.js',
//               name: 'main_window',
//               preload: {
//                 js: './src/preload.js',
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
        preloadConfig: './webpack.preload.config.js',
        port: 3000,  // Change this from whatever it was
        loggerPort: 9000,
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
  ],
};