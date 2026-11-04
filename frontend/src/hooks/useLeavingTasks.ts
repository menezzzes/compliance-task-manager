import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task } from '../types'
import { focusNewTaskButton } from '../utils/focus'

const LEAVE_MS = 250

export function taskElementId(id: number) {
  return `task-${id}`
}

function leaveDuration() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : LEAVE_MS
}

export function useLeavingTasks(data: Task[], page: number, settled: boolean) {
  const [leavingIds, setLeavingIds] = useState<number[]>([])
  const [lastData, setLastData] = useState(data)
  const focusTargetRef = useRef<{ index: number; page: number } | null>(null)

  if (data !== lastData) {
    setLastData(data)
    setLeavingIds([])
  }

  const animateOut = useCallback(
    async (id: number) => {
      focusTargetRef.current = { index: Math.max(0, data.findIndex((task) => task.id === id)), page }
      setLeavingIds((ids) => [...ids, id])
      await new Promise((resolve) => setTimeout(resolve, leaveDuration()))
    },
    [data, page],
  )

  useEffect(() => {
    const target = focusTargetRef.current
    if (!settled || !target) return

    const index = page < target.page ? data.length - 1 : Math.min(target.index, data.length - 1)
    const next = data[index]
    focusTargetRef.current = null
    if (next) document.getElementById(taskElementId(next.id))?.focus()
    else focusNewTaskButton()
  }, [settled, data, page])

  return { leavingIds, animateOut }
}
