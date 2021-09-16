/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { PrimaryButton } from '@fluentui/react'
import { Sheet } from 'framework7-react'
import { waitUntil } from 'libs'
import get from 'lodash.get'
import kebabCase from 'lodash.kebabcase'
import { action, runInAction } from 'mobx'
import { observer, Observer, useLocalObservable } from 'mobx-react-lite'
import {
  Fragment,
  isValidElement,
  ReactElement,
  useEffect,
  useRef,
} from 'react'
import { DndProvider } from 'react-dnd'
import { TouchBackend } from 'react-dnd-touch-backend'
import type { BaseWindow } from 'web.init/src/window'
import { QueryList, tableDefinitions } from 'web.list/src/QueryList'
import { makeEmpty } from 'web.utils/src/makeEmpty'
import { niceCase } from 'web.utils/src/niceCase'
import { useRender } from 'web.utils/src/useRender'
import type { IAdminCMS, IAdminCMSList } from '../../ext/types/admin'
import { QueryForm } from './QueryForm'

declare const window: BaseWindow
;(window as any).slugify = kebabCase

export default ({
  nav,
  content: inputContent,
  active,
  setActive,
  platform,
}: IAdminCMS) => {
  const meta = useLocalObservable(() => ({
    active: active || nav ? (nav || [])[0] : Object.keys(inputContent || {})[0],
    mode: 'list' as 'form' | 'list',
    form: null as any,
    init: false,
    unsaved: false,
  }))
  const shouldQuery = useRef(true)
  const listMeta = useRef(null as any)
  const visibleFilters = useRef({})

  useEffect(() => {
    if (!(window as any).iconInit) {
      ;(window as any).iconInit = true
      import('@fluentui/react/lib/Icons').then((e) => {
        e.initializeIcons()
        runInAction(() => {
          meta.init = true
        })
      })
    } else {
      runInAction(() => {
        meta.init = true
      })
    }
  }, [])

  return (
    <Observer>
      {() => {
        if (!meta.init) {
          return null
        }

        const content = {}

        if (inputContent) {
          for (let i in inputContent) {
            content[i] = inputContent[i]
          }
        }

        if (nav) {
          for (let n of nav) {
            if (!content[n]) {
              content[n] = {
                table: n,
                label: niceCase(n),
              }
            }
          }
        }

        const config = content[meta.active]
        let CustomComponent: any = null
        let title = meta.active
        if (typeof config === 'function') {
          CustomComponent = config
        } else {
          title = `${config.label || meta.active}`
        }
        let currentPlatform = platform
        if (!currentPlatform) {
          currentPlatform = 'web'
          if (location.pathname.indexOf('/m/') === 0) {
            currentPlatform = 'mobile'
          }
        }

        if (currentPlatform === 'mobile') {
          return (
            <CRUDComponent
              title={title}
              meta={meta}
              config={config}
              platform={currentPlatform}
              listMeta={listMeta}
              shouldQuery={shouldQuery}
              visibleFilters={visibleFilters}
            />
          )
        }

        return (
          <div
            className={
              `platform-${window.platform} ` +
              'admin-container w-full h-full flex flex-row items-stretch flex-1 mx-auto'
            }
            css={css`
              @media only screen and (max-width: 1024px) {
                flex-direction: column;

                .filter-container {
                  margin-top: 7px;
                }
                .create-button {
                  margin-top: 9px;
                  margin-right: 7px;
                }

                .nav-container {
                  border: 0px;
                  position: relative;
                  height: 40px;
                  width: 100%;
                  .nav-box {
                    display: flex;
                    justify-content: flex-start;
                    flex-direction: row;
                    padding-bottom: 0px;
                    padding: 0px;
                    overflow-x: auto;
                    overflow-y: hidden;
                    ::-webkit-scrollbar {
                      display: none;
                    }
                  }

                  .nav {
                    margin: 0px 0px -1px 0px;
                    border: 1px solid transparent;

                    border-bottom: 1px solid #6287ee;
                    border-left: 0px;
                    border-right: 0px;
                    color: #999;

                    &:first-of-type {
                      margin-left: 10px;
                    }
                    &.active {
                      color: rgb(37, 99, 235);
                      background: transparent;
                      border: 1px solid #6287ee;
                      border-top-right-radius: 3px;
                      border-top-left-radius: 3px;
                      border-bottom: 1px solid white;
                    }
                  }
                }
              }
            `}
          >
            {nav && nav.length > 1 && (
              <div className="flex flex-col items-stretch w-1/6 px-3 border-r border-blue-200 nav-container">
                <div className="flex flex-col justify-end py-2 select-none nav-box">
                  <Nav
                    nav={nav}
                    content={content}
                    active={meta.active}
                    setActive={action((e: string) => {
                      if (setActive) {
                        setActive(e)
                      }

                      meta.active = e
                      meta.mode = 'list'
                      visibleFilters.current = {}
                    })}
                  />
                  <div className="h-10"></div>
                </div>
              </div>
            )}
            <div className="relative flex flex-col flex-1">
              {CustomComponent ? (
                <CustomComponent meta={meta} />
              ) : (
                <CRUDComponent
                  title={title}
                  meta={meta}
                  config={config}
                  platform={currentPlatform}
                  listMeta={listMeta}
                  shouldQuery={shouldQuery}
                  visibleFilters={visibleFilters}
                />
              )}
            </div>
          </div>
        )
      }}
    </Observer>
  )
}

