/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  Button,
  List,
  ListItem,
  Progressbar,
  Searchbar,
  SwipeoutActions,
  SwipeoutButton,
} from 'framework7-react'
import { db, waitUntil } from 'libs'
import find from 'lodash.find'
import get from 'lodash.get'
import throttle from 'lodash.throttle'
import React, { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loading } from 'web.form/fields'
import type { BaseWindow } from 'web.init/src/window'
import { shortFormatDate } from 'web.utils/src/formatDate'
import { useRender } from 'web.utils/src/useRender'
import type { IQLTable } from '../../ext/types/list'
import type { IFieldType } from '../../ext/types/qform'

declare const window: BaseWindow

export const MobileQLInternal = ({
  meta,
  children,
  props,
  onLoad,
}: {
  meta: any
  children
  props: {
    table: IQLTable
  }
  onLoad?: (list: any[]) => void
}) => {
  return children({
    tableProps: props.table,
    Table: (props) => {
      const _ = useRef({
        timeout: null as any,
        rows: new WeakMap(),
        hideInfo: window.mobileListHideInfo,
        filter: {
          text: '',
          list: [],
        },
      })
      const internal = _.current
      const rows = internal.rows
      const render = useRender()
      const throttledFilter = throttle(
        (text: string) => {
          const ftext = text.toLowerCase()
          internal.filter.text = text
          internal.rows = new WeakMap()
          if (text) {
            const searchObject = (row: any, text: string) => {
              let found = false
              for (let [k, v] of Object.entries(row) as any) {
                if (
                  v &&
                  v.toString &&
                  v.toString().toLowerCase().indexOf(ftext) >= 0
                ) {
                  found = true
                  break
                }
                if (typeof v === 'object' && !!v) {
                  if (searchObject(v, text)) {
                    found = true
                    break
                  }
                }
              }

              return found
            }
            internal.filter.list = meta.list.filter((row) => {
              return searchObject(row, text)
            })
          } else {
            internal.filter.list = []
          }
          render()
        },
        1000,
        { trailing: true }
      )
      const columns = props.columns
      if (meta.list.length === 0) {
        if (meta.loading) {
          return (
            <div className="flex flex-col items-center justify-center flex-1 p-10 space-y-5">
              <Loading />
            </div>
          )
        }
        return (
          <div className="flex flex-col items-center justify-center flex-1 p-10 space-y-5">
            <img src="/__ext/icons/empty.svg" />
            <div className="font-medium text-center uppercase text-md">
              Belum Ada {props.title}
            </div>
            {props.create !== false && (
              <Button
                fill
                large
                raised
                className="self-stretch capitalize"
                onClick={() => {
                  props.onRowClick({}, -1)
                }}
              >
                {typeof props.create === 'string'
                  ? props.create
                  : 'Tambah Baru'}
              </Button>
            )}
          </div>
        )
      }

      const list = !!internal.filter.text ? internal.filter.list : meta.list
      return (
        <>
          {meta.loading && <Progressbar infinite />}
          <Searchbar
            searchContainer=".search-list"
            searchIn=".item-link"
            placeholder="Cari"
            disableButton={false}
            clearButton={true}
            css={css`
              .searchbar-input-wrap input {
                border-radius: 5px !important;
              }
            `}
            onChange={(e) => {
              const text = e.target.value
              throttledFilter(text)
            }}
          >
            {props.create !== false && (
              <Button
                raised
                large
                onClick={() => props.onRowClick({}, -1)}
                className="flex flex-row items-center"
                css={css`
                  margin: 10px 0px 10px 5px;
                  width: 120px;
                  border-radius: 5px;
                  height: 30px;
                  line-height: 30px;
                `}
              >
                <span
                  css={css`
                    font-size: 22px;
                    line-height: 0px;
                    margin-top: -4px;
                  `}
                >
                  +
                </span>
                <span
                  css={css`
                    font-size: 14px;
                    text-transform: initial;
                  `}
                >
                  {typeof props.create === 'string' ? props.create : 'Tambah'}
                </span>
              </Button>
            )}
          </Searchbar>
          <div className="relative flex-1">
            <List
              mediaList={columns.length > 1}
              virtualList
              className="absolute inset-0 flex flex-col overflow-y-auto"
            >
              {window.mobileListHideInfo === undefined &&
                props.swipeout !== false && (
                  <div
                    className={
                      'flex justify-end text-xs opacity-50 p-2 pr-6 transition-all ' +
                      (internal.hideInfo === true ? ' h-0 py-0' : '')
                    }
                    onClick={() => {
                      internal.hideInfo = true
                      setTimeout(() => {
                        window.mobileListHideInfo = true
                      }, 1000)
                      render()
                    }}
                  >
                    <div className="text-right">
                      Geser baris data dari kanan ke kiri <br />
                      untuk opsi tambahan
                    </div>
                    <img
                      src="/__ext/icons/swirly-arrow.svg"
                      width="30"
                      className="ml-3"
                    />
                  </div>
                )}

              {list.map((e, idx) => {
                const EditButton = () => {
                  return (
                    <SwipeoutButton
                      color="blue"
                      onClick={() => {
                        props.onRowClick(e, idx, { mode: 'edit' })
                      }}
                    >
                      Edit
                    </SwipeoutButton>
                  )
                }
                const DeleteButton = () => {
                  return (
                    <SwipeoutButton
                      overswipe
                      confirmTitle="Konfirmasi"
                      confirmText="Apakah Anda yakin akan dihapus?"
                      delete
                    >
                      Hapus
                    </SwipeoutButton>
                  )
                }
                const content =
                  typeof columns === 'function'
                    ? columns({
                        row: e,
                        key: idx,
                        edit: () => props.onRowClick(e, idx),
                      })
                    : {
                        title: columnized(columns[0], e, meta.def),
                        subtitle: columnized(columns[1], e, meta.def) + '',
                        text: columnized(columns[2], e, meta.def),
                        after: columnized(columns[3], e, meta.def),
                      }
                const swipeout =
                  props.swipeout !== false ? (
                    <SwipeoutActions right>
                      {props.swipeout ? (
                        props.swipeout(e, {
                          Swipe: SwipeoutButton,
                          Edit: EditButton,
                          Delete: DeleteButton,
                        })
                      ) : (
                        <DeleteButton />
                      )}
                    </SwipeoutActions>
                  ) : null
                return (
                  <ListItem
                    link="#"
                    noChevron={true}
                    key={idx}
                    swipeout={!!swipeout}
                    onClick={(ev) => {
                      props.onRowClick(e, idx, ev)
                    }}
                    {...(Array.isArray(columns) ? content : {})}
                    onSwipeoutDelete={async () => {
                      const pk = find(meta.def.columns, { pk: true })
                      if (pk && pk.name && e[pk.name]) {
                        await db[meta.def.db.name].delete({
                          where: {
                            [pk.name]: e[pk.name],
                          },
                        })

                        if (onLoad) {
                          for (let [idx, row] of Object.entries(
                            meta.list
                          ) as any) {
                            if (row[pk.name] === e[pk.name]) {
                              meta.list.splice(idx, 1)
                              break
                            }
                          }

                          onLoad(meta.list)
                          if (meta.list.length === 0) {
                            render()
                          }
                        }
                      }
                    }}
                    ref={(ref) => {
                      if (ref && ref.el && typeof columns === 'function') {
                        if (!rows.has(e)) {
                          waitUntil(() =>
                            ref.el.querySelector('.item-inner')
                          ).then(() => {
                            rows.set(
                              e,
                              createPortal(
                                content,
                                ref.el.querySelector('.item-inner')
                              )
                            )
                            render()
                          })
                        }
                      }
                    }}
                  >
                    {typeof columns === 'function' && rows.get(e)}
                    {swipeout}
                  </ListItem>
                )
              })}
              {/*
              <ListItem
                noChevron={true}
                css={css`
                  list-style-type: none;
                  height: 200px;
                `}
                className="flex justify-end text-xs opacity-50"
              >
                <div className="flex justify-end text-xs opacity-50">
                  <div className="text-right">
                    Geser baris dari kanan ke kiri <br />
                    untuk opsi tambahan
                  </div>
                  <img
                    src="/__ext/icons/swirly-arrow.svg"
                    width="30"
                    className="ml-4"
                  />
                </div>
              </ListItem> */}
            </List>
          </div>
        </>
      )
    },
    Filter: () => {
      return <></>
    },
  })
}

const columnized = (
  e?:
    | string
    | [string, { value?: (row: any) => React.ReactElement; type?: IFieldType }],
  row?: any,
  def?: any
) => {
  if (!e) return undefined

  if (typeof e === 'string') {
    return formatString(get(row, e), def, e)
  } else if (e[1]) {
    const p = e[1]

    if (p.value) {
      return p.value(row)
    } else {
      return formatString(get(row, 'e.0'), def, e[0])
    }
  }
}

const formatString = (val: any, rdef: any, key: string) => {
  let def = rdef.columns[key]
  if (key.indexOf('.') >= 0) {
    const arr = key.split('.')
    def = get(rdef, `rels.${arr[0]}.def.columns.${arr[1]}`)
  }

  if (def && def.type) {
    switch (def.type.toLowerCase()) {
      case 'date':
        return shortFormatDate(val)
      default:
        return val
    }
  }
  return val
}
