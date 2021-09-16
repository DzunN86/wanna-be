import { TextField } from '@fluentui/react/lib/TextField'
import { action } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import * as React from 'react'
import ItemButton from './SingleFilter'

export default ({ label, field, value, setValue, submit }: any) => {
  const meta = useLocalObservable(() => ({
    oldval: value,
  }))
  return (
    <Observer>
      {() => {
        const _onChange = action((e: any) => {
          meta.oldval = e.target.value.replace(/\D/g, '')
        })
        const _onKeyDown = action((e: any) => {
          if (e.which === 13) {
            meta.oldval = e.target.value.replace(/\D/g, '')
            setValue(e.target.value.replace(/\D/g, ''))
            submit()
          }
        })
        return (
          <ItemButton
            label={label}
            setValue={setValue}
            onClear={submit}
            value={value}
          >
            <TextField
              value={meta.oldval || ''}
              onChange={_onChange}
              onKeyDown={_onKeyDown}
              styles={{ root: { padding: 15 } }}
            />
          </ItemButton>
        )
      }}
    </Observer>
  )
}
