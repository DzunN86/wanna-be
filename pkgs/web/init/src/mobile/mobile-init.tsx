import Framework7React from 'framework7-react'
import Framework7 from 'framework7/lite-bundle'
import { MobileMain } from './mobile-main'
import { render } from 'react-dom'
import { injectCSS } from 'web.utils/src/inject'
import type { BaseWindow } from '../window'

declare const window: BaseWindow

export const mobileInit = async () => {
  await injectCSS('/f7.css')
  await injectCSS(window.is_dev ? '/index.css' : '/main.css')
  Framework7.use(Framework7React)
  render(<MobileMain />, document.getElementById('root'))
}
