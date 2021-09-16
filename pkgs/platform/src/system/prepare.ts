import { getDMMF } from '@prisma/sdk'
import { dirs, log } from 'boot'
import type { FastifyRequest } from 'fastify'
import { lstat, pathExists, readdir, readFile } from 'fs-extra'
import { minify } from 'html-minifier'
import { waitUntil } from 'libs'
import { join } from 'path'
import { CustomGlobal } from '../server'
import { IComponent, listComponent, loadComponent } from './components'
import { CMS } from './main'
import {
  cmsDir,
  cmsListFile as systemListFile,
  createHashFromFile,
  parseJSON
} from './system-utils'

declare const global: CustomGlobal

export interface ICMSPage {
  id: string
  name: string
  slug: string
  type: 'API' | 'Page'
  layout_id: number
  template: string
  structure: string
  server_on_load: string
  site: string
}

export interface ICMSStructure {
  id: string
  name: string
  json_option: {
    mode: 'file-only' | 'database-table'
    last_query?: number
    last_save?: number
    db: {
      table: string
      id_col: string
      value_col: string
    }
  }
  query: string
  table: string
  default: any
  server_on_save: string
  server_on_load: string
  structure: true
}

interface IServerSystem {
  build_id: string
  cache: {
    components: Record<string, IComponent>
    layout: Record<
      string,
      {
        id: string
        name: string
        template: string
        structure: string
      }
    >
    pages: Record<string, ICMSPage>
  }
  mode: 'dev' | 'prod'
  devPort: number
  root: {
    indexHtmlSource: string
    indexHtmlCached?: string
    html: (req?: FastifyRequest) => Promise<string | null>
  }
}

export const system: IServerSystem = {
  build_id: '',
  cache: {
    components: {},
    layout: {},
    pages: {},
  },
  mode: 'dev',
  devPort: 0,
  root: {
    indexHtmlSource: '',
    html: async (req: FastifyRequest) => null,
  },
}

export const prepareCMS = async (mode: 'dev' | 'prod', devPort?: number) => {
  system.mode = mode
  if (devPort) system.devPort = devPort
  CMS.new()

  global.dmmf = await getDMMF({
    datamodelPath: join(dirs.app.db, 'prisma', 'schema.prisma'),
  })

  if (mode === 'dev') {
    ;(async () => {
      await waitUntil(() => global.metafile)
      log('platform', `Ready: http://localhost:${global.port}`)
    })()
  }
  reloadSystemCache()
}

export const reloadCMSSingle = async (
  type: 'structure' | 'template',
  id: any
) => {
  const res = await readFile(
    join(
      type === 'template' ? cmsDir.templates : cmsDir.structures,
      `${id}.json`
    ),
    'utf-8'
  )

  if (res) {
    let json = parseJSON(res)
    if (type === 'template') {
      json.content.template = await readFile(
        join(cmsDir.templates, `${id}.html`),
        'utf-8'
      )
    }
    await formatSystemResult([json])
  }
}

export const reloadSystemCache = async () => {
  const res = [
    ...(await systemListFile('structure')),
    ...(await systemListFile('template')),
  ]

  delete require.cache['web-app/src/external']
  system.cache = {
    components: {},
    layout: {},
    pages: {},
  }

  // load all components
  const components = await listComponent()
  if (Array.isArray(components)) {
    await Promise.all(
      components.map(async (e) => {
        system.cache.components[e.name] = await loadComponent(e)
      })
    )
  }

  // generate build id
  if (global.mode === 'dev') {
    system.build_id = await createHashFromFile(
      join(dirs.app.web, 'build', 'web', 'index.js')
    )
  } else if (global.mode === 'prod') {
    const dir = await readdir(join(dirs.app.web, 'build', 'web'))
    for (let i of dir) {
      if (i.startsWith('main.') && i.endsWith('.js')) {
        system.build_id = i.split('.')[1]
      }
    }
  }

  // load index.html
  if (!system.root.indexHtmlSource) {
    await waitUntil(
      async () =>
        await pathExists(join(dirs.app.web, 'build', 'web', 'index.html'))
    )
    system.root = {
      indexHtmlSource: await readFile(
        join(dirs.app.web, 'build', 'web', 'index.html'),
        'utf-8'
      ),
      indexHtmlCached: '',
      html: async function () {
        if (global.mode === 'prod' && this.indexHtmlCached) {
          return this.indexHtmlCached
        }

        let result = this.indexHtmlSource.toString()
        if (global.mode === 'prod') {
          result = result.replace(
            '</body>',
            `<script src="/main.${system.build_id}.js"></script></body>`
          )
        }

        result = minify(result, {
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
          removeTagWhitespace: true,
          removeComments: true,
        })
        this.indexHtmlCached = result
        return result
      },
    }
  }

  // finalize
  await formatSystemResult(res)
  log(
    'platform',
    `[${Object.keys(system.cache.pages).length} Pages]\
 [${Object.keys(system.cache.components).length} Components] Loaded`
  )
}

const formatSystemResult = async (res: any[]) => {
  const { layout, pages } = system.cache
  for (let v of Object.values(res) as any) {
    const content: any = v.content || {}

    if (content.type !== 'Layout' && (v.parent_id || content.type === 'API')) {
      pages[v.id] = {
        template: content.template || '',
        layout_id: v.parent_id,
        id: v.id,
        type: content.type,
        name: v.title,
        server_on_load: content.server_on_load,
        structure: content.structure,
        slug: v.slug,
        site: v.site,
      }
    } else {
      layout[v.id] = {
        template: content.template || '',
        id: v.id,
        structure: content.structure,
        name: v.title,
      }
    }
  }
}

export const getDirRecursive = async (
  dir: string
): Promise<{ file: string; path: string; parents: string }[]> => {
  try {
    const items = await readdir(dir)
    let files = []
    for (const item of items) {
      if ((await lstat(`${dir}/${item}`)).isDirectory())
        files = [...files, ...(await getDirRecursive(`${dir}/${item}`))]
      else
        files.push({
          file: item,
          path: join(dir, item),
          parents: dir.split('/'),
        })
    }
    return files
  } catch (e) {
    return e
  }
}
