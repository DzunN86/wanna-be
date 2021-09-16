import { FastifyReply, FastifyRequest } from 'fastify'
import { isCMS } from '../system/detect'
import { cmsRoutes } from '../system/routes'
import { CustomGlobal, MainControl } from '../server'
import { dataRouter } from './route-data'
import { serverRoute, serverRouteDev } from './route-server'
import { uploadRoute } from './route-upload'
import { serveStaticFile } from './staticfile'
import { serveFigmaImages } from './figma-imgs'
import { ParentThread } from '../../../builder/src/thread'
import { system } from '../system/prepare'

declare const global: CustomGlobal

export const allRoutes = async function (
  this: { parent?: ParentThread; cms: typeof system },
  req: FastifyRequest,
  reply: FastifyReply
) {
  let url = req.url.split('?')[0]
  if (url.indexOf('/__server') === 0) {
    return await serverRouteDev(req, reply)
  }

  if (await serverRoute(req, reply)) {
    return
  }

  if (url.indexOf('/fimgs/') === 0) {
    return await serveFigmaImages(req, reply)
  }

  if (req.url.indexOf('/__data') === 0) {
    await dataRouter(req, reply, global.mode, this.parent)
    return
  }

  if (await uploadRoute(req, reply)) {
    return
  }

  if (await serveStaticFile({ url, req, reply })) {
    return
  }

  const cmsfound = isCMS(url, req)
  if (cmsfound) {
    await cmsRoutes(global.mode, cmsfound, req, reply)
    return
  }

  reply.type('text/html')
  reply.send(await system.root.html(req))
}
