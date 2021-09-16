/** @jsx jsx */
import { jsx } from '@emotion/react'
import { waitUntil } from 'libs'
import get from 'lodash.get'
import { runInAction, toJS } from 'mobx'
import { Observer } from 'mobx-react-lite'
import { Fragment, ReactElement, useEffect, useRef } from 'react'
import type { BaseWindow } from 'web.init/src/window'
import { useRender } from 'web.utils/src/useRender'
import type {
  IFilterDef,
  IQLFilter,
  IQLTable,
  IQueryList,
  IQueryListChildren,
  IQueryListWhere,
  IRelation,
  ITableDef,
  ITableDefinitions,
} from '../../ext/types/list'
import { loadExt } from '../../utils/src/loadExt'
import { MobileQLInternal } from './MobileQLInternal'
import { QLInternal } from './QLInternal'
import { prepareChildren } from './utils/prepareChildren'
export const tableDefinitions = {}

declare const window: BaseWindow

const { db, dbAll } = window

type ITableMethods = { [x: string]: (arg0: any) => any } & {
  definition: () => Promise<ITableDefinitions>
}

export const blankDef: IFilterDef = {
  db: {} as {
    name: string
    type: 'postgresql'
  },
  columns: {} as ITableDef,
  rels: {} as IRelation,
}

export const FinalQueryList = (props: {
  dbc: ITableMethods
  def: typeof blankDef
  params?: any
  include?: any
  platform?: 'mobile' | 'web'
  title?: string
  query?: string | (() => Promise<any>)
  className?: string
  actions?: ReactElement
  shouldQuery?: boolean
  onLoad?: (list: any[]) => void
  metaRef?: (meta: any, render: () => void) => void
  children?: IQueryListChildren | never[] | null
}) => {
  const { dbc, def, params, onLoad, metaRef, shouldQuery, children } = props
  const _meta = useRef({
    list: [] as any[],
    params: params as any,
    scroll: {
      left: 0,
      top: 0,
    },
    init: false,
    loading: false,
    where: {
      columns: [],
      values: {},
      setValues: (vals: Record<string, any>) => {},
      visibles: {},
      setVisibles: (vals: Record<string, boolean>) => {},
    } as IQueryListWhere,
    page: {
      totalItems: -1,
      totalPage: 1,
      itemPerPage: 0,
      clickHold: false,
      clickIval: 0 as any,
      num: 1,
    },
    get columns() {
      const columns: string[] = []
      for (let k of Object.keys(meta.def.columns)) {
        columns.push(k)
      }
      return columns
    },
    def,
    listLoading: true,
    sort: (column: string) => {},
    query: (loading?: boolean) => {},
    modifyIndex: (idx: number, data: any) => {},
    internalProps: null as null | {
      table: IQLTable
      filter: IQLFilter
    },
  })
  const meta = _meta.current
  const lastRender = useRef(null as any)
  const __render = useRender()
  const render = () => {
    isDirty.current = true
    __render()
  }
  const isDirty = useRef(false)

  meta.sort = defineSort(meta)
  meta.query = defineQuery(render, dbc || props.query, meta, onLoad)
  useEffect(() => {
    meta.def = def
    meta.where.columns = []
    meta.params = params

    meta.internalProps = {
      table: {
        onRowClick: async () => true,
        columns:
          meta.columns.length === 0 ? (props.children as any) : meta.columns,
      },
      filter: {
        def: def,
        columns: meta.columns.slice(0, 4),
        values: meta.where.values,
        setValues: (values) => {
          meta.where.values = values
        },
        setVisibles: (vals: Record<string, any>) => {
          meta.where.visibles = vals
        },
        visibles: meta.where.visibles,
        submit: () => {
          meta.listLoading = true
          meta.query()
        },
      },
    }
    meta.listLoading = true

    if (shouldQuery !== false) {
      meta.query()
    }
  }, [def, params, shouldQuery])
  if (metaRef) {
    metaRef(_meta, render)
  }

  const finalChildren = children ? prepareChildren(children) : children

  let currentPlatform = props.platform
  if (!currentPlatform) {
    currentPlatform = 'web'
    if (location.pathname.indexOf('/m/') === 0) {
      currentPlatform = 'mobile'
    }
  }

  return (
    <Observer>
      {() => {
        if (!meta.sort || !meta.query || !meta.params || !meta.internalProps)
          return lastRender.current

        meta.modifyIndex = (idx: number, data: any) => {
          if (!data) {
            meta.list.splice(idx, 1)
          } else {
            meta.list[idx] = data
          }
          render()
        }

        if (isDirty.current) {
          lastRender.current =
            currentPlatform === 'web' ? (
              <Fragment>
                <QLInternal
                  children={finalChildren}
                  meta={meta}
                  actions={props.actions}
                  list={meta.list}
                  onLoad={props.onLoad}
                  props={meta.internalProps}
                />
              </Fragment>
            ) : (
              <MobileQLInternal
                meta={meta}
                onLoad={props.onLoad}
                props={meta.internalProps}
                children={finalChildren}
              />
            )
          isDirty.current = false
        }

        return lastRender.current
      }}
    </Observer>
  )
}

