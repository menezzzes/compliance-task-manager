import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, ApiValidationError } from '../api/tasks'
import type { TaskInput } from '../api/tasks'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../types'
import type { Category, Priority, Task } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'

const TITLE_MAX_LENGTH = 120
const GENERIC_ERROR = 'Could not save the task. Please try again.'

interface FormValues {
  title: string
  description: string
  category: Category
  priority: Priority
  due_date: string
}

type FieldName = keyof FormValues
type FieldErrors = Partial<Record<FieldName, string[]>>

const FIELD_LABELS: Record<FieldName, string> = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  priority: 'Priority',
  due_date: 'Due date',
}
const FIELD_NAMES = Object.keys(FIELD_LABELS) as FieldName[]

function isFieldName(name: string): name is FieldName {
  return name in FIELD_LABELS
}

function initialValues(task: Task | null): FormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    category: task?.category ?? 'other',
    priority: task?.priority ?? 'medium',
    due_date: task?.due_date ?? '',
  }
}

function titleLength(title: string): number {
  return [...title.trim()].length
}

function validate(values: FormValues): FieldErrors {
  if (!values.title.trim()) return { title: ["can't be blank"] }
  if (titleLength(values.title) > TITLE_MAX_LENGTH) {
    return { title: [`is too long (maximum is ${TITLE_MAX_LENGTH} characters)`] }
  }
  return {}
}

function toTaskInput(values: FormValues): TaskInput {
  return {
    ...values,
    title: values.title.trim(),
    description: values.description.trim() ? values.description : null,
    due_date: values.due_date || null,
  }
}

interface TaskFormModalProps {
  task: Task | null
  onSubmit: (input: TaskInput) => Promise<void>
  onClose: () => void
}

export function TaskFormModal({ task, onSubmit, onClose }: TaskFormModalProps) {
  const [initial] = useState(() => initialValues(task))
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const generalErrorRef = useRef<HTMLParagraphElement>(null)

  const dirty = FIELD_NAMES.some((name) => values[name] !== initial[name])
  const length = titleLength(values.title)

  useEffect(() => {
    if (generalError) generalErrorRef.current?.focus()
  }, [generalError])

  function changeField<K extends FieldName>(name: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors(({ [name]: _changed, ...others }) => others)
  }

  function showFieldErrors(errors: FieldErrors) {
    setFieldErrors(errors)
    const firstField = FIELD_NAMES.find((name) => errors[name])
    const element = firstField && formRef.current?.elements.namedItem(firstField)
    if (element instanceof HTMLElement) element.focus()
  }

  function showFailure(error: unknown) {
    if (!(error instanceof ApiValidationError)) {
      setGeneralError(error instanceof ApiError ? error.message : GENERIC_ERROR)
      return
    }

    const errors: FieldErrors = {}
    const others: string[] = []
    for (const [name, messages] of Object.entries(error.errors)) {
      if (isFieldName(name)) errors[name] = messages
      else others.push(...messages.map((message) => `${name} ${message}`))
    }

    const hasFieldErrors = Object.keys(errors).length > 0
    if (others.length > 0) setGeneralError(others.join('. '))
    else if (!hasFieldErrors) setGeneralError(GENERIC_ERROR)
    showFieldErrors(errors)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setGeneralError(null)
    const clientErrors = validate(values)
    if (Object.keys(clientErrors).length > 0) {
      showFieldErrors(clientErrors)
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    try {
      await onSubmit(toTaskInput(values))
    } catch (error) {
      showFailure(error)
    } finally {
      setSubmitting(false)
    }
  }

  function requestClose() {
    if (submitting) return
    if (dirty) setConfirmingDiscard(true)
    else onClose()
  }

  function describedBy(name: FieldName, ...others: string[]) {
    const ids = fieldErrors[name] ? [...others, `task-${name}-error`] : others
    return ids.length > 0 ? ids.join(' ') : undefined
  }

  function fieldProps(name: FieldName) {
    return {
      id: `task-${name}`,
      name,
      'aria-invalid': fieldErrors[name] ? true : undefined,
      'aria-describedby': describedBy(name),
    }
  }

  function renderFieldError(name: FieldName) {
    const messages = fieldErrors[name]
    if (!messages) return null
    return (
      <p id={`task-${name}-error`} className="field-error">
        {messages.map((message) => `${FIELD_LABELS[name]} ${message}`).join('. ')}
      </p>
    )
  }

  return (
    <>
      <Modal labelledBy="task-form-title" onRequestClose={requestClose}>
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2 id="task-form-title" className="modal-title">
            {task ? 'Edit task' : 'New task'}
          </h2>

          {generalError && (
            <p ref={generalErrorRef} className="form-alert" role="alert" tabIndex={-1}>
              {generalError}
            </p>
          )}

          <div className="form-fields">
            <div className="field field-wide">
              <label htmlFor="task-title">Title</label>
              <input
                {...fieldProps('title')}
                aria-required="true"
                aria-describedby={describedBy('title', 'task-title-count')}
                type="text"
                autoComplete="off"
                value={values.title}
                onChange={(event) => changeField('title', event.target.value)}
              />
              <div className="field-footer">
                {renderFieldError('title')}
                <span
                  id="task-title-count"
                  className={length > TITLE_MAX_LENGTH ? 'char-count char-count-over' : 'char-count'}
                >
                  {length}/{TITLE_MAX_LENGTH}
                  <span className="visually-hidden"> characters</span>
                </span>
              </div>
            </div>

            <div className="field field-wide">
              <label htmlFor="task-description">Description</label>
              <textarea
                {...fieldProps('description')}
                rows={3}
                value={values.description}
                onChange={(event) => changeField('description', event.target.value)}
              />
              {renderFieldError('description')}
            </div>

            <div className="field">
              <label htmlFor="task-category">Category</label>
              <select
                {...fieldProps('category')}
                value={values.category}
                onChange={(event) => changeField('category', event.target.value as Category)}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {renderFieldError('category')}
            </div>

            <div className="field">
              <label htmlFor="task-priority">Priority</label>
              <select
                {...fieldProps('priority')}
                value={values.priority}
                onChange={(event) => changeField('priority', event.target.value as Priority)}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {renderFieldError('priority')}
            </div>

            <div className="field">
              <label htmlFor="task-due_date">Due date</label>
              <input
                {...fieldProps('due_date')}
                type="date"
                value={values.due_date}
                onChange={(event) => changeField('due_date', event.target.value)}
              />
              {renderFieldError('due_date')}
            </div>
          </div>

          <div className="modal-actions">
            <button className="button" type="button" onClick={requestClose}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {confirmingDiscard && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={onClose}
          onCancel={() => setConfirmingDiscard(false)}
        />
      )}
    </>
  )
}
