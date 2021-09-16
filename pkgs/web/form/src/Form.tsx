/** @jsx jsx */
import { jsx, css } from '@emotion/react'
import get from 'lodash.get'
import set from 'lodash.set'
import trim from 'lodash.trim'
import { action, runInAction, toJS } from 'mobx'
import { observer } from 'mobx-react-lite'
import { ReactElement, useEffect, useRef, useState } from 'react'
import { initFluent } from 'web.init/src/web/initFluent'
import { makeEmpty } from 'web.utils/src/makeEmpty'
import { picomatch } from 'web.utils/src/picomatch'
import { useRender } from 'web.utils/src/useRender'
import type { ITableDef, ITableDefSingle } from '../../ext/types/list'
import type { IFieldType, IQueryComponentProps } from '../../ext/types/qform'
import {
  Field as RawField,
  IField,
  IFieldAlter,
  IFieldAlterer,
} from '../fields/Field'
import { inspectDef } from '../fields/FieldUtil'
import { useWebRenderField } from '../fields/FieldWeb'
import type { FormInternal } from './QueryForm'
import { CustomLayout } from './web/CustomLayout'
import type { ISection } from './web/Section'
import { SectionForm } from './web/SectionForm'
import { TabbedForm } from './web/TabbedForm'

interface IForm {
  title?: string
  table?: string
  value: any
  mutation: 'create' | 'update'
  alter?: IFieldAlter | IFieldAlterer
  children?: IFormChildren<IFormChildrenProps & any>
  childProps?: any & { errors: any }
  def?: ITableDef
  layout?: IQueryComponentProps['layout']
  colNum?: number
  className?: string
  onChange: (value: any, key: string) => void
  createField?: (cprops: IField & { key?: any }) => IField & { key?: any }
  loadingComponent?: ReactElement
  mode?: 'tab' | 'section'
  original?: any
  metaRef?: {
    current: {
      currentTab: null
      currentTabType: ''
      fields: Record<string, { current: any }>
    }
  }
}
export type IFormChildrenProps = {
  Section: (props: ISection) => any
  Field: (props: IField) => any
  data: any
}
export type IFormChildren<T> = never[] | ((props: T) => any)
export type CField = IField & { key: any }
export type IFormFields = [
  string,
  {
    name: string
    type: IFieldType
  }
][]

export const Form = observer((props: IForm) => {
  const { childProps } = props
  const { header, Header, save, status } = childProps || {}
  let head: any = null
  if (header !== false) {
    if (
      Header &&
      (typeof header === 'boolean' ||
        typeof header === 'undefined' ||
        typeof header === 'object')
    ) {
      head = <Header {...header} />
    }
    if (typeof header === 'function') {
      head = header({ save, status })
    }
  }

  const [init, setInit] = useState(false)
  useEffect(() => {
    if (!(window as any).fluentInit) {
      initFluent().then(() => {
        setInit(true)
      })
    } else {
      setInit(true)
    }
  }, [])

  if (!init) {
    return null
  }

  return (
    <>
      {head}
      <div
        className="form-body w-full h-full flex-1 flex"
        css={css`
          .field-web-wrapper {
            margin: 0px 8px;
            &.has-many {
              margin: 0px;
            }
          }
        `}
      >
        <FormBody
          title={props.title}
          table={props.table}
          mutation={props.mutation}
          value={props.value}
          childProps={props.childProps}
          def={props.def}
          metaRef={props.metaRef}
          createField={props.createField}
          mode={props.mode}
          colNum={props.colNum}
          onChange={props.onChange}
          alter={props.alter}
          layout={props.layout}
        />
      </div>
    </>
  )
})

export type ICreateFields = Record<string, ICreateSingleField>
type ICreateSingleField = {
  Field: (props: any) => ReactElement
  def: ITableDefSingle
  alter: any
  update: (value: any) => void
  watches: (() => void)[]
}

