import { useEffect, useRef, useState } from 'react'

export const useRender = () => {
  const mounted = useRef(true)
  useEffect(() => {
    return () => {
      mounted.current = false
    }
  }, [])
  const [, _render] = useState(null as any)
  return () => {
    if (mounted.current) {
      _render({})
    }
  }
}
