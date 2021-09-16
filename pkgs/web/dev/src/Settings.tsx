/** @jsx jsx */
import { jsx } from '@emotion/react'
import { DefaultButton, TextField } from '@fluentui/react'
import { runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { api } from 'web.utils/src/api'

export const Settings = observer(() => {
  const meta = useLocalObservable(() => ({
    loading: false,
  }))

  return (
    <div className="p-4">
      <div className="flex flex-col items-stretch w-1/2">
        <a href={'/__figma/figma.zip'}>
          <DefaultButton>Download Figma Plugin</DefaultButton>
        </a>
        <div className="my-2">
          {meta.loading ? (
            'Reloading database schema....'
          ) : (
            <DefaultButton
              onClick={async () => {
                runInAction(() => {
                  meta.loading = true
                })
                await api('/__data', {
                  db: 'main',
                  action: 'reload-schema',
                })

                runInAction(() => {
                  meta.loading = false
                })
              }}
            >
              Reload Database Schema
            </DefaultButton>
          )}
        </div>
      </div>
    </div>
  )
})
