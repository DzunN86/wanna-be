import { parse } from '@babel/parser'
import generate from '@babel/generator'
import {
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  Node,
  ReturnStatement,
} from '@babel/types'
import { dirs } from 'boot'
import { build, transform } from 'esbuild'
import { ensureDir, pathExists, readFile, writeFile } from 'fs-extra'
import { join } from 'path'
import { CustomGlobal } from '../server'
import { CMS } from './main'
import { serverFormatCode } from '../utils'
import { transformAsync } from '@babel/core'
export type IComponent = {
  name: string
  path: string
  type: 'import' | 'identifier' | 'require'
  fallback: string | { c: string; s: string; h: string }
  code?: string
  wrapperCode?: string
  cached?: string
}
const escape = (str: any) => str
const unescape = (str: any) => str

declare const global: CustomGlobal

export const listComponent = async (
  withInfo = false
): Promise<
  IComponent[] | { result: IComponent[]; source: string; exportDefault: Node }
> => {
  const source = await readFile(
    join(dirs.app.web, 'src', 'external.tsx'),
    'utf-8'
  )
  const node = parse(source, {
    sourceType: 'module',
    plugins: ['jsx'],
  })

  const result: IComponent[] = []

  let exportDefault = null
  for (const b of node.program.body) {
    if (b.type === 'ExportDefaultDeclaration') {
      exportDefault = b
      if (b.declaration.type === 'ObjectExpression') {
        for (let d of b.declaration.properties) {
          if (d.type === 'ObjectProperty') {
            let key = ''
            if (d.key.type === 'Identifier') {
              key = d.key.name
            } else if (d.key.type === 'StringLiteral') {
              key = d.key.value
            }
            if (d.value.type === 'Identifier') {
              result.push({
                name: key,
                path: d.value.name,
                type: 'identifier',
                fallback: '',
              })
              continue
            }

            if (d.value.type === 'ArrowFunctionExpression') {
              const b = d.value.body
              if (
                b.type === 'CallExpression' &&
                b.callee.type === 'Import' &&
                b.arguments.length === 1 &&
                b.arguments[0].type === 'StringLiteral'
              ) {
                result.push({
                  name: key,
                  path: b.arguments[0].value,
                  type: 'import',
                  fallback: '',
                })
              } else if (
                b.type === 'ArrayExpression' &&
                b.elements.length > 0
              ) {
                let type = ''
                let imname = ''
                let fallback = ''
                if (
                  b.elements[0].type === 'MemberExpression' &&
                  b.elements[0].object.type === 'CallExpression'
                ) {
                  const o = b.elements[0].object
                  if (o.callee.type === 'Identifier') {
                    if (o.callee.name === 'require') {
                      if (o.arguments.length === 1) {
                        const n = o.arguments[0]
                        if (n.type === 'StringLiteral') {
                          type = 'require'
                          imname = n.value
                        }
                      }
                    }
                  }
                } else if (
                  b.elements[0].type === 'CallExpression' &&
                  b.elements[0].callee.type === 'Import' &&
                  b.elements[0].arguments.length === 1 &&
                  b.elements[0].arguments[0].type === 'StringLiteral'
                ) {
                  imname = b.elements[0].arguments[0].value
                  type = 'import'
                }

                const item = {
                  name: key,
                  type: type as any,
                  path: imname,
                  fallback: { c: '', s: '', h: '' },
                }
                if (b.elements.length > 1) {
                  eval(`item.fallback = ${generate(b.elements[1]).code}`)
                }
                result.push(item)
              }
            }
          }
        }
      }
    }
  }

  if (!withInfo) {
    return result
  }

  return { result, source, exportDefault }
}

export const loadComponent = async (
  opt: Partial<IComponent>
): Promise<IComponent> => {
  let path = opt.path
  if (opt.path[0] === '.') {
    path = join(dirs.app.web, 'src', opt.path)
  }
  if (opt.path.indexOf('/app') === 0) {
    path = join(dirs.root, opt.path)
  }

  let file = path + '.tsx'
  try {
    file = (await esbuildResolve(path)) as string
  } catch (e) {}

  const wrapperCode = await readFile(file, 'utf-8')

  try {
    const result = await parseBabel(wrapperCode)

    return {
      ...opt,
      ...result,
    }
  } catch (e) {
    return {
      ...opt,
      wrapperCode,
      code: '',
    } as any
  }
}

