import trim from 'lodash.trim'
import { BaseWindow } from '../../init/src/window'
declare const window: BaseWindow

export const loadExt = async (inputURL: string) => {
  let url = inputURL
  let importURL = url

  if (inputURL.indexOf('http') === 0) {
    const urlarr = url.split('/')
    let nurl = []
    for (let i of urlarr) {
      if (i === '__ext' || nurl.length > 0) {
        nurl.push(i)
      }
    }
    url = nurl.join('/')
  } else {
    url =
      inputURL.indexOf('/__ext') === 0
        ? inputURL
        : '/' + ['__ext', trim(inputURL, '/')].join('/')
    importURL = url
  }

  if (!window.imported) {
    window.imported = {}
  }

  if (window.imported[url]) {
    if (window.imported[url] instanceof Promise) {
      return await window.imported[url]
    }
    return window.imported[url]
  }

  let result = null

  if (!window.is_dev) {
    window.imported[url] = new Promise(async (resolve) => {
      const src = await (
        await fetch(importURL, {
          headers: {
            'x-ext-transpile-es5': 'y',
          },
        })
      ).text()

      ;(() => {
        const exports = {}
        eval(src)
        result = exports

        if (result.default) {
          window.imported[url] = result.default
        } else {
          window.imported[url] = result
        }
        resolve(window.imported[url])
      })()
    })
  } else {
    result = await import(importURL)

    if (result.default) {
      window.imported[url] = result.default
    } else {
      window.imported[url] = result
    }
  }

  return window.imported[url]
}
