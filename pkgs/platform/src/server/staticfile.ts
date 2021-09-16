import { transformFileAsync } from '@babel/core'
import { dirs } from 'boot'
import { matchesUA } from 'browserslist-useragent'
import { FastifyReply, FastifyRequest } from 'fastify'
import { readFile } from 'fs-extra'
import { lstat } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { CustomGlobal } from '../server'
import { renderComponent } from '../system/components'
import { system } from '../system/prepare'

declare const global: CustomGlobal

export const serveStaticFile = async ({
  url,
  req,
  reply,
}: {
  url: string
  req: FastifyRequest
  reply: FastifyReply
}) => {
  let _url = decodeURIComponent(url)

  if (_url === '/' || _url === '') {
    return false
  }

  if (_url.endsWith('.ccx')) {
    let name = _url.split('/').pop().split('.').shift()
    const comp = system.cache.components[name]
    if (!comp.cached) {
      comp.cached = await renderComponent(comp.code)
    }
    reply.send(comp.cached)
    return true
  }

  if (_url.indexOf('/min-maps') === 0) {
    let publicFile = join(dirs.pkgs.web, 'ext', 'monaco', _url)
    if (await isFile(publicFile)) {
      reply.sendFile(_url, join(dirs.pkgs.web, 'ext', 'monaco'))
    } else {
      reply.code(404)
      reply.send(404)
    }
    return true
  }

  if (_url.indexOf('/__ext') === 0) {
    _url = _url.substr('/__ext'.length)

    reply.header('Access-Control-Allow-Origin', '*')

    let publicFile = join(dirs.pkgs.web, 'ext', _url)
    if (await isFile(publicFile)) {
      if (req.headers['x-ext-transpile-es5'] === 'y') {
        if (!global.fileCaches) {
          global.fileCaches = {}
        }
        if (!global.fileCaches[publicFile]) {
          const modernBrowser = matchesUA(req.headers['user-agent'], {
            browsers: ['Chrome > 45'],
          })
          const res = await transformFileAsync(publicFile, {
            presets: [
              [
                '@babel/env',
                {
                  targets: {
                    browsers: [modernBrowser ? 'defaults' : 'Chrome <= 45'],
                  },
                  useBuiltIns: 'entry',
                  corejs: { version: '3.8', proposals: true },
                },
              ],
            ],
          })
          global.fileCaches[publicFile] = res.code
        }

        reply.send(global.fileCaches[publicFile])
        return true
      }

      reply.sendFile(_url, join(dirs.pkgs.web, 'ext'))
    } else {
      reply.code(404)
      reply.send(404)
    }
    return true
  }

  let publicFile = join(dirs.app.web, 'build', 'web', _url)
  if (await isFile(publicFile)) {
    reply.sendFile(basename(publicFile), dirname(publicFile))
    return true
  }
  return false
}

const isFileCache = new Map<string, boolean>()
export const isFile = async (file: string) => {
  try {
    const status = isFileCache.get(file)
    if (status === undefined) {
      const stat = await lstat(file)
      if (stat.isFile()) {
        isFileCache.set(file, true)
        return true
      } else {
        isFileCache.set(file, false)
        return false
      }
    }
    return status
  } catch (e) {
    return false
  }
}
