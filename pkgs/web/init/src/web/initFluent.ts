export const initFluent = async () => {
  const w: any = window
  if (!w.fluentInit) {
    w.fluentInit = true
    const tslib = await import('tslib')
    const { GlobalSettings, Stylesheet, KeyCodes } = await import(
      '@fluentui/react'
    )
    const icons = await import('@fluentui/react/lib/Icons')
    icons.initializeIcons()
    w.GlobalSettings = GlobalSettings
    w.Stylesheet = Stylesheet
    w.KeyCodes = KeyCodes

    for (let i in tslib) {
      w[i] = tslib[i]
    }
  }
}
