/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  DirectionalHint,
  FocusTrapCallout,
  Icon,
  Label,
  PrimaryButton,
} from '@fluentui/react'
import set from 'lodash.set'
import trim from 'lodash.trim'
import { action, runInAction, toJS } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import { Fragment, ReactElement, useEffect, useRef, useState } from 'react'
import { makeEmpty } from 'web.utils/src/makeEmpty'
import { niceCase } from 'web.utils/src/niceCase'
import { picomatch } from 'web.utils/src/picomatch'
import { useRender } from 'web.utils/src/useRender'
import { Field, IFieldAlter } from './Field'
import { detectType } from './FieldUtil'
import NiceValue from './NiceValue'

interface IJsonArray {
  value: any
  name: string
  mode?: 'inline' | 'popup'
  original?: any
  fieldProps?: any
  metaRef?: { current: any }
  onChange: (value: any) => void
  alter?: IFieldAlter
  loadingComponent?: ReactElement
  arrayOptions: any
  useRenderField: any
}

export interface IJsonArrayItem {
  index: number
  metaRef?: { current: any }
  fieldProps?: any
  value: any
  name: string
  mode?: 'inline' | 'popup'
  alter?: IFieldAlter
  array: any[]
  onChange: (val: any) => void
  remove: (idx: number) => void
  meta: IMeta
  useRenderField: any
  localRender: () => void
}

interface IMeta {
  swap: number
  edit: number
  original: any
  emptyItem: any
  lastAction: string
}

export const JsonArray = (props: IJsonArray) => {
  const {
    name,
    useRenderField,
    value,
    fieldProps,
    original,
    onChange,
    metaRef,
    alter,
    mode,
  } = props
  const final = useRef(null as any)
  const render = useRender()
  const meta = useLocalObservable<IMeta>(() => ({
    swap: -1,
    edit: -1,
    original: toJS(original) || toJS(value),
    emptyItem: makeEmpty((original || value)[0]),
    lastAction: '',
  }))

  const renderArrayItems = () => {
    final.current = value.map((v, k) => {
      let mref = { current: {} }
      if (metaRef && metaRef.current) {
        if (!metaRef.current[`${name}-${k}`]) {
          metaRef.current[`${name}-${k}`] = { current: {} }
        }
        mref = metaRef.current[`${name}-${k}`]
      }
      return (
        <ArrayItem
          key={k}
          {...{
            name,
            index: k,
            value: v,
            alter: alter,
            array: value,
            metaRef: mref,
            useRenderField: useRenderField,
            fieldProps: fieldProps,
            remove: (index) => {
              value.splice(index, 1)
              renderArrayItems()
              render()
              onChange(value)
            },
            onChange,
            localRender: () => {
              renderArrayItems()
              render()
            },
            mode: !mode ? 'popup' : mode,
            meta,
          }}
        />
      )
    })
  }

  if (!final.current) renderArrayItems()

  return (
    <Observer>
      {() => {
        return (
          <div className={` flex flex-col`}>
            <Header
              {...props}
              meta={meta}
              localRender={() => {
                renderArrayItems()
                render()
              }}
            />
            <div
              className={`flex-1 flex flex-col mb-2`}
              css={css`
                /* max-height: 500px;
                overflow: auto; */
              `}
            >
              {final.current}
            </div>
          </div>
        )
      }}
    </Observer>
  )
}

const Header = ({
  name,
  value,
  onChange,
  meta,
  localRender,
}: IJsonArray & {
  meta: IMeta
  localRender: () => void
}) => {
  const emptyItem = toJS(meta.emptyItem)
  const _push = () => {
    runInAction(() => {
      meta.lastAction = 'add'
    })
    value.push(emptyItem)
    localRender()
    onChange(value)

    setTimeout(() => {
      runInAction(() => {
        meta.edit = value.length - 1
      })
    })
  }
  const _reset = () => {
    runInAction(() => {
      meta.lastAction = 'reset'
    })
    if (confirm(`Reset list ${name} to original value?`)) {
      value.splice(0, value.length)
      for (let v of meta.original) {
        value.push(toJS(v))
      }
      onChange(toJS(meta.original))
      localRender()
    }
  }
  return (
    <Observer>
      {() => (
        <div className="flex flex-row items-center justify-between border-b border-gray-300 select-none">
          <div
            className="flex flex-row items-center flex-1"
            css={css`
              min-height: 30px;
            `}
          >
            {name && (
              <Label className="mr-2">{niceCase(name.toString())} </Label>
            )}

            {meta.swap >= 0 ? (
              <Label
                className="px-2 py-0 mr-2 text-gray-500 border border-gray-200 rounded-sm"
                css={css`
                  font-size: 10px;
                `}
              >
                Swapping #{meta.swap + 1}
              </Label>
            ) : (
              <Label
                className="px-2 py-0 mr-2 bg-gray-100 border border-gray-200 rounded-sm"
                css={css`
                  font-size: 10px;
                  height: auto;
                  min-height: 0px;
                `}
              >
                {value.length} item
                {value.length > 1 ? 's' : ''}
              </Label>
            )}
          </div>
          <div className="flex flex-row">
            <Label
              css={css`
                font-size: 10px;
              `}
              className="flex items-center px-3 py-1 ml-2 text-gray-500 transition-all rounded-sm cursor-pointer hover:bg-gray-300"
              onClick={_reset}
            >
              Reset
            </Label>
            <Label
              css={css`
                font-size: 10px;
              `}
              className="flex items-center px-3 py-1 ml-2 text-white transition-all bg-blue-500 rounded-sm cursor-pointer hover:bg-gray-700"
              onClick={_push}
            >
              + New Item
            </Label>
          </div>
        </div>
      )}
    </Observer>
  )
}

