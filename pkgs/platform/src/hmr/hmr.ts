import { dirs } from 'boot'
import { FastifyRequest, FastifyReply } from 'fastify'
import { SocketStream } from 'fastify-websocket'
import { readFile } from 'fs-extra'
import { CustomGlobal } from '../server'
import * as babel from '@babel/core'

declare const global: CustomGlobal
const connectedClients: SocketStream[] = []

export const hmrRoute = (connection: SocketStream, req: FastifyRequest) => {
  connection.socket.on('message', (message) => {})

  connection.socket.on('close', () => {
    const idx = connectedClients.indexOf(connection)
    if (idx >= 0) {
      connectedClients.splice(idx)
    }
  })

  connection.socket.on('error', () => {
    const idx = connectedClients.indexOf(connection)
    if (idx >= 0) {
      connectedClients.splice(idx)
    }
  })

  connectedClients.push(connection)
}

export const broadcastHMR = (msg: any) => {
  if (global.fallbackSaving) return;
  for (let c of connectedClients) {
    if (c && c.socket && c.socket.readyState === WebSocket.OPEN) {
      c.socket.send(JSON.stringify(msg))
    }
  }
}

const transformOptions: babel.TransformOptions = {
  ast: false,
  configFile: false,
  babelrc: false,
  envName: 'development',
  comments: false,
  compact: false,
  plugins: [require.resolve('react-refresh/babel')],
  sourceMaps: false,
}
export const devFileCaches = {}

type IHMRWrapOption = {
  loadParentChunk?: boolean
  replaceFileStr?: string
}

export const sendDevFile = async (
  reply: FastifyReply,
  filename: string,
  options?: IHMRWrapOption
) => {
  reply.type('text/javascript')

  if (options) {
    let newname = filename
    let replaceFileStr = options.replaceFileStr || undefined
    if (options.loadParentChunk) {
      const inputName = newname
        .substr(dirs.root.length + 1)
        .replace(/\\/gi, '/')

      for (let [k, o] of Object.entries(global.metafile.outputs)) {
        for (let f of Object.keys(o.inputs)) {
          if (f === inputName) {
            newname = k
            break
          }
        }
      }

      if (!replaceFileStr) {
        for (let [k, o] of Object.entries(global.oldMetafile.outputs)) {
          for (let f of Object.keys(o.inputs)) {
            if (f === inputName) {
              replaceFileStr = k
              break
            }
          }
        }
      }
    }

    return reply.send(
      await wrapInHMR(newname, await readFile(newname, 'utf-8'), {
        ...options,
        replaceFileStr,
      })
    )
  }

  if (!devFileCaches[filename]) {
    devFileCaches[filename] = await wrapInHMR(
      filename,
      await readFile(filename, 'utf-8')
    )
  }
  return reply.send(devFileCaches[filename])
}

export const wrapInHMR = async (
  filepath: string,
  content: string,
  options?: IHMRWrapOption & { replaceFileStr?: string }
) => {
  const Runtime = '__React_Refresh_Runtime__'
  let file = filepath.substr(dirs.root.length).replace(/\\/gi, '/')

  if (file[0] === '/') {
    file = file.substr(1)
  }

  const filestr = JSON.stringify(
    options && options.replaceFileStr ? options.replaceFileStr : file
  )

  const deps = JSON.stringify(
    global.metafile.outputs[file]
      ? Object.keys(global.metafile.outputs[file].inputs).filter((e) => {
          return e.indexOf('node_modules') !== 0
        })
      : []
  )

  const babelResult = await babel.transformAsync(content, transformOptions)

  let final = `\
import { Hot } from '/hmr/dev-runtime.js';
import.meta.reboost = true;
import.meta.absoluteUrl=import.meta.url;
import.meta.url=${filestr};
import.meta.hot=new Hot(${filestr});
import * as ${Runtime} from '/hmr/hmr-runtime.js';
const __prevRefreshReg = self.$RefreshReg$;
const __prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id) => {
  const fullId = import.meta.hot.id + ' ' + id;
  ${Runtime}.register(type, fullId);
}
self.$RefreshSig$ = ${Runtime}.createSignatureFunction;

${babelResult.code}

self.$RefreshReg$ = __prevRefreshReg;
self.$RefreshSig$ = __prevRefreshSig;
import.meta.hot.accept((updatedModule) => {
  // Check if all exports are React components
  if (${Runtime}.isReactRefreshBoundary(updatedModule)) {
    ${Runtime}.performReactRefresh();
  } else {
    import.meta.hot.invalidate();
  }
});

Reboost["[[Private]]"]
.setDependencies(${filestr}, ${deps});

`
  return final
}
