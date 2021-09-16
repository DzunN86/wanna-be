import { BuilderPool } from './builderpool'
import { Thread } from './thread'

export class Runner {
  name: string
  path: string
  pool: BuilderPool
  thread?: Thread

  startArgs?: any

  events = {
    onStart: async (_: Runner) => {},
    onKill: async (_: Runner) => {},
    onMessage: async (_: any) => {},
  }

  async kill() {
    if (this.thread) {
      try {
        await this.thread.terminate()
      } catch (e) {
        console.log(e)
      }
      this.events.onKill(this)
    }
  }
  async restart() {
    await this.kill()
    await this.start()
  }

  async start() {
    this.thread = new Thread(this, this.startArgs)
    this.events.onStart(this)
  }

  onStart(func: (runner: Runner) => Promise<void>): Runner {
    this.events.onStart = func
    return this
  }

  onKill(func: (runner: Runner) => Promise<void>): Runner {
    this.events.onKill = func
    return this
  }

  onMessage(func: (msg: any) => Promise<void>): Runner {
    this.events.onMessage = func
    return this
  }

  async send(msg: any) {
    if (this.thread) {
      return await this.thread.send(msg)
    }
  }

  constructor(name: string, path: string, pool: BuilderPool, args?: any) {
    this.name = name
    this.path = path
    this.pool = pool
    this.startArgs = args
    this.start()
  }
}
