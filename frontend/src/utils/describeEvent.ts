import {
  CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_FIELD_LABELS,
} from '../types'
import type { TaskEvent } from '../types'
import { formatDueDate, formatTimestamp } from './date'

const EMPTY_VALUE = 'None'
const FIELD_ORDER = Object.keys(TASK_FIELD_LABELS)

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: STATUS_LABELS,
  priority: PRIORITY_LABELS,
  category: CATEGORY_LABELS,
}

export interface InitialValue {
  label: string
  value: string
}

export interface FieldChange {
  label: string
  before: string
  after: string
}

export interface EventDescription {
  typeLabel: string
  occurredAt: string
  initialValues: InitialValue[]
  changes: FieldChange[]
}

function fieldLabel(field: string): string {
  if (Object.hasOwn(TASK_FIELD_LABELS, field)) return TASK_FIELD_LABELS[field]

  const words = field.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function displayValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE

  const text = String(value)
  if (field === 'due_date') return formatDueDate(text)

  const labels = VALUE_LABELS[field]
  return labels && Object.hasOwn(labels, text) ? labels[text] : text
}

function fieldRank(field: string): number {
  const index = FIELD_ORDER.indexOf(field)
  return index === -1 ? FIELD_ORDER.length : index
}

function sortedEntries(metadata: Record<string, unknown>): [string, unknown][] {
  return Object.entries(metadata).sort(([a], [b]) => fieldRank(a) - fieldRank(b))
}

function isChangePair(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length === 2
}

export function describeEvent(event: TaskEvent): EventDescription {
  const entries = sortedEntries(event.metadata ?? {})
  const description: EventDescription = {
    typeLabel: EVENT_TYPE_LABELS[event.event_type],
    occurredAt: formatTimestamp(event.created_at),
    initialValues: [],
    changes: [],
  }

  if (event.event_type === 'created') {
    description.initialValues = entries.map(([field, value]) => ({
      label: fieldLabel(field),
      value: displayValue(field, value),
    }))
    return description
  }

  for (const [field, value] of entries) {
    if (!isChangePair(value)) continue
    description.changes.push({
      label: fieldLabel(field),
      before: displayValue(field, value[0]),
      after: displayValue(field, value[1]),
    })
  }
  return description
}
