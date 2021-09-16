/** @jsx jsx */
import { jsx, css } from '@emotion/react'
import { Fragment } from 'react'
import { isValidElement, ReactElement } from 'react'
import type { CField, ICreateFields, IFormFields } from '../Form'
import { Section } from './Section'

interface ISectionForm {
  colNum: number
  title?: string
  fields: IFormFields
  createFields: ICreateFields
}

export const SectionForm = (props: ISectionForm) => {
  const { colNum, fields, title, createFields } = props
  return (
    <Section colNum={colNum || 2} title={title}>
      {fields.map(([k, v]) => {
        const cf = createFields[k]
        if (!cf) return null

        const Field = cf.Field

        if (isValidElement(v)) {
          return <Fragment key={k}>{v}</Fragment>
        } else if (typeof v === 'function') {
          return (v as any)(<Field key={k} name={k} />)
        }
        const width = `${100 / colNum}%`
        if (v) {
          return (
            <Field
              key={k}
              name={k}
              setRender={(render) => {
                cf.update = render
              }}
              wrapper={(c) => {
                if (!c) return null
                return (
                  <div
                    key={k}
                    className="field-wrapper"
                    css={css`
                      width: ${width};
                      float:left;
                    `}
                  >
                    {c}
                  </div>
                )
              }}
              type={v.type}
            />
          )
        }
      })}
    </Section>
  )
}
