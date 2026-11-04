export type Status = 'pending' | 'completed'
export type Priority = 'low' | 'medium' | 'high'
export type Category =
  | 'cra'
  | 'hmda'
  | 'fair_lending'
  | 'section_1071'
  | 'complaints'
  | 'marketing_compliance'
  | 'other'
export type TaskEventType = 'created' | 'updated' | 'completed'

export interface Task {
  id: number
  title: string
  description: string | null
  status: Status
  priority: Priority
  category: Category
  due_date: string | null
  overdue: boolean
  created_at: string
  updated_at: string
}

export interface TaskEvent {
  id: number
  task_id: number
  event_type: TaskEventType
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiValidationError {
  errors: Record<string, string[]>
}

export const STATUS_LABELS: Record<Status, string> = {
  pending: 'Pending',
  completed: 'Completed',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  cra: 'CRA',
  hmda: 'HMDA',
  fair_lending: 'Fair Lending',
  section_1071: 'Section 1071',
  complaints: 'Complaints',
  marketing_compliance: 'Marketing Compliance',
  other: 'Other',
}

export const EVENT_TYPE_LABELS: Record<TaskEventType, string> = {
  created: 'Created',
  updated: 'Updated',
  completed: 'Completed',
}

export const TASK_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  priority: 'Priority',
  status: 'Status',
  due_date: 'Due date',
}