const defineSort = (meta: any) => {
  return (column: string) => {
    if (column.indexOf('.') > 0) {
      const col = column.split('.')

      const ordLen =
        col.length === 3
          ? `0.${col[0]}.${col[1]}.${col[2]}`
          : `0.${col[0]}.${col[1]}`

      const ordering = get(meta.params.order, ordLen)
      if (ordering === 'desc') {
        meta.params.order = []
        return
      }

      meta.params.order = [
        {
          [col[0]]: {
            [col[1]]: ordering === 'asc' ? 'desc' : 'asc',
          },
        },
      ]
      return
    }

    if (
      !meta.params.order ||
      !Array.isArray(meta.params.order) ||
      !get(meta.params, 'order.0.column')
    ) {
      meta.params.order = []
    }
    const cols: string[] = meta.columns.filter((e: string) => e === column)
    if (cols.length > 0) {
      for (let col of cols) {
        const orders = meta.params.order

        if (orders.length === 0) {
          orders.push({
            column: col,
            order: 'asc',
          })
          break
        } else {
          const order = orders[0]
          if (order.column !== col) {
            order.column = col
            order.order = 'asc'
          } else {
            order.column = col
            if (order.order === 'asc') {
              order.order = 'desc'
            } else {
              meta.params.order = []
            }
          }
          break
        }
      }
    }
  }
}
const defineQuery = (
  render: () => void,
  dbc: ITableMethods | string | (() => Promise<void>),
  meta: any,
  onLoad?: (list: any[]) => void
) => {
  return async (setLoading = true) => {
    if (typeof dbc === 'string') {
      if (setLoading) {
        runInAction(() => {
          meta.loading = true
        })
      }

      const res = await db.query(dbc)
      runInAction(() => {
        if (setLoading) {
          meta.loading = false
        }
        if (onLoad) {
          onLoad(res)
        }
        meta.list = res
      })
      render()
    } else if (typeof dbc === 'object') {
      const qp = toJS(meta.params) || {}

      if (setLoading) {
        runInAction(() => {
          meta.loading = true
        })
      }
      if (meta.page.itemPerPage > 0) {
        qp.take = meta.page.itemPerPage
        qp.skip = meta.page.itemPerPage * (meta.page.num - 1)
      }

      let finalQP = JSON.parse(JSON.stringify(qp))

      if (finalQP.order) {
        for (const v of Object.values(finalQP.order) as any) {
          if (v.column && v.order) {
            finalQP.orderBy = { [v.column]: v.order }
          } else {
            finalQP.orderBy = v
          }
        }
      }
      delete finalQP.order

      const formatFilter = (values: Record<string, any>): any => {
        const result: any = {}
        for (let [k, e] of Object.entries(values || {})) {
          const col = meta.def.columns[k]
          const db = meta.def.db.type
          if (col && col.type) {
            switch (col.type) {
              case 'number':
                if (typeof e === 'number') {
                  result[k] = e
                } else if (typeof e === 'object' && e.key) {
                  //this is a relation
                  result[k] = e.key
                } else {
                  const num = ((e || '').match(/[\d\.]+|\D+/g) || []).map(
                    (e: string) => e.trim()
                  )
                  if (num.length > 1) {
                    result[k] = num
                  } else {
                    result[k] = e
                  }
                }
                break
              case 'string':
                if (!!e) {
                  let criteria = `%${e}%`
                  if (e.indexOf('%') >= 0) {
                    criteria = e
                  }
                  if (db === 'postgresql' || !db) {
                    result[k] = { contains: criteria, mode: 'insensitive' }
                  }
                }
                break
            }
          }
        }
        return result
      }

      finalQP.where = {
        ...finalQP.where,
        ...formatFilter(meta.where.values),
      }

      render()

      const res = await dbc.findMany(finalQP)
      runInAction(() => {
        if (setLoading) {
          meta.loading = false
        }
        if (onLoad) {
          onLoad(res)
        }
        meta.list = res
      })
      render()
    }
  }
}

