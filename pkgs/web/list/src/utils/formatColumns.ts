/** @jsx jsx */
import { IColumn as FluentColumn } from '@fluentui/react'
import { niceCase } from 'web.utils/src/niceCase'
import { IColumn, IColumnDetail } from '../../../ext/types/list'
import get from 'lodash.get'
export const formatColumns = (
  columns: IColumn[],
  params
): (FluentColumn & { fieldName: string })[] => {
  if (!Array.isArray(columns)) return []

  return columns.map((column, idx) => {
    let colName = ''
    let title = ''
    let render: any = null
    let maxWidth = 120

    const applyCol = (col: IColumnDetail) => {
      if (col.key) {
        colName = col.key
      }
      if (col.title) {
        title = col.title
      } else {
        title = niceCase(colName)
      }

      if (col.width) {
        maxWidth = col.width
      }
    }

    if (typeof column === 'function') {
      applyCol(column({}))
      render = column
    } else if (typeof column === 'string') {
      colName = column
      title = niceCase(colName)
    } else if (Array.isArray(column)) {
      colName = column[0] as any
      if (column[1]) {
        applyCol(column[1])
      }
    }

    const result: any = {
      key: idx.toString(),
      idx,
      fieldName: colName,
      name: title,
      isResizable: true,
      minWidth: 60,
      maxWidth: maxWidth,
      customRender: render,
    }

    if (column[1] && column[1].width) {
      result.minWidth = column[1].width
      result.maxWidth = column[1].width
    }
    if (params.order && params.order.length > 0) {
      const ord = params.order[0]

      if (colName.indexOf('.') > 0) {
        const col = colName.split('.')

        const ordLen =
          col.length === 3
            ? `${col[0]}.${col[1]}.${col[2]}`
            : `${col[0]}.${col[1]}`
        const ordering = get(ord, ordLen)
        if (ordering) {
          result.isSorted = true
          result.isSortedDescending = ordering !== 'asc'
        }
      } else if (colName === ord.column) {
        result.isSorted = true
        result.isSortedDescending = ord.order !== 'asc'
      }
    }
    return result
  })
}
