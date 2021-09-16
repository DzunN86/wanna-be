/** @jsx jsx */
import { jsx } from '@emotion/react'
import { App, View } from 'framework7-react'
import { useRef } from 'react'
import { renderCore } from '../core/render'
import type { BaseWindow } from '../window'
import { MobileWrapper } from './mobile-wrapper'

declare const window: BaseWindow

export const MobileMain = () => {
  const _ = useRef({
    ready: false,
    f7params: {
      theme: 'ios',
      routes: generateRoute(),
    },
  })
  return (
    <MobileWrapper>
      <App {..._.current.f7params}>
        <View
          main
          onViewInit={(e) => {
            if (e) window.mobileApp = e
          }}
        />
      </App>
    </MobileWrapper>
  )
}

const generateRoute = () => {
  if (!window.cms_pages) {
    window.cms_pages = {}
  }

  let result: any[] = []
  result = (Object.entries(window.cms_pages || {}) || []).map(([url, e]) => {
    const path = url.replace(/\[([^\]]+)\]/g, ':$1')
    window.cms_pages[url].mobilePath = path
    return {
      id: e.id,
      path,
      component: ({ f7route, f7router }) => {
        const Page = renderCore
        const url = f7route.url
        return <Page url={url} />
      },
    }
  })

  return result
}
