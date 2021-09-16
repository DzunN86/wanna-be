/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Icon } from '@fluentui/react'
import startCase from 'lodash.startcase'
import trim from 'lodash.trim'
import { action } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import React from 'react'
import { picomatch } from 'web.utils/src/picomatch'
import EmptyCell from './EmptyValue'

const NiceValue = ({
  value,
  style,
  alter,
  compact: isCompact,
  onValueClick,
  lastKey,
}: {
  value: any
  style?: any
  alter?: any
  lastKey?: string
  onValueClick?: (e: any, key: string, value: any) => any
  compact?: boolean
}) => {
  const meta = useLocalObservable(() => ({
    expanded: {} as any,
  }))

  return (
    <Observer>
      {() => {
        let valueEl: any = null
        let compact = isCompact === undefined ? true : isCompact

        if (typeof value === 'object') {
          if (value === null) {
            valueEl = null
          } else {
            let keys = Object.keys(value)

            if (keys.indexOf('id') >= 0) {
              keys.splice(keys.indexOf('id'), 1)
            }

            if (Array.isArray(value)) {
              if (value.length === 0) return <EmptyCell />

              valueEl = (
                <React.Fragment>
                  {value.map((e, idx) => {
                    if (typeof e !== 'object') {
                      return (
                        <div
                          key={idx}
                          className="px-2 mr-1 border border-gray-200"
                        >
                          <NiceValue
                            lastKey={[lastKey || '', idx].join('.')}
                            onValueClick={onValueClick}
                            value={e}
                            alter={alter}
                            compact={compact}
                          />
                        </div>
                      )
                    } else {
                      return (
                        <NiceValue
                          lastKey={[lastKey || '', idx].join('.')}
                          onValueClick={onValueClick}
                          value={e}
                          alter={alter}
                          key={idx}
                          compact={compact}
                        />
                      )
                    }
                  })}
                </React.Fragment>
              )
            } else {
              valueEl =
                keys.length === 1 ? (
                  <div>
                    <NiceValue
                      lastKey={[lastKey || '', keys[0]].join('.')}
                      onValueClick={onValueClick}
                      value={value[keys[0]]}
                      alter={alter}
                      compact={compact}
                    />
                  </div>
                ) : (
                  compact && (
                    <div className="flex flex-1 m-1">
                      <table
                        cellPadding={0}
                        cellSpacing={0}
                        css={css`
                          flex: 1;
                          background: white;
                        `}
                        style={{
                          borderCollapse: 'collapse',
                          ...style,
                        }}
                      >
                        <tbody>
                          {keys.map((key: string, idx: number) => {
                            const canExpand =
                              compact &&
                              (typeof value[key] === 'object' ||
                                (typeof value[key] === 'string' &&
                                  value[key].length > 100))

                            const isExpanded = canExpand
                              ? meta.expanded[key]
                              : true

                            // if (canExpand && !isExpanded && idx >= 2) return null

                            const expand = action((e, valueClick = true) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (compact) {
                                const selection: any = window.getSelection()
                                if (selection.type != 'Range') {
                                  if (
                                    meta.expanded[key] ||
                                    (!meta.expanded[key] &&
                                      (typeof value[key] !== 'object' ||
                                        (typeof value[key] === 'object' &&
                                          !!value[key] &&
                                          Object.keys(value[key]).length <= 2)))
                                  ) {
                                    if (valueClick && onValueClick) {
                                      onValueClick(
                                        e,
                                        trim(
                                          [lastKey || '', `${key}`].join('.'),
                                          '.'
                                        ),
                                        value[key]
                                      )
                                      return
                                    }
                                  }

                                  meta.expanded[key] = !meta.expanded[key]
                                }
                              } else {
                                if (valueClick && onValueClick) {
                                  onValueClick(
                                    e,
                                    trim(
                                      [lastKey || '', `${key}`].join('.'),
                                      '.'
                                    ),
                                    value[key]
                                  )
                                  return
                                }
                              }
                            })

                            const finalRender = ({
                              key,
                              canExpand,
                              isExpanded,
                              expand,
                              value,
                            }) => {
                              return (
                                <tr key={key} style={{ verticalAlign: 'top' }}>
                                  <td
                                    onClick={(e) => expand(e, false)}
                                    style={{
                                      cursor: 'pointer',
                                      border: '1px solid #ddd',
                                      padding: 6,
                                      paddingTop: 2,
                                      paddingBottom: 2,
                                      width: 100,
                                      fontSize: 13,
                                      whiteSpace: 'nowrap',
                                    }}
                                    className="select-none hover:bg-blue-100"
                                  >
                                    {startCase(key)}
                                  </td>
                                  <td
                                    style={{
                                      border: '1px solid #ddd',
                                      padding: 6,
                                      paddingTop: 2,
                                      paddingBottom: 2,
                                      fontSize: 13,
                                      wordBreak: 'break-all',
                                      wordWrap: 'break-word',
                                      whiteSpace: 'pre-wrap',
                                    }}
                                    className="hover:bg-blue-100"
                                  >
                                    <div
                                      style={{
                                        ...(!isExpanded
                                          ? {
                                              maxHeight: '35px',
                                              overflow: 'hidden',
                                              cursor: 'pointer',
                                            }
                                          : {}),
                                        marginLeft: -4,
                                        marginRight: -4,
                                      }}
                                      className={`flex flex-row ${
                                        onValueClick ? 'cursor-pointer' : ''
                                      }`}
                                      css={css`
                                        position: relative;
                                        transition: all 0.3s;
                                        i {
                                          padding: 1px 3px;
                                          font-size: 10px;
                                          opacity: 0.1;
                                          pointer-events: none;
                                        }
                                        &:hover {
                                          > i {
                                            opacity: 1;
                                          }
                                        }
                                      `}
                                      onClick={(e) => expand(e, true)}
                                    >
                                      {!isExpanded ? (
                                        <div
                                          className="absolute inset-0 z-10 bg-white bg-opacity-75"
                                          onClick={(e) => expand(e, false)}
                                        ></div>
                                      ) : null}

                                      {onValueClick && <Icon iconName="Edit" />}
                                      <div
                                        className="flex flex-wrap flex-1"
                                        css={css`
                                          > div {
                                            flex-grow: 1;
                                            flex-basis: 33%;
                                          }
                                        `}
                                      >
                                        <NiceValue
                                          lastKey={[lastKey || '', key].join(
                                            '.'
                                          )}
                                          onValueClick={onValueClick}
                                          alter={alter}
                                          value={value[key]}
                                          compact={compact}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )
                            }

                            if (alter) {
                              const path = trim(
                                [...alter.lastPath.split('.'), key].join('.'),
                                '.'
                              )
                              for (let [k, v] of Object.entries(
                                alter.replacer
                              )) {
                                if (picomatch.isMatch(path, k)) {
                                  if (!!v) {
                                    return finalRender({
                                      key,
                                      canExpand,
                                      isExpanded,
                                      expand,
                                      value,
                                    })
                                  }
                                  return null
                                }
                              }
                            }

                            return finalRender({
                              key,
                              canExpand,
                              isExpanded,
                              expand,
                              value,
                            })
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )
            }
          }
        } else {
          if (typeof value === 'string') {
            valueEl = (
              <div
                className="nicevalue"
                dangerouslySetInnerHTML={{ __html: value || ' - ' }}
              />
            )
          } else {
            valueEl = <div className="nicevalue">{value}</div>
          }
        }
        return valueEl
      }}
    </Observer>
  )
}

export default NiceValue
