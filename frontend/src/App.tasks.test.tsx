import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeTask } from './test/factories'
import { mockApi } from './test/mockApi'
import { findTaskTitle, renderApp, taskCard, taskTitle, toastRegion } from './test/appHelpers'

const FIRST = makeTask({ id: 1, title: 'First task' })
const SECOND = makeTask({ id: 2, title: 'Second task' })
const DONE = makeTask({ id: 3, title: 'Done task', status: 'completed' })

async function openNewTaskForm(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'New task' }))
  return within(screen.getByRole('dialog', { name: 'New task' }))
}

function formDialog() {
  return screen.queryByRole('dialog')
}

describe('creating a task', () => {
  it('saves the task, closes the modal, reloads the list and announces it', async () => {
    const api = mockApi({ tasks: [FIRST] })
    const { user } = renderApp()
    await findTaskTitle(FIRST.title)

    const form = await openNewTaskForm(user)
    expect(form.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Other')
    expect(form.getByRole('combobox', { name: 'Priority' })).toHaveDisplayValue('Medium')

    await user.type(form.getByRole('textbox', { name: 'Title' }), '  File HMDA report ')
    await user.selectOptions(form.getByRole('combobox', { name: 'Category' }), 'HMDA')
    await user.selectOptions(form.getByRole('combobox', { name: 'Priority' }), 'High')
    await user.type(form.getByLabelText('Due date'), '2031-03-09')
    await user.click(form.getByRole('button', { name: 'Save' }))

    await findTaskTitle('File HMDA report')
    expect(api.requestsFor('POST')[0].body).toEqual({
      task: {
        title: 'File HMDA report',
        description: null,
        category: 'hmda',
        priority: 'high',
        due_date: '2031-03-09',
        status: 'pending',
      },
    })
    expect(formDialog()).not.toBeInTheDocument()
    expect(taskTitle(FIRST.title)).toBeInTheDocument()
    expect(toastRegion()).toHaveTextContent('Task created')
  })

  it.each(['', '   '])('rejects the blank title "%s" without calling the API', async (title) => {
    const api = mockApi()
    const { user } = renderApp()
    await screen.findByText('No tasks yet')

    const form = await openNewTaskForm(user)
    const titleField = form.getByRole('textbox', { name: 'Title' })
    if (title) await user.type(titleField, title)
    await user.click(form.getByRole('button', { name: 'Save' }))

    expect(form.getByText("Title can't be blank")).toBeInTheDocument()
    expect(titleField).toHaveAttribute('aria-invalid', 'true')
    expect(titleField).toHaveFocus()
    expect(api.requestsFor('POST')).toHaveLength(0)
    expect(formDialog()).toBeInTheDocument()
  })

  it('rejects a title over 120 characters without calling the API', async () => {
    const api = mockApi()
    const { user } = renderApp()
    await screen.findByText('No tasks yet')

    const form = await openNewTaskForm(user)
    await user.click(form.getByRole('textbox', { name: 'Title' }))
    await user.paste('x'.repeat(121))
    await user.click(form.getByRole('button', { name: 'Save' }))

    expect(form.getByText('Title is too long (maximum is 120 characters)')).toBeInTheDocument()
    expect(api.requestsFor('POST')).toHaveLength(0)
  })

  it.each([
    ['Due date', 'due_date', 'is not a valid date', 'Due date is not a valid date'],
    ['Title', 'title', 'has already been taken', 'Title has already been taken'],
    ['Category', 'category', 'is not included in the list', 'Category is not included in the list'],
  ])('shows a 422 error under the %s field', async (label, field, message, expected) => {
    const api = mockApi()
    api.respondOnce('POST', '/tasks', { status: 422, body: { errors: { [field]: [message] } } })
    const { user } = renderApp()
    await screen.findByText('No tasks yet')

    const form = await openNewTaskForm(user)
    await user.type(form.getByRole('textbox', { name: 'Title' }), 'Valid title')
    await user.click(form.getByRole('button', { name: 'Save' }))

    expect(await form.findByText(expected)).toBeInTheDocument()
    const input = form.getByLabelText(label)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(expect.stringContaining(expected))
    expect(input).toHaveFocus()
    expect(formDialog()).toBeInTheDocument()
    expect(toastRegion()).toHaveTextContent('')
    expect(api.listRequests()).toHaveLength(1)
  })

  it('shows a server failure at the top of the modal and keeps what was typed', async () => {
    const api = mockApi()
    api.respondOnce('POST', '/tasks', { status: 500 })
    const { user } = renderApp()
    await screen.findByText('No tasks yet')

    const form = await openNewTaskForm(user)
    await user.type(form.getByRole('textbox', { name: 'Title' }), 'Valid title')
    await user.click(form.getByRole('button', { name: 'Save' }))

    const alert = await form.findByRole('alert')
    expect(alert).toHaveTextContent('The server returned an error (500)')
    expect(alert).toHaveFocus()
    expect(form.getByRole('textbox', { name: 'Title' })).toHaveValue('Valid title')
  })
})

describe('closing the form', () => {
  it('closes right away when nothing changed', async () => {
    mockApi({ tasks: [FIRST] })
    const { user } = renderApp()
    await findTaskTitle(FIRST.title)

    const form = await openNewTaskForm(user)
    await user.click(form.getByRole('button', { name: 'Cancel' }))

    expect(formDialog()).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New task' })).toHaveFocus()
  })

  it('asks before discarding changes, and Keep editing keeps them', async () => {
    const api = mockApi({ tasks: [FIRST] })
    const { user } = renderApp()
    await findTaskTitle(FIRST.title)

    const form = await openNewTaskForm(user)
    await user.type(form.getByRole('textbox', { name: 'Title' }), 'Unsaved')
    await user.click(form.getByRole('button', { name: 'Cancel' }))

    const confirm = within(screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' }))
    await user.click(confirm.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(form.getByRole('textbox', { name: 'Title' })).toHaveValue('Unsaved')

    await user.click(form.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Discard' }))

    expect(formDialog()).not.toBeInTheDocument()
    expect(api.requestsFor('POST')).toHaveLength(0)
  })
})

describe('editing a task', () => {
  const FULL = makeTask({
    id: 7,
    title: 'Review CRA data',
    description: 'Check the Q3 numbers',
    category: 'cra',
    priority: 'high',
    due_date: '2031-03-09',
  })

  it('opens with the fields filled in and sends the change with PATCH', async () => {
    const api = mockApi({ tasks: [FULL] })
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: `Edit: ${FULL.title}` }))

    const form = within(screen.getByRole('dialog', { name: 'Edit task' }))
    const titleField = form.getByRole('textbox', { name: 'Title' })
    expect(titleField).toHaveValue(FULL.title)
    expect(form.getByRole('textbox', { name: 'Description' })).toHaveValue(FULL.description)
    expect(form.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('CRA')
    expect(form.getByRole('combobox', { name: 'Priority' })).toHaveDisplayValue('High')
    expect(form.getByLabelText('Due date')).toHaveValue(FULL.due_date)

    await user.clear(titleField)
    await user.type(titleField, 'Review HMDA data')
    await user.click(form.getByRole('button', { name: 'Save' }))

    await findTaskTitle('Review HMDA data')
    const [request] = api.requestsFor('PATCH')
    expect(request.path).toBe(`/tasks/${FULL.id}`)
    expect(request.body).toEqual({
      task: {
        title: 'Review HMDA data',
        description: FULL.description,
        category: 'cra',
        priority: 'high',
        due_date: FULL.due_date,
      },
    })
    expect(taskTitle(FULL.title)).not.toBeInTheDocument()
    expect(formDialog()).not.toBeInTheDocument()
    expect(toastRegion()).toHaveTextContent('Task updated')
  })

  it('removes the task from the list when the edit makes it stop matching the filters', async () => {
    mockApi({ tasks: [FULL] })
    const { user } = renderApp('?priority=high')

    await user.click(await screen.findByRole('button', { name: `Edit: ${FULL.title}` }))
    const form = within(screen.getByRole('dialog', { name: 'Edit task' }))
    await user.selectOptions(form.getByRole('combobox', { name: 'Priority' }), 'Low')
    await user.click(form.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('No tasks match these filters')).toBeInTheDocument()
    expect(toastRegion()).toHaveTextContent('Task updated')
  })
})

describe('completing and reopening', () => {
  it('sends status completed and removes the task from the Pending tab', async () => {
    const api = mockApi({ tasks: [FIRST, SECOND] })
    const { user } = renderApp('?status=pending')

    await user.click(await screen.findByRole('button', { name: `Mark as complete: ${FIRST.title}` }))

    await waitFor(() => expect(taskTitle(FIRST.title)).not.toBeInTheDocument())
    const [request] = api.requestsFor('PATCH')
    expect(request.path).toBe(`/tasks/${FIRST.id}`)
    expect(request.body).toEqual({ task: { status: 'completed' } })
    expect(toastRegion()).toHaveTextContent('Task completed')
    await waitFor(() => expect(document.activeElement?.id).toBe(`task-${SECOND.id}`))
  })

  it('keeps a completed task on the All tab and offers Reopen', async () => {
    mockApi({ tasks: [FIRST] })
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: `Mark as complete: ${FIRST.title}` }))

    expect(await screen.findByRole('button', { name: `Reopen: ${FIRST.title}` })).toBeInTheDocument()
    expect(taskCard(FIRST.title).getByText('Completed')).toBeInTheDocument()
  })

  it('sends status pending when reopening and removes the task from the Completed tab', async () => {
    const api = mockApi({ tasks: [DONE] })
    const { user } = renderApp('?status=completed')

    await user.click(await screen.findByRole('button', { name: `Reopen: ${DONE.title}` }))

    expect(await screen.findByText('No tasks match these filters')).toBeInTheDocument()
    expect(api.requestsFor('PATCH')[0].body).toEqual({ task: { status: 'pending' } })
    expect(toastRegion()).toHaveTextContent('Task reopened')
    await waitFor(() => expect(screen.getByRole('button', { name: 'New task' })).toHaveFocus())
  })

  it('shows an error toast and keeps the task when the update fails', async () => {
    const api = mockApi({ tasks: [FIRST] })
    api.respondOnce('PATCH', `/tasks/${FIRST.id}`, { status: 500 })
    const { user } = renderApp('?status=pending')

    await user.click(await screen.findByRole('button', { name: `Mark as complete: ${FIRST.title}` }))

    await waitFor(() => expect(toastRegion()).toHaveTextContent('Error: The server returned an error (500)'))
    expect(taskTitle(FIRST.title)).toBeInTheDocument()
    expect(api.listRequests()).toHaveLength(1)
  })
})

