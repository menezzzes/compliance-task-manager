import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { findTaskTitle, renderApp } from '../test/appHelpers'
import { makeEvent, makeTask } from '../test/factories'
import { mockApi } from '../test/mockApi'
import { TaskHistoryPanel } from './TaskHistoryPanel'

const TASK = makeTask({ id: 1, title: 'File HMDA report' })
const EVENTS_PATH = `/tasks/${TASK.id}/events`
const LOCAL_NOON = new Date(2026, 10, 3, 12).toISOString()
const LOCAL_NOON_LABEL = 'Nov 3, 2026, 12:00 PM'

const CREATED = makeEvent({
  event_type: 'created',
  created_at: LOCAL_NOON,
  metadata: { title: TASK.title, category: 'hmda', priority: 'high', due_date: null },
})
const UPDATED = makeEvent({
  event_type: 'updated',
  metadata: { priority: ['high', 'low'], due_date: [null, '2031-03-09'] },
})
const COMPLETED = makeEvent({ event_type: 'completed', metadata: { status: ['pending', 'completed'] } })

function renderPanel() {
  const onClose = vi.fn()
  render(<TaskHistoryPanel task={TASK} onClose={onClose} />)
  return { onClose, user: userEvent.setup() }
}

function panel() {
  return within(screen.getByRole('dialog', { name: 'History' }))
}

function eventItem(typeLabel: string) {
  const item = panel().getByRole('heading', { name: typeLabel, level: 3 }).closest('li')
  if (!item) throw new Error(`Event "${typeLabel}" is not on the screen`)
  return within(item)
}

describe('TaskHistoryPanel', () => {
  it('shows readable events in the order given by the API', async () => {
    mockApi({ events: { [TASK.id]: [COMPLETED, UPDATED, CREATED] } })
    renderPanel()

    await panel().findByRole('heading', { name: 'Completed', level: 3 })

    const headings = panel().getAllByRole('heading', { level: 3 })
    expect(headings.map((heading) => heading.textContent)).toEqual(['Completed', 'Updated', 'Created'])
    expect(eventItem('Completed').getByText(/^Status:/).closest('li')).toHaveTextContent(
      'Status: Pending →changed to Completed',
    )
    expect(eventItem('Updated').getByText(/^Priority:/).closest('li')).toHaveTextContent(
      'Priority: High →changed to Low',
    )
    expect(eventItem('Updated').getByText(/^Due date:/).closest('li')).toHaveTextContent(
      'Due date: None →changed to Mar 9, 2031',
    )
    const created = eventItem('Created')
    expect(created.getByText('Initial values')).toBeInTheDocument()
    expect(created.getByText(/^Category:/).closest('li')).toHaveTextContent('Category: HMDA')
    expect(created.getByText(/^Due date:/).closest('li')).toHaveTextContent('Due date: None')
    expect(created.getByText(LOCAL_NOON_LABEL)).toHaveAttribute('datetime', LOCAL_NOON)
  })

  it('shows only the type and time of an event with null metadata', async () => {
    mockApi({ events: { [TASK.id]: [makeEvent({ event_type: 'updated', metadata: null, created_at: LOCAL_NOON })] } })
    renderPanel()

    await panel().findByRole('heading', { name: 'Updated', level: 3 })

    expect(eventItem('Updated').getByText(LOCAL_NOON_LABEL)).toBeInTheDocument()
    expect(panel().queryByText('Initial values')).not.toBeInTheDocument()
    expect(panel().queryByText('Could not load history')).not.toBeInTheDocument()
  })

  it('shows the loading message until the events arrive', async () => {
    const api = mockApi()
    const release = api.hold('GET', EVENTS_PATH)
    renderPanel()

    expect(panel().getByRole('status')).toHaveTextContent('Loading history…')

    release()

    expect(await panel().findByText('No history yet')).toBeInTheDocument()
    expect(panel().queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the error state and moves the focus to Close before trying again', async () => {
    const api = mockApi({ events: { [TASK.id]: [CREATED] } })
    api.respondOnce('GET', EVENTS_PATH, { status: 500 })
    const { user } = renderPanel()

    expect(await panel().findByRole('alert')).toHaveTextContent('Could not load history')

    await user.click(panel().getByRole('button', { name: 'Try again' }))

    expect(panel().getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(await panel().findByRole('heading', { name: 'Created', level: 3 })).toBeInTheDocument()
    expect(panel().queryByRole('alert')).not.toBeInTheDocument()
  })

  it('names the dialog, describes it with the task title and starts the focus on Close', async () => {
    mockApi()
    const { onClose, user } = renderPanel()

    expect(screen.getByRole('dialog', { name: 'History' })).toHaveAccessibleDescription(TASK.title)
    expect(panel().getByRole('button', { name: 'Close' })).toHaveFocus()
    await panel().findByText('No history yet')

    await user.click(panel().getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('history from the task list', () => {
  it('opens the panel, closes it back to the History button and fetches again when reopened', async () => {
    const api = mockApi({ tasks: [TASK], events: { [TASK.id]: [CREATED] } })
    const { user } = renderApp()
    const historyButton = await screen.findByRole('button', { name: `History: ${TASK.title}` })

    await user.click(historyButton)
    await panel().findByRole('heading', { name: 'Created', level: 3 })
    await user.click(panel().getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(historyButton).toHaveFocus()

    await user.click(historyButton)
    await panel().findByRole('heading', { name: 'Created', level: 3 })

    const eventRequests = api.requestsFor('GET').filter(({ path }) => path === EVENTS_PATH)
    expect(eventRequests).toHaveLength(2)
  })

  it('does not open while the status change is still running', async () => {
    const api = mockApi({ tasks: [TASK] })
    const { user } = renderApp()
    await findTaskTitle(TASK.title)
    const release = api.hold('PATCH', `/tasks/${TASK.id}`)

    await user.click(screen.getByRole('button', { name: `Mark as complete: ${TASK.title}` }))

    const historyButton = screen.getByRole('button', { name: `History: ${TASK.title}` })
    expect(historyButton).toHaveAttribute('aria-disabled', 'true')
    await user.click(historyButton)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    release()

    await waitFor(() => expect(historyButton).toHaveAttribute('aria-disabled', 'false'))
  })
})
