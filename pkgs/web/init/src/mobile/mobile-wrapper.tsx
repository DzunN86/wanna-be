/** @jsx jsx */
import { css, jsx } from '@emotion/react'

export const MobileWrapper = ({ children }) => {
  return (
    <div
      className="mobile flex flex-1"
      css={css`
        position: relative;

        @media only screen and (min-width: 768px) {
          margin: 0px auto;
          max-width: 500px;
          min-width: 500px;
          border-left: 1px solid #ccc;
          border-right: 1px solid #ccc;
          background: white;
        }

        @font-face {
          font-family: 'Framework7 Icons';
          font-style: normal;
          font-weight: 400;
          src: url('/__ext/fonts/Framework7Icons-Regular.eot');
          src: local('Framework7 Icons'), local('Framework7Icons-Regular'),
            url('/__ext/fonts/Framework7Icons-Regular.woff2') format('woff2'),
            url('/__ext/fonts/Framework7Icons-Regular.woff') format('woff'),
            url('/__ext/fonts/Framework7Icons-Regular.ttf') format('truetype');
        }

        .list textarea.resizable {
          padding: 2px 0px;
        }

        .f7-icons,
        .framework7-icons {
          font-family: 'Framework7 Icons';
          font-weight: normal;
          font-style: normal;
          font-size: 28px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          -moz-osx-font-smoothing: grayscale;
          -webkit-font-feature-settings: 'liga';
          -moz-font-feature-settings: 'liga=1';
          -moz-font-feature-settings: 'liga';
          font-feature-settings: 'liga';
        }
        #framework7-root {
          .z-max {
            z-index: 99999;
          }

          .sheet-modal,
          .sheet-modal > .sheet-modal-inner,
          .sheet-modal-inner > div {
            border-top-left-radius: 15px;
            border-top-right-radius: 15px;
          }
          .form-title {
            background: #efeff4;
            border-bottom: 1px solid #c7c7c7;
            color: black;
            margin: 0px 0px 0px 0px;
            padding: 15px 16px 0px 16px;
            line-height: 56px;
            min-height: 65px;
            user-select: none;
            color: #999;
            border-top-left-radius: 15px;
            border-top-right-radius: 15px;
            &::before {
              display: block;
              position: absolute;
              top: 11px;
              left: 50%;
              content: '«';
              color: transparent;
              pointer-events: none;
              border-radius: 99px;
              width: 44px;
              height: 7px;
              background: #cdcdcd;
              margin-left: -22px;
            }
          }
          .list {
            display: flex;
            flex: 1;
            height: 100%;
            margin: 0px !important;

            &.required {
              .item-title {
                &:after {
                  content: '★';
                  font-size: 70%;
                  color: red;
                  position: absolute;
                  margin: 0px 3px;
                }
              }
            }

            > ul {
              flex: 1;
              height: 100%;
            }
          }
        }
      `}
    >
      {children}
    </div>
  )
}
