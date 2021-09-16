/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Spinner } from '@fluentui/react'
import Editor, { loader, useMonaco } from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'
import { BaseWindow } from '../../../init/src/window'
import { loadExt } from '../../../utils/src/loadExt'
import { registerMonacoType } from '../libs/registerMonacoType'

declare const window: BaseWindow

loader.config({
  paths: { vs: '/__ext/monaco/vs' },
})

interface FigmaItem {
  docId: string
  page: string
  frame: string
}

export const TemplateCode = ({
  value,
  onChange,
  onMount,
  options,
  type,
  setUnsaved,
  name,
  filePath,
  figma,
}: {
  value: string
  type?: string
  onChange?: (value: any, figma?: FigmaItem) => void
  onMount?: any
  setUnsaved?: (val: boolean) => void
  options?: any
  name?: string
  filePath?: string
  figma?: FigmaItem
}) => {
  const [ready, setReady] = useState(false)
  const mounted = useRef(true)
  const monaco: any = useMonaco()
  const currentFigma = useRef(figma)

  useEffect(() => {
    ;(async () => {
      const emmet = await loadExt('dev/emmet.js')
      if (monaco && !monaco.isPluginRegistered) {
        registerAutoFormat(monaco)
        registerAutoCloseTag(monaco)
        emmet.emmetHTML(monaco)
        monaco.isPluginRegistered = true
      }

      if (monaco && !monaco.isTypeRegistered) {
        registerMonacoType(monaco)
      }
    })()
  }, [monaco])

  useEffect(() => {
    const a = setTimeout(() => {
      if (mounted.current) {
        setReady(true)
      }
    }, 300)
    if (onMount) onMount(getCursor, formatCode)

    return () => {
      clearTimeout(a)
      mounted.current = false
      window.devFormatCode = undefined
    }
  }, [])
  const editorRef = useRef(null as any)

  const formatCode = () => {
    const editor = editorRef.current
    editor.trigger('*', 'editor.action.formatDocument')
  }
  const getCursor = () => {
    const editor = editorRef.current
    var line = editor.getPosition().lineNumber
    var col = editor.getPosition().column
    var textUntilPosition = editor.getModel().getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: line,
      endColumn: col,
      formatOnPaste: true,
      formatOnType: true,
    })
    return textUntilPosition.length
  }

  if (!ready) return null

  return (
    <div className="flex flex-col flex-1" css={jsxCSS}>
      <Editor
        className="flex-1"
        loading={<Spinner />}
        height={`100%`}
        options={{
          wordWrap: 'on',
          suggest: {
            showFiles: false,
            // showVariables: false,
            // showModules: false,
            // showFunctions: false,
            // showKeywords: false,
            // showClasses: false,
            // showWords: false,
            // showProperties: false,
          },
          fontFamily:
            '"Jetbrains Mono","SF Mono",Monaco,Menlo,Consolas,"Ubuntu Mono","Liberation Mono","DejaVu Sans Mono","Courier New",monospace',
          ...options,
        }}
        onMount={async (editor, monaco) => {
          editorRef.current = editor
          editor.updateOptions({ tabSize: 2, linkedEditing: true })
          window.devFormatCode = async () => {
            await editor.getAction('editor.action.formatDocument').run()
          }
          window.devFormatCode()

          await import('../libs/jsx-syntax')
          ;(window as any).jsxSyntax(editor, monaco)
        }}
        onValidate={() => {}}
        onChange={(newval) => {
          if (currentFigma.current && onChange) {
            onChange(newval, currentFigma.current)
          }
        }}
        defaultPath={'code.tsx'}
        defaultLanguage={'typescript'}
        language={'typescript'}
        defaultValue={value}
      />
    </div>
  )
}

