import { dirs, log } from 'boot'
import { FastifyRequest } from 'fastify'
import { SocketStream } from 'fastify-websocket'
import { pathExists, readFile, writeFile } from 'fs-extra'
import { waitUntil } from 'libs'
import { join } from 'path'
import { renderComponent, saveComponent } from '../system/components'
import { reloadCMSSingle } from '../system/prepare'
import { CustomGlobal } from '../server'
import { saveFigmaImage } from '../server/figma-imgs'
import { broadcastHMR } from './hmr'

declare const global: CustomGlobal

interface WSFigmaServer extends WebSocket {
  clientId: number
  clientType: 'figma' | 'dev'
}

export const figmaRoute = (conn: SocketStream, req: FastifyRequest) => {
  const figma = prepareFigma()
  const ws: WSFigmaServer = conn.socket as any
  const reply = (type: string, data: Record<string, any>) => {
    ws.send(JSON.stringify({ type, data }))
  }

  const broadcast = (
    client: 'figma' | 'dev',
    type: string,
    data?: Record<string, any>
  ) => {
    for (let i of figma.ws[client]) {
      i.send(JSON.stringify({ type, data: data || {} }))
    }
  }

  ws.onmessage = async (raw: { data: string }) => {
    try {
      const msg: { type: string; data: Record<string, any> } = JSON.parse(
        raw.data
      )
      const { type, data } = msg

      switch (type) {
        case 'identify':
          const id = figma.nextId
          ws.clientId = id
          ws.clientType = data.type
          if (figma.ws[data.type]) {
            figma.ws[data.type].push(ws)
            if (data.type === 'dev') {
              log('figma', 'Dev Client Connected')
              broadcast('figma', 'dev-connect')
            } else if (data.type === 'figma') {
              log('figma', 'Figma Plugin Connected')
              broadcast('dev', 'figma-connect')
            }
            if (data.meta) {
              for (let i in data.meta) {
                figma[i] = data.meta[i]
              }
            }
            reply(type, {
              id,
              meta: {
                docId: figma.docId,
                docName: figma.docName,
                pages: figma.pages,
                // updates: figma.updates,
              },
            })
            figma.nextId = figma.nextId + 1
          }
          return
        case 'res-image':
          if (msg.data.update === 'y') {
            saveFigmaImage(msg.data as any)
          } else {
            figma.resImages.push(msg.data as any)
          }
          return
        case 'res-bg-image':
          figma.bgImages.push(msg.data as any)
          return
        case 'get-meta':
          await waitUntil(() => figma.docId)
          reply(type, {
            docId: figma.docId,
            docName: figma.docName,
            pages: figma.pages,
            // live: figma.updates,
          })
          return
        case 'req-html':
          {
            if (ws.clientType === 'dev') {
              broadcast('figma', 'req-html', msg.data)
            } else if (ws.clientType === 'figma') {
              broadcast('dev', 'req-html', msg.data)
            }
          }
          return
        case 'upd-frame':
          {
            if (ws.clientType === 'figma') {
              const d = msg.data

              if (d.path) {
                const file = d.path

                let filepath = join(dirs.root, file)
                if (file.indexOf('/app/web/cms/templates') === 0) {
                  const html = d.html
                  if (await pathExists(filepath)) {
                    const oldHtml = await readFile(filepath, 'utf-8')
                    if (oldHtml !== html) {
                      const farr = file.split('/')
                      const id = farr.pop().split('.').shift()

                      await writeFile(filepath, html)
                      await reloadCMSSingle('template', id)
                      // broadcastHMR({
                      //   type: 'cms-reload',
                      //   id: id,
                      //   html: html,
                      // })
                    }
                  }
                } else {
                  if (d.component) {
                    const body = {
                      ...d.component.comp,
                      code: d.html,
                      name: d.component.name,
                      path: d.path,
                      wrapperChanged: true,
                      wrapperCode: d.component.wrapper,
                    }
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
                  }
                }
              }
            }
          }
          return
        case 'set-meta':
          for (let i in data) {
            figma[i] = data[i]
          }
          reply(type, { status: 'ok' })
          break
      }

      if (type.indexOf('get-') === 0) {
        const name = type.substr(4)
        reply(type, figma[name] || {})
        return
      }

      if (type.indexOf('set-') === 0) {
        const name = type.substr(4)
        figma[name] = data
        reply(type, { status: 'ok' })

        if (type === 'set-pages') {
          broadcast('dev', 'get-pages', data)
        }

        return
      }
    } catch (e) {}
  }

  const disconnect = () => {
    for (let i of Object.values(figma.ws)) {
      if (i.indexOf(ws) >= 0) {
        i.splice(i.indexOf(ws), 1)
      }
    }

    if (figma.ws.figma.length === 0 || figma.ws.dev.length === 0) {
      figma.docId = ''
    }

    if (figma.ws.figma.length === 0) {
      broadcast('dev', 'figma-disconnect')
    }

    if (figma.ws.dev.length === 0) {
      broadcast('figma', 'dev-disconnect')
    }
  }
  ws.onclose = disconnect
  ws.onerror = disconnect
}

export const prepareFigma = () => {
  if (!global.figma) {
    global.figma = {
      docId: '',
      docName: '',
      pages: {},
      ws: {
        dev: [],
        figma: [],
      },
      bgImages: [],
      resImages: [],
      nextId: 1000,
    }
  }
  return global.figma
}
