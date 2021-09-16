import { log } from 'boot'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { decompress } from 'LZUTF8'
import sodium from 'sodium-universal'
import { CustomGlobal } from '../server'
import { serialize } from '../utils'
import fastifySession from './session/lib'
import Store from './session/lib/store'

declare const global: CustomGlobal

export const jsonPlugin = fp(function (
  server: FastifyInstance,
  _: any,
  next: () => void
) {
  server.addContentTypeParser(
    'application/javascript',
    { parseAs: 'string' },
    function (_, body, done) {
      try {
        var newBody = {
          raw: body,
        }
        done(null, newBody)
      } catch (error) {
        error.statusCode = 400
        done(error, undefined)
      }
    }
  )
  server.addContentTypeParser(
    'application/vnd.api+json',
    { parseAs: 'string' },
    (_, body, done) => {
      try {
        done(null, body)
      } catch (err) {
        err.statusCode = 400
        done(err, undefined)
      }
    }
  )
  server.addContentTypeParser(
    'application/base.query',
    function (req, payload, done) {
      const data = []

      payload
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          const result = Buffer.concat(data)
          if (typeof req.headers['x-nonce'] === 'string') {
            const nonce = new Uint8Array(
              req.headers['x-nonce']
                .match(/.{1,2}/g)
                .map((byte) => parseInt(byte, 16))
            )
            var decrypted = Buffer.alloc(
              result.length - sodium.crypto_secretbox_MACBYTES
            )

            if (
              sodium.crypto_secretbox_open_easy(
                decrypted,
                result,
                nonce,
                global.secret
              )
            ) {
              done(null, decrypted.toString('utf-8'))
            }
          }
        })
    }
  )

  server.addHook('onSend', (_req, reply, payload, done) => {
    const err = null

    if ((reply as any).isCMS) {
      if (typeof payload === 'object') {
        if (!!(payload as any)._readableState) {
          // this is a stream
          done(err, payload)
        } else {
          done(err, typeof payload === 'object' ? serialize(payload) : payload)
        }
        return
      }
    }
    done(err, payload)
  })
  // your plugin code
  next()
})

export const authPlugin = fp(function (
  server: FastifyInstance,
  _: any,
  next: () => void
) {
  try {
    server.register(fastifySession, {
      secret:
        'XDGKpja1kog7xuGU1lFzKDFvTY3PbBIn0B5BTAhoGz7daATEKUDOTn0nxUJ5tW9Z',
      store: new Store(),
      saveUninitialized: false,
      cookie: {
        secure: false,
        sameSite: false,
        maxAge: 180000000,
      },
    })
    server.addHook('onResponse', (req: any) => {
      if (req.session.authenticated === false) {
        req.destroySession(() => {})
      }
    })
  } catch (e) {
    log('platform', `Failed to initialize session: ${e.toString()}`)
  }
  next()
})