describe('deleting', () => {
  it('asks for confirmation, with the focus on Cancel, then deletes', async () => {
    const api = mockApi({ tasks: [FIRST, SECOND] })
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: `Delete: ${FIRST.title}` }))

    const dialog = screen.getByRole('alertdialog', { name: 'Delete this task? This also removes its history.' })
    expect(dialog).toHaveAccessibleDescription(FIRST.title)
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(api.requestsFor('DELETE')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(taskTitle(FIRST.title)).not.toBeInTheDocument())
    expect(api.requestsFor('DELETE')[0].path).toBe(`/tasks/${FIRST.id}`)
    expect(taskTitle(SECOND.title)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(toastRegion()).toHaveTextContent('Task deleted')
  })

  it.each<[string, (user: UserEvent) => Promise<void>]>([
    ['the Cancel button', (user) => user.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['the Esc key', (user) => user.keyboard('{Escape}')],
  ])('does not delete when dismissed with %s', async (_name, dismiss) => {
    const api = mockApi({ tasks: [FIRST] })
    const { user } = renderApp()
    const deleteButton = await screen.findByRole('button', { name: `Delete: ${FIRST.title}` })

    await user.click(deleteButton)
    await dismiss(user)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api.requestsFor('DELETE')).toHaveLength(0)
    expect(taskTitle(FIRST.title)).toBeInTheDocument()
    expect(deleteButton).toHaveFocus()
  })

  it('closes the dialog and shows an error toast when the deletion fails', async () => {
    const api = mockApi({ tasks: [FIRST] })
    api.respondOnce('DELETE', `/tasks/${FIRST.id}`, { status: 500 })
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: `Delete: ${FIRST.title}` }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(toastRegion()).toHaveTextContent('Error: The server returned an error (500)'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(taskTitle(FIRST.title)).toBeInTheDocument()
  })

  it('reloads the outdated list when the task no longer exists', async () => {
    const api = mockApi({ tasks: [FIRST] })
    api.respondOnce('DELETE', `/tasks/${FIRST.id}`, { status: 404, body: { error: 'Not found' } })
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: `Delete: ${FIRST.title}` }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(toastRegion()).toHaveTextContent('Error: The task was not found.'))
    await waitFor(() => expect(api.listRequests()).toHaveLength(2))
  })
})

describe('toast region', () => {
  it('is mounted as a polite live region before any message exists', async () => {
    mockApi({ tasks: [FIRST] })
    renderApp()
    await findTaskTitle(FIRST.title)

    expect(toastRegion()).toHaveAttribute('aria-live', 'polite')
    expect(toastRegion()).toBeEmptyDOMElement()
  })
})
