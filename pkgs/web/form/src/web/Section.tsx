/** @jsx jsx */
import { jsx } from '@emotion/react'
import { Label } from '@fluentui/react'

export type ISection = {
  colNum?: number
  title?: string
  className?: string
  children?: any
}

export const Section = (props: ISection) => {
  const { title, colNum = 3, children, className } = props

  let fields = children

  if (!Array.isArray(children)) {
    fields = [children]
  }

  return (
    <div className="flex flex-1 section relative overflow-auto">
      {title && (
        <Label className="px-1 py-1 border-b border-gray-300">{title}</Label>
      )}
      <div
        className={
          'section-body w-full'
        }
      >
        {fields.map((item: any, idx: number) => {
          if (item) {
            return item
          }
        })}
      </div>
    </div>
  )
}
