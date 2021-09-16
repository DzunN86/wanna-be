import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import React, { useEffect, useRef } from 'react'
import { render } from 'react-dom'
import 'twind/shim'

const App = observer(() => {
  const meta = useLocalObservable(() => ({
    init: false,
    src: '',
  }))
  const iframeRef = useRef(null as any)

  useEffect(() => {
    const sendParent = (data: any) => {
      parent.postMessage(
        {
          pluginMessage: data,
        },
        '*'
      )
    }

    window.addEventListener('message', async (msg) => {
      const data = JSON.parse(JSON.stringify(msg.data))

      if (data) {
        if (data.type === 'figma-ready') {
          runInAction(() => (meta.init = true))
        }
        if (
          data.pluginMessage &&
          data.pluginMessage.type === 'get-root-data' &&
          !meta.src
        ) {
          runInAction(
            () =>
              (meta.src = data.pluginMessage.data || 'http://localhost:3200')
          )
          return
        }
      }

      await waitUntil(() => meta.init && meta.src)

      if (data && data.pluginId) {
        await waitUntil(() => iframeRef.current)
        const iframe = iframeRef.current

        iframe.contentWindow.postMessage(data, '*')
      } else {
        sendParent(data)
      }
    })

    if (!meta.src) {
      sendParent({ type: 'get-root-data', data: { name: 'base-url' } })
    }
  }, [])

  return (
    <>
      {!meta.init && (
        <div id="loading" className="flex flex-col items-stretch">
          <div className="text-center">Initializing</div>
          <input
            value={meta.src}
            className="text-center"
            onChange={action((e) => {
              const text = e.currentTarget.value
              meta.src = text
            })}
          />
        </div>
      )}
      {meta.src && (
        <iframe
          id="iframe"
          src={`${meta.src}/figma`}
          ref={iframeRef}
          className={`${!meta.init ? 'hidden' : ''}`}
        />
      )}
    </>
  )
})

render(<App />, document.getElementById('root'))

const waitUntil = (condition: number | (() => any)) => {
  return new Promise<void>(async (resolve) => {
    if (typeof condition === 'function') {
      if (await condition()) {
        resolve()
        return
      }
      const c = setInterval(async () => {
        if (await condition()) {
          clearInterval(c)
          resolve()
        }
      }, 100)
    } else if (typeof condition === 'number') {
      setTimeout(() => {
        resolve()
      }, condition)
    }
  })
}
