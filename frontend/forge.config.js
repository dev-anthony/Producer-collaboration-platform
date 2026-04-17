
// module.exports = {
//   packagerConfig: {
//     asar: true,
//      extraResource: ['../server'],
//     protocols: [
//       {
//         name: 'ProdCollab',
//         schemes: ['prodcollab']
//       }
//     ],
//     ignore: [
//       /^\/\.git/,
//       /^\/node_modules\/.*\.md$/
//     ]
//   },
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
//         devServer: {
//           host: 'localhost',
//         },
//         port: 9000, // ← CHANGED FROM 3000
//         loggerPort: 9001,
//         devContentSecurityPolicy: 
//           "default-src 'self' http://localhost:9000;" +
//           " script-src 'self' 'unsafe-inline' 'unsafe-eval';" +
//           " connect-src 'self' http://localhost:5000 http://localhost:9000 ws://localhost:9000 wss://localhost:9000;" +
//           " img-src 'self' data: https:;" +
//           " style-src 'self' 'unsafe-inline';",
//         renderer: {
//           config: './webpack.renderer.config.js',
//           entryPoints: [
//             {
//               html: './src/index.html',
//               js: './src/renderer.js',
//               name: 'main_window',
//               preload: {
//                 js: './src/preload.js'
//               }
//             }
//           ]
//         }
//       }
//     }
//   ]
// };
module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: ['../server'],
    protocols: [
      {
        name: 'ProdCollab',
        schemes: ['prodcollab']
      }
    ],
    // ✅ FIXED: Include .webpack folder + keep your custom ignores
    ignore: (file) => {
      if (!file) return false;

      // Always include the .webpack folder (required by webpack plugin)
      if (file.startsWith('/.webpack')) return false;

      // Always include package.json
      if (file === '/package.json') return false;

      // Ignore these
      if (file.startsWith('/.git')) return true;
      if (file.startsWith('/src')) return true;
      if (file.startsWith('/node_modules')) return true;
      if (file.match(/node_modules\/.*\.md$/)) return true;
      if (file.startsWith('/.gitignore')) return true;
      if (file.startsWith('/webpack')) return true;
      if (file.startsWith('/.env')) return true;

      return false;
    }
  },

  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'ProdCollab',
        setupExe: 'ProdCollabSetup.exe',
        
      },
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
        devServer: {
          host: 'localhost',
        },
        port: 9000,
        loggerPort: 9001,
        devContentSecurityPolicy:
          "default-src 'self' http://localhost:9000;" +
          " script-src 'self' 'unsafe-inline' 'unsafe-eval';" +
          " connect-src 'self' http://localhost:5000 http://localhost:9000 ws://localhost:9000 wss://localhost:9000;" +
          " img-src 'self' data: https:;" +
          " style-src 'self' 'unsafe-inline';",
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js'
              }
            }
          ]
        }
      }
    }
  ]
};