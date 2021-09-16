import startCase from 'lodash.startcase'

export const niceCase = (str: string) => {
  const res = startCase(str)
  return res
    .split(' ')
    .map((e) => {
      if (e.length <= 1) {
        return ''
      }
      if (e === 'Id') return 'ID'
      return e
    })
    .join(' ')
    .trim()
}
