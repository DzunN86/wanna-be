import { dirs, log } from 'boot'
import { BuilderPool } from 'builder'
import { ParentThread } from 'builder/src/thread'
import type { Metafile } from 'esbuild'
import { pathExists, readFile, writeFile } from 'fs-extra'
import { join } from 'path'
import { exit } from 'process'
import { buildDB } from './start/build-db'
import { buildLibs } from './start/build-libs'
import { buildMobile } from './start/build-mobile'
import { buildPlatform } from './start/build-platform'
import { buildServer } from './start/build-server'
import { buildWebDev } from './start/build-web-dev'
import { buildWebProd } from './start/build-web-prod'
import { runYarn } from './utils/yarn'
export interface CustomGlobal extends NodeJS.Global {
  mode: 'dev' | 'prod'
  platform: {
    ready: boolean
    metafile?: Metafile
  }
  entryPoints: Record<string, string>
  twcwd: string
  twconf: string
}

declare const global: CustomGlobal

export const start = async (
  port: number,
  mode: 'dev' | 'prod',
  parent: ParentThread
) => {
  const shouldYarn = {}

  const pool = new BuilderPool()
  global.platform = {
    ready: false,
    metafile: null,
  }

  if (mode === 'dev') {
    const uipath = join(dirs.pkgs.figma, 'bin', 'ui.html')
    if (await pathExists(uipath)) {
      const src = (await readFile(uipath, 'utf-8')).replace(
        '[url]',
        `http://localhost:${port}`
      )
      await writeFile(uipath, src)
    }

    await writeFile(
      join(dirs.pkgs.figma, 'src', 'host.js'),
      `module.exports = 'localhost:${port}';`
    )
  }

  await buildLibs(shouldYarn, pool, mode)
  await buildServer(shouldYarn, pool, mode)
  await buildDB(shouldYarn, pool)
  if (mode === 'dev') await buildWebDev(shouldYarn, pool, mode)
  else await buildWebProd(shouldYarn, pool, mode)

  await buildMobile(shouldYarn, pool, mode)
  await buildPlatform(shouldYarn, pool, mode)

  let yarn = false
  let yarnArgs = 'i'
  for (let [_, moduleNeedYarn] of Object.entries(shouldYarn)) {
    if (moduleNeedYarn) {
      yarn = true
    }
  }
  if (yarn) {
    await runYarn(yarnArgs)
    if (shouldYarn['db']) {
      await runYarn('db prisma db pull')
      await runYarn('db prisma generate')

      log(
        'db',
        `
      
      Database has been initialized.
      Please exit (ctrl-c) and run 'npm start' again
      
      `
      )

      return
    }
  }

  // const session = new MDBX({
  //   path: join(dirs.root, 'sessions.db'),
  //   maxDbs: 5,
  //   keyMode: 'string',
  //   valueMode: 'string',
  //   pageSize: 65536,
  // })

  pool.onParentMessage(async (msg) => {
    if (typeof msg === 'object' && msg.type === 'platform-signal') {
      if (msg.module === 'session') {
        const data = msg.data
        if (data.action === 'session-set') {
          // session.transact((txn) => {
          //   const dbi = txn.getDbi('main')
          //   dbi.put(data.sid, JSON.stringify(data.data))
          // })
        } else if (data.action === 'session-get') {
          // const val = session.transact((txn) => {
          //   const dbi = txn.getDbi('main')
          //   const value = dbi.get(data.sid)
          //   if (value) return JSON.parse(value)
          //   return {}
          // })
          pool.send('platform', {
            action: 'session-get',
            sid: data.sid,
            data: {},
          })
        } else if (data.action === 'session-del') {
          // session.transact((txn) => {
          //   const dbi = txn.getDbi('main')
          //   dbi.del(data.sid)
          // })
        }
      }

      switch (msg.data) {
        case 'rebuild-db':
          await pool.rebuild('db')
          break
        case 'restart':
          await pool.rebuild('platform')
          break
        case 'server-ready':
          global.platform.ready = true
          await pool.send('platform', {
            action: 'start',
            port,
            metafile: global.platform.metafile,
          })
          break
      }
    }
  })

  if (mode === 'dev') {
    pool.run('platform', mode)
  } else {
    exit()
  }
}
