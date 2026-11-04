import { taskElementId } from '../hooks/useLeavingTasks'
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../types'
import type { Task } from '../types'
import { formatDueDate } from '../utils/date'

export interface TaskActions {
  onToggleStatus: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

interface TaskItemProps extends TaskActions {
  task: Task
  toggling: boolean
  leaving: boolean
}

export function TaskItem({ task, toggling, leaving, onToggleStatus, onEdit, onDelete }: TaskItemProps) {
  const completed = task.status === 'completed'
  const toggleLabel = completed ? 'Reopen' : 'Mark as complete'
  const classNames = ['task', completed && 'task-completed', leaving && 'task-leaving'].filter(Boolean)

  return (
    <li id={taskElementId(task.id)} className={classNames.join(' ')} tabIndex={-1} inert={leaving}>
      <div className="task-heading">
        <h3 className="task-title">{task.title}</h3>
        <span className="task-status">
          <span aria-hidden="true">{completed ? '✓' : '○'}</span> {STATUS_LABELS[task.status]}
        </span>
      </div>

      {task.description && <p className="task-description">{task.description}</p>}

      <div className="task-meta">
        <span className="tag">{CATEGORY_LABELS[task.category]}</span>
        <span className={`tag tag-priority-${task.priority}`}>
          Priority: {PRIORITY_LABELS[task.priority]}
        </span>
        <span className="task-due">
          {task.due_date ? `Due: ${formatDueDate(task.due_date)}` : 'No due date'}
        </span>
        {task.overdue && (
          <span className="tag tag-overdue">
            <span aria-hidden="true">⚠</span> Overdue
          </span>
        )}
      </div>

      <div className="task-actions">
        <button
          className="button button-small"
          type="button"
          aria-label={`${toggleLabel}: ${task.title}`}
          aria-disabled={toggling}
          onClick={() => onToggleStatus(task)}
        >
          {toggleLabel}
        </button>
        <button
          className="button button-small"
          type="button"
          aria-label={`Edit: ${task.title}`}
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
        <button
          className="button button-small"
          type="button"
          aria-label={`Delete: ${task.title}`}
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
