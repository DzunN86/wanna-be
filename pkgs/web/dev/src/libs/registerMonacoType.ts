import { extendExternals } from 'web.init/src/mobile/mobile-ext'
import { api } from 'web.utils/src/api'
import type { BaseWindow } from '../../../init/src/window'

declare const window: BaseWindow
export const registerMonacoType = async (monaco) => {
  monaco.isTypeRegistered = true
  const ts = {
    db: await api('/__data/db.d.ts', undefined, { raw: true }),
    react: await api('__data/react.d.ts', undefined, { raw: true }),
    types: await api('__data/types', undefined),
    global: await api('__data/global', undefined),
  }

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
    // isolatedModules: true,
    // noLib: true,
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
  })

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  })

  const dbTypeDefs = await api(
    '/__data',
    {
      action: 'typedef',
      db: 'main',
    },
    {
      method: 'POST',
      raw: true,
    }
  )

  ts.react = `\
${dbTypeDefs}

${Object.values(ts.types).join('\n')} 

${ts.react}
`
  const types = Object.keys(ts.types)
  ts.react = ts.react.replace(
    `interface IntrinsicElements {`,
    `\
      interface IntrinsicElements {
        ${types
          .map((e) => {
            return `"${e}":${e}`
          })
          .join('\n       ')}
        ${Object.keys({ ...window.cms_components, ...extendExternals() })
          .map((e) => {
            if (types.indexOf(e) >= 0) return null

            return `"${e}":any`
          })
          .filter((e) => e)
          .join('\n       ')}
`
  )

  ts.react = ts.react.replace(
    /style\?\:\sCSSProperties\;/gi,
    'style?: CSSProperties | string;'
  )

  ts.react = ts.react.replace(
    /className\?\: string\;/gi,
    'className?: string;class?: string;'
  )
  ts.react = ts.react.replace(
    /style\?\:\sCSSProperties\;/gi,
    'style?: CSSProperties | string;'
  )

  ts.react =
    ts.react +
    `
declare global {
  ${ts.global
    .map((e) => {
      return `const ${e}:any`
    })
    .join('\n')}
}
`

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    ts.react,
    `file:///node_modules/@react/types/index.d.ts`
  )

  const prismaDefs = `\ 
      const children: React.ReactElement

      declare module prisma {
        ${ts.db}
      }

      type NonFunctionPropertyNames<T> = {
        [K in keyof T]: T[K] extends Function ? never : K;
      }[keyof T];
      type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;
      const db:NonFunctionProperties<prisma.PrismaClient>;
      const dbAll = { main: db }
      type Server = {
        template: any;
        params: any;
        render: any;
        req: any;
        reply: any;
        user: any;
        log: any;
        ext: any;
        isDev: boolean;
        db:NonFunctionProperties<prisma.PrismaClient>;
        api: (
          url: string,
          body?: any,
          opt?: { method?: 'GET' | 'POST'; raw?: boolean }
        ) => Promise<any>
      }

      const action: (func:() => void) =>void
      const runInAction: (func:() => void) =>void
      const api:  (
        url: string,
        body?: any,
        opt?: { method?: 'GET' | 'POST'; raw?: boolean }
      ) => Promise<any>
      const params: any
      const user: any
      const navigate: (href: string, opt?: any) => Promise<void>
    `
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    prismaDefs,
    'file:///node_modules/db.d.ts'
  )
}
