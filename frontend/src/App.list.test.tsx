import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WAKE_UP_HINT, WAKE_UP_HINT_DELAY_MS } from './components/TaskListSkeleton'
import { makeTask } from './test/factories'
import { mockApi } from './test/mockApi'
import { findTaskTitle, renderApp, taskCard, taskTitle } from './test/appHelpers'

const EXAM = makeTask({
  id: 1,
  title: 'Prepare CRA exam',
  category: 'cra',
  priority: 'high',
  due_date: '2031-03-09',
})
const REPORT = makeTask({ id: 2, title: 'File HMDA report', category: 'hmda', priority: 'low' })
const AUDIT = makeTask({ id: 3, title: 'Close lending audit', category: 'fair_lending', status: 'completed' })
const LATE = makeTask({ id: 4, title: 'Answer complaint', category: 'complaints', due_date: '2020-01-01', overdue: true })
const TASKS = [EXAM, REPORT, AUDIT, LATE]

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Search by title' })
}

describe('task rows', () => {
  it('shows the category, priority and due date of each task', async () => {
    mockApi({ tasks: TASKS })
    renderApp()
    await findTaskTitle(EXAM.title)

    const exam = taskCard(EXAM.title)
    expect(exam.getByText('CRA')).toBeInTheDocument()
    expect(exam.getByText('Priority: High')).toBeInTheDocument()
    expect(exam.getByText('Due: Mar 9, 2031')).toBeInTheDocument()

    expect(taskCard(REPORT.title).getByText('No due date')).toBeInTheDocument()
    expect(taskCard(LATE.title).getByText(/^Overdue by \d+ days$/)).toBeInTheDocument()
    expect(screen.getByText('4 results')).toBeInTheDocument()
  })
})

describe('status tabs', () => {
  it('starts on All, with the panel labelled by the selected tab', async () => {
    const api = mockApi({ tasks: TASKS })
    renderApp()
    await findTaskTitle(EXAM.title)

    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'All' })).toBeInTheDocument()
    expect(api.lastListParams().has('status')).toBe(false)
  })

  it('asks for pending tasks and shows the status in the URL', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp()
    await findTaskTitle(AUDIT.title)

    await user.click(screen.getByRole('tab', { name: 'Pending' }))

    await waitFor(() => expect(taskTitle(AUDIT.title)).not.toBeInTheDocument())
    expect(api.lastListParams().get('status')).toBe('pending')
    expect(screen.getByRole('tab', { name: 'Pending', selected: true })).toBeInTheDocument()
    expect(window.location.search).toBe('?status=pending')
  })

  it('asks for completed tasks and removes the status again on All', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp()
    await findTaskTitle(EXAM.title)

    await user.click(screen.getByRole('tab', { name: 'Completed' }))
    await waitFor(() => expect(taskTitle(EXAM.title)).not.toBeInTheDocument())
    expect(api.lastListParams().get('status')).toBe('completed')

    await user.click(screen.getByRole('tab', { name: 'All' }))
    await findTaskTitle(EXAM.title)
    expect(api.lastListParams().has('status')).toBe(false)
    expect(window.location.search).toBe('')
  })

  it('moves between tabs with the arrow keys', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp()
    await findTaskTitle(EXAM.title)

    screen.getByRole('tab', { name: 'All' }).focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Pending', selected: true })).toHaveFocus()
    expect(api.lastListParams().get('status')).toBe('pending')
  })
})

