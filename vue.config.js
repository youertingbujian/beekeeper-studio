const webpack = require('webpack');
const ThreadsPlugin = require('threads-plugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin')
const path = require('path')
const fpmOptions = [
  "--after-install=build/deb-postinstall"
]

if (  process.env.PI_BUILD ) {
  fpmOptions.push("--architecture")
  fpmOptions.push("armhf")
}

const externals = ['better-sqlite3', 'sequelize', 'typeorm', 'reflect-metadata', 'cassandra-driver', 'mysql2', 'ssh2', 'mssql']
module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.IgnorePlugin(/pg-native/, /pg/),
      new webpack.IgnorePlugin(/kerberos/, /cassandra-driver/),

    ],
    node: {
      dns: 'mock'
    },
    module: {
      rules: [
        {
          test: /node_modules[/\\](iconv-lite)[/\\].+/,
          resolve: {
            aliasFields: ['main']
          }
        }
      ]
    }

  },
  pluginOptions: {
    electronBuilder: {
      chainWebpackRendererProcess: config => {
        config.plugin('threads')
          .use(new ThreadsPlugin({ globalObject: 'self', target: 'webworker', plugins: [
            new webpack.IgnorePlugin(/pg-native/, /pg/),
            new webpack.IgnorePlugin(/kerberos/, /cassandra-driver/),
            new NodeTargetPlugin(),
            new webpack.ExternalsPlugin("commonjs", externals),
          ] }))
      },
      chainWebpackMainProcess: config => {
        config.module
          .rule('babel')
          .test(/\.js$/)
          .use('babel')
          .loader('babel-loader')
            .options({
              presets: [
                ['@babel/preset-env', { 
                  modules: false,
                  targets: {
                      esmodules: true
                    }
                }],
              ],
              plugins: [
                ['@babel/plugin-proposal-decorators', {legacy: true}],
                ['@babel/plugin-proposal-class-properties', {loose: true}],
              ]
            })
      },
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      externals,
      asar: {
        smartUnpack: true,
        asarUnpack: [
          "/js/*.worker.js*"
        ],
      },
      builderOptions: {
        appId: "io.beekeeperstudio.desktop",
        productName: "Beekeeper Studio",
        releaseInfo: {
          releaseNotesFile: "build/release-notes.md"
        },
        files: ['**/*', 'public/icons/**/*'],
        afterSign: "electron-builder-notarize",
        afterPack: "./build/afterPack.js",
        extraResources: [
          {
            from: 'build/launcher-script.sh',
            to: 'launcher-script.sh'
          },
          {
            from: './public',
            to: 'public'
          }
        ],
        mac: {
          entitlements: "./build/entitlements.mac.plist",
          entitlementsInherit: "./build/entitlements.mac.plist",
          icon: './public/icons/mac/bk-icon.icns',
          category: "public.app-category.developer-tools",
          "hardenedRuntime": true
        },
        linux: {
          icon: './public/icons/png/',
          category: "Development",
          target: [
            'snap',
            'deb',
            'appImage'
          ],
          desktop: {
            'StartupWMClass': 'beekeeper-studio'
          },
        },
        deb: {
          publish: [
            'github',
            {
              provider: 'bintray',
              user: 'rathboma',
              repo: 'releases',
              package: 'beekeeper-studio',
              owner: 'beekeeper-studio',
              distribution: 'disco',
              component: 'main'
            },
          ],
          fpm: fpmOptions,
          // when we upgrade Electron we need to check these
          depends: ["libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils", "libatspi2.0-0", "libuuid1", "libappindicator3-1", "libsecret-1-0", "gnupg"]
        },
        appImage: {
          publish: ['github']
        },
        snap: {
          publish: [
            'github',
            'snapStore'
          ],
          environment: {
            "ELECTRON_SNAP": "true"
          },
          plugs: ["default", "ssh-keys", "removable-media", "mount-observe"]
        },
        win: {
          icon: './public/icons/png/512x512.png',
          target: ['nsis', 'portable']
        },
        portable: {
          "artifactName": "${productName}-${version}-portable.exe",
        },
      }
    }
  },

}
