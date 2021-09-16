/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  ActionButton,
  DirectionalHint,
  PrimaryButton,
  TooltipHost,
} from '@fluentui/react'
import { action, toJS } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { Fragment, lazy, Suspense, useRef } from 'react'
import { createPortal } from 'react-dom'

export const FormHeader = ({
  isChanged,
  status,
  title,
  onBack,
  save,
  action,
  setValue,
  value,
  onDelete,
  showDelete,
  pk,
}) => {
  const finalAction = {
    jsonEdit: true,
    delete: true,
    save: true,
    ...action,
  }

  return (
    <div
      className="form-header flex flex-row items-center justify-between font-semibold border-b border-blue-300 bg-gray-50"
      css={css`
        padding: 0px 10px;
        font-size: 15px;
        height: 46px;
        line-height: 46px;
        ${status === 'saved' &&
        css`
          border-bottom: 2px solid #4cbd4c;
          background-image: linear-gradient(
            45deg,
            #ddffdd 4.55%,
            #ffffff 4.55%,
            #ffffff 50%,
            #ddffdd 50%,
            #ddffdd 54.55%,
            #ffffff 54.55%,
            #ffffff 100%
          );
          background-size: 15.56px 15.56px;
        `}

        .edit-option {
          opacity: 0;
        }

        &:hover {
          .edit-option {
            opacity: 1;
          }
        }

        ${(isChanged || status === 'error') &&
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
      <div className="flex flex-row items-center">
        {onBack && (
          <div
            onClick={onBack}
            className="mr-2 cursor-pointer hover:opacity-40"
            css={css`
              width: 15px;
              margin-top: -3px;
              height: 15px;
            `}
          >
            <svg viewBox="0 0 407.436 407.436">
              <path d="M315.869 21.178L294.621 0 91.566 203.718l203.055 203.718 21.248-21.178-181.945-182.54z" />
            </svg>
          </div>
        )}
        <div>
          {typeof title === 'string'
            ? (title || '').substr(0, 50)
            : typeof title === 'function'
            ? title({ data: value, isChanged, status })
            : title}
        </div>
      </div>

      {isChanged || status === 'error' || status === 'Gagal' ? (
        <div className="flex items-center px-6 my-1 ml-4 text-xs font-semibold text-red-500 bg-white border-2 border-red-500 rounded-md">
          {status === 'Gagal' ? 'Penyimpanan Gagal' : 'Belum disimpan'}
        </div>
      ) : (
        status !== 'ready' && (
          <div className="flex items-center px-6 my-1 ml-4 text-xs font-semibold text-green-500 uppercase bg-white border-2 border-green-500 rounded-md">
            {status}
          </div>
        )
      )}

      <div className="flex flex-row items-center justify-end">
        {finalAction.jsonEdit && setValue && (
          <EditOption value={value} setValue={setValue} />
        )}
        {finalAction.delete &&
          value[pk] > 0 &&
          status !== 'saving' &&
          showDelete !== false && (
            <ActionButton
              iconProps={{ iconName: 'Trash' }}
              className="mr-2"
              css={css`
                color: #ff8484;
                i {
                  color: #ff8989;
                }

                &:hover {
                  i {
                    color: #f84545 !important;
                  }
                }
              `}
              onClick={async () => {
                if (confirm('Delete current item. Are you sure ?')) {
                  onDelete()
                }
              }}
            ></ActionButton>
          )}
        {finalAction.custom &&
          (Array.isArray(finalAction.custom)
            ? finalAction.custom.map((e, idx) => {
                return (
                  <Fragment key={idx}>
                    {typeof e === 'function' ? e({ save }) : e}
                  </Fragment>
                )
              })
            : finalAction.custom)}
        {finalAction.save && (
          <PrimaryButton
            className="action-button"
            iconProps={{ iconName: 'Save' }}
            disabled={status === 'saving'}
            onClick={async () => {
              await save()
            }}
          >
            {typeof finalAction.save === 'string'
              ? finalAction.save
              : status === 'saving'
              ? 'Menyimpan...'
              : 'Simpan'}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

const EditOption = observer(({ value, setValue }: any) => {
  const meta = useLocalObservable(() => ({
    dialog: false,
    value: JSON.stringify(value, null, 2),
  }))
  const editor = useRef(lazy(() => import('./JsonEditor')))
  const Editor = editor.current

  let div = document.querySelector('#json-editor')
  if (!div) {
    const root = document.querySelector('#root')
    div = document.createElement('div')
    div.setAttribute('id', 'json-editor')
    root?.appendChild(div)
  }

  return (
    <div className="mx-2 cursor-pointer select-none form-header edit-option hover:opacity-75">
      <div
        onClick={action(() => {
          meta.dialog = true
        })}
      >
        <TooltipHost
          directionalHint={DirectionalHint.leftCenter}
          content={`Edit JSON`}
        >
          <SettingIcon width="16" height="16" />
        </TooltipHost>
      </div>

      {meta.dialog &&
        createPortal(
          <Suspense fallback={null}>
            <Fragment>
              <div
                onClickCapture={action((e) => {
                  meta.dialog = false
                  e.stopPropagation()
                  e.preventDefault()
                  try {
                    setValue(JSON.parse(meta.value))
                  } catch (e) {}
                })}
                className="fixed inset-0 z-50 w-full h-full bg-gray-800 opacity-75"
              ></div>

              <div
                className="fixed overflow-hidden "
                css={css`
                  width: 90vw;
                  height: 90vh;
                  top: 5vh;
                  z-index: 100;
                  left: 5vw;
                `}
              >
                <Editor
                  onChange={action((newval) => {
                    meta.value = newval
                  })}
                  value={meta.value}
                />
              </div>
            </Fragment>
          </Suspense>,
          div
        )}
    </div>
  )
})

function SettingIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M13.94 5L19 10.06l-.613.615a6.5 6.5 0 00-8.712 8.712l-.613.612a2.25 2.25 0 01-.999.58l-5.116 1.395a.75.75 0 01-.92-.921l1.395-5.116a2.25 2.25 0 01.58-.999L13.938 5zm1.56 6c.293 0 .58.024.86.072l.174.716a2 2 0 002.413 1.475l.098-.026.601-.179c.363.467.653.997.854 1.57l-.447.43a2 2 0 00-.17 2.7l.142.156.475.457c-.2.574-.49 1.103-.853 1.57l-.602-.178a2 2 0 00-2.485 1.351l-.026.098-.173.716a5.168 5.168 0 01-1.723 0l-.172-.716a2 2 0 00-2.413-1.475l-.098.026-.602.178a5.546 5.546 0 01-.853-1.57l.447-.43a2 2 0 00.055-2.828l-.055-.054-.447-.43c.2-.574.491-1.103.853-1.57l.602.178a2 2 0 002.485-1.351l.026-.098.172-.716c.28-.047.569-.072.862-.072zm0 4c-.8 0-1.45.672-1.45 1.5S14.7 18 15.5 18c.8 0 1.45-.672 1.45-1.5S16.3 15 15.5 15zm5.53-12.03a3.578 3.578 0 010 5.06l-.97.97L15 3.94l.97-.97a3.578 3.578 0 015.06 0z"
        fill="#969696"
      />
    </svg>
  )
}
