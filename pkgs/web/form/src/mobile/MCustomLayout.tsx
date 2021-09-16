/** @jsx jsx */
import { jsx, css } from '@emotion/react'
import { observer } from 'mobx-react-lite'
import { isValidElement, useEffect, useRef } from 'react'
import { useRender } from 'web.utils/src/useRender'
import type { IQueryComponentProps } from '../../../ext/types/qform'
import type { ICreateFields } from '../Form'
import { Button, Icon } from 'framework7-react'

interface ICustomLayout {
  layout: IQueryComponentProps['layout']
  createFields: ICreateFields
  childProps: any
  value: any
  update: (value: any) => void
}

export const MCustomLayout = observer((props: ICustomLayout) => {
  let { layout, createFields } = props
  const {
    save,
    status,
    Header,
    db,
    reset,
    errors,
    render,
    setValidateOnChange,
    validation,
    validate,
    errorReason,
  } = props.childProps || {} // childProps

  return (
    <RecursiveLayout
      props={{
        createFields,
        validation: validation || {},
        errors: errors || {},
        value: props.value,
        update: props.update,
        setValidateOnChange: setValidateOnChange || (() => {}),
      }}
      layout={layout}
    />
  )
})

const RecursiveLayout = (p: {
  props: {
    validation: any
    errors: any
    setValidateOnChange(p: boolean)
    value: ICustomLayout['value']
    update: ICustomLayout['update']
    createFields: ICustomLayout['createFields']
  }
  layout: IQueryComponentProps['layout']
  idx?: number
  mode?: 'row' | 'col'
}) => {
  let { props, layout, idx, mode } = p
  const { createFields, validation, errors, setValidateOnChange } = props
  const render = useRender()

  if (typeof layout === 'string') {
    if ((layout as any).indexOf('::') === 0) {
      const title = (layout as any).substr(2)
      return (
        <div
          className="block-title form-section"
          css={css`
            width: 100%;
            background: white;
            margin: 0px;
            padding: 36px 16px 10px 16px;
          `}
        >
          {title}
        </div>
      )
    }
    let layoutarr = (layout as string).split(':')
    let name: string = layoutarr[0]
    let required = false
    if (name[name.length - 1] === '*') {
      name = name.substr(0, name.length - 1)
      required = true
      validation[name] = ['required']
    }
    let cf = createFields[name]
    if (!cf) {
      if (createFields._) {
        cf = createFields._
      } else {
        return null
      }
    }
    const Field = cf.Field
    if (!Field) return null
    cf.update = render

    return (
      <div key={idx} className={`flex-1 flex flex-${mode} items-stretch`}>
        <Field name={name} title={layoutarr[1]} required={required} error={errors[name]}></Field>
      </div>
    )
  }
  if (typeof layout === 'function') {
    const watchRef = useRef([] as string[])
    useEffect(() => {
      for (let k of watchRef.current) {
        const cf = createFields[k]
        if (cf) cf.watches.push(render)
      }

      return () => {
        for (let k of watchRef.current) {
          const cf = createFields[k]
          if (cf && cf.watches.indexOf(render) >= 0) {
            cf.watches.splice(cf.watches.indexOf(render), 1)
          }
        }
      }
    }, [watchRef.current])
    return (
      <div className="list">
        <ul className="flex flex-1">
          <div
            className="flex-1 flex items-center relative"
            css={css`
              padding: 6px 8px;
            `}
          >
            {(layout as any)({
              row: props.value,
              update: (v) => {
                props.update(v)
                render()
              },
              watch: (keys: string[]) => {
                watchRef.current = keys
              },
            })}
          </div>
        </ul>
      </div>
    )
  }
  if (isValidElement(layout)) {
    return layout
  }

  if (Array.isArray(layout)) {
    if (!mode) {
      mode = 'row'
    }

    return (
      <>
        {layout.map((e: any, idx) => {
          return (
            <div key={idx} className={`flex-1 flex flex-${mode} items-stretch`}>
              <RecursiveLayout
                props={props}
                layout={e}
                mode={mode === 'row' ? 'col' : 'row'}
              />
            </div>
          )
        })}
      </>
    )
  }
  return null
}
