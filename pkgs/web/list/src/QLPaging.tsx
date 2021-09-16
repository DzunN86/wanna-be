/** @jsx jsx */
import { jsx } from '@emotion/react'
import { Observer } from 'mobx-react-lite'

export const QLPaging = (props: any) => {
  return (
    <div>
      <Observer>
        {() => {
          return <div>QLPaging</div>
        }}
      </Observer>
    </div>
  )
}
