import { getDMMF } from '@prisma/sdk'
import { dirs, log } from 'boot'
import { db, dbAll } from 'db'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { readdir, readFile } from 'fs-extra'
import { join } from 'path'
import { ParentThread } from '../../../builder/src/thread'
import { runYarn } from '../../../main/src/utils/yarn'
import { CustomGlobal } from '../server'
declare const global: CustomGlobal

export const dataRouter = async (
  req: FastifyRequest,
  reply: FastifyReply,
  mode: 'dev' | 'prod',
  parent?: ParentThread
) => {
  if (req.url.indexOf('/__data') === 0) {
    if (req.url.indexOf('/__data/types') === 0) {
      const dir = join(dirs.pkgs.web, 'ext', 'types')
      let all = {}
      await Promise.all(
        (
          await readdir(dir)
        ).map(async (e) => {
          all[e.replace('.d.ts', '')] =
            (await readFile(join(dir, e), 'utf-8'))
              .split('/** TYPE SEPARATOR - DO NOT DELETE THIS COMMENT **/')
              .pop() + '\n'
          return true
        })
      )
      reply.type('application/json')
      return reply.send(all)
    }
    if (req.url === '/__data/global') {
      const global = await require('web-app/src/global')
      return reply.send(Object.keys(global))
    }
    if (req.url === '/__data/react.d.ts') {
      return (reply as any).sendFile(
        'index.d.ts',
        join(dirs.root, 'node_modules', '@types', 'react')
      )
    }
    if (req.url === '/__data/db.d.ts') {
      return (reply as any).sendFile(
        'index.d.ts',
        join(dirs.root, 'node_modules', '.prisma', 'client')
      )
    }
    if (req.url === '/__data/query') {
      try {
        return reply.send(await db.$queryRaw(req.body as any))
      } catch (e) {
        console.error(
          `Failed when executing sql: ${JSON.stringify(req.body)}\n\n`,
          e
        )
      }
    }
  }

  if (req.method.toLowerCase() === 'post') {
    const body: {
      action: string
      db: string
      table: string
      params: string
    } = req.body as any

    const { db } = require('db')

    if (!db) {
      reply.code(403).send('Forbidden')
      return
    }

    if (body && body.table) {
      body.table = body.table.toLowerCase().replace(/[\W_]+/g, '_')
    }

    reply.removeHeader('Content-Length')
    reply.removeHeader('Transfer-encoding')

    if (
      !db[body.table] &&
      body.table &&
      body.action !== 'tables' &&
      body.action !== 'typedef' &&
      body.action !== 'reload-schema'
    ) {
      reply.send({ status: 'failed', reason: `Table ${body.table} not found.` })
      return
    }

    let result: any = null
    try {
      switch (body.action) {
        case 'typedef': {
          const models = global.dmmf.datamodel.models
          const tables = []
          const result = models
            .map((e) => {
              tables.push("'" + e.name + "'")
              return `\
${e.name}: {
${e.fields
  .map((f) => {
    if (f.kind === 'object') {
      if (f.isList) {
        return `   ${f.name}: Array<DBDefinitions['${f.type}']>`
      } else {
        return `   ${f.name}: DBDefinitions['${f.type}']`
      }
    }

    return `   ${f.name}: ${convertDBType(f.type)}`
  })
  .join('\n')}
}`
            })
            .join('\n')
          reply.send(`\
type DBDefinitions = {
  ${result}
}
type DBTables = ${tables.join(' | ')}
`)
          return
        }
        case 'reload-schema':
          if (mode === 'dev') {
            await runYarn(['exec', '-w=db', '-c', 'prisma db pull'])
            await runYarn(['exec', '-w=db', '-c', 'prisma generate'])
            delete require.cache[require.resolve('db')]
            parent.sendTo('main', {
              type: 'platform-signal',
              data: 'restart',
            })
          } else {
            reply.status(403)
          }

          global.dmmf = await getDMMF({
            datamodelPath: join(dirs.app.db, 'prisma', 'schema.prisma'),
          })
          return
        case 'definition':
          {
            const schema = global.dmmf.schema.outputObjectTypes.model.find(
              (e) => e.name === body.table
            )
            const model = global.dmmf.datamodel.models.find(
              (e) => e.name === body.table
            )
            const pk = model.fields.filter((e) => e.isId)

            const relations: Record<string, any> = {}
            model.fields
              .filter((e) => e.kind === 'object')
              .map((e) => {
                const s = schema.fields.find((f) => f.name === e.name)

                if (s && s.outputType.namespace === 'model') {
                  if (s.outputType.isList) {
                    const foreign = global.dmmf.datamodel.models.find((f) => {
                      return f.name === s.outputType.type
                    })

                    if (foreign) {
                      const rel = foreign.fields.find(
                        (f) => f.relationName === e.relationName
                      )
                      relations[e.name] = {
                        relation: 'Model.HasManyRelation',
                        modelClass: e.type,
                        join: {
                          from: `${e.type}.${rel.relationToFields[0]}`,
                          to: `${rel.type}.${rel.relationFromFields[0]}`,
                        },
                      }
                    }
                  } else {
                    const foreign = global.dmmf.datamodel.models.find((f) => {
                      return f.name === s.outputType.type
                    })

                    if (foreign) {
                      const rel = foreign.fields.find(
                        (f) => f.relationName === e.relationName
                      )
                      relations[e.type] = {
                        relation: 'Model.BelongsToOneRelation',
                        modelClass: e.type,
                        join: {
                          from: `${rel.type}.${e.relationFromFields[0]}`,
                          to: `${e.type}.${e.relationToFields[0]}`,
                        },
                      }
                    }
                  }
                }
                return {}
              })

            const columns = {}
            schema.fields
              .filter((e) => e.outputType.location === 'scalar')
              .map((e) => {
                columns[e.name] = {
                  name: e.name,
                  type: convertDBType(e.outputType.type),
                  pk: pk.length > 0 ? pk[0].name === e.name : false,
                  nullable: e.isNullable,
                }

                for (let f of Object.values(relations)) {
                  if (
                    f.relation === 'Model.BelongsToOneRelation' &&
                    f.join.from === `${body.table}.${e.name}`
                  ) {
                    columns[e.name].rel = f
                  }
                }
              })

            reply.send(
              JSON.stringify({
                db: {
                  name: body.table,
                },
                rels: relations,
                columns: columns,
              })
            )
          }
          return
        case 'tables':
          reply.send(
            JSON.stringify(
              global.dmmf.schema.outputObjectTypes.model.map((e) => {
                return e.name
              })
            )
          )
          return
        default:
          if (body.action === 'upsertMany') {
            const params: Array<any> = body.params[0] as any

            result = await dbAll['main'].$transaction(
              params.map((e) => dbAll['main'][body.table].upsert(e))
            )
          } else {
            let func
            eval(`func = db.${body.table}.${body.action}`)
            if (func) {
              result = await func(...body.params)
            } else {
              throw new Error(
                `db.${body.table}.${body.action} is not a function.`
              )
            }
          }
          break
      }
      reply.send(JSON.stringify(result))
    } catch (e) {
      if (body.action && body.table) {
        log(
          'platform',
          `Failed to ${body.action} on table "${
            body.table
          }" on data-router: ${e.toString()}`
        )
      }
      reply.send(
        JSON.stringify({ ...e, status: 'failed', reason: e.toString() })
      )
    }
    // reply.send(JSON.stringify(req.body, null, 2))
    return
  }

  reply.code(403).send('Forbidden')
}

const convertDBType = (type: any) => {
  switch (type) {
    case 'Int':
    case 'Float':
    case 'Decimal':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'String':
      return 'string'
    case 'Date':
    case 'date':
      return 'Date'
    case 'DateTime':
      return 'Date'
    case 'Json':
      return 'object'
  }

  console.log(`Failed to convert DB Type: ${type} `)
  return ''
}
