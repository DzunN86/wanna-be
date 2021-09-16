import { dirs, log } from 'boot'
import { BuilderPool } from 'builder'
import { copy, pathExists, readJSON, writeJSON } from 'fs-extra'
import { waitUntil } from 'libs'
import { join } from 'path'
import { ensureMain } from '../utils/ensureMain'
import { runYarn } from '../utils/yarn'

export const buildPlatform = async (
  shouldYarn: Record<string, boolean>,
  pool: BuilderPool,
  mode: 'dev' | 'prod'
) => {
  if (mode === 'prod') {
    log('platform', 'Building', false)
  }
  process.stdout.write(' • Platform\n')

  const appDeps = {
    db: '1.0.0',
    server: '1.0.0',
  }

  if (
    (await pathExists(join(dirs.root, 'app'))) &&
    (await pathExists(join(dirs.pkgs.platform, 'package.json')))
  ) {
    const pkgPath = join(dirs.pkgs.platform, 'package.json')
    const json = await readJSON(pkgPath)
    let shouldWrite = false
    for (const [k, v] of Object.entries(appDeps)) {
      if (!json.dependencies[k]) {
        json.dependencies[k] = v
        shouldWrite = true
      }
    }

    if (shouldWrite) {
      await writeJSON(pkgPath, json, {
        spaces: 2,
      })
    }
  }

  await pool.add('platform', {
    root: dirs.pkgs.platform,
    in: join(dirs.pkgs.platform, 'src', 'index.ts'),
    out: join(dirs.pkgs.platform, 'build', 'index.js'),
    watch: [join(dirs.pkgs.platform, 'src')],
    onChange: async (path) => {
      log('platform', 'Restarting Web Server...')
      await pool.rebuild('platform')
    },
    onBuilt: async () => {
      await ensureMain(dirs.pkgs.platform)
    },
  })
}
