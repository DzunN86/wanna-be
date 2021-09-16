/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Checkbox, DefaultButton, Label, Spinner } from '@fluentui/react'
import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import { FiCode, FiMinus } from 'react-icons/fi'
import { AdminEdit } from '../components/AdminEdit'
import { InputNodeData } from '../components/UIField'
import { getNodeData } from '../components/util'
import { sendParent } from '../ws'

export const CSSTab = observer(({ node }: any) => {
  const meta = useLocalObservable(() => ({
    remcss: '',
    tagName: 'div',
    inherit: {
      width: false,
      height: false,
      class: true,
      style: true,
    },
    renderChildren: 'y',
    img: '',
    raster: '',
    rasterUpdating: false,
    ready: false,
    editAdmin: false,
  }))

  useEffect(() => {
    const all = []
    runInAction(() => {
      meta.ready = false
    })
    all.push(getNodeData(meta, 'renderChildren'))
    all.push(getNodeData(meta, 'remcss'))
    all.push(getNodeData(meta, 'tagName', 'div'))
    all.push(getNodeData(meta, 'raster'))
    all.push(
      getNodeData(
        meta,
        'inherit',
        {
          width: false,
          height: false,
          style: true,
          class: true,
        },
        { parse: true }
      )
    )
    Promise.all(all).then(
      action(() => {
        meta.ready = true
      })
    )
  }, [node])

  if (!meta.ready)
    return (
      <div className="items-center justify-center flex absolute inset-0">
        <Spinner />
      </div>
    )

  return (
    <div
      className="relative flex-1"
      css={css`
        overflow-x: hidden;
        overflow-y: auto;
      `}
    >
      <div
        className="flex flex-col inset-0 absolute"
        css={css`
          margin-right: 1px;
          label,
          .ms-Checkbox-text {
            font-size: 12px;
          }
          .ms-Checkbox {
            margin: 5px;
          }
          .ms-Checkbox-checkbox {
            margin-left: 0px !important ;
          }
        `}
      >
        {!meta.raster && (
          <div className="flex border-b border-gray-200">
            <Label className="w-1/4 border-r border-gray-200 flex items-center justify-end px-1">
              Children
            </Label>
            <div className="flex ">
              <Checkbox
                label="Render {children}"
                checked={meta.renderChildren !== 'n'}
                onChange={action((_, checked) => {
                  meta.renderChildren = !!checked ? 'y' : 'n'
                  sendParent('set-node-data', {
                    name: 'renderChildren',
                    value: meta.renderChildren,
                  })
                })}
              />
            </div>
          </div>
        )}
        <div className="flex border-b border-gray-200">
          <Label className="w-1/4 border-r border-gray-200 flex items-center justify-end px-1">
            Inherit
          </Label>
          <div
            className="flex flex-col"
            css={css`
              .ms-Checkbox {
                width: 70px;
              }
            `}
          >
            {!meta.raster && (
              <div className="flex flex-row">
                <Checkbox
                  label="Width"
                  checked={meta.inherit.width}
                  onChange={action((_, checked) => {
                    meta.inherit.width = !!checked
                    sendParent('set-node-data', {
                      name: 'inherit',
                      value: meta.inherit,
                      parse: true,
                    })
                  })}
                />
                <Checkbox
                  label="Height"
                  checked={meta.inherit.height}
                  onChange={action((_, checked) => {
                    meta.inherit.height = !!checked
                    sendParent('set-node-data', {
                      name: 'inherit',
                      value: meta.inherit,
                      parse: true,
                    })
                  })}
                />
              </div>
            )}
            <div className="flex flex-row">
              <Checkbox
                label="Class"
                checked={meta.inherit.class !== false}
                onChange={action((_, checked) => {
                  meta.inherit.class = !!checked
                  sendParent('set-node-data', {
                    name: 'inherit',
                    value: meta.inherit,
                    parse: true,
                  })
                })}
              />

              <Checkbox
                label="Style"
                checked={meta.inherit.style !== false}
                onChange={action((_, checked) => {
                  meta.inherit.style = !!checked
                  sendParent('set-node-data', {
                    name: 'inherit',
                    value: meta.inherit,
                    parse: true,
                  })
                })}
              />
            </div>
          </div>
        </div>
        {node.type !== 'INSTANCE' && (
          <>
            <div className="flex border-b border-gray-200">
              <Label className="w-1/4 border-r border-gray-200 flex items-center justify-end px-1">
                Rasterize
              </Label>
              <div
                className="flex flex-1 items-stretch"
                css={css`
                  .ms-Button {
                    margin: 3px;
                    width: 70px;
                  }
                `}
              >
                <select
                  value={meta.raster}
                  className="flex flex-1 text-xs border-r border-gray-200"
                  onChange={async (e) => {
                    const value = e.target.value
                    if (value) {
                      await sendParent('set-img', { mode: value })
                      sendParent('set-node-data', {
                        name: 'renderChildren',
                        value: 'n',
                      })
                    } else {
                      await sendParent('unset-img')
                      sendParent('set-node-data', {
                        name: 'renderChildren',
                        value: meta.renderChildren,
                      })
                    }
                    runInAction(() => {
                      meta.raster = value
                    })
                  }}
                >
                  <option value="">Disabled</option>
                  <option value="png@1">PNG x 1</option>
                  <option value="png@2">PNG x 2</option>
                  <option value="png@3">PNG x 3</option>
                  <option value="svg">SVG</option>
                </select>
                {meta.raster && (
                  <DefaultButton
                    onClick={action(() => {
                      meta.rasterUpdating = true
                      let type = meta.raster.split('@')[0].toUpperCase()
                      let scale = meta.raster.split('@')[1] || '1'

                      sendParent('get-image', {
                        node_id: node.id,
                        type,
                        scale,
                        update: 'y',
                      }).then(
                        action((e) => {
                          meta.rasterUpdating = false
                        })
                      )
                    })}
                  >
                    {meta.rasterUpdating ? '...' : 'Update'}
                  </DefaultButton>
                )}
              </div>
            </div>
            {!meta.raster && (
              <>
                <InputNodeData
                  multiline={false}
                  label={
                    <div className="flex justify-end items-center">
                      <FiCode
                        css={css`
                          font-size: 12px;
                          font-weight: bold;
                        `}
                      />{' '}
                      <div className="ml-1">Tag</div>
                    </div>
                  }
                  postfix={
                    meta.tagName === 'admin' && (
                      <div className="px-1 border-l border-gray-300">
                        <DefaultButton
                          onClick={action(() => {
                            meta.editAdmin = true
                          })}
                        >
                          Edit
                        </DefaultButton>
                      </div>
                    )
                  }
                  meta={meta}
                  name={'tagName'}
                />
                {meta.editAdmin && (
                  <AdminEdit
                    done={action(() => {
                      meta.editAdmin = false
                    })}
                  />
                )}
              </>
            )}
          </>
        )}
        <InputNodeData
          label={
            <div className="flex justify-end items-center">
              <FiMinus
                css={css`
                  font-size: 12px;
                  font-weight: bold;
                `}
              />{' '}
              <div className="ml-1">Class</div>
            </div>
          }
          meta={meta}
          name={'remcss'}
        />
        {/* <InputNodeData
          label={
            <div className="flex justify-end items-center">
              <FiPlus
                css={css`
                  font-size: 12px;
                  font-weight: bold;
                `}
              />{' '}
              <div className="ml-1">Class</div>
            </div>
          }
          meta={meta}
          name={'addcss'}
        /> */}
        {/* {node.img ? (
          <div
            className="cursor-pointer font-medium text-center bg-gray-400 text-white rounded-sm"
            css={css`
              margin: 2px;
              padding: 3px 5px;
              z-index: 100;
              top: 5px;
              right: 5px;
              font-size: 10px;
            `}
            onClick={() => {
              sendParent('unset-img')
              render()
            }}
          >
            Image - Convert To Tag
          </div>
        ) : (
          <div
            className="flex flex-row relative"
            css={css`
              > div {
                flex: 1;
              }
            `}
          >
            <div
              className="cursor-pointer font-bold absolute bg-gray-400 text-white rounded-sm"
              css={css`
                padding: 3px 5px;
                z-index: 100;
                top: 5px;
                right: 5px;
                font-size: 8px;
              `}
              onClick={() => {
                sendParent('set-img')
                render()
              }}
            >
              IMG
            </div>
          </div>
        )} */}
      </div>
    </div>
  )
})
