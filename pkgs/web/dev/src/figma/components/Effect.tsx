/** @jsx jsx */
import { jsx } from '@emotion/react'
import { Spinner } from '@fluentui/react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { waitUntil } from 'libs'
import { observable, runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { BaseWindow } from 'web.init/src/window'
import { api } from 'web.utils/src/api'
import { jsxCSS, registerAutoCloseTag } from '../../internal/TemplateCode'
import { registerMonacoType } from '../../libs/registerMonacoType'
import { sendParent } from '../ws'

declare const window: BaseWindow

const meta = observable({
  id: '',
  value: '',
})

export const Effect = observer(({ node, applyHtml }: any) => {
  const monaco: any = useMonaco()
  useEffect(() => {
    waitUntil(() => !window.figmaEffectSaving).then(() => {
      if (node.id !== meta.id) {
        runInAction(() => {
          meta.id = node.id
          meta.value = node.effect
        })
      }
    })
  }, [node])

  useEffect(() => {
    ;(async () => {
      if (monaco && !monaco.isPluginRegistered) {
        registerAutoCloseTag(monaco)
        monaco.isPluginRegistered = true
      }

      if (monaco && !monaco.isTypeRegistered) {
        registerMonacoType(monaco)
      }
    })()
  }, [monaco])

  if (node.effect === '--loading--')
    return (
      <div className="items-center justify-center flex absolute inset-0">
        <Spinner />
      </div>
    )

  return (
    <div className="flex flex-col h-full flex-1" css={jsxCSS}>
      <Editor
        className="flex-1"
        loading={<Spinner />}
        height={`100%`}
        value={meta.value}
        options={{
          fontFamily:
            '"Jetbrains Mono","SF Mono",Monaco,Menlo,Consolas,"Ubuntu Mono","Liberation Mono","DejaVu Sans Mono","Courier New",monospace',
          wordWrap: 'on',
          tabSize: 2,
          glyphMargin: false,
          minimap: { enabled: false },
          ...{
            fontSize: meta['font-size'],
            lineNumbers: 'off',
            folding: false,
            overviewRulerLanes: 0,
            scrollbar: {
              vertical: 'auto',
              verticalScrollbarSize: 3,
              // arrowSize: 10,
              horizontal: 'hidden',
            },
            suggest: {
              showFiles: false,
            },
            smoothScrolling: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
          },
        }}
        onChange={async (src) => {
          window.figmaEffectSaving = true
          runInAction(() => {
            meta.value = src
          })
          await sendParent('set-node-data', {
            node_id: node.id,
            name: 'effect',
            value: src,
          })
          window.figmaEffectSaving = false
        }}
        onMount={async (editor, monaco) => {
          await import('web.dev/src/libs/jsx-syntax')
          ;(window as any).jsxSyntax(editor, monaco)
          editor.trigger('*', 'editor.action.formatDocument', undefined)
        }}
        defaultLanguage={'typescript'}
      />
    </div>
  )
})
