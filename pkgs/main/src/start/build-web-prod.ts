import { dirs } from 'boot'
import { BuilderPool } from 'builder'
import { ensureDir, pathExists, remove } from 'fs-extra'
import { join } from 'path'
import tailwind from 'tailwindcss'
import webpack from 'webpack'
import Webpackbar from 'webpackbar'
import type { CustomGlobal } from '../start'
import { copyDir } from '../utils/copyDir'
import { overrideWebIndex } from '../utils/overrideWebIndex'
import { InjectManifest } from 'workbox-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

declare const global: CustomGlobal

export const buildWebProd = async (
  shouldYarn: Record<string, boolean>,
  pool: BuilderPool,
  mode: 'dev' | 'prod'
) => {
  process.stdout.write(' • Web\n\n')

  await ensureDir(join(dirs.app.web, 'build'))
  if (await pathExists(join(dirs.app.web, 'build', 'web'))) {
    await remove(join(dirs.app.web, 'build', 'web'))
  }
  const start = new Promise<void>((resolve) => {
    const twconfig = require(join(dirs.app.web, 'tailwind.config.js'))

    webpack(
      {
        entry: join(dirs.app.web, 'src', 'index.tsx'),
        target: 'web',
        mode: 'production',
        // mode: 'development',
        // devtool: 'eval',
        module: {
          rules: [
            {
              test: /\.js$/,
              enforce: 'pre',
              use: ['source-map-loader'],
            },
            {
              test: /\.css$/i,
              use: [
                {
                  loader: MiniCssExtractPlugin.loader,
                  options: {
                    publicPath: join(dirs.app.web, 'public'),
                  },
                },
                {
                  loader: 'css-loader',
                  options: {
                    importLoaders: true,
                    url: false,
                  },
                },
                {
                  loader: 'postcss-loader',
                  options: {
                    postcssOptions: {
                      plugins: [
                        tailwind({
                          ...twconfig,
                          mode: 'jit',
                          enabled: true,
                          purge: {
                            enabled: true,
                            content: [
                              join(dirs.pkgs.web, '**/*.tsx'),
                              join(dirs.app.web, 'src', '**/*.tsx'),
                              join(dirs.app.web, 'src', '**/*.html'),
                              join(dirs.app.web, 'cms', '**/*.html'),
                            ],
                          },
                        }),
                        ['postcss-preset-env', {}],
                      ],
                    },
                  },
                },
              ],
            },
            {
              test: /\.tsx?$/,
              use: [
                {
                  loader: 'babel-loader',
                  options: {
                    cacheDirectory: true,
                    presets: [
                      [
                        '@babel/preset-env',
                        {
                          targets: {
                            chrome: '45',
                          },
                        },
                      ],
                      ['@babel/preset-react'],
                      [
                        '@babel/preset-typescript',
                        { isTSX: true, allExtensions: true },
                      ],
                    ],
                    plugins: [['@babel/transform-runtime']],
                  },
                },
              ],
            },
          ],
        },
        resolve: {
          extensions: ['.tsx', '.ts', '.js'],
        },
        plugins: [
          new MiniCssExtractPlugin(),
          // new InjectManifest({
          //   swSrc: join(
          //     dirs.pkgs.web,
          //     'init',
          //     'src',
          //     'web',
          //     'service-worker.ts'
          //   ),
          //   swDest: 'sw.js',
          // }),
          new Webpackbar({}),
        ],
        output: {
          filename: '[name].[fullhash].js',
          path: join(dirs.app.web, 'build', 'web'),
        },
      },
      (err: any, stats) => {
        if (err) {
          console.error(err.stack || err)
          if (err.details) {
            console.error(err.details)
          }
          return
        }

        const info = stats.toJson()

        if (stats.hasErrors()) {
          for (let e of info.errors) {
            console.log(`

Path  : ${e.moduleName}
Error : ${e.message.substr(0, 500)}

`)
          }
        }
        resolve()
        console.log('')
      }
    )
  })
  await start
  await copyDir(
    join(dirs.app.web, 'public'),
    join(dirs.app.web, 'build', 'web')
  )
  await overrideWebIndex(mode)
}
