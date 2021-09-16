import autoprefixer from 'autoprefixer'
import { dirs, log } from 'boot'
import { ensureDir } from 'fs-extra'
import { readFile, writeFile } from 'fs/promises'
import padEnd from 'lodash.padend'
import trim from 'lodash.trim'
import { basename, dirname, join } from 'path'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import { CustomGlobal } from '../start'
import { webFiles } from './devFiles'
export const cssFilesBuilt: any = {}

declare const global: CustomGlobal

export const cssLoader = (mode: 'dev' | 'prod') => ({
  name: 'css-loader',
  setup: async function (build: any) {
    if (!global.twconf) {
      global.twconf = await readFile(
        join(dirs.app.web, 'tailwind.config.js'),
        'utf-8'
      )
    }

    build.onResolve({ filter: /^loadStyle$/ }, () => {
      return { path: 'loadStyle', namespace: 'loadStyleShim' }
    })
    build.onLoad({ filter: /^loadStyle$/, namespace: 'loadStyleShim' }, () => {
      return {
        contents: `export function loadStyle(src) {  
        return new Promise(function (resolve, reject) {
          const ex = document.querySelector(\`link[href="\${src}"]\`);
          if (ex) ex.remove();
      
          let link = document.createElement("link");
          link.href = src;
          link.rel = "stylesheet";
      
          link.onload = () => resolve(link);
          link.onerror = () => reject(new Error(\`Style load error for \${src}\`));
      
          document.head.append(link);
        });
      }`,
      }
    })

    build.onLoad({ filter: /\.s?css$/ }, async (args: any) => {
      if (!cssFilesBuilt[args.path]) {
        const time = new Date().getTime()
        cssFilesBuilt[args.path] = await buildCss(args.path, mode)

        const s = new Date().getTime() - time
        if (s > 1000) {
          const time = s > 1000 ? (s / 1000).toFixed(2) + 's' : s + 'ms'
          if (global.mode === 'dev') {
            process.stdout.write(` (${time})`)
          } else {
            log(
              'web',
              `built: ${padEnd(basename(args.path), 30, '.')} ${time}.`
            )
          }
        }
      }

      return {
        contents: `
import {loadStyle} from 'loadStyle'
loadStyle(${cssFilesBuilt[args.path]})
        `.trim(),
        loader: 'js',
      }
    })
  },
})

const buildCss = (from: any, mode: 'dev' | 'prod') => {
  return new Promise(async (resolve) => {
    const srcpath = join(dirs.root, 'app', 'web', 'src')
    const nodepath = join(dirs.root, 'node_modules')
    const buildpath = join(dirs.app.web, 'build', 'web')
    let topath = ''

    if (from.indexOf(srcpath) === 0) {
      topath =
        '/' + trim(from.substr(srcpath.length + 1).replace(/\\/g, '/'), '/', {})
    } else if (from.indexOf(nodepath) === 0) {
      topath =
        '/node/' +
        trim(from.substr(nodepath.length + 1).replace(/\\/g, '/'), '/', {})
    } else if (from.indexOf(dirs.pkgs.web) === 0) {
      topath =
        '/pkgs/web/' +
        trim(from.substr(dirs.pkgs.web.length + 1).replace(/\\/g, '/'), '/', {})
    }

    const to = join(buildpath, topath)

    if (
      mode === 'dev' &&
      webFiles['tailwind.config.js'].trim() === global.twconf.trim()
    ) {
      const css = await readFile(from, 'utf-8')
      await ensureDir(dirname(to))
      if (css.indexOf('@tailwind') >= 0) {
        const tailwind = await readFile(
          join(
            dirs.root,
            'node_modules',
            'tailwindcss',
            'dist',
            'tailwind.min.css'
          )
        )
        await writeFile(to, `${tailwind}\n${css}`)
      } else {
        await writeFile(to, css)
      }
    } else {
      const css = await readFile(from, 'utf-8')
      const tailwindcfg = join(dirs.app.web, 'tailwind.config.js')

      const tailwind = {
        ...require(tailwindcfg),
        purge: {
          jit: true,
          enabled: true,
          content: [
            join(dirs.app.web, 'src', '**/*.tsx'),
            join(dirs.pkgs.web, '**/*.tsx'),
            join(dirs.app.web, 'cms', '**/*.html'),
          ],
        },
      }
      const process = await postcss([
        autoprefixer,
        tailwindcss(tailwind),
        require('cssnano')({
          preset: 'default',
        }),
      ]).process(css, {
        from,
        to,
      })
      const result = process.css
      await ensureDir(dirname(to))
      await writeFile(to, result)
    }
    resolve(JSON.stringify(topath))
  })
}
