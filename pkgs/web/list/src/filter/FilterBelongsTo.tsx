import * as React from 'react'
import Select from 'web.form/fields/Select'
import ItemButton from './SingleFilter'

export default ({ label, field, value, setValue, submit, items }) => {
  const _onChange = (e, item) => {
    setValue(item)
    submit()
  }
  return (
    <ItemButton
      label={label}
      setValue={setValue}
      onClear={submit}
      value={value && value.text}
    >
      <div style={{ padding: 10 }}>
        <Select items={items} selectedKey={value} onChange={_onChange} />
      </div>
    </ItemButton>
  )
}
