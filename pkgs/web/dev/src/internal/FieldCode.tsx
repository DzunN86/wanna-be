/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { DefaultButton, Label, Spinner } from '@fluentui/react'
import Editor, { loader, useMonaco } from '@monaco-editor/react'
import { action } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import { Fragment, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../../utils/src/api'

loader.config({
  paths: { vs: '/__ext/monaco/vs' },
})

export const FieldCode = ({ title, value, defaultValue, onChange }) => {
  const meta = useLocalObservable(() => ({
    isOpen: false,
    value,
  }))

  const monaco: any = useMonaco()
  let div = document.querySelector('#field-code')
  if (!div) {
    const root = document.querySelector('#root')
    div = document.createElement('div')
    div.setAttribute('id', 'field-code')
    root?.appendChild(div)
  }

  useEffect(
    action(() => {
      meta.value = value || defaultValue
    }),
    [value]
  )

  return (
    <div className="flex flex-col">
      <Label>{title}</Label>
      <DefaultButton
        iconProps={{ iconName: 'FileCode' }}
        onClick={action(() => {
          meta.isOpen = true
        })}
        css={css`
          background: #f1f2ff;
          padding-left: 3px;
        `}
      >
        <Label
          css={css`
            margin-left: 0px;
            text-align: left;
            font-size: 12px;
            cursor: pointer;
          `}
          className="flex flex-row justify-between flex-1"
        >
          <span>Edit Code</span>
          <span>{humanFileSize((meta.value || '').length)}</span>
        </Label>
      </DefaultButton>
      <Observer>
        {() => {
          if (!meta.isOpen) return null

          return (
            div &&
            createPortal(
              <Fragment>
                <div
                  onClickCapture={action((e) => {
                    meta.isOpen = false
                    e.stopPropagation()
                    e.preventDefault()
                  })}
                  className="fixed inset-0 z-50 w-full h-full bg-gray-800 opacity-75"
                ></div>

                <div
                  className="fixed overflow-hidden "
                  css={css`
                    width: 90vw;
                    height: 90vh;
                    top: 5vh;
                    z-index: 100;
                    left: 5vw;
                  `}
                >
                  <Editor
                    loading={<Spinner />}
                    options={{
                      fontFamily:
                        '"Jetbrains Mono","SF Mono",Monaco,Menlo,Consolas,"Ubuntu Mono","Liberation Mono","DejaVu Sans Mono","Courier New",monospace',
                      wordWrap: 'on',
                    }}
                    onChange={action((newval) => {
                      meta.value = newval
                      onChange(newval)
                    })}
                    defaultLanguage={'typescript'}
                    value={meta.value}
                  />
                </div>
              </Fragment>,
              div
            )
          )
        }}
      </Observer>
    </div>
  )
}
function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024

  if (Math.abs(bytes) < thresh) {
    return bytes + ' byte' + (bytes > 1 ? 's' : '')
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10 ** dp

  do {
    bytes /= thresh
    ++u
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  )

  return bytes.toFixed(dp) + ' ' + units[u].toLowerCase()
}
