/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Icon, Label, Modal, PrimaryButton, SearchBox } from '@fluentui/react'
import { action } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { Fragment, useEffect } from 'react'
import { FileManagerList } from 'web.form/fields/FileManagerList'
import { Loading } from 'web.form/fields/Loading'
import { initFluent } from 'web.init/src/web/initFluent'
import { api } from 'web.utils/src/api'
import { formatDate } from 'web.utils/src/formatDate'

export interface IFile {
  name: string
  path: string
  size?: number
  date?: string
}

export interface IFileManager {
  onDismiss?: () => void
  onSelect?: (e: IFile) => void
  UploadComponent?: React.FC<{ onUpload }>
  dirs?: (dir: string) => Promise<{ dirs: IFile[]; files: IFile[] }>
}

export const FileManager = observer((props: IFileManager) => {
  const meta = useLocalObservable(() => ({
    selected: [] as any[],
    dirs: [] as IFile[],
    files: [] as IFile[],
    filter: '',
    currentPath: '/',
    breadcrumbs: [] as string[],
    init: false,
  }))
  useEffect(() => {
    initFluent().then(
      action(() => {
        meta.init = true
      })
    )
  }, [])
  const reloadPath = action((path: string) => {
    const split = path.split('/').filter((e) => e)
    meta.breadcrumbs = ['/', ...split]
    meta.currentPath = split.join('/')

    const callback = action((e) => {
      if (e) {
        meta.files = e.files
        meta.dirs = e.dirs
      }
    })
    if (props.dirs) {
      props.dirs(meta.currentPath).then(callback)
    } else {
      api(`/__upload/dirs/${meta.currentPath}`).then(callback)
    }
  })

  useEffect(() => {
    reloadPath('/')
  }, [])

  if (!meta.init) return null

  const Upload = props.UploadComponent ? props.UploadComponent : UploadComponent

  const onSelected = action((e) => {
    meta.selected = [e]
  })

  return (
    <Modal
      isOpen={true}
      styles={{
        layer: {
          zIndex: 20000000,
        },
      }}
      onDismiss={props.onDismiss}
      isBlocking={false}
    >
      <div
        css={css`
          width: 90vw;
          height: 90vh;
        `}
        className="flex flex-row justify-between"
      >
        {meta.dirs.length > 0 && (
          <div
            css={css`
              min-width: 200px;
            `}
            className="flex select-none flex-col border-gray-300 border-r"
          >
            <Label className="py-3 px-1 opacity-75 flex items-center">
              <Icon iconName="Folder" className="pr-1" />
              Folders
            </Label>
            <div className="flex-1 relative  overflow-auto">
              <div className="absolute pl-1 pr-1 w-full">
                <div css={css``} className=" flex flex-col items-stretch">
                  {meta.dirs.map((e, key) => {
                    return (
                      <Label
                        onClick={() => {
                          reloadPath(e.path)
                        }}
                        key={key}
                        className={
                          'cursor-pointer hover:bg-blue-100 border-blue-100 mb-1 py-1 px-2 rounded-md border ' +
                          (meta.currentPath === e.path ||
                          `/${meta.currentPath}` === e.path
                            ? 'bg-blue-100'
                            : '')
                        }
                      >
                        {e.name}
                      </Label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col flex-1">
          <div className="px-1 py-1 justify-between flex flex-row items-center border-b border-gray-300">
            <div className="flex flex-row items-center">
              {meta.breadcrumbs.map((e, key) => {
                return (
                  <Fragment key={key}>
                    <Label
                      className="px-1 rounded-sm cursor-pointer  border-white hover:border-blue-400 hover:bg-blue-100 border-b-2"
                      onClick={() => {
                        const path: string[] = []
                        for (let i = 0; i <= key; i++) {
                          path.push(meta.breadcrumbs[i])
                        }
                        reloadPath('/' + path.join('/'))
                      }}
                    >
                      {key === 0 ? (
                        <Icon
                          iconName="Home"
                          className="rounded-sm"
                          css={css`
                            width: 25px;
                            text-align: center;
                            font-weight: bold;
                            font-size: 14px;
                          `}
                        />
                      ) : (
                        e
                      )}
                    </Label>
                    {key !== meta.breadcrumbs.length - 1 && (
                      <Icon
                        iconName="ChevronRight"
                        css={css`
                          font-size: 18px;
                          opacity: 0.5;
                        `}
                      />
                    )}
                  </Fragment>
                )
              })}
            </div>
            <SearchBox
              value={meta.filter}
              onChange={action((e, text) => {
                if (text) meta.filter = text
              })}
              placeholder="Filter..."
              iconProps={{ iconName: 'Filter' }}
              disableAnimation
            />
          </div>
          <div className="flex-1 flex flex-row justify-between">
            <div
              className="relative overflow-auto"
              data-is-scrollable="true"
              css={css`
                width: 70%;
              `}
            >
              <div
                className="absolute pl-3"
                css={css`
                  width: 100%;
                `}
              >
                <div
                  css={css`
                    width: 100%;
                    height: 80vh;
                  `}
                >
                  {meta.files.length === 0 ? (
                    <Loading />
                  ) : (
                    <FileManagerList
                      datas={meta.files}
                      fixPath={fixPath}
                      selected={meta.selected}
                      onSelected={onSelected}
                    />
                  )}
                </div>
              </div>
            </div>
            <div
              css={css`
                width: 30%;
              `}
            >
              {meta.selected.length > 0 ? (
                <Selected
                  unselect={action(() => {
                    meta.selected = []
                  })}
                  select={action(() => {
                    if (props.onSelect) {
                      props.onSelect(meta.selected[0])
                    }
                    meta.selected = []
                  })}
                  item={meta.selected[0]}
                />
              ) : (
                <Upload onUpload={() => {}} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
})

export default FileManager

const UploadComponent = ({ onUpload }) => {
  return (
    <Label
      className="rounded-lg flex items-center justify-center text-center"
      css={css`
        margin: 5px;
        height: 50%;
        border: 2px dashed #a2c7ff;
      `}
    >
      Please select
      <br /> file on the left
    </Label>
  )
}

const fixPath = (path: string, name: string, args?: string) => {
  if (path.indexOf('http') === 0) {
    return path
  }

  return join(['/upload/', path, name]) + (args ? args : '')
}

const Selected = ({ item, unselect, select }) => {
  const ext = item.name.split('.').pop()
  return (
    <div className="flex flex-col items-stretch py-1 px-2">
      <Label>{item.name}</Label>
      <a
        target="_blank"
        href={`${fixPath(item.path, item.name)}`}
        className="flex rounded-md cursor-pointer relative items-center justify-center flex-col py-2 overflow-hidden"
        css={css`
          height: 200px;
          width: 100%;
          background: #ececeb;
        `}
      >
        <FilePreview ext={ext} path={item.path} name={item.name} />
        <div className="py-2 text-xs opacity-50">Click to download</div>
      </a>

      <Label className="flex justify-between flex-row py-2">
        {item.size && <div>Size: {filesizeformat(item.size)}</div>}
        {item.date && <div>Date: {formatDate(item.date)}</div>}
      </Label>

      <div className="py-2 flex flex-col items-stretch">
        <PrimaryButton onClick={select}>Select this file</PrimaryButton>
        {/* <div className="italic self-center p-2">&mdash; Or &mdash;</div>
        <Label
          onClick={unselect}
          className="underline text-center cursor-pointer border border-gray-300 rounded-sm"
        >
          Upload file
        </Label> */}
      </div>
    </div>
  )
}

export const FilePreview = (props: {
  ext
  path
  name
  hideImage?: boolean
}) => {
  const { ext, path, name, hideImage } = props
  return !hideImage &&
    ['jpg', 'svg', 'jpeg', 'png', 'gif'].indexOf(ext) > -1 ? (
    <>
      <img
        className="select-none w-20 object-contain object-center rounded-lg"
        src={`${location.origin + fixPath(path, name)}`}
      />
    </>
  ) : (
    <img
      css={css`
        pointer-events: none;
        height: 70px;
      `}
      src={`/__ext/icons/${ext}.png`}
      onError={(e: any) => {
        e.target.attributes['src'].value = `/__ext/icons/txt.png`
      }}
      className="m-2"
    />
  )
}

const join = (arr: string[]): string => {
  return arr.join('/').replace(/\/+/g, '/').replace(/\/+$/, '')
}

const upload = async (files, directory = './') => {
  const formData = new FormData()

  for (let file of files) {
    formData.append('files', file)
  }

  formData.append('dir', directory)

  await fetch('/__upload', {
    method: 'POST',
    //   headers: { 'Content-Type': 'multipart/form-data' },
    body: formData,
  })
}

function filesizeformat(bytes, binary?, precision?) {
  /*
      Javascript filesizeformater.
      Inspired by jinja2 and some gists.
      @version 1.0.0
      @copyright 2014 Julian Hille
      @author Julian Hille
   */
  binary = typeof binary !== 'undefined' ? binary : false
  precision = typeof precision !== 'undefined' ? precision : 2
  var base = binary ? 1024 : 1000
  var prefixes = [
    binary ? 'KiB' : 'kB',
    binary ? 'MiB' : 'MB',
    binary ? 'GiB' : 'GB',
    binary ? 'TiB' : 'TB',
    binary ? 'PiB' : 'PB',
    binary ? 'EiB' : 'EB',
    binary ? 'ZiB' : 'ZB',
    binary ? 'YiB' : 'YB',
  ]
  if (!isFinite(bytes)) {
    return '- Bytes'
  } else if (bytes == 1) {
    return '1 Byte'
  } else if (bytes < base) {
    return bytes + ' Bytes'
  }
  var index = Math.floor(Math.log(bytes) / Math.log(base))
  return (
    parseFloat(
      (bytes / Math.pow(base, Math.floor(index))).toFixed(precision)
    ).toString() +
    ' ' +
    prefixes[index - 1]
  )
}
