import { useCallback, useEffect, useState } from 'react'
import * as tasksApi from '../api/tasks'
import type { TaskInput, TaskListParams } from '../api/tasks'
import type { PaginationMeta, Task } from '../types'

interface ListResult {
  requestKey: string | null
  data: Task[]
  meta: PaginationMeta | null
  error: Error | null
}

const INITIAL_RESULT: ListResult = { requestKey: null, data: [], meta: null, error: null }

export function useTasks(filters: TaskListParams = {}) {
  const [result, setResult] = useState(INITIAL_RESULT)
  const [reloadCount, setReloadCount] = useState(0)

  // Compared as text, so a new object with the same filters does not trigger a request.
  const filtersKey = JSON.stringify(filters)
  const requestKey = `${reloadCount}:${filtersKey}`

  // The current request is loading until its result arrives.
  const loading = result.requestKey !== requestKey

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    tasksApi
      .listTasks(JSON.parse(filtersKey) as TaskListParams, { signal })
      .then((response) => {
        if (signal.aborted) return
        setResult({ requestKey, data: response.data, meta: response.meta, error: null })
      })
      .catch((caught: unknown) => {
        if (signal.aborted) return
        // The old list may not match the current filters, so it is not kept.
        const error = caught instanceof Error ? caught : new Error('Could not load the tasks.')
        setResult({ requestKey, data: [], meta: null, error })
      })

    return () => controller.abort()
  }, [filtersKey, requestKey])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  // Failures are thrown to the caller: a form needs them, and the list is still valid.
  const createTask = useCallback(
    async (input: TaskInput) => {
      const task = await tasksApi.createTask(input)
      reload()
      return task
    },
    [reload],
  )

  const updateTask = useCallback(
    async (id: number, input: Partial<TaskInput>) => {
      const task = await tasksApi.updateTask(id, input)
      reload()
      return task
    },
    [reload],
  )

  const deleteTask = useCallback(
    async (id: number) => {
      await tasksApi.deleteTask(id)
      reload()
    },
    [reload],
  )

  return {
    data: result.data,
    meta: result.meta,
    loading,
    error: loading ? null : result.error,
    reload,
    createTask,
    updateTask,
    deleteTask,
  }
}
