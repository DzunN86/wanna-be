/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import throttle from 'lodash.throttle'
import { forwardRef, useRef } from 'react'
import type { BaseWindow } from 'web.init/src/window'

declare const window: BaseWindow

if (!(window as any).linkCache) {
  ;(window as any).linkCache = {}
}

// Do not prefetch link that is already
// fetched after this timeout. is seconds.
const PREFETCH_TIMEOUT = 5

export const Link = forwardRef((props: any, ref: any) => {
  const aref = useRef(null as any)

  const inprops = { ...props }
  if (inprops.data) {
    delete inprops.data
  }

  const onMouseOver = throttle((href) => {
    // const prefetch = props.prefetch !== false && props.prefetch !== 'false'
    // if (prefetch && href && href.indexOf('/') === 0) {
    //   loadCache(href)
    // }
  }, 1000)
  const href = inprops.href
  if (inprops.href) {
    delete inprops.href
  }

  return (
    <a
      css={css`
        cursor: pointer;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        transition: 0.1s all;

        &:active {
          outline: none !important;
          opacity: 0.6;
        }
      `}
      {...inprops}
      ref={(e) => {
        if (typeof ref === 'function') {
          ref(e)
        }
        aref.current = e
      }}
      onMouseOver={(e) => {
        if (props.onMouseOver) {
          const res = props.onMouseOver(e)

          if (res === false) return
        }
        onMouseOver(e.currentTarget.getAttribute('href'))
      }}
      onClick={async (e) => {
        if (e.shiftKey) {
          return true
        }
        e.preventDefault()
        e.stopPropagation()

        if (props.onClick) {
          await props.onClick(e, (ahref: string) =>
            window.navigate(ahref || href, { props })
          )
        } else {
          if (href) window.navigate(href, { props })
        }
      }}
    />
  )
})

export function fetchPage(url, withoutData = false): Promise<string> {
  return new Promise((resolve) => {
    function failureListener(err) {
      console.log('Request failed', err)
    }

    var request = new XMLHttpRequest()
    request.onload = function (this: any) {
      resolve(this.responseText)
    }
    request.onerror = failureListener
    request.open(
      'get',
      url + (url.indexOf('?') < 0 ? '?' : '&') + 'page.csx',
      true
    )

    // if ___USER___ is not defined, then request full component with params and args...
    if (withoutData && !(window as any).___USER___) {
      request.setRequestHeader('x-component-only', 'yes')
    }

    request.setRequestHeader('x-request-react', 'yes')
    request.send()
  })
}
