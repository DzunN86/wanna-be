import { dirs } from 'boot'
import { copy, pathExists, readFile, writeFile } from 'fs-extra'
import { join } from 'path'
export const overrideWebIndex = async (mode) => {
  const buildDir = join(dirs.app.web, 'build', 'web')

  let index = await readFile(
    join(dirs.app.web, 'public', 'index.html'),
    'utf-8'
  )
  const script =
    mode === 'prod'
      ? `
<script src="https://unpkg.com/workbox-window@6.1.5/build/workbox-window.prod.umd.js"></script>
<script>
if ('serviceWorker' in navigator) {
  if (workbox && workbox.Workbox) {
    // const wb = new workbox.Workbox('/sw.js');
    // wb.addEventListener('waiting', function (ev) {
    //   window.updateApp = function () {
    //     wb.addEventListener('controlling', (event) => {
    //       window.location.reload();
    //     });
    //     wb.messageSkipWaiting();
    //   }
    //   setTimeout(function () {
    //     if (window.showUpdateApp) {
    //       window.showUpdateApp();
    //     }
    //   },1000)
    // });
    // wb.register();
  }
}
</script>`
      : `\
<script id="main" type="module">
import * as index from "/index.js"
</script>`

  index = index.replace(
    '</body>',
    `${script}
    </body>`
  )

  if (mode === 'dev') {
    if (!(await pathExists(join(buildDir, 'index.js')))) {
      index = index.replace('/index.js', '/app/web/src/index.js')
    }
  }

  index = index.replace(
    '</head>',
    `
<script>window.process = {env: {NODE_ENV: "development",MODE: "development"}};</script>
<script>
  window.imported = {};
  window.require = (path) => {
    if (window.imported[path]) {
      return window.imported[path];
    }
    return {};
  }
</script>
</head>`
  )

  if (mode === 'prod') {
    index = index.replace(/development/gi, 'production')
  }

  await writeFile(join(buildDir, 'index.html'), index)

  if (!(await pathExists(join(dirs.app.web, 'build', 'web', 'f7.css')))) {
    await copy(
      join(
        dirs.root,
        'node_modules',
        'framework7',
        'framework7-bundle.min.css'
      ),
      join(dirs.app.web, 'build', 'web', 'f7.css')
    )
  }
}
