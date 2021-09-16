import { expose } from 'builder'
import { CustomGlobal, MainControl, server } from './server'
import fetch from 'node-fetch'
declare const global: CustomGlobal

global.fetch = fetch

let main: MainControl = {
  signal: async () => {},
  onMessage: async () => {},
}
export const start = (port: number) => {
  main.signal = async (module, data) => {
    if (data === 'server-ready') {
      main.onMessage({
        action: 'start',
        port,
      })
    } 
  }
  server(main, 'prod')
}

expose({
  start: async (parent, mode) => {
    main.signal = async (module, data) => {
      parent.sendTo('main', {
        type: 'platform-signal',
        module,
        data,
      })
    }

    await server(main, mode, parent)
  },
  onMessage: async (msg: any) => {
    await main.onMessage(msg)
  },
})
