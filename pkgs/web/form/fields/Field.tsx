/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { waitUntil } from 'libs'
import sortBy from 'lodash.sortby'
import trim from 'lodash.trim'
import { ReactElement, useCallback, useEffect, useRef } from 'react'
import { picomatch } from 'web.utils/src/picomatch'
import { useRender } from 'web.utils/src/useRender'
import type { IFieldType } from '../../ext/types/qform'
import type { FormInternal } from '../src/QueryForm'
import type { ISection } from '../src/web/Section'

export type IFieldAlter = {
  lastPath: string
  replacer: IFieldAlterer
}

export type IFieldAlterer = Record<
  string,
  | false
  | ((props: {
      path
      props: IField
      setValue: (value) => void
      Component: (props: IField) => any
      render: () => void
    }) => Promise<any>)
>

export interface IField {
  name: string
  title?: string
  value?: any
  info?: string
  row?: any
  readonly?: boolean
  original?: any
  required?: boolean
  internal?: FormInternal
  onChange?: (value: any) => void
  type?: IFieldType
  metaRef?: { current: any }
  onCreateField?: (p: any) => any
  wrapper?: (children: ReactElement) => ReactElement
  alter?: IFieldAlter
  parentRender?: () => void
  loadingComponent?: ReactElement
  error?: any
  children?:
    | never[]
    | ((props: {
        Section: (props: ISection) => any
        Field: (props: IField) => any
      }) => any)
  fieldProps?: any
  useRenderField: any
}
export const Field = (inputProps: IField) => {
  let props = { ...inputProps } as IField

  const initRef = useRef(false)
  const customRef = useRef(false as { exec: any; path: string } | false)
  const customCacheRef = useRef(null as any)
  const render = useRender()

  const reloadCustomComponent = useCallback(async () => {
    if (customRef.current) {
      const res = await customRef.current.exec({
        path: customRef.current.path,
        props: {
          ...props,
          onChange: (val) => {
            if (props && props.onChange) {
              props.onChange(val)
            }
          },
        },
        setValue: (value: any) => {
          if (innerSetValue.current) {
            innerSetValue.current(value)
          }

          if (props.onChange) props.onChange(value)
        },
        Component: (props) => {
          const final = renderField.current(props)
          return postRender.current(final.finalRender, final.error)
        },
        render: props.parentRender,
      })

      metaRef.current = res
    }
  }, [props.value, props.error])

  const replace = useRef((v: any, extProps: any, path: string) => {
    if (typeof v === 'object') {
      if ((v as any).value && !props.value && props.onChange) {
        props.onChange((v as any).value)
      }

      const newProps = {
        ...props,
        ...(v as any),
        ...extProps,
      }

      if (v.onChange) {
        newProps.onChange = (val) => {
          if (inputProps.onChange) inputProps.onChange(val)
          v.onChange(val)
        }
      }
      props = newProps
    }
    if (typeof v === 'function') {
      props = {
        ...props,
        ...extProps,
      }
      customRef.current = { path, exec: v }
    }

    if (v === false) {
      return null
    }
    return props
  })

  const innerSetValue = useRef(null as any)
  const onReady = (e: { setValue: (value: any) => void }) => {
    innerSetValue.current = e.setValue
  }
  let metaRef = customCacheRef
  if (props.metaRef && props.metaRef.current) {
    if (!props.metaRef.current[`${props.name}-cache`]) {
      props.metaRef.current[`${props.name}-cache`] = { current: null }
    }
    metaRef = props.metaRef.current[`${props.name}-cache`]
  }

  if (props.alter) {
    const { alter, name } = props

    const path = alter.lastPath
      ? trim([...alter.lastPath.split('.'), name].join('.'), '.')
      : name

    let alterMatches = {
      obj: [] as { k: string; v: any }[],
      func: [] as { k: string; v: any }[],
    }

    if (alter.replacer) {
      for (let [k, v] of Object.entries(alter.replacer)) {
        if (picomatch.isMatch(path, k)) {
          alterMatches[typeof v === 'function' ? 'func' : 'obj'].push({ k, v })
        }
      }
    }

    alterMatches.obj = sortBy(alterMatches.obj, ['0']).reverse()

    const error = props.error
    if (alterMatches.func.length > 0) {
      let extProps = {}

      if (alterMatches.func.length > 0) {
        alterMatches.func.forEach((e) => {
          extProps = { ...extProps, ...e.v }
        })

        const result = replace.current(alterMatches.func[0].v, extProps, path)
        if (result) {
          props = result
        }
      }
    } else if (alterMatches.obj.length > 0) {
      let extProps = {}

      let result = {} as any
      for (let i of alterMatches.obj) {
        result = replace.current({ ...result, ...i.v }, extProps, path)
      }
      if (result) {
        props = result
      }
    }

    props.error = error

    initRef.current = true
  } else {
    initRef.current = true
  }

  useEffect(() => {
    ;(async () => {
      await waitUntil(() => initRef.current)
      if (customRef.current) {
        if (fieldRef.current) {
          if (
            fieldRef.current.contains(document.activeElement) ||
            document.activeElement === document.body
          ) {
            return
          }
        }
        reloadCustomComponent().then(() => {
          render()
        })
      }
    })()
  }, [props.value, props.error])

  const renderField = props.useRenderField({
    onReady,
    onCreateField: inputProps.onCreateField,
    inputProps,
  })

  const fieldRef = useRef(null as any)
  const postRender = useRef((finalRender, error) => {
    let result = finalRender
    if (location.pathname.indexOf('/m/') !== 0) {
      result = (
        <div
          ref={fieldRef}
          className={`${props.type} field-web-wrapper flex flex-1 flex-col`}
          css={css`
            input,
            textarea {
              font-size: 13px;
            }
          `}
        >
          {finalRender}
          {error && (
            <div
              className="text-red-600 bg-red-100"
              css={css`
                font-size: 12px;
                padding-left: 10px;
                border: 1px solid red;
                border-top: 0px;
                border-bottom-left-radius: 3px;
                border-bottom-right-radius: 3px;
              `}
            >
              {error}
            </div>
          )}
        </div>
      )
    }

    if (props.wrapper) {
      return props.wrapper(finalRender ? result : null)
    }
    return result
  })

  let finalRender, error

  if (customRef.current) {
    if (!metaRef.current) {
      return loadingSVG
    } else {
      finalRender = metaRef.current
    }
  } else {
    const final = renderField.current(props)
    finalRender = final.finalRender
    error = final.error
  }

  return postRender.current(finalRender, props.error || error)
}

const loadingSVG = (
  <div className="mx-2">
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a">
          <stop stopColor="#999" stopOpacity="0" offset="0%" />
          <stop stopColor="#999" stopOpacity=".631" offset="63.146%" />
          <stop stopColor="#999" offset="100%" />
        </linearGradient>
      </defs>
      <g fill="none" fillRule="evenodd">
        <g transform="translate(1 1)">
          <path
            d="M36 18c0-9.94-8.06-18-18-18"
            id="Oval-2"
            stroke="url(#a)"
            strokeWidth="2"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="0.9s"
              repeatCount="indefinite"
            />
          </path>
          <circle fill="#999" cx="36" cy="18" r="1">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="0.9s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </g>
    </svg>
  </div>
)
