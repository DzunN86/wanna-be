import type { FastifyRequest } from 'fastify'
import type { RouteGenericInterface } from 'fastify/types/route'
import type http from 'http'
import { system, ICMSPage } from './prepare'
import { trim } from 'lodash'
import { matchRoute } from 'libs'

export const isCMS = (
  url: string,
  req: FastifyRequest<RouteGenericInterface, http.Server, http.IncomingMessage>
):
  | false
  | {
      params: any
      page: ICMSPage | null
    } => {
  if (!req.hostname) {
    return false
  }
  if (trim(url, '/').indexOf('__cms') === 0) {
    const params = matchRoute(url, '__cms/[_id]/[_action]')
    const parr = [
      ...Object.values(system.cache.pages),
      ...Object.values(system.cache.layout),
    ]
    for (let p of parr) {
      if (p.id === params._id) {
        return { params: { ...params, _devmode: true, url }, page: p as any }
      }
    }
    return {
      params: { ...params, _devmode: true, url },
      page: null,
    }
  }

  const envdomains: any = {}

  for (let [k, v] of Object.entries(process.env)) {
    if (k.toLowerCase().indexOf('domain_') === 0) {
      envdomains[k.toLowerCase().substr('domain_'.length)] = v
    }
  }

  let hostname = req.hostname.split(':').shift()

  for (let [alias, rawsites] of Object.entries(envdomains)) {
    let sites = (rawsites as string).split('|')
    for (let cursite of sites) {
      cursite = cursite.trim()
      if (cursite === hostname) {
        hostname = alias
      }
    }
  }

  const isHostValid = (site: string) => {
    const regex = wildcardToRegExp(site)
    if (hostname && (site === '*' || regex.exec(hostname) !== null)) {
      return true
    }

    return false
  }

  for (let p of Object.values(system.cache.pages)) {
    if (p.slug) {
      if (isHostValid(p.site)) {
        let slugs = [p.slug]
        if (p.slug.indexOf('|') > 0) {
          slugs = p.slug.split('|').map((e) => e.trim())
        }
        for (let slug of slugs) {
          const params = matchRoute(url, slug)
          if (params) {
            return { params: { ...params, url }, page: p }
          }
        }
      }
    }
  }
  return false
}

function wildcardToRegExp(s: string) {
  return new RegExp('^' + s.split(/\*+/).map(regExpEscape).join('.*') + '$')
}

function regExpEscape(s: string) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
}
