import type { Task, TaskEvent } from '../types'

let lastId = 1000

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? ++lastId
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status: 'pending',
    priority: 'medium',
    category: 'other',
    due_date: null,
    overdue: false,
    created_at: '2026-11-03T15:00:00.000Z',
    updated_at: '2026-11-03T15:00:00.000Z',
    ...overrides,
  }
}

export function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) => makeTask({ id: index + 1 }))
}

export function makeEvent(overrides: Partial<TaskEvent> = {}): TaskEvent {
  return {
    id: ++lastId,
    task_id: 1,
    event_type: 'updated',
    metadata: null,
    created_at: '2026-11-03T15:00:00.000Z',
    ...overrides,
  }
}
