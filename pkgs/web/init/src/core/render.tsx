/** @jsx jsx */
import F7Page from 'framework7-react/esm/components/page'
import React, { FC, Fragment, useCallback, useEffect, useRef } from 'react'
import { useRender } from 'web.utils/src/useRender'
import { matchRoute } from 'libs'
import type { BaseWindow } from '../window'
import { generatePage } from './gen-page'
import { findPage, loadPage } from './load-page'

declare const window: BaseWindow
export const renderCore = ({
  url,
  NotFound,
}: {
  url: string
  NotFound: FC
}) => {
  const _ = useRef({
    page: findPage(url) as ReturnType<typeof findPage>,
    pageCache: null as null | ReturnType<typeof generatePage>,
    params: getUrlParams(url),
  })
  const render = useRender()
  const meta = _.current

  let Layout: React.FC<any> = ({ children }: any) => {
    const Wrapper = window.platform === 'mobile' ? F7Page : Fragment
    return <Wrapper>{children}</Wrapper>
  }
  const layoutArgs = {}
  layoutArgs['params'] = meta.params

  if (typeof meta.page === 'object') {
    const layout = window.cms_layouts[meta.page.layout_id]
    if (layout) {
      Layout = layout.component // swap empty layout with correct layout
    }
    if (meta.page.source) {
      if (!meta.pageCache) {
        meta.pageCache = generatePage(meta.page.source, {
          params: { ...meta.params, url },
          updateParams: (newparams) => {
            meta.params = newparams
          },
        })
      }

      const Page = meta.pageCache

      return (
        <Layout {...layoutArgs}>
          <ErrorBoundary>
            <Page />
          </ErrorBoundary>
        </Layout>
      )
    }
  } else {
    return <NotFound />
  }

  loadPage(meta.page).then(() => {
    window.pageRendered = true
    render()
  })
  return <Layout {...layoutArgs} />
}

export const getUrlParams = (url: string) => {
  const route = Object.keys(window.cms_pages)
    .map((e) => ({ route: matchRoute(url, e) }))
    .filter((e) => e.route)

  if (route.length > 0) {
    return { ...route[0].route, url }
  }
  return {}
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  componentDidCatch(error, info) {
    this.setState({ hasError: true })
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}
