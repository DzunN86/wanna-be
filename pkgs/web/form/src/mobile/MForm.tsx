/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Button } from 'framework7-react'
import get from 'lodash.get'
import set from 'lodash.set'
import trim from 'lodash.trim'
import { action, runInAction, toJS } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { inspectDef } from 'web.form/fields/FieldUtil'
import { picomatch } from 'web.utils/src/picomatch'
import { useRender } from 'web.utils/src/useRender'
import type { ITableDef } from '../../../ext/types/list'
import type { IQueryComponentProps } from '../../../ext/types/qform'
import {
  Field as RawField,
  IField,
  IFieldAlter,
  IFieldAlterer,
} from '../../fields/Field'
import { useMobileRenderField } from '../../fields/FieldMobile'
import type { ICreateFields } from '../Form'
import type { FormInternal } from '../QueryForm'
import { MCustomLayout } from './MCustomLayout'

interface IMForm {
  title?: string
  table?: string
  action?: IQueryComponentProps['action']
  value: any
  alter?: IFieldAlter | IFieldAlterer
  childProps?: any & { errors: any }
  def?: ITableDef
  layout?: IQueryComponentProps['layout']
  className?: string
  createField?: (cprops: IField & { key?: any }) => IField & { key?: any }
  onChange: (value: any, key: string) => void
  metaRef?: {
    current: {
      currentTab: null
      currentTabType: ''
      fields: Record<string, { current: any }>
    }
  }
}

export const MForm = observer((props: IMForm) => {
  const {
    title,
    value,
    def,
    metaRef,
    alter: _alter,
    onChange,
    createField,
    layout,
    childProps,
    table,
  } = props
  const _ = useRef<FormInternal>({
    value: toJS(value),
    def: def || inspectDef({ _: value }),
    table: table || '',
    createFields: {} as ICreateFields,
    errorPopover: true,
  })
  const render = useRender()
  const internal = _.current
  const meta = prepareMeta(metaRef || useRef({} as any))
  const { alter, fields } = prepareFields(_alter, internal.def, internal.value)
  const { save, status, errors, errorReason } = childProps
  const update = async (newData?: any) => {
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
                onChange={action((newval: any) => {
                  set(internal.value, props.name, newval)
                  if (onChange) onChange(internal.value, props.name)
                })}
                useRenderField={useMobileRenderField}
              />
            )
          },
        }
      }

      for (let [k, def] of Object.entries(internal.def)) {
        generateCreateField({
          internal,
          k,
          createField,
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
    }

    if (init) render()
  }

  useEffect(() => {
    _.current.value = toJS(value)
  }, [value])

  useEffect(() => {
    if (errorReason) {
      internal.errorPopover = true
      render()
    }
  }, [errorReason])

  useEffect(() => {
    update()
  }, [])

  if (Object.keys(internal.createFields).length === 0) {
    return null
  }

  let result: any = null

  let clayout = layout
  if (!clayout) {
    clayout = Object.values(internal.def)
      .map((e) => {
        if (e.pk) return null
        if (e.rel && e.type.indexOf('Model.') < 0) return null
        return e.name as any
      })
      .filter((e) => e)
  }

  if (clayout) {
    result = (
      <MCustomLayout
        layout={clayout}
        createFields={internal.createFields}
        childProps={childProps}
        value={internal.value}
        update={update}
      />
    )
  }

  const asave = get(props, 'action.save')

  return (
    <div
      className="flex flex-col flex-1 w-full h-full overflow-y-auto"
      css={css`
        margin: 0px 0px 0px 0px;
        .list ul {
          background-color: transparent !important;
        }
      `}
    >
      {title && <div className="block-title form-title">{title}</div>}

      <div className="flex flex-col h-full w-full">
        <div className="flex flex-1 flex-col pb-20 overflow-y-auto relative">
          <div
            className="absolute inset-0 overflow-x-hidden"
            css={css`
              background-color: #f9fafb;
            `}
          >
            {result}
          </div>

          {errorReason && internal.errorPopover && (
            <div
              className="absolute bottom-0 right-0 z-10 bg-white border-2 m-3 mb-0 text-red-600 border-red-400 rounded-md p-2"
              onClick={() => {
                internal.errorPopover = false
                render()
              }}
              css={css`
                -webkit-animation: resize 0.5s; /* Chrome, Safari, Opera */
                animation: resize 0.5s;
                height: 90%;
                width: 90%;
                @keyframes resize {
                  from {
                    width: 0px;
                    height: 0px;
                    opacity: 0;
                  }
                  to {
                    width: 90%;
                    height: 90%;
                    opacity: 1;
                  }
                }
                .ms-Label {
                  color: red;
                }
              `}
            >
              <div className="relative h-full overflow-auto">
                <div className="absolute inset-0">{errorReason}</div>
              </div>
            </div>
          )}
        </div>

        {asave === false ? null : (
          <div className="flex flex-row items-stretch">
            <Button
              onClick={save}
              fill
              raised
              large
              className={'btn-save flex-1 submit-btn capitalize m-3 '}
              icon="ios:checkmark"
            >
              {status === 'Menyimpan'
                ? 'Menyimpan...'
                : typeof asave === 'string'
                ? asave
                : 'Simpan'}
            </Button>
            {(status === 'Gagal' || errorReason) && (
              <>
                <Button
                  raised
                  outline
                  animate
                  large
                  color="red"
                  className="flex items-center justify-center my-3 mr-3"
                  css={css`
                    font-size: 25px;
                  `}
                  onClick={() => {
                    internal.errorPopover = !internal.errorPopover
                    render()
                  }}
                >
                  ⚠️
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

const prepareMeta = (meta: { current: any }) => {
  if (!meta.current.fields) {
    meta.current.fields = {}
  }
  return meta
}

const prepareFields = (alter: IMForm['alter'], def: ITableDef, values: any) => {
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

const generateCreateField = ({
  internal,
  k,
  def,
  alter,
  createField,
  onChange,
}) => {
  internal.createFields[k] = {
    update: () => {},
    watches: [],
    def: def,
    Field: (props: Parameters<typeof RawField>[0]) => {
      let type = props.type
      let fieldProps = { ...props.fieldProps }
      if (def.rel) {
        if (def.rel.relation === 'Model.BelongsToOneRelation') {
          type = 'belongs-to'
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

      let required = props.required
      if (def.nullable === false) {
        required = true
      }

      if (type === undefined && def.type) {
        type = def.type.toLowerCase()
      }

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
          onChange={action((newval: any) => {
            set(internal.value, props.name, newval)
            if (onChange) onChange(internal.value)
          })}
          required={required}
          useRenderField={useMobileRenderField}
        />
      )
    },
  }
}
