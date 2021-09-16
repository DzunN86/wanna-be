import { pathExists, readJSON } from 'fs-extra'

export { Builder } from './builder'
export { BuilderPool } from './builderpool'
export { expose } from './thread'
export { Watcher } from './watcher'

export interface CustomGlobal extends NodeJS.Global {
  mode: 'dev' | 'prod'
}

export const getDeps = async (pkg: string) => {
  if (await pathExists(pkg)) {
    const json = await readJSON(pkg)
    if (json && json.dependencies) {
      return Object.keys(json.dependencies)
    }
  }
}
