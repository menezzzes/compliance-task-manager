import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TASK_QUERY,
  SORT_OPTIONS,
  changeTaskQuery,
  clampPage,
  clearTaskFilters,
  hasActiveFilters,
  matchesTaskFilters,
  parseTaskQuery,
  serializeTaskQuery,
  toTaskListParams,
} from './taskQuery'
import type { Task } from '../types'
import type { TaskQuery } from './taskQuery'

const FULL_QUERY: TaskQuery = {
  status: 'pending',
  category: 'fair_lending',
  priority: 'high',
  q: 'relatório de ações',
  overdue: true,
  sort: 'due_date',
  direction: 'asc',
  page: 3,
}

describe('parseTaskQuery', () => {
  it('returns the defaults for an empty query string', () => {
    expect(parseTaskQuery('')).toEqual(DEFAULT_TASK_QUERY)
  })

  it('reads every valid parameter', () => {
    const search =
      '?status=completed&category=hmda&priority=low&q=audit&overdue=true&sort=title&direction=asc&page=2'

    expect(parseTaskQuery(search)).toEqual({
      status: 'completed',
      category: 'hmda',
      priority: 'low',
      q: 'audit',
      overdue: true,
      sort: 'title',
      direction: 'asc',
      page: 2,
    })
  })

  it('ignores invalid values', () => {
    const search = '?status=done&category=nope&priority=urgent&overdue=1&sort=color&direction=up&page=abc'

    expect(parseTaskQuery(search)).toEqual(DEFAULT_TASK_QUERY)
  })

  it('does not accept names inherited from Object as categories', () => {
    expect(parseTaskQuery('?category=constructor').category).toBe('')
  })

  it.each(['0', '-1', '1.5', '2abc', '', '99999999999999999999'])('reads page=%s as page 1', (page) => {
    expect(parseTaskQuery(`?page=${page}`).page).toBe(1)
  })

  it('accepts overdue only when it is exactly "true"', () => {
    expect(parseTaskQuery('?overdue=true').overdue).toBe(true)
    expect(parseTaskQuery('?overdue=TRUE').overdue).toBe(false)
    expect(parseTaskQuery('?overdue=false').overdue).toBe(false)
  })

  it('trims the search text and treats blank text as no search', () => {
    expect(parseTaskQuery('?q=%20%20audit%20').q).toBe('audit')
    expect(parseTaskQuery('?q=%20%20').q).toBe('')
  })

  it('keeps a valid parameter when another one is invalid', () => {
    const query = parseTaskQuery('?status=nope&category=cra')

    expect(query.status).toBe('')
    expect(query.category).toBe('cra')
  })

  it('takes the direction from the sort option, not from the URL', () => {
    expect(parseTaskQuery('?sort=title').direction).toBe('asc')
    expect(parseTaskQuery('?sort=title&direction=desc').direction).toBe('asc')
    expect(parseTaskQuery('?direction=asc')).toEqual(DEFAULT_TASK_QUERY)
  })
})

describe('serializeTaskQuery', () => {
  it('returns an empty string for the default state', () => {
    expect(serializeTaskQuery(DEFAULT_TASK_QUERY)).toBe('')
  })

  it('writes only what differs from the default', () => {
    expect(serializeTaskQuery({ ...DEFAULT_TASK_QUERY, category: 'cra', page: 2 })).toBe(
      '?category=cra&page=2',
    )
  })

  it('writes sort and direction together', () => {
    expect(serializeTaskQuery({ ...DEFAULT_TASK_QUERY, sort: 'priority', direction: 'desc' })).toBe(
      '?sort=priority&direction=desc',
    )
  })

  it('reads back the same state it wrote, including special characters', () => {
    expect(parseTaskQuery(serializeTaskQuery(FULL_QUERY))).toEqual(FULL_QUERY)
    expect(parseTaskQuery(serializeTaskQuery({ ...FULL_QUERY, q: 'a&b=c+d?' })).q).toBe('a&b=c+d?')
  })

  it.each(SORT_OPTIONS)('round-trips the "$label" ordering', ({ sort, direction }) => {
    const query = { ...DEFAULT_TASK_QUERY, sort, direction }

    expect(parseTaskQuery(serializeTaskQuery(query))).toEqual(query)
  })
})

