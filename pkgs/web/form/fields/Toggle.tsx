import React from 'react'
import { Toggle as FluentToggle } from '@fluentui/react/lib/Toggle'

interface IProps {
  style?: any
  label?: string
  defaultChecked?: boolean
  onChange: (event: any, checked?: boolean) => void
  onText?: string
  offText?: string
}

export const Toggle = ({
  label,
  defaultChecked = true,
  onChange,
  onText = 'Yes',
  offText = 'No',
}: IProps) => {
  const _onChange = (event: React.MouseEvent<HTMLElement>, checked?: boolean) => {
    onChange(event, checked)
  }
  return (
    <FluentToggle
      label={label}
      defaultChecked={defaultChecked}
      onText={onText}
      offText={offText}
      styles={{ pill: 'focus:outline-none' }}
      onChange={_onChange}
    />
  )
}
