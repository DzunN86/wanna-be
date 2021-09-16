/** @jsx jsx */
import { jsx } from '@emotion/react'
import { Observer } from 'mobx-react-lite'

export const Data = (props: any) => {
  return (
    <div>
      <Observer>
        {() => {
          return <div>Data</div>
        }}
      </Observer>
    </div>
  )
}