/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Icon, Label, Spinner, TooltipHost } from '@fluentui/react'
import Editor from '@monaco-editor/react'
import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { Fragment, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Form } from 'web.form/src/Form'
import { api } from 'web.utils/src/api'
import { BaseWindow } from '../../../init/src/window'
import { registerAutoFormat, TemplateCode } from './TemplateCode'
import type { IFigmaItem } from './TemplateCodeFigma'

declare const window: BaseWindow

export interface IComponentData {
  oldName?: string
  name: string
  path: string
  wrapperCode?: string
  type: 'import' | 'identifier'
  code?: string
  isNew?: boolean
}

export const ComponentEditor = observer(
  ({
    data,
    onClose,
  }: {
    data: IComponentData
    onClose: (reloadList: boolean) => void
  }) => {
    const meta = useLocalObservable(() => ({
      unsaved: data.name === '' ? true : false,
      form: Object.assign({}, data),
      saving: false,
      hideWrapper: localStorage.getItem('component-hide-wrapper') === 'y',
      init: {
        code: false,
        wrapper: false,
      },
      figma: { docId: '', page: '', frame: '' },
      shouldReloadList: false,
      wrapperChanged: false,
    }))

    const wrapperEditorRef = useRef(null as any)

    useEffect(
      action(() => {
        meta.form = data

        if (meta.form.wrapperCode) {
          const f = detectFigma(meta.form.wrapperCode)
          if (f) {
            meta.figma = f.data
          } else {
            meta.figma = { docId: '', page: '', frame: '' }
          }
        }
      }),
      [data]
    )

    const keydown = async function (e) {
      if (
        (window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) &&
        e.keyCode == 83
      ) {
        e.preventDefault()
        e.stopPropagation()

        if (!meta.form.name) {
          alert('Please type the component name.')
          return
        } else {
          if (!meta.form.path) {
            delete meta.form.oldName
            meta.shouldReloadList = true
            meta.form.isNew = true
            for (let i of (window as any).componentEditorList) {
              if (i.name === meta.form.name) {
                alert(
                  `Component ${meta.form.name} already exists. Please choose another name.`
                )
                return
              }
            }
            meta.form.path = `./components/${meta.form.name}`
            ;(window as any).componentEditorList.push({
              name: meta.form.name,
              path: meta.form.path,
              type: 'import',
            })
          } else {
            delete meta.form.isNew
          }
        }

        runInAction(() => {
          meta.saving = true
        })

        const res = await api('/__cms/0/component-save', {
          ...meta.form,
          wrapperChanged: meta.wrapperChanged,
        })

        runInAction(() => {
          meta.wrapperChanged = false
          if (meta.form.oldName || meta.form.isNew) {
            meta.shouldReloadList = true
            delete meta.form.oldName
          } else {
            meta.shouldReloadList = false
          }

          meta.saving = false
          meta.unsaved = false
        })
      }
    }

    useEffect(() => {
      setTimeout(
        action(() => {
          if (!meta.init.code) {
            meta.init.code = true
          }
          if (!meta.init.wrapper) {
            meta.init.wrapper = true
          }
        }),
        4000
      )
      window.devIsComponentEditorOpen = true
      document.addEventListener('keydown', keydown, true)
      return () => {
        window.devIsComponentEditorOpen = false
        document.removeEventListener('keydown', keydown, true)
      }
    }, [])

    let div = document.querySelector('#field-code')
    if (!div) {
      const root = document.querySelector('#root')
      div = document.createElement('div')
      div.setAttribute('id', 'field-code')
      root?.appendChild(div)
    }

    let filePath = `${meta.form.path}`
    if (filePath.indexOf('./') === 0) {
      filePath = `/app/web/src${meta.form.path.substr(1)}`
    }

    const farr = filePath.split('.')
    if (farr.length > 1) {
      farr.pop()
    }
    filePath = `${farr.join('.')}.html`

    if (div) {
      return createPortal(
        <Fragment>
          <div
            onClickCapture={action((e) => {
              e.stopPropagation()
              e.preventDefault()
              if (meta.unsaved) {
                if (!confirm('Unsaved change will be lost. Are you sure?')) {
                  return
                }
              }
              onClose(meta.shouldReloadList)
            })}
            className="fixed inset-0 z-50 w-full h-full bg-gray-800 opacity-75"
          ></div>

          <div
            className="flex fixed overflow-hidden "
            css={css`
              width: 90vw;
              height: 90vh;
              top: 5vh;
              z-index: 100;
              left: 5vw;

              .unsaved {
                border-bottom: 2px solid red;
                background-image: linear-gradient(
                  45deg,
                  #ffdbdb 4.55%,
                  #ffffff 4.55%,
                  #ffffff 50%,
                  #ffdbdb 50%,
                  #ffdbdb 54.55%,
                  #ffffff 54.55%,
                  #ffffff 100%
                );
                background-size: 15.56px 15.56px;
              }
            `}
          >
            <div className="flex flex-row items-stretch bg-white flex-1">
              {!meta.hideWrapper ? (
                <div
                  className={`${meta.unsaved ? 'unsaved' : ''}  ${
                    meta.saving ? 'saving' : ''
                  } relative border-r border-grey-400 overflow-hidden`}
                  css={css`
                    width: 30vw;
                  `}
                >
                  <div
                    className="absolute z-10 py-3 px-4 w-full"
                    css={css`
                      margin-top: -2px;
                    `}
                  >
                    <div className="flex flex-row justify-between ml-10">
                      <div></div>
                      <div>
                        {meta.unsaved && (
                          <Label
                            className="font-bold text-red-600"
                            css={css`
                              font-size: 10px;
                            `}
                          >
                            {meta.saving ? 'SAVING' : 'UNSAVED'}
                          </Label>
                        )}
                      </div>
                      <div
                        className="flex flex-row"
                        css={css`
                          padding-top: 3px;
                        `}
                      >
                        <TooltipHost content="Delete Component">
                          <div
                            onClick={async (e) => {
                              if (
                                confirm(
                                  'Are you sure want to remove this component ?'
                                )
                              ) {
                                await api('/__cms/0/component-delete', {
                                  name: meta.form.oldName || meta.form.name,
                                })

                                e.stopPropagation()
                                e.preventDefault()
                                onClose(true)
                              }
                            }}
                            className="flex flex-row items-center px-1 rounded-sm cursor-pointer hover:opacity-50"
                            css={css`
                              margin-top: -2px;
                            `}
                          >
                            <Icon
                              iconName={'Delete'}
                              className="bg-white rounded-sm"
                              css={css`
                                font-size: 15px;
                                color: #333 !important;
                              `}
                            />
                          </div>
                        </TooltipHost>
                        <TooltipHost key="side-menu" content="Toggle Side Code">
                          <div
                            key="side-toggle"
                            onClick={action(() => {
                              meta.hideWrapper = true
                              localStorage.setItem(
                                'component-hide-wrapper',
                                'y'
                              )
                            })}
                            className="flex flex-row items-center px-1 ml-1 rounded-sm cursor-pointer hover:opacity-50"
                          >
                            <Icon
                              iconName={'InsertColumnsLeft'}
                              className="bg-white rounded-sm"
                              css={css`
                                font-size: 15px;
                                color: #333 !important;
                              `}
                            />
                          </div>
                        </TooltipHost>
                      </div>
                    </div>
                  </div>

                  <div
                    className="bg-white flex flex-col rounded-md absolute inset-2"
                    css={css`
                      .form-custom-layout {
                        overflow-x: hidden;
                      }
                    `}
                  >
                    <div
                      className="flex"
                      css={css`
                        height: 80px;
                      `}
                    >
                      <Form
                        className="flex-1"
                        value={meta.form}
                        onChange={action((e) => {
                          e.name = e.name
                            .toLowerCase()
                            .replace(/[^\w\-]/gi, '-')

                          if (meta.form.name !== e.name && !meta.form.oldName) {
                            meta.form.oldName = meta.form.name
                          }

                          meta.form = { ...meta.form, ...e }
                        })}
                        layout={['name']}
                      />
                    </div>

                    <div className="flex-1">
                      {meta.form.wrapperCode && (
                        <Editor
                          loading={<Spinner />}
                          options={{
                            fontFamily:
                              '"Jetbrains Mono","SF Mono",Monaco,Menlo,Consolas,"Ubuntu Mono","Liberation Mono","DejaVu Sans Mono","Courier New",monospace',
                            wordWrap: 'on',
                            lineNumbersMinChars: 3,
                            glyphMargin: false,
                            lineDecorationsWidth: 15,
                            fontSize: 11,
                            folding: false,
                            minimap: { enabled: false },
                          }}
                          onMount={(editor, monaco) => {
                            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
                              {
                                noSemanticValidation: true,
                                // noSyntaxValidation: true,
                              }
                            )

                            wrapperEditorRef.current = editor
                            registerAutoFormat(monaco, 'typescript')
                            setTimeout(() => {
                              editor.trigger(
                                '*',
                                'editor.action.formatDocument',
                                undefined
                              )
                            }, 500)
                          }}
                          onChange={action((newval) => {
                            if (!meta.init.wrapper) {
                              meta.init.wrapper = true
                            } else {
                              meta.unsaved = true
                            }

                            meta.form.wrapperCode = newval
                            meta.wrapperChanged = true
                          })}
                          defaultLanguage={'typescript'}
                          value={meta.form.wrapperCode}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  css={css`
                    padding: 5px;
                    background: #fafafa;
                  `}
                  key="side-toggle"
                  onClick={action(() => {
                    meta.hideWrapper = false
                    localStorage.setItem('component-hide-wrapper', 'n')
                  })}
                  className="flex flex-row items-center  bg-white rounded-sm cursor-pointer hover:opacity-50"
                >
                  <Icon
                    iconName={'InsertColumnsRight'}
                    className="bg-white rounded-sm"
                    css={css`
                      font-size: 15px;
                      color: #333 !important;
                    `}
                  />
                </div>
              )}
              <div className="flex flex-1">
                {typeof meta.form.code === 'string' && (
                  <TemplateCode
                    value={meta.form.code}
                    name={meta.form.name}
                    figma={meta.figma}
                    filePath={filePath}
                    setUnsaved={action((v) => {
                      meta.unsaved = v
                    })}
                    options={{ fontSize: 12, minimap: { enabled: false } }}
                    onChange={action((value, figma) => {
                      if (!meta.init.code) {
                        meta.init.code = true
                      } else {
                        meta.unsaved = true
                      }
                      meta.wrapperChanged = true
                      meta.form.code = value

                      if (
                        figma &&
                        (meta.figma.docId !== figma.docId ||
                          meta.figma.frame !== figma.frame ||
                          meta.figma.page !== figma.page)
                      ) {
                        modifyFigma(figma, wrapperEditorRef.current)
                        runInAction(() => {
                          meta.figma = figma
                        })
                      }
                    })}
                  />
                )}
              </div>
            </div>
          </div>
        </Fragment>,
        div
      )
    }

    return null
  }
)

const detectFigma = (
  source: string
): false | { data: IFigmaItem; pos: { start: number; end: number } } => {
  // if (source) {
  //   const start_str = `/** @figma`
  //   const end_str = '*/'
  //   const start = source.indexOf(start_str)
  //   if (start >= 0) {
  //     const end = source.indexOf(end_str, start)
  //     if (end >= 0) {
  //       const str = source.substr(
  //         start + start_str.length,
  //         end - (start + start_str.length) - end_str.length
  //       )

  //       let data = {
  //         docId: '',
  //         page: '',
  //         frame: '',
  //       }
  //       try {
  //         data = JSON.parse(str)
  //       } catch (e) {}

  //       return {
  //         data,
  //         pos: {
  //           start: start,
  //           end: end + end_str.length,
  //         },
  //       }
  //     }
  //   }
  // }

  return false
}

const modifyFigma = (figma: IFigmaItem, editor: any) => {
  const value = editor.getValue()
  const d = detectFigma(value)
  const inject = `\
/** @figma
${JSON.stringify(figma)}
**/`

  let nvalue = ''
  if (d) {
    nvalue = spliceString(value, d.pos.start, d.pos.end - d.pos.start, inject)
  } else {
    if (value.indexOf('/** @jsx') === 0) {
      const varr = value.split('\n')
      varr.splice(1, 0, inject)
      nvalue = varr.join('\n')
    }
  }

  if (nvalue) {
    const fullRange = editor.getModel().getFullModelRange()
    editor.executeEdits(null, [
      {
        text: nvalue,
        range: fullRange,
      },
    ])
  }
}

function spliceString(str, index, count, add) {
  if (index < 0) {
    index = str.length + index
    if (index < 0) {
      index = 0
    }
  }

  return str.slice(0, index) + (add || '') + str.slice(index + count)
}
