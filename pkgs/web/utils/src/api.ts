import get from 'lodash.get'

export const api = async (
  url: string,
  body?: any,
  opt?: { method?: 'GET' | 'POST'; raw?: boolean }
) => {
  const method = get(opt, 'method') || body ? 'POST' : 'GET'
  const options: any = {
    method,
    headers: {
      Accept: 'application/json',
      'Sec-Fetch-Dest': 'script',
      'get-server-props': 'yes',
      'Content-Type': 'application/json;charset=UTF-8',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    let finalURL = url
    if (typeof global !== 'undefined' && (global as any).mode) {
      // this is running from server
      if (url.indexOf('http') !== 0) {
        const g: any = global
        finalURL = `${g.scheme}://${g.host}:${g.port}/${
          url[0] === '/' ? url.substr(1) : url
        }`
      }
    }

    const res = await fetch(finalURL, options)
    if (get(opt, 'raw')) {
      return await res.text()
    }

    const json = await res.json()

    if (json) {
      if (json.error) {
        const post = method !== 'GET' ? `\n\n[DATA] ${options.body}` : ''
        console.error(
          `API ERROR: ${method} ${url}${post}\n\n[RESPONSE] ${json.error}`
        )

        return null
      }

      return json
    }
  } catch (error) {
    console.log(error)
    return null
  }
}
