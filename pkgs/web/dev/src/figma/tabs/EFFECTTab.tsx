/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Effect } from '../components/Effect'

export const EFFECTTab = ({ node, loading }: any) => {
  return (
    <div
      className="relative flex-1"
      css={css`
        .cursors-layer .monaco-mouse-cursor-text {
          background: black;
          position: absolute;
        }
      `}
    >
      {node && <Effect node={node} />}
    </div>
  )
}
