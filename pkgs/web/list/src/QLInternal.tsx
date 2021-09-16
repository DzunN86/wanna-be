/** @jsx jsx */
import { jsx } from '@emotion/react'
import { QLFilter } from './QLFilter'
import { QLPaging } from './QLPaging'
import { QLTable } from './QLTable'
import { IQLFilter, IQLTable } from '../../ext/types/list'
import { Fragment, ReactElement } from 'react'

export const QLInternal = (_props: {
  children: any
  meta: any
  list: any
  actions?: ReactElement
  onLoad?: (list: any[]) => void
  props: {
    table: IQLTable
    filter: IQLFilter
  }
}) => {
  const { props, children, meta, actions } = _props
  return children({
    Table: (tprops: IQLTable) => {
      if (typeof tprops.columns === 'function') {
        const col = tprops.columns

        // ini custom row, bikin virtualized.
        return (
          <div className="flex flex-1 self-stretch flex-col overflow-auto relative">
            <div className="absolute inset-0">
              {meta.list.map((row: any, index) => {
                return (
                  <Fragment key={index}>
                    {col({ row, index, list: meta.list })}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )
      }

      return <QLTable {...tprops} meta={meta} />
    },
    tableProps: props.table,
    Filter: (props: IQLFilter) => {
      return <QLFilter {...props} actions={actions} />
    },
    filterProps: props.filter,
    Paging: QLPaging,
    pagingProps: {},
    meta,
  })
}
