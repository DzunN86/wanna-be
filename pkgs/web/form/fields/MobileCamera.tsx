/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Button, Progressbar } from 'framework7-react'
import { action, runInAction } from 'mobx'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { useEffect } from 'react'
import type { BaseWindow } from '../../init/src/window'
import type { FormInternal } from '../src/QueryForm'
import { FilePreview } from './FileManager'

declare const window: BaseWindow

const dataURItoBlob = (dataURI) => {
  // convert base64/URLEncoded data component to raw binary data held in a string
  let byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0)
      byteString = atob(dataURI.split(',')[1]);
  else
      byteString = unescape(dataURI.split(',')[1]);

  // separate out the mime component
  let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to a typed array
  let ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  const file = new File(
    [ia],
    `${getUuid()}.jpeg`,
    {
      type: mimeString,
      lastModified: new Date().getTime()
    }
  )
  return file;
}

export const MobileCamera = observer(
  (props: {
    name: string
    value: string
    internal?: FormInternal
    required?: boolean
    disabled?: boolean
    onChange: (v: string) => void
    errorMessage?: string
    info?: string
    errorMessageForce?: boolean
    label: string
    cameraProps?: any;
    hidePreview?: boolean;
  }) => {
    const meta = useLocalObservable(() => ({
      value: props.value,
      get isImage() {
        if (
          meta.value &&
          typeof meta.value === 'string' &&
          meta.value.match(/[^/]+(jpg|png|gif|jpeg|svg)$/)
        ) {
          return true
        }
        return false
      },
      get ext() {
        return this.value.split('.').pop()
      },
      get name() {
        return this.value.split('/').pop()
      },
      get path() {
        const a = this.value.split('/').filter((e) => e)
        a.pop()
        if (a[0] === 'upload') a.shift()

        return a.join('/')
      },
      loading: false,
      progress: 0,
    }))

    const getPhoto = async (props = {}) => {
      const image = await (window as any).capacitor.Camera.getPhoto({
        quality: 50,
        resultType: "dataUrl",
        ...props
      });
      // const imageFile = await uriToFile(image.path);
      const imageFile = dataURItoBlob(image.dataUrl);
      return {
        ...image,
        file: imageFile
      }
    }
    const onClick = async () => {
      const res = await getPhoto(props?.cameraProps);

      let directory = 'public'
      const int = props.internal
      if (int && int.table) {
        directory = `${int.table}/${props.name}`
      }
      const file = res.file;
      const url = `/upload/${directory}/${file.name}`
      const formData = new FormData()
      formData.append(directory, file)

      runInAction(() => {
        meta.loading = true
      })
      await request(
        '/__upload',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: formData,
        },
        action((event) => {
          const percent = (event.loaded / event.total) * 100
          meta.progress = percent
        })
      )

      runInAction(() => {
        meta.loading = false
        meta.value = url
        if (props.onChange) props.onChange(meta.value)
      })
    }

    useEffect(() => {
      runInAction(() => {
        meta.value = props.value
      })
    }, [props.value])

    const unggah = props.disabled ? null : (
      <div className=" relative flex-1">
        <Button onClick={onClick} fill className="capitalize" css={css`background-color: #E5E7EB; color: #374151; height: ${meta.value ? "auto" : "75px"}; border: 1px solid #D1D5DB;`}>
          {meta.value ? 'AMBIL FOTO BARU ↑' : 'AMBIL FOTO ↑'}
        </Button>
      </div>
    )

    return (
      <div className={` list ${props.required ? 'required' : ''} `}>
        <ul>
          <div className="item-content item-input">
            <div className="item-inner">
              <div className="item-title item-label">{props.label}</div>
              <div className="item-input-wrap ">
                {meta.loading ? (
                  <Progressbar progress={meta.progress} className="my-7" />
                ) : (
                  <>
                    {meta.value ? (
                      <div
                        className="flex flex-row my-1 flex-1 items-center"
                        css={css``}
                      >
                        {meta.value && (
                          <FilePreview
                            ext={meta.ext}
                            path={meta.path}
                            name={meta.name}
                            hideImage={props.hidePreview}
                          />
                        )}
                        <div className="flex space-y-2 flex-col flex-1 items-start justify-center ml-2">
                          <Button
                            onClick={() => {
                              if (
                                window.capacitor &&
                                window.capacitor.Browser
                              ) {
                                window.capacitor.Browser.open({
                                  windowName: "Base",
                                  url: location.origin + meta.value,
                                });
                              } else {
                                location.href = meta.value
                              }
                            }}
                            outline
                          >
                            Unduh file ↓
                          </Button>
                          {unggah}
                        </div>
                      </div>
                    ) : (
                      <div className="my-4">{unggah}</div>
                    )}
                  </>
                )}
                {props.info && (
                  <div className="item-input-info">{props.info}</div>
                )}
              </div>
            </div>
          </div>
        </ul>
      </div>
    )
  }
)

function request(
  url: string,
  opts: {
    method?: 'POST' | 'GET'
    headers?: any
    body?: Parameters<XMLHttpRequest['send']>[0]
  } = {},
  onProgress: XMLHttpRequest['upload']['onprogress']
) {
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest()
    xhr.open(opts.method || 'get', url, true)

    Object.keys(opts.headers || {}).forEach((headerKey) => {
      xhr.setRequestHeader(headerKey, opts.headers[headerKey])
    })

    xhr.onload = (e: any) => res(e.target.responseText)

    xhr.onerror = rej

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = onProgress // event.loaded / event.total * 100 ; //event.lengthComputable
    }

    xhr.send(opts.body)
  })
}
const getUuid = (a: string = ''): string =>
  a
    ? /* eslint-disable no-bitwise */
      ((Number(a) ^ (Math.random() * 16)) >> (Number(a) / 4)).toString(16)
    : `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, getUuid)
