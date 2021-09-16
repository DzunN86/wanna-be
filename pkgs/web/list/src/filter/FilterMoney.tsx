import { TextField } from '@fluentui/react/lib/TextField'
import { Observer, useLocalStore } from 'mobx-react-lite'
import * as React from 'react'
import ItemButton from './SingleFilter'

export default ({ label, field, value, setValue, submit }: any) => {
  const meta = useLocalStore(() => ({
    oldval:
      parseInt(value || '') || (''.toLocaleString().replace(/,/gi, '.') as any),
  }))

  return (
    <Observer>
      {() => {
        const _onKeyDown = (e: any) => {
          if (e.which === 13) {
            setValue(parseInt((meta.oldval || '').replace(/\./gi, '')))
            submit()
          }
        }
        const _onChange = (e: any) => {
          meta.oldval = parseInt((e.target.value || '').replace(/\./gi, ''))
            .toLocaleString()
            .replace(/,/gi, '.')
          if (meta.oldval === 'NaN') {
            meta.oldval = ''
          }
        }
        return (
          <ItemButton
            label={label}
            field={field}
            setValue={setValue}
            onClear={submit}
            value={(parseInt(value || '') || '')
              .toLocaleString()
              .replace(/,/gi, '.')}
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
