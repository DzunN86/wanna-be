/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Jodit } from 'jodit'
import 'jodit/build/jodit.min.css'
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { waitUntil } from 'web.utils/src/waitUntil'

const TextRTE = forwardRef(
  (
    {
      value,
      config,
      onChange,
      autoFocus,
      onBlur,
      onFocus,
      tabIndex,
      name,
      alter,
    }: {
      value: string
      alter?: any
      name?: string
      tabIndex?: number
      config?: any
      autoFocus?: boolean
      onChange: (e: string) => void
      onBlur?: (e: any) => void
      onFocus?: (e: any) => void
    },
    ref
  ) => {
    const textArea = useRef(null as any)
    const [popup, setPopup] = useState(null as any)
    const metaRef = useRef({
      imageAlter: false,
      imageField: <div></div>,
      imageClose: () => {},
      editor: null as any,
    })
    const meta = metaRef.current

    useEffect(() => {
      ;(async () => {
        if (alter && alter.replacer) {
          let replacer = async (props: any) => {
            return <div></div>
          }

          if (alter.replacer['*image*']) {
            replacer = alter.replacer['*image*']
          } else if (alter.replacer['*img*']) {
            replacer = alter.replacer['*img*']
          }

          if (replacer) {
            meta.imageAlter = true
            meta.imageField = (
              <div
                css={css`
                  width: 300px;
                  .ms-Label {
                    display: none;
                  }
                `}
              >
                {
                  await replacer({
                    path: '',
                    props: {
                      name: 'image',
                      value: '',
                      onChange: async (e) => {
                        const editor = meta.editor
                        if (editor) {
                          const image: HTMLImageElement =
                            editor.createInside.element('img')

                          image.setAttribute('src', e)

                          await editor.s.insertImage(
                            image,
                            null,
                            editor.o.imageDefaultWidth
                          )
                        }
                        meta.imageClose()
                      },
                    },
                  })
                }
              </div>
            )
          }
        }
      })()
    }, [alter])

    useLayoutEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(textArea.current)
        } else {
          ref.current = textArea.current
        }
      }
    }, [textArea])

    useEffect(() => {
      const blurHandler = (value) => {
        onBlur && onBlur(value)
      }
      const focusHandler = (value) => {
        onFocus && onFocus(value)
      }

      const changeHandler = (value) => {
        onChange && onChange(value)
      }

      waitUntil(() => textArea.current).then(() => {
        const element = textArea.current
        textArea.current = Jodit.make(element, {
          ...config,
          enter: 'BR',
          wrapSingleTextNodes: false,
          buttons: [
            'source',
            '|',
            'bold',
            'strikethrough',
            'underline',
            'italic',
            '|',
            'ul',
            'ol',
            '|',
            'outdent',
            'indent',
            '|',
            'font',
            'fontsize',
            'brush',
            'paragraph',
            '|',
            meta.imageAlter
              ? {
                  name: 'image',
                  popup: function (editor, current, self, close) {
                    setTimeout(async () => {
                      await waitUntil(() =>
                        document.getElementById('image-popup')
                      )
                      setPopup(document.getElementById('image-popup'))
                      await waitUntil(
                        () => !document.getElementById('image-popup')
                      )
                      setPopup(null)
                    })
                    meta.editor = editor
                    meta.imageClose = close
                    return `<div id="image-popup"></div>`
                  },
                }
              : 'image',
            'video',
            'table',
            'link',
            '|',
            'align',
            'undo',
            'redo',
            '|',
            'hr',
            'eraser',
            'copyformat',
            '|',
            'symbol',
            'fullsize',
            'print',
          ],
        })
        textArea.current.value = value || ''

        textArea.current.events.on('blur', (e) => {
          if (textArea.current) blurHandler(e)
        })
        textArea.current.events.on('focus', (e) => {
          if (textArea.current) focusHandler(e)
        })
        textArea.current.events.on('change', () => {
          if (textArea.current) changeHandler(textArea.current.value)
        })

        textArea.current.workplace.tabIndex = tabIndex || -1

        if (autoFocus) {
          textArea.current.selection.focus()
        }
      })
      return () => {}
    }, [])

    return (
      <div
        className="flex flex-row items-stretch flex-1 just"
        css={css`
          .jodit-container {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .jodit-workplace {
            flex: 1;
            position: relative;
          }
          .jodit-wysiwyg {
            position: absolute !important;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;

            p {
              padding: 10px 0px;
            }
            ul,
            ol {
              margin: 0px 0px;
              padding-left: 25px;
              li {
                margin: 5px 0px;
                list-style-type: disc;
              }
            }
            ol li {
              list-style-type: decimal;
            }
          }
        `}
      >
        {meta.imageAlter &&
          popup &&
          createPortal(<div>{meta.imageField}</div>, popup)}
        <textarea ref={textArea} name={name}></textarea>
      </div>
    )
  }
)
export default TextRTE