export const QueryList = (props: IQueryList) => {
  let { db: dbName, table, metaRef } = props

  const render = useRender()
  const lastRender = useRef(null as any)
  const _ = useRef({
    dbc: null,
    def: blankDef,
    loading: false,
    query: {
      enabled: !!props.query,
      parsed: {
        table: '',
        params: {} as any,
        columns: [] as string[],
      },
    },
  })
  const state = _.current

  if (props.deps || props.query) {
    useEffect(() => {
      if (typeof props.query === 'function') {
        if (!window.babel.traverse || !window.babel.parse) {
          loadExt(`dev/buffer.js`).then((buffer) => {
            ;(window as any).Buffer = buffer.buffer.Buffer

            if (!window.babel.traverse) {
              ;(import('@babel/traverse') as any).then((e) => {
                window.babel.traverse = e.default.default
              })
            }
            if (!window.babel.parse) {
              import('@babel/parser').then((e) => {
                window.babel.parse = e.default.parse
              })
            }
          })
        }

        waitUntil(() => !!window.babel.traverse && !!window.babel.parse).then(
          async () => {
            const parse = window.babel.parse
            const traverse = window.babel.traverse

            console.log(parse, traverse)
          }
        )
      } else {
      }
    }, props.deps || [])
  }

  const isCustomQuery = ['function', 'string'].indexOf(typeof props.query) >= 0
  if (!isCustomQuery) {
    if (state.query.enabled && !state.query.parsed.table) {
      return null
    }

    if (dbName && typeof props.query !== 'string') {
      state.dbc = dbAll[dbName][table]
      if (state.dbc) {
        if (tableDefinitions[`${dbName}.${table}`]) {
          state.def = tableDefinitions[`${dbName}.${table}`]
        } else {
          state.def = blankDef
          state.loading = true
          const dbc: any = state.dbc
          if (dbc) {
            dbc.definition().then(async (e: any) => {
              state.loading = false
              if (!e || (!!e && e.statusCode)) {
                e = blankDef
              }

              for (let [k, rel] of Object.entries(e.rels) as any) {
                if (
                  !tableDefinitions[`${dbName}.${rel.modelClass}`] &&
                  dbName
                ) {
                  tableDefinitions[`${dbName}.${table}`] = await dbAll[dbName][
                    rel.modelClass
                  ].definition()
                }
                rel.def = tableDefinitions[`${dbName}.${table}`]
              }

              tableDefinitions[`${dbName}.${table}`] = e

              _.current = {
                ..._.current,
                def: tableDefinitions[`${dbName}.${table}`],
              }
              render()
            })
          }
        }
      }
    }

    if (!state.dbc || !state.def.db.name) {
      if (!state.loading) {
        console.warn(
          `Warning - QueryList: Database table definition is not found: ${table} - on database ${dbName} `
        )
      }
      return null
    }
  }
  lastRender.current = (
    <FinalQueryList
      {...props}
      dbc={state.dbc as any}
      def={state.def}
      metaRef={metaRef}
    />
  )
  return lastRender.current
}
