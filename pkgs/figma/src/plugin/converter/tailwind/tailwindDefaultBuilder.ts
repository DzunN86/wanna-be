import {
  AltBaseNodeMixin,
  AltBlendMixin,
  AltDefaultShapeMixin,
  AltFrameMixin,
  AltGeometryMixin,
  AltSceneNode,
} from '../altNodes/altMixins'
import { parentCoordinates } from '../common/parentCoordinates'
import { formatWithJSX } from '../common/parseJSX'
import {
  tailwindOpacity,
  tailwindRotation,
  tailwindVisibility,
} from './builderImpl/tailwindBlend'
import {
  tailwindBorderRadius,
  tailwindBorderWidth,
} from './builderImpl/tailwindBorder'
import {
  tailwindColorFromFills,
  tailwindGradientFromFills,
} from './builderImpl/tailwindColor'
import { tailwindPadding } from './builderImpl/tailwindPadding'
import { tailwindPosition } from './builderImpl/tailwindPosition'
import { tailwindShadow } from './builderImpl/tailwindShadow'
import {
  htmlSizeForTailwind,
  htmlSizePartialForTailwind,
} from './builderImpl/tailwindSize'

export class TailwindDefaultBuilder {
  attributes: string = ''
  style: string
  styleSeparator: string = ''
  isJSX: boolean
  visible: boolean
  name: string = ''
  hasFixedSize = false
  css: AltBaseNodeMixin['css']
  bgImage: { hash: string; size: 'FIT' | 'FILL' | 'TILE' }
  props: { name: string; value: string }
  genSingle: boolean
  isInstance: boolean
  raster: 'svg' | 'png@1' | 'png@2' | 'png@3' | ''
  tagName: string

  constructor(
    node: AltSceneNode,
    showLayerName: boolean,
    optIsJSX: boolean,
    generateSingle: boolean
  ) {
    this.isJSX = optIsJSX

    this.isInstance = node.isInstance
    this.styleSeparator = this.isJSX ? ',' : ';'
    this.style = ''
    this.visible = node.visible
    this.genSingle = generateSingle
    this.bgImage = node.bgImage
    this.raster = node.raster
    this.tagName = node.tagName

    if (node.css) {
      this.css = node.css
    }
    if (node.props) {
      this.props = node.props
    }

    if (showLayerName) {
      this.name = node.name.replace(' ', '') + ' '
    }
  }

  blend(node: AltSceneNode): this {
    this.attributes += tailwindVisibility(node)
    this.attributes += tailwindRotation(node)
    this.attributes += tailwindOpacity(node)

    return this
  }

  border(node: AltGeometryMixin & AltSceneNode): this {
    this.attributes += tailwindBorderWidth(node)
    this.attributes += tailwindBorderRadius(node)
    this.customColor(node.strokes, 'border')

    return this
  }

  position(
    node: AltSceneNode,
    parentId: string,
    isRelative: boolean = false
  ): this {
    const position = tailwindPosition(node, parentId, this.hasFixedSize)

    if (node.overflow === 'VERTICAL') {
      this.attributes += 'relative overflow-y-auto '
    }

    if (position === 'absoluteManualLayout' && node.parent) {
      // tailwind can't deal with absolute layouts.

      const [parentX, parentY] = parentCoordinates(node.parent)

      const left = node.x - parentX
      const top = node.y - parentY

      this.style += formatWithJSX('left', this.isJSX, left)
      this.style += formatWithJSX('top', this.isJSX, top)

      if (!isRelative) {
        this.attributes += 'absolute '
      }
    } else {
      this.attributes += position
    }

    return this
  }

  /**
   * https://tailwindcss.com/docs/text-color/
   * example: text-blue-500
   * example: text-opacity-25
   * example: bg-blue-500
   */
  customColor(
    paint: ReadonlyArray<Paint> | PluginAPI['mixed'],
    kind: string
  ): this {
    // visible is true or undefinied (tests)
    if (this.visible !== false) {
      let gradient = ''
      if (kind === 'bg') {
        gradient = tailwindGradientFromFills(paint)
      }
      if (gradient) {
        this.attributes += gradient
      } else {
        this.attributes += tailwindColorFromFills(paint, kind)
      }
    }
    return this
  }

  /**
   * https://tailwindcss.com/docs/box-shadow/
   * example: shadow
   */
  shadow(node: AltBlendMixin): this {
    this.attributes += tailwindShadow(node)
    return this
  }

