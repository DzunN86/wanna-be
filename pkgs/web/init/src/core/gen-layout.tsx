/** @jsx jsx */
import { jsx, css } from '@emotion/react'
import { db, dbAll } from 'libs'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { api } from 'web.utils/src/api'
import { useRender } from 'web.utils/src/useRender'
import type { BaseWindow } from '../window'
import { renderCMS } from './gen-page'

declare const window: BaseWindow

export const generateLayout: (source: string) => React.FC<any> = (
  source: string
) => {
  return observer(({ params, children }) => {
    let cms_layout: any
    eval(source)

    const meta = useLocalObservable(
      typeof cms_layout.child_meta === 'object'
        ? () => cms_layout.child_meta
        : () => ({})
    )

    const render = useRender()
    const result = renderCMS(cms_layout, meta, {
      defer: true,
      type: 'layout',
      params,
    })

    result.effects.forEach((e) => {
      useEffect(() => {
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
      }, e.deps || [])
    })

    useEffect(() => {
      if (result.loading) {
        result.loading().then(() => {
          render()
        })
      }
    }, [result.loadingCount])

    return result.page
  })
}
