import addMonths from 'date-fns/addMonths'
import lastDayOfMonth from 'date-fns/lastDayOfMonth'
import startOfMonth from 'date-fns/startOfMonth'
import subMonths from 'date-fns/subMonths'
import { observer, useLocalStore } from 'mobx-react-lite'
import { Dropdown } from '@fluentui/react/lib/Dropdown'
import { Icon } from '@fluentui/react/lib/Icon'
import * as React from 'react'

export default observer(({ value, setValue, submit }: any) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agt',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ]
  const meta = useLocalStore(() => ({
    value: value && value.from ? value.from : new Date(),
  }))

  React.useEffect(() => {
    meta.value = value && value.from ? value.from : new Date()
    if (!value || (!!value && !value.from)) {
      const from = startOfMonth(meta.value)
      const to = lastDayOfMonth(meta.value)
      setValue({
        from,
        to,
      })
      submit()
    }
  }, [value])

  const month = meta.value.getMonth()
  const year = meta.value.getFullYear()
  const items = months.map((r, idx) => ({ key: idx, text: `${r} ${year}` }))
  return (
    <div
      style={{
        height: 38,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Icon
        iconName="ChevronLeft"
        style={{
          width: '22px',
          cursor: 'pointer',
          fontSize: '12px',
          marginLeft: '10px',
          marginRight: '-10px',
          userSelect: 'none',
          height: '30px',
          lineHeight: '30px',
        }}
        onClick={() => {
          const date = subMonths(meta.value, 1)
          const from = startOfMonth(date)
          const to = lastDayOfMonth(date)
          setValue({
            from,
            to,
          })
          submit()
        }}
      />
      <Dropdown
        styles={{
          title: {
            border: '0',
            paddingRight: 6,
            fontSize: 13,
          },
          callout: {
            minWidth: '90px',
          },
          dropdownOptionText: {
            fontSize: 13,
          },
          caretDownWrapper: {
            display: 'none',
          },
        }}
        selectedKey={month}
        onClick={(e) => {
          e.stopPropagation()
        }}
        onChange={(e, val: any) => {
          let mon = val.key
          if (mon.length < 10) {
            mon = '0' + mon
          }
          meta.value.setMonth(mon)
          const from = startOfMonth(meta.value)
          const to = lastDayOfMonth(meta.value)
          setValue({
            from,
            to,
          })
          submit()
        }}
        options={items}
      />

      <Icon
        iconName="ChevronRight"
        style={{
          width: '22px',
          cursor: 'pointer',
          fontSize: '12px',
          userSelect: 'none',
          height: '30px',
          lineHeight: '30px',
        }}
        onClick={() => {
          const date = addMonths(meta.value, 1)
          const from = startOfMonth(date)
          const to = lastDayOfMonth(date)
          setValue({
            from,
            to,
          })
          submit()
        }}
      />
    </div>
  )
})
