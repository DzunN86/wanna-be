import { ComboBox, IComboBoxStyles } from '@fluentui/react/lib/ComboBox'
import { db } from 'libs'
import find from 'lodash.find'
import get from 'lodash.get'
import { runInAction, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import * as React from 'react'

interface ISelectProps {
  style?: any
  styles?: Partial<IComboBoxStyles>
  selectedKey?: any
  onChange?: (e: any, value: { key: any; text: any }) => void
  label?: any
  required?: any
  errorMessage?: any
  placeholder?: string
  className?: string
  readonly?: boolean
  allowFreeForm?: boolean
  modifier?: {
    add?: (item, list) => Promise<any>
    edit?: (item, list) => Promise<any>
    view?: (item, list) => Promise<any>
    delete?: (item, list) => Promise<any>
  }
  items:
    | (
        | string
        | {
            value: string
            label: string
          }
      )[]
    | {
        table: string
        value: string | ((row: any) => any)
        label: string | ((row: any) => any)
        params: any
        nullable?: boolean
      }
}

export default observer((props: ISelectProps) => {
  const [value, setValue] = React.useState(props.selectedKey)
  const meta = useLocalObservable(() => ({
    isKeyJson: false,
    items: [] as any,
    loaded: false,
  }))

  const cache = React.useRef({
    params: {},
  })

  React.useEffect(() => {
    setValue(props.selectedKey)
  }, [props.selectedKey])

  React.useEffect(() => {
    const loadFromDB = async () => {
      if (!Array.isArray(props.items)) {
        const t = props.items
        const res = await db[t.table].findMany(t.params)
        runInAction(() => {
          meta.items = [
            !Array.isArray(t) && t.nullable
              ? { key: JSON.stringify(null), text: '—' }
              : false,
            ...(res || []).map((e) => {
              const result = { key: '', text: '' }
              if (typeof t.label === 'string') {
                result.text = e[t.label]
              } else {
                result.text = t.label(e)
              }

              if (typeof t.value === 'string') {
                result.key = e[t.value]
              } else {
                result.key = t.value(e)

                if (typeof result.key === 'object') {
                  result.key = JSON.stringify(result.key)
                  runInAction(() => {
                    meta.isKeyJson = true
                  })
                } else if (typeof result.key !== 'string') {
                  result.key = JSON.stringify(result.key)
                }
              }

              return result
            }),
          ].filter((e) => e)
          meta.loaded = true
        })

        if (
          !props.selectedKey &&
          JSON.stringify(props.selectedKey) !== meta.items[0].key
        ) {
          setValue(meta.items[0].key)
          if (props.onChange) {
            const val = toJS(meta.items[0])
            if (meta.isKeyJson) {
              val.key = JSON.parse(val.key)
            }
            props.onChange(null, val)
          }
        }
      }
    }
    runInAction(() => {
      if (Array.isArray(props.items)) {
        meta.items = (props.items || [])
          .map((e) => {
            if (typeof e === 'string') {
              return {
                key: e,
                text: e,
              }
            }
            if (typeof e === 'object') {
              return {
                key: e.value,
                text: e.label,
              }
            }
          })
          .filter((e) => !!e)
      } else {
        loadFromDB()
      }
    })
  }, [props.items])

  let items: any = meta.items

  const modifierList = Object.keys(props.modifier || {})
  let marginRight = 0
  if (modifierList.length > 0) {
    if (get(props, 'style.marginRight')) {
      marginRight = get(props, 'style.marginRight')
    }

    if (get(props, 'styles.root.marginRight')) {
      marginRight = get(props, 'styles.root.marginRight')
    }
  }

  let onChange = undefined as any
  if (props.onChange) {
    onChange = (e, v) => {
      if (props.onChange) {
        let val
        if (!v) {
          if (props.selectedKey) {
            val = find(items, { key: props.selectedKey })
          } else {
            val = items[0]
          }
        } else {
          setValue(v.key)
          val = v
        }

        if (meta.isKeyJson) {
          val.key = JSON.parse(val.key)
        }

        props.onChange(e, val)
      }
    }
  }
  return (
    <>
      <ComboBox
        {...props}
        selectedKey={typeof value === 'string' ? value : JSON.stringify(value)}
        onChange={onChange}
        autoComplete={'on'}
        allowFreeform={
          props.allowFreeForm === undefined ? true : props.allowFreeForm
        }
        useComboBoxAsMenuWidth={true}
        disabled={props.readonly}
        options={items}
      />
    </>
  )
})
