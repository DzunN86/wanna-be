import { dirs } from 'boot'
import { FastifyReply, FastifyRequest } from 'fastify'
import { createWriteStream } from 'fs'
import { ensureDir } from 'fs-extra'
import { dirname, join } from 'path'
import { pipeline } from 'stream'
import util from 'util'

const pump = util.promisify(pipeline)

export const upload = async (req: FastifyRequest, reply: FastifyReply) => {
  const parts = await req.files()
  const uploadDir = join(dirs.root, 'uploads')
  await ensureDir(uploadDir)

  for await (const part of parts) {
    const file = join(uploadDir, part.fieldname, part.filename)
    if (file.indexOf(uploadDir) === 0) {
      await ensureDir(dirname(file))
    }

    await pump(part.file, createWriteStream(file))
  }

  reply.send('ok')
}
