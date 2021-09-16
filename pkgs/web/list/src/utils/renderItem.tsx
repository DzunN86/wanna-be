/** @jsx jsx */
import { IColumn as FluentColumn } from '@fluentui/react'
import { format } from 'date-fns'
import NiceValue from 'web.form/fields/NiceValue'
import get from 'lodash.get'
export const renderItem = function (
  this: any,
  item: any,
  rowNum?: number,
  column?: FluentColumn
) {
  const { columns, meta } = this
  if (column) {
    let value = get(item, column.fieldName)

    if (this) {
      const col = columns[(column as any).idx]
      if (col) {
        if (typeof col === 'function') {
          const result = col(item)
          return <div className="ui-querylist-custom">{result.value}</div>
        }
      }

      if (Array.isArray(col)) {
        if (col[1] && typeof col[1].value === 'function') {
          return col[1].value(item)
        }
      }

      if (meta && meta.def) {
        const def = meta.def.columns[column.fieldName || '']
        if (def) {
          switch (def.type.toLowerCase()) {
            case 'date':
              if (typeof value === 'string') {
                return format(new Date(value), 'dd MMM yyyy - HH:mm')
              }
              break
          }
        }
      }
    }

    if (typeof value === 'object') return <NiceValue value={value} />
    return value
  }
  return ''
}
