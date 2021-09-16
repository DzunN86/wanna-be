export {}

/** TYPE SEPARATOR - DO NOT DELETE THIS COMMENT **/
declare global {
  const meta: Record<string, any>
}

declare type effect = {
  run?: (props?: {
    meta: typeof meta
  }) => void | Promise<(() => void) | void>
  meta?: typeof meta
  deps?: string[]
}
