import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import MonacoJSXHighlighter from './jsx-syntax-hl'

const babelParse = (code) =>
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  })

const jsxSyntax = (editor, monaco) => {
  const monacoJSXHighlighter = new MonacoJSXHighlighter(
    monaco,
    babelParse,
    traverse,
    editor
  )
  monacoJSXHighlighter.highLightOnDidChangeModelContent(100)
  monacoJSXHighlighter.addJSXCommentCommand()
}

(window as any).jsxSyntax = jsxSyntax;

export default jsxSyntax;