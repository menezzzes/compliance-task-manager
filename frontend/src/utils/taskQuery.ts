import type { SortDirection, TaskListParams, TaskSort } from '../api/tasks'
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../types'
import type { Category, PaginationMeta, Priority, Status, Task } from '../types'

export const PAGE_SIZE = 10

export interface TaskQuery {
  status: Status | ''
  category: Category | ''
  priority: Priority | ''
  q: string
  overdue: boolean
  sort: TaskSort
  direction: SortDirection
  page: number
}

export type TaskFilters = Pick<TaskQuery, 'status' | 'category' | 'priority' | 'q' | 'overdue'>
export type TaskQueryChange = Partial<Omit<TaskQuery, 'page'>>

export const SORT_OPTIONS: readonly { sort: TaskSort; direction: SortDirection; label: string }[] = [
  { sort: 'created_at', direction: 'desc', label: 'Newest' },
  { sort: 'due_date', direction: 'asc', label: 'Due soonest' },
  { sort: 'priority', direction: 'desc', label: 'Highest priority' },
  { sort: 'title', direction: 'asc', label: 'Title A-Z' },
]

const NO_FILTERS: TaskFilters = { status: '', category: '', priority: '', q: '', overdue: false }

export const DEFAULT_TASK_QUERY: TaskQuery = {
  ...NO_FILTERS,
  sort: 'created_at',
  direction: 'desc',
  page: 1,
}

const STATUSES = Object.keys(STATUS_LABELS) as Status[]
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[]

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.find((item) => item === value) ?? ''
}

function parsePage(value: string | null): number {
  if (value === null || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : 1
}

export function parseTaskQuery(search: string): TaskQuery {
  const params = new URLSearchParams(search)
  const sortOption = SORT_OPTIONS.find((option) => option.sort === params.get('sort'))

  return {
    status: oneOf(params.get('status'), STATUSES),
    category: oneOf(params.get('category'), CATEGORIES),
    priority: oneOf(params.get('priority'), PRIORITIES),
    q: (params.get('q') ?? '').trim(),
    overdue: params.get('overdue') === 'true',
    sort: sortOption?.sort ?? DEFAULT_TASK_QUERY.sort,
    direction: sortOption?.direction ?? DEFAULT_TASK_QUERY.direction,
    page: parsePage(params.get('page')),
  }
}

export function serializeTaskQuery(query: TaskQuery): string {
  const params = new URLSearchParams()

  if (query.status) params.set('status', query.status)
  if (query.category) params.set('category', query.category)
  if (query.priority) params.set('priority', query.priority)
  if (query.q) params.set('q', query.q)
  if (query.overdue) params.set('overdue', 'true')
  if (query.sort !== DEFAULT_TASK_QUERY.sort || query.direction !== DEFAULT_TASK_QUERY.direction) {
    params.set('sort', query.sort)
    params.set('direction', query.direction)
  }
  if (query.page > 1) params.set('page', String(query.page))

  const search = params.toString()
  return search ? `?${search}` : ''
}

export function toTaskListParams(query: TaskQuery): TaskListParams {
  return {
    status: query.status || undefined,
    category: query.category || undefined,
    priority: query.priority || undefined,
    q: query.q || undefined,
    overdue: query.overdue || undefined,
    sort: query.sort,
    direction: query.direction,
    page: query.page,
    per_page: PAGE_SIZE,
  }
}

export function hasActiveFilters(query: TaskQuery): boolean {
  return Boolean(query.status || query.category || query.priority || query.q || query.overdue)
}

export function changeTaskQuery(query: TaskQuery, change: TaskQueryChange): TaskQuery {
  return { ...query, ...change, page: 1 }
}

export function clearTaskFilters(query: TaskQuery): TaskQuery {
  return changeTaskQuery(query, NO_FILTERS)
}

export function clampPage(page: number, totalPages: number): number {
  return Math.max(1, Math.min(page, totalPages))
}

export function describePageRange({ page, per_page, total }: PaginationMeta): string | null {
  const first = (page - 1) * per_page + 1
  if (first > total) return null

  const last = Math.min(page * per_page, total)
  return `Showing ${first}-${last} of ${total} ${total === 1 ? 'task' : 'tasks'}`
}

export function matchesTaskFilters(task: Task, filters: TaskFilters): boolean {
  if (filters.status && task.status !== filters.status) return false
  if (filters.category && task.category !== filters.category) return false
  if (filters.priority && task.priority !== filters.priority) return false
  if (filters.overdue && !task.overdue) return false
  return task.title.toLowerCase().includes(filters.q.toLowerCase())
}
