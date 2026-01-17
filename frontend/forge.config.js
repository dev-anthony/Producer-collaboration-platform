
module.exports = {
  packagerConfig: {
    asar: true,
  },
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
        devServer: {
          host: 'localhost',
        },
        port: 9000, // ← CHANGED FROM 3000
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