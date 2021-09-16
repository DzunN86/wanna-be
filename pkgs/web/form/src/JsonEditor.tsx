/** @jsx jsx */
import { jsx } from '@emotion/react'
import { Spinner } from '@fluentui/react'
import Editor, { loader } from '@monaco-editor/react'
import { useEffect } from 'react'

export default ({ onChange, value }) => {
  useEffect(() => {
    loader.config({
      paths: { vs: '/__ext/monaco/vs' },
    })
  }, [])

  return (
    <Editor
      loading={<Spinner />}
      options={{
        wordWrap: 'on',
      }}
      onChange={onChange}
      defaultLanguage={'json'}
      value={value}
    />
  )
}
