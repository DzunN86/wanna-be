interface IFigmaMeta {
  docId: string
  docName: string
  pages: Record<string, string[]>
  updates: Record<
    string,
    Record<string, Array<{ name: string; path: string; live: boolean }>>
  >
}
export interface WSFigmaClient extends WebSocket {
  clientId: number
  callbackStacks: Record<string, Array<(response: any) => void>>
  meta: IFigmaMeta
  on: (type: string, callback: (data: any) => void) => void
  off: (type: string, callback: (data: any) => void) => void
  callSync: (
    type: string,
    data?: Record<string, any>,
    callback?: (response: Record<string, any>) => void
  ) => void
  call: (
    type: string,
    data?: Record<string, any>
  ) => Promise<Record<string, any>>
}
export const connectFigma = (
  args: {
    client: 'figma' | 'dev'
    onOpen?: (ws: WSFigmaClient) => void
    onClose?: () => void
    host?: any
  },
  oldMeta?: IFigmaMeta
) => {
  const schema = window.location.protocol;
  let ws: WSFigmaClient = (window as any).figmaWS

  if (
    !ws ||
    (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)
  ) {
    ;(window as any).figmaWS = new WebSocket(
      `${schema === "http:" ? "ws" : "wss"}://${args.host || location.host.replace(/^https?:\/\//, '')}/__figma`
    )
    ws = (window as any).figmaWS

    ws.meta = oldMeta || {
      docId: '',
      docName: '',
      pages: {},
      updates: {},
    }
    const on: Record<string, Array<(data: any) => void>> = {}
    ws.on = (type, callback) => {
      if (!on[type]) {
        on[type] = []
      }
      on[type].push(callback)
    }
    ws.off = (type, callback) => {
      if (on[type]) {
        if (on[type].indexOf(callback)) {
          on[type].splice(on[type].indexOf(callback), 1)
        }
      }
    }
    ws.callbackStacks = {}
    ws.call = (type: string, data?: Record<string, any>) => {
      return new Promise((resolve) => {
        ws.callSync(type, data, resolve)
      })
    }
    ws.callSync = (
      type: string,
      data?: Record<string, any>,
      callback?: (response: any) => void
    ) => {
      if (!ws.callbackStacks[type]) {
        ws.callbackStacks[type] = []
      }
      ws.callbackStacks[type].push(callback || (() => {}))
      ws.send(JSON.stringify({ type, data }))
    }

    ws.onopen = async () => {
      const res = await ws.call('identify', {
        type: args.client,
        meta: oldMeta,
      })
      ws.clientId = res.id
      if (res.meta) {
        for (let i in res.meta) {
          ws.meta[i] = res.meta[i]
        }
      }
      console.log(`[FIG] Connected (figma-client-id: ${res.id})`)

      if (typeof args.onOpen === 'function') {
        args.onOpen(ws)
      }
    }
    ws.onmessage = (raw) => {
      const msg: { type: string; data: Record<string, any> } = JSON.parse(
        raw.data
      )

      if (on[msg.type]) {
        for (let cb of on[msg.type]) {
          cb(msg.data)
        }
      }

      const cbstack = ws.callbackStacks[msg.type]
      if (cbstack && cbstack.length > 0) {
        const cb = cbstack.shift()
        if (typeof cb === 'function') {
          cb(msg.data)
        }
      }
    }

    ws.onclose = () => {
      if (args.onClose) {
        args.onClose()
      }
      setTimeout(() => connectFigma(args, ws.meta), 5000)
    }
  }
  return ws
}