describe('toTaskListParams', () => {
  it('leaves empty filters undefined, so they are not sent to the API', () => {
    expect(toTaskListParams(DEFAULT_TASK_QUERY)).toEqual({
      status: undefined,
      category: undefined,
      priority: undefined,
      q: undefined,
      overdue: undefined,
      sort: 'created_at',
      direction: 'desc',
      page: 1,
    })
  })

  it('passes active filters through', () => {
    expect(toTaskListParams(FULL_QUERY)).toEqual(FULL_QUERY)
  })
})

describe('hasActiveFilters', () => {
  it('is false for the default state', () => {
    expect(hasActiveFilters(DEFAULT_TASK_QUERY)).toBe(false)
  })

  it.each([
    { status: 'pending' },
    { category: 'cra' },
    { priority: 'low' },
    { q: 'audit' },
    { overdue: true },
  ] as const)('is true with %o', (change) => {
    expect(hasActiveFilters({ ...DEFAULT_TASK_QUERY, ...change })).toBe(true)
  })

  it('does not count ordering or page as filters', () => {
    expect(hasActiveFilters({ ...DEFAULT_TASK_QUERY, sort: 'title', direction: 'asc', page: 4 })).toBe(false)
  })
})

describe('changeTaskQuery', () => {
  it('applies the change and goes back to page 1', () => {
    expect(changeTaskQuery({ ...DEFAULT_TASK_QUERY, page: 5 }, { category: 'cra' })).toEqual({
      ...DEFAULT_TASK_QUERY,
      category: 'cra',
      page: 1,
    })
  })

  it('also goes back to page 1 when the ordering changes', () => {
    const query = changeTaskQuery({ ...DEFAULT_TASK_QUERY, page: 5 }, { sort: 'title', direction: 'asc' })

    expect(query.page).toBe(1)
  })
})

describe('clearTaskFilters', () => {
  it('removes the filters and the page, and keeps the ordering', () => {
    expect(clearTaskFilters(FULL_QUERY)).toEqual({
      ...DEFAULT_TASK_QUERY,
      sort: 'due_date',
      direction: 'asc',
    })
  })
})

describe('clampPage', () => {
  it('keeps a page inside the limits', () => {
    expect(clampPage(2, 3)).toBe(2)
    expect(clampPage(3, 3)).toBe(3)
  })

  it('moves a page past the end to the last page', () => {
    expect(clampPage(4, 3)).toBe(3)
  })

  it('returns page 1 when there are no results', () => {
    expect(clampPage(4, 0)).toBe(1)
  })
})

describe('matchesTaskFilters', () => {
  const task: Task = {
    id: 1,
    title: 'Submit HMDA LAR',
    description: null,
    status: 'pending',
    priority: 'high',
    category: 'hmda',
    due_date: '2026-01-01',
    overdue: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  it('keeps any task when there are no filters', () => {
    expect(matchesTaskFilters(task, DEFAULT_TASK_QUERY)).toBe(true)
  })

  it('checks every filter', () => {
    expect(matchesTaskFilters(task, { ...DEFAULT_TASK_QUERY, status: 'completed' })).toBe(false)
    expect(matchesTaskFilters(task, { ...DEFAULT_TASK_QUERY, category: 'cra' })).toBe(false)
    expect(matchesTaskFilters(task, { ...DEFAULT_TASK_QUERY, priority: 'low' })).toBe(false)
    expect(matchesTaskFilters(task, { ...DEFAULT_TASK_QUERY, q: 'audit' })).toBe(false)
  })

  it('searches the title ignoring case', () => {
    expect(matchesTaskFilters(task, { ...DEFAULT_TASK_QUERY, q: 'hmda' })).toBe(true)
  })

  it('drops a completed task from the overdue list', () => {
    const completed: Task = { ...task, status: 'completed', overdue: false }
    expect(matchesTaskFilters(completed, { ...DEFAULT_TASK_QUERY, overdue: true })).toBe(false)
  })
})
