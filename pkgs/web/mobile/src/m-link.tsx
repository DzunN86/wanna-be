/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Link } from 'framework7-react'
import { BaseWindow } from 'web.init/src/window'

declare const window: BaseWindow

export default (props) => {
  const nprops = { ...props }
  if (nprops.back) {
    const back = nprops.back
    nprops.onClick = (e) => {
      window.back(back)

      if (props.onClick) {
        props.onClick(e)
      }
    }
    delete nprops.back
  }
  if (nprops.href) {
    const href = nprops.href
    nprops.onClick = (e) => {
      window.navigate(href)

      if (props.onClick) {
        props.onClick(e)
      }
    }
    delete nprops.href
  }


  return <Link {...nprops} />
}
