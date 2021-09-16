import { dirs } from 'boot'
import { FastifyReply, FastifyRequest } from 'fastify'
import {
  ensureDir,
  existsSync,
  readdir,
  readFile,
  remove,
  writeFile,
} from 'fs-extra'
import { parse } from 'jsonc-parser'
import { padStart } from 'lodash'
import { join } from 'path'
import { system } from './prepare'
import fs from 'fs'
import crypto from 'crypto'

export const cmsDir = {
  cms: join(dirs.app.web, 'cms'),
  structures: join(dirs.app.web, 'cms', 'structures'),
  templates: join(dirs.app.web, 'cms', 'templates'),
}

export const parseJSON = (input: string) => {
  return parse(input)
}

export const cmsListFile = async (mode: 'structure' | 'template') => {
  await ensureDir(cmsDir.structures)
  await ensureDir(cmsDir.templates)

  const format = async (mode: 'structure' | 'template', files: string[]) => {
    return await Promise.all(
      files.map(async (e) => {
        if (mode === 'structure') {
          const res = parseJSON(
            await readFile(join(cmsDir.structures, e), 'utf-8')
          )
          if (!res.content.json_option) {
            res.content.json_option = {
              mode: 'file-only',
              db: {
                table: '',
                id_col: 'id',
                value_col: 'value',
              },
            }
          }
          return res
        }
        if (e.indexOf('.html') < 0) {
          return parseJSON(await readFile(join(cmsDir.templates, e), 'utf-8'))
        } else {
          return {
            id: e.split('.')[0],
            html: await readFile(join(cmsDir.templates, e), 'utf-8'),
          }
        }
      })
    )
  }

  const result = await format(
    mode,
    await readdir(mode === 'structure' ? cmsDir.structures : cmsDir.templates)
  )

  const templates: any = {}
  if (mode === 'template') {
    for (let i of result) {
      const key = `${i.id}`
      if (!templates[key]) {
        templates[key] = { content: {} }
      }
      if (i.html) {
        templates[key].content.template = i.html
      } else {
        templates[key] = {
          ...templates[key],
          ...i,
          content: {
            ...i.content,
            ...templates[key].content,
          },
        }
      }
    }

    const res: any = {
      layout: [],
      api: [],
      page: [],
    }
    for (let [k, i] of Object.entries(templates) as any) {
      if (i.content && typeof i.content.type === 'string') {
        const key = i.content.type.toLowerCase()
        if (!res[key]) {
          res[key] = []
        }
        res[key].push(i)
      } else {
        console.log(
          `Invalid template: ${join(
            dirs.app.web,
            'cms',
            'templates',
            k + '.html'
          )}`
        )
      }
    }

    return [...res.layout, ...res.api, ...res.page]
  } else {
    result.unshift({
      title: '- Blank -',
      type: 'cms-structure',
      lang: '',
      status: 'SYSTEM',
      structure: true,
      content: {
        definition: {},
        json_option: {
          mode: 'file-only',
          db: { table: '', id_col: 'id', value_col: 'value' },
        },
        summary_key: [],
      },
      slug: '-',
      id: '00000',
    } as any)
    return result
  }
}

export const cmsSaveFile = async (
  obj: Record<string, any> & {
    id: number | string
    title: string
    content: any
    type: 'cms-structure' | 'cms-template'
  }
): Promise<any> => {
  if (
    !obj.parent_id &&
    system.cache.layout &&
    Object.keys(system.cache.layout).length > 0
  ) {
    obj.parent_id = Object.values(system.cache.layout)[0].id
  }

  let cmd = obj.type === 'cms-structure' ? cmsDir.structures : cmsDir.templates
  let jsonPath = join(cmd, padStart(obj.id + '', 5, '0') + '.json')
  if (!obj.id) {
    obj.id = Math.floor(Math.random() * 90000) + 100
    jsonPath = join(cmd, padStart(obj.id + '', 5, '0') + '.json')
    while (existsSync(jsonPath)) {
      obj.id++
      jsonPath = join(cmd, padStart(obj.id + '', 5, '0') + '.json')
    }
  }
  obj.id = padStart(obj.id + '', 5, '0')
  let template
  if (obj.type === 'cms-template') {
    template = obj.content.template
    delete obj.content.template
  }
  await writeFile(jsonPath, JSON.stringify(obj))

  if (obj.type === 'cms-template') {
    const htmlPath = join(cmd, obj.id + '.html')
    await writeFile(htmlPath, template)

    obj.content.template = template
    if (system.cache.pages[obj.id]) {
      system.cache.pages[obj.id].template = template
    }
  }

  return obj
}

export const cmsDelFile = async (
  mode: 'structure' | 'template',
  id: string
) => {
  if (mode === 'structure') {
    await remove(join(cmsDir.structures, `${id}.json`))
  }
  if (mode === 'template') {
    await remove(join(cmsDir.templates, `${id}.json`))
    await remove(join(cmsDir.templates, `${id}.html`))
  }
  return { status: 'ok' }
}

export const makeEmpty = (
  data: Record<string, any>
): Record<string, any> | boolean | number | string => {
  const result: any = {}

  const _empty = (v: string | Record<string, any>) => {
    let empty: any = null
    if (typeof v === 'string') {
      empty = ''
    } else if (typeof v === 'boolean') {
      empty = false
    } else if (typeof v === 'number') {
      empty = 0
    } else if (typeof v === 'object') {
      if (Array.isArray(v)) {
        empty = []
        if (v.length > 0) {
          empty.push(makeEmpty(v))
        }
      } else if (v instanceof Date) {
        empty = new Date()
      } else if (!!v) {
        empty = makeEmpty(v)
      }
    }
    return empty
  }

  if (typeof data === 'object') {
    for (let [k, v] of Object.entries(data)) {
      result[k] = _empty(v)
    }
    return result
  } else {
    return _empty(data)
  }
}

export const batchEdit = async (req: FastifyRequest, reply: FastifyReply) => {
  const edits: Record<string, { site: string }> = parseJSON(
    req.body as any
  ) as any

  for (let [k, e] of Object.entries(edits)) {
    const p: any = system.cache.pages[k]
    if (p) {
      // cache
      for (let [i, v] of Object.entries(e)) {
        p[i] = v
      }

      // file
      let jsonPath = join(cmsDir.templates, k + '.json')
      const obj = parseJSON(await readFile(jsonPath, 'utf-8'))
      for (let [i, v] of Object.entries(e)) {
        obj[i] = v
      }
      await writeFile(jsonPath, JSON.stringify(obj))
    }
  }

  reply.send(edits)
}

export const createHashFromFile = (filePath) =>
  new Promise<string>((resolve) => {
    const hash = crypto.createHash('sha1')
    fs.createReadStream(filePath)
      .on('data', (data) => hash.update(data))
      .on('end', () => resolve(hash.digest('hex')))
  })
