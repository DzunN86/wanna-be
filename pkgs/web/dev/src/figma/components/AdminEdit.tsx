/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { DefaultButton, Label, Spinner, SpinnerSize } from '@fluentui/react'
import { action, runInAction, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { BiArrowBack } from 'react-icons/bi'
import { api } from 'web.utils/src/api'
import { sendParent } from '../ws'
interface IEffectQuery {
  done: () => void
}
export const AdminEdit = observer(({ done }: IEffectQuery) => {
  const meta = useLocalObservable(() => ({
    tab: 'select',
    tables: [],
    selected: {
      table: '',
    },
    defs: {},
    reloading: false,
    source: {
      nav: [],
      content: {},
    },
  }))

  const reloadTables = () =>
    getTables().then(
      action((e) => {
        meta.tables = e
      })
    )

  useEffect(() => {
    reloadTables()
    sendParent('get-node-data', {
      name: 'props',
    }).then((e: any) => {
      const props = JSON.parse(e || '{}')

      runInAction(() => {
        meta.source.nav = props.nav || []
        meta.source.content = props.content || {}
      })
    })
  }, [])

  return (
    <div
      className="flex flex-col w-full fixed inset-0 z-10 bg-white"
      css={css`
        bottom: 26px;
        .ms-Button {
          height: 20px;
          min-width: 50px;
          padding: 0px 6px;
          .ms-Button-label {
            font-size: 12px;
          }
        }
      `}
    >
      <div className="flex justify-between items-center border-b  border-gray-300 ">
        <Label
          className="px-1 cursor-pointer flex flex-row items-center"
          onClick={() => done()}
        >
          <BiArrowBack className="mr-1" /> Back
        </Label>
        <ReloadSchema
          meta={meta}
          reloading={meta.reloading}
          reloadTables={reloadTables}
        />
      </div>
      <div className="flex flex-1 flex-row items-stretch">
        <Nav
          nav={meta.source.nav}
          setNav={action((nav) => {
            meta.source.nav = nav
          })}
          tables={meta.tables}
        />
        <Content />
      </div>
    </div>
  )
})

const Content = () => {
  return (
    <div className="flex flex-col flex-1">
      <div
        className="flex flex-row"
        css={css`
          height: 20px;
        `}
      >
          

      </div>
      <div className="flex-1 flex"></div>
    </div>
  )
}

const Nav = ({ setNav, nav, tables }) => {
  return (
    <div
      className="overflow-y-auto border-r border-gray-300"
      css={css`
        min-height: min-content;
        height: 100%;
        width: 100px;
      `}
    >
      <div
        className="flex flex-col"
        css={css`
          height: 1px;

          label {
            padding: 2px 5px;
            margin: 0px;
          }
        `}
      >
        {tables.map((e) => {
          return (
            <Label
              key={e}
              onClick={(ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                if (nav.indexOf(e) >= 0) {
                  nav.splice(nav.indexOf(e), 1)
                } else {
                  nav.push(e)
                }
                console.log(toJS(nav))
                setNav([...nav])
              }}
              className="flex items-center border-b border-gray-300 cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={nav.indexOf(e) >= 0}
                onChange={() => {}}
                className="pointer-events-none mr-1"
              />
              {e}
            </Label>
          )
        })}
      </div>
    </div>
  )
}

const ReloadSchema = ({ reloading, meta, reloadTables }) => {
  return reloading ? (
    <Label
      className="text-xs p-0 pr-2 flex items-center"
      css={css`
        font-size: 10px;
      `}
    >
      <Spinner size={SpinnerSize.xSmall} className="mr-1" />
      Reloading Schema...
    </Label>
  ) : (
    <DefaultButton
      css={css`
        height: 24px !important;
        border: 0px;
        .ms-Button-label {
          font-size: 10px !important;
        }
      `}
      onClick={async () => {
        runInAction(() => (meta.reloading = true))
        await reloadSchema()
        await reloadTables()
        setTimeout(async () => {
          await reloadTables()
          runInAction(() => (meta.reloading = false))
        }, 1000)
      }}
    >
      Reload Schema
    </DefaultButton>
  )
}

const getTables = async () => {
  return await api(
    '/__data',
    {
      action: 'tables',
      db: 'main',
    },
    {
      method: 'POST',
    }
  )
}

const reloadSchema = async () => {
  return await api(
    '/__data',
    {
      action: 'reload-schema',
      db: 'main',
    },
    {
      method: 'POST',
    }
  )
}

const getDef = async (table: string) => {
  return await api(
    '/__data',
    {
      action: 'definition',
      db: 'main',
      table,
    },
    {
      method: 'POST',
    }
  )
}
