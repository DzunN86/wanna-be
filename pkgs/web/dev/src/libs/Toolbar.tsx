/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Icon } from '@fluentui/react'
import { Observer } from 'mobx-react-lite'

export const Toolbar = ({ back, id, title, actions, unsaved }) => {
  return (
    <div>
      <Observer>
        {() => {
          return (
            <div
              className="flex flex-row justify-between p-2 border-b border-gray-200 select-none"
              css={css`
                min-height: 40px;
                ${unsaved &&
                css`
                  border-bottom: 2px solid red;
                  background-image: linear-gradient(
                    45deg,
                    #ffdbdb 4.55%,
                    #ffffff 4.55%,
                    #ffffff 50%,
                    #ffdbdb 50%,
                    #ffdbdb 54.55%,
                    #ffffff 54.55%,
                    #ffffff 100%
                  );
                  background-size: 15.56px 15.56px;
                `}
              `}
            >
              <div className="flex flex-row items-center text-xs font-medium">
                {back && (
                  <Icon
                    onClick={back}
                    iconName="ChevronLeft"
                    css={css`
                      margin-right: 10px;
                      cursor: pointer;
                      font-size: 16px;
                    `}
                  />
                )}
                <div className="flex flex-row items-center">
                  {id ? (
                    <div className="px-2 py-1 bg-blue-100 rounded-md mr-1">
                      {id}
                    </div>
                  ) : (
                    ''
                  )}{' '}
                  {title}
                </div>
              </div>
              {unsaved && (
                <div className="flex items-center px-6 my-1 ml-4 text-xs font-semibold text-red-500 bg-white border-2 border-red-500 rounded-md">
                  UNSAVED
                </div>
              )}
              <div
                className="flex flex-row items-stretch"
                css={css`
                  .ms-Button {
                    padding: 0px 10px;
                    min-width: 0px;
                    margin-right: 10px;
                    height: 30px;
                    overflow: hidden;
                    border-color: #ddd;

                    i {
                      font-size: 13px;
                    }
                  }

                  .ms-TooltipHost {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                `}
              >
                {actions.map((e) => {
                  return e
                })}
              </div>
            </div>
          )
        }}
      </Observer>
    </div>
  )
}
