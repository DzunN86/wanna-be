/** @jsx jsx */
import { jsx } from '@emotion/react'
import { List, ListInput } from 'framework7-react'
import { db } from 'libs'
import get from 'lodash.get'
import { useEffect, useRef } from 'react'
import { niceCase } from 'web.utils/src/niceCase'
import { useRender } from 'web.utils/src/useRender'
import type { IFieldType } from '../../ext/types/qform'
import type { IField } from './Field'
import { MobileBelongsTo } from './FieldMobileBelongsto'
import { detectType } from './FieldUtil'
import { MobileCamera } from './MobileCamera'
import { MobileUpload } from './MobileFileUpload'

export const useMobileRenderField = ({
  onReady,
  onCreateField,
  inputProps,
}) => {
  return useRef((rawprops: IField) => {
    let props = rawprops
    if (onCreateField) {
      props = onCreateField(rawprops)
    }

    const {
      name,
      value,
      original,
      alter,
      type: inputType,
      title: inputTitle,
      error,
      onChange: inputChange,
      required,
      loadingComponent,
      metaRef,
      info,
      internal,
      fieldProps,
    } = props

    const onChange = (value: any) => {
      if (inputChange) inputChange(value)
    }

    const cname =
      typeof name === 'string'
        ? (name.split('.').pop() || '').toLowerCase()
        : name

    let title = inputTitle
    if (!title) {
      if (typeof name === 'string' && name.indexOf('.') >= 0) {
        title = niceCase(name.split('.').pop() || '')
      } else {
        title = niceCase(name || '')
      }
    }

    let type = (inputType || detectType(value, name)).toLowerCase()

    let finalRender: any = null
    switch (type) {
      case 'string':
      case 'multiline':
      case 'password':
      case 'text':
      case 'phone':
      case 'number':
      case 'money':
      case 'rich':
        {
          finalRender = (
            <MobileInput
              label={title}
              type={type === 'multiline' ? 'textarea' : 'text'}
              mtype={type}
              resizable={type === 'multiline'}
              placeholder={fieldProps.placeholder}
              required={required}
              value={value || ''}
              info={info}
              disabled={props.readonly}
              noStoreData={true}
              onFocus={
                type === 'money'
                  ? (e) => {
                      e.target.value = e.target.value.replace(/[\W_]+/g, '')
                    }
                  : undefined
              }
              onBlur={
                type === 'money'
                  ? (e) => {
                      setTimeout(() => {
                        e.target.value = e.target.value
                          .toString()
                          .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                      })
                    }
                  : undefined
              }
              onChange={(val, e) => {
                let v = val;
                if (['money', 'number', 'phone'].indexOf(type) > -1) {
                  v = parseInt(val.replace(/[\W_]+/g, ''));
                }
                onChange(v || undefined);
              }}
              onInput={(e) => {
                let val = e.target.value;
                if (['money', 'number', 'phone'].indexOf(type) > -1) {
                  val = parseInt(val.replace(/[\W_]+/g, '')) || "";
                }
                e.target.value = val;
              }}
              errorMessageForce={!!error}
              errorMessage={error}
              validate
            ></MobileInput>
          )
        }
        break
      case 'array':
        finalRender = <div>Kosong</div>
        break
      case 'json':
        finalRender = <div>Kosong</div>
        break
      case 'date':
        {
          finalRender = (
            <>
              <MobileInput
                label={title}
                type="datepicker"
                placeholder={fieldProps.placeholder}
                required={!!required}
                disabled={props.readonly}
                info={info}
                value={
                  !!value
                    ? [typeof value !== 'object' ? new Date(value) : value]
                    : []
                }
                mtype={type}
                errorMessageForce={!!error}
                errorMessage={error}
                clearButton={!required}
                calendarParams={{
                  backdrop: true,

                  closeOnSelect: true,
                  header: true,
                  // sheetSwipeToClose: true,
                  dateFormat: 'dd M yyyy',
                  ...(fieldProps?.calendar || {}),
                  on: {
                    change: function (ev, date: any) {
                      onChange(date[0]?.toJSON())
                    },
                  },
                }}
              />
            </>
          )
        }
        break
      case 'map':
        {
          finalRender = <div>halo saya cobain map</div>
        }
        break
      case 'info':
        {
          let infoValue = value || ''
          const def = get(internal, `def.${name}`)
          const type = def.type
          let onValueLoad: any = undefined
          if (type === 'Model.BelongsToOneRelation') {
            const rel = def.rel
            const from = rel.join.from.split('.').pop()
            const to = rel.join.to.split('.').pop()
            infoValue = internal?.value[from]
            onValueLoad = async (val: any) => {
              const res = await db[def.name].findFirst({
                where: {
                  [to]: infoValue,
                },
              })
              for (let [k, v] of Object.entries(res)) {
                if (k !== to) return v
              }
            }
          }

          finalRender = (
            <MobileInput
              label={title}
              type="text"
              mtype={type}
              disabled
              placeholder={fieldProps.placeholder}
              required={required}
              value={infoValue}
              info={info}
              onValueLoad={onValueLoad}
              onChange={onChange}
              errorMessageForce={!!error}
              errorMessage={error}
              validate
            ></MobileInput>
          )
        }
        break
      case 'select': {
        let items = []
        if ((props as any).items) {
          if (typeof (props as any).items === 'function') {
            items = (props as any).items({ data: props.row })
          } else {
            items = (props as any).items
          }
        }

        finalRender = (
          <MobileInput
            label={title}
            mtype={type}
            type="select"
            placeholder={fieldProps.placeholder}
            required={required}
            disabled={props.readonly}
            value={value || ''}
            info={info}
            onChange={(v) => {
              const isNumber =
                typeof items[0] === 'object'
                  ? typeof (items[0] as any).value === 'number'
                  : typeof items[0] === 'number'
              if (isNumber) {
                onChange(parseInt(v))
              } else {
                onChange(v)
              }
            }}
            errorMessageForce={!!error}
            errorMessage={error}
            validate
          >
            {items.map((e: string | { value: any; label: string }, idx) => (
              <option value={typeof e === 'object' ? e.value : e} key={idx}>
                {typeof e === 'object' ? e.label : e}
              </option>
            ))}
          </MobileInput>
        )
        break
      }
      case 'loading':
        finalRender = (
          <div className="list">
            <ul>Loading</ul>
          </div>
        )
        break
      case 'file': {
        finalRender = (
          <MobileUpload
            label={title || ''}
            name={name}
            required={required}
            disabled={props.readonly}
            internal={internal}
            value={value || ''}
            info={info}
            errorMessageForce={!!error}
            errorMessage={error}
            onChange={onChange}
            hidePreview={fieldProps?.hidePreview}
            accept={fieldProps?.accept}
          />
        )
        break
      }
      case 'camera': {
        finalRender = (
          <MobileCamera
            label={title || ''}
            name={name}
            required={required}
            disabled={props.readonly}
            internal={internal}
            value={value || ''}
            info={info}
            errorMessageForce={!!error}
            errorMessage={error}
            onChange={onChange}
            cameraProps={fieldProps?.camera}
            hidePreview={fieldProps?.hidePreview}
          />
        )
        break
      }
      case 'belongs-to':
        {
          const def = fieldProps.def
          const rel = fieldProps.def.rel
          const params: any = {}

          if ((props as any).where) {
            params.where = (props as any).where
          }
          let to = ''
          let from = ''
          if (rel.modelClass === def.name) {
            from = rel.join.from.split('.').pop()
            to = rel.join.to.split('.').pop()
            finalRender = (
              <MobileBelongsTo
                label={title || niceCase(rel.modelClass)}
                value={value}
                row={internal?.value}
                info={info}
                name={name}
                disabled={props.readonly}
                create={(props as any).create}
                errorMessageForce={!!error}
                errorMessage={error}
                relation={{
                  table: rel.modelClass,
                  label: (e) => {
                    for (let i of Object.keys(e)) {
                      if (i.toLowerCase().indexOf('id') < 0) return i
                    }
                    return ''
                  },
                  params: params,
                  value: (e) => {
                    for (let i of Object.keys(e)) {
                      if (i.toLowerCase().indexOf('id') >= 0) return i
                    }
                  },
                  from,
                  to,
                  nullable: def.nullable,
                }}
                required={!!required}
                onChange={onChange}
              />
            )
          }
        }
        break
    }
    return { finalRender, error }
  })
}

