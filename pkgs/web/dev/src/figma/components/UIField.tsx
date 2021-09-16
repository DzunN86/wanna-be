/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Label, TextField } from '@fluentui/react'
import { action } from 'mobx'
import { observer } from 'mobx-react-lite'
import { ReactElement, useEffect } from 'react'
import { useState } from 'react'
import { sendParent } from '../ws'

interface IInputRow {
  label: any
  value: any
  onLabelChange?: (value: any, setLabel: (label: string) => void) => any
  onChange?: (value: any) => any
  placeholder?: string
  postfix?: ReactElement
  multiline?: boolean
}

export const InputRow = ({
  label,
  value,
  onChange,
  onLabelChange,
  postfix,
  placeholder,
  multiline,
}: IInputRow) => {
  const [tempLabel, setLabel] = useState(label)
  useEffect(() => {
    setLabel(label)
  }, [label])

  return (
    <div
      className="flex border-b border-gray-200"
      css={css`
        label {
          font-size: 11px;
        }
        .ms-TextField {
          height: 24px;
        }
        input {
          height: 22px;
        }
        .ms-TextField-fieldGroup {
          border: 0px;
          height: auto;
          min-height: 20px;
        }
      `}
    >
      {!onLabelChange ? (
        <Label className="w-1/4 border-r border-gray-200 flex items-start justify-end px-1">
          {label}
        </Label>
      ) : (
        <TextField
          value={tempLabel}
          onChange={(_, text) => {
            setLabel(text)
          }}
          onBlur={(e) => {
            onLabelChange(e.target.value, setLabel)
          }}
          className="w-1/4 border-r flex self-stretch border-gray-200"
          css={css`
            padding: 1px;
            .ms-TextField-fieldGroup,
            .ms-TextField-wrapper,
            .ms-TextField-field {
              border: 0px;
              height: 26px;
            }
            .ms-TextField-field {
              font-size: 11px;
              line-height: 19px;
              padding: 0px 6px;
              font-weight: 500;
              text-align: right;
            }
          `}
          spellCheck={false}
        />
      )}
      <div
        className="flex flex-1"
        css={css`
          padding-top: 1px;
          .ms-TextField-wrapper,
          .ms-TextField-fieldGroup {
            flex: 1;
            display: flex;
          }
          .ms-TextField-field {
            display: flex;
            align-items: center;
            padding: 4px 6px;
            font-size: 11px;
            line-height: 19px;
            min-height: 20px;
            font-family: 'SF Mono', SFMono-Regular, ui-monospace,
              'DejaVu Sans Mono', Menlo, Consolas, monospace;
          }
        `}
      >
        <TextField
          multiline={multiline === undefined ? true : multiline}
          autoAdjustHeight={true}
          value={value || ''}
          onChange={(_, text) => {
            onChange(text)
          }}
          placeholder={placeholder}
          spellCheck={false}
          rows={1}
          className={'flex-1 flex'}
        />
        {postfix}
      </div>
    </div>
  )
}

export const InputNodeData = observer(
  ({
    label,
    meta,
    name,
    root,
    placeholder,
    postfix,
    onChange,
    multiline,
  }: Omit<IInputRow, 'value'> & {
    meta: any
    name: string
    root?: boolean
  }) => {
    return (
      <InputRow
        label={label}
        value={meta[name]}
        placeholder={placeholder}
        postfix={postfix}
        multiline={multiline}
        onChange={action((value: string) => {
          if (onChange) {
            value = onChange(value)
          }
          meta[name] = value
          sendParent(root ? 'set-root-data' : 'set-node-data', {
            name,
            value: value || '',
          })
        })}
      />
    )
  }
)