const FormBody = ({
  title,
  value,
  layout,
  def,
  metaRef,
  childProps,
  createField,
  onChange,
  table,
  mutation,
  colNum,
  mode: _mode,
  alter: _alter,
}: IForm) => {
  const _ = useRef<FormInternal>({
    value: toJS(value),
    history: prepareHistory(value),
    def: def || inspectDef({ _: value }),
    table: table || '',
    createFields: {} as ICreateFields,
    errorPopover: true,
  })
  const render = useRender()
  const internal = _.current
  const meta = prepareMeta(metaRef || useRef({} as any))
  const { alter, fields } = prepareFields(_alter, internal.def, internal.value)
  const mode = getMode(_mode)

  const update = async (newData?: any) => {
    if (
      Object.keys(internal.def).length === 0 ||
      (meta.current && meta.current._shouldUpdateFieldInternal)
    ) {
      if (meta.current && meta.current._shouldUpdateFieldInternal) {
        meta.current._shouldUpdateFieldInternal = false
      }
      internal.history = prepareHistory(value)
    }

    let init = false
    if (Object.keys(internal.createFields).length === 0) {
      if (!internal.createFields._) {
        internal.createFields._ = {
          update: () => {},
          watches: [],
          alter,
          def: { type: 'text' } as any,
          Field: (props) => {
            let type = props.type
            let fieldProps = { ...props.fieldProps }
            const value = get(internal.value, props.name)
            return (
              <RawField
                {...props}
                type={type}
                fieldProps={fieldProps}
                alter={alter as any}
                name={props.name}
                internal={internal}
                value={value}
                row={internal.value}
                onCreateField={createField}
                onChange={action((newval: any, key: string) => {
                  set(internal.value, props.name, newval)
                  if (onChange) onChange(internal.value, key)
                })}
                useRenderField={useWebRenderField}
              />
            )
          },
        }
      }

      for (let [k, def] of Object.entries(internal.def)) {
        generateCreateField({
          internal,
          createField,
          k,
          def,
          alter,
          onChange: (v) => {
            if (onChange) onChange(v, k)
            if (internal.createFields[k].watches.length > 0) {
              for (let w of internal.createFields[k].watches) {
                if (typeof w === 'function') {
                  w()
                }
              }
            }
          },
        })
      }

      init = true
    }

    if (typeof newData === 'object') {
      for (let [k, v] of Object.entries(newData)) {
        runInAction(() => {
          internal.value[k] = v
        })
        internal.createFields[k].update(v)
        if (internal.createFields[k].watches.length > 0) {
          for (let w of internal.createFields[k].watches) {
            if (typeof w === 'function') {
              w()
            }
          }
        }
      }
    } else if (!init) {
      console.error(
        'Gaes, tolong: kalau manggil update(args:{}) --> args nya diisi object value yg baru.'
      )
    }

    if (init) render()
  }

  useEffect(() => {
    _.current.value = toJS(value)
    render()
  }, [value])

  useEffect(() => {
    update()
  }, [])

  if (Object.keys(internal.createFields).length === 0) {
    return null
  }

  if (layout) {
    return (
      <CustomLayout
        layout={layout}
        mutation={mutation}
        createFields={internal.createFields}
        childProps={childProps}
        value={internal.value}
        update={update}
      />
    )
  }

  if (mode === 'tab') {
    return (
      <TabbedForm
        createFields={internal.createFields}
        fields={fields}
        meta={meta.current}
        alter={alter}
        isArray={Array.isArray(internal.value)}
      />
    )
  }

  return (
    <SectionForm
      createFields={internal.createFields}
      title={title}
      colNum={colNum || Object.keys(internal.def).length <= 2 ? 1 : 2}
      fields={fields}
    />
  )

  return null
}

const prepareFields = (alter: IForm['alter'], def: ITableDef, values: any) => {
  let fields: any = []
  let alt = alter
  const objectFields = { ...values }

  if (alter && alt) {
    if (typeof alt.lastPath !== 'string') {
      alt = {
        lastPath: '',
        replacer: alt as any,
      }
    }

    if (
      typeof alt.lastPath === 'string' &&
      alt.replacer &&
      Object.keys(alt.replacer).length > 0
    ) {
      for (const [key, value] of Object.entries(def)) {
        const path = trim([...alt.lastPath.split('.'), key].join('.'), '.')
        for (let [k, v] of Object.entries(alt.replacer)) {
          if (picomatch.isMatch(path, k)) {
            if (!v) {
              delete objectFields[key]
            }
          }
        }
      }
    }
  }

  for (let [k, v] of Object.entries(def)) {
    if (v.pk) continue
    fields.push([k, v])
  }

  return {
    alter: alt,
    fields,
  }
}

const getMode = (mode: IForm['mode']) => {
  if (mode) {
    return mode
  }
  return 'section'
}

const prepareMeta = (meta: { current: any }) => {
  if (!meta.current.fields) {
    meta.current.fields = {}
  }
  return meta
}

const prepareHistory = (value: any) => {
  if (typeof value === 'object') {
    return {
      original: toJS(value),
      empty: makeEmpty(value),
    }
  }

  return {
    original: toJS({ _: value }),
    empty: makeEmpty({ _: value }),
  }
}

const generateCreateField = ({
  internal,
  k,
  createField,
  def,
  alter,
  onChange,
}) => {
  internal.createFields[k] = {
    update: () => {},
    watches: [],
    def: def,
    alter,
    Field: function (props: Parameters<typeof RawField>[0]) {
      let type = props.type
      let fieldProps = { ...props.fieldProps }
      if (def.rel) {
        if (def.rel.relation === 'Model.BelongsToOneRelation') {
          type = 'belongs-to'
        } else if (def.rel.relation === 'Model.HasManyRelation') {
          type = 'has-many'
        }
        fieldProps.def = def
      }
      if (def.type === 'Model.BelongsToOneRelation') {
        type = 'belongs-to'
        fieldProps.def = def
      } else if (def.type === 'Model.HasManyRelation') {
        type = 'has-many'
        fieldProps.def = def
      }

      const value = get(internal.value, props.name)
      return (
        <RawField
          {...props}
          type={type}
          fieldProps={fieldProps}
          alter={alter as any}
          onCreateField={createField}
          name={props.name}
          value={value}
          internal={internal}
          row={internal.value}
          useRenderField={useWebRenderField}
          onChange={action((newval: any) => {
            set(internal.value, props.name, newval)
            if (onChange) onChange(internal.value)
          })}
        />
      )
    },
  }
}
