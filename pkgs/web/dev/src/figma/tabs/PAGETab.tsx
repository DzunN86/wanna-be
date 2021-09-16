/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { PrimaryButton, Spinner, TextField } from '@fluentui/react'
import find from 'lodash.find'
import { action, runInAction, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { api } from 'web.utils/src/api'
import { getFrameData } from '../components/util'
import { sendParent } from '../ws'
import { RiShareForwardFill } from 'react-icons/ri'
import { GoArrowLeft } from 'react-icons/go'
interface ITarget {
  type: 'page' | 'comp'
  id: string
  name: string
  path: string
}

export const PAGETab = observer(({ frame, node, target, html }: any) => {
  const schema = window.location.protocol
  const host =
    (window as any).devHost || location.host.replace(/^https?:\/\//, '')

  if (node.type === 'COMPONENT' && target.type !== 'comp') {
    target.type = 'comp'
  }

  const meta = useLocalObservable(() => ({
    target: target,
    mode: 'New' as 'New' | 'Existing',
    comp: {
      type: '' as 'import' | 'require',
      fallback: '',
    },
    'layout-enabled': 'y',
    'layout-id': '',
    list: {
      components: [],
      pages: [],
      layouts: [],
    },
    pageUrl: '',
    backTo: '',
    new: {
      name: '',
      url: '',
      overrideUrl: true,
    },
    html,
    ready: false,
    fallback: '',
    updatingInstances: false,
  }))

  useEffect(
    action(() => {
      meta.html = html
    }),
    [html]
  )

  useEffect(
    action(() => {
      meta.target = target
      meta.mode = target && target.name ? 'Existing' : 'New'
      reset()
      reloadList()
    }),
    [target]
  )

  const reset = action(() => {
    meta.new.name = ''
    meta.new.url = ''
    meta.new.overrideUrl = true
    getFrameData(meta, 'layout-enabled', 'y')
    getFrameData(meta, 'layout-id')
  })

  const reloadList = () => {
    sendParent('get-layouts').then(
      action((e: any) => {
        meta.list.layouts = [{}, ...e.layouts] as any
      })
    )
    api('/__cms/0/list-template').then(
      action(
        (pages) =>
          (meta.list.pages = [
            {},
            ...pages.map((e) => {
              let path = `/app/web/cms/templates/${e.id}.html`

              if (e.id === meta.target.id) {
                runInAction(() => (meta.pageUrl = e.slug))
              }
              return { id: e.id, name: e.title, url: e.slug, path: path }
            }),
          ] as any)
      )
    )
    loadComp({ name: meta.target.name }).then((e) => {
      runInAction(() => {
        meta.list.components = e.list
        meta.comp = e.comp
      })
    })
  }

  useEffect(() => {
    reloadList()
  }, [meta.mode])

  const create = async () => {
    if (!meta.html) return
    if (meta.target.type === 'comp') {
      if (node.type !== 'COMPONENT') {
        alert('Please convert to component first!')
        return
      }

      const attr = generateCompAttr(meta.new.name, meta.html, node)
      const res = await api(`${schema}//${host}/__cms/0/component-save`, attr)
      const npath = `/app/web/src/components/${meta.new.name}.html`
      const comp = await api('/__cms/0/component-load', {
        path: npath.endsWith('.html')
          ? npath.substr(0, npath.length - 5)
          : npath,
        name: meta.new.name,
      })
      frame.effect = comp.wrapperCode
      if (res && res.status === 'ok') {
        runInAction(() => {
          meta.mode = 'Existing'
          meta.target = {
            type: 'comp',
            name: meta.new.name,
            id: '',
            path: npath,
          }
          sendParent('set-frame-data', {
            name: 'target',
            value: meta.target,
            parse: true,
          }).then(() => sendParent('trigger-select'))
        })
      }
    } else if (meta.target.type === 'page') {
      const attr = generatePageAttr(
        meta.new.name,
        meta.new.url,
        meta.html,
        node
      )
      const res = await api(`${schema}//${host}/__cms/0/save-template`, attr)
      await api(`${schema}//${host}/__cms/${res.data.id}/reload-template`, attr)
      if (res && res.data) {
        runInAction(() => {
          meta.mode = 'Existing'
          meta.target = {
            type: 'page',
            name: res.data.title,
            id: res.data.id,
            path: `/app/web/cms/templates/${res.data.id}.html`,
          }
          sendParent('set-frame-data', {
            name: 'target',
            value: meta.target,
            parse: true,
          })
        })
      }
    }

    reset()
  }

  if (!meta.target || !meta.html)
    return (
      <div className="items-center justify-center flex absolute inset-0">
        <Spinner />
      </div>
    )

  return (
    <div
      className="relative flex-1"
      css={css`
        overflow-x: hidden;
        overflow-y: auto;
      `}
    >
      <div className="flex flex-col items-stretch inset-0 absolute">
        <div
          className="flex-1 flex flex-row items-stretch"
          css={css`
            div *,
            ::placeholder {
              font-size: 12px;
            }
          `}
        >
          <div className="border-r select-none border-gray-300 text-xs flex flex-col pl-1 pt-1">
            {node && node.type !== 'COMPONENT' && (
              <div
                onClick={action(() => {
                  meta.target.type = 'page'
                  if (meta.target.id) {
                    meta.mode = 'Existing'
                  }
                })}
                className={
                  (meta.target.type === 'page'
                    ? 'border-gray-300 bg-gray-100'
                    : 'border-white') +
                  ' cursor-pointer border text-right border-r-0 px-2 py-1'
                }
              >
                Page
              </div>
            )}
            {node &&
              node.frame &&
              node.frame.toLowerCase().indexOf('layout:') !== 0 && (
                <div
                  onClick={action(() => {
                    meta.target.type = 'comp'
                    if (meta.target.id) {
                      meta.mode = 'Existing'
                    }
                  })}
                  className={
                    (meta.target.type === 'comp'
                      ? 'border-gray-300 bg-gray-100'
                      : 'border-white') +
                    ' cursor-pointer border text-right border-r-0 px-2 py-1'
                  }
                >
                  Comp
                </div>
              )}
          </div>
          {meta.target.type === 'page' && (
            <div className="flex flex-col flex-1 space-y-1">
              <div className="absolute top-0 right-0 p-2">
                {meta['layout-id'] ? (
                  <PrimaryButton
                    onClick={() => {
                      meta.backTo = node.id
                      sendParent('focus-to', {
                        node_id: meta['layout-id'],
                      })
                    }}
                  >
                    Go To Layout <RiShareForwardFill className="ml-1" />
                  </PrimaryButton>
                ) : (
                  meta.backTo && (
                    <PrimaryButton
                      onClick={() => {
                        sendParent('focus-to', {
                          node_id: meta.backTo,
                        })
                        runInAction(() => {
                          meta.backTo = ''
                        })
                      }}
                    >
                      <GoArrowLeft className="mr-1" /> Back To Page
                    </PrimaryButton>
                  )
                )}
              </div>
              <Tabs
                list={['New', 'Existing']}
                current={meta.mode}
                onChange={action((e) => {
                  meta.mode = e
                })}
              />
              {meta.mode === 'New' && (
                <div className="flex flex-col items-stretch space-y-1 px-1">
                  <TextField
                    placeholder="Name"
                    className="flex-1"
                    value={meta.new.name}
                    spellCheck={false}
                    onChange={action((_, e) => {
                      meta.new.name = e || ''
                      if (meta.new.overrideUrl) {
                        meta.new.url = `/${meta.new.name
                          .replace(/[\W_]+/g, '-')
                          .toLowerCase()}`
                      }
                    })}
                  />
                  <TextField
                    placeholder="Path"
                    className="flex-1"
                    spellCheck={false}
                    value={meta.new.url}
                    onChange={action((_, e) => {
                      meta.new.url = e || ''
                      if (meta.new.overrideUrl) {
                        meta.new.overrideUrl = false
                      }
                    })}
                  />
                  <PrimaryButton onClick={create}>Create</PrimaryButton>
                </div>
              )}
              {meta.mode === 'Existing' && (
                <div className="flex flex-col items-stretch space-y-1 px-1">
                  <select
                    value={meta.target.id}
                    onChange={action((e) => {
                      const found: any = find(meta.list.pages, {
                        id: e.target.value,
                      })
                      if (found) {
                        meta.target.type = 'page'
                        meta.target.id = found.id
                        meta.target.name = found.name
                        meta.target.path = `/app/web/cms/templates/${found.id}.html`

                        meta.pageUrl == found.url
                        sendParent('set-frame-data', {
                          name: 'target',
                          value: meta.target,
                          parse: true,
                        }).then(() => {})
                      }
                    })}
                    className="border border-gray-600 p-1"
                  >
                    {meta.list.pages.map((e: any, idx: number) => {
                      return (
                        <option key={idx} value={e.id}>
                          {!e.id ? '' : `${e.id} | ${e.name}`}
                        </option>
                      )
                    })}
                  </select>
                  <>
                    {node &&
                      node.frame &&
                      node.frame.toLowerCase().indexOf('layout:') !== 0 && (
                        <>
                          <div className="border border-gray-400 flex items-stretch">
                            <div
                              className="border-gray-400 border-r"
                              css={css`
                                font-size: 9px !important;
                                font-weight: 500;
                                padding: 4px;
                              `}
                            >
                              Layout
                            </div>
                            <select
                              className="flex-1"
                              value={meta['layout-id']}
                              onChange={action((e) => {
                                meta['layout-id'] = e.target.value

                                sendParent('set-frame-data', {
                                  name: 'layout-id',
                                  value: meta['layout-id'],
                                })

                                if (meta['layout-id']) {
                                  sendParent('get-node-data', {
                                    name: 'target',
                                    node_id: meta['layout-id'],
                                  }).then((raw: any) => {
                                    if (typeof raw === 'string') {
                                      const layout = JSON.parse(raw)
                                      const attr = generatePageAttr(
                                        meta.target.name,
                                        meta.pageUrl,
                                        meta.html,
                                        node
                                      )
                                      attr.id = meta.target.id
                                      attr.parent_id = layout.id
                                      api(
                                        `${schema}//${host}/__cms/${meta.target.id}/save-template`,
                                        attr
                                      )
                                      api(
                                        `${schema}//${host}/__cms/${meta.target.id}/reload-template`,
                                        attr
                                      )
                                    }
                                  })
                                }
                              })}
                            >
                              {meta.list.layouts.map((e: any, idx: number) => {
                                return (
                                  <option key={idx} value={e.id}>
                                    {!e.id ? '' : `${e.name}`}
                                  </option>
                                )
                              })}
                            </select>
                            <div className="border-gray-400 border-l flex p-1 items-center justify-center">
                              <input
                                type="checkbox"
                                checked={meta['layout-enabled'] === 'y'}
                                onChange={action((e) => {
                                  meta['layout-enabled'] = e.target.checked
                                    ? 'y'
                                    : 'n'
                                  sendParent('set-frame-data', {
                                    name: 'layout-enabled',
                                    value: meta['layout-enabled'],
                                  })
                                })}
                              ></input>
                            </div>
                          </div>
                          <input
                            css={css`
                              font-size: 8px !important;
                            `}
                            onChange={() => {}}
                            onClick={(e) => e.currentTarget.select()}
                            value={
                              meta.pageUrl
                                ? `${schema}//${host}${meta.pageUrl}`
                                : `${schema}//${host}/__cms/${meta.target.id}/preview`
                            }
                          />
                        </>
                      )}
                  </>
                </div>
              )}
            </div>
          )}
          {meta.target.type === 'comp' && (
            <div className="flex flex-col flex-1 space-y-1">
              <Tabs
                list={['New', 'Existing']}
                current={meta.mode}
                onChange={action((e) => {
                  meta.mode = e
                })}
              />
              {meta.mode === 'New' && (
                <div className="flex flex-col items-stretch space-y-1 px-1">
                  <TextField
                    className="flex-1"
                    placeholder="Name"
                    value={meta.new.name}
                    spellCheck={false}
                    onChange={action((_, e) => {
                      meta.new.name = (e || '')
                        .replace(/[\W_]+/g, '-')
                        .toLowerCase()
                    })}
                  />
                  <PrimaryButton onClick={create}>Create</PrimaryButton>
                </div>
              )}
              {meta.mode === 'Existing' && (
                <div className="flex flex-col items-stretch space-y-1 px-1">
                  <select
                    value={meta.target.name}
                    onChange={action((e) => {
                      const found: any = find(meta.list.components, {
                        name: e.target.value,
                      })
                      if (found) {
                        meta.target.type = 'comp'
                        meta.target.id = ''
                        meta.target.path = found.path
                        meta.target.name = found.name
                        meta.target.comp.type = found.type

                        sendParent('set-frame-data', {
                          name: 'target',
                          value: meta.target,
                          parse: true,
                        })
                      }
                    })}
                    className="border border-gray-600 p-1"
                  >
                    {meta.list.components.map((e: any, idx) => {
                      return (
                        <option key={idx} value={e.name}>
                          {e.name}
                        </option>
                      )
                    })}
                  </select>
                  {meta.comp.type && (
                    <>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={meta.comp.type === 'import'}
                          onChange={action((e) => {
                            meta.comp.type = e.target.checked
                              ? 'import'
                              : 'require'
                          })}
                          className="mr-1"
                        />
                        Async with Fallback
                      </label>
                      {/* {meta.comp.type === 'import' && (
                          <div>{JSON.stringify(meta.comp.fallback)}</div>
                        )} */}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

const Tabs = ({ current, list, onChange }) => {
  return (
    <div className="border-b select-none border-gray-300 text-xs flex flex-row pl-1 pt-1">
      {list.map((e) => {
        return (
          <div
            key={e}
            onClick={() => onChange(e)}
            className={
              (e === current ? 'border-gray-300 bg-gray-100' : 'border-white') +
              ' cursor-pointer border border-b-0 px-2 py-1'
            }
          >
            {e}
          </div>
        )
      })}
    </div>
  )
}

export const loadComp = ({
  name,
}): Promise<{ list: any[]; comp: { type: any; fallback: any } }> => {
  return new Promise((resolve) => {
    api('/__cms/0/component-list').then(
      action((comps) => {
        const comp = {
          type: '',
          fallback: '',
        }
        const result = [
          {},
          ...comps
            .filter((e) => e.path.indexOf('web.') !== 0)
            .map((e) => {
              let path = e.path
              if (e.path.indexOf('./') === 0) {
                const patharr = e.path.split('/')
                patharr.shift()
                path = `/app/web/src/${patharr.join('/')}`

                const exts = path.split('.')
                if (exts.length > 1) {
                  const ext = exts.pop()
                  path = `${ext.join('.')}.html`
                }
              }

              if (e.name === name) {
                runInAction(() => {
                  comp.type = e.type
                  comp.fallback = e.fallback
                })
              }

              return {
                name: e.name,
                type: e.type,
                path,
              }
            }),
        ] as any

        resolve({ list: result, comp })
      })
    )
  })
}

const generateCompAttr = (name, html, node) => {
  return {
    name: name,
    path: './components/' + name,
    type: 'import',
    wrapperCode: `\
/** @jsx jsx */
import { jsx } from "@emotion/react";
import { useComponent } from "web.utils/component";

export default ({ children }) => {
const _component = useComponent({});
return eval(_component.render);
}`,
    code: html,
    isNew: true,
    wrapperChanged: false,
  }
}

const generatePageAttr = (name, path, html, node) => {
  let type = 'Page'
  if (node && node.frame && node.frame.toLowerCase().indexOf('layout:') === 0) {
    type = 'Layout'
  }
  return {
    content: {
      structure: '00000',
      template: html,
      type,
    },
    id: '',
    lang: '',
    parent_id: '',
    site: '*',
    slug: path,
    status: 'SYSTEM',
    title: name,
    type: 'cms-template',
  }
}
