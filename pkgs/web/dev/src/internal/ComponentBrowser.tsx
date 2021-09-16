/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  Callout,
  DefaultButton,
  DirectionalHint,
  Icon,
  Label,
} from '@fluentui/react'
import { action, runInAction, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { Table } from 'web.list/src/Table'
import sortby from 'lodash.sortby'
import { api } from 'web.utils/src/api'
import { ComponentEditor, IComponentData } from './ComponentEditor'

const blankComponent: IComponentData = {
  name: '',
  path: '',
  type: 'import',
  wrapperCode: `\
/** @jsx jsx */
import { jsx } from "@emotion/react";
import { useComponent } from "web.utils/component";

export default ({ children }) => {
  const _component = useComponent({});
  return eval(_component.render);
}`,
  code: '<div>Hello</div>',
}

const loadComponents = async () => {
  const res = await api('/__cms/0/component-list')
  return res
}

export const ComponentBrowser = observer(() => {
  const meta = useLocalObservable(() => ({
    show: false,
    list: ((window as any).componentEditorList || []) as IComponentData[],
    filter: '',
    current: null as IComponentData | null,
  }))
  const ref = useRef(null as any)

  useEffect(() => {
    loadComponents().then(
      action((e: any) => {
        meta.list = e
        // for (let i of e) {
        //   if (i.name === 'test') {
        //     meta.current = i;
        //   }
        // }
      })
    )
  }, [])

  useEffect(() => {
    ;(async () => {
      const row = meta.current
      if (row && !row.code && !row.wrapperCode) {
        const res = await api('/__cms/0/component-load', {
          path: row.path,
          name: row.name,
        })
        runInAction(() => {
          meta.current = res
        })
      }
    })()
  }, [meta.current])

  return (
    <div className="text-xs flex items-center mr-2 ">
      <div
        ref={ref}
        onClick={action(() => {
          meta.show = true
        })}
        className="border border-gray-300 cursor-pointer rounded-xs px-4 py-1"
      >
        Components
      </div>
      {meta.show && (
        <Callout
          target={ref}
          directionalHint={DirectionalHint.leftCenter}
          onDismiss={action(() => {
            meta.show = false
          })}
        >
          <div
            className="flex flex-col"
            css={css`
              width: 400px;
              height: 80vh;
              overflow: hidden;
            `}
          >
            <div
              className="flex flex-row items-center justify-between border-b border-gray-200"
              css={css`
                padding: 5px 10px;
                .ms-Button {
                  padding: 0px 10px;
                  min-width: 0px;
                  height: 25px;
                  font-size: 11px;
                  overflow: hidden;
                  border-color: #ddd;

                  i {
                    font-size: 13px;
                  }
                }
              `}
            >
              <Label className="flex flex-row">
                <Icon
                  iconName="search"
                  css={css`
                    font-weight: bold;
                    margin: 0px 5px 0px 0px !important;
                  `}
                />
                <input
                  type="text"
                  placeholder="Components"
                  value={meta.filter}
                  onChange={action((e) => {
                    meta.filter = e.target.value
                  })}
                  css={css`
                    outline: none;

                    &::placeholder {
                      font-weight: 500;
                      color: black;
                    }
                  `}
                ></input>
              </Label>
              <DefaultButton
                onClick={action(() => {
                  localStorage.setItem('component-hide-wrapper', 'n')
                  ;(window as any).componentEditorList = toJS(meta.list)
                  meta.show = false
                  meta.current = { ...blankComponent }
                })}
              >
                + New Component
              </DefaultButton>
            </div>
            <div className="flex flex-1 relative">
              <div className="absolute inset-0 flex">
                <Table
                  className="flex flex-1"
                  items={sortby(
                    meta.list
                      .filter((e) => {
                        if (e.type === 'identifier') {
                          return false
                        }
                        if (meta.filter) {
                          if (
                            e.name.toLowerCase().indexOf(meta.filter) >= 0 ||
                            e.path.toLowerCase().indexOf(meta.filter) >= 0
                          ) {
                            return true
                          }
                          return false
                        }
                        if (e.path.startsWith('web.')) return false
                        return true
                      })
                      .map(({ name, path }: IComponentData) => ({
                        name,
                        path,
                      })),
                    'name'
                  )}
                  onRowClick={action((row) => {
                    meta.show = false
                    meta.current = row
                  })}
                />
              </div>
            </div>
          </div>
        </Callout>
      )}

      {meta.current && (
        <ComponentEditor
          data={meta.current}
          onClose={action((reloadList: boolean) => {
            if (reloadList) {
              loadComponents().then(
                action((e: any) => {
                  meta.list = e
                })
              )
            }
            meta.show = true
            meta.current = null
          })}
        />
      )}
    </div>
  )
})
