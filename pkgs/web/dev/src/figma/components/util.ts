import { action, toJS } from 'mobx'
import { sendParent } from '../ws'

export const getNodeData = (
  meta: any,
  name: string,
  defaultValue?: any,
  opt?: { parse?: boolean }
) => {
  sendParent('get-node-data', { name }).then(
    action((e: any) => {
      if (!e) {
        meta[name] = defaultValue
      } else {
        meta[name] = opt && opt.parse ? JSON.parse(e) : e
      }
    })
  )
}
export const getRootData = (
  meta: any,
  name: string,
  defaultValue?: any,
  opt?: { parse?: boolean }
) => {
  return new Promise((resolve) => {
    sendParent('get-root-data', { name }).then(
      action((e: any) => {
        if (!e) {
          meta[name] = defaultValue
        } else {
          meta[name] = opt && opt.parse ? JSON.parse(e) : e
        }
        resolve(meta[name])
      })
    )
  })
}

export const getFrameData = (
  meta: any,
  name: string,
  defaultValue?: any,
  opt?: { parse?: boolean }
) => {
  return new Promise((resolve) => {
    sendParent('get-frame-data', { name }).then(
      action((e: any) => {
        if (name === e.name) {
          try {
            if (e && !e.value) {
              meta[name] = defaultValue
            } else {
              meta[name] = opt && opt.parse ? JSON.parse(e.value) : e.value
            }
            resolve(meta[name])
          } catch (x) {
            console.log(x, name, e)
          }
        }
      })
    )
  })
}
