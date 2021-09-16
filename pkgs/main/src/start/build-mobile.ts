import { dirs } from 'boot'
import { BuilderPool } from 'builder'
import { ensureFile, pathExists, remove } from 'fs-extra'
import { join } from 'path'

const http = require('isomorphic-git/http/node')
const fs = require('fs')
const git = require('isomorphic-git')

export const buildMobile = async (
  shouldYarn: Record<string, boolean>,
  pool: BuilderPool,
  mode: 'dev' | 'prod'
) => {
  if (!(await pathExists(join(dirs.app.mobile, 'disabled')))) {
    if (!(await pathExists(join(dirs.app.mobile)))) {
      await ensureFile(join(dirs.app.mobile, 'disabled'))
    } else {
      process.stdout.write(' • Mobile')

      const nativeDir = join(dirs.app.mobile, 'native')
      if (!(await pathExists(nativeDir))) {
        await git.clone({
          fs,
          http,
          url: 'https://bitbucket.org/andromedia/base-rn',
          dir: nativeDir,
          depth: 1,
        })
      }

      if (await pathExists(join(nativeDir, '.git'))) {
        await remove(join(nativeDir, '.git'))
      }
    }
  }
}
