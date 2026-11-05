import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTask } from '../test/factories'
import { DueBadge } from './DueBadge'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 4, 12))
})

describe('DueBadge', () => {
  it.each([
    ['2026-11-04', 'Due today'],
    ['2026-11-05', 'Due tomorrow'],
    ['2026-11-07', 'Due in 3 days'],
  ])('shows a pending task due on %s as "%s", in the due-soon style', (dueDate, label) => {
    render(<DueBadge task={makeTask({ due_date: dueDate })} />)

    expect(screen.getByText(label)).toHaveClass('tag-due-soon')
  })

  it('shows how late an overdue task is, in the overdue style', () => {
    render(<DueBadge task={makeTask({ due_date: '2026-11-01', overdue: true })} />)

    expect(screen.getByText('Overdue by 3 days')).toHaveClass('tag-overdue')
  })

  it('uses the local day late in the evening', () => {
    vi.setSystemTime(new Date(2026, 10, 4, 23, 30))
    render(<DueBadge task={makeTask({ due_date: '2026-11-04' })} />)

    expect(screen.getByText('Due today')).toBeInTheDocument()
  })

  it.each([
    ['is due in more than 3 days', { due_date: '2026-11-08' }],
    ['has no due date', { due_date: null }],
    ['is completed', { status: 'completed', due_date: '2026-11-05' }],
    ['is completed after the due date', { status: 'completed', due_date: '2026-11-01' }],
  ] as const)('shows nothing when the task %s', (_name, overrides) => {
    const { container } = render(<DueBadge task={makeTask(overrides)} />)

    expect(container).toBeEmptyDOMElement()
  })
})
