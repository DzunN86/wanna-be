/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Callout, Checkbox, DefaultButton } from '@fluentui/react'
import get from 'lodash.get'
import { action, toJS } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import { useRef } from 'react'
import { niceCase } from 'web.utils/src/niceCase'
import { useRender } from 'web.utils/src/useRender'
import FilterBelongsTo from './filter/FilterBelongsTo'
import FilterDate from './filter/FilterDate'
import FilterSelect from './filter/FilterSelect'
import FilterString from './filter/FilterString'
import { IFilter, IQLFilter, IQLFilterInputSingle } from '../../ext/types/list'

export const QLFilter = (props: IQLFilter) => {
  const pickerRef = useRef(null as any)
  const render = useRender()
  const state = useLocalObservable(() => ({
    showPicker: false,
  }))

  return (
    <Observer>
      {() => {
        const { columns, values, def, submit, setValues } = props

        const filters = columns.map((e) => filterFromString(e, def))
        return (
          <div
            className="filter-container flex flex-row items-center justify-between"
            css={css`
              // border-bottom: 1px solid #edebe9;
              padding: 5px 10px 5px 10px;

              .picker > .ms-Button {
                padding: 0px 5px;
                min-width: 0px;
                margin-right: 10px;
                height: 30px;
                overflow: hidden;
                border-color: #ddd;
              }

              .filter-item > .ms-Button {
                padding: 0px 10px;
                min-width: 0px;
                margin-right: 10px;
                height: 30px;
                overflow: hidden;
                border-color: #ddd;
              }
            `}
          >
            <div className="filter-body flex flex-row items-center">
              <div className="picker" ref={pickerRef}>
                <DefaultButton
                  onClick={action(() => (state.showPicker = true))}
                  iconProps={{ iconName: 'GlobalNavButton' }}
                />
              </div>
              {state.showPicker && (
                <Callout
                  onDismiss={action(() => (state.showPicker = false))}
                  setInitialFocus={true}
                  target={pickerRef.current}
                >
                  <div
                    style={{
                      padding: 10,
                      display: 'flex',
                      width: '270px',
                      flexWrap: 'wrap',
                      flexDirection: 'row',
                    }}
                  >
                    {filters.map((filter) => {
                      const _onChange = action(() => {
                        if (props.visibles[filter.key]) {
                          props.visibles[filter.key] = false
                        } else {
                          props.visibles[filter.key] = true
                        }
                        if (props.setVisibles)
                          props.setVisibles(toJS(props.visibles))
                        render()
                      })
                      return (
                        <Checkbox
                          key={filter.key}
                          styles={{
                            root: {
                              marginBottom: 3,
                              marginRight: 3,
                              width: '120px',
                            },
                          }}
                          label={filter.title || niceCase(filter.key)}
                          checked={!!props.visibles[filter.key]}
                          onChange={_onChange}
                        />
                      )
                    })}
                  </div>
                </Callout>
              )}
              {(filters || []).map((filter, index) => {
                const setValue = action((val: any, key?: any) => {
                  if (val === undefined || val === null) {
                    delete values[key || filter.key]
                  } else {
                    values[key || filter.key] = val
                  }
                  setValues({ ...values })
                  render()
                })
                if (!props.visibles[filter.key]) return null

                return (
                  <Filter
                    values={values}
                    value={values[filter.key]}
                    setValue={setValue}
                    filter={filter}
                    key={index}
                    submit={submit}
                  />
                )
              })}
            </div>
            {props.actions || null}
          </div>
        )
      }}
    </Observer>
  )
}

const Filter = (props: {
  filter: IFilter
  values: any
  value: any
  setValue: (val: any, key?: any) => void
  submit: () => void
}) => {
  const { filter, value, setValue, submit } = props

  if (typeof filter !== 'string') {
    switch (filter.type) {
      case 'belongs-to': {
        const label = filter.key.split('.').pop()
        const from = filter.rel.join.from.split('.').pop()
        const to = filter.rel.join.to.split('.').pop()
        return (
          <FilterBelongsTo
            field={from}
            setValue={(e) => {
              setValue(e, from)
            }}
            items={{
              table: filter.rel.modelClass,
              label,
              value: to,
            }}
            label={filter.title || niceCase(filter.key)}
            value={props.values[from] || null}
            submit={submit}
          />
        )
      }
      case 'Date':
        return (
          <FilterDate
            setValue={setValue}
            setOperator={(val) => {
              console.log(filter, val)
            }}
            label={filter.title || niceCase(filter.key)}
            value={value}
            submit={submit}
          />
        )
      case 'string':
        return (
          <FilterString
            field={filter.key}
            setValue={setValue}
            label={filter.title || niceCase(filter.key)}
            value={value}
            submit={submit}
          />
        )
      case 'number':
        return (
          <FilterString
            field={filter.key}
            setValue={(v) => {
              const res = ((v || '').match(/[\d\.]+|\D+/g) || []).map((e) =>
                e.trim()
              )
              setValue(res.join('') || null)
            }}
            label={filter.title || niceCase(filter.key)}
            value={value}
            submit={submit}
          />
        )
      case 'select':
        return (
          <FilterSelect
            field={filter.key}
            setValue={setValue}
            items={filter.items}
            label={filter.title || niceCase(filter.key)}
            value={value}
            submit={submit}
          />
        )
    }
  }

  return null
}

const filterFromString = (f: IQLFilterInputSingle, def: any): IFilter => {
  let filter: IFilter
  if (typeof f === 'string') {
    const col = def.columns[f]
    filter = {
      key: f,
      type: get(col, 'type') || 'string',
      default: '',
    }
  } else {
    const fany = f as any
    filter = {
      ...fany[1],
      key: fany[0],
    }
    if (!filter.type) {
      const col = def.columns[fany[0]]
      if (!!col) (filter as any).type = col.type
    }
  }

  if (filter.key.indexOf('.') >= 0) {
    const key = filter.key.split('.').shift()
    if (def.rels[key]) {
      filter.type =
        def.rels[key].relation === 'Model.BelongsToOneRelation'
          ? 'belongs-to'
          : 'has-many'

      if (filter.type === 'belongs-to') {
        filter.rel = def.rels[key]
      }
    }
  }

  return prepareFilter(filter)
}

const prepareFilter = (f: IFilter): IFilter => {
  if (!f.where) {
    switch (f.type) {
      case 'string':
        f.where = ['like', '%{value}%']
        break
      case 'number':
        f.where = ['=', '{value}']
        break
    }
  }

  return f
}
