import { dirs } from 'boot'
import { Plugin } from 'esbuild'
import { lstat, pathExists, readdir, readJSON, stat } from 'fs-extra'
import { join } from 'path'
import { CustomGlobal } from '../start'

declare const global: CustomGlobal
export const devLoader: Plugin = {
  name: 'dev-loader',
  setup: async function (build) {
    const nodes = {}

    if (!(await pathExists(join(dirs.app.web, 'build', 'web', 'node')))) return
    ;(await getDirRecursive(join(dirs.app.web, 'build', 'web', 'node')))
      .filter((e) => {
        return e.path.endsWith('.js')
      })
      .map((e) => {
        const res = e.path
          .replace(/\\/gi, '/')
          .substr(join(dirs.app.web, 'build', 'web', 'node').length + 1)
          .split('/')

        const full = res.join('/')
        res.pop()
        nodes[res.join('/')] = full
      })

    build.onResolve(
      {
        filter: /.*/,
      },
      async (args) => {
        if (nodes[args.path]) {
          return {
            path: `/node/${nodes[args.path]}`,
            external: true,
          }
        } else {
          for (let i of Object.keys(nodes)) {
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
                } else if (await pathExists(p + '.tsx')) {
                  return {
                    path: join(p + '.tsx'),
                  }
                } else if (await pathExists(p + '.d.ts')) {
                  return {
                    path: join(p + '.d.ts'),
                  }
                } else if (await pathExists(p + '.js')) {
                  return {
                    path: join(p + '.js'),
                  }
                } else if (await pathExists(join(p, 'package.json'))) {
                  const pkgjson = await readJSON(join(p, 'package.json'))

                  if (pkgjson.module) {
                    return {
                      path: join(p, pkgjson.module),
                    }
                  } else if (pkgjson['jsnext:main']) {
                    return {
                      path: join(p, pkgjson['jsnext:main']),
                    }
                  } else if (pkgjson.main) {
                    return {
                      path: join(p, pkgjson.main),
                    }
                  }
                } else if ((await pathExists(p)) && (await stat(p)).isFile()) {
                  return {
                    path: p,
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
}

const getDirRecursive = async (
  dir: string
): Promise<{ file: string; path: string; parents: string }[]> => {
  try {
    const items = await readdir(dir)
    let files = []
    for (const item of items) {
      if ((await lstat(`${dir}/${item}`)).isDirectory())
        files = [...files, ...(await getDirRecursive(`${dir}/${item}`))]
      else
        files.push({
          file: item,
          path: join(dir, item),
          parents: dir.split('/'),
        })
    }
    return files
  } catch (e) {
    return e
  }
}
