/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Callout, Label, ProgressIndicator, TextField } from '@fluentui/react'
import throttle from 'lodash.throttle'
import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import type { ReactElement } from 'react'
import { Fragment, useEffect, useRef } from 'react'
import { niceCase } from 'web.utils/src/niceCase'
import NiceValue from './NiceValue'

export const AutoComplete = observer(
  (props: {
    value: string
    name: string
    infix?: any
    list: (val: string) => Promise<any[]>
    onRenderRow?: (item: any) => ReactElement
    onChange?: (val: string) => void
    onSelect?: (val: any) => Promise<string>
  }) => {
    const meta = useLocalObservable(() => ({
      value: props.value,
      callout: false,
      hover: false,
      focus: false,
      loading: false,
      idx: 0,
      list: [] as any,
      width: 100,
    }))
    const ref = useRef(null as any)
    const { name, onChange } = props

    const loadList = throttle(async () => {
      runInAction(() => {
        if (ref.current) {
          meta.width = ref.current.offsetWidth
        }
        meta.loading = true
      })
      const list = await props.list(meta.value)
      runInAction(() => {
        meta.list = list
        meta.loading = false
        if (ref.current) {
          meta.width = ref.current.offsetWidth
        }
      })
    }, 1000)

    useEffect(
      action(() => {
        if (ref.current) {
          meta.width = ref.current.offsetWidth
        }
      }),
      []
    )
    const select = async () => {
      const row = meta.list[meta.idx]

      let value
      if (props.onSelect) {
        value = await props.onSelect(row)
      } else {
        if (typeof row !== 'object') {
          value = row + ''
        } else {
          value = row[Object.keys(row)[0]]
        }
      }
      runInAction(() => {
        meta.value = value
        meta.callout = false
        meta.hover = false
        meta.idx = 0
      })

      if (onChange) onChange(meta.value)
    }

    const renderRow = (row: any, active: boolean, idx) => {
      return (
        <div
          className="border-b border-gray-300"
          key={idx}
          css={css`
            ${active &&
            css`
              background: #cedbee;
              > div {
                opacity: 0.75;
              }
            `}
          `}
          onClick={
            props.onRenderRow
              ? undefined
              : () => {
                  select()
                }
          }
          onMouseOver={action(() => {
            meta.idx = idx
          })}
        >
          {(() => {
            if (props.onRenderRow) {
              return props.onRenderRow({ row, active, idx, select })
            }
            return (
              <div className="relative p-1 pointer-events-none">
                <NiceValue value={row} />
              </div>
            )
          })()}
        </div>
      )
    }

    return (
      <div className="relative flex flex-col">
        <Label>{niceCase(name)}</Label>
        {meta.callout && (
          <Callout
            target={ref}
            isBeakVisible={false}
            onDismiss={action(() => {
              if (!meta.hover && !meta.focus) {
                meta.callout = false
              }
            })}
          >
            <div
              onMouseOver={action(() => {
                meta.hover = true
              })}
              onMouseLeave={action(() => {
                meta.hover = false
              })}
              css={css`
                width: ${meta.width}px;
              `}
            >
              {meta.loading ? (
                <ProgressIndicator className="m-2" />
              ) : (
                <Fragment>
                  {meta.list.map((row: any, idx: number) => {
                    return renderRow(row, idx === meta.idx, idx)
                  })}
                  {meta.list.length === 0 && (
                    <div className="p-2 text-xs text-gray-400">Empty...</div>
                  )}
                </Fragment>
              )}
            </div>
          </Callout>
        )}
        <div
          ref={ref}
          css={css`
            height: 30px;
          `}
          className="absolute bottom-0 left-0 right-0 pointer-events-none "
        >
          {meta.width}
        </div>
        <div className="flex flex-row flex-1">
          <TextField
            className="flex-1"
            value={meta.value}
            onBlur={action(() => {
              if (!meta.hover) {
                meta.callout = false
              }
              meta.focus = false
            })}
            onKeyDown={action((e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                meta.idx = meta.idx > 0 ? meta.idx - 1 : meta.list.length - 1
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                meta.idx = meta.idx < meta.list.length ? meta.idx + 1 : 0
              } else if (e.key === 'Enter') {
                select()
              } else if (e.key === 'Escape') {
                runInAction(() => {
                  meta.hover = false
                  meta.callout = false
                })
              }
            })}
            onFocus={action(() => {
              meta.callout = !!meta.value
              meta.focus = true
              loadList()
            })}
            onChange={action((e, text) => {
              meta.value = text || ''
              if (props.value !== meta.value) {
                if (onChange) onChange(meta.value)
              }
              meta.callout = true
              loadList()
            })}
          />
          {props.infix || null}
        </div>
      </div>
    )
  }
)
