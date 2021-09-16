import { log } from 'boot'
import execa from 'execa'

export const runYarn = async (args: string | any[] = '') => {
  log('boot', 'Running NPM...')

  const run = execa('npm', typeof args === 'string' ? args.split(' ') : args, {
    all: true,
    stdout: 'inherit',
    env: { FORCE_COLOR: 'true' },
  })

  run.all.pipe(process.stdout)
  await run
  log('boot', 'NPM Done')
}
