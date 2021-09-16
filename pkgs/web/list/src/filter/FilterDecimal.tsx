import { TextField } from '@fluentui/react/lib/TextField'
import { Observer, useLocalStore } from 'mobx-react-lite'
import * as React from 'react'
import ItemButton from './SingleFilter'

export default ({ label, value, field, setValue, submit }: any) => {
  const meta = useLocalStore(() => ({
    oldval: (!!value ? value : '').toString(),
  }))

  return (
    <Observer>
      {() => {
        const _onClose = () => {
          setValue(parseFloat(meta.oldval))
          submit()
        }
        const _onChange = (e: any) => {
          meta.oldval = setValue(parseFloat(e.target.value))
        }
        const _onKeyDown = (e: any) => {
          if (e.which === 13) {
            meta.oldval = e.target.value
            setValue(parseFloat(e.target.value))
            submit()
          }
        }
        return (
          <ItemButton
            label={label}
            setValue={setValue}
            onClose={_onClose}
            onClear={submit}
            value={value}
          >
            <TextField
              value={meta.oldval}
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
