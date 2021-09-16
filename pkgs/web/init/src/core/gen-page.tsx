/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import Page from 'framework7-react/esm/components/page'
import { db, dbAll, waitUntil } from 'libs'
import { observer, useLocalObservable } from 'mobx-react-lite'
import React, { Fragment, lazy, Suspense, useEffect, useRef } from 'react'
import { api } from 'web.utils/src/api'
import { useRender } from 'web.utils/src/useRender'
import { Link } from 'web.view/src/Link'
import mLink from '../../../mobile/src/m-link'
import type { BaseWindow } from '../window'
import { formatJsxChildren } from './utils'

declare const window: BaseWindow

export const generatePage = (
  source: string,
  opt: { params: any; updateParams: (newdata: any) => void }
) => {
  let cms_page: any
  // updateParams will be executed on ssr in eval below
  let { params, updateParams } = opt
  try {
  eval(source)
  } catch(e) {
    console.error(`
Error while generating page: ${e}

${source}`)
  }

  if (cms_page) {
    return () => {
      const _ = useRef({
        component: null as React.FC | null,
        meta: cms_page.child_meta,
        cms: null as ReturnType<typeof renderCMS> | null,
        render: () => {},
        renderCount: 0,
      })
      const internal = _.current
      internal.render = useRender()
      internal.cms = renderCMS(cms_page, internal.meta, {
        defer: true,
        type: 'page',
        params,
        render: () => {},
      })

      const refreshPage = () => {
        internal.component = observer(() => {
          const meta = useLocalObservable(() => internal.meta)
          const render = useRender()
          const result = renderCMS(cms_page, meta, {
            defer: false,
            type: 'page',
            params,
            render,
          })
          result.effects.forEach((e) => {
            useEffect(() => {
              if (!result.loading) {
                try {
                  return e.run({
                    dev: false,
                    db: db,
                    dbAll: dbAll,
                    api: api,
                  })
                } catch (e) {
                  console.error(e)
                }
              }
            }, e.deps || [])
          })

          if (result.loading) {
            result.loading().then(render)
          }

          return result.page
        })
        internal.render()
        internal.renderCount++
      }

      // execute initial page render loading
      if (internal.renderCount === 0 && internal.cms.loading) {
        internal.cms.loading().then(refreshPage)
      }

      const Page = internal.component
      if (Page) return <Page />
      refreshPage()
      return internal.cms.page
    }
  }

  return () => <></>
}

export const renderCMS = (
  cmsPage: (
    db: any,
    api: any,
    action: any,
    runAction: any,
    h: (tag: any, props: any, ...children: any) => any,
    fragment: any,
    row: any,
    layout: any,
    user: any,
    params: any,
    css: any,
    meta: any
  ) => any,
  meta: any,
  opt: {
    type: 'component' | 'layout' | 'page'
    defer: boolean
    params: any
    render: () => void
  }
): {
  page: React.ReactElement
  loadingCount: number
  loading?: () => Promise<true>
  effects: Set<{ meta?: any; deps: any[]; run: (props: any) => void }>
} => {
  const loading: Record<string, Promise<any>> = {}
  const effects = new Set<{ deps: any[]; run: (props: any) => void }>()
  const h = (tag: string, props: any, ...children: any[]) => {
    let finalProps: any = undefined

    if (tag === 'img' && props.src.indexOf('/fimgs/') === 0) {
      if (!window.figmaImageCaches) {
        window.figmaImageCaches = {}
      }
      if (!window.figmaImageCaches[props.src]) {
        window.figmaImageCaches[props.src] = new Image()
        window.figmaImageCaches[props.src].src = props.src
      }
    }
    let component: undefined | React.FC<any> = undefined
    let def = window.cms_components[tag]
    if (def) {
      if (!def.loaded) {
        if (!def.loading) {
          const ext = def.load()

          if (ext[0] instanceof Promise) {
            def.loading = true
            def.loaded = false
            loading[tag] = new Promise<any>(async (resolve) => {
              let result: React.FC<any> = () => {
                return <></>
              }
              const module = await ext[0]
              result = module.default
              if (!result) {
                result = module[Object.keys(module).shift()]
              }
              def.component = result

              const res = await fetch(`/components/${tag}.ccx`)
              def.template.code = await res.text()
              def.template.loading = false

              def.loaded = true
              def.loading = false

              resolve(result)

              if (loadingCount === 0 && opt && opt.render) {
                opt.render()
              }
            })
            const SuspendedComponent = lazy(async () => {
              await loading[tag]
              return {
                default: def.component,
              }
            })
            def.component = (props) => (
              <Suspense fallback={null}>
                <SuspendedComponent {...props} />
              </Suspense>
            )
          } else {
            def.loaded = true
            def.loading = false
            const module = ext[0]
            let result = module.default
            if (!result) {
              result = module[Object.keys(module).shift()]
            }
            def.component = result
          }
        } else {
          loading[tag] = new Promise<void>((resolve) => {
            waitUntil(() => window.cms_components[tag].loaded).then(resolve)
          })
          return ''
        }
      }
      component = def.component
    }
    if (props) {
      finalProps = {}
      for (let [k, v] of Object.entries(props)) {
        switch (k) {
          case 'style':
            if (typeof v === 'string') {
              finalProps['css'] = css`
                ${v}
              `
            }
            break
          case 'class':
            finalProps['className'] =
              (props['className'] ? props['className'] + ' ' : '') + v
            break
          case 'for':
            finalProps['htmlFor'] = v
            break
          default:
            finalProps[k] = v
            break
        }
      }
    }
    if (tag === 'a') {
      if (window.platform === 'mobile') {
        component = mLink
      } else {
        component = Link
      }
    }

    if (tag === 'fragment') {
      component = Fragment
    }
    if (tag === 'effect') {
      if (!effects.has(props) && typeof props.run === 'function') {
        effects.add(props)
      }
      return ''
    }
    if (tag === 'html-head') {
      return ''
    }

    if (component && component !== Fragment) {
      if (!finalProps) finalProps = {}
    }

    const result = jsx(
      component ? component : tag,
      finalProps,
      ...children.map(formatJsxChildren.bind({ component, tag, cmsPage }))
    )

    return result
  }

  const params = opt.params || {}
  params.isDev = !!window.is_dev

  let page = <></>

  try {
    page = cmsPage(
      db,
      api,
      window.action,
      window.runInAction,
      h,
      window.fragment,
      {},
      {},
      window.user,
      params,
      css,
      meta
    )
  } catch (e) {
    console.error(cmsPage.toString(), '\n\n', e)
  }

  const loadingCount = Object.keys(loading).length
  if (loadingCount > 0 && opt.defer) {
    page = <></>
    if (window.platform === 'mobile' && opt.type === 'layout') {
      const Wrapper = Page
      page = <Wrapper />
    }
  }

  return {
    page: page,
    loadingCount,
    loading:
      loadingCount > 0
        ? async () => {
            await Promise.all(Object.values(loading))
            return true
          }
        : undefined,
    effects,
  }
}

window.renderCMS = renderCMS