describe('filters', () => {
  it.each([
    ['Category', 'HMDA', 'category', 'hmda', REPORT.title, EXAM.title],
    ['Priority', 'High', 'priority', 'high', EXAM.title, REPORT.title],
  ])(
    'filters by %s and shows it in the URL',
    async (label, option, param, value, keptTitle, removedTitle) => {
      const api = mockApi({ tasks: TASKS })
      const { user } = renderApp()
      await findTaskTitle(removedTitle)

      await user.selectOptions(screen.getByRole('combobox', { name: label }), option)

      await waitFor(() => expect(taskTitle(removedTitle)).not.toBeInTheDocument())
      expect(taskTitle(keptTitle)).toBeInTheDocument()
      expect(api.lastListParams().get(param)).toBe(value)
      expect(window.location.search).toBe(`?${param}=${value}`)
    },
  )

  it('filters by Overdue and shows it in the URL', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp()
    await findTaskTitle(EXAM.title)

    await user.click(screen.getByRole('checkbox', { name: 'Overdue' }))

    await waitFor(() => expect(taskTitle(EXAM.title)).not.toBeInTheDocument())
    expect(taskTitle(LATE.title)).toBeInTheDocument()
    expect(api.lastListParams().get('overdue')).toBe('true')
    expect(window.location.search).toBe('?overdue=true')
  })

  it('sends the sort order chosen in the list', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp()
    await findTaskTitle(EXAM.title)
    expect(api.lastListParams().get('sort')).toBe('created_at')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Due soonest')

    await waitFor(() => expect(api.lastListParams().get('sort')).toBe('due_date'))
    expect(api.lastListParams().get('direction')).toBe('asc')
    expect(window.location.search).toBe('?sort=due_date&direction=asc')
  })

  it('applies the filters from the URL on the first request and shows them in the controls', async () => {
    const api = mockApi({ tasks: TASKS })
    renderApp('?status=pending&category=cra&priority=high&q=exam&sort=title&direction=asc')
    await findTaskTitle(EXAM.title)

    expect(api.listRequests()).toHaveLength(1)
    const params = api.lastListParams()
    expect(params.get('status')).toBe('pending')
    expect(params.get('category')).toBe('cra')
    expect(params.get('priority')).toBe('high')
    expect(params.get('q')).toBe('exam')
    expect(params.get('sort')).toBe('title')
    expect(params.get('direction')).toBe('asc')

    expect(screen.getByRole('tab', { name: 'Pending', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('CRA')
    expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveDisplayValue('High')
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveDisplayValue('Title A-Z')
    expect(searchBox()).toHaveValue('exam')
  })

  it('checks Overdue when the URL asks for it', async () => {
    const api = mockApi({ tasks: TASKS })
    renderApp('?overdue=true')
    await findTaskTitle(LATE.title)

    expect(api.lastListParams().get('overdue')).toBe('true')
    expect(screen.getByRole('checkbox', { name: 'Overdue' })).toBeChecked()
  })

  it('clears the filters, keeps the sort order and moves the focus to the search box', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp('?status=pending&q=exam&sort=title&direction=asc')
    await findTaskTitle(EXAM.title)

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    await findTaskTitle(AUDIT.title)
    expect(window.location.search).toBe('?sort=title&direction=asc')
    expect(api.lastListParams().get('sort')).toBe('title')
    expect(api.lastListParams().has('q')).toBe(false)
    expect(searchBox()).toHaveValue('')
    expect(searchBox()).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('restores the filters and the search box with the browser back button', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp('?q=exam')
    await findTaskTitle(EXAM.title)
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await findTaskTitle(AUDIT.title)

    window.history.back()

    await waitFor(() => expect(taskTitle(AUDIT.title)).not.toBeInTheDocument())
    expect(window.location.search).toBe('?q=exam')
    expect(api.lastListParams().get('q')).toBe('exam')
    expect(searchBox()).toHaveValue('exam')
  })
})

describe('search', () => {
  it('waits 300 ms after the last change and sends the text without outer spaces', async () => {
    const api = mockApi({ tasks: TASKS })
    renderApp()
    await findTaskTitle(REPORT.title)
    const requestsBeforeSearch = api.listRequests().length

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(searchBox(), { target: { value: ' ex' } })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    fireEvent.change(searchBox(), { target: { value: ' exam ' } })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(api.listRequests()).toHaveLength(requestsBeforeSearch)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    vi.useRealTimers()

    expect(api.listRequests()).toHaveLength(requestsBeforeSearch + 1)
    expect(api.lastListParams().get('q')).toBe('exam')
    expect(window.location.search).toBe('?q=exam')
    await waitFor(() => expect(taskTitle(REPORT.title)).not.toBeInTheDocument())
    expect(taskTitle(EXAM.title)).toBeInTheDocument()
    expect(searchBox()).toHaveValue(' exam ')
  })
})

describe('list states', () => {
  it('shows the skeleton while the first load is running', async () => {
    const api = mockApi({ tasks: TASKS })
    const release = api.hold('GET', '/tasks')
    renderApp()

    expect(await screen.findByText('Loading tasks…')).toBeInTheDocument()
    expect(taskTitle(EXAM.title)).not.toBeInTheDocument()

    release()

    await findTaskTitle(EXAM.title)
    expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument()
  })

  it('mentions the sleeping server when the first load is slow, and drops it once tasks arrive', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const api = mockApi({ tasks: TASKS })
    const release = api.hold('GET', '/tasks')
    renderApp()

    act(() => vi.advanceTimersByTime(WAKE_UP_HINT_DELAY_MS - 1))
    expect(screen.queryByText(WAKE_UP_HINT)).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText(WAKE_UP_HINT)).toBeInTheDocument()

    vi.useRealTimers()
    release()

    await findTaskTitle(EXAM.title)
    expect(screen.queryByText(WAKE_UP_HINT)).not.toBeInTheDocument()
  })

  it('keeps the previous list visible and marks it as busy during a reload', async () => {
    const api = mockApi({ tasks: TASKS })
    const { user } = renderApp()
    await findTaskTitle(AUDIT.title)
    const release = api.hold('GET', '/tasks')

    await user.click(screen.getByRole('tab', { name: 'Pending' }))

    expect(screen.getByText('Updating…')).toBeInTheDocument()
    expect(taskTitle(AUDIT.title)).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument()

    release()

    await waitFor(() => expect(taskTitle(AUDIT.title)).not.toBeInTheDocument())
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false')
  })

  it.each([
    ['a server error', { status: 500 }],
    ['a network failure', 'network-error'],
  ] as const)('shows the error state after %s and recovers with Try again', async (_name, failure) => {
    const api = mockApi({ tasks: TASKS })
    api.respondOnce('GET', '/tasks', failure)
    const { user } = renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load tasks')
    expect(taskTitle(EXAM.title)).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await findTaskTitle(EXAM.title)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(api.listRequests()).toHaveLength(2)
  })

  it('shows the message for no tasks at all, without Clear filters', async () => {
    mockApi()
    renderApp()

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('shows the message for filters without results, and clearing brings the tasks back', async () => {
    mockApi({ tasks: [REPORT] })
    const { user } = renderApp('?category=cra')

    expect(await screen.findByText('No tasks match these filters')).toBeInTheDocument()

    const [, clearInEmptyState] = screen.getAllByRole('button', { name: 'Clear filters' })
    await user.click(clearInEmptyState)

    await findTaskTitle(REPORT.title)
    expect(window.location.search).toBe('')
  })
})
