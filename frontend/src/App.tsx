import { useEffect, useRef, useState } from 'react'
import { ApiError } from './api/tasks'
import type { TaskInput } from './api/tasks'
import { ConfirmDialog } from './components/ConfirmDialog'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { FilterBar } from './components/FilterBar'
import { Pagination } from './components/Pagination'
import { StatusTabs } from './components/StatusTabs'
import { TaskFormModal } from './components/TaskFormModal'
import { TaskList } from './components/TaskList'
import { TaskListSkeleton } from './components/TaskListSkeleton'
import { Toast } from './components/Toast'
import { useDebouncedSearch } from './hooks/useDebouncedSearch'
import { useLeavingTasks } from './hooks/useLeavingTasks'
import { useTaskQuery } from './hooks/useTaskQuery'
import { useTasks } from './hooks/useTasks'
import { useToast } from './hooks/useToast'
import type { Task } from './types'
import { NEW_TASK_BUTTON_ID } from './utils/focus'
import { clampPage, hasActiveFilters, matchesTaskFilters, toTaskListParams } from './utils/taskQuery'

type FormTarget = { task: Task | null }

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function App() {
  const { query, updateQuery, setSearchText, setPage, clearFilters } = useTaskQuery()
  const { data, meta, loading, error, reload, createTask, updateTask, deleteTask } = useTasks(
    toTaskListParams(query),
  )
  const [searchDraft, setSearchDraft] = useDebouncedSearch(query.q, setSearchText)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingIds, setTogglingIds] = useState<number[]>([])
  const { toast, showToast } = useToast()

  const filtered = hasActiveFilters(query)
  const validPage = !loading && meta ? clampPage(query.page, meta.total_pages) : query.page
  const pageOutOfRange = validPage !== query.page

  useEffect(() => {
    if (pageOutOfRange) setPage(validPage, 'replace')
  }, [pageOutOfRange, validPage, setPage])

  const { leavingIds, animateOut } = useLeavingTasks(data, query.page, !loading && !pageOutOfRange)

  async function handleSubmitForm(input: TaskInput) {
    const task = formTarget?.task
    if (!task) {
      await createTask({ ...input, status: 'pending' })
      setFormTarget(null)
      showToast('Task created')
      return
    }

    await updateTask(task.id, input, async (saved) => {
      setFormTarget(null)
      showToast('Task updated')
      if (!matchesTaskFilters(saved, query)) await animateOut(saved.id)
    })
  }

  async function handleToggleStatus(task: Task) {
    if (togglingIds.includes(task.id)) return

    const reopening = task.status === 'completed'
    setTogglingIds((ids) => [...ids, task.id])
    try {
      await updateTask(task.id, { status: reopening ? 'pending' : 'completed' }, async (saved) => {
        showToast(reopening ? 'Task reopened' : 'Task completed')
        if (!matchesTaskFilters(saved, query)) await animateOut(saved.id)
      })
    } catch (caught) {
      showToast(failureMessage(caught, 'Could not update the task.'), 'error')
    } finally {
      setTogglingIds((ids) => ids.filter((id) => id !== task.id))
    }
  }

  async function handleConfirmDelete() {
    if (!taskToDelete) return

    setDeleting(true)
    try {
      await deleteTask(taskToDelete.id, async () => {
        setTaskToDelete(null)
        showToast('Task deleted')
        await animateOut(taskToDelete.id)
      })
    } catch (caught) {
      setTaskToDelete(null)
      showToast(failureMessage(caught, 'Could not delete the task.'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  function handleClearFilters() {
    setSearchDraft('')
    clearFilters()
    searchInputRef.current?.focus()
  }

  function handlePageChange(page: number) {
    setPage(page)
    window.scrollTo({ top: 0 })
  }

  function renderResults() {
    if (error) return <ErrorState onRetry={reload} />
    if (data.length > 0) {
      return (
        <TaskList
          tasks={data}
          busy={loading}
          togglingIds={togglingIds}
          leavingIds={leavingIds}
          onToggleStatus={handleToggleStatus}
          onEdit={(task) => setFormTarget({ task })}
          onDelete={setTaskToDelete}
        />
      )
    }
    if (loading || pageOutOfRange) return <TaskListSkeleton />
    return <EmptyState filtered={filtered} onClear={handleClearFilters} />
  }

  const showMeta = !error && meta !== null && meta.total > 0

  return (
    <>
      <header className="app-header">
        <div className="container app-header-content">
          <h1 className="app-title">Compliance Task Manager</h1>
          <button
            id={NEW_TASK_BUTTON_ID}
            className="button"
            type="button"
            onClick={() => setFormTarget({ task: null })}
          >
            New task
          </button>
        </div>
      </header>

      <main className="container app-main">
        <h2 className="section-title">Tasks</h2>

        <StatusTabs value={query.status} onChange={(status) => updateQuery({ status })}>
          <FilterBar
            query={query}
            searchText={searchDraft}
            searchInputRef={searchInputRef}
            showClear={filtered}
            onSearchTextChange={setSearchDraft}
            onChange={updateQuery}
            onClear={handleClearFilters}
          />

          <div className="results-summary">
            <p role="status">
              {showMeta && `${meta.total} ${meta.total === 1 ? 'result' : 'results'}`}
            </p>
            {loading && data.length > 0 && (
              <span className="refreshing" aria-hidden="true">
                Updating…
              </span>
            )}
          </div>

          <div className="results">{renderResults()}</div>

          {showMeta && <Pagination meta={meta} currentPage={query.page} onPageChange={handlePageChange} />}
        </StatusTabs>
      </main>

      {formTarget && (
        <TaskFormModal
          task={formTarget.task}
          onSubmit={handleSubmitForm}
          onClose={() => setFormTarget(null)}
        />
      )}

      {taskToDelete && (
        <ConfirmDialog
          title="Delete this task? This also removes its history."
          confirmLabel="Delete"
          busyLabel="Deleting..."
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setTaskToDelete(null)}
        >
          <p className="modal-task-name">{taskToDelete.title}</p>
        </ConfirmDialog>
      )}

      <Toast toast={toast} />
    </>
  )
}

export default App
