import type { Task } from '../types'
import { TaskItem } from './TaskItem'
import type { TaskActions } from './TaskItem'

interface TaskListProps extends TaskActions {
  tasks: Task[]
  busy: boolean
  togglingIds: number[]
  leavingIds: number[]
}

export function TaskList({ tasks, busy, togglingIds, leavingIds, ...actions }: TaskListProps) {
  return (
    <ul className="task-list" aria-busy={busy}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          toggling={togglingIds.includes(task.id)}
          leaving={leavingIds.includes(task.id)}
          {...actions}
        />
      ))}
    </ul>
  )
}
