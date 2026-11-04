interface EmptyStateProps {
  filtered: boolean
  onClear: () => void
}

export function EmptyState({ filtered, onClear }: EmptyStateProps) {
  if (!filtered) {
    return (
      <div className="message">
        <p className="message-title">No tasks yet</p>
      </div>
    )
  }

  return (
    <div className="message">
      <p className="message-title">No tasks match these filters</p>
      <button className="button" type="button" onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
