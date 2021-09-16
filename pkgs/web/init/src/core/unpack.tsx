import { Unpackr } from 'msgpackr/unpack'
import type { BaseWindow } from '../window'
import { generateLayout } from './gen-layout'

declare const window: BaseWindow
export const unpackBase = () => {
  if (window.cms_base_pack) {
    const unpackr = new Unpackr({
      variableMapSize: true,
      useFloat32: 1,
      mapsAsObjects: true,
      encodeUndefinedAsNil: true,
      largeBigIntToFloat: true,
      useRecords: true,
      useTimestamp32: true,
    })
    const result = unpackr.unpack(new Uint8Array(window.cms_base_pack))

    for (let [k, v] of Object.entries(result)) {
      window[k] = v
    }

    for (let v of Object.values(window.cms_layouts)) {
      v.component = generateLayout(v.source)
    }
  }
}