const parseBabel = async (raw: string) => {
  const node = parse(raw, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  })

  const extractVars = {}
  const detectReturn = async (ret: ReturnStatement, hook: Node | undefined) => {
    const arg = ret.argument

    const getWrapper = (ret: Node, hook: Node) => {
      const s = (start: number, end: number) => {
        return raw.substr(start, end - start)
      }
      const extracted = Object.keys(extractVars)
        .filter((e) => {
          return (
            [
              'jsx',
              'css',
              'useComponent',
              'observer',
              'useLocalObserver',
            ].indexOf(e) < 0
          )
        })
        .join(',\n')

      if (hook) {
        return `${s(
          0,
          hook.start
        )}const _component = useComponent({${extracted}});${s(
          hook.end,
          ret.start
        )}return eval(_component.render);${s(ret.end, raw.length)}`
      } else {
        return `${s(
          0,
          ret.start
        )}const _component = useComponent({${extracted}});\nreturn eval(_component.render);${s(
          ret.end,
          raw.length
        )}`
      }
    }

    const getHook = (
      hook: Node
    ): null | {
      name: string
      file: string
      vars: string[]
    } => {
      if (hook.type === 'VariableDeclaration') {
        for (let d of hook.declarations) {
          if (
            d.type === 'VariableDeclarator' &&
            d.init.type === 'CallExpression' &&
            d.init.arguments.length === 3
          ) {
            const a = d.init.arguments
            if (
              a[0].type === 'StringLiteral' &&
              a[1].type === 'StringLiteral' &&
              a[2].type === 'ObjectExpression'
            ) {
              return {
                name: a[0].value,
                file: a[1].value,
                vars: a[2].properties.map((e) => {
                  if (
                    e.type === 'ObjectProperty' &&
                    e.key.type === 'Identifier'
                  ) {
                    return e.key.name
                  }
                  return ''
                }),
              }
            }
          }
        }
      }
      return null
    }

    let code = ''
    let vars = {}
    if (arg.type.toLowerCase().indexOf('jsx') >= 0) {
      code = raw.substr(arg.start, arg.end - arg.start)
    } else if (arg.type === 'CallExpression') {
      if (arg.callee.type === 'Identifier') {
        if (arg.callee.name === 'eval') {
          const erg = arg.arguments[0]
          if (erg.type === 'MemberExpression') {
            if (
              erg.object.type === 'Identifier' &&
              erg.property.type === 'Identifier'
            ) {
              if (
                erg.object.name === '_component' &&
                erg.property.name === 'render'
              ) {
                const hookResult = getHook(hook)

                if (hookResult) {
                  let path = hookResult.file
                  if (hookResult.file[0] === '.') {
                    path = join(dirs.app.web, 'src', hookResult.file)
                  } else if (hookResult.file[0] === '/') {
                    path = join(dirs.root, hookResult.file)
                  }
                  for (let i of hookResult.vars) {
                    extractVars[i] = true
                  }

                  const file = (await esbuildResolve(path)) as string
                  const fpath = file.substr(0, file.length - 4) + '.html'
                  if (await pathExists(fpath)) {
                    code = await readFile(fpath, 'utf-8')
                  }
                }
              }
            }
          }
        }
      }
    } else {
      code = raw.substr(arg.start, arg.end - arg.start)
    }

    let wrapperCode = getWrapper(ret, hook)
    return {
      code,
      wrapperCode,
    }
  }

  const resolveDeclaration = async (
    d:
      | ExportDefaultDeclaration['declaration']
      | ExportNamedDeclaration['declaration']
      | { type: 'Identifier'; name: string }
  ) => {
    switch (d.type) {
      case 'CallExpression':
        if (d.arguments.length >= 0) {
          return resolveDeclaration(d.arguments[0] as any)
        }
        break
      case 'ArrowFunctionExpression':
        if (d.body.type === 'BlockStatement') {
          const body = d.body.body
          if (body) {
            const res = { ret: null, hook: null }
            for (let b of body) {
              if (b.type === 'ReturnStatement') {
                res.ret = b
              } else if (b.type === 'VariableDeclaration') {
                for (let d of b.declarations) {
                  if (d.id.type === 'Identifier') {
                    if (d.id.name === '_component') {
                      res.hook = b
                    } else {
                      extractVars[d.id.name] = true
                    }
                  }
                }
              }
            }
            if (res.ret) {
              const ret = await detectReturn(res.ret, res.hook)
              return {
                code: ret.code,
                wrapperCode: ret.wrapperCode,
              }
            }
          }
        }
        break
      case 'Identifier':
        if (declarations[d.name]) {
          return await resolveDeclaration(declarations[d.name])
        } else if (imports[d.name]) {
          return {
            code: '',
            wrapperCode: raw,
          }
        }
        break
      case 'VariableDeclaration':
        for (let e of d.declarations) {
          if (e.type === 'VariableDeclarator' && e.id.type === 'Identifier') {
            declarations[e.id.name] = e.init
          }
        }
        break
    }
  }

  let externalComponentFound = false
  let importPos = 0
  let exportDefaultDeclaration = null
  const declarations = {}
  const imports = {}
  for (const b of node.program.body) {
    if (b.type === 'ImportDeclaration') {
      if (importPos === 0) importPos = b.end
      for (let s of b.specifiers) {
        if (s.type === 'ImportSpecifier') {
          if (s.imported.type === 'Identifier') {
            if (s.imported.name === 'useComponent') {
              if (b.source.type === 'StringLiteral') {
                if (b.source.value === 'web.utils/component') {
                  externalComponentFound = true
                }
              }
            } else {
              if (
                b.source.type === 'StringLiteral' &&
                b.importKind !== 'type'
              ) {
                imports[s.imported.name] = b.source.value
                extractVars[s.imported.name] = true
              }
            }
          }
        } else if (s.type === 'ImportDefaultSpecifier') {
          if (s.local.type === 'Identifier') {
            imports[s.local.name] = b.source.value
            extractVars[s.local.name] = true
          }
        }
      }
    } else if (b.type === 'ExportDefaultDeclaration') {
      if (b.declaration) {
        exportDefaultDeclaration = b.declaration
      }
    } else {
      switch (b.type) {
        case 'ExportNamedDeclaration':
          await resolveDeclaration(b.declaration)
          break
        case 'VariableDeclaration':
          await resolveDeclaration(b)
          break
      }
    }
  }

  if (exportDefaultDeclaration) {
    const result = await resolveDeclaration(exportDefaultDeclaration)

    if (!result || result.wrapperCode === raw) {
      return {
        code: '',
        wrapperCode: raw,
      }
    }

    if (!externalComponentFound) {
      result.wrapperCode =
        result.wrapperCode.substr(0, importPos) +
        `\nimport { useComponent } from 'web.utils/component'` +
        result.wrapperCode.substr(importPos)
    }

    return result
  }

  return {
    code: '',
    wrapperCode: '',
  }
}

