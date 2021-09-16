export const prepareDBClient = (dbname: string) => {
  let proxy = new Proxy(
    {},
    {
      get(_, name) {
        const post = async (params: any) => {
          const url = '/__data'
          const options = {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Sec-Fetch-Dest': 'script',
              'Content-Type': 'application/json;charset=UTF-8',
            },
            body: JSON.stringify(params),
          }

          const res = await fetch(url, options)
          return await res.json()
        }

        if (name === 'query') {
          return async (q: string | [string, Record<string, any>]) => {
            // todo: process parameterized query
            if (Array.isArray(q)) return []

            const w: any = window
            w.global = w
            const sodium = (await import('sodium-universal')).default
            if (!w.Buffer) {
              w.Buffer = (await w.loadExt('dev/buffer.js')).buffer.Buffer
            }
            var nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
            var key = w.secret
            var message = Buffer.from(q)
            var result = Buffer.alloc(
              message.length + sodium.crypto_secretbox_MACBYTES
            )

            sodium.randombytes_buf(nonce)
            sodium.crypto_secretbox_easy(result, message, nonce, key)

            const url = '/__data/query'
            const options = {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Sec-Fetch-Dest': 'script',
                'Content-Type': 'application/base.query',
                'x-nonce': nonce.toString('hex'),
              },
              body: result,
            }

            const res = await fetch(url, options)
            return await res.json()

            return []
          }
        }

        return new Proxy(
          {},
          {
            get(_, sname) {
              return async (...params: any[]) => {
                const result = await post({
                  table: name,
                  db: dbname,
                  action: sname,
                  params,
                })

                if (
                  result &&
                  result.status === 'failed' &&
                  result.clientVersion
                ) {
                  console.error(result.reason)
                }

                return result
              }
            },
          }
        )

        // return {
        //   async definition() {
        //     return await post({
        //       type: 'definition',
        //       db: dbname,
        //       table: name,
        //     })
        //   },
        //   async query(params: any) {
        //     const res = await post({
        //       type: 'query',
        //       db: dbname,
        //       table: name,
        //       params,
        //     })

        //     if (res.status === 'failed') {
        //       console.error(
        //         `DB QUERY ERROR: ${name.toString()}\n\n[PARAMS] ${JSON.stringify(
        //           params
        //         )}\n\n[REASON] ${res.reason}`
        //       )
        //       return []
        //     }
        //     return res
        //   },
        //   async insert(params: any) {
        //     return await post({
        //       type: 'insert',
        //       db: dbname,
        //       table: name,
        //       params,
        //     })
        //   },
        //   async update(params: any) {
        //     return await post({
        //       type: 'update',
        //       db: dbname,
        //       table: name,
        //       params,
        //     })
        //   },
        //   async delete(params: any) {
        //     return await post({
        //       type: 'delete',
        //       db: dbname,
        //       table: name,
        //       params,
        //     })
        //   },
        // }
      },
    }
  )
  return proxy as any
}

export const prepareAllDBClient = (): any => {
  let proxy = new Proxy(
    {},
    {
      get(_, name: string) {
        return prepareDBClient(name)
      },
    }
  )
  return proxy as any
}
