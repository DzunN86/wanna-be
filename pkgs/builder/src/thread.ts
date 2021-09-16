import { Worker, parentPort } from 'worker_threads'
import { Runner } from './runner'

import uniqid from 'uniqid'

export type ParentThread = {
  sendTo: (name: string, msg: any) => Promise<any>
}

export type WorkerThread = {
  start: (parent: ParentThread, args?: any) => Promise<void>
  onMessage: (msg: any) => Promise<any>
}

export const expose = (child: WorkerThread) => {
  if (parentPort) {
    parentPort.on('message', async (raw) => {
      const type = raw.substr(0, 5)
      const msg = raw.substr(5)
      switch (type) {
        case 'init!':
          child.start(
            {
              sendTo: async (name: string, msg: any) => {
                parentPort?.postMessage(`send!${JSON.stringify({ name, msg })}`)
              },
            },
            msg ? JSON.parse(msg) : undefined
          )

          break
        case 'send!':
          const json = JSON.parse(msg)
          await child.onMessage(json.data)
          parentPort?.postMessage(`recv!${json.id}`)
          break
      }
    })
  }
}

export class Thread extends Worker {
  msgPending: Record<string, (value: unknown) => void> = {}
  constructor(runner: Runner, args?: any) {
    super(runner.path)
    this.on('message', async (raw: string) => {
      const type = raw.substr(0, 5)
      const msg = raw.substr(5)
      switch (type) {
        case 'send!':
          const json: { name: string; msg: any } = JSON.parse(msg)
          await runner.pool?.send(json.name, json.msg)
          break
        case 'recv!':
          const msgid = msg
          if (this.msgPending[msgid]) {
            this.msgPending[msgid](true)
            delete this.msgPending[msgid]
          }
          break
      }
    })
    this.postMessage(`init!${args ? JSON.stringify(args) : ''}`)
  }
  send(msg: any) {
    return new Promise((resolve) => {
      const id = uniqid()
      this.msgPending[id] = resolve
      this.postMessage(`send!${JSON.stringify({ id, data: msg })}`)
    })
  }
}
