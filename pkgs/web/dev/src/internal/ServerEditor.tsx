/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Icon, IconButton, Label, Spinner, TextField } from '@fluentui/react'
import Editor from '@monaco-editor/react'
import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { TouchBackend } from 'react-dnd-touch-backend'
import { api } from 'web.utils/src/api'
import { BaseWindow } from '../../../init/src/window'
import { Toolbar } from '../libs/Toolbar'
import type { SingleServerItem } from '../Server'
import { Split } from '../Template'
import { registerAutoFormat } from './TemplateCode'

declare const window: BaseWindow

export const ServerEditor = observer(
  ({
    data,
    reloadList,
  }: {
    data: SingleServerItem
    reloadList: () => void
  }) => {
    const meta = useLocalObservable(() => ({
      form: data,
      saving: false,
      split: 60,
      reloadList: false,
    }))

    useEffect(
      action(() => {
        meta.form = data

        if (meta.form.code === null) {
          api('/__server/read', {
            name: meta.form.name,
          }).then(
            action((e) => {
              meta.form.code = e.code
            })
          )
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
          alert('Query Name is empty!')
          meta.form.name = meta.form.oldName
          return
        }

        runInAction(() => {
          meta.saving = true
        })
        const res = await api('/__server/save', meta.form)
        runInAction(() => {
          meta.saving = false
        })
        if (res.status === 'failed') {
          alert(res.msg)
          return
        }
        runInAction(() => {
          meta.form.oldName = meta.form.name
          meta.form.unsaved = false
        })

        if (meta.reloadList) {
          reloadList()
        }
      }

      if (
        (window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) &&
        e.keyCode == 13
      ) {
        e.preventDefault()
        e.stopPropagation()
        run()
      }
    }
    const run = () => {
      alert('running')
    }
    useEffect(() => {
      window.devIsComponentEditorOpen = true
      document.addEventListener('keydown', keydown, true)
      return () => {
        window.devIsComponentEditorOpen = false
        document.removeEventListener('keydown', keydown, true)
      }
    }, [])

    return (
      <div
        className="flex flex-1 overflow-hidden "
        css={css`
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
        <div className="flex flex-col items-stretch bg-white flex-1">
          <Toolbar
            unsaved={meta.form.unsaved}
            title={
              <TextField
                css={css`
                  .ms-TextField-fieldGroup {
                    border: 1px solid #ececeb;
                    input {
                      width: 30vw;
                      font-weight: 500 !important;
                      font-size: 13px !important;

                      &::placeholder {
                        font-weight: 500 !important;
                        font-size: 13px !important;
                        color: #aaa;
                      }
                    }
                  }
                `}
                value={meta.form.name}
                placeholder="New Server Path..."
                autoFocus={meta.form.name === ''}
                onChange={action((e, v) => {
                  meta.form.name =
                    (v[0] !== '/' ? '/' : '') +
                    v.replace(/[^\w\/\-\*]/gi, '-').toLowerCase()
                  meta.reloadList = true
                })}
              />
            }
            back={false}
            actions={[
              <IconButton
                onClick={async () => {
                  if (
                    confirm(
                      'WARNING: This cannot be undone\nAre you sure to delete this item ?'
                    )
                  ) {
                    await api(`/__server/delete/${meta.form.name}`)
                    runInAction(() => {
                      meta.form.name = ''
                    })
                    await reloadList()
                  }
                }}
                key="delete"
                iconProps={{ iconName: 'Delete' }}
                className="bg-white rounded-sm"
                css={css`
                  border: 1px solid #ffb6b6 !important;
                  color: red !important;
                  font-weight: bold;
                  height: 32px !important;
                `}
              />,
              meta.form.name && (
                <div
                  key="preview"
                  className="flex flex-row mr-2 bg-white border border-gray-300 rounded-sm"
                >
                  <div
                    className="flex flex-row items-center pl-3 pr-4  cursor-pointer hover:bg-gray-100"
                    onClick={run}
                  >
                    <Icon
                      iconName="Play"
                      css={css`
                        font-size: 13px;
                      `}
                    />
                    <Label
                      css={css`
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        margin-left: 4px;
                      `}
                    >
                      Run (
                      {window.navigator.platform.match('Mac') ? '⌘' : 'Ctrl'} +
                      Enter)
                    </Label>
                  </div>
                  <a
                    href={`${meta.form.name}`}
                    target="_blank"
                    className="flex flex-row items-center pl-3 pr-3 border-l border-gray-300 cursor-pointer hover:bg-gray-100"
                  >
                    <Icon
                      iconName="Share"
                      css={css`
                        font-size: 13px;
                      `}
                    />
                    <Label
                      css={css`
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        margin-left: 4px;
                      `}
                    >
                      Preview
                    </Label>
                  </a>
                </div>
              ),
            ]}
          />

          <DndProvider
            backend={TouchBackend}
            options={{ enableMouseEvents: true }}
          >
            <Split
              className={`flex flex-1`}
              size={meta.split}
              setSize={action((v) => {
                meta.split = v
              })}
              mode="vertical"
              dividerEl={null}
            >
              <Editor
                loading={<Spinner />}
                options={{
                  fontFamily:
                    '"Jetbrains Mono","SF Mono",Monaco,Menlo,Consolas,"Ubuntu Mono","Liberation Mono","DejaVu Sans Mono","Courier New",monospace',
                  wordWrap: 'on',
                }}
                onMount={(editor, monaco) => {
                  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
                    {
                      noSemanticValidation: true,
                      // noSyntaxValidation: true,
                    }
                  )

                  monaco.languages.typescript.typescriptDefaults.addExtraLib(`\
type IServer = {
  db: any,
  api: any, 
  user: any, 
  req: any,
  reply: any,
  ext: any
};
`)
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
                  meta.form.unsaved = true
                  meta.form.code = newval
                })}
                defaultLanguage={'typescript'}
                value={meta.form.code}
              />
              <div></div>
            </Split>
          </DndProvider>
        </div>
      </div>
    )
  }
)
