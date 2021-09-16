/** @jsx jsx */
import { jsx } from '@emotion/react'
import React from 'react'
import type { IQueryListChildren } from '../../../ext/types/list'

export const prepareChildren = (
  children?: IQueryListChildren | never[]
): IQueryListChildren => {
  if (typeof children === 'function') {
    // test if children function is returning just row
    // or full Table, Filter, etc
    if (
      React.isValidElement(children({ row: {}, list: [{}], index: 0 } as any))
    ) {
      return ({
        Filter,
        filterProps,
        Table,
        tableProps,
        Paging,
        pagingProps,
      }) => {
        return <Table {...tableProps} />
      }
    }

    return children
  }

  return ({ Filter, filterProps, Table, tableProps, Paging, pagingProps }) => {
    return (
      <div className="flex flex-col flex-1">
        <Table {...tableProps} />
      </div>
    )
  }
}
