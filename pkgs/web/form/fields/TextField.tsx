/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Label, Modal, TextField, values } from '@fluentui/react'
import trim from 'lodash.trim'
import { action, runInAction } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import { lazy, ReactElement, Suspense, useEffect, useRef } from 'react'
import { waitUntil } from 'web.utils/src/waitUntil'
import { Loading } from './Loading'

const TextRTE = lazy(() => import('./TextRTE'))
interface IProps {
  style?: any
  alter?: any
  label?: string
  loadingComponent?: ReactElement
  required?: boolean
  multiline?: boolean
  metaRef?: { current: any }
  onFocus?: (e: any) => {}
  onBlur?: (e: any) => {}
  onKeyDown?: (e: any) => {}
  onKeyUp?: (e: any) => {}
  onReady?: (e: { setValue: (value: string) => void }) => void
  onChange: (text: string | undefined) => void
  value: string
  type: string,
  readOnly?: boolean
}

export default ({
  label,
  value,
  onChange,
  type,
  multiline,
  required,
  loadingComponent,
  onFocus,
  onBlur,
  alter,
  onKeyDown,
  onKeyUp,
  onReady,
  metaRef,
  readOnly=false
}: IProps) => {
  let stringValue = value
  if (typeof value !== 'string') {
    stringValue = value + ''
  }
  const rteValue = useRef(stringValue)
  const htmlRef = useRef(null as any)
  const meta = useLocalObservable(() => ({
    value: stringValue,
    isChanged: false,
    editorOpen: metaRef?.current.editorOpen || false,
    type,
    htmlHeight: 0,
    multiline,
  }))

  useEffect(
    action(() => {
      meta.value = value
    }),
    [value]
  )

  useEffect(() => {
    if (onReady) {
      onReady({
        setValue: action((value) => {
          meta.value = value
        }),
      })
    }

    let ro: ResizeObserver | null = null
    waitUntil(() => htmlRef.current).then((e) => {
      const div = htmlRef.current
      if (div) {
        ro = new ResizeObserver(() => {
          runInAction(() => {
            meta.htmlHeight = getAbsoluteHeight(div)
          })
        })
        ro.observe(div)
      }
    })
    return () => {
      if (ro && htmlRef.current instanceof Element) {
        ro.unobserve(htmlRef.current)
      }
    }
  }, [])

  return (
    <Observer>
      {() => {
        let render: any = null
        const editorOpen = meta.editorOpen
        const setEditorOpen = action((val: boolean) => {
          if (metaRef && metaRef.current) {
            metaRef.current.editorOpen = val
          }
          meta.editorOpen = val
        })
        const _onChange = action((e, text) => {
          if (type === 'phone') {
            text = text.replace(/\D/gi, '')
          }

          if (meta.value !== text) meta.isChanged = true
          meta.value = text

          if (meta.isChanged) {
            if (type === 'number') {
              onChange(parseInt(meta.value.replace(/\D/gi, '')) as any)
            } else {
              onChange(meta.value)
            }
            runInAction(() => {
              meta.isChanged = true
            })
          }
        })
        const _openEditor = action(() => {
          setEditorOpen(true)
        })
        const _onDismiss = action(() => {
          setEditorOpen(false)
          meta.value = trim(rteValue.current)
          onChange(meta.value)
        })
        if (meta.type === 'rich') {
          // const isHTML = /<(br|basefont|hr|input|source|frame|param|area|meta|!--|col|link|option|base|img|wbr|!DOCTYPE).*?>|<(a|abbr|acronym|address|applet|article|aside|audio|b|bdi|bdo|big|blockquote|body|button|canvas|caption|center|cite|code|colgroup|command|datalist|dd|del|details|dfn|dialog|dir|div|dl|dt|em|embed|fieldset|figcaption|figure|font|footer|form|frameset|head|header|hgroup|h1|h2|h3|h4|h5|h6|html|i|iframe|ins|kbd|keygen|label|legend|li|map|mark|menu|meter|nav|noframes|noscript|object|ol|optgroup|output|p|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|span|strike|strong|style|sub|summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|track|tt|u|ul|var|video).*?<\/\2>/gi.test(
          //   meta.value.toString()
          // )
          const isHTML = true
          render = (
            <div
              className="flex flex-col"
              css={css`
                .richedit {
                  display: none;
                }

                &:hover {
                  .richedit {
                    display: flex;
                  }
                }
              `}
            >
              {label && (
                <Label>
                  {label}
                  {required ? <span className="text-red-700">*</span> : ''}
                </Label>
              )}

              {isHTML ? (
                <div
                  className="px-2 border border-gray-900 rounded-sm select-none"
                  css={css`
                    transition: all 0.3s;
                    &:hover {
                      background: #ccc;
                      opacity: 0.7;
                    }
                  `}
                >
                  <div
                    className="relative "
                    onClick={_openEditor}
                    css={css`
                      min-height: 30px;
                      min-width: 80px;
                      font-size: 12px;
                      overflow: auto;
                      cursor: pointer;
                      p {
                        padding: 10px 0px;
                      }
                      ul,
                      ol {
                        padding: 0px 0px;
                        padding-left: 25px;
                        li {
                          padding: 5px 0px;
                          list-style-type: disc;
                        }
                      }
                      ol li {
                        list-style-type: decimal;
                      }
                      ${meta.htmlHeight > 0 &&
                      css`
                        height: ${meta.htmlHeight}px;
                      `}
                    `}
                  >
                    <div className="absolute inset-0 overflow-hidden flex items-center">
                      <div
                        className="relative box-border"
                        ref={htmlRef}
                        dangerouslySetInnerHTML={{ __html: meta.value }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <TextField
                  className="flex-1"
                  value={meta.value || ''}
                  type={meta.type}
                  onKeyUp={onKeyUp}
                  onKeyDown={onKeyDown}
                  autoComplete=""
                  multiline={
                    stringValue.indexOf('\n') >= 0 || stringValue.length > 50
                  }
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onChange={_onChange}
                />
              )}
              {editorOpen && (
                <Modal
                  isOpen={true}
                  forceFocusInsideTrap={false}
                  styles={{
                    main: {
                      minWidth: '90vw',
                      width: '90vw',
                      height: '90vh',
                    },
                  }}
                  className="rte-dialog"
                  css={css`
                    .ms-Modal-scrollableContent {
                      height: 100%;
                      display: flex;
                      flex-direction: column;
                    }

                    .ms-Dialog-inner,
                    .ms-Dialog-inner .ms-Dialog-content {
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                    }
                  `}
                  onDismiss={_onDismiss}
                >
                  <Suspense
                    fallback={loadingComponent ? loadingComponent : <Loading />}
                  >
                    <TextRTE
                      alter={alter}
                      value={rteValue.current}
                      autoFocus={true}
                      onChange={(val) => {
                        onChange(val)
                        rteValue.current = val
                      }}
                    />
                  </Suspense>
                </Modal>
              )}
            </div>
          )
        } else {
          render = (
            <TextField
              label={label}
              value={meta.value || ''}
              type={meta.type}
              autoComplete=""
              multiline={
                meta.multiline ||
                stringValue.indexOf('\n') >= 0 ||
                stringValue.length > 50
              }
              readOnly={readOnly}
              onFocus={onFocus}
              onBlur={onBlur}
              autoAdjustHeight={true}
              required={required}
              canRevealPassword={meta.type !== 'string'}
              onChange={_onChange}
              onKeyUp={onKeyUp}
              onKeyDown={
                onKeyDown
                  ? onKeyDown
                  : action((e) => {
                      if (e.key === 'Enter') {
                        if (!meta.multiline) {
                          meta.multiline = true
                        }
                      } else if ((meta.value.trim() || '').indexOf('\n') < 0) {
                        meta.multiline = false
                      }
                    })
              }
            />
          )
        }

        return render
      }}
    </Observer>
  )
}

function getAbsoluteHeight(el) {
  const box = el.getBoundingClientRect()
  return Math.round(box.height)
}
