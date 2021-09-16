/** @jsx jsx */
import { useEffect, useState, useRef } from 'react'
import type { BaseWindow } from 'web.init/src/window'
import { useRender } from './src/useRender'

declare const window: BaseWindow
export const useComponent = (
  name: string,
  _fileName: string,
  passthrough: Record<string, any>
) => {
  const def = window.cms_components[name]

  if (!def) {
    return {
      render: `jsx('div', {})`,
      extract: passthrough,
    }
  }
  if (def.template.code) {
    let extract: string[] = []
    for (let k of Object.keys(passthrough)) {
      k = k.trim()
      if (k) {
        extract.push(`const ${k} = _component.extract["${k}"];`)
      }
    }
    
    return {
      render: `\
(() => {
  ${extract.join('\n  ')}
  const params = _component.extract.params || {};
  ${def.template.code}
  return ccx_component();
})()
`,
      extract: passthrough,
    }
  } else {
    console.error(def);
  }

  return {
    render: `jsx('div', {})`,
    extract: passthrough,
  }
}
