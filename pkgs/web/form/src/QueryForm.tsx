/** @jsx jsx */
import { jsx } from '@emotion/react'
import { Label } from '@fluentui/react'
import { dbAll, waitUntil } from 'libs'
import get from 'lodash.get'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { blankDef, tableDefinitions } from 'web.list/src/QueryList'
import { makeEmpty } from 'web.utils/src/makeEmpty'
import { niceCase } from 'web.utils/src/niceCase'
import { useRender } from 'web.utils/src/useRender'
import type { IFilterDef, ITableDef } from '../../ext/types/list'
import type { IQueryComponent } from '../../ext/types/qform'
import { Loading } from '../fields'
import { Form, ICreateFields } from './Form'
import { FormHeader } from './FormHeader'
import { MForm } from './mobile/MForm'

export interface FormInternal {
  value: any
  history?: any
  def: ITableDef
  table: string
  createFields: ICreateFields
  errorPopover: boolean
}

type ValidationType = 'required'

export const QueryForm: IQueryComponent = (props) => {
  const {
    table,
    children,
    data,
    where,
    original,
    include,
    header,
    footer,
    alter,
    title,
    layout,
    onChange,
    setUnsaved,
    onSave,
    onLoad,
    onBack,
  } = props
  const db: any = 'main'
  const _ = useRef({
    lastData: data,
    loading: true,
    isChanged: false,
    errorReason: '' as any,
    errors: {} as any,
    validation: {} as Record<
      string,
      (ValidationType | { name: string; type: ValidationType })[]
    >,
    validateOnChange: false,
    status: 'ready' as
      | 'ready'
      | 'Berhasil Tersimpan'
      | 'Menyimpan'
      | 'Menghapus'
      | 'Gagal',
    alter: {
      lastPath: '',
      replacer: {
        ...(alter as any),
      },
    },
    alterReset: true,
  })
  const meta = _.current
  const render = useRender()
  const value = useRef(null as any)
  const externalMeta = useRef({} as any)
  const pkCol = useRef({ real: 'id', name: 'id' })
  const def = useRef(null as null | IFilterDef)
  const defaultForm = (window as any).defaultForm
  const runAndRender = (f: Function) => {
    f()
    render()
  }

  const validateSingle = (name: string, type: string) => {
    let colName = niceCase(name)

    if (alter) {
      if (typeof alter[name] === 'object' && (alter[name] as any).title) {
        colName = (alter[name] as any).title
      }
    }

    if (type === 'required') {
      if (!(value.current || {})[name]) {
        return {
          failed: true,
          message: `${colName} harus diisi.`,
        }
      }
    }
    return {
      failed: false,
      message: '',
    }
  }
  const validate = () => {
    const errors: string[] = []
    if (Object.keys(meta.errors).length > 0) {
      runAndRender(() => {
        meta.errors = {}
        meta.errorReason = ''
      })
    }

    for (let [fieldName, validationsPerField] of Object.entries(
      meta.validation
    )) {
      for (let validation of validationsPerField) {
        const result = validateSingle(
          fieldName,
          typeof validation === 'string' ? validation : validation.type
        )
        if (result.failed) {
          runAndRender(() => {
            meta.errors[fieldName] = result.message
          })
          errors.push(result.message)
        }
      }
    }

    if (errors.length > 0) {
      runAndRender(() => {
        meta.status = 'Gagal'
        meta.errorReason = (
          <ul>
            <Label className="text-bold py-1 border-red-200 border-b mb-2">
              Mohon benahi data dibawah ini:
            </Label>
            {errors.map((e, idx) => (
              <li key={idx} className="py-0">
                <Label className="py-0 text-sm">&bull; {e}</Label>
              </li>
            ))}
          </ul>
        )
      })
      return false
    }
    return true
  }

  const save = async (data: any) => {
    const include = props.include

    const saveInternal = async () => {
      let lastActive: any = null
      if (document.activeElement) {
        lastActive = document.activeElement
        ;(document.activeElement as any).blur()
      }

      runAndRender(() => {
        meta.status = 'Menyimpan'
        meta.isChanged = false
        if (setUnsaved) setUnsaved(false)
      })

      const validateResult = validate()

      if (!validateResult) {
        return false
      }

      const q = dbAll[db][table] as any
      const val = { ...(value.current || {}) }
      const pkval = val[pkCol.current.name]
      for (let [k, v] of Object.entries(def.current?.columns || {})) {
        if (v.rel) {
          delete val[k] // any modified relation will be applied below
        }
      }

      for (let [k, v] of Object.entries(
        (def.current || { rels: {} }).rels
      ) as any) {
        if (v.relation === 'Model.BelongsToOneRelation') {
          const from = v.join.from.split('.').pop()
          const m = val[v.modelClass]
          if (m) {
            if (m.disconnect || m.create || m.connect || m.connectOrCreate) {
              if (m.disconnect && !val[from]) {
                delete val[v.modelClass]
              }
              delete val[from]
            } else {
              if (val[v.modelClass] && val[v.modelClass].id) {
                val[v.modelClass] = {
                  update: val[v.modelClass],
                }
              }
              // delete val[v.modelClass]
            }
          }
        }
      }

      let res

      const select = {
        [pkCol.current.name]: true,
      }
      for (const [k, v] of Object.entries(val)) {
        select[k] = true
      }
      let mutation: 'create' | 'update' = 'create'
      // if update
      if (pkval) {
        mutation = 'update'
        delete val[pkCol.current.name]
        res = await q.update({
          data: val,
          where: {
            [pkCol.current.name]: pkval,
          },
          include: include,
        })
      }
      // if create
      else {
        delete val[pkCol.current.name]
        res = await q.create({
          data: val,
          include: include,
        })
      }

      if (res.status === 'failed' && typeof res.reason === 'string') {
        runAndRender(() => {
          meta.errors = {}
          if (process.env.MODE !== 'production') {
            meta.errorReason = (
              <pre className="text-xs whitespace-pre-wrap">
                {`${res.reason}`}
                <small>
                  <br />
                  <br />
                  Sent Data: {JSON.stringify(value.current, null, 2)}
                </small>
              </pre>
            )
          } else {
            meta.errorReason = 'Gagal Menyimpan. Mohon hubungi pengembang.'
          }
          meta.status = 'Gagal'
        })
        return false
      } else {
        value.current = res
        if (data) {
          for (let i of Object.keys(res)) {
            data[i] = res[i]
          }
        }
        if (onLoad)
          onLoad(
            res,
            { pk: pkCol.current.name, def: def.current, mutation },
            true
          )
      }

      if (lastActive && lastActive.focus) {
        lastActive.focus()
      }

      runAndRender(() => {
        meta.validateOnChange = true
        if (meta.status === 'Menyimpan') {
          meta.status = 'Berhasil Tersimpan'
          setTimeout(() => {
            runAndRender(() => {
              meta.status = 'ready'
            })
          }, 6000)
        }
      })
      return res
    }

    if (!onSave) {
      return await saveInternal()
    } else {
      return await onSave({
        data: value.current as any,
        def: def.current,
        saving: (status: boolean) => {
          runAndRender(() => {
            meta.status =
              status === undefined || status === true ? 'Menyimpan' : 'ready'
            meta.isChanged = true
            if (setUnsaved) setUnsaved(true)
          })
        },
        setError: (value) => {
          runAndRender(() => {
            meta.errors = value
            if (Object.keys(meta.errors || {}).length > 0) {
              meta.status = 'Gagal'
              meta.errorReason = (
                <ul className="px-0">
                  <Label className="text-bold py-1 border-red-200 border-b mb-2">
                    Mohon benahi data dibawah ini:
                  </Label>
                  {Object.entries(value).map(([k, v], idx) => (
                    <li key={idx} className="py-0 pl-1">
                      <Label className="py-0 text-sm">&bull; {v}</Label>
                    </li>
                  ))}
                </ul>
              )
            } else {
              meta.status = 'ready'
              meta.errorReason = null
            }
          })
        },
        save: async (data) => {
          if (data) {
            value.current = data
          }
          return await saveInternal()
        },
      })
    }
  }

  useEffect(() => {
    const keydown = function (e) {
      if (
        (window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) &&
        e.keyCode == 83
      ) {
        e.preventDefault()
        save(data)
      }
    }
    document.addEventListener('keydown', keydown, true)

    return () => {
      document.removeEventListener('keydown', keydown)
    }
  }, [])

  useEffect(() => {
    runAndRender(() => {
      let finalizedAlter = alter
      if (defaultForm) {
        const overrideAll = get(defaultForm, '*.alter') || {}
        const overrideTable = get(defaultForm, `${table}.alter`) || {}

        finalizedAlter = {
          ...overrideAll,
          ...overrideTable,
          ...alter,
        }
      }

      meta.alter = {
        lastPath: '',
        replacer: {
          ...finalizedAlter,
        },
      }
      meta.alterReset = true
      setTimeout(() => {
        runAndRender(() => {
          meta.alterReset = false
        })
      })
    })
  }, [alter])

  const init = async () => {
    let fetchData = {}

    runAndRender(() => {
      meta.loading = true
    })
    if (!data) {
      if (where) {
        waitUntil(10000)
        const res = await (dbAll[db][table] as any).findFirst({
          where,
          include,
        })

        if (res) {
          fetchData = res
        }
      }

      await waitUntil(() => def.current)

      if (!where && !data) {
        if (def.current) {
          for (let [k, v] of Object.entries(def.current.columns || {}) as any) {
            if (v.pk) {
              delete fetchData[k]
            }
          }
        }
        fetchData = makeEmpty(fetchData)
      }
    } else {
      await waitUntil(() => def.current)
      fetchData = data || {}
    }

    value.current = fetchData

    if (defaultForm) {
      const overrideAll = get(defaultForm, '*.onLoad')
      const overrideTable = get(defaultForm, `${table}.onLoad`)

      if (typeof overrideAll === 'function')
        overrideAll(value.current, { pk: pkCol.current.name, def: def.current })

      if (typeof overrideTable === 'function')
        overrideTable(value.current, {
          pk: pkCol.current.name,
          def: def.current,
        })
    }

    if (onLoad)
      await onLoad(value.current, {
        pk: pkCol.current.name,
        def: def.current,
        mutation: !!value.current[pkCol.current.name] ? 'create' : 'update',
      })

    runAndRender(() => {
      meta.lastData = data
      meta.status = 'ready'
      meta.loading = false
    })
  }

  useEffect(() => {
    if (!table) {
      console.error(
        'Error: \n   missing prop "table" in <qform />.\n   It should be <qform table="your_table" />\n\n'
      )
      return
    }
    if (tableDefinitions[`${db}.${table}`]) {
      def.current = tableDefinitions[`${db}.${table}`]
    } else {
      ;(dbAll[db][table] as any)['definition']().then((e: any) => {
        if (!e || (!!e && e.statusCode)) {
          e = blankDef
        }

        tableDefinitions[`${db}.${table}`] = e
        def.current = e
      })
    }

    if (def.current) {
      for (let [k, v] of Object.entries(def.current.columns || {}) as any) {
        if (v.pk) {
          pkCol.current = { real: v.name, name: k }
        }
      }
    }

    init()
  }, [props.data])

  if (meta.loading || !def.current || !def.current.columns) return <Loading />

  const formdef = { ...def.current.columns }

  Object.values(def.current.columns).forEach((e) => {
    // add belongs-to relation to columns
    if (e.rel) {
      formdef[e.rel.modelClass] = {
        name: e.rel.modelClass,
        nullable: e.nullable,
        pk: false,
        type: e.rel.relation,
        rel: e.rel,
      }
    }
  })

  for (const e of Object.values(def.current.rels)) {
    if (e.relation === 'Model.HasManyRelation') {
      formdef[e.modelClass] = {
        name: e.modelClass,
        nullable: true,
        pk: false,
        type: e.relation,
        rel: e,
      }
    }
  }

  let currentPlatform = props.platform
  if (!currentPlatform) {
    currentPlatform = 'web'
    if (location.pathname.indexOf('/m/') === 0) {
      currentPlatform = 'mobile'
    }
  }

  if (meta.alterReset) return null

  if (currentPlatform === 'mobile') {
    return (
      <MForm
        metaRef={externalMeta}
        alter={_.current.alter}
        table={table}
        action={props.action}
        title={title}
        def={formdef}
        onChange={(val, key) => {
          delete meta.errors[key]
          meta.errorReason = null
          runAndRender(() => {
            meta.isChanged = true
            if (setUnsaved) setUnsaved(true)
          })
          let currentPk = value.current
            ? value.current[pkCol.current.name]
            : null
          value.current = val || {}
          if (currentPk) {
            value.current[pkCol.current.name] = currentPk
          }

          if (onChange) {
            onChange(val, {
              pk: pkCol.current.name,
              changedKey: key,
              saving: (status: boolean) => {
                runInAction(() => {
                  meta.status = status ? 'Menyimpan' : 'ready'
                })
              },
            })
          }
        }}
        createField={(field) => {
          if (field.required) {
            if (!meta.validation[field.name]) {
              meta.validation[field.name] = ['required']
            } else {
              if (meta.validation[field.name].indexOf('required') < 0)
                meta.validation[field.name].push('required')
            }
          }

          return field
        }}
        childProps={{
          db: dbAll[db][table],
          reset: () => {
            value.current = original
            render()
          },
          onBack,
          render,
          save,
          validate,
          validation: meta.validation,
          status: meta.status,
          errors: meta.errors,
          header,
          setValidateOnChange: (p: boolean) => {
            runAndRender(() => {
              meta.validateOnChange = p
            })
          },
          errorReason: meta.errorReason,
        }}
        layout={layout}
        value={value.current}
      />
    )
  }
  return (
    <Form
      metaRef={externalMeta}
      alter={{
        lastPath: '',
        replacer: {
          ...(alter as any),
        },
      }}
      mutation={!!value.current[pkCol.current.name] ? 'update' : 'create'}
      table={table}
      layout={layout}
      value={value.current}
      mode={props.mode}
      def={formdef}
      createField={(field) => {
        if (field.required) {
          if (!meta.validation[field.name]) {
            meta.validation[field.name] = ['required']
          } else {
            if (meta.validation[field.name].indexOf('required') < 0)
              meta.validation[field.name].push('required')
          }
        }

        return field
      }}
      loadingComponent={props.loadingComponent}
      childProps={{
        db: dbAll[db][table],
        reset: () => {
          value.current = original
          render()
        },
        render,
        save,
        validate,
        validation: meta.validation,
        status: meta.status,
        errors: meta.errors,
        header,
        setValidateOnChange: (p: boolean) => {
          runAndRender(() => {
            meta.validateOnChange = p
          })
        },
        errorReason: meta.errorReason,
        Header: observer((hprops) => (
          <FormHeader
            isChanged={meta.isChanged}
            status={meta.status}
            pk={pkCol.current.name}
            title={title || niceCase(table as any)}
            value={value.current}
            setValue={(val) => {
              value.current = val
              externalMeta.current._shouldUpdateFieldInternal = true
              render()
            }}
            action={props.action}
            showDelete={props.showDelete}
            onBack={
              onBack
                ? () => {
                    if (value.current[pkCol.current.name]) {
                      onBack(value.current)
                    } else {
                      onBack({})
                    }
                  }
                : undefined
            }
            onDelete={async () => {
              const dbc: any = dbAll[db][table]
              runAndRender(() => (meta.status = 'Menghapus'))
              await dbc.delete({
                where: {
                  [pkCol.current.name]: value.current[pkCol.current.name],
                },
              })
              if (onBack) {
                onBack({
                  __deleted: true,
                  id: pkCol.current.real,
                })

                runAndRender(() => (meta.status = 'ready'))
              }
            }}
            save={save}
            {...hprops}
          />
        )),
      }}
      onChange={(val, key) => {
        delete meta.errors[key]
        meta.errorReason = null
        runAndRender(() => {
          meta.isChanged = true
          if (setUnsaved) setUnsaved(true)
        })
        let currentPk = value.current[pkCol.current.name]
        value.current = val
        if (currentPk) {
          value.current[pkCol.current.name] = currentPk
        }

        Object.entries(def.current.columns).forEach(([k, e]) => {
          // add belongs-to relation to columns
          if (e.rel && e.rel.modelClass === key) {
            const r = value.current[key]
            if (typeof r === 'object' && r.connect) {
              Object.keys(r.connect).forEach((e) => {
                value.current[k] = r.connect[e]
              })
            }
          }
        })

        if (onChange) {
          onChange(val, {
            pk: pkCol.current.name,
            changedKey: key,
            saving: (status: boolean) => {
              runInAction(() => {
                meta.status = status ? 'Menyimpan' : 'ready'
              })
            },
          })
        }
      }}
    />
  )
}
