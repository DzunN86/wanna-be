import { dirs } from 'boot'
import { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import { ensureDir, pathExists, remove, readdir } from 'fs-extra'
import { waitUntil } from 'libs'
import { join } from 'path'
import { prepareFigma } from '../hmr/figma'
import { IFigma } from '../server'

export const serveFigmaImages = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const figma = prepareFigma()
  const urls = req.url.split('/')

  if (urls[urls.length - 1].indexOf('bg') === 0) {
    return await serveFigmaBg(req, reply, urls[urls.length - 1], figma)
  }
  if (urls.length < 3) {
    reply.code(404)
    return reply.send('NOT FOUND')
  }

  let node = urls[2]

  const last = urls.pop().split('.')
  if (last.length < 3) {
    reply.code(404)
    return reply.send('NOT FOUND')
  }

  const type = last.pop()
  const scale = last.pop().replace('x', '')
  const narr = last.pop().split('_')
  let node_id = ''
  let node_url = '___'
  if (narr.length === 2) {
    node_url = `${narr[0]}_${narr[1]}`
    node_id = `${narr[0]}:${narr[1]}`
  } else if (narr.length === 4) {
    node = `${narr[2]}_${narr[3]}.x${scale}.${type}`
    node_id = `${narr[2]}:${narr[3]}`
    node_url = `${narr[2]}_${narr[3]}`
  }

  const frame_id = urls.pop().replace('_', ':')

  for (let ws of figma.ws['figma']) {
    ws.send(
      JSON.stringify({
        type: 'get-image',
        data: {
          type: type.toUpperCase(),
          node_id,
          scale,
          frame_id,
        },
      })
    )
  }

  const dir = join(dirs.app.web, 'figma', 'imgs')
  const file = join(dirs.app.web, 'figma', 'imgs', node)

  if (await pathExists(file)) {
    reply.sendFile(node, dir)
    return
  }

  await waitUntil(() => {
    return (
      figma.resImages.filter(
        (e) => e.frame_id === frame_id && e.node_id === node_id
      ).length > 0
    )
  })

  let bin = []
  for (let i in figma.resImages) {
    const e = figma.resImages[i]
    if (e.frame_id === frame_id && e.node_id === node_id) {
      figma.resImages.splice(i as any, 1)
      bin = e.value
      break
    }
  }
  const chunk = Uint8Array.from(bin)
  if (chunk.length === 0) {
    reply.sendFile(node, dir)
    return
  }

  await ensureDir(dir)

  const files = await readdir(dir)
  for (let i of files) {
    if (i.indexOf(`${node_url}.`) === 0) {
      await remove(join(dir, i))
    }
  }

  fs.appendFile(file, Buffer.from(chunk), function (err) {
    reply.sendFile(node, dir)
  })
}

export const saveFigmaImage = (data: {
  node_id: string
  value: any
  type: string
  scale: string
}) => {
  return new Promise<void>(async (resolve) => {
    let bin = data.value
    const chunk = Uint8Array.from(bin)
    if (chunk.length === 0) {
      return
    }

    let { node_id, type, scale } = data

    node_id = node_id.split(';').pop()
    const node_url = node_id.replace(/\W+/g, '_')
    const node = `${node_url}.x${scale}.${type.toLowerCase()}`
    const dir = join(dirs.app.web, 'figma', 'imgs')
    const file = join(dirs.app.web, 'figma', 'imgs', node)

    await ensureDir(dir)

    const files = await readdir(dir)
    for (let i of files) {
      if (i.indexOf(`${node_url}.`) === 0) {
        await remove(join(dir, i))
      }
    }

    fs.appendFile(file, Buffer.from(chunk), function (err) {
      resolve()
    })
  })
}

const serveFigmaBg = async (
  req: FastifyRequest,
  reply: FastifyReply,
  rawname: string,
  figma: IFigma
) => {
  const hash = rawname.substr(3)

  const dir = join(dirs.app.web, 'figma', 'imgs')
  const file = join(dirs.app.web, 'figma', 'imgs', `bg-${hash}`)

  if (await pathExists(file)) {
    reply.sendFile(`bg-${hash}`, dir)
    return
  }

  for (let ws of figma.ws['figma']) {
    ws.send(
      JSON.stringify({
        type: 'get-bg-image',
        data: {
          hash,
        },
      })
    )
  }

  await waitUntil(() => {
    return figma.bgImages.filter((e) => e.hash === hash).length > 0
  })

  let bin = []
  for (let i in figma.bgImages) {
    const e = figma.bgImages[i]
    if (e.hash === hash) {
      figma.bgImages.splice(i as any, 1)
      bin = e.value
      break
    }
  }

  const chunk = Uint8Array.from(bin)
  if (chunk.length === 0) {
    reply.send('NOT FOUND')
    return
  }

  await ensureDir(dir)

  const files = await readdir(dir)
  for (let i of files) {
    if (i === `bg-${hash}`) {
      await remove(join(dir, i))
    }
  }

  fs.appendFile(file, Buffer.from(chunk), function (err) {
    reply.sendFile(`bg-${hash}`, dir)
  })
}
