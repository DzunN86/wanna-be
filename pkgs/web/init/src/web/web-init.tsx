import React, { lazy, Suspense } from 'react'
import { render } from 'react-dom'
import { injectCSS } from '../../../utils/src/inject'
import type { BaseWindow } from '../window'
import { WebMain } from './web-main'

declare const window: BaseWindow
export const webInit = async () => {
  await injectCSS(window.is_dev ? '/index.css' : '/main.css')

  switch (true) {
    case location.pathname.indexOf('/dev') === 0:
      {
        const Dev = lazy(() => import('web.dev/src/Dev'))
        render(
          <Suspense fallback={null}>
            <Dev />
          </Suspense>,
          document.getElementById('root')
        )
      }
      break
    case location.pathname.indexOf('/figma') === 0:
      {
        const Figma = lazy(() => import('web.dev/src/figma/Figma'))
        render(
          <Suspense fallback={null}>
            <Figma />
          </Suspense>,
          document.getElementById('root')
        )
      }
      break
    default:
      render(<WebMain />, document.getElementById('root'))
  }
}
