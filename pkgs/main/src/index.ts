import { expose } from 'builder'
import { CustomGlobal, start } from './start'

declare const global: CustomGlobal
expose({
  start: async (parent, args) => {
    global.mode = args.mode
    start(args.port, args.mode, parent)
  },
  onMessage: async (msg) => {},
})
