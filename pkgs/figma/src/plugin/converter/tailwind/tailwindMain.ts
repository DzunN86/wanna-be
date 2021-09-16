import {
  AltEllipseNode,
  AltFrameNode,
  AltGroupNode,
  AltRectangleNode,
  AltSceneNode,
  AltTextNode,
} from '../altNodes/altMixins'
import { indentString } from '../common/indentString'
import { pxToLayoutSize } from './conversionTables'
import { TailwindDefaultBuilder } from './tailwindDefaultBuilder'
import { TailwindTextBuilder } from './tailwindTextBuilder'
import { tailwindVector } from './vector'
let parentId = ''
let showLayerName = false

export const tailwindMain = (
  sceneNode: Array<AltSceneNode>,
  parentIdSrc: string = '',
  isJsx: boolean = false,
  isLayout: boolean = false,
  generateSingleChild: boolean = false,
  isRoot = false,
  replaceNode?: any
): string => {
  parentId = parentIdSrc

  let result = tailwindWidgetGenerator(sceneNode, isJsx, isRoot, {
    generateSingleChild,
    isLayout: isLayout,
    replaceNode,
  })

  // remove the initial \n that is made in Container.
  if (result.length > 0 && result.slice(0, 1) === '\n') {
    result = result.slice(1, result.length)
  }

  return result
}

interface WidgetOpt {
  generateSingleChild: boolean
  isLayout: boolean
  replaceNode: any
}

// todo lint idea: replace BorderRadius.only(topleft: 8, topRight: 8) with BorderRadius.horizontal(8)
const tailwindWidgetGenerator = (
  sceneNode: ReadonlyArray<AltSceneNode>,
  isJsx: boolean,
  isRoot = false,
  opt: WidgetOpt = {
    generateSingleChild: false,
    isLayout: false,
    replaceNode: undefined,
  }
): string => {
  let comp = ''

  // filter non visible nodes. This is necessary at this step because conversion already happened.
  const visibleSceneNode = sceneNode.filter((d) => {
    if (
      d &&
      ((d.props && Object.keys(d.props).length > 0) ||
        (d.wrapCode && d.wrapCode !== '<<component>>'))
    ) {
      return true
    }
    return d.visible !== false
  })

  visibleSceneNode.forEach((node) => {
    if (opt && opt.replaceNode) {
      if (opt.replaceNode.id === node.id) {
        comp += '<##<NODE-HTML>##>'
        return
      }
    }
    if (opt && opt.isLayout && node.name === 'children') {
      comp += `{children}`
      return
    }

    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      comp += tailwindContainer(
        node,
        '',
        '',
        {
          isRelative: false,
          isInput: false,
          generateSingleChild: opt && opt.generateSingleChild,
        },
        isJsx,
        isRoot
      )
    } else if (node.type === 'GROUP') {
      // we dont render group
      // if (node.raster) {
      comp += tailwindFrame(node as any, isJsx, isRoot, opt)
      // } else {
      //   comp += tailwindGroup(node, isJsx, opt && opt.generateSingleChild)
      // }
    } else if (node.type === 'FRAME') {
      comp += tailwindFrame(node, isJsx, isRoot, {
        generateSingleChild: opt && opt.generateSingleChild,
        isLayout:
          opt &&
          (opt.isLayout ||
            (!opt.isLayout &&
              node.name.toLowerCase().indexOf('layout:') === 0)),
        replaceNode: opt && opt.replaceNode,
      })
    } else if (node.type === 'TEXT') {
      const str = tailwindText(
        node,
        false,
        isJsx,
        opt && opt.generateSingleChild
      )
      if (Array.isArray(str)) {
        comp += str.join('')
      } else {
        comp += str
      }
    }

    // todo support Line
  })

  return comp
}

const tailwindGroup = (
  node: AltGroupNode,
  isJsx: boolean = false,
  generateSingleChild: boolean = false
): string => {
  return '' // we dont render group

  // ignore the view when size is zero or less
  // while technically it shouldn't get less than 0, due to rounding errors,
  // it can get to values like: -0.000004196293048153166
  // also ignore if there are no children inside, which makes no sense
  if (node.width <= 0 || node.height <= 0 || node.children.length === 0) {
    return ''
  }

  const vectorIfExists = tailwindVector(node, showLayerName, parentId, isJsx)
  if (vectorIfExists) return vectorIfExists

  // this needs to be called after CustomNode because widthHeight depends on it
  const builder = new TailwindDefaultBuilder(
    node,
    showLayerName,
    isJsx,
    generateSingleChild
  )
    .blend(node)
    .widthHeight(node)
    .position(node, parentId)

  if (builder.attributes || builder.style) {
    const attr = builder.build('relative ')

    const generator = tailwindWidgetGenerator(node.children, isJsx)

    return `<div${attr}>${indentString(generator)}</div>`
  }

  return tailwindWidgetGenerator(node.children, isJsx)
}

