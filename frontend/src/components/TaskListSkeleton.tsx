import { useEffect, useState } from 'react'

const PLACEHOLDER_ROWS = [1, 2, 3, 4]

export const WAKE_UP_HINT_DELAY_MS = 5000
export const WAKE_UP_HINT = 'Waking up the server. This can take up to a minute on the first visit.'

function useElapsed(delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  return elapsed
}

export function TaskListSkeleton() {
  const slow = useElapsed(WAKE_UP_HINT_DELAY_MS)

  return (
    <div className="skeleton">
      <p className="visually-hidden" role="status">
        Loading tasks…
      </p>
      {PLACEHOLDER_ROWS.map((row) => (
        <div key={row} className="skeleton-row" aria-hidden="true">
          <span className="skeleton-line skeleton-line-title" />
          <span className="skeleton-line skeleton-line-text" />
          <span className="skeleton-line skeleton-line-tags" />
        </div>
      ))}
      <p className="skeleton-hint" role="status">
        {slow && WAKE_UP_HINT}
      </p>
    </div>
  )
}
