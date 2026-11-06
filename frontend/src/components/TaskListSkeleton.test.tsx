import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskListSkeleton, WAKE_UP_HINT, WAKE_UP_HINT_DELAY_MS } from './TaskListSkeleton'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

describe('TaskListSkeleton', () => {
  it('only mentions the sleeping server after the delay', () => {
    render(<TaskListSkeleton />)

    act(() => vi.advanceTimersByTime(WAKE_UP_HINT_DELAY_MS - 1))
    expect(screen.queryByText(WAKE_UP_HINT)).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText(WAKE_UP_HINT)).toBeInTheDocument()
  })

  it('announces the hint in a live region that is already on the screen', () => {
    render(<TaskListSkeleton />)
    const regions = screen.getAllByRole('status')

    act(() => vi.advanceTimersByTime(WAKE_UP_HINT_DELAY_MS))

    expect(regions.some((region) => region.textContent === WAKE_UP_HINT)).toBe(true)
  })
})
