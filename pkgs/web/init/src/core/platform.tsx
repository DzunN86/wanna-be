import external from 'web-app/src/external'
import type { BaseWindow } from '../window'
import { unpackBase } from './unpack'

declare const window: BaseWindow

export const defineCMS = async () => {
  unpackBase()

  window.cms_components = {}

  let final = external
  if (window.platform === 'mobile') {
    const { extendExternals } = await import('../mobile/mobile-ext')
    final = { ...external, ...extendExternals() }
  }

  for (let [k, v] of Object.entries(final)) {
    window.cms_components[k] = {
      component: () => <></>,
      template: {
        loading: false,
        code: '',
      },
      load: v as any,
      loading: false,
      loaded: false,
    }
  }
}

export const detectPlatform = async () => {
  window.platform = 'web'
  if (
    location &&
    (location.pathname === '/m' || location.pathname.indexOf('/m/') === 0)
  ) {
    window.platform = 'mobile'
  } else if (
    location &&
    (location.pathname === '/w' || location.pathname.indexOf('/w/') === 0)
  ) {
    window.platform = 'web'
  } else {
    if (document.body.clientWidth <= 768) {
      window.platform = 'mobile'
    }
  }

  if (
    location.pathname.indexOf('/dev') === 0 ||
    location.pathname.indexOf('/figma') === 0
  ) {
    window.platform = 'web'
  }
}
