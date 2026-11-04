import type { Task } from '../types'
import { daysBetween, toApiDate } from './date'

const DUE_SOON_DAYS = 3

export interface DueStatus {
  kind: 'overdue' | 'due_soon'
  label: string
}

function overdueStatus(daysLate: number | null): DueStatus {
  if (daysLate === null || daysLate <= 0) return { kind: 'overdue', label: 'Overdue' }
  return { kind: 'overdue', label: `Overdue by ${daysLate} ${daysLate === 1 ? 'day' : 'days'}` }
}

function dueSoonLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return 'Due tomorrow'
  return `Due in ${daysLeft} days`
}

export function getDueStatus(
  task: Pick<Task, 'status' | 'due_date' | 'overdue'>,
  today: string = toApiDate(new Date()),
): DueStatus | null {
  if (task.status === 'completed' || !task.due_date) return null

  const daysLeft = daysBetween(today, task.due_date)
  if (task.overdue) return overdueStatus(daysLeft === null ? null : -daysLeft)
  if (daysLeft === null || daysLeft > DUE_SOON_DAYS) return null
  if (daysLeft < 0) return overdueStatus(-daysLeft)

  return { kind: 'due_soon', label: dueSoonLabel(daysLeft) }
}
