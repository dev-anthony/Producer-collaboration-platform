
module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: ['../server'],
    icon: './assets/icon', 
    protocols: [{ name: 'ProdCollab', schemes: ['prodcollab'] }],
    
    ignore: (file) => {
      if (!file) return false;

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
        setupIcon: './assets/icon.ico',
        loadingGif: './assets/install-loading.gif',
        skipUpdateIcon: true,
        noMsi: true,
        
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
          " script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;" +
          " worker-src 'self' blob:;" +
           " connect-src 'self' http://localhost:5000 http://localhost:9000 ws://localhost:5000 ws://localhost:9000 wss://localhost:5000 wss://localhost:9000 https://*.supabase.co wss://*.supabase.co;" +
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
