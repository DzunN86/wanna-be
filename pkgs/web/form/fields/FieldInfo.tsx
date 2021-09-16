/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Icon } from '@fluentui/react'

export const FieldInfo = (props: { warning?: string }) => {
  const { warning } = props

  if (!warning) return null

  return (
    <div
      css={css`
        margin-top: -16px;
        position: relative;
        .icon {
          font-size: 13px;
        }
        .text {
          font-size: 12px;
        }
        .line {
          border-top: 2px solid red;
          width: 100%;
        }
      `}
    >
      <div className="absolute line"></div>
      {warning && (
        <div className="flex flex-row items-center p-1 text-yellow-600">
          <Icon iconName="Warning" className="font-bold icon" />{' '}
          <div className="ml-1 font-normal text">{warning}</div>
        </div>
      )}
    </div>
  )
}