const CRUDComponent = observer(
  (props: {
    title
    meta
    config
    listMeta
    shouldQuery
    visibleFilters
    platform
  }) => {
    const {
      title,
      meta,
      config,
      listMeta,
      shouldQuery,
      visibleFilters,
      platform,
    } = props
    const render = useRender()
    const listRef = useRef(null as any)

    const create = get(config, 'form.create', {
      title: 'Create',
      visible: true,
    })

    if (create.visible === undefined) {
      create.visible = true
    }

    /** for debugging form: click first item */
    // useEffect(() => {
    //   ;(async () => {
    //     await waitUntil(() => listRef.current)
    //     runInAction(() => {
    //       meta.mode = 'form'
    //       meta.form = listRef.current[0]
    //     })
    //   })()
    // }, [])

    const listWrapper = get(config, 'list.wrapper')

    const ContentForm =
      meta.mode !== 'form' ? null : (
        <QueryForm
          table={config.table}
          title={title}
          data={meta.form}
          platform={platform}
          include={
            get(config.form, 'include') || get(config.list, 'params.include')
          }
          action={config.form?.action}
          alter={config.form?.alter}
          layout={config.form?.layout}
          onLoad={async (data, opt, doneSaving?: boolean) => {
            const { pk, def, mutation } = opt
            if (listRef.current && Array.isArray(listRef.current)) {
              for (let [k, row] of Object.entries(listRef.current)) {
                if (row[pk] === data[pk]) {
                  listRef.current[k] = data
                }
              }
            }
            if (doneSaving) {
              if (mutation === 'update') {
                setTimeout(() => {
                  if (listMeta.current) {
                    listMeta.current.query()
                  }
                })
                runInAction(() => {
                  meta.mode = 'list'
                })
              } else {
              }
            }
            if (config.form?.onLoad) {
              config.form.onLoad(data, opt, doneSaving)
            }
          }}
          onSave={config.form?.onSave}
          onBack={action((data) => {
            if (data.__deleted) {
              listMeta.current.modifyIndex(listMeta.current.editIdx, undefined)
              meta.mode = 'list'
              return
            }
            if (meta.unsaved) {
              if (
                confirm(`Your data unsaved data will be lost, are you sure ?`)
              ) {
                shouldQuery.current = false
                meta.mode = 'list'
              }
            } else {
              meta.mode = 'list'
              setTimeout(() => {
                if (listMeta.current) {
                  listMeta.current.query()
                }
              })
            }
          })}
          setUnsaved={action((val) => {
            meta.unsaved = val
          })}
        />
      )
    const ContentList = (
      <List
        table={config.table}
        ql={config.list}
        listMeta={listMeta}
        platform={platform}
        listRef={listRef}
        title={title}
        actions={
          <div
            className="create-button p-1"
            css={css`
              i {
                font-size: 12px;
                font-weight: bold;
                margin: 1px 5px -1px 7px;
              }
              .ms-Button {
                padding: 2px 5px;
              }
              .ms-Button-label,
              .ms-Button-textContainer {
                font-size: 13px;
                margin: 0px;
                padding: 0px 4px 0px 2px;
              }
            `}
          >
            {create.visible && (
              <PrimaryButton
                onClick={action((ev) => {
                  const newdata =
                    listRef.current && listRef.current.length > 0
                      ? makeEmpty(listRef.current[0])
                      : {}
                  const columns =
                    tableDefinitions[`main.${config.table}`].columns
                  for (let [name, v] of Object.entries(columns) as any) {
                    let value: any = null
                    switch (v.type) {
                      case 'string':
                        value = ''
                        break
                      case 'number':
                        value = 0
                        break
                      case 'Date':
                        value = new Date()
                        break
                    }
                    if (name && !v.pk && !newdata[name]) {
                      newdata[name] = value
                    }
                    if (v.pk) {
                      delete newdata[name]
                    }
                  }
                  runInAction(() => {
                    meta.form = newdata
                    meta.mode = 'form'
                  })
                  if (typeof create.onClick === 'function') {
                    create.onClick(meta.form, ev)
                  }
                })}
                key="add"
                iconProps={{ iconName: 'Add' }}
              >
                {create.title || 'Create'}
              </PrimaryButton>
            )}
          </div>
        }
        visibles={visibleFilters}
        shouldQuery={shouldQuery.current}
        onListLoaded={(list) => {
          if (listWrapper) {
            render()
          }
          const onLoad = get(config, 'list.table.onLoad')
          if (onLoad) {
            onLoad(list)
          }
        }}
        onRowClick={async (row, idx, ev) => {
          const onRowClick = get(config, 'list.table.onRowClick')
          if (onRowClick) {
            if (!(await onRowClick(row, idx, ev))) {
              return false
            }
          }

          const onEdit = get(config, 'form.edit.onClick')
          if (onEdit) {
            await onEdit(row)
          }
          runInAction(() => {
            listMeta.current.editIdx = idx
            meta.unsaved = false
            shouldQuery.current = false
            meta.form = row
            meta.mode = 'form'
          })
          return true
        }}
      />
    )

    if (!(window as any).mobileSheetIds) {
      ;(window as any).mobileSheetIds = 1000
    }

    const sid = useRef((window as any).mobileSheetIds++)

    if (platform === 'mobile') {
      return (
        <>
          <div className="admin-cms-list flex flex-1 flex-col self-stretch">
            {typeof listWrapper === 'function'
              ? listWrapper({ children: ContentList, list: listRef.current })
              : ContentList}
          </div>
          <Sheet
            style={{
              height: '95vh',
              borderTopLeftRadius: '15px',
              borderTopRightRadius: '15px',
              zIndex: get(props, 'mobile.zIndex'),
            }}
            css={css`
              &:before {
                display: none !important;
              }
            `}
            backdrop={true}
            opened={meta.mode === 'form'}
            onSheetClosed={action(() => (meta.mode = 'list'))}
            className="admin-cms-form"
            swipeToClose={true}
            swipeHandler={`.w-${sid.current} .form-title`}
          >
            <div
              className={`flex flex-1 absolute inset-0 w-${sid.current}`}
              css={css`
                .form-title {
                  background: #efeff4;
                  border-bottom: 1px solid #c7c7c7;
                  color: black;
                  margin: 0px 0px 0px 0px;
                  padding: 15px 16px 0px 16px;
                  height: 50px;
                  line-height: 50px;
                  user-select: none;
                  min-height: 60px;
                  border-top-left-radius: 15px;
                  border-top-right-radius: 15px;
                  &::before {
                    display: block;
                    position: absolute;
                    top: 11px;
                    left: 50%;
                    content: '«';
                    color: transparent;
                    pointer-events: none;
                    border-radius: 99px;
                    width: 44px;
                    height: 7px;
                    background: #cdcdcd;
                    margin-left: -22px;
                  }
                }
              `}
            >
              {ContentForm}
            </div>
          </Sheet>
        </>
      )
    }

    return (
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <div
          className={meta.mode + ' admin-cms flex flex-1 absolute inset-0'}
          css={css`
            .admin-list,
            .admin-form {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            }

            &.form {
              > .admin-list {
                visibility: hidden;
              }
            }

            &.list {
              > .admin-form {
                visibility: hidden;
              }
            }
          `}
        >
          <div className="admin-list flex flex-col">{ContentList}</div>
          {meta.form && (
            <div className="admin-form flex flex-col items-stretch">
              {ContentForm}
            </div>
          )}
        </div>
      </DndProvider>
    )
  }
)

