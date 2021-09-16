/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Checkbox, Label, PrimaryButton } from '@fluentui/react'
import find from 'lodash.find'
import get from 'lodash.get'
import set from 'lodash.set'
import { useCallback, useEffect, useRef } from 'react'
import { api } from 'web.utils/src/api'
import { connectFigma, WSFigmaClient } from 'web.utils/src/figmaClient'
import { useRender } from 'web.utils/src/useRender'

export interface IFigmaItem {
  docId: string
  page: string
  frame: string
}

export const TemplateCodeFigma = ({
  onChange,
  figma,
  updateHtml,
  name,
  filePath,
  value,
}) => {
  const render = useRender()
  const wsEvents = useRef({
    'figma-disconnect': () => {
      ws.current.meta.docId = ''
      render()
    },
    'figma-connect': () => {
      send('get-meta')
    },
    'get-meta': (e: any) => {
      ws.current.meta = {
        ...ws.current.meta,
        ...e,
        updates: {
          ...e.updates,
          ...ws.current.meta.updates,
        },
      }
      render()
    },
    'get-pages': (e) => {
      ws.current.meta.pages = e
      render()
    },
    'req-html': (e) => {
      if (e.page === figma.page && e.frame === figma.frame) {
        updateHtml(e.html, false)
      }
    },
    'upd-frame': (e) => {
      console.log(e)
      if (e.page === figma.page && e.frame === figma.frame) {
        updateHtml(e.html, true)
      }
    },
    'get-live': (e) => {
      ws.current.meta.updates = e
      render()
    },
  })
  const ws = useRef(null as WSFigmaClient)
  const mounted = useRef(true)
  const send = useCallback(
    async (type: string, data?: Record<string, any>) => {
      if (ws.current) {
        return await ws.current.call(type, data)
      }
    },
    [ws.current]
  )

  const connect = () => {
    ws.current = connectFigma({
      client: 'dev',
      onOpen: (wsnew) => {
        ws.current = wsnew
        for (let [type, cb] of Object.entries(wsEvents.current)) {
          ws.current.on(type, cb)
        }
        const updates = get(
          ws.current.meta.updates,
          `${figma.page}.${figma.frame}`,
          []
        ) as any
        let found = false
        for (let i of updates) {
          if (i.path === filePath) {
            found = true
            break
          }
        }

        if (!found) {
          ensurePageFrame({
            send,
            ws,
            figma,
            name,
            filePath,
            page: figma.page,
            frame: figma.frame,
          })
        }
        render()
        setTimeout(() => {
          if (!!ws.current && !ws.current.meta.docId) {
            send('get-meta')
          }
        }, 500)
      },
      onClose: () => {
        ws.current.meta.docId = ''
        render()
      },
    })
  }

  useEffect(() => {
    connect()
    setTimeout(() => {
      if (mounted.current) {
        render()
      }
    }, 500)
    return () => {
      mounted.current = false
      for (let [type, cb] of Object.entries(wsEvents.current)) {
        ws.current.off(type, cb)
      }
    }
  }, [])

  const connectingUI = (
    <div
      className="flex border-b  items-center border-gray-300 p-1 justify-between"
      css={css`
        height: 40px;
      `}
    >
      <div
        css={css`
          width: 18px;
          height: 18px;
          margin-right: 5px;
          opacity: 0.5;
        `}
      >
        <IconFigma />
      </div>
      <Label className="text-xs text-gray-500 flex flex-1 justify-between items-center p-0 pr-2">
        <Label className="text-xs text-gray-500">Connecting...</Label>
        <div
          onClick={async () => {
            const res = await api('/__figma/figma-url', false, { raw: true })
            alert(`Figma Manifest Path:\n` + res)
          }}
          className="hover:underline text-blue-400 cursor-pointer"
        >
          Figma Base Plugin
        </div>
      </Label>
    </div>
  )

  if (!ws.current) {
    return connectingUI
  }

  const figmaMeta = ws.current.meta
  const pages = figmaMeta.pages
  if (!figmaMeta.docId) {
    return connectingUI
  }

  if (figma && figma.docId && figma.docId !== figmaMeta.docId) {
    return (
      <div
        className="flex font-medium border-b border-gray-300 p-1  items-center"
        css={css`
          height: 40px;
          font-size: 13px;
          color: red;
        `}
      >
        <div
          css={css`
            width: 18px;
            height: 18px;
            margin-right: 5px;
            opacity: 0.5;
          `}
        >
          <IconFigma />
        </div>
        Figma Mismatch. Please load correct Figma document.
        <PrimaryButton
          css={css`
            height: 24px;
            margin-left: 5px;
            padding: 0px 5px;
            min-width: fit-content;
            font-size: 12px;
          `}
          onClick={() => {
            if (confirm('Are you sure ?')) {
              onChange({
                docId: figmaMeta.docId,
                page: undefined,
                frame: undefined,
              })
              render()
            }
          }}
        >
          Override
        </PrimaryButton>
      </div>
    )
  }

  const pageFrame = figma ? `${figma.page}||||${figma.frame}` : ''

  let checked = false
  const arr = get(ws.current.meta.updates, `${figma.page}.${figma.frame}`, [])
  const current: any = find(arr, { path: filePath })
  if (current) {
    checked = current.live
  }

  return (
    <div
      className="flex border-b border-gray-300 p-1 justify-between"
      css={css`
        height: 40px;
      `}
    >
      <div className="flex flex-1 items-center">
        <div
          css={css`
            width: 18px;
            height: 18px;
            margin-right: 5px;
            opacity: 0.5;
          `}
        >
          <IconFigma />
        </div>
        <select
          className="text-sm border border-gray-300 rounded-sm"
          css={css`
            height: 24px;
          `}
          onChange={(e) => {
            const val = e.target.value.split('||||')
            if (val.length === 2) {
              ensurePageFrame({
                send,
                ws,
                figma,
                name,
                filePath,
                page: val[0],
                frame: val[1],
              })
              onChange({
                docId: figmaMeta.docId,
                page: val[0],
                frame: val[1],
              })
            }
          }}
          value={pageFrame}
        >
          <option value={''}>-</option>
          {Object.keys(pages).map((e, idx) => {
            return (
              <optgroup key={idx} label={e}>
                {pages[e].map((o, odx) => {
                  return (
                    <option key={odx} value={`${e}||||${o}`}>
                      {o}
                    </option>
                  )
                })}
              </optgroup>
            )
          })}
        </select>
        <PrimaryButton
          css={css`
            height: 24px;
            margin-left: 5px;
            padding: 0px 5px;
            min-width: fit-content;
            font-size: 12px;
          `}
          onClick={async () => {
            const res = await send('req-html', figma)
            updateHtml(res.html, false)
          }}
        >
          Update
        </PrimaryButton>
        <Checkbox
          label={'Auto Update'}
          checked={checked}
          onChange={async (e, checked) => {
            ensureLiveUpdate({ send, ws, figma, name, filePath, checked })
            render()
          }}
          className="flex items-center border border-white rounded-sm pr-1"
          css={css`
            margin-left: 5px;
            height: 24px;
            .ms-Checkbox-text {
              font-size: 12px;
              margin-left: 0px;
            }
          `}
        />
      </div>
    </div>
  )
}

