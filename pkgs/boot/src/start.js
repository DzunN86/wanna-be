const { build } = require('esbuild')
const { dirs, log } = require('../main')
const { join } = require('path')
const arg = require('arg')
const os = require('os')
const { pathExists, readJSON, readJSONSync, writeJSON } = require('fs-extra')
const chalk = require('chalk')

// to prevent segmentation fault in platform's child thread
// require('sharp');

const readDeps = (pkgdir) => {
  const pkg = join(pkgdir, 'package.json')
  const json = readJSONSync(pkg)
  return Object.keys(json.dependencies) || []
}

const main = async () => {
  const args = arg({
    '--port': Number,
  })
  const mode = args._[0]
  const port = args['--port'] || 3200
  console.log(
    chalk.gray(`[ ${chalk.bold(`    ANDRO ${chalk.green('Base')}`)}      ]`) +
      ` ${mode === 'dev' ? 'Development' : `Production [Port ${port}]`}`
  )

  // make sure builder is built first
  if (!(await pathExists(join(dirs.pkgs.builder, 'build', 'index.js')))) {
    await build({
      entryPoints: [join(dirs.pkgs.builder, 'src', 'index.ts')],
      outfile: join(dirs.pkgs.builder, 'build', 'index.js'),
      bundle: true,
      logLevel: 'silent',
      loader: {
        '.node': 'binary',
      },
      external: readDeps(dirs.pkgs.builder),

      platform: 'node',
      format: 'cjs',
      nodePaths: [join(dirs.root, 'node_modules')],
    })

    const json = await readJSON(join(dirs.pkgs.builder, 'package.json'))
    json.main = './build/index.js'
    await writeJSON(join(dirs.pkgs.builder, 'package.json'), json, {
      spaces: 2,
    })
  }

  // fix esbuild path
  process.env.ESBUILD_BINARY_PATH =
    os.platform() === 'win32'
      ? join(dirs.root, 'node_modules', 'esbuild', 'esbuild.exe')
      : join(dirs.root, 'node_modules', 'esbuild', 'bin', 'esbuild')

  // start main boot
  const { BuilderPool } = require('builder')
  const pool = new BuilderPool()

  log('boot', 'Builder', false)
  await pool.add('builder', {
    in: join(dirs.pkgs.builder, 'src', 'index.ts'),
    out: join(dirs.pkgs.builder, 'build', 'index.js'),
    watch: mode === 'prod' ? undefined : [join(dirs.pkgs.builder, 'src')],
    external: readDeps(dirs.pkgs.builder),
    onChange:
      mode === 'prod'
        ? undefined
        : async () => {
            await pool.rebuild('builder')
            console.log('Builder source changed, please "npm start" again...')
            process.exit()
          },
  })

  process.stdout.write(` • Main`)
  await pool.add('boot', {
    in: join(dirs.pkgs.main, 'src', 'index.ts'),
    out: join(dirs.pkgs.main, 'build', 'index.js'),
    watch: mode === 'prod' ? undefined : [join(dirs.pkgs.main, 'src')],
    external: readDeps(dirs.pkgs.main),
    onChange:
      mode === 'prod'
        ? undefined
        : async () => {
            log('boot', 'Rebuilding...', false)
            await pool.rebuild('boot')
            console.log(' OK')
            log('boot', 'Restarting', false)
          },
  })

  // run main from boot
  pool.run('boot', { mode, port })
}

main()
