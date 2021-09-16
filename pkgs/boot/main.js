const { join } = require('path')
const root = join(process.cwd())
const pkgs = join(root, 'pkgs')
const chalk = require('chalk')
const pad = require('lodash.pad')

module.exports = {
  modules: [
    'boot',
    'builder',
    'main',
    'platform',
    'web',
    'server',
    'db',
    'mobile',
  ],
  dirs: {
    root,
    app: {
      db: join(root, 'app', 'db'),
      web: join(root, 'app', 'web'),
      mobile: join(root, 'app', 'mobile'),
      server: join(root, 'app', 'server'),
    },
    pkgs: {
      boot: join(pkgs, 'boot'),
      main: join(pkgs, 'main'),
      figma: join(pkgs, 'figma'),
      libs: join(pkgs, 'libs'),
      web: join(pkgs, 'web'),
      builder: join(pkgs, 'builder'),
      platform: join(pkgs, 'platform'),
    },
  },
  timeSince: (time) => {
    const s = new Date().getTime() - time
    return s > 1000 ? (s / 1000).toFixed(2) + 's' : s + 'ms'
  },
  log: (type, msg, newline = true) => {
    if (typeof type === 'boolean') {
      silent = !type
      return
    }

    if (silent) return

    const tstamp = new Date()
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19)
      .split(' ')[1]
      .trim()
    const strtype = chalk.grey(
      `[ ${chalk.magenta(tstamp)} | ${pad(type, 9, ' ')}]`
    )
    const text = `${strtype} ${msg}${newline ? '\n' : ''}`

    if (newline && !lastLog.newline && lastLog.text.indexOf('\r') >= 0) {
      process.stdout.write('\n')
    }
    process.stdout.write(text)
    lastLog = { text, newline }
  },
}

let silent = false

let lastLog = {
  text: '',
  newline: true,
}
