const execa = require('execa')
const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const fs = require('fs')

const arg = require('arg')
const { join } = require('path')
const { dirs, log } = require('boot')
const os = require('os')
const {
  pathExists,
  remove,
  copy,
  ensureDir,
  readJSON,
  writeJSON,
  readdirSync,
} = require('fs-extra')
const args = arg({ '--mode': String, '-m': '--m' })
const mode = args['_'].length > 0 ? args['_'][0] : args['--mode']

const basePull = async () => {
  const dir = join(os.tmpdir(), 'andro-base')
  if (await pathExists(dir)) {
    log('base', 'Cleaning base dir...')
    await remove(dir)
  }
  log('base', 'Cloning base from bitbucket...')
  await git.clone({
    fs,
    http,
    url: 'https://bitbucket.org/andromedia/base',
    dir,
    depth: 1,
    onAuth: (url) => {
      return {
        username: 'androdeploy',
        password: 'Okedeh123',
      }
    },
  })

  await remove(join(dir, 'app'))

  log('base', 'Back up current project...')
  const curdirs = fs.readdirSync(dirs.root)
  const olddir = join(dirs.root, '.base', 'old')
  if (await pathExists(olddir)) {
    await remove(olddir)
  }
  await ensureDir(olddir)
  for (let i of curdirs) {
    if (['.base', '.history', 'node_modules', 'app'].indexOf(i) >= 0) {
      continue
    } else {
      await copy(join(dirs.root, i), join(olddir, i))
    }
  }
  log('base', `Backup done: ${olddir}`)

  log('base', 'Updating app to new base...')
  const newdirs = fs.readdirSync(dir)
  for (let i of newdirs) {
    if (i === 'app' || i === '.git' || i === 'node_modules') {
      continue
    }

    if (await pathExists(join(dirs.root, i))) {
      await remove(join(dirs.root, i))
    }
    await copy(join(dir, i), join(dirs.root, i))
  }

  await runYarn('i')
}

const basePush = async () => {
  const dir = join(os.tmpdir(), 'andro-base')

  if (await pathExists(dir)) {
    log('base', 'Cleaning base dir...')
    await remove(dir)
  }
  log('base', `Cloning base from bitbucket (${dir})...`)

  await git.clone({
    fs,
    http,
    url: 'https://bitbucket.org/andromedia/base',
    dir,
    depth: 1,
    onAuth: (url) => {
      return {
        username: 'androdeploy',
        password: 'Okedeh123',
      }
    },
  })

  log('base', 'Updating remote base to current...')
  const curdirs = fs.readdirSync(dirs.root)
  for (let i of curdirs) {
    if (
      ['.base', '.history', 'node_modules', 'app', '.git', '.vscode'].indexOf(
        i
      ) >= 0
    ) {
      continue
    } else {
      if (i === 'pkgs') {
        await remove(join(dir, i))
      }
      await copy(join(dirs.root, i), join(dir, i))
    }
  }

  if (await pathExists(join(dir, 'app'))) {
    await remove(join(dir, 'app'))
  }

  const status = await git.statusMatrix({ dir: dir, pattern: '**', fs })
  await Promise.all(
    status.map(([filepath, , worktreeStatus]) =>
      worktreeStatus
        ? git.add({ fs, dir, filepath: filepath })
        : git.remove({ fs, dir, filepath: filepath })
    )
  )

  log('base', 'Committing changes...')
  let sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'androdeploy',
      email: 'deploy@andromedia.co.id',
    },
    message: 'fix',
  })

  log('base', `Pushing commit: ${sha}...`)
  await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'master',
    force: true,
    onAuth: (url) => {
      return {
        username: 'androdeploy',
        password: 'Okedeh123',
      }
    },
  })

  // we are done
  log('base', 'Done')
}

const baseClear = async () => {
  log('base', 'Clearing build folder...')

  const all = {
    ...dirs.pkgs,
    ...dirs.app,
  }

  const cleanBuild = async (v) => {
    if (await pathExists(join(v, 'build'))) {
      await remove(join(v, 'build'))
    }
    // if (await pathExists(join(v, 'node_modules'))) {
    //   await remove(join(v, 'node_modules'))
    // }

    if (await pathExists(join(v, 'package.json'))) {
      const json = await readJSON(join(v, 'package.json'))
      delete json.main

      if (json.dependencies['web-app']) {
        delete json.dependencies['web-app']
      }
      if (json.dependencies['db']) {
        delete json.dependencies['db']
      }
      if (json.dependencies['server']) {
        delete json.dependencies['server']
      }

      await writeJSON(join(v, 'package.json'), json, {
        spaces: 2,
      })
    }
  }
  for (const [k, v] of Object.entries(all)) {
    if (k === 'boot') continue
    await cleanBuild(v)
  }
  const webdirs = readdirSync(join(dirs.pkgs.web))
  for (const v of webdirs) {
    await cleanBuild(v)
  }
}

switch (mode) {
  case 'pull':
    basePull()
    break
  case 'push':
    basePush()
    break
  case 'clear':
  case 'clean':
    baseClear()
    break
}

const runYarn = async (args = '') => {
  log('base', 'Running Yarn...')

  if (await pathExists(join(dirs.root, 'yarn.lock'))) {
    await remove(join(dirs.root, 'yarn.lock'))
  }

  const run = execa('npm', args.split(' '), {
    all: true,
    stdout: 'inherit',
    env: { FORCE_COLOR: 'true' },
  })

  run.all.pipe(process.stdout)
  await run
  log('base', 'Yarn Done')
}