export const deleteComponent = async (name: string) => {
  const list = await listComponent(true)
  if (!Array.isArray(list)) {
    const s = (start: number, end: number) => {
      return list.source.substr(start, end - start)
    }

    for (let [i, v] of Object.entries(list.result)) {
      if (v.name === name) {
        list.result.splice(parseInt(i), 1)
      }
    }

    const newsource = `${s(0, list.exportDefault.start)}export default {
${list.result
  .map((e) => {
    if (e.type === 'import') {
      return `${JSON.stringify(e.name)}: () => import(${JSON.stringify(
        e.path
      )})`
    } else if (e.type === 'identifier') {
      return `${JSON.stringify(e.name)}: ${e.path}`
    }
  })
  .join(',\n  ')}
}${s(list.exportDefault.end, list.source.length)}`

    await writeFile(join(dirs.app.web, 'src', 'external.tsx'), newsource)
  }
}

interface ISaveComponent {
  oldName?: string
  isNew?: boolean
  name: string
  path: string
  fallback?: string
  type?: 'import' | 'require'
  code: string
  wrapperCode: string
  wrapperChanged: boolean
}
export const saveComponent = (opt: ISaveComponent) => {
  return new Promise<any>(async (resolve) => {
    let force = false
    if (opt.name && opt.path && opt.wrapperCode) {
      if (opt.isNew) {
        await ensureDir(join(dirs.app.web, 'src', 'components'))
      }

      if (opt.path.endsWith('.html')) {
        opt.path = opt.path.substr(0, opt.path.length - 5)
      }

      if (opt.path.endsWith('.tsx')) {
        opt.path = opt.path.substr(0, opt.path.length - 4)
      }

      let path = opt.path
      if (opt.path[0] === '.') {
        path = join(dirs.app.web, 'src', opt.path)
      }

      if (opt.path.indexOf('/app') === 0) {
        path = join(dirs.root, opt.path)
      }

      let file = path + '.tsx'
      try {
        file = (await esbuildResolve(path)) as string
      } catch (e) {}

      const htmlpath = file.substr(0, file.length - 4) + '.html'

      if (!(await pathExists(htmlpath))) {
        force = true
      }

      if (!global.componentRefresh) {
        global.componentRefresh = {}
      }

      if (!opt.wrapperChanged && (await pathExists(htmlpath))) {
        global.componentRefresh[file] = true
      } else {
        delete global.componentRefresh[file]
        let cpath = file.substr(join(dirs.root).length).replace(/\\/gi, '/')
        if (cpath.endsWith('.tsx')) {
          cpath = cpath.substr(0, cpath.length - 4)
        }

        const result = opt.wrapperCode.replace(
          'const _component = useComponent({',
          `const _component = useComponent(${JSON.stringify(
            opt.name
          )},${JSON.stringify(cpath)},{`
        )

        await writeFile(file, result)
      }

      if (opt.code) {
        await writeFile(htmlpath, opt.code)
      }

      if (opt.oldName || opt.isNew) {
        const list = await listComponent(true)
        if (!Array.isArray(list)) {
          if (opt.oldName) {
            for (let i of list.result) {
              if (i.name === opt.oldName) {
                i.name = opt.name
              }
            }
          } else if (opt.isNew) {
            list.result.push({
              name: opt.name,
              path: opt.path,
              type: 'import',
              fallback: '',
            })
          }
          await saveExternal(list)
        }
      } else {
        const list = await listComponent(true)
        let changed = false
        if (opt.type && opt.fallback) {
          if (!Array.isArray(list)) {
            for (let i of list.result) {
              if (i.name === opt.name) {
                if (i.type !== opt.type || i.fallback !== opt.fallback) {
                  changed = true
                  i.type = opt.type
                  i.fallback = opt.fallback
                }
              }
            }

            if (changed) {
              await saveExternal(list)
            }
          }
        }
      }

      resolve({ status: 'ok', force })
    }

    resolve({
      status: 'failed',
    })
  })
}

