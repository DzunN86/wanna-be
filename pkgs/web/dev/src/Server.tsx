/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Icon, SearchBox } from '@fluentui/react'
import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { Table } from 'web.list/src/Table'
import { api } from 'web.utils/src/api'
import { ServerEditor } from './internal/ServerEditor'

export type SingleServerItem = {
  oldName: string
  name: string
  code: string
  unsaved: boolean
}

const blankItem: SingleServerItem = {
  name: '',
  oldName: '',
  code: `\
const server = ({db, api, user, req, reply, ext}: IServer) => {
  reply.send({ hello: "world" });
}`,
  unsaved: true,
}

export const Server = observer(
  (props: {
    args: any
    showNav: boolean
    toggleNav: (nav: boolean) => void
    navigate: (opt: { tab: string; args: any }) => void
  }) => {
    const meta = useLocalObservable(() => ({
      list: [] as SingleServerItem[],
      form: null,
    }))

    useEffect(() => {
      reloadList()
    }, [])

    const createNew = () => {
      let found = false
      for (let i of meta.list) {
        if (i.name === '') {
          meta.form = i
          found = true
          break
        }
      }
      if (!found) {
        meta.list.push({ ...blankItem })
        meta.form = meta.list[meta.list.length - 1]
      }
    }

    const reloadList = () => {
      api('/__server/list').then((e) => {
        runInAction(() => {
          meta.list = e
          if (!meta.form) meta.form = meta.list[0]
          else {
            meta.list.forEach(
              action((e) => {
                if (meta.form.name === e.name) {
                  meta.form = e
                }
              })
            )
          }
          if (meta.list.length === 0) {
            createNew()
          }
        })
      })
    }
    return (
      <>
        <div className="flex-1 flex flex-row items-stretch justify-between">
          <div
            className="flex flex-col items-stretch"
            css={css`
              width: 200px;
              user-select: none;
              border-right: 1px solid #ececeb;
              .ms-DetailsRow-cell {
                cursor: pointer;
                font-weight: 500;
                font-size: 12px !important;
              }
            `}
          >
            <div className="flex flex-row">
              <div
                css={css`
                  width: calc(100% - 30px);
                `}
              >
                <SearchBox
                  underlined={true}
                  placeholder={'URL Path'}
                  autoFocus={true}
                />
              </div>
              <Icon
                iconName="Add"
                onClick={action(() => {
                  if (!meta.form || !meta.form.unsaved) {
                    createNew()
                  } else if (meta.form.unsaved) {
                    if (confirm('Current query will be lost, are you sure ?')) {
                      createNew()
                    }
                  }
                })}
                className="flex-1 cursor-pointer flex items-center justify-center hover:bg-blue-100"
                css={css`
                  font-size: 12px;
                  font-weight: bold;
                  border-left: 1px solid #ddd;
                  border-bottom: 1px solid #6a8eb0;
                  width: 30px;
                `}
              />
            </div>
            <Table
              className="flex-1"
              items={meta.list}
              showHeader={false}
              onSelect={action((e: any) => {
                meta.form = e
              })}
              selected={meta.form}
              columns={[['name', { width: 300, title: 'Name' }]]}
            />
          </div>
          <div className="flex-1 flex flex-col">
            {meta.form && (
              <ServerEditor data={meta.form} reloadList={reloadList} />
            )}
          </div>
        </div>
      </>
    )
  }
)
