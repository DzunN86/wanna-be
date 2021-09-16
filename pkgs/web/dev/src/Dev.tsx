/** @jsx jsx */
import { jsx } from '@emotion/react'
import { action, runInAction } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { initFluent } from 'web.init/src/web/initFluent'
import { loadExt } from 'web.utils/src/loadExt'
import type { BaseWindow } from '../../init/src/window'
import { Server } from './Server'
import { Settings } from './Settings'
import { Template } from './Template'

declare const window: BaseWindow

export const Dev = (props: any) => {
  const meta = useLocalObservable(() => ({
    tabs: [
      'web',
      // 'mobile', 'server',
      'settings',
      //  '_'
    ],
    tab: localStorage.getItem('current-dev-tab') || 'web',
    init: false,
    args: {},
    showNav: localStorage.getItem('dev-show-nav') === 'n' ? false : true,
  }))

  useEffect(() => {
    ;(async () => {
      const buffer = await loadExt('dev/buffer.js')
      window.Buffer = buffer

      initFluent().then(
        action(() => {
          meta.init = true
        })
      )
    })()
  }, [])

  const navigate = (opt: { tab: string; args: {} }) => {
    runInAction(() => {
      meta.tab = opt.tab
      meta.args = opt.args
      localStorage.setItem('current-dev-tab', opt.tab)
    })
  }

  return (
    <Observer>
      {() => {
        let render: any = null

        if (!meta.init) return null
        switch (meta.tab) {
          case 'web':
            render = (
              <Template
                mode="web"
                navigate={navigate}
                showNav={meta.showNav}
                toggleNav={action(() => {
                  meta.showNav = !meta.showNav
                  localStorage.setItem('dev-show-nav', meta.showNav ? 'y' : 'n')
                })}
                args={meta.args}
              />
            )
            break
          case 'mobile':
            render = (
              <Template
                mode="mobile"
                navigate={navigate}
                showNav={meta.showNav}
                toggleNav={action(() => (meta.showNav = !meta.showNav))}
                args={meta.args}
              />
            )
            break
          case 'server':
            render = (
              <Server
                navigate={navigate}
                showNav={meta.showNav}
                toggleNav={action(() => (meta.showNav = !meta.showNav))}
                args={meta.args}
              />
            )
            break
          case 'settings':
            render = <Settings />
            break
        }

        return (
          <div className="flex flex-row items-stretch flex-1 w-full h-full bg-white">
            {meta.showNav && (
              <nav className="flex flex-col border-r border-gray-200 text-md">
                {meta.tabs.map((e) => {
                  const className =
                    e === meta.tab
                      ? `  px-3 py-2 text-gray-600 border-r-2 border-blue-500 text-blue-500 focus:outline-none`
                      : ` px-3 py-2 text-gray-600 border-r-2 border-white hover:text-blue-500 focus:outline-none`

                  return (
                    <button
                      key={e}
                      className={
                        className +
                        ' text-sm capitalize flex flex-row items-center justify-end'
                      }
                      onClick={action(() => {
                        if (window.devUnsaved) {
                          if (
                            !confirm(
                              'Unsaved changes will be lost, are you sure ?'
                            )
                          ) {
                            return
                          }
                        }
                        window.devUnsaved = false
                        meta.tab = e
                        localStorage.setItem('current-dev-tab', e)
                        meta.args = {}
                      })}
                    >
                      {e}
                    </button>
                  )
                })}
              </nav>
            )}
            <div className="flex flex-col flex-1">{render}</div>
          </div>
        )
      }}
    </Observer>
  )
}

export default Dev
