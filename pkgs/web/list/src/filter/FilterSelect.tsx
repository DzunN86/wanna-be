import find from 'lodash.find'
import get from 'lodash.get'
import map from 'lodash.map'
import * as React from 'react'
import Select from 'web.form/fields/Select'
import ItemButton from './SingleFilter'

export default ({ label, field, value, setValue, submit, items }) => {
  let valueLabel = get(find(items, { value }), 'text')
  if (!valueLabel) {
    map(items, (e) => {
      if (e === value) valueLabel = e
    })
  }

  const _onChange = (e, item) => {
    setValue(item.key)
    submit()
  }
  return (
    <ItemButton
      label={label}
      setValue={setValue}
      onClear={submit}
      value={valueLabel}
    >
      <div style={{ padding: 10 }}>
        <Select items={items} selectedKey={value} onChange={_onChange} />
      </div>
    </ItemButton>
  )
}
