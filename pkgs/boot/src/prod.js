const execa = require('execa')
const { join } = require('path')
const { dirs } = require('../main')
const arg = require('arg')

;(async () => {
  const args = arg({
    '--port': Number,
  })

  const mode = args._[0]
  const port = args['--port'] || 3200

  if (mode !== 'start') {
    const build = execa.node(
      join(dirs.pkgs.boot, 'src', 'start.js'),
      ['prod', '--port', port],
      {
        all: true,
      }
    )
    build.all.pipe(process.stdout)
    await build
  }

  if (mode !== 'build') {
    const server = require(join(dirs.pkgs.platform, 'build', 'index.js'))
    server.start(port)
  }
})()
