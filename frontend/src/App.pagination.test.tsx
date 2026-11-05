import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeTasks } from './test/factories'
import { mockApi } from './test/mockApi'
import { findTaskTitle, pagination, renderApp } from './test/appHelpers'
import { PAGE_SIZE } from './utils/taskQuery'
import type { UserEvent } from '@testing-library/user-event'

const TOTAL = PAGE_SIZE * 2 - 1
const FIRST_PAGE_RANGE = `Showing 1-${PAGE_SIZE} of ${TOTAL} tasks`
const LAST_PAGE_RANGE = `Showing ${PAGE_SIZE + 1}-${TOTAL} of ${TOTAL} tasks`

describe('App pagination', () => {
  it('asks for PAGE_SIZE tasks per page and keeps per_page out of the page URL', async () => {
    const api = mockApi({ tasks: makeTasks(TOTAL) })
    renderApp()

    expect(await screen.findByText(FIRST_PAGE_RANGE)).toBeInTheDocument()
    expect(api.listRequests().every(({ params }) => params.get('per_page') === String(PAGE_SIZE))).toBe(true)
    expect(window.location.search).toBe('')
  })

  it('moves with Next and Previous, disabling each one at the ends', async () => {
    const api = mockApi({ tasks: makeTasks(TOTAL) })
    const { user } = renderApp()

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
    expect(pagination().getByRole('button', { name: 'Previous' })).toHaveAttribute('aria-disabled', 'true')
    expect(pagination().getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'false')

    await user.click(pagination().getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText(LAST_PAGE_RANGE)).toBeInTheDocument()
    expect(window.location.search).toBe('?page=2')
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
    expect(pagination().getByRole('button', { name: 'Previous' })).toHaveAttribute('aria-disabled', 'false')
    expect(pagination().getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true')

    await user.click(pagination().getByRole('button', { name: 'Previous' }))

    expect(await screen.findByText(FIRST_PAGE_RANGE)).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(api.lastListParams().get('page')).toBe('1')
    expect(api.listRequests().every(({ params }) => params.get('per_page') === String(PAGE_SIZE))).toBe(true)
  })

  it('moves a page past the end to the last valid page', async () => {
    const api = mockApi({ tasks: makeTasks(TOTAL) })
    renderApp('?page=9')

    expect(await screen.findByText(LAST_PAGE_RANGE)).toBeInTheDocument()
    expect(window.location.search).toBe('?page=2')
    expect(api.lastListParams().get('per_page')).toBe(String(PAGE_SIZE))
  })

  it('goes back one page after deleting the only task of the last page', async () => {
    const lastTask = PAGE_SIZE + 1
    mockApi({ tasks: makeTasks(lastTask) })
    const { user } = renderApp('?page=2')

    await user.click(await screen.findByRole('button', { name: `Delete: Task ${lastTask}` }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText(`Showing 1-${PAGE_SIZE} of ${PAGE_SIZE} tasks`)).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(window.location.search).toBe('')
    await waitFor(() => expect(document.activeElement?.id).toBe(`task-${PAGE_SIZE}`))
  })

  it('shows no range and no pagination for an empty list', async () => {
    mockApi()
    renderApp()

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument()
  })

  it.each<[string, (user: UserEvent) => Promise<unknown>]>([
    ['the status tab', (user) => user.click(screen.getByRole('tab', { name: 'Pending' }))],
    [
      'the category',
      (user) => user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Other'),
    ],
    [
      'the priority',
      (user) => user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'Medium'),
    ],
    [
      'the sort order',
      (user) => user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Title A-Z'),
    ],
  ])('goes back to page 1 when %s changes', async (_name, change) => {
    const api = mockApi({ tasks: makeTasks(TOTAL) })
    const { user } = renderApp('?page=2')
    await screen.findByText(LAST_PAGE_RANGE)

    await change(user)

    expect(await screen.findByText(FIRST_PAGE_RANGE)).toBeInTheDocument()
    expect(api.lastListParams().get('page')).toBe('1')
    expect(window.location.search).not.toContain('page=')
  })

  it('goes back to page 1 when the search changes', async () => {
    const api = mockApi({ tasks: makeTasks(TOTAL) })
    renderApp('?page=2')
    await findTaskTitle(`Task ${TOTAL}`)

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search by title' }), { target: { value: 'Task' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    vi.useRealTimers()

    expect(await screen.findByText(FIRST_PAGE_RANGE)).toBeInTheDocument()
    expect(api.lastListParams().get('page')).toBe('1')
    expect(window.location.search).toBe('?q=Task')
  })
})
