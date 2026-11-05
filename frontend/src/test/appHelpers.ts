import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import App from '../App'

export function renderApp(search = '') {
  window.history.replaceState(null, '', `/${search}`)
  const user = userEvent.setup()
  render(createElement(App))
  return { user }
}

export function taskTitle(title: string) {
  return screen.queryByRole('heading', { name: title, level: 3 })
}

export function findTaskTitle(title: string) {
  return screen.findByRole('heading', { name: title, level: 3 })
}

export function taskCard(title: string) {
  const card = taskTitle(title)?.closest('li')
  if (!card) throw new Error(`Task "${title}" is not on the screen`)
  return within(card)
}

export function toastRegion() {
  const region = screen.getAllByRole('status').find((element) => element.getAttribute('aria-live') === 'polite')
  if (!region) throw new Error('The toast region is not on the screen')
  return region
}

export function pagination() {
  return within(screen.getByRole('navigation', { name: 'Pagination' }))
}
