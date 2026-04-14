import { useState, useEffect, useCallback, useRef } from 'react'

export interface AsyncState<T> {
  data:    T
  loading: boolean
  error:   string | null
  refetch: () => void
}

export function useAsync<T>(
  fn:           () => Promise<T>,
  initialData:  T,
  deps:         any[] = [],
): AsyncState<T> {
  const [data,    setData]    = useState<T>(initialData)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      if (mountedRef.current) setData(result)
    } catch (err: any) {
      if (mountedRef.current) setError(err?.message ?? 'Something went wrong')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    fetch()
    return () => { mountedRef.current = false }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
