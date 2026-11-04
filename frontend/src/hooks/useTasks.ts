import { useCallback, useEffect, useState } from 'react'
import * as tasksApi from '../api/tasks'
import { ApiError } from '../api/tasks'
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

  const filtersKey = JSON.stringify(filters)
  const requestKey = `${reloadCount}:${filtersKey}`

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
        const error = caught instanceof Error ? caught : new Error('Could not load the tasks.')
        setResult({ requestKey, data: [], meta: null, error })
      })

    return () => controller.abort()
  }, [filtersKey, requestKey])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  const rethrow = useCallback(
    (error: unknown): never => {
      if (error instanceof ApiError && error.status === 404) reload()
      throw error
    },
    [reload],
  )

  const createTask = useCallback(
    async (input: TaskInput) => {
      const task = await tasksApi.createTask(input)
      reload()
      return task
    },
    [reload],
  )

  const updateTask = useCallback(
    async (id: number, input: Partial<TaskInput>, beforeReload?: (task: Task) => void | Promise<void>) => {
      const task = await tasksApi.updateTask(id, input).catch(rethrow)
      await beforeReload?.(task)
      reload()
      return task
    },
    [reload, rethrow],
  )

  const deleteTask = useCallback(
    async (id: number, beforeReload?: () => void | Promise<void>) => {
      await tasksApi.deleteTask(id).catch(rethrow)
      await beforeReload?.()
      reload()
    },
    [reload, rethrow],
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