interface IAdminCMSFormComponent {
  table: any
  form: any
  title: string
  setUnsaved: any
  onChange: (val: any, opt?: any) => void
  config?: any
  onBack: (data: any) => void
}

interface IAdminCMSListComponent {
  table: any
  include?: any
  ql?: IAdminCMSList
  shouldQuery: boolean
  listRef: {
    current: any[]
  }
  actions?: ReactElement
  onListLoaded?: (list: any[]) => void
  title?: string
  listMeta: any
  platform?: 'web' | 'mobile'
  visibles: { current: any }
  onRowClick: (row: any, idx: number, ev) => Promise<boolean>
}
const List = ({
  table,
  ql,
  onRowClick,
  listMeta,
  include,
  visibles,
  actions,
  listRef,
  onListLoaded,
  platform,
  title,
  shouldQuery,
}: IAdminCMSListComponent) => {
  return (
    <QueryList
      db={'main'}
      table={table}
      metaRef={(m) => {
        listMeta.current = m.current
      }}
      actions={actions}
      platform={platform}
      onLoad={(list) => {
        listRef.current = list
        if (onListLoaded) onListLoaded(list)
      }}
      className="pl-1"
      shouldQuery={shouldQuery}
      params={ql?.params || { take: 25 }}
      {...ql?.props}
    >
      {({ Table, tableProps, Filter, filterProps }) => {
        if (!tableProps) return null

        const firstFilters: any = []
        const lastFilters: any = []

        if (ql?.filter && ql?.filter.columns) {
          for (let e of ql?.filter.columns) {
            if (Object.keys(visibles.current).length < 3) {
              const col = (typeof e === 'string' ? e : e[0]).toLowerCase()
              visibles.current[col] = true
            }
          }
        }

        let columns: any = []
        if (typeof ql?.table?.columns === 'function') {
          columns = ql?.table?.columns
        } else {
          let defaultCols = tableProps.columns || []
          if (platform === 'mobile' && Array.isArray(defaultCols)) {
            defaultCols = defaultCols.slice(0, 4)
          }

          columns = (get(ql, 'table.columns') || defaultCols)?.filter((e) => {
            const col = (typeof e === 'string' ? e : e[0]).toLowerCase()
            const props = typeof e === 'string' ? {} : e[1]

            if (
              !ql?.table?.columns &&
              (col === 'id' ||
                col.indexOf('_id') >= 0 ||
                col.indexOf('id_') >= 0)
            ) {
              lastFilters.push([col, { ...props }])
              return false
            }

            if (Object.keys(visibles.current).length < 3) {
              visibles.current[col] = true
            }
            firstFilters.push([col, { ...props }])
            return true
          })
        }

        return (
          <Fragment>
            <Filter
              {...filterProps}
              columns={[...firstFilters, ...lastFilters]}
              visibles={visibles.current}
              setVisibles={(val) => {
                visibles.current = val
              }}
              {...ql?.filter}
            />
            <Table
              title={title}
              {...tableProps}
              columns={columns}
              {...ql?.table}
              onRowClick={onRowClick}
            />
          </Fragment>
        )
      }}
    </QueryList>
  )
}

const Nav = ({ nav, content, active, setActive }) => {
  return nav.map((e: string, idx: string | number | null | undefined) => {
    if (isValidElement(e)) {
      return { ...(e as any), key: idx }
    }

    const c = content[e]
    return (
      <div
        key={idx}
        className={
          'nav flex justify-end py-2 px-3 -mr-3 text-sm select-none font-semibold cursor-pointer  hover:text-blue-600 ' +
          `${active === e ? ' active bg-blue-200 text-blue-600' : ''}`
        }
        onClick={() => setActive(e)}
      >
        {c.label || niceCase(e)}
      </div>
    )
  })
}
