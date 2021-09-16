import { getDMMF } from '@prisma/sdk'
import { dirs, log } from 'boot'
import type { Metafile } from 'esbuild'
import fastify from 'fastify'
import fastifyCookie from 'fastify-cookie'
import fastifyEtag from 'fastify-etag'
import fastifyForm from 'fastify-formbody'
import fastifyMultipart from 'fastify-multipart'
import fastifyStatic from 'fastify-static'
import fastifyWS from 'fastify-websocket'
import http from 'http'
import type fetch from 'node-fetch'
import { join } from 'path'
import { ParentThread } from '../../builder/src/thread'
import { figmaRoute } from './hmr/figma'
import { hmrRoute, sendDevFile } from './hmr/hmr'
import { authPlugin, jsonPlugin } from './server/middleware'
import { allRoutes } from './server/routes'
import { CMS } from './system/main'
import { prepareCMS } from './system/prepare'
import { zipFolder } from './utils'
import sodium from 'sodium-universal'

export interface IFigma {
  docId: string
  docName: string
  pages: Record<string, string[]>
  resImages: {
    type: string
    value: any
    frame_id: string
    node_id: string
  }[]
  bgImages: {
    hash: string
    value: any
  }[]
  ws: {
    figma: WebSocket[]
    dev: WebSocket[]
  }
  nextId: number
}

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T
export interface CustomGlobal extends NodeJS.Global {
  mode: 'dev' | 'prod'
  host: string
  scheme: string
  port: number
  metafile?: Metafile
  cmsInstance: CMS
  secret: Uint8Array
  oldMetafile?: Metafile
  componentRefresh: Record<string, true>
  serverRoutes: string[]
  figma: IFigma
  fallbackSaving: boolean
  fetch: typeof fetch
  parent: MainControl
  sessionGet: Record<string, any>
  dmmf: ThenArg<ReturnType<typeof getDMMF>>
  fileCaches: Record<string, string>
}
declare const global: CustomGlobal

export type MainControl = {
  signal: (
    module: 'session' | 'platform' | 'web' | 'server' | 'db' | 'mobile',
    data: any | 'restart'
  ) => Promise<any>
  onMessage: (msg: any) => Promise<void>
}

export const server = async (
  main: MainControl,
  mode: 'dev' | 'prod',
  parent?: ParentThread
) => {
  await prepareCMS(mode)
  global.sessionGet = {}
  global.parent = main
  global.mode = mode
  global.secret = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.randombytes_buf(global.secret)

  const server =
    mode === 'dev'
      ? fastify({
          serverFactory: (handler) => {
            const server = http.createServer((req, res) => {
              handler(req, res)
            })

            return server
          },
        })
      : fastify()

  server.register(fastifyMultipart)
  server.register(fastifyCookie)
  server.register(fastifyForm)
  server.register(fastifyWS)
  server.register(fastifyEtag)
  server.register(jsonPlugin)
  server.register(authPlugin)
  server.register(fastifyStatic, {
    root: join(dirs.app.web, 'build', 'web'),
    serve: false,
  })

  server.setErrorHandler(function (error, req, reply) {
    const rqh = JSON.stringify(req.headers, null, 2)
      .split('\n')
      .join('\n       ')

    const reh = JSON.stringify(reply.getHeaders(), null, 2)
      .split('\n')
      .join('\n       ')
    log(
      'error',
      `
  URL           : ${req.url} (${reply.statusCode})
  Req Headers   : ${rqh.substr(1, rqh.length - 2)}
  Reply Headers : ${reh.substr(1, reh.length - 2).trim()}
  Stack Trace   :  
  ${
    !!error && !!error.stack
      ? '     ' + error.stack.split('\n').join('\n     ')
      : error
  } 
`
    )
    // Send error response
    reply
      .type('application/json')
      .status(500)
      .send({
        status: 'error',
        code: error.statusCode || 500,
        error:
          !!error && !!error.stack && mode === 'dev'
            ? error.stack.split('\n')
            : error,
      })
  })

  if (mode === 'dev') {
    server.get('/__figma/figma-url', async (_, reply) => {
      reply.send(join(dirs.pkgs.figma, 'bin', 'manifest.json'))
    })
    server.get('/__figma/figma.zip', async (_, reply) => {
      reply.send(
        zipFolder(join(dirs.pkgs.figma, 'bin')).generateNodeStream({
          type: 'nodebuffer',
          streamFiles: true,
        })
      )
    })
    server.get('/__figma', { websocket: true }, figmaRoute)
    server.get('/__hmr', { websocket: true }, hmrRoute)
    server.get('/chunks/__hmr', (req, reply) => {
      const data = req.query as any
      sendDevFile(reply, join(dirs.root, data.q), {
        loadParentChunk: true,
        replaceFileStr: data.d,
      })
    })
  }

  server.all('*', allRoutes.bind({ parent }))

  const startServer = (port: number) => {
    return new Promise((resolve: any) => {
      global.host = 'localhost'
      global.port = port
      global.scheme = 'http'
      server.listen(port, '0.0.0.0', async (err) => {
        if (err) {
          console.error(err)
          process.exit(0)
        }

        if (global.mode === 'prod') {
          log('platform', `Ready: http://localhost:${port}`)
        }
        resolve()
      })
    })
  }

  main.onMessage = async (msg: any) => {
    switch (msg.action) {
      case 'session-get':
        global.sessionGet[msg.sid] = msg.data
        break
      case 'start':
        await startServer(msg.port)
        if (msg.metafile) {
          global.metafile = msg.metafile
        }
        break
      // case 'hmr':
      //   if (msg.metafile) {
      //     if (!global.oldMetafile) {
      //       global.oldMetafile = global.metafile
      //     }
      //     global.metafile = msg.metafile
      //   }
      //   if (msg.type === 'change') {
      //     if (
      //       global.componentRefresh &&
      //       global.componentRefresh[join(dirs.root, msg.path)]
      //     ) {
      //       delete global.componentRefresh[join(dirs.root, msg.path)]
      //     } else {
      //       const replace: Record<
      //         string,
      //         {
      //           name: string
      //           deps: string[]
      //         }
      //       > = {}
      //       broadcastHMR({
      //         type: msg.type,
      //         file: msg.path,
      //         replace,
      //       })
      //     }
      //   } else {
      //     broadcastHMR({
      //       type: msg.type,
      //       file: msg.path,
      //     })
      //   }
      //   break
    }
  }
  main.signal('platform', 'server-ready')
}
