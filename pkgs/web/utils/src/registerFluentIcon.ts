export const registerFluentIcon = async () => {
  if (!(window as any).iconInit) {
    ;(window as any).iconInit = true
    const e = await import('@fluentui/react/lib/Icons')
    e.initializeIcons()
  }
}
  