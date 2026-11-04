import { describe, expect, it } from 'vitest'
import { formatDueDate } from './date'

describe('formatDueDate', () => {
  it('formats a date as "Mmm D, YYYY", without a leading zero on the day', () => {
    expect(formatDueDate('2026-11-03')).toBe('Nov 3, 2026')
  })

  it.each([
    ['2026-01-15', 'Jan 15, 2026'],
    ['2026-02-15', 'Feb 15, 2026'],
    ['2026-03-15', 'Mar 15, 2026'],
    ['2026-04-15', 'Apr 15, 2026'],
    ['2026-05-15', 'May 15, 2026'],
    ['2026-06-15', 'Jun 15, 2026'],
    ['2026-07-15', 'Jul 15, 2026'],
    ['2026-08-15', 'Aug 15, 2026'],
    ['2026-09-15', 'Sep 15, 2026'],
    ['2026-10-15', 'Oct 15, 2026'],
    ['2026-11-15', 'Nov 15, 2026'],
    ['2026-12-15', 'Dec 15, 2026'],
  ])('names the month of %s', (value, expected) => {
    expect(formatDueDate(value)).toBe(expected)
  })

  it.each([
    ['2026-03-01', 'Mar 1, 2026'],
    ['2026-03-31', 'Mar 31, 2026'],
    ['2026-04-30', 'Apr 30, 2026'],
    ['2028-02-29', 'Feb 29, 2028'],
  ])('keeps the first and last days of a month: %s', (value, expected) => {
    expect(formatDueDate(value)).toBe(expected)
  })

  it.each([
    ['2026-01-01', 'Jan 1, 2026'],
    ['2026-12-31', 'Dec 31, 2026'],
  ])('keeps the first and last days of a year: %s', (value, expected) => {
    expect(formatDueDate(value)).toBe(expected)
  })

  it.each(['', 'not-a-date', '2026-13-01', '2026-00-10', '2026-11-03T10:00:00Z', '11/03/2026'])(
    'returns %j as it came, because it is not a valid YYYY-MM-DD',
    (value) => {
      expect(formatDueDate(value)).toBe(value)
    },
  )

  it.runIf(new Date('2026-11-03').getTimezoneOffset() > 0)(
    'does not move the day back in time zones west of UTC, as new Date() would',
    () => {
      expect(new Date('2026-11-03').getDate()).toBe(2)
      expect(formatDueDate('2026-11-03')).toBe('Nov 3, 2026')

      expect(new Date('2026-01-01').getFullYear()).toBe(2025)
      expect(formatDueDate('2026-01-01')).toBe('Jan 1, 2026')
    },
  )
})
