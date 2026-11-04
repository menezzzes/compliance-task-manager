import { describe, expect, it, vi } from 'vitest'
import { getDueStatus } from './dueStatus'
import type { Status } from '../types'

const TODAY = '2026-11-04'

function pendingTask(dueDate: string | null, overdue = false) {
  return { status: 'pending' as Status, due_date: dueDate, overdue }
}

describe('getDueStatus', () => {
  it.each([
    ['2026-11-04', 'Due today'],
    ['2026-11-05', 'Due tomorrow'],
    ['2026-11-06', 'Due in 2 days'],
    ['2026-11-07', 'Due in 3 days'],
  ])('shows a pending task due on %s as "%s"', (dueDate, label) => {
    expect(getDueStatus(pendingTask(dueDate), TODAY)).toEqual({ kind: 'due_soon', label })
  })

  it('shows nothing when the due date is more than 3 days away', () => {
    expect(getDueStatus(pendingTask('2026-11-08'), TODAY)).toBeNull()
  })

  it('shows nothing without a due date', () => {
    expect(getDueStatus(pendingTask(null), TODAY)).toBeNull()
  })

  it.each([
    ['2026-11-03', 'Overdue by 1 day'],
    ['2026-11-01', 'Overdue by 3 days'],
    ['2025-11-04', 'Overdue by 365 days'],
  ])('shows an overdue task due on %s as "%s"', (dueDate, label) => {
    expect(getDueStatus(pendingTask(dueDate, true), TODAY)).toEqual({ kind: 'overdue', label })
  })

  it('crosses the end of a month', () => {
    expect(getDueStatus(pendingTask('2026-12-01'), '2026-11-30')?.label).toBe('Due tomorrow')
    expect(getDueStatus(pendingTask('2026-11-30', true), '2026-12-02')?.label).toBe('Overdue by 2 days')
  })

  it('crosses the end of a year', () => {
    expect(getDueStatus(pendingTask('2027-01-01'), '2026-12-31')?.label).toBe('Due tomorrow')
    expect(getDueStatus(pendingTask('2027-01-03'), '2026-12-31')?.label).toBe('Due in 3 days')
    expect(getDueStatus(pendingTask('2026-12-31', true), '2027-01-01')?.label).toBe('Overdue by 1 day')
  })

  it('counts February 29 in a leap year', () => {
    expect(getDueStatus(pendingTask('2028-02-29'), '2028-02-28')?.label).toBe('Due tomorrow')
    expect(getDueStatus(pendingTask('2028-03-01'), '2028-02-28')?.label).toBe('Due in 2 days')
  })

  it('never alerts on a completed task', () => {
    for (const dueDate of ['2026-11-01', TODAY, '2026-11-05']) {
      expect(getDueStatus({ status: 'completed', due_date: dueDate, overdue: false }, TODAY)).toBeNull()
    }
    expect(getDueStatus({ status: 'completed', due_date: '2026-11-01', overdue: true }, TODAY)).toBeNull()
  })

  it('trusts the API and omits the count when its day is ahead of the local day', () => {
    expect(getDueStatus(pendingTask(TODAY, true), TODAY)).toEqual({ kind: 'overdue', label: 'Overdue' })
  })

  it('still alerts when the local day is ahead of the API day', () => {
    expect(getDueStatus(pendingTask('2026-11-03', false), TODAY)).toEqual({
      kind: 'overdue',
      label: 'Overdue by 1 day',
    })
  })

  it('does not count days for an unreadable date', () => {
    expect(getDueStatus(pendingTask('not-a-date'), TODAY)).toBeNull()
    expect(getDueStatus(pendingTask('not-a-date', true), TODAY)?.label).toBe('Overdue')
  })

  it('uses the local day by default, late in the evening and just after midnight', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 10, 4, 23, 30))
      expect(getDueStatus(pendingTask(TODAY))?.label).toBe('Due today')

      vi.setSystemTime(new Date(2026, 10, 5, 0, 30))
      expect(getDueStatus(pendingTask('2026-11-05'))?.label).toBe('Due today')
    } finally {
      vi.useRealTimers()
    }
  })
})
