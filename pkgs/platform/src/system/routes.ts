import { dirs } from 'boot'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { RouteGenericInterface } from 'fastify/types/route'
import { readFile } from 'fs-extra'
import type http from 'http'
import { waitUntil } from 'libs'
import { join } from 'path'
import { broadcastHMR } from '../hmr/hmr'
import { CustomGlobal } from '../server'
import { loadSession } from '../session'
import { serialize } from '../utils'
import {
  batchEdit,
  cmsDelFile,
  cmsDir,
  cmsListFile,
  cmsSaveFile,
  parseJSON
} from './system-utils'
import {
  deleteComponent,
  listComponent,
  loadComponent,
  renderComponent,
  saveComponent,
  saveExternal
} from './components'
import { CMS } from './main'
import { ICMSPage, reloadCMSSingle, system } from './prepare'

declare const global: CustomGlobal
const { db } = require('db')

export const cmsRoutes = async (
  mode: 'dev' | 'prod',
  found: { params: any; page: ICMSPage | null },
  req: FastifyRequest<RouteGenericInterface, http.Server, http.IncomingMessage>,
  reply: FastifyReply<
    http.Server,
    http.IncomingMessage,
    http.ServerResponse,
    RouteGenericInterface,
    unknown
  >
) => {
  ;(reply as any).isCMS = true
  const p = found.params || {}

  if (p._devmode) {
    let body = null
    switch (p._action) {
      case 'component-render':
        body =
          typeof req.body === 'string' ? JSON.parse(req.body as any) : req.body

        reply.send(await renderComponent(body.code))
      case 'component-list':
        return reply.send(await listComponent())
      case 'component-load':
        body =
          typeof req.body === 'string' ? JSON.parse(req.body as any) : req.body

        if (body.path && body.name) {
          return reply.send(
            await loadComponent({ name: body.name, path: body.path })
          )
        }
        return reply.code(404)
      case 'component-delete':
        body =
          typeof req.body === 'string' ? JSON.parse(req.body as any) : req.body
        await deleteComponent(body.name)
        break
      case 'component-fallback':
        {
          const opt =
            typeof req.body === 'string'
              ? JSON.parse(req.body as any)
              : req.body

          if (!opt || !Array.isArray(opt)) {
            return reply.send({ status: 'failed' })
          }

          await waitUntil(() => !global.fallbackSaving)
          global.fallbackSaving = true
          const list = await listComponent(true)
          let changed = false
          if (!Array.isArray(list)) {
            for (let i of list.result) {
              for (let o of opt) {
                if (i.name === o.name && o.fallback) {
                  i.fallback = o.fallback
                  changed = true
                }
              }
            }

            if (changed) {
              await saveExternal(list)
            }
          }
          setTimeout(() => {
            global.fallbackSaving = false
          }, 500)
          return reply.send({ status: 'ok' })
        }
        break
      case 'component-save':
        body =
          typeof req.body === 'string' ? JSON.parse(req.body as any) : req.body
        const result = await saveComponent(body)
        if (body && body.code) {
          broadcastHMR({
            type: 'component-reload',
            id: body.name,
            html: await renderComponent(body.code),
          })
          if (result.force) {
            setTimeout(
              () =>
                broadcastHMR({
                  type: 'unlink',
                }),
              500
            )
          }
        }
        reply.send(result)

        return
      case 'sform':
        if (req.method.toLowerCase() === 'post') {
          const body =
            typeof req.body === 'string'
              ? JSON.parse(req.body as any)
              : req.body
          let jsonPath = join(cmsDir.structures, p._id + '.json')
          const obj = JSON.parse(await readFile(jsonPath, 'utf-8'))
          for (let [i, v] of Object.entries(body)) {
            obj.content.definition[i] = v
          }

          return
        }

        const user = await loadSession(req, reply)
        reply.send({
          id: p._id,
          title: '',
          data: {},
        })
        return
      case 'batch-edit':
        await batchEdit(req, reply)
        return
      case 'broadcast-reload':
        if (req.body) {
          const body = req.body as any

          broadcastHMR({
            type: 'cms-reload',
            id: body.id,
            html: body.html,
          })
        }
        reply.send({ status: 'ok' })
        return
      case 'reload-index':
        let raw
        raw = await readFile(
          join(dirs.app.web, 'build', 'src', 'index.html'),
          'utf-8'
        )
        system.root.indexHtmlSource = raw

        broadcastHMR({
          type: 'hard-reload',
        })
        return
      case 'reload-template':
        await reloadCMSSingle('template', p._id)
        reply.send({ status: 'ok' })
        return
      case 'del-template':
        delete system.cache.pages[p._id]
        delete system.cache.layout[p._id]

        reply.send(await cmsDelFile('template', p._id))
        return
      case 'list-template':
        reply.send(await cmsListFile('template'))
        return
      case 'save-template':
        reply.type('application/json')
        if (req.method.toLowerCase() === 'post') {
          const body =
            typeof req.body === 'string'
              ? parseJSON(req.body as string)
              : req.body

          if (body.title) {
            const data = await cmsSaveFile(body)
            reply.send(serialize({ status: 'ok', data }))
          } else {
            reply.send(serialize({ status: 'failed' }))
          }
          return
        }
        reply.send('{}')
        return
    }
  }

  const main = CMS.get()
  return await main.render(mode, found, req, reply)
}