const tailwindText = (
  node: AltTextNode,
  isInput: boolean,
  isJsx: boolean,
  generateSingleChild: boolean
): string | [string, string] => {
  // follow the website order, to make it easier

  const builderResult = new TailwindTextBuilder(
    node,
    showLayerName,
    isJsx,
    generateSingleChild
  )
    .blend(node)
    .textAutoSize(node)
    .position(node, parentId)
    // todo fontFamily (via node.fontName !== figma.mixed ? `fontFamily: ${node.fontName.family}`)
    // todo font smoothing
    .fontSize(node)
    .fontStyle(node)
    .letterSpacing(node)
    .lineHeight(node)
    .textDecoration(node)
    // todo text lists (<li>)
    .textAlign(node)
    .customColor(node.fills, 'text')
    .textTransform(node)

  const splittedChars = node.characters.split('\n')
  const charsWithLineBreak =
    splittedChars.length > 1
      ? node.characters.split('\n').join('<br/>')
      : node.characters

  if (isInput) {
    return [builderResult.attributes, charsWithLineBreak]
  } else {
    let tag = node.tagName || 'div'
    let build = ''
    if (tag.toLowerCase() === 'fragment') {
      tag = ''
    } else {
      build = builderResult.build()
    }
    if (node.raster) {
      return `<img${build} src="${getSrcFromRaster(node.raster, node.id)}" />`
    }

    let children = charsWithLineBreak
    if (node.props && node.props.children) {
      children = node.props.children
    }

    let result = ''
    if (node.renderChildren === 'n') {
      result = `<${tag}${build} />`
    } else {
      result = `<${tag}${build}>${children}</${tag}>`
    }

    if (node.wrapCode) {
      result = node.wrapCode.replace('<<component>>', result)
    }
    return result
  }
}

const tailwindFrame = (
  node: AltFrameNode,
  isJsx: boolean,
  isRoot = false,
  opt: WidgetOpt
): string => {
  if (opt && opt.isLayout && node.name === 'children') {
    return '{children}'
  }

  if (
    node.children.length === 1 &&
    node.children[0].type === 'TEXT' &&
    node?.name?.toLowerCase().indexOf('[input]') > -1
  ) {
    const [attr, char] = tailwindText(
      node.children[0],
      true,
      isJsx,
      opt && opt.generateSingleChild
    )
    return tailwindContainer(
      node,
      ` placeholder="${char}"`,
      attr,
      {
        isRelative: false,
        isInput: true,
        generateSingleChild: opt && opt.generateSingleChild,
      },
      isJsx
    )
  }

  let childrenStr = ``
  if (opt && opt.generateSingleChild) {
    if (node.hasChildren && node.renderChildren !== 'n') {
      if (node.props && node.props.children) {
        childrenStr = node.props.children
      } else {
        childrenStr = '{children}'
      }
    }
  } else {
    if (node.renderChildren !== 'n') {
      childrenStr = tailwindWidgetGenerator(node.children, isJsx, false, opt)
    }
  }

  if (node.layoutMode !== 'NONE') {
    const rowColumn = rowColumnProps(node, isRoot)
    return tailwindContainer(
      node,
      childrenStr,
      rowColumn,
      {
        isRelative: false,
        isInput: false,
        generateSingleChild: opt && opt.generateSingleChild,
      },
      isJsx,
      isRoot
    )

    // node.layoutMode === "NONE" && node.children.length > 1
    // children needs to be absolute
    return tailwindContainer(
      node,
      childrenStr,
      'relative ',
      {
        isRelative: true,
        isInput: false,
        generateSingleChild: opt && opt.generateSingleChild,
      },
      isJsx,
      isRoot
    )
  }
}