const formatFallback = (e) => {
  return `{c: ${JSON.stringify(e.c || '')}, s: ${JSON.stringify(
    e.s || ''
  )}, h: ${JSON.stringify(e.h || '')}}`
}

export const saveExternal = async (list) => {
  const s = (start: number, end: number) => {
    return list.source.substr(start, end - start)
  }
  const defaultFallback = JSON.stringify({ c: '', s: '', h: '' })
  let newsource = `${s(0, list.exportDefault.start)}export default {
  ${list.result
    .map((e) => {
      if (e.type === 'import') {
        return `${JSON.stringify(e.name)}: () => [import(${JSON.stringify(
          e.path
        )}), ${formatFallback(e.fallback || defaultFallback)}]`
      } else if (e.type === 'require') {
        return `${JSON.stringify(e.name)}: () => [require(${JSON.stringify(
          e.path
        )}).default, ${formatFallback(e.fallback || defaultFallback)}]`
      } else if (e.type === 'identifier') {
        return `${JSON.stringify(e.name)}: ${e.path}`
      }
    })
    .join(',\n  ')}
}${s(list.exportDefault.end, list.source.length)}`

  newsource = serverFormatCode(newsource)

  await writeFile(join(dirs.app.web, 'src', 'external.tsx'), newsource)
}

export const renderComponent = async (code: string) => {
  let final = { code }

  try {
    const unescapedCode = unescape(code).replace(/<!--([\s\S])*?-->/g, '')
    final = await transform(`<>${unescapedCode}</>`, {
      jsxFactory: 'h',
      jsxFragment: 'fragment',
      loader: 'tsx',
    })
  } catch (e) {
    console.log(e, code)
  }
  const unformatedCode = `
const ccx_component = () => {
  const __render__ = ${CMS.cms_func_args} => { 
    return ${final.code};
  }
  const [_, setRender] = useState({})

  let result = {
    page: jsx('fragment', null, null),
    effects: new Set(),
  }
  try {
    result = window.renderCMS(
      __render__, 
      typeof meta === 'undefined' ? {} : meta,
      { 
        defer: false, 
        type: 'component',
        params
      }
    )

  } catch (e) {
    console.error(__render__, e)
    result = {
      page: jsx('pre', {className:"p-4 text-red-500"},e + ''),
      effects: new Set(),
    }
  }

  if (result) { 
    if (result.loading) {
      result.loading().then(() => setRender({}))
    }
    return result.page;
  }
  return () => jsx('pre', {className:"p-4 text-red-500"},'Render Failed')
}`

  if (global.mode === 'prod') {
    const minifiedCode = await transformAsync(unformatedCode, {
      presets: [
        [
          'minify',
          {
            mangle: false,
            keepFnName: true,
          },
        ],
      ],
      comments: false,
    })
    return minifiedCode.code
  }
  return serverFormatCode(unformatedCode)
}

/**
 * Resolves a module using esbuild module resolution
 *
 * @param {string} id Module to resolve
 * @param {string} [resolveDir] The directory to resolve from
 * @returns {string} The resolved module
 */
export async function esbuildResolve(id, resolveDir = process.cwd()) {
  let _resolve
  const resolvedPromise = new Promise((resolve) => (_resolve = resolve))
  return Promise.race([
    resolvedPromise,
    build({
      sourcemap: false,
      write: false,
      bundle: true,
      format: 'esm',
      logLevel: 'silent',
      platform: 'browser',
      stdin: {
        contents: `import ${JSON.stringify(id)}`,
        loader: 'js',
        resolveDir,
        sourcefile: __filename,
      },
      plugins: [
        {
          name: 'esbuildResolve',
          setup(build) {
            build.onLoad({ filter: /.*/ }, ({ path }) => {
              id = path
              _resolve(id)
              return { contents: '' }
            })
          },
        },
      ],
    }).then(() => id),
  ])
}
