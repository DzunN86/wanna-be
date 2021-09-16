export function log(type: string, msg: string, newline?: boolean): void
export const dirs: {
  root: string
  app: {
    db: string
    web: string
    mobile: string
    server: string
  }
  pkgs: {
    builder: string
    main: string
    boot: string
    libs: string
    figma: string
    web: string
    platform: string
  }
}
export const timeSince: (s: number) => string
export const modules: string[]
