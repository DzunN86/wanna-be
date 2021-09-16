import { dirs, log, timeSince } from 'boot'
import { BuilderPool, Watcher } from 'builder'
import { copy, pathExists, readdir, readJSON, remove, stat } from 'fs-extra'
import { join } from 'path'
import type { CustomGlobal } from '../start'
import { copyDir } from '../utils/copyDir'
import { cssLoader } from '../utils/cssLoader'
import { webFiles, webPkgs } from '../utils/devFiles'
import { devLoader } from '../utils/devLoader'
import { ensureProject } from '../utils/ensureProject'
import { overrideWebIndex } from '../utils/overrideWebIndex'

declare const global: CustomGlobal

export const buildWebDev = async (
  shouldYarn: Record<string, boolean>,
  pool: BuilderPool,
  mode: 'dev' | 'prod'
) => {
  if (!(await pathExists(join(dirs.app.web, 'disabled')))) {
    process.stdout.write(' • Web')

    await remove(join(dirs.app.web, 'build', 'web'))

    if (mode === 'prod') {
      console.log('')
    }

    let shouldCopy = true

    const changed = {
      src: '',
      type: 'change',
      tstamp: new Date().getTime(),
    }
    const startWatcher = async () => {
      // const hmrDirs = [join(dirs.app.web, 'src')]

      // for (const e of await readdir(dirs.pkgs.web)) {
      //   if (await pathExists(join(dirs.pkgs.web, e, 'package.json'))) {
      //     for (const d of await readdir(join(dirs.pkgs.web, e))) {
      //       const dir = join(dirs.pkgs.web, e, d)
      //       if ((await stat(dir)).isDirectory()) {
      //         if (d !== 'node_modules' && d !== 'build') {
      //           hmrDirs.push(dir)
      //         }
      //       }
      //     }
      //   }
      // }

      // new Watcher(hmrDirs, async (event, path) => {
      //   changed.src = path.substr(1)
      //   changed.type = event
      //   changed.tstamp = new Date().getTime()
      // })

      new Watcher([join(dirs.app.web, 'public')], async (event, path) => {
        if (event !== 'delete') {
          const file = path.substr(join(dirs.app.web, 'public').length + 1)
          log('web', `Copying ${file}`)
          if (file === 'index.html') {
            await overrideWebIndex(mode)
          } else {
            await copy(path, join(dirs.app.web, 'build', 'web', file))
          }
        }
      })
    }

    await ensureProject('web-app', dirs.app.web, {
      files: webFiles,
      pkgs: webPkgs,
    })

    let external: string[] = []
    if (await pathExists(join(dirs.app.web, 'build', 'deps.json'))) {
      await readJSON(join(dirs.app.web, 'build', 'deps.json'))
    }

    const ins = [join(dirs.app.web, 'src', 'index.tsx')]
    // const inshmr = [
    //   join(dirs.pkgs.web, 'init', 'src', 'hmr-runtime.ts'),
    //   join(dirs.pkgs.web, 'init', 'src', 'dev-runtime.ts'),
    // ]
    // await pool.add('hmr', {
    //   root: dirs.app.web,
    //   platform: 'browser',
    //   in: inshmr,
    //   buildOptions: {
    //     bundle: true,
    //     external: ['react', 'react-dom'],
    //     logLevel: 'silent',
    //     outdir: join(dirs.app.web, 'build', 'web', 'hmr'),
    //     target: 'es6',
    //   },
    // })

    await pool.add('web', {
      root: dirs.app.web,
      platform: 'browser',
      in: ins,
      buildOptions: {
        incremental: mode === 'dev' ? true : false,
        chunkNames: 'chunks/[name]-[hash]',
        minify: mode === 'dev' ? false : true,
        splitting: true,
        treeShaking: true,
        metafile: true,
        outdir: join(dirs.app.web, 'build', 'web'),
        external,
        target: 'es6',
        watch:
          mode === 'dev'
            ? {
                async onRebuild(error, result) {
                  if (!error && result) {
                    ;(async () => {
                      await waitUntil(() => global.platform.ready)
                      global.platform.metafile = result.metafile

                      const changedFile = changed.src
                        .substr(dirs.root.length)
                        .replace(/\\/gi, '/')

                      if (changedFile) {
                        await pool.send('platform', {
                          action: 'hmr',
                          metafile: result.metafile,
                          type: changed.type,
                          path: changed.src
                            .substr(dirs.root.length)
                            .replace(/\\/gi, '/'),
                        })
                        log(
                          'refresh',
                          `${changedFile} - ${timeSince(changed.tstamp)}`
                        )
                      } else {
                        log('refresh', 'Web rebuilt.')
                      }
                      changed.src = ''
                    })()
                  }
                },
              }
            : undefined,
      },
      plugins: [cssLoader(mode)],
      onBuilt: async (result, buildInfo) => {
        global.platform.metafile = result.metafile
        if (shouldCopy) {
          await copyDir(
            join(dirs.app.web, 'public'),
            join(dirs.app.web, 'build', 'web')
          )
          await overrideWebIndex(mode)
          shouldCopy = false
        }
        if (global.mode === 'dev') {
          startWatcher()
        }
      },
    })
  }
}

const waitUntil = (condition: number | (() => any)) => {
  return new Promise<void>(async (resolve) => {
    if (typeof condition === 'function') {
      if (await condition()) {
        resolve()
        return
      }
      const c = setInterval(async () => {
        if (await condition()) {
          clearInterval(c)
          resolve()
        }
      }, 100)
    } else if (typeof condition === 'number') {
      setTimeout(() => {
        resolve()
      }, condition)
    }
  })
}
