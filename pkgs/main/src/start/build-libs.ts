import { dirs } from 'boot'
import { BuilderPool } from 'builder'
import { waitUntil } from 'libs'
import { join } from 'path'
import { CustomGlobal } from '../start'
import { ensureMain } from '../utils/ensureMain'
import { ensureProject } from '../utils/ensureProject'

declare const global: CustomGlobal

export const buildLibs = async (
  shouldYarn: Record<string, boolean>,
  pool: BuilderPool,
  mode: 'dev' | 'prod'
) => {
  process.stdout.write(' • Libs')
  shouldYarn['libs'] = await ensureProject('server', dirs.pkgs.libs)
  await pool.add('libs', {
    root: dirs.pkgs.libs,
    in: join(dirs.pkgs.libs, 'src', 'index.tsx'),
    out: join(dirs.pkgs.libs, 'build', 'index.js'),
    watch: mode === 'prod' ? undefined : [join(dirs.pkgs.libs, 'src')],
    onChange:
      mode === 'prod'
        ? undefined
        : async (event, path) => {
            await pool.rebuild('libs')
           
            global.platform.ready = false;
            pool.running['platform'].restart();
          },
    onBuilt: async () => {
      await ensureMain(dirs.pkgs.libs)
    },
  })
}
