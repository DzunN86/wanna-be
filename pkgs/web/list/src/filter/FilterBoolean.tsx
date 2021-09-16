import { Toggle } from '@fluentui/react/lib/Toggle'
import * as React from 'react'
import ItemButton from './SingleFilter'

export default ({ label, field, value, setValue, submit }: any) => {
  const _onChanged = (e: any) => {
    setValue(e ? 'Yes' : 'No')
    submit()
  }
  return (
    <ItemButton
      label={label}
      field={field}
      setValue={setValue}
      onClear={submit}
      value={value}
    >
      <div style={{ paddingTop: 10, paddingLeft: 10 }}>
        <Toggle
          label={label.label}
          onText="Yes"
          offText="No"
          onChanged={_onChanged}
        />
      </div>
    </ItemButton>
  )
}
