import { useCallback, useEffect, useState } from 'react'
import { listTaskEvents } from '../api/tasks'
import type { TaskEvent } from '../types'

interface EventsResult {
  requestKey: string | null
  events: TaskEvent[]
  error: Error | null
}

const INITIAL_RESULT: EventsResult = { requestKey: null, events: [], error: null }

export function useTaskEvents(taskId: number) {
  const [result, setResult] = useState(INITIAL_RESULT)
  const [reloadCount, setReloadCount] = useState(0)

  const requestKey = `${reloadCount}:${taskId}`
  const loading = result.requestKey !== requestKey

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    listTaskEvents(taskId, { signal })
      .then((events) => {
        if (!signal.aborted) setResult({ requestKey, events, error: null })
      })
      .catch((caught: unknown) => {
        if (signal.aborted) return
        const error = caught instanceof Error ? caught : new Error('Could not load the history.')
        setResult({ requestKey, events: [], error })
      })

    return () => controller.abort()
  }, [taskId, requestKey])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return {
    events: loading ? [] : result.events,
    loading,
    error: loading ? null : result.error,
    reload,
  }
}