const ArrayItem = (props: IJsonArrayItem) => {
  const {
    name,
    index: k,
    value: v,
    fieldProps,
    array: value,
    alter,
    remove,
    onChange,
    metaRef,
    useRenderField,
    mode,
    meta,
    localRender,
  } = props
  const ref = useRef(null as any)
  const valueEditRef = useRef(null as any)

  return (
    <Observer key={k}>
      {() => {
        let isSingle = true

        let t = detectType(v) as any
        let singleVal = v
        if (t === 'json' || t === 'array') {
          if (alter && Object.keys(alter.replacer).length > 0) {
            singleVal = Array.isArray(v) ? [...v] : { ...v }

            for (const key of Object.keys(singleVal)) {
              const path = trim(
                [...alter.lastPath.split('.'), k, key].join('.'),
                '.'
              )
              for (let [rk, rv] of Object.entries(alter.replacer)) {
                if (picomatch.isMatch(path, rk)) {
                  if (!rv) {
                    delete singleVal[key]
                  }
                }
              }
            }
          }

          isSingle = false
          if (Array.isArray(singleVal)) {
            t = 'array'
            if (singleVal.length === 1) {
              isSingle = true
              singleVal = singleVal[0]
            } else if (singleVal.length === 2) {
              const type1 = detectType(singleVal[0])
              const type2 = detectType(singleVal[1])
              if (
                type1 !== 'json' &&
                type1 !== 'array' &&
                type2 !== 'json' &&
                type2 !== 'array'
              )
                isSingle = true
            }
          } else {
            const keys = Object.keys(singleVal)
            if (keys.length === 1) {
              isSingle = true
            } else if (keys.length === 2) {
              const type1 = detectType(singleVal[keys[0]])
              const type2 = detectType(singleVal[keys[1]])
              if (
                type1 !== 'json' &&
                type1 !== 'array' &&
                type2 !== 'json' &&
                type2 !== 'array'
              )
                isSingle = true
            }
          }
        }

        return (
          <div
            key={k}
            className={
              (k > 0 ? 'border-t-0' : '') +
              ' flex  items-stretch text-xs border border-gray-200'
            }
            css={css`
              margin-top: -1px;
              .btns {
                display: none;
              }
              ${k % 2 !== 0 &&
              css`
                border-top: 1px dashed #aaa;
                border-bottom: 1px dashed #aaa;
                background: #fafafa;
              `}

              &:hover {
                .idx {
                  display: none;
                }
                .btns {
                  display: flex;
                }
              }
            `}
          >
            <div
              ref={ref}
              css={css`
                width: 50px;

                &.active {
                  background: #3b82f6;
                  color: white;
                }

                .btn {
                  display: flex;
                  flex: 1;
                  cursor: pointer;
                  align-items: center;
                  justify-content: center;

                  &.active {
                    background: #3b82f6;
                    color: white;
                  }

                  &:hover {
                    color: white;
                    background: #9bb9f1;
                  }
                }
              `}
              className={
                'flex items-stretch justify-center text-xs font-semibold border-r border-gray-200 ' +
                (meta.swap === k ? ' active' : '')
              }
            >
              <div className="flex items-center idx">{k + 1}</div>
              <div className={'items-stretch flex-1 select-none btns '}>
                <div
                  className="btn"
                  onClick={() => {
                    if (meta.lastAction !== 'remove') {
                      if (confirm('Remove item #' + (k + 1) + '?')) {
                        runInAction(() => {
                          meta.lastAction = 'remove'
                        })
                        remove(k)
                      }
                    } else {
                      remove(k)
                    }
                  }}
                >
                  <Icon iconName="Trash" />
                </div>
                {!isSingle && mode !== 'inline' && (
                  <Fragment>
                    <div
                      className="btn"
                      onClick={action(() => {
                        meta.edit = k
                      })}
                    >
                      <Icon iconName="Edit" />
                    </div>
                    <ArrayItemEdit
                      k={k}
                      alter={alter}
                      useRenderField={useRenderField}
                      t={t}
                      rowRef={ref}
                      remove={remove}
                      isOpen={meta.edit === k}
                      dismiss={action(() => {
                        meta.edit = -1
                      })}
                      metaRef={metaRef}
                      name={name}
                      value={value}
                      onChange={(newval: any) => {
                        runInAction(() => {
                          value[k] = newval
                        })
                        onChange([...value])
                      }}
                      meta={meta}
                      localRender={localRender}
                    />
                  </Fragment>
                )}
                <div
                  className={'btn '}
                  onClick={action(() => {
                    meta.lastAction = 'edit'
                    if (meta.swap < 0) {
                      meta.swap = k
                    } else {
                      if (meta.swap !== k) {
                        const temp = value[meta.swap]
                        value[meta.swap] = value[k]
                        value[k] = temp
                        onChange(value)
                        localRender()
                      }
                      meta.swap = -1
                    }
                  })}
                >
                  <Icon iconName="SwitcherStartEnd" />
                </div>
              </div>
            </div>
            <div
              className="flex flex-row items-center flex-1"
              css={css`
                padding: 2px;
                overflow: hidden;
                ${isSingle &&
                css`
                  > div {
                    flex: 1;
                    margin: 0;
                    padding: 0;
                  }
                `}
              `}
            >
              {isSingle ? (
                t === 'json' || t === 'array' ? (
                  <div className="flex flex-1">
                    <div className="flex items-center flex-1 p-2 pt-0">
                      {Object.keys(singleVal).map((e, idx) => {
                        const stype = detectType(singleVal[e], e)
                        const singleField = (
                          <Field
                            useRenderField={props}
                            metaRef={metaRef}
                            name={`${k}.${e}`}
                            alter={alter}
                            onChange={(newval) => {
                              value[k][e] = newval
                              onChange([...value])
                            }}
                            key={e}
                            value={singleVal[e]}
                            type={stype}
                          />
                        )
                        if (stype === 'array') {
                          return singleField
                        }
                        return (
                          <div
                            key={e}
                            className="flex flex-row items-center flex-1"
                            css={css`
                              margin: 0px;
                              padding: 0px;
                              > div {
                                flex: 1;
                                margin: -1px;
                                padding: 0;
                              }
                              ${idx === 1 &&
                              css`
                                margin-left: 10px !important;
                              `}
                            `}
                          >
                            {singleField}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <Field
                    name="_"
                    metaRef={metaRef}
                    alter={alter}
                    useRenderField={useRenderField}
                    onChange={(newval) => {
                      value[k] = newval
                      onChange([...value])
                    }}
                    fieldProps={fieldProps}
                    value={singleVal}
                    type={t}
                  />
                )
              ) : mode === 'inline' ? (
                <div
                  className="flex flex-1"
                  css={css`
                    > div {
                      flex: 1;
                    }
                  `}
                >
                  <Field
                    metaRef={metaRef}
                    name="_"
                    value={v}
                    useRenderField={useRenderField}
                    alter={alter}
                    fieldProps={{ colNum: 1, ...fieldProps }}
                    onChange={(newval) => {
                      value[k] = newval
                      onChange([...value])
                    }}
                  />
                </div>
              ) : (
                <Fragment>
                  <NiceValue
                    value={singleVal}
                    alter={alter}
                    compact={true}
                    onValueClick={(e, key, value) => {
                      let el = e.target
                      while (el.nodeName !== 'TD') {
                        el = el.parentElement
                      }

                      valueEditRef.current = {
                        el: el.querySelector('i'),
                        key,
                        value,
                      }
                      localRender()
                    }}
                  />

                  {valueEditRef.current && (
                    <FocusTrapCallout
                      target={valueEditRef.current.el}
                      onDismiss={() => {
                        valueEditRef.current = null
                        localRender()
                      }}
                      gapSpace={0}
                      preventDismissOnScroll={true}
                      shouldDismissOnWindowFocus={false}
                      preventDismissOnResize={true}
                      preventDismissOnLostFocus={true}
                      preventDismissOnEvent={(ev) => {
                        return true
                      }}
                      minPagePadding={50}
                      directionalHint={DirectionalHint.topCenter}
                      calloutMaxWidth={(90 / 100) * window.innerWidth}
                      calloutMaxHeight={(90 / 100) * window.innerHeight}
                    >
                      <div
                        className="pb-2"
                        css={css`
                          min-width: 300px;
                        `}
                      >
                        <PrimaryButton
                          className="absolute top-0 right-0 z-10 mx-2 my-1"
                          css={css`
                            font-size: 12px;
                            padding: 10px;
                            height: 20px;
                          `}
                          onClick={() => {
                            valueEditRef.current = null
                            localRender()
                          }}
                        >
                          Done
                        </PrimaryButton>

                        <Field
                          metaRef={metaRef}
                          useRenderField={useRenderField}
                          name={`${
                            alter && alter?.lastPath
                              ? alter?.lastPath + '.'
                              : ''
                          }${k}.${valueEditRef.current.key}`}
                          type={detectType(
                            valueEditRef.current.value,
                            `${k}.${valueEditRef.current.key}`
                          )}
                          value={valueEditRef.current.value}
                          alter={alter}
                          original={valueEditRef.current.value}
                          onChange={action((newval) => {
                            console.log(`${k}.${valueEditRef.current.key}`)
                            set(
                              value,
                              `${k}.${valueEditRef.current.key}`,
                              newval
                            )
                            onChange([...value])
                          })}
                        />
                      </div>
                    </FocusTrapCallout>
                  )}
                </Fragment>
              )}
            </div>
          </div>
        )
      }}
    </Observer>
  )
}

const ArrayItemEdit = ({
  name,
  k,
  t,
  value,
  localRender,
  useRenderField,
  alter,
  rowRef,
  isOpen,
  dismiss,
  meta,
  remove,
  metaRef,
  onChange,
}) => {
  const changes = useRef(toJS(value[k]) as any)
  const original = useRef(toJS(value[k]) as any)
  const [state, setState] = useState(changes.current)
  const [minHeight, setMinHeight] = useState(0)
  const ref = useRef(null as any)
  const ival = useRef(null as any)

  useEffect(() => {
    if (isOpen) {
      ival.current = setInterval(() => {
        if (ref.current && minHeight < ref.current.offsetHeight) {
          setMinHeight(ref.current.offsetHeight)
        }
      }, 1000)
    }
    return () => {
      clearInterval(ival.current)
    }
  }, [isOpen])

  return (
    <Fragment>
      {isOpen && (
        <FocusTrapCallout
          gapSpace={0}
          preventDismissOnScroll={true}
          shouldDismissOnWindowFocus={false}
          preventDismissOnResize={true}
          preventDismissOnLostFocus={true}
          preventDismissOnEvent={(ev) => {
            return true
          }}
          minPagePadding={50}
          target={rowRef.current}
          directionalHint={DirectionalHint.topCenter}
          calloutMaxWidth={(90 / 100) * window.innerWidth}
          calloutMaxHeight={(90 / 100) * window.innerHeight}
        >
          <div
            className="flex flex-col items-stretch"
            css={css`
              min-width: 450px;
              min-height: ${Math.max(0, minHeight)}px;
            `}
            ref={ref}
          >
            <div
              className="flex items-center justify-between mb-1 bg-gray-100 border-b border-gray-300 flex-rows"
              css={css`
                padding: 2px 12px;
              `}
            >
              <Label>
                {niceCase(name)} #{k + 1}
              </Label>
              <div className="flex items-center justify-end flex-1">
                <Icon
                  css={css`
                    color: #640202;
                    margin-right: 4px;
                    height: 20px;
                    cursor: pointer;
                  `}
                  iconName="Trash"
                  onClick={() => {
                    if (confirm('Remove item?')) {
                      remove(k)
                      dismiss()
                    }
                  }}
                ></Icon>
                <Icon
                  css={css`
                    color: #026423;
                    margin-right: 4px;
                    height: 20px;
                    cursor: pointer;
                  `}
                  iconName="Copy"
                  onClick={() => {
                    dismiss()
                    value.push(JSON.parse(JSON.stringify(value[k])))
                    localRender()
                    setTimeout(() => {
                      runInAction(() => {
                        meta.edit = value.length - 1
                      })
                    })
                  }}
                ></Icon>
                <PrimaryButton
                  css={css`
                    font-size: 12px;
                    padding: 10px;
                    height: 20px;
                  `}
                  onClick={() => {
                    onChange(changes.current)
                    dismiss()
                  }}
                >
                  Done
                </PrimaryButton>
              </div>
            </div>
            <div
              className="flex flex-1 mx-1 mb-2 overflow-auto "
              css={css`
                > .px-2 {
                  flex: 1;
                }
                margin-top: ${typeof value[k] === 'object' ? '0px' : '5px'};
              `}
            >
              <Field
                metaRef={metaRef}
                name={Array.isArray(state) ? '' : k}
                type={t}
                value={state}
                alter={alter}
                original={original.current}
                useRenderField={useRenderField}
                onChange={action((newval) => {
                  changes.current = newval
                  if (newval === original.current) {
                    setState(newval)
                  }
                })}
              />
            </div>
          </div>
        </FocusTrapCallout>
      )}
    </Fragment>
  )
}
