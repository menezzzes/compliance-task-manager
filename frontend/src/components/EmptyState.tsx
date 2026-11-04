import { Icon } from './Icon'

interface EmptyStateProps {
  filtered: boolean
  onClear: () => void
}

export function EmptyState({ filtered, onClear }: EmptyStateProps) {
  if (!filtered) {
    return (
      <div className="message">
        <span className="message-icon">
          <Icon name="clipboard" />
        </span>
        <p className="message-title">No tasks yet</p>
      </div>
    )
  }

  return (
    <div className="message">
      <span className="message-icon">
        <Icon name="search" />
      </span>
      <p className="message-title">No tasks match these filters</p>
      <button className="button" type="button" onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
