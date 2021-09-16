import { dirs } from 'boot'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { pathExists, readdir, stat } from 'fs-extra'
import mime from 'mime-types'
import { basename, dirname, extname, join } from 'path'
import sharp from 'sharp'
import { upload } from './upload'

export const uploadRoute = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> => {
  const url = req.url

  if (url.indexOf('/upload') === 0) {
    let rpath = decodeURIComponent(url).substr('/upload/'.length)
    let mpath = join(dirs.root, 'uploads', rpath)

    // reply.headers['Access-Control-Allow-Origin'] = "*";
    // reply.headers['Access-Control-Allow-Methods'] = "OPTIONS";

    reply.header('Access-Control-Allow-Origin', "*");
    reply.header('Access-Control-Allow-Methods', "GET,OPTIONS");

    if (
      mpath.indexOf(join(dirs.root, 'uploads')) === 0 &&
      (await pathExists(mpath))
    ) {
      const ext = extname(mpath).substr(1)
      if (['jpg', 'jpeg', 'png', 'gif'].indexOf(ext) >= 0) {
        const q = req.query as any

        if (mime.types[ext]) {
          reply.type(mime.types[ext])

          const opt: any = { fit: sharp.fit.contain }
          if (q.w) {
            opt.width = q.w * 1
          }
          if (q.h) {
            opt.height = q.h * 1
          }

          reply.send(await sharp(mpath).resize(opt).toBuffer())
        }
      }

      

      return reply.sendFile(basename(mpath), dirname(mpath))
    }
    reply.code(404)
    reply.send({ status: 'file not found' })
    return true
  }

  if (url.indexOf('/__upload') === 0) {
    const uploadDir = join(dirs.root, 'uploads')
    if (url.indexOf('/__upload/dirs') === 0) {
      const result = {
        path: '',
        dirs: [],
        files: [],
      }
      let rpath = url.substr('/__upload/dirs'.length)
      let mpath = join(uploadDir, rpath)

      if (mpath.indexOf(uploadDir) === 0 && (await pathExists(uploadDir))) {
        const rdirs = await readdir(mpath)
        result.path = rpath
        for (let i in rdirs) {
          const st = await stat(join(mpath, rdirs[i]))
          result[st.isFile() ? 'files' : 'dirs'].push({
            name: rdirs[i],
            path: rpath === '' ? '/' : '',
            size: st.size,
            date: new Date(st.mtimeMs),
          })
        }
      }

      return reply.send(result)
    }

    await upload(req, reply)
    return true
  }
}
