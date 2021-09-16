/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { ActionButton, IconButton } from '@fluentui/react/lib/Button'
import { Callout } from '@fluentui/react/lib/Callout'
import { Label } from '@fluentui/react/lib/Label'
import { action, runInAction } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import * as React from 'react'

type ISingleFilter = {
  value: any
  setValue: (value: any) => void
  onClear?: () => void
  onClose?: () => void
  dismiss?: () => void
  children: React.ReactElement | (({ dismiss }) => React.ReactElement)
  callout?: boolean
  label: string | React.ReactElement
}

export default (props: ISingleFilter) => {
  const { value, children, label, callout, setValue, onClear, onClose } = props
  const meta = useLocalObservable(() => ({
    show: false,
  }))
  const dismissing = React.useRef(false)
  const btnRef = React.useRef(null)
  return (
    <Observer>
      {() => {
        let valueContentEl = (
          <Label style={{ marginLeft: '2px' }}>{value || 'All'}</Label>
        )

        const _onClick = action(() => {
          if (!dismissing.current) meta.show = true
          dismissing.current = false
        })

        let valueNoCalloutEl = React.isValidElement(value) ? (
          value
        ) : (
          <ActionButton onClick={_onClick}> {valueContentEl}</ActionButton>
        )

        if (typeof value === 'function') {
          valueNoCalloutEl = value(meta)
        }

        const btnContent = (
          <React.Fragment>
            <Label style={{ fontWeight: 'normal', fontSize: 14 }}>
              {typeof label === 'string' ? `${label}: ` : label}
            </Label>
            {callout === false ? valueNoCalloutEl : valueContentEl}
          </React.Fragment>
        )

        const _remove = () => {
          runInAction(() => {
            meta.show = false
          })
          setValue(undefined)
          if (onClear) {
            onClear()
          } else if (onClose) {
            onClose()
          }
        }

        const _onDismiss = () => {
          runInAction(() => {
            meta.show = false
          })
          if (onClose) {
            onClose()
          }
        }

        return (
          <React.Fragment>
            <div ref={btnRef} className="filter-item">
              {callout === false ? (
                <div
                  className="flex flex-row ms-Button"
                  css={css`
                    height: 30px;
                    align-items: center;
                    border: 1px solid #ddd;
                    overflow: hidden;
                    border-radius: 2px;
                    cursor: pointer !important;
                    outline: none !important;
                    &:hover {
                      border: 1px solid #0d4e98 !important;
                    }

                    ${!!value &&
                    css`
                      border: 1px solid #0d4e98 !important;
                      background: rgb(255, 255, 255);
                      background: linear-gradient(
                        0deg,
                        rgba(255, 255, 255, 1) 30%,
                        rgba(13, 78, 152, 0.1) 100%
                      );
                    `}
                    .ms-Button {
                      border: 0px;
                    }

                    > .ms-Dropdown-container > .ms-Dropdown-title {
                      background: transparent;
                    }

                    .ms-Label {
                      cursor: pointer !important;
                      color: ${!!value ? '#0D4E98' : '#666'};
                    }
                  `}
                >
                  {btnContent}
                </div>
              ) : (
                <ActionButton
                  onClick={_onClick}
                  css={css`
                    cursor: pointer !important;
                    outline: none !important;
                    &:hover {
                      border: 1px solid #0d4e98 !important;
                    }

                    ${!!value &&
                    css`
                      border: 1px solid #0d4e98 !important;
                      background: rgb(255, 255, 255);
                      background: linear-gradient(
                        0deg,
                        rgba(255, 255, 255, 1) 30%,
                        rgba(13, 78, 152, 0.1) 100%
                      );
                    `}
                    .ms-Label {
                      cursor: pointer !important;
                      color: ${!!value ? '#0D4E98' : '#666'};
                    }
                  `}
                >
                  {' '}
                  {btnContent}
                </ActionButton>
              )}
            </div>

            {meta.show && (
              <Callout
                onDismiss={_onDismiss}
                setInitialFocus={true}
                target={btnRef.current}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingRight: 10,
                  }}
                >
                  {typeof children === 'function'
                    ? children({
                        dismiss: action(() => {
                          meta.show = false
                          dismissing.current = true
                        }),
                      })
                    : children}
                  <IconButton
                    iconProps={{ iconName: 'Trash' }}
                    onClick={_remove}
                  />
                </div>
              </Callout>
            )}
          </React.Fragment>
        )
      }}
    </Observer>
  )
}
