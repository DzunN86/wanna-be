import { DatePicker } from '@fluentui/react/lib/DatePicker'
import { Dropdown } from '@fluentui/react/lib/Dropdown'
import { Icon } from '@fluentui/react/lib/Icon'
import { Label } from '@fluentui/react/lib/Label'
import { Text } from '@fluentui/react/lib/Text'
import addDays from 'date-fns/addDays'
import endOfDay from 'date-fns/endOfDay'
import dateFormat from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfDay from 'date-fns/startOfDay'
import subDays from 'date-fns/subDays'
import { observer } from 'mobx-react-lite'
import DateTime from 'web.form/fields/DateTime'
import { niceCase } from 'web.utils/src/niceCase'
import FilterDateMonthly from './FilterDateMonthly'
import SingleFilter from './SingleFilter'
import React from 'react'

interface IFilterDate {
  label
  value
  setValue
  operator?: 'date' | 'monthly' | 'datetime'
  setOperator: (val: 'date' | 'monthly' | 'datetime') => void
  onlyBetween?: boolean
  submit
}
export default observer((props: IFilterDate) => {
  const { label, value, setValue, operator, setOperator, onlyBetween, submit } =
    props
  let op = operator || 'date'

  const ops = onlyBetween ? ['monthly'] : ['date', 'datetime', 'monthly']
  const opsItems = ops.map((r) => {
    return {
      key: r,
      text: niceCase(r),
    }
  })

  const wrapValue = (value, showArrow, meta) => {
    return (
      <div
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
      >
        {showArrow && (
          <Icon
            iconName="ChevronLeft"
            style={{
              width: '22px',
              cursor: 'pointer',
              userSelect: 'none',
              height: '30px',
              fontSize: '12px',
              lineHeight: '30px',
              marginLeft: '10px',
              marginRight: '-3px',
              marginBottom: '-3px',
            }}
            onClick={() => {
              let v = value
              if (typeof value === 'string') {
                v = parse(value, 'dd MMM yyyy', new Date())
              } else if (value && value.from) {
                v = value.from
              }

              if (v) {
                const date = subDays(v, 1)
                const from = startOfDay(date)
                const to = endOfDay(date)
                setValue({
                  from,
                  to,
                })
                submit()
              }
            }}
          />
        )}
        <Text
          style={{
            paddingRight: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
          onClick={() => {
            meta.show = true
          }}
        >
          {value}
        </Text>
        {showArrow && (
          <Icon
            iconName="ChevronRight"
            style={{
              width: '22px',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '12px',
              height: '30px',
              marginLeft: '-3px',
              lineHeight: '30px',
              marginBottom: '-3px',
            }}
            onClick={() => {
              let v = value
              if (typeof value === 'string') {
                v = parse(value, 'dd MMM yyyy', new Date())
              } else if (value && value.from) {
                v = value.from
              }

              if (v) {
                const date = addDays(v, 1)
                const from = startOfDay(date)
                const to = endOfDay(date)
                setValue({
                  from,
                  to,
                })
                submit()
              }
            }}
          />
        )}
      </div>
    )
  }

  return (
    <SingleFilter
      label={
        <Dropdown
          styles={{
            title: {
              border: '0',
              paddingRight: 0,
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
          onRenderTitle={() => {
            return (
              <div>
                <Label
                  style={{
                    fontWeight: 'normal',
                    fontSize: 14,
                    marginTop: -5,
                  }}
                >
                  {`${label}`}
                  {/* <Icon
                    iconName="ChevronDown"
                    style={{
                      margin: '0px 2px 0px 5px',
                      fontSize: '7px',
                    }}
                  /> */}
                  :
                </Label>
              </div>
            )
          }}
          selectedKey={op}
          options={opsItems}
          onChange={(e, item: any) => {
            setOperator(item.key)
            if (item.key === 'date' || item.key === 'datetime') {
              setValue(undefined)
              submit()
            }
          }}
        />
      }
      setValue={setValue}
      onClear={submit}
      callout={false}
      value={
        (
          {
            monthly: (
              <FilterDateMonthly
                value={value}
                setValue={setValue}
                submit={submit}
              />
            ),
            datetime:
              value instanceof Date
                ? dateFormat(value, 'dd MMM yyyy')
                : typeof value === 'object' && value.from
                ? dateFormat(value.from, 'dd MMM yyyy')
                : undefined,
            date:
              value instanceof Date
                ? (meta) =>
                    wrapValue(dateFormat(value, 'dd MMM yyyy'), true, meta)
                : typeof value === 'object' && value.from
                ? (meta) =>
                    wrapValue(dateFormat(value.from, 'dd MMM yyyy'), true, meta)
                : undefined,
          } as any
        )[op]
      }
    >
      {
        (
          {
            monthly: null,
            datetime: (
              <DateTime
                value={
                  value instanceof Date
                    ? value
                    : typeof value === 'object' && value.from
                    ? value.from
                    : undefined
                }
                onChange={(e: any) => {
                  setValue(e)
                  submit()
                }}
                styles={{ root: { padding: 10 } }}
              />
            ),
            date: (
              <DatePicker
                value={
                  value instanceof Date
                    ? value
                    : typeof value === 'object' && value.from
                    ? value.from
                    : undefined
                }
                formatDate={(date?: Date): string => {
                  if (!date) return ''
                  return dateFormat(date, 'dd MMM yyyy')
                }}
                onSelectDate={(e: any) => {
                  const from = startOfDay(e)
                  const to = endOfDay(e)
                  setValue({
                    from,
                    to,
                  })
                  submit()
                }}
                styles={{ root: { padding: 10 } }}
              />
            ),
          } as any
        )[op]
      }
    </SingleFilter>
  )
})
