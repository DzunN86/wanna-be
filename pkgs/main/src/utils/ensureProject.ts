import { ensureDir, pathExists, writeFile, copy } from 'fs-extra'
import { join } from 'path'
export const ensureProject = async (
  name: string,
  path: string,
  opt?: { pkgs?: any; files?: any }
) => {
  await ensureDir(path)
  const files = {
    'package.json': JSON.stringify(
      {
        name,
        version: '1.0.0',
        private: true,
        scripts: {},
        dependencies: {},
        main: './build/index.js',
        ...(opt ? opt.pkgs : {}),
      },
      null,
      2
    ),
    src: {
      'index.ts': 'export const main = {}',
    },
    ...(opt ? opt.files : {}),
  }

  let shouldYarn = false

  const walk = async (
    items: Record<string, string | any>,
    lastPath: string[]
  ) => {
    for (let [k, v] of Object.entries(items)) {
      const wpath = join(path, ...lastPath, k)
      if (typeof v === 'object') {
        if (Array.isArray(v)) {
          if (!(await pathExists(wpath))) {
            await copy(join(...v), wpath)
          }
        } else {
          await ensureDir(wpath)
          await walk(v, [...lastPath, k])
        }
      } else {
        if (!(await pathExists(wpath))) {
          await writeFile(wpath, v.trim())
          shouldYarn = true
        }
      }
    }
  }

  await walk(files, [])
  return shouldYarn
}
