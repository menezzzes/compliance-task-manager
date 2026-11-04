const PLACEHOLDER_ROWS = [1, 2, 3, 4]

export function TaskListSkeleton() {
  return (
    <div className="skeleton">
      <p className="visually-hidden" role="status">
        Loading tasks…
      </p>
      {PLACEHOLDER_ROWS.map((row) => (
        <div key={row} className="skeleton-row" aria-hidden="true" />
      ))}
    </div>
  )
}
