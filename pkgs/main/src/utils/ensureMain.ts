import { readJSON, writeJSON } from 'fs-extra'
import { join } from 'path'

export const ensureMain = async (dir, main = './build/index.js') => {
  const json = await readJSON(join(dir, 'package.json'))
  if (json.main !== main) {
    json.main = main
    await writeJSON(join(dir, 'package.json'), json, {
      spaces: 2,
    })
  }
}
