import { useId, useRef } from 'react'
import { ApiError } from '../api/tasks'
import { useTaskEvents } from '../hooks/useTaskEvents'
import type { Task } from '../types'
import { HistoryEvent } from './HistoryEvent'
import { Icon } from './Icon'
import { Modal } from './Modal'

interface TaskHistoryPanelProps {
  task: Task
  onClose: () => void
}

export function TaskHistoryPanel({ task, onClose }: TaskHistoryPanelProps) {
  const id = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const { events, loading, error, reload } = useTaskEvents(task.id)

  function handleRetry() {
    closeRef.current?.focus()
    reload()
  }

  function renderBody() {
    if (loading) {
      return (
        <p className="history-loading" role="status">
          Loading history…
        </p>
      )
    }
    if (error) {
      return (
        <div className="message" role="alert">
          <span className="message-icon message-icon-error">
            <Icon name="alert" />
          </span>
          <p className="message-title">Could not load history</p>
          {error instanceof ApiError && <p>{error.message}</p>}
          <button className="button" type="button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )
    }
    if (events.length === 0) {
      return (
        <div className="message">
          <span className="message-icon">
            <Icon name="clock" />
          </span>
          <p className="message-title">No history yet</p>
        </div>
      )
    }
    return (
      <ol className="history-list">
        {events.map((event) => (
          <HistoryEvent key={event.id} event={event} />
        ))}
      </ol>
    )
  }

  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-task`}
      initialFocusRef={closeRef}
      onRequestClose={onClose}
    >
      <div className="history-header">
        <div className="history-heading">
          <h2 id={`${id}-title`} className="modal-title">
            History
          </h2>
          <p id={`${id}-task`} className="modal-task-name">
            {task.title}
          </p>
        </div>
        <button ref={closeRef} className="button button-small" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="history-body">{renderBody()}</div>
    </Modal>
  )
}
