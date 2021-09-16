/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Label } from '@fluentui/react'
import get from 'lodash.get'
import { action, runInAction, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { isValidElement, useEffect, useRef, useState } from 'react'
import { niceCase } from 'web.utils/src/niceCase'
import { useRender } from 'web.utils/src/useRender'
import { Split } from '../../../dev/src/Template'
import type { IQueryComponentProps } from '../../../ext/types/qform'
import type { ICreateFields } from '../Form'

interface ICustomLayout {
  layout: IQueryComponentProps['layout']
  createFields: ICreateFields
  childProps: any
  value: any
  mutation: 'create' | 'update'
  update: (value: any) => void
}

export const CustomLayout = observer((props: ICustomLayout) => {
  let { layout, createFields, mutation } = props
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

  const _ = useRef({
    tabs: [],
    tabRef: [],
    mounted: true,
  })
  const meta = _.current
  const renderLayout = useRender()
  meta.tabRef = (meta.tabs || []).map((e, idx) => {
    const cf = createFields[e]
    if (cf) {
      const Field: any = cf.Field

      const label = get(cf, `alter.replacer.${e}.title`, niceCase(e))
      return {
        label,
        value: <Field name={e} key={idx} required={false} error={''}></Field>,
      }
    }
  }) as any

  const [size, setSize] = useState(localStorage['form-split-size'] || 70)

  const mainform = (
    <RecursiveLayout
      tabs={meta.tabs}
      mutation={mutation}
      renderLayout={renderLayout}
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

  return (
    <div
      key={'root-0'}
      className={
        'flex flex-col flex-1' +
        (status === 'error' ? ' border-4 border-red-400' : '')
      }
    >
      <div
        className={
          (status === 'error' ? 'p-4' : '') +
          'form-custom-layout flex flex-col flex-1'
        }
      >
        {errorReason && <div className="p-4 bg-red-200">{errorReason}</div>}
        <div className="flex flex-col flex-1 items-stretch">
          {/* {mainform} */}
          {meta.tabs.length > 0 ? (
            <Split
              mode="vertical"
              size={size}
              setSize={(v) => {
                localStorage['form-split-size'] = v
                setSize(v)
              }}
              dividerEl={null as any}
              className="flex flex-1"
            >
              <div
                className="flex flex-1 flex-col relative overflow-auto"
                css={css`
                  padding-bottom: 100px;

                  .field-web-inner {
                    flex: 1;
                    margin-left: 10px;
                  }
                `}
              >
                {mainform}
              </div>
              <div
                className="flex flex-1 bg-white z-10"
                css={css`
                  .field-web-inner {
                    flex: 1;
                    .form-body > div {
                      padding-bottom: 100px;
                    }
                  }
                `}
              >
                <Tab tabs={meta.tabRef} />
              </div>
            </Split>
          ) : (
            mainform
          )}
        </div>
      </div>
    </div>
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
  mutation: 'create' | 'update'
  tabs: string[]
  renderLayout: () => void
  layout: IQueryComponentProps['layout']
  idx?: number
  mode?: 'row' | 'col'
}) => {
  let { props, tabs, layout, idx, mode, mutation, renderLayout } = p
  const { createFields, validation, errors, setValidateOnChange } = props
  const render = useRender()
  useEffect(() => {
    if (typeof layout === 'string') {
      const name = layout
      if (mutation === 'update') {
        const cf = createFields[name]
        if (get(cf, 'def.type') === 'Model.HasManyRelation') {
          if (tabs.indexOf(name) < 0) {
            tabs.push(name)
            renderLayout()
          }
        }
      }
    }
  }, [mutation])

  if (typeof layout === 'string') {
    return renderFieldByName({
      createFields,
      validation,
      render,
      renderLayout,
      tabs,
      idx,
      mutation,
      errors,
      layout,
    })
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

    return (layout as any)({
      row: props.value,
      update: (v) => {
        props.update(v)
        render()
      },
      layout: (inputLayout: any[]) => {
        return (
          <RecursiveLayout
            tabs={tabs}
            renderLayout={renderLayout}
            mutation={mutation}
            props={{
              createFields,
              validation: validation || {},
              errors: errors || {},
              value: props.value,
              update: props.update,
              setValidateOnChange: setValidateOnChange || (() => {}),
            }}
            layout={inputLayout}
          />
        )
      },
      watch: (keys: string[]) => {
        watchRef.current = keys
      },
    })
  }
  if (isValidElement(layout)) {
    return layout
  }

  if (Array.isArray(layout)) {
    if (!mode) {
      mode = 'row'
    }

    if (typeof layout[0] === 'string' && layout[0].indexOf('::') === 0) {
      // Generate Section
      const title = layout[0].substr(2)
      return (
        <div key={idx} className="relative flex flex-col pb-1">
          <div
            className="flex flex-row"
            css={css`
              background: #fafafa;
            `}
          >
            <Label className="relative z-10 p-2 ml-0 font-semibold text-gray-600">
              {title}
            </Label>
            <div className="flex-1"></div>
          </div>
          <div className="border-b border-gray-200"></div>
          <div
            className={`flex flex-${mode} py-2`}
            css={css`
              ${mode === 'row' && ' > div { flex:1 }'}
            `}
          >
            <RecursiveLayout
              renderLayout={renderLayout}
              props={props}
              mutation={mutation}
              layout={layout.slice(1)}
              key={0}
              tabs={tabs}
              mode={mode === 'row' ? 'col' : 'row'}
            />
          </div>
        </div>
      )
    }

    return layout.map((e: any, idx) => {
      return (
        <div
          className={`flex flex-${mode}`}
          css={css`
            ${mode === 'row' && ' > div { flex:1 }'}
          `}
          key={idx}
        >
          <RecursiveLayout
            props={props}
            renderLayout={renderLayout}
            layout={e}
            key={idx}
            mutation={mutation}
            tabs={tabs}
            mode={mode === 'row' ? 'col' : 'row'}
          />
        </div>
      )
    })
  }
}

const renderFieldByName = ({
  layout,
  validation,
  createFields,
  tabs,
  render,
  renderLayout,
  idx,
  mutation,
  errors,
}) => {
  let name: string = layout
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
  cf.update = render

  // exclude has-many from regular field,
  // so it can rendered in tabs
  if (cf.def.type === 'Model.HasManyRelation') {
    return null
  }

  return (
    <Field
      name={name}
      key={idx}
      required={required}
      error={errors[name]}
    ></Field>
  )
}

const Tab = ({ tabs }: { tabs: Array<{ label: string; value: any }> }) => {
  const _ = useRef({
    tab: 0,
  })
  const state = _.current
  const render = useRender()

  return (
    <div
      className="flex flex-row items-stretch flex-1 bg-white"
      css={css`
        margin-top: -3px;
        .nav {
          margin-right: -1px;
          border-right: 3px solid transparent;
        }
        .active {
          border-right: 3px solid #0065f4;
        }
      `}
    >
      <div className={'flex flex-col border-r border-gray-300'}>
        {tabs
          .filter((e) => e)
          .map((v, k) => {
            return (
              <div
                key={k}
                onClick={action(() => {
                  state.tab = k
                  // render()
                })}
                className={
                  'nav flex justify-end py-2 px-3  text-sm select-none font-semibold cursor-pointer  hover:text-blue-600 ' +
                  `${
                    state.tab === k ? ' active bg-blue-200 text-blue-600' : ''
                  }`
                }
              >
                {v.label}
              </div>
            )
          })}
      </div>
      {tabs[state.tab] && (
        <div className="flex flex-col flex-1">{tabs[state.tab].value}</div>
      )}
    </div>
  )
}
