/** @jsx jsx */
import { jsx, css } from '@emotion/react'
import { ListInput } from 'framework7-react'

export default (props) => {
  return (
    <ListInput
      {...props}
      css={css`
        input[type='file'] {
          padding: 13px 0 0;
        }
      `}
    />
  )
}
