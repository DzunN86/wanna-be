/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Label } from '@fluentui/react'
import get from 'lodash.get'
import { action } from 'mobx'
import { Observer, useLocalObservable } from 'mobx-react-lite'
import { niceCase } from 'web.utils/src/niceCase'

export const SnipPicker = ({ template, onSelect, mode }) => {
  const meta = useLocalObservable(() => ({
    hover: '',
  }))
  return (
    <Observer>
      {() => {
        const snips: string[] = get(template.snips, '_order', [])
        const list: string[] = get(template.snips[meta.hover], '_order', [])
        return (
          <div
            className="relative flex flex-col " 
            onMouseLeave={action(() => {
              meta.hover = ''
            })}
            css={css`
              padding-top: 6px;
              width: 90px;
              border-right: 1px solid #ececeb;
              margin-bottom: ${mode === 'design' ? '0px' : '-5px'};
            `}
          >
            <div
              className="absolute overflow-auto"
              css={css`
                bottom: 0px;
                background: rgb(255, 255, 255);
                border-left: 1px solid #ececeb;

                background: linear-gradient(
                  90deg,
                  rgba(255, 255, 255, 1) 4%,
                  #f9f9f9 100%
                );
                top: 0px;
                right: 0px;
                width: 450px;
                margin-right: -450px;
                z-index: 99;
                box-shadow: 4px 0 4px -4px #999;
                transition: all 0.5s;
                opacity: 0;
                pointer-events: none;
                transform: translateX(-50px);
                ${meta.hover &&
                css`
                  pointer-events: all;
                  opacity: 1;
                  transform: translateX(0px);
                `}
              `}
            >
              {list.map((k: any) => {
                const e = template.snips[meta.hover][k]
                return (
                  <Snip
                    key={k}
                    e={e}
                    onSelect={onSelect}
                    dismiss={action(() => {
                      meta.hover = ''
                    })}
                  />
                )
              })}
            </div>

            {snips.map((k) => {
              const v = template.snips[k]
              return (
                <Label
                  key={k}
                  onMouseOver={action(() => {
                    meta.hover = k
                  })}
                  css={css`
                    cursor: pointer;
                    margin: 2px 0px 2px 5px;
                    padding: 3px 10px;
                    border-radius: 5px;
                    font-size: 13px;
                    border-top-right-radius: 0px;
                    border-bottom-right-radius: 0px;
                    border: 1px solid transparent;

                    ${k === meta.hover &&
                    css`
                      border: 1px solid #ececeb;
                      border-right: 0px;
                      background: #fafafa;
                    `}
                  `}
                >
                  {niceCase(k)}
                </Label>
              )
            })}
          </div>
        )
      }}
    </Observer>
  )
}

const Snip = ({ e, dismiss, onSelect }) => {
  return (
    <div
      onClick={() => {
        onSelect(e)
        dismiss()
      }}
      className="px-2 mx-1 my-2 rounded-md cursor-pointer"
      css={css`
        img {
          box-shadow: 0px 0px 0px 1px #ccc;
        }
        &:hover {
          img {
            box-shadow: 0px 0px 3px 1px #6b99ee;
          }
        }
      `}
    >
      <Label>{e.title}</Label>
      <img className="rounded-md" src={`/__cms/${e.id}/snip-img.png`} />
    </div>
  )
}
