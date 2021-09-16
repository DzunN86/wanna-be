/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Page } from 'framework7-react'

export default (props) => {
  return (
    <Page
      {...props}
      css={css`
        &.page {
          > div {
            display: flex;
            flex: 1;
            width: 100%;
            flex-direction: column;
            height: 100%;
          }
        }
      `}
    />
  )
}
