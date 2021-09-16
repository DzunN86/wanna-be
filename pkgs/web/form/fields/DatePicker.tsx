/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  DatePicker,
  DayOfWeek,
  IDatePickerStrings,
  mergeStyleSets,
} from '@fluentui/react'
import format from 'date-fns/format'
import React, { useState } from 'react'
import { FieldInfo } from './FieldInfo'

interface IDateProps {
  style?: any
  title?: string
  required?: boolean
  value?: Date | string
  onSelectDate: (date: Date | null | undefined) => void
}

export default (props: IDateProps) => {
  const { title, required, onSelectDate, value } = props
  const controlClass = mergeStyleSets({
    control: {
      margin: '0 0 15px 0',
      maxWidth: '300px',
    },
  })

  const DayPickerStrings: IDatePickerStrings = {
    months: [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'June',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ],

    shortMonths: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ],

    days: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],

    shortDays: ['M', 'S', 'S', 'R', 'K', 'J', 'S'],

    goToToday: 'Go to today',
    prevMonthAriaLabel: 'Go to previous month',
    nextMonthAriaLabel: 'Go to next month',
    prevYearAriaLabel: 'Go to previous year',
    nextYearAriaLabel: 'Go to next year',
    closeButtonAriaLabel: 'Close date picker',
    monthPickerHeaderAriaLabel: '{0}, select to change the year',
    yearPickerHeaderAriaLabel: '{0}, select to change the month',
  }

  const [finalValue, setFinalValue] = useState(
    typeof value === 'string' ? new Date(value) : value
  )
  const _onSelectDate = (date: Date | null | undefined) => {
    if (date && isValidDate(date)) {
      setFinalValue(date)
      onSelectDate(date)
    }
  }

  const onFormatDate = (date?: Date): string => {
    if (!date) return ''
    try {
      return format(date, 'dd MMM yyyy')
    } catch (e) {
      return ''
    }
  }
  return (
    <React.Fragment>
      <DatePicker
        {...props}
        isRequired={required}
        label={title}
        className={controlClass.control}
        firstDayOfWeek={DayOfWeek.Monday}
        strings={DayPickerStrings}
        value={finalValue}
        placeholder="Select a date..."
        ariaLabel="Select a date"
        onSelectDate={_onSelectDate}
        formatDate={onFormatDate}
        css={css`
          display: flex;
          max-width: 100%;
          align-items: stretch;
          margin-bottom: 0px;

          > div {
            display: flex;
            flex: 1;

            > .ms-TextField {
              width: 100%;

              > span {
                display: none;
              }
            }
          }
        `}
      />
    </React.Fragment>
  )
}

function isValidDate(d: any) {
  return d instanceof Date && !isNaN(d as any)
}
