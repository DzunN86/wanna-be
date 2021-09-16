/** @jsx jsx */
import { waitUntil } from 'web.utils/src/waitUntil'
import { connectFigma } from 'web.utils/src/figmaClient'

export const wsUI = ({ ws, isConnected, pluginEvents, wsEvents, render }) => {
  addEventListener('message', async (raw: { data: { pluginMessage: any } }) => {
    const msg = raw.data.pluginMessage

    if (msg) {
      if (msg.type === 'init') {
        if (ws.current) {
          await waitUntil(isConnected)
          for (let i in msg.data) {
            ws.current.meta[i] = msg.data[i]
          }
          ws.current.call('set-meta', msg.data)
        } else {
          ws.current = connectFigma(
            {
              client: 'figma',
              host: (window as any).devHost,
              onOpen: async (wsnew) => {
                ws.current = wsnew
                for (let [type, cb] of Object.entries(wsEvents.current)) {
                  ws.current.on(type, cb)
                }
                const res = await ws.current.call('get-updates')
                render()
              },
              onClose: () => {
                ws.current = null
                render()
              },
            },
            msg.data
          )
        }
        render()
      } else {
        // console.log(msg.type)
        if (parentCallbacks[msg.type]) {
          const cb = parentCallbacks[msg.type].shift()
          if (cb) {
            cb.callback(msg.data)
          }
        }
        if (pluginEvents.current[msg.type]) {
          pluginEvents.current[msg.type](msg.data)
          return
        }
      }

      if (msg.ws) {
        await waitUntil(isConnected)
        ws.current.call(msg.type, msg.data).then((response) => {
          sendParent(msg.type, response)
        })
      }
    }
  })
  sendParent('figma-ready')
}

const parentCallbacks: Record<
  string,
  Array<{ input: any; callback: (data: Record<string, any>) => void }>
> = {}
export const sendParent = (type: string, data?: Record<string, any>) => {
  return new Promise(async (resolve) => {
    if (!parentCallbacks[type]) {
      parentCallbacks[type] = []
    }
    const ndata =
      typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : data

    parentCallbacks[type].push({ input: ndata, callback: resolve })

    try {
      parent.postMessage(
        {
          type,
          data: ndata,
        },
        '*'
      )
    } catch (e) {
      console.log(e, ndata)
    }
  })
}