  // must be called before Position, because of the hasFixedSize attribute.
  widthHeight(node: AltSceneNode): this {
    // if current element is relative (therefore, children are absolute)
    // or current element is one of the absoltue children and has a width or height > w/h-64

    // if ('isRelative' in node && node.isRelative === true) {
    // if (node.type !== 'TEXT') {

    const [htmlWidth, htmlHeight] = htmlSizePartialForTailwind(node, this.isJSX)
    if (this.raster || (this.css && this.css.inherit.width)) {
      this.style += htmlWidth
    }

    if (this.raster || (this.css && this.css.inherit.height)) {
      this.style += htmlHeight
    }
    this.hasFixedSize = htmlWidth !== '' || htmlHeight !== ''

    // this.style += htmlSizeForTailwind(node, this.isJSX)
    // }
    // } else if (node.parent?.isRelative === true || node.width < 384 || node.height < 384) {
    //     // to avoid mixing html and tailwind sizing too much, only use html sizing when absolutely necessary.
    //     // therefore, if only one attribute is larger than 256, only use the html size in there.
    //     const [tailwindWidth, tailwindHeight] = tailwindSizePartial(node);
    //     const [htmlWidth, htmlHeight] = htmlSizePartialForTailwind(node, this.isJSX);

    //     // when textAutoResize is NONE or WIDTH_AND_HEIGHT, it has a defined width.
    //     if (node.type !== 'TEXT' || node.textAutoResize !== 'WIDTH_AND_HEIGHT') {
    //         if (node.width < 384) {
    //             this.style += htmlWidth;
    //         } else {
    //             this.attributes += tailwindWidth;
    //         }
    //     }

    //     // when textAutoResize is NONE has a defined height.
    //     if (node.type !== 'TEXT' || node.textAutoResize === 'NONE') {
    //         if (node.width < 384) {
    //             this.style += htmlHeight;
    //         } else {
    //             this.attributes += tailwindHeight;
    //         }
    //     }

    //     this.hasFixedSize = htmlWidth !== '' || htmlHeight !== '';
    // } else {
    //     const partial = tailwindSizePartial(node);

    //     // Width
    //     if (node.type !== 'TEXT' || node.textAutoResize !== 'WIDTH_AND_HEIGHT') {
    //         this.attributes += partial[0];
    //     }

    //     // Height
    //     if (node.type !== 'TEXT' || node.textAutoResize === 'NONE') {
    //         this.attributes += partial[1];
    //     }

    //     this.hasFixedSize = partial[0] !== '' && partial[1] !== '';
    // }
    return this
  }

  autoLayoutPadding(node: AltFrameMixin | AltDefaultShapeMixin): this {
    this.attributes += tailwindPadding(node)
    return this
  }

  removeTrailingSpace(): this {
    if (this.attributes.length > 0 && this.attributes.slice(-1) === ' ') {
      this.attributes = this.attributes.slice(0, -1)
    }

    if (this.style.length > 0 && this.style.slice(-1) === ' ') {
      this.style = this.style.slice(0, -1)
    }
    return this
  }

  build(additionalAttr: string = ''): string {
    this.attributes =
      this.name + additionalAttr + this.attributes.replace(/undefined/gi, '')
    this.removeTrailingSpace()

    let style = ''
    if (this.style || this.css) {
      style = `${this.style}${
        !!this.css && !!this.css.style ? ' ' + this.css.style : ''
      }`.trim()
    }

    if (this.bgImage && this.bgImage.hash) {
      let bgattr = 'background-size:100% 100%;background-repeat:no-repeat;'
      switch (this.bgImage.size) {
        case 'FIT':
          bgattr =
            'background-size:contain;background-position:center;background-repeat:no-repeat;'
          break
        case 'TILE':
          bgattr = 'background-repeat: repeat;'
          break
      }
      style += `background-image: url('/fimgs/bg-${this.bgImage.hash}');${bgattr}`
    }

    const classOrClassName = this.isJSX ? 'className' : 'class'

    let final = this.attributes
    if (this.css && this.css.rem) {
      const rem = this.css.rem.trim()
      if (rem === '*') {
        final = ''
      } else {
        const remarr = rem.split(' ')
        final = this.attributes
          .split(' ')
          .filter((e) => {
            for (let i of remarr) {
              if (e === i) {
                return false
              }
            }
            return true
          })
          .join(' ')
      }
    }

    let props = ''
    if (this.props || this.isInstance) {
      let rawprops = { ...(this.props || {}) }

      if (!this.isInstance) {
        if (this.genSingle) {
          rawprops['class'] = `"${final}"`
        } else if (this.css.inherit.class !== false) {
          if (rawprops['class']) {
            rawprops['class'] = rawprops['class'].replace('[class]', final)
          } else if (final) {
            rawprops['class'] = `"${final}"`
          }
        }

        if (this.genSingle) {
          rawprops['style'] = `"${style}"`
        } else if (this.css.inherit.style !== false) {
          if (rawprops['style']) {
            rawprops['style'] = rawprops['style'].replace('[style]', style)
          } else if (style) {
            rawprops['style'] = `"${style}"`
          }
        }
      } else {
        if (this.css.inherit.class !== false) {
          if (rawprops['class']) {
            rawprops['class'] = rawprops['class'].replace('[class]', final)
          }
        }
        if (this.css.inherit.style !== false) {
          if (rawprops['style']) {
            rawprops['style'] = rawprops['style'].replace('[style]', style)
          }
        }
      }


      if (rawprops['class'])
      rawprops['class'] = rawprops['class'].replace(/\"\s*(.*)\s*\"/ig, '"$1"')

      if (rawprops['style'])
      rawprops['style'] = rawprops['style'].replace(/\"\s*(.*)\s*\"/ig, '"$1"')

      for (let [name, value] of Object.entries(rawprops)) {
        if (
          !value ||
          !name ||
          name === 'children' ||
          (!this.genSingle && (value === '""' || value === '{``}'))
        ) {
          continue
        }

        if (this.genSingle) {
          props += ` ${name}=${value}`
        } else {
          if (value.startsWith('{`') && value.endsWith('`}')) {
            props += ` ${name}={\`${value
              .substr(2, value.length - 4)
              .trim()}\`}`
          } else {
            props += ` ${name}=${value.trim()}`
          }
        }
      }

      return `${props}`
    } else {
      let cls = final ? `${classOrClassName}="${final}"` : ''
      let stl = style ? `style="${style}"` : ''
      return ` ${cls}${stl}`
    }
  }

  reset(): void {
    this.attributes = ''
  }
}
