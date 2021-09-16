import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

import { format } from 'prettier'
const pbabel = require('../../web/ext/dev/prettier-babel')

const replaceCircular = function (val: any, cache?: any) {
  cache = cache || new WeakSet()

  if (val instanceof Date) {
    return val.toISOString()
  }

  if (val && typeof val == 'object') {
    if (cache.has(val)) return '[Circular]'

    cache.add(val)

    const obj: any = Array.isArray(val) ? [] : {}
    for (var idx in val) {
      obj[idx] = replaceCircular(val[idx], cache)
    }

    cache.delete(val)
    return obj
  }

  return val
}

export const serialize = (val: any, ...args: any[]) => {
  return JSON.stringify(replaceCircular(val), ...args)
}

const getFilePathsRecursively = (dir: string): string[] => {
  // returns a flat array of absolute paths of all files recursively contained in the dir
  let results: string[] = []
  let list = fs.readdirSync(dir)

  var pending = list.length
  if (!pending) return results

  for (let file of list) {
    file = path.resolve(dir, file)

    let stat = fs.lstatSync(file)

    if (stat && stat.isDirectory()) {
      results = results.concat(getFilePathsRecursively(file))
    } else {
      results.push(file)
    }

    if (!--pending) return results
  }

  return results
}

export const zipFolder = (dir: string): JSZip => {
  let allPaths = getFilePathsRecursively(dir)

  let zip = new JSZip()
  for (let filePath of allPaths) {
    // let addPath = path.relative(path.join(dir, '..'), filePath); // use this instead if you want the source folder itself in the zip
    let addPath = path.relative(dir, filePath) // use this instead if you don't want the source folder itself in the zip
    let data = fs.readFileSync(filePath)
    let stat = fs.lstatSync(filePath)
    let permissions = stat.mode

    if (stat.isSymbolicLink()) {
      zip.file(addPath, fs.readlinkSync(filePath), {
        unixPermissions: parseInt('120755', 8), // This permission can be more permissive than necessary for non-executables but we don't mind.
        dir: stat.isDirectory(),
      })
    } else {
      zip.file(addPath, data, {
        unixPermissions: permissions,
        dir: stat.isDirectory(),
      })
    }
  }

  return zip
}

export const serverFormatCode = (code: string) => {
  return format(code, {
    parser: 'babel-ts',
    plugins: pbabel,
  })
}
