/** @jsx jsx */
import { jsx } from '@emotion/react'
import startCase from 'lodash.startcase'
import { action } from 'mobx'
import { Observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { useRender } from 'web.utils/src/useRender'
import { ICreateFields, IFormFields } from '../Form'

interface ITabbedForm {
  fields: IFormFields
  isArray: boolean
  meta: any
  alter?: any
  createFields: ICreateFields
}
export const TabbedForm = (props: ITabbedForm) => {
  const { fields, isArray, createFields, meta, alter } = props
  const render = useRender()
  useEffect(() => {
    if (!meta.currentTab && fields[0]) {
      meta.currentTab = fields[0][0]
      meta.currentTabType = fields[0][1].type
      render()
    }
  }, [fields])
  return (
    <Observer>
      {() => {
        if (!fields[0] || !meta.currentTab || createFields[meta.currentTab])
          return null

        const Field = createFields[meta.currentTab].Field
        if (!Field) return null
        return (
          <div className="flex flex-row items-stretch flex-1 mt-2 ">
            <div
              className={
                (isArray ? '' : ' w-2/12') +
                'flex flex-col border-r border-gray-300'
              }
            >
              {fields.map(([k, v]) => {
                const _onClick = action(() => {
                  meta.currentTab = k
                  meta.currentTabType = v.type
                  render()
                })
                return (
                  <div
                    key={k}
                    onClick={_onClick}
                    className={
                      'flex select-none items-center justify-end p-2 text-sm font-semibold cursor-pointer hover:text-gray-500' +
                      (meta.currentTab === k ? ' bg-gray-300 ' : ' ')
                    }
                  >
                    {isArray ? parseInt(k) + 1 : startCase(k)}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-col flex-1">
              <Field
                key={meta.currentTab}
                name={meta.currentTab}
                type={meta.currentTabType}
                
              />
            </div>
          </div>
        )
      }}
    </Observer>
  )
}
