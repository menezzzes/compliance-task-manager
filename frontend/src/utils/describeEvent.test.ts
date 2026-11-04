import { describe, expect, it } from 'vitest'
import { describeEvent } from './describeEvent'
import type { TaskEvent, TaskEventType } from '../types'

const LOCAL_TIME = new Date(2026, 10, 3, 17, 53).toISOString()

function buildEvent(eventType: TaskEventType, metadata: TaskEvent['metadata']): TaskEvent {
  return { id: 1, task_id: 1, event_type: eventType, metadata, created_at: LOCAL_TIME }
}

describe('describeEvent', () => {
  it('lists the initial values of a created event', () => {
    const event = buildEvent('created', {
      due_date: '2026-11-03',
      status: 'pending',
      priority: 'high',
      category: 'fair_lending',
      title: 'File the report',
    })

    expect(describeEvent(event)).toEqual({
      typeLabel: 'Created',
      occurredAt: 'Nov 3, 2026, 5:53 PM',
      initialValues: [
        { label: 'Title', value: 'File the report' },
        { label: 'Category', value: 'Fair Lending' },
        { label: 'Priority', value: 'High' },
        { label: 'Status', value: 'Pending' },
        { label: 'Due date', value: 'Nov 3, 2026' },
      ],
      changes: [],
    })
  })

  it('shows an empty initial value as None', () => {
    const event = buildEvent('created', { title: 'File the report', due_date: null })

    expect(describeEvent(event).initialValues).toContainEqual({ label: 'Due date', value: 'None' })
  })

  it('describes an update of one field', () => {
    const event = buildEvent('updated', { due_date: ['2026-11-03', '2026-11-10'] })

    expect(describeEvent(event)).toEqual({
      typeLabel: 'Updated',
      occurredAt: 'Nov 3, 2026, 5:53 PM',
      initialValues: [],
      changes: [{ label: 'Due date', before: 'Nov 3, 2026', after: 'Nov 10, 2026' }],
    })
  })

  it('describes an update of several fields, in a stable order', () => {
    const event = buildEvent('updated', {
      priority: ['low', 'high'],
      category: ['hmda', 'section_1071'],
      title: ['Old', 'New'],
      description: ['Before', 'After'],
    })

    expect(describeEvent(event).changes).toEqual([
      { label: 'Title', before: 'Old', after: 'New' },
      { label: 'Description', before: 'Before', after: 'After' },
      { label: 'Category', before: 'HMDA', after: 'Section 1071' },
      { label: 'Priority', before: 'Low', after: 'High' },
    ])
  })

  it('describes a completed event', () => {
    const description = describeEvent(buildEvent('completed', { status: ['pending', 'completed'] }))

    expect(description.typeLabel).toBe('Completed')
    expect(description.changes).toEqual([{ label: 'Status', before: 'Pending', after: 'Completed' }])
  })

  it('describes a reopening as an update from completed to pending', () => {
    const description = describeEvent(buildEvent('updated', { status: ['completed', 'pending'] }))

    expect(description.typeLabel).toBe('Updated')
    expect(description.changes).toEqual([{ label: 'Status', before: 'Completed', after: 'Pending' }])
  })

  it('shows null and empty values as None', () => {
    const event = buildEvent('updated', {
      due_date: [null, '2026-11-10'],
      description: ['Some text', null],
      title: ['', 'New'],
    })

    expect(describeEvent(event).changes).toEqual([
      { label: 'Title', before: 'None', after: 'New' },
      { label: 'Description', before: 'Some text', after: 'None' },
      { label: 'Due date', before: 'None', after: 'Nov 10, 2026' },
    ])
  })

  it.each<TaskEventType>(['created', 'updated', 'completed'])(
    'shows only the type and date of a %s event with null metadata',
    (eventType) => {
      const description = describeEvent(buildEvent(eventType, null))

      expect(description.occurredAt).toBe('Nov 3, 2026, 5:53 PM')
      expect(description.initialValues).toEqual([])
      expect(description.changes).toEqual([])
    },
  )

  it('keeps values and fields it does not know, in readable form', () => {
    const event = buildEvent('updated', { category: ['legacy', 'constructor'], review_notes: ['a', 'b'] })

    expect(describeEvent(event).changes).toEqual([
      { label: 'Category', before: 'legacy', after: 'constructor' },
      { label: 'Review notes', before: 'a', after: 'b' },
    ])
  })

  it('ignores a value that is not a before and after pair', () => {
    expect(describeEvent(buildEvent('updated', { title: 'New' })).changes).toEqual([])
  })
})
