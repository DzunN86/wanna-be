type DBDefinitions = {
  coba: {
    id: number
    a: number
    test: Array<DBDefinitions['test']>
  }
  test: {
    id: number
    id_coba: number
    name: string
    coba: DBDefinitions['coba']
  }
}
import { db } from 'db'
import { IColumnDetail } from './list'
type DBTables = 'coba' | 'test'

/** TYPE SEPARATOR - DO NOT DELETE THIS COMMENT **/
type ExcludeDollar<T extends string> = T extends `$${string}` ? never : T

type DrillDown<K, T extends string> = K extends string ? `${T}.${K}` : never
type DrillDownArray<K, T extends string> = K extends string
  ? `${T}.0.${K}`
  : never

type Drill<TABLE, COL extends keyof TABLE> = COL extends keyof DBDefinitions
  ? TABLE[COL] extends Array<infer K>
    ? `${COL}.0` | DrillDownArray<keyof K, COL>
    : DrillDown<keyof DBDefinitions[COL], COL>
  : never

type DrillDeeper<
  TABLE,
  COL extends keyof TABLE,
  PARENT extends string
> = COL extends keyof DBDefinitions
  ? TABLE[COL] extends Array<infer K>
    ? `${PARENT}.${COL}.0` | DrillDownArray<keyof K, `${PARENT}.${COL}`>
    : DrillDown<keyof DBDefinitions[COL], `${PARENT}.${COL}`>
  : never

type ColAndRels<TABLE, COL extends keyof TABLE> =
  | COL
  | Drill<TABLE, COL>
  | (COL extends string
      ? TABLE[COL] extends Array<infer K>
        ? DrillDeeper<K, keyof K, `${COL}.0`>
        : DrillDeeper<TABLE[COL], keyof TABLE[COL], COL>
      : never)

export type ILayout<TABLE, COL extends keyof TABLE> = Array<
  | string
  | React.ReactElement
  | ((args?: ILayoutFuncArgs<TABLE, COL>) => React.ReactElement | string)
  | ILayout<TABLE, COL>
>

export type ILayoutFuncArgs<TABLE, COL extends keyof TABLE> = {
  row: TABLE
  update: (data: TABLE) => void
  watch: (fields: Array<ColAndRels<TABLE, COL>>) => void
}

export type ILayoutColumns<TABLE, COL extends keyof TABLE> =
  | Array<ColAndRels<TABLE, COL> | [ColAndRels<TABLE, COL>, IColumnDetail]>
  | (({row: TABLE, key: number}) => React.ReactElement)
