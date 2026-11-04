import type {
  ApiValidationError as ApiValidationErrorBody,
  Category,
  PaginatedResponse,
  Priority,
  Status,
  Task,
  TaskEvent,
} from '../types'
import { toApiDate } from '../utils/date'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/+$/, '')

export type TaskSort = 'created_at' | 'due_date' | 'priority' | 'title'
export type SortDirection = 'asc' | 'desc'

export interface TaskListParams {
  status?: Status
  category?: Category
  priority?: Priority
  q?: string
  overdue?: boolean
  sort?: TaskSort
  direction?: SortDirection
  page?: number
  per_page?: number
}

export interface TaskInput {
  title: string
  description?: string | null
  status?: Status
  priority?: Priority
  category?: Category
  due_date?: Date | string | null
}

export interface RequestOptions {
  signal?: AbortSignal
}

/** 404s, server errors and network failures. status is undefined when no response arrived. */
export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** A 422 response, with the messages grouped by field. */
export class ApiValidationError extends ApiError implements ApiValidationErrorBody {
  readonly errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super('The submitted data is not valid.', 422)
    this.name = 'ApiValidationError'
    this.errors = errors
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch (error) {
    throw wrapFailure(error, 'Could not reach the server. Check your connection and try again.')
  }

  if (response.status === 422) throw new ApiValidationError(await readValidationErrors(response))
  if (response.status === 404) throw new ApiError('The task was not found.', 404)
  if (!response.ok) {
    throw new ApiError(`The server returned an error (${response.status}). Please try again.`, response.status)
  }
  if (response.status === 204) return undefined as T

  try {
    return (await response.json()) as T
  } catch (error) {
    throw wrapFailure(error, 'The server returned an unexpected response.', response.status)
  }
}

/** Keeps AbortError as it is, so callers can tell a cancellation from a failure. */
function wrapFailure(error: unknown, message: string, status?: number): unknown {
  if (error instanceof DOMException && error.name === 'AbortError') return error
  return new ApiError(message, status)
}

async function readValidationErrors(response: Response): Promise<Record<string, string[]>> {
  try {
    const body = (await response.json()) as Partial<ApiValidationErrorBody>
    return body.errors ?? {}
  } catch {
    return {}
  }
}

function buildQuery(params: TaskListParams): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

function buildTaskBody(input: Partial<TaskInput>): string {
  const { due_date, ...task } = input
  const dueDate = due_date ? toApiDate(due_date) : due_date
  return JSON.stringify({ task: { ...task, due_date: dueDate } })
}

export function listTasks(
  params: TaskListParams = {},
  options: RequestOptions = {},
): Promise<PaginatedResponse<Task>> {
  return request(`/tasks${buildQuery(params)}`, options)
}

export function getTask(id: number, options: RequestOptions = {}): Promise<Task> {
  return request(`/tasks/${id}`, options)
}

export function createTask(input: TaskInput, options: RequestOptions = {}): Promise<Task> {
  return request('/tasks', { ...options, method: 'POST', body: buildTaskBody(input) })
}

export function updateTask(
  id: number,
  input: Partial<TaskInput>,
  options: RequestOptions = {},
): Promise<Task> {
  return request(`/tasks/${id}`, { ...options, method: 'PATCH', body: buildTaskBody(input) })
}

export function deleteTask(id: number, options: RequestOptions = {}): Promise<void> {
  return request(`/tasks/${id}`, { ...options, method: 'DELETE' })
}

export function listTaskEvents(id: number, options: RequestOptions = {}): Promise<TaskEvent[]> {
  return request(`/tasks/${id}/events`, options)
}
