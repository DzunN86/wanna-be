/** @jsx jsx */
import { jsx } from '@emotion/react'
import { db } from 'libs'
import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { ReactElement, useEffect, useRef } from 'react'
import { Loading } from 'web.form/fields/Loading'
import { api } from 'web.utils/src/api'
import { niceCase } from 'web.utils/src/niceCase'
import { useRender } from 'web.utils/src/useRender'
import { Form } from './Form'
import { FormHeader } from './FormHeader'
import type { ILayout } from './QueryForm'

export default observer(
  ({
    sid,
    title,
    className,
    children,
    alter,
    header,
    layout,
    onBack,
    footer,
  }: {
    sid: string
    title?: string
    className?: string
    alter?: any
    layout?: ILayout
    onBack?: any
    header?:
      | boolean
      | ((props: { save: () => Promise<void>; status: string }) => ReactElement)
    footer?: (props: {
      save: () => Promise<void>
      status: string
    }) => ReactElement
    children?: ({ Header, headerProps, Form, formProps, save, data }) => any
  }) => {
    const forceRender = useRender()
    const meta = useLocalObservable(() => ({
      isChanged: false,
      errors: {},
      validation: {},
      title: '',
      status: 'init',
    }))
    const metaRef = useRef({} as any)
    const value = useRef({} as any)

    useEffect(() => {
      const keydown = function (e) {
        if (
          (window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) &&
          e.keyCode == 83
        ) {
          e.preventDefault()
          save()
        }
      }
      document.addEventListener('keydown', keydown, false)

      api(`/__cms/${sid}/sform`).then((e) => {
        runInAction(() => {
          value.current = e.data
          meta.title = niceCase(e.title)
          meta.status = 'ready'
        })
      })

      return () => {
        document.removeEventListener('keydown', keydown)
      }
    }, [])

    const save = async () => {
      runInAction(() => {
        meta.isChanged = false
        meta.status = 'saving'
      })
      await api(`/__cms/${sid}/sform`, value.current)
      runInAction(() => {
        meta.status = 'saved'
      })
    }

    if (meta.status === 'init') return <Loading />

    const onChanged = action((val) => {
      value.current = val
      meta.isChanged = true
    })
    if (children) {
      const headerProps = {
        meta,
        title: title || meta.title,
        value: value.current,
        save: save,
      }
      const formProps = {
        value: value.current,
        onChange: onChanged,
      }

      return children({
        Form,
        formProps,
        Header: FormHeader,
        headerProps,
        save,
        data: value.current,
      })
    }

    const original = JSON.parse(JSON.stringify(value.current))

    return (
<div className={'flex flex-col ' + (typeof className == 'undefined' ? 'overflow-scroll' : className)}>
        <Form
          colNum={1}
          value={value.current}
          metaRef={metaRef}
          alter={alter ? alter : undefined}
          original={original}
          layout={layout}
          onChange={onChanged}
          childProps={{
            Header: (hprops) => (
              <FormHeader
                isChanged={meta.isChanged}
                status={meta.status}
                title={title || meta.title}
                onBack={onBack}
                onDelete={undefined}
                value={value.current}
                setValue={(val) => {
                  value.current = val
                  metaRef.current._shouldUpdateFieldInternal = true
                  forceRender()
                }}
                showDelete={false}
                pk={'id'}
                save={save}
              />
            ),
            db: db,
            reset: action(() => {
              value.current = original
              forceRender()
            }),
            forceRender,
            setData: (val) => {},
            save,
          }}
        />
      </div>
    )
  }
)
