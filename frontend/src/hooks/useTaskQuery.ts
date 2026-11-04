import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  changeTaskQuery,
  clearTaskFilters,
  parseTaskQuery,
  serializeTaskQuery,
} from '../utils/taskQuery'
import type { TaskQuery, TaskQueryChange } from '../utils/taskQuery'

type HistoryMode = 'push' | 'replace'

export function useTaskQuery() {
  const [search, setSearch] = useState(window.location.search)

  useEffect(() => {
    const handlePopState = () => setSearch(window.location.search)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((change: (current: TaskQuery) => TaskQuery, mode: HistoryMode = 'push') => {
    const next = serializeTaskQuery(change(parseTaskQuery(window.location.search)))
    if (next === window.location.search) return

    const url = `${window.location.pathname}${next}`
    if (mode === 'push') window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
    setSearch(next)
  }, [])

  const updateQuery = useCallback(
    (change: TaskQueryChange) => navigate((current) => changeTaskQuery(current, change)),
    [navigate],
  )

  const setSearchText = useCallback(
    (q: string) => {
      const mode = parseTaskQuery(window.location.search).q ? 'replace' : 'push'
      navigate((current) => changeTaskQuery(current, { q }), mode)
    },
    [navigate],
  )

  const setPage = useCallback(
    (page: number, mode: HistoryMode = 'push') => navigate((current) => ({ ...current, page }), mode),
    [navigate],
  )

  const clearFilters = useCallback(() => navigate(clearTaskFilters), [navigate])

  const query = useMemo(() => parseTaskQuery(search), [search])

  return { query, updateQuery, setSearchText, setPage, clearFilters }
}
