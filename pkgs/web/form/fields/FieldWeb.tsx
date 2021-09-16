/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Label, ProgressIndicator } from '@fluentui/react'
import get from 'lodash.get'
import set from 'lodash.set'
import startCase from 'lodash.startcase'
import trim from 'lodash.trim'
import { Fragment, useRef } from 'react'
import { niceCase } from 'web.utils/src/niceCase'
import AdminCMS from '../src/AdminCMS'
import { Form } from '../src/Form'
import DatePicker from './DatePicker'
import { IField } from './Field'
import { detectType } from './FieldUtil'
import { FileUpload } from './FileUpload'
import { JsonArray } from './JsonArray'
import Select from './Select'
import TextField from './TextField'

export const useWebRenderField = ({ onReady, onCreateField }) => {
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
      internal,
      error,
      onChange: inputChange,
      required,
      metaRef,
      loadingComponent,
      fieldProps,
    } = props

    const onChange = (val: any) => {
      if (inputChange) inputChange(val)
    }

    const cname =
      typeof name === 'string'
        ? (name.split('.').pop() || '').toLowerCase()
        : name
    const title =
      inputTitle ||
      niceCase(
        (typeof name === 'string' && name.indexOf('.') > 0
          ? name.split('.').pop()
          : name) || ''
      )
    let type = (inputType || detectType(value, name)).toLowerCase()

    let finalRender: any = null
    switch (type) {
      case 'string':
      case 'multiline':
      case 'password':
      case 'text':
      case 'phone':
      case 'number':
      case 'rich':
        if (type === 'string') {
          if (cname.indexOf('pass') === 0) {
            type = 'password'
          } else {
            if (
              cname.indexOf('body') >= 0 ||
              cname.indexOf('content') >= 0 ||
              cname.indexOf('text') >= 0 ||
              cname.indexOf('html') >= 0 ||
              cname.indexOf('info') >= 0 ||
              cname.indexOf('desc') >= 0
            ) {
              type = 'rich'
            }
          }
        }

        finalRender = (
          <TextField
            label={title}
            loadingComponent={loadingComponent}
            value={value || ''}
            metaRef={metaRef}
            alter={alter}
            type={type === 'multiline' ? 'text' : type}
            multiline={type === 'multiline'}
            required={required}
            onChange={onChange}
            onReady={onReady}
            {...fieldProps}
          />
        )
        break
      case 'array':
        finalRender = (
          <JsonArray
            value={value}
            loadingComponent={loadingComponent}
            name={title || name}
            arrayOptions={{}}
            original={original}
            metaRef={metaRef}
            onChange={onChange}
            alter={{
              lastPath: trim(`${alter?.lastPath}.${name}`, '.'),
              replacer: {
                ...alter?.replacer,
              },
            }}
            {...fieldProps}
          />
        )
        break
      case 'json':
        finalRender = (
          <Fragment>
            <Form
              title={title || niceCase(name)}
              value={value}
              original={original}
              metaRef={metaRef}
              layout={fieldProps ? fieldProps.layout : undefined}
              loadingComponent={loadingComponent}
              onChange={onChange}
              alter={
                alter
                  ? {
                      lastPath: trim(`${alter?.lastPath}.${name}`, '.'),
                      replacer: {
                        ...alter?.replacer,
                      },
                    }
                  : undefined
              }
              {...fieldProps}
            />
          </Fragment>
        )
        break
      case 'date':
        finalRender = (
          <DatePicker
            value={value}
            title={title || niceCase(name)}
            required={required}
            onSelectDate={onChange}
            {...fieldProps}
          />
        )
        break
      case 'info':
        finalRender = (
          <div className="flex flex-col">
            <Label>{title}</Label>
            <div
              className="flex text-sm"
              css={css`
                border: 1px solid #ccc;
                border-radius: 2px;
                padding: 3px 8px 4px 8px;
                background: #fafafa;
                height: 32px;
                align-items: center;
              `}
            >
              {value}
            </div>
          </div>
        )
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
          <Select
            label={title}
            selectedKey={value}
            items={items || []}
            required={required}
            onChange={(e, v) => {
              onChange(v.key)
            }}
            {...fieldProps}
          />
        )
        break
      }
      case 'loading':
        finalRender = (
          <Fragment>
            <Label>{title}</Label>
            <ProgressIndicator />
          </Fragment>
        )
        break
      case 'file': {
        finalRender = (
          <FileUpload
            name={title}
            value={value}
            required={required}
            browse={false}
            internal={internal}
            acceptFile={fieldProps?.acceptFile}
            downloadMode={fieldProps?.downloadMode}
            // browse={{
            //   enabled:
            //     typeof props.fieldProps.browse === 'boolean'
            //       ? props.fieldProps.browse
            //       : true,
            //   onSelect: (e) => {
            //     props.onChange(e.path)
            //     if (props.parentRender) {
            //       props.parentRender()
            //     }
            //   },
            // }}
            onChange={async (v) => onChange(v)}
          />
        )
        break
      }
      case 'has-many': {
        const def = internal.def[name]

        const to = def.rel.join.to.split('.').pop()
        const from = def.rel.join.from.split('.').pop()
        const valto = internal.value[from]
        const label = get(
          alter,
          `replacer.${def.name}.title`,
          niceCase(def.name)
        )

        const content = {
          label,
          table: def.name,
          ...fieldProps,
        }

        set(content, `list.params.where.${to}`, valto)
        set(content, 'form.onSave', async ({ save, data }) => {
          delete data[to]
          data[internal.table] = {
            connect: {
              [from]: valto,
            },
          }
          await save(data)
        })

        finalRender = (
          <div
            className="has-many flex flex-col relative "
            css={css`
              height: 100%;
              .field-web-inner {
                margin-left: 10px;
              }
            `}
          >
            <AdminCMS
              nav={[label]}
              content={{
                [label]: content,
              }}
            />
          </div>
        )
        break
      }
      case 'belongs-to':
        {
          const def = fieldProps.def
          const rel = fieldProps.def.rel
          let params = {}

          if (typeof (props as any).params === 'function') {
            params = (props as any).params(props.internal.value)
          }

          let svalue = 0
          let to = ''
          let from = ''

          if (rel.modelClass === def.name) {
            from = rel.join.from.split('.').pop()
            to = rel.join.to.split('.').pop()
            svalue = internal.value[from]
            const type = internal.def[from].type

            finalRender = (
              <Select
                label={title || startCase(rel.modelClass)}
                selectedKey={svalue}
                items={{
                  table: rel.modelClass,
                  label:
                    typeof (props as any).label === 'function'
                      ? (props as any).label
                      : (e) => {
                          for (let i of Object.keys(e)) {
                            if (i.toLowerCase().indexOf('id') < 0) return e[i]
                          }
                        },
                  params: params,
                  value: (e) => {
                    return e[to]
                  },
                  nullable: def.nullable,
                }}
                required={required}
                onChange={(e, v) => {
                  if (to && rel.modelClass) {
                    let nvalue = value
                    if (typeof value !== 'object' || value === null) {
                      nvalue = {}
                    }

                    nvalue[to] = v && v.key !== 'null' ? v.key : null
                    if (nvalue[to] !== null && type === 'number') {
                      nvalue[to] = parseInt(nvalue[to])
                    }

                    const upsert =
                      nvalue[to] === null
                        ? {
                            disconnect: true,
                          }
                        : {
                            connect: { [rel.modelClass]: nvalue[to] },
                          }

                    onChange(upsert)
                  } else {
                    onChange(v.key)
                  }
                }}
              />
            )
          }
        }
        break
    }

    return {
      finalRender:
        finalRender !== null ? (
          <div className="field-web-inner">{finalRender}</div>
        ) : null,
      error,
    }
  })
}