export const registerAutoCloseTag = (monaco) => {
  monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['>'],
    provideCompletionItems: (model, position) => {
      const codePre: string = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      const tag = codePre.match(/.*<(\w+)>$/)?.[1]

      if (!tag) {
        return {
          suggestions: [],
        }
      }

      const word = model.getWordUntilPosition(position)

      return {
        suggestions: [
          {
            label: `</${tag}>`,
            kind: monaco.languages.CompletionItemKind.EnumMember,
            insertText: `</${tag}>`,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            },
          },
        ],
      }
    },
  })
}

export const getPrettier = async (pathPrefix = '') => {
  if ((window as any).formatPrettier) {
    return (window as any).formatPrettier
  }

  const prettier = await loadExt(pathPrefix + 'dev/prettier.js')
  const prettierBabel = await loadExt(pathPrefix + 'dev/prettier-babel.js')
  const format = (text: string) => {
    try {
      let formatted: string = prettier
        .format(text, {
          parser: 'babel-ts',
          plugins: prettierBabel,
        })
        .trim()

      if (formatted[formatted.length - 1] === ';')
        formatted = formatted.substr(0, formatted.length - 1)

      formatted = formatted
        .replace(/\{\/\* \<\!\-\-/gi, '<!--')
        .replace(/\-\-\>\ \*\/\}/gi, '-->')

      if (formatted.endsWith(`;\n}`)) {
        formatted = formatted.substr(0, formatted.length - 3) + `\n}`
      }
      return formatted
    } catch (e) {
      return text
    }
  }
  ;(window as any).formatPrettier = format
  return format
}

export const registerAutoFormat = async (
  monaco,
  lang = 'typescript',
  pathPrefix = ''
) => {
  const format = await getPrettier(pathPrefix)
  const formatter = {
    provideDocumentFormattingEdits: async function (
      document: { getValue: () => any; getFullModelRange: () => any },
      options: any,
      token: any
    ) {
      const text = document.getValue()

      return [
        {
          range: document.getFullModelRange(),
          text: format(text),
        },
      ]
    },
  }

  monaco.languages.registerDocumentFormattingEditProvider(lang, formatter)
  return format
}

const computeOffset = (
  code: string | any[],
  pos: { lineNumber: number; column: number }
) => {
  let line = 1
  let col = 1
  let offset = 0
  while (offset < code.length) {
    if (line === pos.lineNumber && col === pos.column) return offset
    if (code[offset] === '\n') line++, (col = 1)
    else col++
    offset++
  }
  return -1
}

export const jsxCSS = css`
  .monaco-editor .suggest-widget > .message {
    font-size: 12px;
  }

  .JSXElement.JSXIdentifier {
    color: royalblue;
  }

  .JSXElement.JSXBracket {
    color: rgb(109, 140, 233);
  }

  .JSXElement.JSXText {
    color: rgb(101, 101, 101);
  }

  .JSXElement.JSXGlyph {
    background: cyan;
    opacity: 0.25;
  }

  .JSXOpeningFragment.JSXBracket {
    color: rgb(109, 140, 233);
    font-weight: bold;
  }

  .JSXClosingFragment.JSXBracket {
    color: rgb(109, 140, 233);
    font-weight: bold;
  }

  .JSXOpeningElement.JSXBracket {
    color: rgb(109, 140, 233);
    font-weight: bold;
  }

  .JSXOpeningElement.JSXIdentifier {
    color: royalblue;
  }

  .JSXClosingElement.JSXBracket {
    color: rgb(109, 140, 233);
    font-weight: lighter;
  }

  .JSXClosingElement.JSXIdentifier {
    color: royalblue;
    font-weight: lighter;
  }

  .JSXAttribute.JSXIdentifier {
    color: steelblue;
  }

  .JSXExpressionContainer.JSXBracket {
    color: rgb(109, 140, 233);
  }

  .JSXSpreadChild.JSXBracket {
    color: rgb(109, 140, 233);
  }

  .JSXSpreadAttribute.JSXBracket {
    color: rgb(109, 140, 233);
  }

  .mtk20 {
    color: green;
  }
`
