import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Task } from './types'

function buildTask(id: number): Task {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status: 'pending',
    priority: 'medium',
    category: 'other',
    due_date: null,
    created_at: '2026-11-04T12:00:00.000Z',
    updated_at: '2026-11-04T12:00:00.000Z',
    overdue: false,
  }
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

function stubApi(taskCount: number) {
  let tasks = Array.from({ length: taskCount }, (_, index) => buildTask(index + 1))
  const listRequests: URLSearchParams[] = []

  const fetchStub = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))

    if (init?.method === 'DELETE') {
      const id = Number(url.pathname.split('/').pop())
      tasks = tasks.filter((task) => task.id !== id)
      return new Response(null, { status: 204 })
    }

    listRequests.push(url.searchParams)
    const page = Number(url.searchParams.get('page') ?? 1)
    const perPage = Number(url.searchParams.get('per_page') ?? 20)
    return jsonResponse({
      data: tasks.slice((page - 1) * perPage, page * perPage),
      meta: {
        total: tasks.length,
        page,
        per_page: perPage,
        total_pages: Math.ceil(tasks.length / perPage),
      },
    })
  })

  vi.stubGlobal('fetch', fetchStub)
  return listRequests
}

function pagination() {
  return within(screen.getByRole('navigation', { name: 'Pagination' }))
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App pagination', () => {
  it('asks for 10 tasks per page and keeps per_page out of the page URL', async () => {
    const listRequests = stubApi(19)
    render(<App />)

    expect(await screen.findByText('Showing 1-10 of 19 tasks')).toBeInTheDocument()
    expect(listRequests.every((params) => params.get('per_page') === '10')).toBe(true)
    expect(window.location.search).toBe('')
  })

  it('turns 19 tasks into 2 pages, with Next active on page 1 and Previous on page 2', async () => {
    const listRequests = stubApi(19)
    window.scrollTo = vi.fn()
    render(<App />)

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
    expect(pagination().getByRole('button', { name: 'Previous' })).toHaveAttribute('aria-disabled', 'true')
    expect(pagination().getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'false')

    fireEvent.click(pagination().getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Showing 11-19 of 19 tasks')).toBeInTheDocument()
    expect(pagination().getByRole('button', { name: 'Previous' })).toHaveAttribute('aria-disabled', 'false')
    expect(pagination().getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true')
    expect(listRequests.every((params) => params.get('per_page') === '10')).toBe(true)
  })

  it('moves a page past the end to the last valid page', async () => {
    const listRequests = stubApi(19)
    window.history.replaceState(null, '', '/?page=9')
    render(<App />)

    expect(await screen.findByText('Showing 11-19 of 19 tasks')).toBeInTheDocument()
    expect(window.location.search).toBe('?page=2')
    expect(listRequests.at(-1)?.get('per_page')).toBe('10')
  })

  it('goes back one page after deleting the only task of the last page', async () => {
    stubApi(11)
    window.history.replaceState(null, '', '/?page=2')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Delete: Task 11' }))
    const dialog = within(screen.getByRole('alertdialog'))
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Showing 1-10 of 10 tasks')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(window.location.search).toBe('')
    await waitFor(() => expect(document.activeElement?.id).toBe('task-10'))
  })

  it('shows no range and no pagination for an empty list', async () => {
    stubApi(0)
    render(<App />)

    expect(await screen.findByText(/no tasks/i)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument()
  })
})
