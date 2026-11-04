import type { Task } from '../types'
import { getDueStatus } from '../utils/dueStatus'

export function DueBadge({ task }: { task: Task }) {
  const dueStatus = getDueStatus(task)
  if (!dueStatus) return null

  if (dueStatus.kind === 'overdue') {
    return (
      <span className="tag tag-overdue">
        <span aria-hidden="true">⚠</span> {dueStatus.label}
      </span>
    )
  }

  return <span className="tag tag-due-soon">{dueStatus.label}</span>
}
