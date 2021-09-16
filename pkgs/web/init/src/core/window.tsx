/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { db, dbAll, waitUntil } from 'libs'
import { loadExt } from 'web.utils/src/loadExt'

import get from 'lodash.get'
import set from 'lodash.set'
import { action, observable, runInAction, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import React, { Fragment, useEffect, useRef, useState } from 'react'
import * as global from 'web-app/src/global'
import { api } from 'web.utils/src/api'
import type { BaseWindow } from '../window'

declare const window: BaseWindow

export const defineWindow = async () => {}

for (let [k, v] of Object.entries(global)) {
  window[k] = v
}

window.user = observable(window.user)
window.set = set
window.get = get
window.toJS = toJS
window.useEffect = useEffect
window.useRef = useRef
window.api = api
window.db = db as any
window.dbAll = dbAll
window.waitUntil = waitUntil
window.loadExt = loadExt
window.sql = (texts: string[], ...args: any[]) => {
  let final: any = []
  for (let i of texts) {
    final.push(i)
    const arg = args.shift()
    if (typeof arg !== 'undefined') {
      final.push(arg)
    }
  }

  return final.join('')
}

window.React = React
window.jsx = jsx
window.css = css

window.useState = useState
window.runInAction = runInAction
window.action = action
window.css = css
window.fragment = Fragment
window.observer = observer
window.useLocalObservable = useLocalObservable
window.babel = {}

window.addEventListener('popstate', (e) => {
  if (window.platform === 'mobile') {
    const router = window.mobileApp.router
    router.back()
  } else {
    window.webApp.render(location.pathname)
  }
})
window.back = async (href) => {
  history.back()
}
window.navigate = async (href, opt) => {
  if (window.platform === 'mobile') {
    history.pushState({}, '', href)
    window.mobileApp.router.navigate(href, opt)
  } else {
    history.pushState({}, '', href)
    window.webApp.render(href)
  }
}

// capacitor arguments callback function
// di index disini, dipanggil ketika capacitor manggil.
const capacitorACB = {
  index: new WeakMap(),
  map: new Map(),
}

export const sendCapacitor = (type: 'ready' | 'exec' | 'exit', data?: any) => {
  if (data && data.args) {
    for (let [k, arg] of Object.entries(data.args)) {
      if (typeof arg === 'function') {
        if (!capacitorACB.index.has(arg)) {
          const id = '__f:' + Math.floor(Math.random() * 1000000)
          capacitorACB.index.set(arg, {
            id,
          })
          capacitorACB.map.set(id, arg)
        }
        const id = capacitorACB.index.get(arg).id
        data.args[k] = id
      }
    }
  }

  window.parent.postMessage(JSON.stringify({ type, data }), '*')
}

const capacitorResult: Record<
  string,
  { args: any; resolve: (result: any) => void }[]
> = {}

window.capacitor = {}
window.addEventListener('message', (e) => {
  let msg = { type: '', data: {} as any }
  try {
    msg = JSON.parse(e.data)
  } catch (e) {}

  const { data } = msg

  switch (msg.type) {
    case 'init-capacitor':
      sendCapacitor('ready')
      break
    case 'go-back':
      if (typeof window.onback === 'function') {
        window.onback();
        break;
      }
      window.back()
      break
    case 'call-args':
      if (capacitorACB.map.has(data.id)) {
        const func = capacitorACB.map.get(data.id)
        const params = JSON.parse(data.params)

        const final: any = []
        for (let i = 0; i < Object.keys(params).length; i++) {
          final.push(params[i])
        }
        func(...final)
      }
      break
    case 'exec-result':
      if (data && data.func) {
        const results = [...capacitorResult[data.func]].reverse()
        for (let i in results) {
          const r = results[i]
          if (JSON.stringify(r.args) === JSON.stringify(data.args)) {
            capacitorResult[data.func].slice(results.length - parseInt(i), 1)
            r.resolve(data.result)
            break
          }
        }
      }
      break
    case 'init-plugins':
      if (data.plugins) {
        const capacitor = {}
        for (let i of data.plugins) {
          const props = {}
          for (let p of i.props) {
            if (p.type === 'function') {
              props[p.name] = function (...args: any[]) {
                const func = `${i.name}.${p.name}`
                if (!capacitorResult[func]) {
                  capacitorResult[func] = []
                }
                return new Promise((resolve) => {
                  capacitorResult[func].push({ args, resolve })
                  sendCapacitor('exec', {
                    func,
                    args,
                  })
                })
              }
            } else {
              Object.defineProperty(props, p.name, {
                get: function () {
                  return p.type
                },
              })
            }
          }

          capacitor[i.name] = props
        }
        window.capacitor = capacitor
      }
      break
  }
})
