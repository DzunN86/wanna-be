import { IQueryComponent, IQueryComponentProps } from './qform'
import { IQLFilter, IQLTable, IQueryList } from './list'
import { DBDefinitions, ILayout, ILayoutColumns } from './aautil'
import { db } from 'db'
type DBTables = any

/** TYPE SEPARATOR - DO NOT DELETE THIS COMMENT **/
type AdminTyper<T> = {
  [K in keyof T]: {
    table: K
    list?: {
      table?: {
        swipeout?:
          | false
          | ((
              row: T[K],
              comps: {
                Delete: React.FC
                Swipe: React.FC<
                  Partial<{
                    delete: boolean
                    color: string
                    close: boolean
                    overswipe: boolean
                    confirmText: string
                    onClick: () => void
                  }>
                >
              }
            ) => React.ReactElement)
        where?: Parameters<
          typeof db[IQueryComponentProps['table']]['findFirst']
        >[0]['where']
        columns?: ILayoutColumns<T[K], keyof T[K]>
      }
    }
    form?: {
      layout?: ILayout<T[K], keyof T[K]>
    }
  }
}[keyof T]

export type IAdminSingle = {
  label?: string
  list?: Omit<IAdminCMSList, 'table'>
  form?: Partial<IQueryComponentProps> & {
    create?:
      | false
      | {
          title?: string
          onClick?: (data, event) => void
        }
    edit?: {
      onClick?: (data, event) => void
    }
    onSave?: (props: {
      data: any
      save: (data: any) => Promise<any>
    }) => Promise<void>
  }
} & AdminTyper<DBDefinitions>

interface IAdminCMSList {
  wrapper?: ({ children, list }) => React.ReactElement
  params?: Pick<IQueryList, 'params'>
  table?: IQLTable
  filter?: IQLFilter
  props?: IQueryList
}

interface IAdminCMS {
  active?: string
  setActive?: (v: string) => void
  nav?: string[]
  platform?: 'web' | 'mobile'
  mobile?: {
    zIndex?: number
  }
  content?: Record<string, IAdminSingle | (() => any)>
}

export type admin = IAdminCMS