const IconFigma = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" {...props}>
      <path
        d="M12.5 1A5.506 5.506 0 007 6.5c0 1.658.74 3.143 1.904 4.152A5.505 5.505 0 006 15.5c0 1.86.932 3.504 2.35 4.5A5.493 5.493 0 006 24.5c0 3.033 2.467 5.5 5.5 5.5s5.5-2.467 5.5-5.5V12h3.5c3.033 0 5.5-2.467 5.5-5.5S23.533 1 20.5 1h-8zm0 2h8C22.43 3 24 4.57 24 6.5S22.43 10 20.5 10h-8C10.57 10 9 8.43 9 6.5S10.57 3 12.5 3zm-1 9H15v7h-3.5C9.57 19 8 17.43 8 15.5S9.57 12 11.5 12zm9.5 0a4 4 0 000 8 4 4 0 000-8zm-9.5 9H15v3.5c0 1.93-1.57 3.5-3.5 3.5S8 26.43 8 24.5 9.57 21 11.5 21z"
        fill="#5B5B5B"
      />
    </svg>
  )
}

const ensurePageFrame = ({ send, ws, figma, name, filePath, page, frame }) => {
  let oldUpdates = get(
    ws.current.meta.updates as any,
    `${figma.page}.${figma.frame}`,
    []
  )

  if (oldUpdates) {
    for (let i in oldUpdates) {
      if (oldUpdates[i].path === filePath) {
        oldUpdates.splice(i as any, 1)
        break
      }
    }
  }
  send('unset-frame', { path: filePath })
  const newUpdates: any = get(ws.current.meta.updates, `${page}.${frame}`, [])

  if (!find(newUpdates || [], { name, path: filePath })) {
    newUpdates.push({ name, path: filePath, live: false })
  }
  set(ws.current.meta.updates, `${page}.${frame}`, newUpdates)
  send('set-frame', { page, frame, name, path: filePath, live: false })
}

const ensureLiveUpdate = ({ send, ws, figma, name, filePath, checked }) => {
  let updates = get(
    ws.current.meta.updates as any,
    `${figma.page}.${figma.frame}`,
    []
  ).filter((e) => {
    if (e.path === filePath) return false
    return true
  })

  if (checked) {
    updates.push({
      name,
      path: filePath,
      live: true,
    })
  }

  set(ws.current.meta.updates, `${figma.page}.${figma.frame}`, updates)
  send('set-frame', {
    page: figma.page,
    frame: figma.frame,
    name,
    path: filePath,
    live: checked,
  })
}
