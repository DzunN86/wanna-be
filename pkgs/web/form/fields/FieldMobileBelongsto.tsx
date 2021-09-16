/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { List, ListItem, Sheet } from 'framework7-react'
import { db } from 'libs'
import find from 'lodash.find'
import get from 'lodash.get'
import { action, runInAction, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { BaseWindow } from 'web.init/src/window'
import AdminCMS from '../src/AdminCMS'
declare const window: BaseWindow
export const MobileBelongsTo = observer(
  (props: {
    label: string
    name: string
    value: any
    row?: any
    disabled?: boolean
    info?: string
    create?: boolean
    relation: {
      table: string
      label: (e: any) => string
      params: any
      value: (e: any) => any
      from: string
      to: string
      nullable: boolean
    }
    required: boolean
    errorMessage?: string
    errorMessageForce?: boolean
    onChange: (val: any) => void
  }) => {
    const meta = useLocalObservable(() => ({
      items: [] as Array<{ key: any; text: string }>,
      value: null as any,
      valueLabel: '',
      opened: false,
    }))

    useEffect(
      action(() => {
        meta.value = props.value
      }),
      [props.value]
    )

    useEffect(() => {
      const val = toJS(meta.value)

      if (typeof val === 'object') {
        const connectId = get(val, `connect.${props.relation.to}`)
        if (connectId) {
          db[props.relation.table]
            .findFirst({
              where: { [props.relation.to]: connectId },
            })
            .then(
              action((e) => {
                meta.valueLabel = e[props.relation.label(e)]
              })
            )
        } else {
          if (val[props.relation.table] && val[props.relation.label(val)]) {
            runInAction(() => {
              val[props.relation.label(val)]
            })
          }
        }
      } else {
        const connectId = props.row[props.relation.from]
        if (connectId) {
          db[props.relation.table]
            .findFirst({
              where: { [props.relation.to]: connectId },
            })
            .then(
              action((e) => {
                meta.valueLabel = e[props.relation.label(e)]
                props.onChange({
                  connect: {
                    [props.relation.to]: e[props.relation.to],
                  },
                })
              })
            )
        }
      }
    }, [meta.value])

    const title = props.label
    const sid = useRef(window.mobileSheetIds++)

    return (
      <>
        <List
          className={`${props.required ? 'required' : ''} flex flex-col `}
          mediaList
          css={css`
            .item-text {
              font-size: var(--f7-input-info-font-size);
              position: relative;
              margin-top: -8px;
            }
            .item-title {
              font-size: var(--f7-label-font-size) !important;
              font-weight: var(--f7-label-font-weight) !important;
              line-height: var(--f7-label-line-height) !important;
              color: var(--f7-label-text-color) !important;
            }
            .item-subtitle {
              height: var(--f7-input-height);
              color: var(--f7-input-text-color);
              font-size: var(--f7-input-font-size);
              background-color: var(--f7-input-bg-color, transparent);
              padding-left: var(--f7-input-padding-left);
              padding-right: var(--f7-input-padding-right);
              display: flex;
              align-items: center;
            }
          `}
        >
          <ListItem
            link={'#'}
            title={title}
            className={`${props.errorMessageForce ? 'pb-4' : ''}`}
            subtitle={meta.valueLabel || '—'}
            text={props.info}
            chevronCenter={true}
            disabled={props.disabled}
            onClick={action(() => {
              meta.opened = true
            })}
          ></ListItem>

          {props.errorMessageForce && (
            <div
              className="block item-input-error-message"
              css={css`
                margin-top: -23px !important;
              `}
            >
              {props.errorMessage}
            </div>
          )}
        </List>
        {createPortal(
          <Sheet
            opened={meta.opened}
            css={css`
              display: ${meta.opened ? 'none' : 'flex'};
              flex-direction: column;
              height: 90vh;

              > .sheet-modal-inner {
                display: flex;
                flex-direction: column;
                height: 100%;
              }
            `}
            onSheetClosed={action(() => (meta.opened = false))}
            swipeToClose
            className={`bt-${sid.current} h-full`}
            swipeHandler={`.bt-${sid.current} .form-title`}
          >
            <div className="block-title form-title">{props.label}</div>
            {meta.opened && (
              <AdminCMS
                content={
                  {
                    [props.label]: {
                      table: props.relation.table,
                      list: {
                        table: {
                          swipeout: (row, { Edit, Delete }) => {
                            return (
                              <>
                                <Edit />
                                <Delete />
                              </>
                            )
                          },
                          onRowClick: (row, idx, ev) => {
                            if (idx < 0 || (ev && ev.mode === 'edit')) {
                              // Create Button / Edit Button
                              return true
                            }
                            const val = {
                              connect: {
                                [props.relation.to]: row[props.relation.to],
                              },
                            }
                            props.onChange(val)
                            runInAction(() => {
                              meta.value = val
                              meta.opened = false
                            })
                          },
                        },
                        params: props.relation.params,
                      },
                    },
                  } as any
                }
              />
            )}
          </Sheet>,
          document.getElementById('framework7-root') as any
        )}
      </>
    )
  }
)
