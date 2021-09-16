/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  DefaultButton,
  Icon,
  IconButton,
  Label,
  Modal,
  PrimaryButton,
  TextField,
  TooltipHost,
} from '@fluentui/react'
import { waitUntil } from 'libs'
import get from 'lodash.get'
import throttle from 'lodash.throttle'
import { action, observable, observe, runInAction, toJS } from 'mobx'
import { Observer, observer, useLocalObservable } from 'mobx-react-lite'
import { Fragment, isValidElement, useEffect, useRef, useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { TouchBackend } from 'react-dnd-touch-backend'
import { Field, IField } from 'web.form/fields/Field'
import { Loading } from 'web.form/fields/Loading'
import Select from 'web.form/fields/Select'
import { Table } from 'web.list/src/Table'
import { api } from 'web.utils/src/api'
import { niceCase } from 'web.utils/src/niceCase'
import { useRender } from 'web.utils/src/useRender'
import { useWebRenderField } from '../../form/fields/FieldWeb'
import { BaseWindow } from '../../init/src/window'
import { ComponentBrowser } from './internal/ComponentBrowser'
import { FieldCode } from './internal/FieldCode'
import { TemplateCode } from './internal/TemplateCode'
import { Toolbar } from './libs/Toolbar'

declare const window: BaseWindow

const defaultData = {
  title: '',
  type: 'cms-template',
  lang: '',
  status: 'SYSTEM',
  parent_id: null,
  content: {
    type: `layout`,
    structure: ``,
    template: `<div>
  <hello-world />
  <div>Ini Page Baru</div>
</div>`,
  },
  slug: '',
  site: '*',
}

const template = observable({
  mode: (localStorage.getItem('template-mode') === 'split'
    ? 'split'
    : 'code') as 'code' | 'split',
  listFilter: {
    title: '',
    type: 'All',
    domain: '',
  },
})

export const Template = (props: {
  mode: 'web' | 'mobile'
  args: any
  showNav: boolean
  toggleNav: (nav: boolean) => void
  navigate: (opt: { tab: string; args: any }) => void
}) => {
  const splitSize = parseInt(
    localStorage.getItem('template-split-size') || '50'
  )
  const meta = useLocalObservable(() => ({
    mode: 'list' as 'list' | 'form',
    editId: -1,
    saving: false,
    splitSize: splitSize === 0 || splitSize === 100 ? splitSize : 50,
    structures: [] as { value: string; label: string; definition: any }[],
    parents: [] as { id: number; title: string }[],
    list: [] as any[],
    batchEdit: {
      enabled: false,
      selected: [] as any,
      internal: null as any,
      value: {
        domain: '*',
      },
    },
    listMode: 'none' as 'none' | 'multi',
    form: {} as any,
    init: false,
    unsaved: false as boolean,
  }))

  const checkRef = useRef(null as any)

  const save = async () => {
    let isNew = !meta.form.id

    if (window.devFormatCode) {
      await window.devFormatCode()
    }

    api('/__cms/0/broadcast-reload', {
      id: meta.form.id,
      html: meta.form.content.template,
    })

    runInAction(() => {
      meta.unsaved = false
      meta.saving = true
    })

    runInAction(() => {
      if (meta.form.content.type === 'API') {
        template.mode = 'code'
        if (!meta.form.content.server_on_load) {
          meta.form.content.server_on_load = `
async ({template, params, render, db, req, reply, user, log, ext, isDev }: Server) => {
  reply.send({
    hello: "world"
  })
}`.trim()
        }
      }
    })

    const res = await api('/__cms/0/save-template', JSON.stringify(meta.form))
    runInAction(() => {
      meta.form.id = res.data.id
    })
    await api(`/__cms/${meta.form.id}/reload-template`, undefined, {
      raw: true,
    })

    runInAction(() => {
      meta.form = res.data
      meta.saving = false
      meta.unsaved = false
    })
  }
  const reloadList = async () => {
    const res = await api('/__cms/0/list-template')
    runInAction(() => {
      meta.parents = []
      for (let i of res) {
        if (i.content.type === 'Layout') {
          meta.parents.push(i)
        }
      }
      meta.list = res
      listOri.current = toJS(meta.list)
      doFilter()

      if (meta.editId > 0 && Object.keys(meta.form).length === 0) {
        for (let i of meta.list) {
          if (i.id === meta.editId) {
            meta.form = i
            break
          }
        }
        meta.mode = 'form'
      }

      const lastId = localStorage.getItem('template-current-row-id')
      if (lastId) {
        for (let r of res) {
          if (r.id === lastId) {
            runInAction(() => {
              meta.form = r
              meta.mode = 'form'
              meta.unsaved = false

              if (meta.form.content.type === 'API') {
                template.mode = 'code'
              }
            })
            break
          }
        }
      }
    })
  }

  const listOri = useRef([] as any[])
  const doFilter = () => {
    if (!listOri.current || (listOri.current && listOri.current.length === 0)) {
      listOri.current = toJS(meta.list)
    }
    const title = template.listFilter.title.toLowerCase()
    meta.list = listOri.current.filter((e) => {
      let result = true

      if (template.listFilter.domain !== '') {
        if (template.listFilter.domain === 'All Domain') {
          result = e.site === '*'
        } else {
          result = e.site === template.listFilter.domain
        }
      }
      if (template.listFilter.type !== 'All') {
        result = e.content.type === template.listFilter.type
      }
      if (result && template.listFilter.title !== '') {
        result =
          e.title.toLowerCase().indexOf(title) >= 0 ||
          e.id.toLowerCase().indexOf(title) >= 0 ||
          e.slug.toLowerCase().indexOf(title) >= 0
      }

      return result
    })
  }

  useEffect(() => {
    if (props.args) {
      runInAction(() => {
        for (let i in props.args) {
          meta[i] = props.args[i]
        }
      })
    }

    ;(async () => {
      await Promise.all([reloadList()])
      runInAction(() => {
        meta.init = true
      })
    })()

    let dispose
    if (meta.unsaved) {
      dispose = observe(meta, 'unsaved', (e) => {
        window.devUnsaved = !!e.newValue
      })
    }

    const keydown = function (e) {
      if (
        (window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) &&
        e.keyCode == 83
      ) {
        if (window.devIsComponentEditorOpen) {
          return
        }
        e.preventDefault()
        save()
      }
    }
    document.addEventListener('keydown', keydown, true)

    return () => {
      document.removeEventListener('keydown', keydown)
      if (typeof dispose === 'function') {
        dispose()
      }
    }
  }, [])

  if (props.mode === 'mobile') {
    return null
  }

  return (
    <Observer>
      {() => {
        const domains = { '': true }
        for (let i of listOri.current) {
          if (!!i.site) {
            domains[i.site === '*' ? 'All Domain' : i.site] = true
          }
        }

        return (
          <Fragment>
            <Toolbar
              id={meta.mode === 'form' && get(meta, 'form.id', '')}
              unsaved={meta.mode === 'form' && meta.unsaved}
              title={
                meta.mode === 'form' ? (
                  <Fragment>
                    {get(meta, 'form.id', 0) > 0
                      ? niceCase(get(meta, 'form.title'))
                      : 'Create New Template'}
                  </Fragment>
                ) : (
                  <div className="flex flex-row items-center">
                    Template
                    <div
                      className="flex items-stretch ml-3 border border-gray-500"
                      css={css`
                        .ms-TextField-fieldGroup {
                          height: 24px;
                          width: 140px;
                          border: 0px;
                        }
                      `}
                    >
                      <div className="flex items-center px-2 border-r border-gray-500">
                        Title
                      </div>
                      <TextField
                        value={template.listFilter.title}
                        onChange={action((e, v) => {
                          template.listFilter.title = v || ''
                          doFilter()
                        })}
                      />
                    </div>
                    <div className="flex items-stretch ml-3 border border-gray-500">
                      <div className="flex items-center px-2 border-r border-gray-500">
                        Type
                      </div>
                      <Select
                        onChange={action((e, v) => {
                          template.listFilter.type = v.key
                          doFilter()
                        })}
                        selectedKey={template.listFilter.type}
                        css={css`
                          .ms-ComboBox {
                            height: 24px;
                            width: 80px;
                            &::after {
                              border: 0px;
                            }

                            input {
                              font-size: 11px;
                            }
                            i {
                              font-size: 8px;
                            }
                          }
                        `}
                        items={['All', 'Layout', 'API', 'Page']}
                      />
                    </div>
                    <div className="flex items-stretch ml-3 border border-gray-500">
                      <div className="flex items-center px-2 border-r border-gray-500">
                        Domain
                      </div>
                      <Select
                        onChange={action((e, v) => {
                          template.listFilter.domain = v.key
                          doFilter()
                        })}
                        selectedKey={template.listFilter.domain}
                        css={css`
                          .ms-ComboBox {
                            height: 24px;
                            width: 150px;
                            &::after {
                              border: 0px;
                            }

                            input {
                              font-size: 11px;
                            }
                            i {
                              font-size: 8px;
                            }
                          }
                        `}
                        items={Object.keys(domains).sort()}
                      />
                    </div>
                  </div>
                )
              }
              back={
                meta.mode !== 'list' &&
                action(() => {
                  if (
                    !meta.unsaved ||
                    (meta.unsaved &&
                      confirm('Unsaved data will be lost, are you sure ?'))
                  ) {
                    meta.mode = 'list'
                    meta.unsaved = false
                    reloadList()

                    localStorage.setItem('template-current-row-id', '')
                  }
                })
              }
              actions={[
                <TooltipHost key="side-menu" content="Toggle Side Menu">
                  <div
                    key="side-toggle"
                    onClick={() => props.toggleNav(!props.showNav)}
                    className="flex flex-row items-center px-3 mr-3 rounded-sm cursor-pointer hover:opacity-50"
                  >
                    <Icon
                      iconName={
                        props.showNav
                          ? 'InsertColumnsLeft'
                          : 'InsertColumnsRight'
                      }
                      className="bg-white rounded-sm"
                      css={css`
                        font-size: 15px;
                        color: #333 !important;
                      `}
                    />
                  </div>
                </TooltipHost>,
                meta.mode === 'list' && (
                  <div
                    key="batch-edit"
                    className="flex flex-row items-center px-3 mr-3 rounded-sm cursor-pointer hover:opacity-50"
                    ref={checkRef}
                    css={css`
                      height: 30px;
                      ${meta.listMode === 'multi' &&
                      css`
                        border: 1px solid #ddd;
                      `}
                    `}
                    onClick={action(() => {
                      if (
                        meta.batchEdit.selected.length > 0 &&
                        meta.listMode === 'multi'
                      ) {
                        meta.batchEdit.enabled = true
                      } else {
                        meta.listMode =
                          meta.listMode === 'none' ? 'multi' : 'none'
                      }
                    })}
                  >
                    <Icon
                      iconName={
                        meta.listMode === 'none' ? 'ReceiptCheck' : 'edit'
                      }
                      className="rounded-sm"
                      css={css`
                        font-size: ${meta.listMode === 'none'
                          ? '18px'
                          : '13px'};
                        color: #333 !important;
                      `}
                    />
                    {meta.batchEdit.enabled && (
                      <Modal isOpen={true}>
                        <Label
                          className="px-6"
                          css={css`
                            border-bottom: 1px solid #aaa;
                            font-size: 16px;
                          `}
                        >
                          Batch Edit {meta.batchEdit.selected.length} items
                        </Label>
                        <div
                          className="flex flex-col px-4 py-2"
                          onMouseMove={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <Field
                            name="domain"
                            useRenderField={useWebRenderField}
                            value={meta.batchEdit.value.domain}
                            onChange={action((v) => {
                              meta.batchEdit.value.domain = v
                            })}
                          />
                          <div className="flex flex-row">
                            <DefaultButton
                              onClick={() => {
                                runInAction(() => {
                                  meta.batchEdit.enabled = false
                                  meta.listMode = 'none'
                                })
                              }}
                              className="m-2"
                            >
                              Cancel
                            </DefaultButton>
                            <PrimaryButton
                              className="m-2"
                              onClick={async () => {
                                const req = {}
                                runInAction(() => {
                                  meta.batchEdit.enabled = false
                                  meta.listMode = 'none'

                                  for (let i of meta.batchEdit.selected) {
                                    for (let r of meta.list) {
                                      if (r.id === i.id) {
                                        r.site = meta.batchEdit.value.domain
                                        req[r.id] = {
                                          site: meta.batchEdit.value.domain,
                                        }
                                      }
                                    }
                                  }

                                  listOri.current = toJS(meta.list)
                                })

                                const res = await api(
                                  '/__cms/0/batch-edit',
                                  JSON.stringify(req)
                                )
                              }}
                            >
                              Submit
                            </PrimaryButton>
                          </div>
                        </div>
                      </Modal>
                    )}
                    {meta.listMode === 'multi' && (
                      <Label className="ml-2 text-sm cursor-pointer">
                        {meta.batchEdit.selected.length > 0
                          ? `Edit ${meta.batchEdit.selected.length} items`
                          : 'Cancel'}
                      </Label>
                    )}
                  </div>
                ),
                <ComponentBrowser key="comp-browser" />,
                meta.mode === 'list' && (
                  <DefaultButton
                    onClick={action(() => {
                      meta.editId = -1
                      meta.form = JSON.parse(JSON.stringify(defaultData))
                      // meta.form.content.structure = meta.structures[0].value
                      if (meta.parents.length > 0) {
                        meta.form.parent_id = meta.parents[0].id
                        meta.form.content.type = 'Page'
                      } else {
                        meta.form.content.type = 'Layout'
                        meta.form.content.template = `<div><div>A New Layout</div><div>{children}</div></div>`
                      }
                      meta.mode = 'form'
                      meta.unsaved = false
                    })}
                    key="add"
                    iconProps={{ iconName: 'Add' }}
                  >
                    New Template
                  </DefaultButton>
                ),
                meta.mode === 'form' && get(meta.form, 'id') && (
                  <div
                    key="preview"
                    className="flex flex-row mr-2 bg-white border border-gray-300 rounded-sm"
                  >
                    <div
                      className="flex items-center px-1 font-normal"
                      css={css`
                        .mode {
                          font-size: 12px;
                          border-radius: 3px;
                          padding: 2px 10px;
                          color: #aaa;
                          cursor: pointer;
                          &:hover {
                            color: #333;
                          }

                          &.active {
                            color: #333;
                            background: #ececeb;
                          }
                        }
                      `}
                    >
                      <Label
                        onClick={action(() => {
                          localStorage.setItem('template-mode', 'code')
                          template.mode = 'code'
                        })}
                        className={`mode ${
                          template.mode === 'code' ? 'active' : ''
                        }`}
                      >
                        Config
                      </Label>
                      {meta.form.content.type !== 'API' && (
                        <Label
                          onClick={action(() => {
                            localStorage.setItem('template-mode', 'split')
                            template.mode = 'split'
                          })}
                          className={`mode ${
                            template.mode === 'split' ? 'active' : ''
                          }`}
                        >
                          Editor
                        </Label>
                      )}
                    </div>
                    {(meta.form.content.type === 'Page' ||
                      meta.form.content.type === 'API') && (
                      <a
                        href={`${getHost(meta.form.site)}/__cms/${get(
                          meta.form,
                          'id'
                        )}/preview`}
                        target="_blank"
                        className="flex flex-row items-center pl-3 mr-3 border-l border-gray-300 cursor-pointer"
                        key="add"
                      >
                        <Icon
                          iconName="Share"
                          css={css`
                            font-size: 13px;
                          `}
                        />
                        <Label
                          css={css`
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 600;
                            margin-left: 4px;
                          `}
                        >
                          Preview
                        </Label>
                      </a>
                    )}
                  </div>
                ),
                meta.mode === 'form' && get(meta, 'form.id', 0) > 0 && (
                  <IconButton
                    onClick={async () => {
                      if (
                        confirm(
                          'WARNING: This cannot be undone\nAre you sure to delete this item ?'
                        )
                      ) {
                        await api(`/__cms/${meta.form.id}/del-template`)
                        await reloadList()
                        runInAction(() => {
                          meta.editId = -1
                          meta.mode = 'list'
                        })
                      }
                    }}
                    key="delete"
                    iconProps={{ iconName: 'Delete' }}
                    className="bg-white rounded-sm"
                    css={css`
                      border: 1px solid #ffb6b6 !important;
                      color: red !important;
                      font-weight: bold;
                    `}
                  />
                ),
                meta.mode === 'form' && (
                  <DefaultButton
                    onClick={save}
                    key="save"
                    iconProps={{ iconName: 'Save' }}
                  >
                    <div
                      css={css`
                        font-size: 12px;
                        font-weight: 600;
                        margin-left: 4px;
                      `}
                    >
                      {meta.saving ? 'Saving...' : 'Save'}
                    </div>

                    <div
                      css={css`
                        font-size: 10px;
                        font-weight: 600;
                        margin: 0 0 0 10px;
                        border-left: 1px solid #ddd;
                        padding: 10px 3px 10px 10px;
                      `}
                    >
                      {/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)
                        ? '⌘ S '
                        : 'Ctrl + S '}
                    </div>
                  </DefaultButton>
                ),
              ]}
            />
            {meta.mode === 'list' && (
              <Table
                items={meta.list}
                onRowClick={
                  meta.listMode === 'none'
                    ? action(async (r) => {
                        meta.form = r
                        meta.mode = 'form'
                        meta.unsaved = false

                        if (meta.form.content.type === 'API') {
                          template.mode = 'code'
                        }

                        localStorage.setItem('template-current-row-id', r.id)
                        return true
                      })
                    : undefined
                }
                onSelect={(s) => {
                  runInAction(() => {
                    meta.batchEdit.internal = s
                    meta.batchEdit.selected = s.getSelection()
                  })
                }}
                selMode={meta.listMode}
                columns={[
                  ['id', { width: 30 }],
                  [
                    'parent_id',
                    {
                      title: 'Type',
                      width: 70,
                      value: (row) => {
                        let cls = ''
                        switch (row.content.type) {
                          case 'Layout':
                            cls = 'text-white bg-purple-600'
                            break
                          case 'API':
                            cls = 'text-white bg-yellow-500'
                            break
                          default:
                            cls = 'bg-gray-100'
                            break
                        }

                        return (
                          <div
                            className={
                              cls +
                              ' flex items-center justify-center w-full p-1 text-xs font-medium  rounded-sm'
                            }
                          >
                            {row.content.type || 'Page'}
                          </div>
                        )
                      },
                    },
                  ],
                  ['title', { width: 500 }],
                  [
                    'parent_id',
                    {
                      title: 'Layout',
                      width: 80,
                      value: (row) => {
                        if (row.content.type !== 'Page')
                          return <div className="flex-1 pl-2">&mdash;</div>

                        const st = meta.parents.find(
                          (e) => e.id === row.parent_id
                        )
                        if (!st) return null
                        return (
                          <Label
                            className="p-0 px-2 border border-gray-200 rounded-sm"
                            css={css`
                              font-size: 12px;
                            `}
                          >
                            {st && st.title}
                          </Label>
                        )
                      },
                    },
                  ],
                  [
                    'site',
                    {
                      title: 'Domain',
                      width: 100,
                      value: (row) => {
                        return (
                          <div className="w-full p-1 text-xs font-medium text-center bg-gray-100 rounded-sm ">
                            {row.site && row.site.trim() === '*'
                              ? 'All Domain'
                              : row.site || '-'}
                          </div>
                        )
                      },
                    },
                  ],
                  [
                    'slug',
                    {
                      title: 'Slug',
                      width: 300,
                      value: (row) => {
                        return row.content.type === 'Page' ||
                          row.content.type === 'API' ? (
                          <div className="flex text-xs font-medium ">
                            {row.slug}
                          </div>
                        ) : (
                          <div className=""></div>
                        )
                      },
                    },
                  ],
                ]}
              />
            )}
            {meta.mode === 'form' && (
              <DndProvider
                backend={TouchBackend}
                options={{ enableMouseEvents: true }}
              >
                <TemplateForm
                  Field={Field}
                  data={meta.form}
                  parents={meta.parents}
                  navigate={props.navigate}
                  // setData={action((val: any) => {
                  //   const id = meta.form.id
                  //   meta.form = { ...meta.form, ...val }
                  //   if (id) {
                  //     meta.form.id = id
                  //   }
                  // })}
                  setUnsaved={action((val: boolean) => {
                    meta.unsaved = val
                  })}
                  mode={get(meta, 'form.id') ? template.mode : 'code'}
                  size={meta.splitSize}
                  setSize={action((val) => {
                    if (val === 0 || val === 100) {
                      localStorage.setItem(
                        'template-split-size',
                        val.toString()
                      )
                    }
                    meta.splitSize = val
                  })}
                  structures={meta.structures}
                />
              </DndProvider>
            )}
          </Fragment>
        )
      }}
    </Observer>
  )
}

const TemplateForm = observer(
  ({
    Field,
    data,
    structures,
    mode,
    size,
    setSize,
    setUnsaved,
    parents,
    navigate,
  }: {
    Field: (props: IField) => any
    data: any
    structures: { value: string; label: string; definition: any }[]
    setUnsaved: (val: any) => void
    mode: 'code' | 'split' | 'visual'
    size: number
    setSize: (val: number) => void
    navigate: (opt: { tab: string; args: any }) => void
    parents: { id: number; title: string }[]
  }) => {
    const meta = useLocalObservable<{
      splitType: 'editor' | 'visual'
    }>(() => ({ splitType: 'editor' }))

    const filePath = `/app/web/cms/templates/${data.id}.html`
    const [ready, setReady] = useState(false)
    const render = useRender()
    const mounted = useRef(true)
    const monaco = useRef(null as any)

    const preview = useRef({
      value: data.content.template,
      component: <div />,
    })
    const iframe = useRef(null as any)
    const updatePreviewRef = useRef((data) => {
      preview.current.value = data.content.template
      preview.current.component = (
        <iframe
          ref={iframe}
          src={`/__cms/${get(data, 'id')}/preview`}
          className="absolute inset-0 flex flex-1 w-full h-full overflow-auto"
        />
      )
      render()

      waitUntil(() => iframe.current && iframe.current.contentWindow).then(
        async () => {
          const id = get(data, 'id')
          if (id) {
            iframe.current.contentWindow.postMessage({
              _cmsdev: true,
              id,
              template: data.content.template,
            })
          }
        }
      )
    })

    const updatePreview = throttle(updatePreviewRef.current, 500)

    useEffect(() => {
      const a = setTimeout(() => {
        if (mounted.current) {
          setReady(true)
        }
      })

      if (!data.content) {
        data.content = defaultData.content
      }

      return () => {
        clearTimeout(a)
        mounted.current = false
      }
    }, [])

    useEffect(() => {
      waitUntil(() => data.id).then(() => {
        updatePreviewRef.current(data)
      })
    }, [data.id])

    const content = get(data, 'content', {})
    const onChange = (newval) => {
      if (content.type === 'API') {
        data.content.server_on_load = newval
      } else {
        data.content.template = newval

        waitUntil(() => data.id).then(() => {
          updatePreview(data)
        })
      }
    }

    let row = {}
    for (let s of Object.values(structures)) {
      if (s.value === content.structure) {
        row = s.definition
      }
    }

    return (
      <Split
        className={`flex flex-1`}
        size={size}
        setSize={setSize}
        mode={mode === 'split' ? 'vertical' : 'off'}
        dividerEl={
          <div
            css={css`
              display: flex;
              flex-direction: row;
              padding-right: 5px;

              .toggle-visual {
                border-radius: 3px;
                font-size: 10px;
                padding: 1px 4px;

                &.active {
                  background: #aaa;
                  color: white;
                }
              }
            `}
          >
            <div
              className="divider"
              css={css`
                margin-top: -4px;
                margin-bottom: -4px;
                padding-right: 5px;
                border-left: 1px solid #ccc;
              `}
            ></div>

            <div
              className={
                'toggle-visual ' + (meta.splitType === 'editor' ? 'active' : '')
              }
              onClick={action(() => {
                meta.splitType = 'editor'
              })}
            >
              Editor
            </div>
            <div
              className={
                'toggle-visual ' + (meta.splitType === 'visual' ? 'active' : '')
              }
              onClick={action(() => {
                meta.splitType = 'visual'
              })}
            >
              Visual
            </div>
          </div>
        }
      >
        {mode !== 'code' && data.id && (
          <div className="flex flex-1">
            <div className="relative flex flex-1">
              {/* <div className="absolute inset-0 flex flex-1 w-full overflow-auto"> */}
              {preview.current.component}
              {/* </div> */}
            </div>
          </div>
        )}
        {mode === 'code' && (
          <div
            className={` flex flex-col justify-start transition-all`}
            css={css`
              ${data.id
                ? css``
                : css`
                    flex: 1;
                    align-items: center;
                    width: 100%;
                  `}
            `}
          >
            {!ready && (
              <div
                css={css`
                  height: 200px;
                `}
              >
                <Loading />
              </div>
            )}
            <div
              className={`flex flex-col relative px-2`}
              css={css`
                transition: all ${ready ? '0.3s' : '0s'};
                width: 350px;
                opacity: ${!ready ? 0 : 1};
              `}
            >
              <Field
                name="title"
                title="Name"
                useRenderField={useWebRenderField}
                type="string"
                value={data.title}
                onChange={action((val) => {
                  data.title = val
                  setUnsaved(true)
                })}
              />
              {false && content.type !== 'API' && (
                <div
                  className="flex flex-row"
                  css={css`
                    > div {
                      flex: 1;
                    }
                  `}
                >
                  <div className="relative px-2">
                    <div
                      className="absolute top-0 right-0"
                      css={css`
                        border: 1px solid #ccc;
                        background: #fafafa;
                        border-radius: 3px;
                        font-size: 12px;
                        z-index: 10;
                        padding: 0px 10px;
                        margin: 6px 8px 0px 9px;
                        font-size: 11px;
                        cursor: pointer;
                      `}
                      onClick={() => {
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
                        navigate({
                          tab: 'structure',
                          args: {
                            backTo: {
                              tab: 'web',
                              args: {
                                editId: data.id,
                              },
                            },
                            editId: content.structure,
                          },
                        })
                      }}
                    >
                      View
                    </div>
                    <Select
                      label="Structure"
                      selectedKey={content.structure}
                      items={structures}
                      onChange={action((_ev, v) => {
                        data.content.structure = v.key
                        setUnsaved(true)
                      })}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-row">
                <Select
                  label="Type"
                  css={css`
                    flex: 1;
                  `}
                  selectedKey={content.type || 'Page'}
                  items={['Layout', 'API', 'Page']}
                  className={content.type === 'Page' ? 'mr-4' : ''}
                  onChange={action((_ev, v) => {
                    if (v.key === 'Layout' || v.key === 'API') {
                      data.parent_id = null
                    } else {
                      if (!data.parent_id && parents.length > 0) {
                        data.parent_id = parents[0].id
                      }
                    }
                    data.content.type = v.key
                    setUnsaved(true)
                  })}
                />

                {((content.type !== 'Layout' && content.type !== 'API') ||
                  !content.type) && (
                  <Select
                    label="Parent Layout"
                    selectedKey={(data.parent_id || 0).toString()}
                    items={parents
                      .filter((e) => e.id !== data.id)
                      .map((e) => ({
                        value: e.id.toString(),
                        label: e.title,
                      }))}
                    onChange={action((_ev, v) => {
                      data.parent_id = v.key
                      setUnsaved(true)
                    })}
                  />
                )}
              </div>
              <Field
                name="site"
                useRenderField={useWebRenderField}
                title="Domain (without http://)"
                type="string"
                value={data.site}
                onChange={action((val) => {
                  data.site = val
                  setUnsaved(true)
                })}
              />
              {(content.type !== 'Layout' || !content.type) && (
                <Fragment>
                  <Field
                    useRenderField={useWebRenderField}
                    name="slug"
                    title="Slug"
                    type="string"
                    value={data.slug}
                    onChange={action((val) => {
                      data.slug = val
                      setUnsaved(true)
                    })}
                  />
                  {content.type === 'Page' && (
                    <FieldCode
                      title="Server On Load"
                      value={content.server_on_load}
                      defaultValue={`
async ({template, params, render, db, req, reply, user, log, ext, isDev, api }: Server) => {
  await render(template, params)
}
                    `.trim()}
                      onChange={(val) => {
                        content.server_on_load = val
                        setUnsaved(true)
                      }}
                    />
                  )}
                </Fragment>
              )}
            </div>
          </div>
        )}
        {data.id && (
          <div className="flex flex-col flex-1">
            {mode === 'code' && (
              <Label
                css={css`
                  margin: 0px 0px -10px 7px;
                `}
              >
                {content.type === 'API' ? 'Server On Load' : 'Template'}
              </Label>
            )}
            <div
              className={
                'relative flex-1 ' +
                (mode === 'split' ? 'my-0' : 'border border-gray-500 m-2')
              }
            >
              <div className="absolute flex inset-0 overflow-hidden">
                <TemplateCode
                  figma={data.content.figma || {}}
                  value={
                    content.type === 'API'
                      ? get(data, 'content.server_on_load', ``)
                      : get(data, 'content.template', ``)
                  }
                  type={content.type}
                  name={data.title}
                  filePath={filePath}
                  onChange={action((v, figma) => {
                    data.content.figma = figma
                    setUnsaved(true)
                    onChange(v)
                  })}
                  setUnsaved={setUnsaved}
                  onMount={(getCursor, formatCode) => {
                    monaco.current = { getCursor, formatCode }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Split>
    )
  }
)

export const Split = ({
  children,
  className,
  mode,
  size,
  setSize,
  dividerEl,
}: Record<string, any> & {
  mode: 'vertical' | 'horizontal' | 'off'
  dividerEl: React.ReactElement
}) => {
  let flexMode = `flex-row`
  if (mode === 'vertical') flexMode = 'flex-col'
  const lastSize = useRef(size)
  const containerSize = useRef(0)
  const left = useRef(null as any)

  const [{ isDragging }, drop] = useDrop({
    accept: 'split',
    hover: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset() as {
        x: number
        y: number
      }

      const con = containerSize.current
      const d = delta[mode === 'vertical' ? 'y' : 'x']
      const cur = (lastSize.current / 100) * con
      setSize(((cur + d) / con) * 100)
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isOver(),
    }),
    drop: () => {
      lastSize.current = size
    },
  })

  const content = {
    left: children,
    right: null,
  }
  if (Array.isArray(children)) {
    const cs = children.filter((e) => isValidElement(e))
    content.left = cs[0]
    content.right = cs[1]
  }

  return (
    <div
      className={(className || '') + ` ${flexMode} items-stretch select-none`}
      ref={(r) => {
        if (r) {
          containerSize.current =
            r[mode === 'vertical' ? 'offsetHeight' : 'offsetWidth']
        }
        return drop(r)
      }}
      css={css`
        &:hover {
          .divider-btn {
            display: flex !important;
          }
        }
      `}
    >
      {mode === 'off' ? (
        <Fragment>
          {content.left}
          {content.right}
        </Fragment>
      ) : (
        <Fragment>
          {size > 0 && (
            <div
              className="flex"
              ref={left}
              css={
                mode === 'vertical'
                  ? css`
                      height: calc(${size}% - 11px);
                    `
                  : css`
                      width: calc(${size}% - 11px);
                    `
              }
            >
              {content.left}
            </div>
          )}
          <SplitDivider
            mode={mode}
            size={size}
            setSize={setSize}
            dividerEl={dividerEl}
          />
          {size < 100 && <div className="flex flex-1">{content.right}</div>}
        </Fragment>
      )}
    </div>
  )
}
const SplitDivider = ({ mode, size, setSize, dividerEl }) => {
  const [, drag] = useDrag({
    type: 'split',
    item: { type: 'split' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })
  return (
    <div
      className="bg-gray-100"
      ref={drag}
      css={css`
        ${mode === 'vertical'
          ? css`
              padding: 3px 0px;
              cursor: ns-resize;
              &:active {
                cursor: ns-resize;
              }
            `
          : css`
              padding: 0px 3px;
              cursor: ew-resize;
              &:active {
                cursor: ew-resize;
              }
            `}
      `}
    >
      <div
        className="absolute items-center justify-center divider-btn"
        css={css`
          display: none;
          border: 1px solid #ddd;
          z-index: 10;
          transition: opacity 0.1s;
          cursor: pointer;
          opacity: 0.4;
          &:hover {
            opacity: 1;
          }

          ${mode === 'vertical'
            ? css`
                height: 25px;
                margin-top: -24px;
                border-left: 0px;
              `
            : css`
                border-left: 1px solid #ccc;
              `}

          background:white;

          i {
            font-size: 13px;
            color: #666;
            padding: 0px 5px;
            &:hover {
              color: #333;
            }
          }
        `}
      >
        <Icon
          iconName="Download"
          onClick={() => {
            setSize(100)
          }}
        />
        <Icon iconName="GripperBarHorizontal" onClick={() => setSize(50)} />
        <Icon iconName="Upload" onClick={() => setSize(0)} />
        {/* dividerEl */}
      </div>
      <div
        css={
          mode === 'vertical'
            ? css`
                border-bottom: 1px solid #ccc;
              `
            : css`
                border-left: 1px solid #ccc;
              `
        }
      ></div>
    </div>
  )
}

const getHost = (site: string) => {
  if (site.indexOf('*') < 0) {
    return `${location.protocol}//${site}${
      location.port ? ':' + location.port : ''
    }`
  } else {
    return ''
  }
}
