import 'regenerator-runtime/runtime.js' // polyfill for old browser
import { defineCMS, detectPlatform } from './core/platform'
import { defineWindow } from './core/window'
import { mobileInit } from './mobile/mobile-init'
import { webInit } from './web/web-init'
import type { BaseWindow } from './window'

declare const window: BaseWindow

export const initApp = async (opt?: { Root?: any; notFoundURL?: string }) => {
  await detectPlatform() // window.platform
  await defineWindow() // window.*
  await defineCMS() // window.cms_*

  if (window.platform === 'web') {
    webInit()
  } else if (window.platform === 'mobile') {
    mobileInit()
  }
}
