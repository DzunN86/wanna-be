import { BabelFileResult, transformAsync } from '@babel/core'
import { log } from 'boot'
import { matchesUA } from 'browserslist-useragent'
import type { CustomGlobal } from '../server'
import { serialize, serverFormatCode } from '../utils'
import { CMS, extractMeta } from './main'
declare const global: CustomGlobal

export const renderCPX = async (args: {
  page: any
  params: any
  finalCode: any
  childMeta: any
  layout_id: string
  page_id: string
}) => {
  const { params, page, finalCode, childMeta, layout_id, page_id } = args
  let unformatedCode = `\
  /** layout_id: ${layout_id} | page_id: ${page_id} **/
  ${
    params
      ? `\
  params = ${serialize(params)};
  updateParams(params);
  `
      : ``
  }
  cms_page = ${CMS.cms_func_args} => { 
    ${finalCode}
  }
  ${childMeta ? `cms_page.child_meta = ${childMeta}` : ''}
  ${page.layout_id ? `cms_page.layout_id = '${page.layout_id}'` : ''}`

  if (global.mode === 'prod') {
    const minifiedCode = (
      await transformAsync(unformatedCode, {
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
    ).code
    return minifiedCode
  }
  return serverFormatCode(unformatedCode)
}

export const renderLayout = async (args: {
  layout_id: string
  finalCode: any
  ua: string
}) => {
  const { ua, finalCode, layout_id } = args
  const modernBrowser = matchesUA(ua, { browsers: ['Chrome > 45'] })
  const transformOpt = {
    presets: [
      [
        '@babel/preset-react',
        {
          pragma: 'h',
          pragmaFrag: 'fragment',
        },
      ],
      [
        '@babel/env',
        {
          targets: {
            browsers: [modernBrowser ? 'defaults' : 'Chrome <= 45'],
          },
          useBuiltIns: 'entry',
          corejs: { version: '3.8', proposals: true },
        },
      ],
      [
        '@babel/preset-typescript',
        {
          isTSX: true,
          allExtensions: true,
          jsxPragma: 'h',
          jsxPragmaFrag: 'fragment',
          allowNamespaces: true,
        },
      ],
    ],
  }

  let meta = extractMeta(finalCode)
  let result: BabelFileResult = { code: 'null' }
  try {
    result = await transformAsync(
      `\
cms_layout = ${CMS.cms_func_args} => { 
  return <>${finalCode.replace(/<!--([\s\S])*?-->/g, '')}</>
}
cms_layout.child_meta = ${meta};`,
      transformOpt
    )
  } catch (e) {
    log('dev', 'Error Parsing HTML:\n' + e)
  }

  if (result.code.startsWith(`"use strict";`)) {
    result.code = result.code.substr(`"use strict";`.length).trim()
  }
  let unformatedCode = result.code
  if (global.mode === 'prod') {
    const minifiedCode = (
      await transformAsync(unformatedCode, {
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
    ).code
    return minifiedCode
  }
  return serverFormatCode(unformatedCode)
}
