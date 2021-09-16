import { TextField } from '@fluentui/react/lib/TextField'
import { action } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import * as React from 'react'
import SingleFilter from './SingleFilter'

export default ({ label, field, value, setValue, submit }: any) => {
  const meta = useLocalObservable(() => ({
    oldval: value,
  }))
  return (
    <Observer>
      {() => {
        const _onChange = action((e: any) => {
          meta.oldval = e.target.value
        })
        const _onClear = () => {
          setValue(null)
          submit()
        }
        return (
          <SingleFilter
            label={label}
            setValue={setValue}
            onClear={_onClear}
            value={value}
          >
            {({ dismiss }) => (
              <TextField
                value={meta.oldval || ''}
                onChange={_onChange}
                onKeyDown={action((e: any) => {
                  if (e.which === 13) {
                    meta.oldval = e.target.value
                    setValue(e.target.value)
                    submit()
                    dismiss()

                  }
                })}
                styles={{ root: { padding: 10 } }}
              />
            )}
          </SingleFilter>
        )
      }}
    </Observer>
  )
}
