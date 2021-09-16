import { dirs } from 'boot'
import { BuilderPool } from 'builder'
import { join } from 'path'
import { CustomGlobal } from '../start'
import { serverFiles } from '../utils/devFiles'
import { ensureMain } from '../utils/ensureMain'
import { ensureProject } from '../utils/ensureProject'

declare const global: CustomGlobal

export const buildServer = async (
  shouldYarn: Record<string, boolean>,
  pool: BuilderPool,
  mode: 'dev' | 'prod'
) => {
  process.stdout.write(' • Server')
  shouldYarn['server'] = await ensureProject('server', dirs.app.server, {
    pkgs: {
      main: './build/index.js',
      types: './src/index.ts',
    },
    files: serverFiles,
  })
  await pool.add('server', {
    root: dirs.app.server,
    in: join(dirs.app.server, 'src', 'index.ts'),
    out: join(dirs.app.server, 'build', 'index.js'),
    watch: mode === 'prod' ? undefined : [join(dirs.app.server, 'src')],
    onChange:
      mode === 'prod'
        ? undefined
        : async (event, path) => {
            global.platform.ready = false
            pool.rebuild('server')
            global.platform.ready = false
            if (pool.running['platform']) pool.running['platform'].restart()
          },
    onBuilt: async () => {
      await ensureMain(dirs.app.server)
    },
  })
}