// properties named propSomething always take care of ","
// sometimes a property might not exist, so it doesn't add ","
export const tailwindContainer = (
  node: AltFrameNode | AltRectangleNode | AltEllipseNode,
  children: string,
  additionalAttr: string,
  attr: {
    isRelative: boolean
    isInput: boolean
    generateSingleChild: boolean
  },
  isJsx: boolean,
  isRoot = false
): string => {
  // ignore the view when size is zero or less
  // while technically it shouldn't get less than 0, due to rounding errors,
  // it can get to values like: -0.000004196293048153166
  if (node.width <= 0 || node.height <= 0) {
    return children
  }

  let tag = node.tagName || 'div'

  if (node.props) {
    if (node.raster) {
      tag = 'img'
      node.props.src = `"${getSrcFromRaster(node.raster, node.id)}"`
    }
  }

  let build = ''
  if (tag.toLowerCase() !== 'fragment') {
    let builder: TailwindDefaultBuilder

    if (isRoot) {
      builder = new TailwindDefaultBuilder(
        node,
        showLayerName,
        isJsx,
        attr.generateSingleChild
      )
        .blend(node)
        .widthHeight(node)
        .autoLayoutPadding(node)
        .position(node, parentId, attr.isRelative)
        .customColor(node.fills, 'bg')
        .shadow(node)
        .border(node)
    } else {
      builder = new TailwindDefaultBuilder(
        node,
        showLayerName,
        isJsx,
        attr.generateSingleChild
      )
        .blend(node)
        .widthHeight(node)
        .autoLayoutPadding(node)
        .position(node, parentId, attr.isRelative)
        .customColor(node.fills, 'bg')
        .shadow(node)
        .border(node)
    }
    if (attr.isInput) {
      // children before the > is not a typo.
      return `<input${builder.build(additionalAttr)}${children}></input>`
    }
    build = builder.build(additionalAttr)
  } else {
    tag = ''
  }

  let result = ''
  if (
    (node.renderChildren !== 'n' && !!children) ||
    (children && tag !== 'img')
  ) {
    let propsChild = node.props && node.props.children
    if (propsChild) {
      if (propsChild !== '{children}') {
        propsChild = propsChild.replace(/children/gi, `(${children})`)
      } else {
        propsChild = ''
      }
    }
    let finalChildren = propsChild || children

    if (attr.generateSingleChild) {
      finalChildren = children
    }
    result = `<${tag}${build}>${finalChildren}</${tag}>`
  } else {
    result = `<${tag}${build}/>`
  }
  if (node.wrapCode) {
    result = node.wrapCode.replace('<<component>>', result)
  }

  return result
}

export const rowColumnProps = (
  node: AltFrameNode,
  isRoot: boolean = false
): string => {
  // [optimization]
  // flex, by default, has flex-row. Therefore, it can be omitted.
  const rowOrColumn = node.layoutMode === 'HORIZONTAL' ? '' : 'flex-col '

  // https://tailwindcss.com/docs/space/
  // space between items
  const spacing = node.itemSpacing > 0 ? pxToLayoutSize(node.itemSpacing) : 0
  const spaceDirection = node.layoutMode === 'HORIZONTAL' ? 'x' : 'y'

  // space is visually ignored when there is only one child or spacing is zero
  const space =
    node.children.length > 1 &&
    spacing > 0 &&
    node.primaryAxisAlignItems !== 'SPACE_BETWEEN'
      ? `space-${spaceDirection}-${spacing} `
      : ''

  // special case when there is only one children; need to position correctly in Flex.
  // let justify = "justify-center";
  // if (node.children.length === 1) {
  //   const nodeCenteredPosX = node.children[0].x + node.children[0].width / 2;
  //   const parentCenteredPosX = node.width / 2;

  //   const marginX = nodeCenteredPosX - parentCenteredPosX;

  //   // allow a small threshold
  //   if (marginX < -4) {
  //     justify = "justify-start";
  //   } else if (marginX > 4) {
  //     justify = "justify-end";
  //   }
  // }
  let primaryAlign: string

  switch (node.primaryAxisAlignItems) {
    case 'MIN':
      primaryAlign = 'justify-start '
      break
    case 'CENTER':
      primaryAlign = 'justify-center '
      break
    case 'MAX':
      primaryAlign = 'justify-end '
      break
    case 'SPACE_BETWEEN':
      primaryAlign = 'justify-between '
      break
  }

  // [optimization]
  // when all children are STRETCH and layout is Vertical, align won't matter. Otherwise, center it.
  let counterAlign: string
  switch (node.counterAxisAlignItems) {
    case 'MIN':
      counterAlign = 'items-start '
      break
    case 'CENTER':
      counterAlign = 'items-center '
      break
    case 'MAX':
      counterAlign = 'items-end '
      break
  }

  let flex = 'flex '
  if (node.layoutGrow) {
    flex += 'flex-1 '
  }

  if (isRoot || node.layoutAlign === 'STRETCH') {
    flex += 'self-stretch '
  }

  // if parent is a Frame with AutoLayout set to Vertical, the current node should expand
  // const flex =
  //   node.parent &&
  //   'layoutMode' in node.parent &&
  //   node.parent.layoutMode === node.layoutMode
  //     ? 'flex '
  //     : 'inline-flex '

  return `${flex}${rowOrColumn}${space}${counterAlign}${primaryAlign}`.replace(
    /undefined/gi,
    ''
  )
}

const getSrcFromRaster = (raster: string, id: string) => {
  let size = raster.split('@')[1] || '1'
  let format = raster.split('@')[0]

  return `/fimgs/${id.replace(/\W+/g, '_')}.x${size}.${format.toLowerCase()}`
}
