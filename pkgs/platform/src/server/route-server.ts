import { dirs } from 'boot'
import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  remove,
  ensureDir,
  pathExists,
  readdir,
  readFile,
  writeFile,
} from 'fs-extra'
import { matchRoute } from 'libs'
import { join } from 'path'
import { CustomGlobal } from '../server'

declare const global: CustomGlobal

const srpath = join(dirs.app.server, 'routes')
export const serverRoute = async (req: FastifyRequest, reply: FastifyReply) => {
  return false;
  if (!global.serverRoutes || global.mode === 'dev') {
    await ensureDir(srpath)
    global.serverRoutes = await readdir(srpath)
  }

  if (req.headers.accept && req.headers.accept.indexOf('text/html') >= 0) {
    for (let i of global.serverRoutes) {
      if (matchRoute(req.url, pathToName(i.substr(0, i.length - 3)))) {
        reply.send({ ok: 'math' })
        return true
      }
    }
  }
}

export const serverRouteDev = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const qdir = join(dirs.app.server, 'routes')
  const body: any = req.body
  switch (true) {
    case req.url === '/__server/list':
      await ensureDir(qdir)
      reply.send(
        await Promise.all(
          (
            await readdir(qdir)
          ).map(async (e) => {
            const name = pathToName(e.substr(0, e.length - 3))
            return {
              name: name,
              oldName: name,
              unsaved: false,
              new: false,
              code: null,
            }
          })
        )
      )
      break
    case req.url === '/__server/read':
      const readPath = join(qdir, nameToPath(body.name) + '.js')
      if (
        (await readPath.indexOf(qdir)) === 0 &&
        (await pathExists(readPath))
      ) {
        reply.send({
          code: await readFile(readPath, 'utf-8'),
        })
      } else {
        reply.send({
          code: '',
        })
      }

      break
    case req.url === '/__server/save':
      const savePath = join(qdir, nameToPath(body.name) + '.js')
      const oldPath = join(qdir, nameToPath(body.oldName) + '.js')
      if (savePath.indexOf(qdir) === 0 && (await pathExists(savePath))) {
        if (body.new) {
          reply.send({ status: 'failed', msg: 'Query already exists.' })
        }
      }

      if (await pathExists(oldPath)) {
        await remove(oldPath)
      }

      await writeFile(savePath, body.code || '')

      reply.send({ status: 'ok' })
      break
    case req.url.indexOf('/__server/delete/') === 0:
      const delPath = join(
        qdir,
        nameToPath(req.url.substr('/__server/delete/'.length)) + '.js'
      )
      if (await pathExists(delPath)) {
        await remove(delPath)
      }
      reply.send({ status: 'ok' })
      break
  }
}

export const nameToPath = (name: string) => {
  return name.replace(/\//gi, '_').replace(/\~/gi, '.')
}

const pathToName = (name: string) => {
  return name.replace(/\_/gi, '/').replace(/\./gi, '~')
}
