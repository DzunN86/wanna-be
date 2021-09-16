import { dirs, log } from 'boot'
import { BuilderPool } from 'builder'
import { pathExists, readFile } from 'fs-extra'
import { join } from 'path'
import { dbFiles } from '../utils/devFiles'
import { ensureMain } from '../utils/ensureMain'
import { ensureProject } from '../utils/ensureProject'
import { runYarn } from '../utils/yarn'
export const buildDB = async (
  shouldYarn: Record<string, boolean>,
  pool: BuilderPool
) => {
  process.stdout.write(' • DB')
  shouldYarn['db'] = await ensureProject('db', dirs.app.db, {
    pkgs: {
      main: './build/index.js',
      types: './src/index.ts',
      devDependencies: {
        prisma: '^2.28.0',
      },
      dependencies: {
        '@prisma/client': '^2.28.0',
      },
    },
    files: dbFiles,
  })

  await pool.add('db', {
    root: dirs.app.db,
    in: join(dirs.app.db, 'src', 'index.ts'),
    out: join(dirs.app.db, 'build', 'index.js'),

    onBuilt: async () => {
      await ensureMain(dirs.app.db)

      const prismaIndex = join(
        dirs.root,
        'node_modules',
        '.prisma',
        'client',
        'index.js'
      )
      let generatePrisma = false
      if (await pathExists(prismaIndex)) {
        const index = await readFile(prismaIndex, 'utf-8')
        if (index.indexOf('model') < 0) {
          generatePrisma = true
        }
      } else {
        generatePrisma = true
      }

      if (generatePrisma) {
        const schemaPrisma = await readFile(
          join(dirs.app.db, 'prisma', 'schema.prisma')
        )
        if (schemaPrisma.indexOf('model') < 0) {
          console.log('')
          await runYarn(['exec', '-w=db', '-c', 'prisma db pull'])
        }

        console.log('')
        await runYarn(['exec', '-w=db', '-c', 'prisma generate'])
        log('boot', 'Building', false)
      }
    },
  })
}
