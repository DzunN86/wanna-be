export const checkUrlExternal = (link: string) => {
  if (!(window as any).isSSR) {
    const host = window.location.hostname

    const linkHost = (url: string) => {
      if (/^https?:\/\//.test(url)) {
        let parser = document.createElement('a')
        parser.href = url

        return parser.hostname
      } else {
        return window.location.hostname
      }
    }

    return host !== linkHost(link)
  }
}
