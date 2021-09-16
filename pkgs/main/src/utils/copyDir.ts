import { copy } from 'fs-extra'
import { join } from 'path'
import fs from 'fs'

export const copyDir = async function (src: string, dest: string) {
  mkdir(dest)
  var files = fs.readdirSync(src)
  for (var i = 0; i < files.length; i++) {
    var current = fs.lstatSync(join(src, files[i]))
    if (current.isDirectory()) {
      await copyDir(join(src, files[i]), join(dest, files[i]))
    } else if (current.isSymbolicLink()) {
      var symlink = fs.readlinkSync(join(src, files[i]))
      fs.symlinkSync(symlink, join(dest, files[i]))
    } else {
      await copy(join(src, files[i]), join(dest, files[i]))
    }
  }
}

const mkdir = function (dir: string) {
  // making directory without exception if exists
  try {
    fs.mkdirSync(dir, 0o755)
  } catch (e) {
    if (e.code != 'EEXIST') {
      throw e
    }
  }
}
