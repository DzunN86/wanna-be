import { match } from 'path-to-regexp'

export const matchRoute = (path: string, pattern: string): any | null => {
  let pat = pattern
    .replace(/\./gi, '/')
    .replace(/\[([^\]]+)\]/g, ':$1?')
    .replace('*', '(.*)')

  if (pat.indexOf('/') !== 0) {
    pat = '/' + pat
  }

  if (pat.indexOf('/:/') === 0) {
    pat = pat.substr(2)
  }

  const trymatch = (ptrn: string) => {
    const regex = match(ptrn, { decode: decodeURIComponent })
    const params2 = regex(path)
    return params2
  }
  const run = (pat: string) => {
    let params = trymatch(pat)

    if (!params) {
      const parr = pat.split('/')
      if (parr[parr.length - 1] === 'index') {
        parr.pop()
        pat = parr.join('/')
        params = trymatch(pat)
      }
    }
    if (!!params) {
      if (params.params) {
        return params.params
      }
      return params
    }
    return null
  }

  const patarr = pat.split('/:')

  if (patarr.length > 1) {
    let testrun = []

    let first = ''
    if (patarr[0].indexOf('/') === 0) {
      first = patarr.shift() || ''
      testrun.push(`${first}`)
    }

    let url = `${first}`
    for (let i of patarr) {
      if (!!i.trim()) {
        url += `/:${i}`
        testrun.push(url)
      }
    }

    testrun = testrun.reverse()
    for (let p of testrun) {
      const res = run(p)

      if (res) {
        return res
      }
    }
  } else {
    return run(pat)
  }
}