const MobileInput = (
  props: Parameters<typeof ListInput>[0] & {
    mtype: IFieldType
    onValueLoad?: (val: any) => Promise<void>
  }
) => {
  const value = useRef('' as any)
  const render = useRender()
  const onChange = (ev: any) => {
    if (ev.target) {
      value.current = ev.target.value
      render()

      if (props.onChange) props.onChange(ev.target.value)
    }
  }

  useEffect(() => {
    if (typeof value.current === 'object' && typeof props.value === 'object') {
      if (JSON.stringify(value.current) !== JSON.stringify(props.value)) {
        value.current = props.value
        render()
      }
      return
    }
    if (value.current !== props.value) {
      if (props.onValueLoad) {
        props.onValueLoad(props.value).then((e) => {
          value.current = e
          render()
        })
      } else {
        value.current = props.value
        render()
      }
    }
  }, [props.value])

  return (
    <List className={`${props.required ? 'required' : ''} `}>
      <ListInput
        {...props}
        label={props.label}
        placeholder={props.placeholder}
        required={props.required}
        value={value.current}
        onChange={onChange}
        ref={
          ((e) => {
            if (props.mtype === 'money' && e && e.el) {
              const input = e.el.querySelector('input')
              if (input && document.activeElement !== input) {
                input.value = input.value
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
              }
            }
          }) as any
        }
      ></ListInput>
    </List>
  )
}
