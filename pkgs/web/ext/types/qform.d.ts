import { DBDefinitions, ILayout } from './aautil'
import { db } from 'db'
import type { IFilterDef } from './list'
type DBTables = keyof typeof db

/** TYPE SEPARATOR - DO NOT DELETE THIS COMMENT **/

export type IFieldType =
  | 'text'
  | 'string'
  | 'json'
  | 'array'
  | 'boolean'
  | 'number'
  | 'date'
  | 'relation'
  | 'phone'
  | 'select'
  | 'info'
  | 'password'
  | 'loading'
  | 'map'
  | 'rich'
  | 'money'
  | 'file'
  | 'multiline'
  | 'belongs-to'
  | 'has-many'

type QFormTyper<T> = {
  [K in keyof T]: {
    table: string
    layout: ILayout<T[K], keyof T[K]>
    alter?: Partial<
      Record<
        keyof T[K] | '*' | string,
        {
          type?: IFieldType
          required?: boolean
        } & Record<string, any>
      >
    >
    onSave?: (props: {
      data: T[K]
      def: any
      saving: (status: boolean) => void
      setError: (value: any) => void
      save: (data: T[K]) => Promise<boolean>
    }) => Promise<void>
  }
}[keyof T]

type IQueryComponentProps = QFormTyper<DBDefinitions> & {
  include?: any
  platform?: 'web' | 'mobile'
  title?: string
  className?: string
  onBack?: (data: any) => void
  action?: {
    custom?: any[]
    jsonEdit?: boolean
    delete?: boolean
    save?: boolean
  }
  where?: any
  original?: any
  children?: any
  // alter?: IFieldAlterer
  // children?: IFormChildren<
  //   IFormChildrenProps & {
  //     Header: () => any
  //     db: typeof dbAll[J][K]
  //     reset: () => Promise<void>
  //     save: () => Promise<void>
  //     forceRender: () => void
  //     setData: (data: any) => void
  //   }
  // >
  loadingComponent?: React.ReactElement
  mode?: 'section' | 'tab'
  showDelete?: boolean
  onChange?: (
    val: any,
    opt: { pk: string; changedKey: string; saving: (status: boolean) => void }
  ) => void
  setUnsaved?: (val: boolean) => void
  data?: Record<string, any>
  onLoad?: (
    val: any,
    opt: { pk: string; def: IFilterDef | null; mutation: 'create' | 'update' },
    doneSaving?: boolean
  ) => Promise<void>
  submit?: () => void
  header?:
    | boolean
    | { title?: any }
    | ((props: {
        save: () => Promise<void>
        status: string
      }) => React.ReactElement)
  footer?: (props: {
    save: () => Promise<void>
    status: string
  }) => React.ReactElement
}

export type IQueryComponent = (props: IQueryComponentProps) => any
export type qform = IQueryComponentProps
