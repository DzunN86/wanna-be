import type { ITableDef } from '../../ext/types/list'
import type { IFieldType } from '../../ext/types/qform'

export const inspectDef = (data: Record<string, any>): ITableDef => {
  const result: ITableDef = {}
  for (let [k, v] of Object.entries(data)) {
    result[k] = { name: k, type: detectType(v) }
  }
  return result
}

export const detectType = (v: any, name?: string): IFieldType => {
  let type: IFieldType = 'string'
  if (typeof v === 'string') {
    if (isIsoDate(v)) {
      type = 'date'
    } else {
      type = 'string'
    }
  } else if (typeof v === 'number') {
    type = 'number'
  } else if (typeof v === 'boolean') {
    type = 'boolean'
  } else if (typeof v === 'object') {
    if (v instanceof Date) {
      type = 'date'
    } else if (Array.isArray(v)) {
      type = 'array'
    } else if (!!v) {
      type = 'json'
    }
  }

  if (name && type === 'string') {
    const cname = name.indexOf('.') > 0 ? name.split('.').pop() || '' : name

    if (
      cname.indexOf('body') >= 0 ||
      cname.indexOf('content') >= 0 ||
      cname.indexOf('text') >= 0 ||
      cname.indexOf('html') >= 0 ||
      cname.indexOf('info') >= 0 ||
      cname.indexOf('desc') >= 0
    ) {
      type = 'rich'
    }
  }

  return type
}
export function isIsoDate(str) {
  if (typeof str !== 'string') return false
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false
  try {
    var d = new Date(str)
    return d.toISOString() === str
  } catch (e) {
    console.log(str)
    console.error(e)
  }
}
