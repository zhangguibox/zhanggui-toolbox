import { useEffect, useState } from 'react'

/** localStorage 持久化的 useState，key 会加前缀 zg. */
export function useStored<T>(key: string, initial: T | (() => T)) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem('zg.' + key)
      if (raw != null) return JSON.parse(raw) as T
    } catch {
      /* ignore */
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })
  useEffect(() => {
    try {
      localStorage.setItem('zg.' + key, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  }, [key, v])
  return [v, setV] as const
}
