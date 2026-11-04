import { describe, expect, it } from 'vitest'
import { daysBetween, formatDueDate, formatTimestamp } from './date'

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

describe('daysBetween', () => {
  it.each([
    ['2026-11-04', '2026-11-04', 0],
    ['2026-11-04', '2026-11-05', 1],
    ['2026-11-04', '2026-11-01', -3],
    ['2026-10-31', '2026-11-01', 1],
    ['2026-12-31', '2027-01-01', 1],
    ['2028-02-28', '2028-03-01', 2],
    ['2026-03-07', '2026-03-09', 2],
    ['2026-11-01', '2026-11-02', 1],
  ])('counts from %s to %s as %i', (from, to, expected) => {
    expect(daysBetween(from, to)).toBe(expected)
  })

  it('reads years below 100 as written', () => {
    expect(daysBetween('0026-11-04', '2026-11-04')).toBe(730485)
  })

  it.each(['', 'not-a-date', '2026-13-01', '2026-02-30', '2026-11-03T10:00:00Z'])(
    'returns null for %j',
    (value) => {
      expect(daysBetween(value, '2026-11-04')).toBeNull()
      expect(daysBetween('2026-11-04', value)).toBeNull()
    },
  )
})

describe('formatTimestamp', () => {
  it('shows the local date and time as "Mmm D, YYYY, h:mm AM/PM"', () => {
    expect(formatTimestamp(new Date(2026, 10, 3, 17, 53).toISOString())).toBe('Nov 3, 2026, 5:53 PM')
    expect(formatTimestamp(new Date(2026, 0, 9, 0, 5).toISOString())).toBe('Jan 9, 2026, 12:05 AM')
  })

  it.runIf(new Date('2026-11-04T01:30:00Z').getTimezoneOffset() === 180)(
    'converts UTC to the time zone of São Paulo',
    () => {
      expect(formatTimestamp('2026-11-04T01:30:00.000Z')).toBe('Nov 3, 2026, 10:30 PM')
    },
  )

  it.runIf(new Date('2026-11-04T01:30:00Z').getTimezoneOffset() === 600)(
    'converts UTC to the time zone of Honolulu',
    () => {
      expect(formatTimestamp('2026-11-04T01:30:00.000Z')).toBe('Nov 3, 2026, 3:30 PM')
    },
  )

  it('returns an unreadable value as it came', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date')
  })
})
