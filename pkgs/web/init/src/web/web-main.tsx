/** @jsx jsx */
import { jsx, css } from '@emotion/react'
import { waitUntil } from 'libs'
import React, { useEffect, useRef, useState } from 'react'
import { useRender } from 'web.utils/src/useRender'
import { renderCore } from '../core/render'
import type { BaseWindow } from '../window'
declare const window: BaseWindow

export const WebMain = () => {
  const _ = useRef({
    url: location.pathname,
    current: 'page' as 'page' | 'next',
    page: {
      ref: null,
      comp: null,
    },
    next: { ref: null, comp: null },
  })
  const meta = _.current
  const [renderState, setRender] = useState(0)
  const render = () => {
    setRender(new Date().getTime())
  }

  useEffect(() => {
    window.webApp = {
      render: (url: string) => {
        meta.url = url
        if (meta.current === 'page') {
          meta.next.comp = () => renderCore({ url })
          render()
          waitUntil(() => !!meta.next.ref).then(() => {
            meta.page.ref.style.display = 'none'
            meta.next.ref.style.display = 'flex'
            meta.current = 'next'
            meta.page.comp = null
          })
        } else {
          meta.page.comp = () => renderCore({ url })
          render()

          waitUntil(() => !!meta.page.ref).then(() => {
            meta.next.ref.style.display = 'none'
            meta.page.ref.style.display = 'flex'
            meta.current = 'page'
            meta.next.comp = null
          })
        }
      },
    }
  }, [renderState])

  if (!meta.page.comp && !meta.next.comp) {
    meta.page.comp = () => renderCore({ url: meta.url })
  }
  const Page = meta.page.comp
  const Next = meta.next.comp

  const rootCSS = css`
    > div {
      flex: 1;
    }
  `


  return (
    <>
      {Page && (
        <div
          ref={(e) => (meta.page.ref = e)}
          className={`web ${
            meta.current === 'page' ? 'flex' : 'hidden'
          } flex-1 items-stretch`}
          css={rootCSS}
        >
          <Page />
        </div>
      )}
      {Next && (
        <div
          ref={(e) => (meta.next.ref = e)}
          className={`web ${
            meta.current === 'next' ? 'flex' : 'hidden'
          } flex-1 items-stretch`}
          css={rootCSS}
        >
          <Next />
        </div>
      )}
    </>
  )
}
