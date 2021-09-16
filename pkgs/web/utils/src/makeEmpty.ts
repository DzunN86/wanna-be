export const makeEmpty = (
  data: Record<string, any>
): Record<string, any> | boolean | number | string => {
  const result: any = {}

  const _empty = (v) => {
    let empty: any = null
    if (typeof v === 'string') {
      empty = ''
    } else if (typeof v === 'boolean') {
      empty = false
    } else if (typeof v === 'number') {
      empty = 0
    } else if (typeof v === 'object') {
      if (Array.isArray(v)) {
        empty = []
        if (v.length > 0) {
          empty = [_empty(v[0])]
        }
      } else if (v instanceof Date) {
        empty = new Date()
      } else if (!!v) {
        empty = {}
        for (let i in v) {
          empty[i] = _empty(v[i])
        }
      }
    }
    return empty
  }

  if (typeof data === 'object') {
    for (let [k, v] of Object.entries(data)) {
      result[k] = _empty(v)
    }
    return result
  } else {
    return _empty(data)
  }
}
