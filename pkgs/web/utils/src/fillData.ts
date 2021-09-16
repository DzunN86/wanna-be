
export const fillData = (empty: any, value: any) => {
  const result: any = {}

  const _fill = (e, v) => {
    if (typeof e === 'object') {
      if (typeof v === 'object') {
        return fillData(e, v)
      } else {
        return e
      }
    } else {
      return v
    }
  }

  if (typeof empty === 'object') {
    for (let [k, v] of Object.entries(empty)) {
      result[k] = _fill(v, value[k])
    }
  }
  return result
}
