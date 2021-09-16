import type parser from '@babel/parser'
import type traverse from '@babel/traverse'
import type { css, jsx } from '@emotion/react'
import type { View } from 'framework7/types'
import type { db, dbAll, waitUntil } from 'libs'
import type get from 'lodash.get'
import type set from 'lodash.set'
import type { action, runInAction, toJS } from 'mobx'
import type { observer, useLocalObservable } from 'mobx-react-lite'
import type React from 'react'
import type { Fragment, useEffect, useRef, useState } from 'react'
import type * as global from 'web-app/src/global'
import type { api } from 'web.utils/src/api'
import { loadExt } from 'web.utils/src/loadExt'
import type { renderCMS } from './core/gen-page'
export type SingleFallback = {
  c: string
  s: string
  h: string
}

declare type FigmaTab = 'page' | 'css' | 'code' | 'effect'

type ExcludeDollar<T extends string> = T extends `$${string}` ? never : T
export type BaseWindow = Window & {
  figmaEffectSaving: boolean
  figmaSaveCode: () => void
  figmaWS: any
  figmaJustSaved: () => void
  figmaCodeIsTyping: any
  figmaHtmlForCode: { html: string; page: string; frame: any; path: string }
  figmaSetMeta: (meta: (meta: any) => void) => void
  figmaImageCaches: Record<any, HTMLImageElement>

  /** module stuff */
  get: typeof get
  set: typeof set
  React: typeof React
  useState: typeof useState
  useEffect: typeof useEffect
  useRef: typeof useRef
  fragment: typeof Fragment
  toJS: typeof toJS
  runInAction: typeof runInAction
  action: typeof action
  jsx: typeof jsx
  css: typeof css
  observer: typeof observer
  useLocalObservable: typeof useLocalObservable
  Fallback: any
  loadExt: typeof loadExt
  secret: Uint8Array

  sql: (
    text: string[],
    ...args: any[]
  ) => string | [string, Record<string, any>]

  /** capacitor */
  capacitor?: Record<string, any>

  /** init stuff */
  showUpdateApp: () => void
  updateApp: () => void
  process: {
    env?: {
      MODE: 'development' | 'production'
    }
  }
  is_dev: boolean
  back: (url?: string) => Promise<void>
  navigate: (
    href: string,
    opt?: {
      animate?: boolean
      props?: { data: any }
    }
  ) => Promise<void>
  waitUntil: typeof waitUntil
  imported: Record<string, any>

  babel: {
    traverse?: typeof traverse
    parse?: typeof parser.parse
  }

  /** template stuff */
  cms_components: Record<
    string,
    {
      loaded: boolean
      loading: boolean
      load: () => [
        { default: React.FC<any> } | Promise<{ default: React.FC<any> }>,
        { c: string; s: string; h: string }
      ]
      template: { code: string; loading: boolean }
      instance?: React.FC<any>
      component: React.FC<any>
    }
  >
  cms_layouts: Record<
    string,
    { name: string; source: string; component: React.FC<any> }
  >
  cms_pages: Record<
    string,
    {
      id: string
      layout_id: string
      mobilePath?: string
      ssr: boolean
      source?: string
      component?: React.FC
    }
  >
  renderCMS: typeof renderCMS

  /** page stuff */
  cms_id: string
  cms_base_pack: Uint8Array
  cms_init: boolean

  db: Omit<typeof db, '$queryRaw'> & { query: (q: string) => Promise<any[]> }
  dbAll: typeof dbAll
  api: typeof api
  user: any
  platform: 'web' | 'mobile'
  build_id: string

  /** dev stuff */
  Buffer?: any
  devUnsaved?: boolean
  devFormatCode?: () => Promise<void>
  devIsComponentEditorOpen?: boolean

  /** web */
  webApp: {
    render: (href: string) => void
  }

  /** mobile */
  mobileApp: View.View
  mobileListHideInfo: boolean
  onback?: () => void
} & typeof global
