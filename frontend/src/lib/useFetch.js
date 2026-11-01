import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

// Mengambil data GET dan mengembalikan { data, loading, error, reload }.
export function useFetch(path) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let off = false
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .get(path)
      .then((r) => !off && setState({ data: r.data, loading: false, error: null }))
      .catch((e) => !off && setState({ data: null, loading: false, error: e.message }))
    return () => {
      off = true
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
