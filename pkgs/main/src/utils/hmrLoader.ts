import { dirs } from 'boot'
import { Plugin } from 'esbuild'
import { lstat, pathExists, readdir } from 'fs-extra'
import { join, basename } from 'path'

export const hmrLoader: (entryPoints: Record<string, string>) => Plugin = (
  entryPoints
) => ({
  name: 'hmr-loader',
  setup: async function (build) {
    const entries = {}
    for (let [k, i] of Object.entries(entryPoints)) {
      entries[i] = k
    }

    build.onResolve(
      {
        filter: /.*/,
      },
      async (args) => {
        if (entryPoints[args.path]) {
          return {
            path: `/node/${args.path}/${args.path.replace(
              /[^\w@_]/gi,
              '-'
            )}.js`,
            external: true,
          }
        } else {
          if (args.path[0] !== '.' && args.path[0] !== dirs.root) {
            for (let i of Object.keys(entryPoints)) {
              if (args.path.indexOf(i) === 0) {
                const path = args.path.substr(i.length)
                if (path.indexOf('/') === 0) {
                  const p = join(dirs.root, 'node_modules', args.path)
                  if (await pathExists(join(p + '/index.js'))) {
                    return {
                      path: join(p + '/index.js'),
                    }
                  } else if (await pathExists(p + '.browser.js')) {
                    return {
                      path: join(p + '.browser.js'),
                    }
                  } else if (await pathExists(p + '.ts')) {
                    return {
                      path: join(p + '.ts'),
                    }
                  } else if (await pathExists(p + '.d.ts')) {
                    return {
                      path: join(p + '.d.ts'),
                    }
                  } else if (await pathExists(p + '.js')) {
                    return {
                      path: join(p + '.js'),
                    }
                  }
                }
              }
            }
          }
        }
        return {}
      }
    )
  },
})
