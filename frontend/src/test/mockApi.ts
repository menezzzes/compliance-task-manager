import { vi } from 'vitest'
import type { Task, TaskEvent } from '../types'
import { makeTask } from './factories'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface CannedResponse {
  status: number
  body?: unknown
}

interface Interceptor {
  method: HttpMethod
  path: string
  canned?: CannedResponse | 'network-error'
  gate?: Promise<void>
}

export interface RecordedRequest {
  method: HttpMethod
  path: string
  params: URLSearchParams
  body: unknown
}

interface MockApiOptions {
  tasks?: Task[]
  events?: Record<number, TaskEvent[]>
}

const NOT_FOUND: CannedResponse = { status: 404, body: { error: 'Not found' } }
const EXACT_FILTERS = ['status', 'category', 'priority'] as const

function toResponse({ status, body }: CannedResponse): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function matchesParams(task: Task, params: URLSearchParams): boolean {
  const matchesExact = EXACT_FILTERS.every((field) => !params.has(field) || task[field] === params.get(field))
  const matchesSearch = task.title.toLowerCase().includes((params.get('q') ?? '').toLowerCase())
  const matchesOverdue = params.get('overdue') !== 'true' || task.overdue
  return matchesExact && matchesSearch && matchesOverdue
}

export function mockApi({ tasks: initialTasks = [], events = {} }: MockApiOptions = {}) {
  let tasks = [...initialTasks]
  let nextId = Math.max(0, ...initialTasks.map((task) => task.id)) + 1
  const requests: RecordedRequest[] = []
  const interceptors: Interceptor[] = []

  function listResponse(params: URLSearchParams): CannedResponse {
    const matching = tasks.filter((task) => matchesParams(task, params))
    const page = Number(params.get('page') ?? 1)
    const perPage = Number(params.get('per_page') ?? 20)
    return {
      status: 200,
      body: {
        data: matching.slice((page - 1) * perPage, page * perPage),
        meta: {
          total: matching.length,
          page,
          per_page: perPage,
          total_pages: Math.ceil(matching.length / perPage),
        },
      },
    }
  }

  function createResponse(body: { task: Partial<Task> }): CannedResponse {
    const task = makeTask({ ...body.task, id: nextId++ })
    tasks = [task, ...tasks]
    return { status: 201, body: task }
  }

  function updateResponse(id: number, body: { task: Partial<Task> }): CannedResponse {
    const current = tasks.find((task) => task.id === id)
    if (!current) return NOT_FOUND

    const merged = { ...current, ...body.task }
    const updated = { ...merged, overdue: merged.status === 'pending' && merged.overdue }
    tasks = tasks.map((task) => (task.id === id ? updated : task))
    return { status: 200, body: updated }
  }

  function deleteResponse(id: number): CannedResponse {
    if (!tasks.some((task) => task.id === id)) return NOT_FOUND
    tasks = tasks.filter((task) => task.id !== id)
    return { status: 204 }
  }

  function route(method: HttpMethod, path: string, params: URLSearchParams, body: unknown): CannedResponse {
    if (path === '/tasks' && method === 'GET') return listResponse(params)
    if (path === '/tasks' && method === 'POST') return createResponse(body as { task: Partial<Task> })

    const match = /^\/tasks\/(\d+)(\/events)?$/.exec(path)
    if (!match) return NOT_FOUND

    const id = Number(match[1])
    if (match[2]) return { status: 200, body: events[id] ?? [] }
    if (method === 'PATCH') return updateResponse(id, body as { task: Partial<Task> })
    if (method === 'DELETE') return deleteResponse(id)
    return NOT_FOUND
  }

  function takeInterceptor(method: HttpMethod, path: string): Interceptor | undefined {
    const index = interceptors.findIndex((item) => item.method === method && item.path === path)
    return index === -1 ? undefined : interceptors.splice(index, 1)[0]
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = new URL(String(input))
      const method = (init.method ?? 'GET') as HttpMethod
      const path = url.pathname.slice(url.pathname.indexOf('/tasks'))
      const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
      requests.push({ method, path, params: url.searchParams, body })

      const interceptor = takeInterceptor(method, path)
      if (interceptor?.gate) await interceptor.gate
      if (interceptor?.canned === 'network-error') throw new TypeError('Failed to fetch')
      return toResponse(interceptor?.canned ?? route(method, path, url.searchParams, body))
    }),
  )

  return {
    requestsFor: (method: HttpMethod) => requests.filter((request) => request.method === method),
    listRequests: () => requests.filter((request) => request.method === 'GET' && request.path === '/tasks'),
    lastListParams() {
      const params = this.listRequests().at(-1)?.params
      if (!params) throw new Error('The task list was not requested')
      return params
    },
    respondOnce(method: HttpMethod, path: string, canned: CannedResponse | 'network-error') {
      interceptors.push({ method, path, canned })
    },
    hold(method: HttpMethod, path: string) {
      let release = () => {}
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      interceptors.push({ method, path, gate })
      return () => release()
    },
  }
}
