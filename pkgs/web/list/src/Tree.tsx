/** @jsx jsx */
import { jsx } from '@emotion/react'
import type { ReactElement } from 'react'

interface ITreeProps {
  data: any
  childKey?: string
  children: (props: {
    item: any
    index: number
    renderChild: (data: any[]) => ReactElement
  }) => ReactElement
}

export const Tree = (props: ITreeProps) => {
  if (!props.childKey) {
    return <pre>{JSON.stringify(props.data, null, 2)}</pre>
  }

  const renderTree = (data: any[]) => {
    return data.map((e, idx) => {
      return props.children({ item: e, index: idx, renderChild: renderTree })
    })
  }

  return <div className="flex flex-col">{renderTree(props.data)}</div>
}
